#!/usr/bin/env python3
"""AlloFlow's no-service remediation core.

The host model reads the attached PDF and writes a strict repair plan. This
script validates that plan, renders semantic HTML, performs deterministic
structural checks, and optionally invokes local tagged-PDF and veraPDF helpers.
It has no network client and never sends document bytes to AlloFlow.
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import html
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, List, Optional, Tuple


VERSION = "0.2.2"
MAX_SOURCE_BYTES = 200 * 1024 * 1024
MAX_PLAN_BYTES = 8 * 1024 * 1024
MAX_HTML_BYTES = 8 * 1024 * 1024
MAX_IMAGE_BYTES = 3 * 1024 * 1024
MAX_EMBEDDED_IMAGE_CHARS = 4 * 1024 * 1024
MAX_IMAGE_BLOCKS = 100
MAX_TEXT_CHARS = 2_000_000
BLOCKED_DOCUMENT_TYPES = {"form", "signed-record", "legal-record"}
ROOT_KEYS = {"schema_version", "document", "source_pages", "blocks", "review_notes"}
DOCUMENT_KEYS = {
    "title",
    "language",
    "source_page_count",
    "source_sha256",
    "document_type",
    "subject",
    "variant",
}
PLAN_VARIANTS = {"original", "translated", "simplified"}
OFFICE_SUFFIXES = {".docx", ".pptx"}
SAFE_IMAGE_TYPES = {
    ".gif": "image/gif",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
}


class PortableError(Exception):
    def __init__(self, message: str, code: int = 2):
        super().__init__(message)
        self.code = code


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def compact_error(value: Any, limit: int = 500) -> str:
    text = re.sub(r"\s+", " ", str(value or "")).strip()
    return text[:limit]


def emit_json(value: Any) -> None:
    # Write UTF-8 bytes directly: console encodings differ per host (Windows
    # cp1252 raised UnicodeEncodeError on emoji in extracted document text).
    payload = json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    sys.stdout.buffer.write(payload.encode("utf-8"))
    sys.stdout.buffer.flush()


def write_json_new(path: Path, value: Any) -> None:
    with path.open("x", encoding="utf-8", newline="\n") as handle:
        json.dump(value, handle, ensure_ascii=False, indent=2, sort_keys=True)
        handle.write("\n")


def write_text_new(path: Path, value: str) -> None:
    with path.open("x", encoding="utf-8", newline="\n") as handle:
        handle.write(value)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def safe_stem(name: str) -> str:
    stem = re.sub(r"[^A-Za-z0-9._-]+", "-", Path(name).stem).strip("._-")
    return stem[:80] or "document"


def path_is_within(child: Path, parent: Path) -> bool:
    try:
        return os.path.commonpath([str(child), str(parent)]) == str(parent)
    except ValueError:
        return False


def read_plan(path: Path) -> Dict[str, Any]:
    if not path.is_file():
        raise PortableError("Repair plan not found.")
    size = path.stat().st_size
    if size > MAX_PLAN_BYTES:
        raise PortableError("Repair plan exceeds the 8 MiB limit.")
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise PortableError("Repair plan is not valid UTF-8 JSON: " + compact_error(exc))
    if not isinstance(value, dict):
        raise PortableError("Repair plan root must be an object.")
    return value


RUN_STYLES = {"normal", "emphasis", "strong"}
MAX_RUNS = 200


def validate_runs(
    value: Any, text: str, where: str, errors: List[str]
) -> Optional[List[Dict[str, str]]]:
    """Validate an inline-styling overlay for one text block.

    `runs` is STRICTLY ADDITIVE: `text` remains the authoritative content, and
    the concatenation of the runs must reproduce it exactly. That invariant is
    the point - styling can never add, drop, or alter a character, so recall
    and verification keep measuring the same text whether or not styling is
    present. Rejects rather than silently ignoring a mismatch.
    """
    if not isinstance(value, list) or not value:
        errors.append(where + " must be a non-empty array of runs.")
        return None
    if len(value) > MAX_RUNS:
        errors.append(where + f" exceeds {MAX_RUNS} runs.")
        return None
    runs: List[Dict[str, str]] = []
    for index, entry in enumerate(value):
        at = f"{where}[{index}]"
        if not isinstance(entry, dict):
            errors.append(at + " must be an object.")
            return None
        expect_keys(entry, {"text", "style", "href"}, at, errors)
        run_text = entry.get("text")
        if not isinstance(run_text, str) or not run_text:
            errors.append(at + ".text must be a non-empty string.")
            return None
        style = entry.get("style", "normal")
        if style not in RUN_STYLES:
            errors.append(at + ".style must be one of: " + ", ".join(sorted(RUN_STYLES)) + ".")
            return None
        run: Dict[str, str] = {"text": run_text, "style": style}
        if "href" in entry:
            href = entry.get("href")
            # Same safe-scheme contract as the standalone link block.
            if not isinstance(href, str) or not (1 <= len(href) <= 4000) or not safe_link(href):
                errors.append(at + ".href must use a safe scheme (#, http(s):, mailto:, tel:).")
                return None
            run["href"] = href
        runs.append(run)
    if "".join(run["text"] for run in runs) != text:
        errors.append(
            where + " must reproduce the block's text exactly when concatenated; "
            "inline styling may not change content."
        )
        return None
    return runs


def expect_keys(obj: Dict[str, Any], allowed: Iterable[str], where: str, errors: List[str]) -> None:
    extras = sorted(set(obj) - set(allowed))
    if extras:
        errors.append(where + " contains unsupported fields: " + ", ".join(extras))


def expect_text(
    value: Any,
    where: str,
    errors: List[str],
    *,
    minimum: int = 1,
    maximum: int = 200_000,
) -> str:
    if not isinstance(value, str):
        errors.append(where + " must be a string.")
        return ""
    text = value.strip()
    if len(text) < minimum:
        errors.append(where + " must not be empty.")
    if len(text) > maximum:
        errors.append(where + " exceeds its length limit.")
    return text


def expect_int(
    value: Any,
    where: str,
    errors: List[str],
    minimum: int,
    maximum: int,
) -> Optional[int]:
    if isinstance(value, bool) or not isinstance(value, int):
        errors.append(where + " must be an integer.")
        return None
    if value < minimum or value > maximum:
        errors.append(where + f" must be between {minimum} and {maximum}.")
    return value


def safe_link(url: str) -> bool:
    value = url.strip()
    if value.startswith("#"):
        return True
    scheme = value.split(":", 1)[0].lower() if ":" in value else ""
    return scheme in {"http", "https", "mailto", "tel"}


def image_data_uri(relative_path: str, plan_dir: Path) -> Tuple[Optional[str], Optional[str]]:
    if not relative_path:
        return None, None
    candidate = Path(relative_path)
    if candidate.is_absolute():
        return None, "Image paths must be relative to the repair plan."
    resolved = (plan_dir / candidate).resolve()
    if not path_is_within(resolved, plan_dir):
        return None, "Image path escapes the repair plan directory."
    mime = SAFE_IMAGE_TYPES.get(resolved.suffix.lower())
    if not mime:
        return None, "Image type must be PNG, JPEG, GIF, or WebP."
    if not resolved.is_file():
        return None, "Referenced image file does not exist."
    if resolved.stat().st_size > MAX_IMAGE_BYTES:
        return None, "Referenced image exceeds the 3 MiB limit."
    encoded = base64.b64encode(resolved.read_bytes()).decode("ascii")
    return f"data:{mime};base64,{encoded}", None


def block_text(block: Dict[str, Any]) -> str:
    kind = block.get("type")
    if kind in {"heading", "paragraph", "blockquote", "link"}:
        return str(block.get("text") or "")
    if kind == "list":
        return " ".join(str(item) for item in block.get("items") or [])
    if kind == "table":
        cells: List[str] = [str(block.get("caption") or "")]
        cells.extend(str(item) for item in block.get("columns") or [])
        for row in block.get("rows") or []:
            if isinstance(row, list):
                cells.extend(str(item) for item in row)
        return " ".join(cells)
    if kind == "image":
        return " ".join(str(block.get(key) or "") for key in ("alt", "caption"))
    return ""


def plan_internal_token_recall(source_pages: Any, blocks: List[Dict[str, Any]]) -> Optional[float]:
    if not isinstance(source_pages, list) or not source_pages:
        return None
    source = " ".join(str(page.get("text") or "") for page in source_pages if isinstance(page, dict))
    output = " ".join(block_text(block) for block in blocks)
    pattern = re.compile(r"[^\W_]+", re.UNICODE)
    source_tokens = set(token.lower() for token in pattern.findall(source) if len(token) > 1)
    output_tokens = set(token.lower() for token in pattern.findall(output) if len(token) > 1)
    if not source_tokens:
        return None
    return round(len(source_tokens & output_tokens) / len(source_tokens), 4)


def validate_plan(plan: Dict[str, Any], plan_dir: Path) -> Dict[str, Any]:
    errors: List[str] = []
    warnings: List[str] = []
    expect_keys(plan, ROOT_KEYS, "Plan", errors)
    if plan.get("schema_version") != "1.0":
        errors.append("schema_version must be exactly 1.0.")

    document = plan.get("document")
    if not isinstance(document, dict):
        errors.append("document must be an object.")
        document = {}
    expect_keys(document, DOCUMENT_KEYS, "document", errors)
    title = expect_text(document.get("title"), "document.title", errors, maximum=500)
    language = expect_text(document.get("language"), "document.language", errors, maximum=80)
    if language and not re.fullmatch(r"[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*", language):
        errors.append("document.language must be a BCP 47-style language tag.")
    page_count = expect_int(document.get("source_page_count"), "document.source_page_count", errors, 1, 1000)
    source_sha256 = expect_text(
        document.get("source_sha256"),
        "document.source_sha256",
        errors,
        minimum=64,
        maximum=64,
    ).lower()
    if source_sha256 and not re.fullmatch(r"[0-9a-f]{64}", source_sha256):
        errors.append("document.source_sha256 must be a 64-character SHA-256 digest.")
    doc_type = document.get("document_type")
    allowed_doc_types = {
        "handout", "report", "article", "booklet", "other",
        "form", "signed-record", "legal-record",
    }
    if doc_type not in allowed_doc_types:
        errors.append("document.document_type is not supported.")
    if doc_type in BLOCKED_DOCUMENT_TYPES:
        errors.append(
            "Automatic rebuild is blocked for forms, signed records, and legal records."
        )
    if "subject" in document:
        expect_text(document.get("subject"), "document.subject", errors, minimum=0, maximum=1000)
    if "variant" in document and document.get("variant") not in PLAN_VARIANTS:
        errors.append("document.variant must be one of: " + ", ".join(sorted(PLAN_VARIANTS)) + ".")

    source_pages = plan.get("source_pages")
    if source_pages is not None:
        if not isinstance(source_pages, list):
            errors.append("source_pages must be an array when present.")
        elif len(source_pages) > 1000:
            errors.append("source_pages exceeds 1000 entries.")
        else:
            seen_pages = set()
            for index, page in enumerate(source_pages):
                where = f"source_pages[{index}]"
                if not isinstance(page, dict):
                    errors.append(where + " must be an object.")
                    continue
                expect_keys(page, {"page", "text"}, where, errors)
                number = expect_int(page.get("page"), where + ".page", errors, 1, page_count or 1000)
                if number in seen_pages:
                    errors.append(where + ".page duplicates another source page.")
                seen_pages.add(number)
                expect_text(page.get("text"), where + ".text", errors, minimum=0, maximum=200_000)

    blocks = plan.get("blocks")
    if not isinstance(blocks, list) or not blocks:
        errors.append("blocks must be a non-empty array.")
        blocks = []
    if len(blocks) > 5000:
        errors.append("blocks exceeds 5000 entries.")

    normalized_blocks: List[Dict[str, Any]] = []
    total_chars = 0
    heading_levels: List[int] = []
    unresolved_images = 0
    image_blocks = 0
    embedded_image_chars = 0
    allowed_by_type = {
        "heading": {"type", "level", "text", "source_page"},
        "paragraph": {"type", "text", "runs", "source_page"},
        "blockquote": {"type", "text", "cite", "runs", "source_page"},
        "list": {"type", "ordered", "items", "item_runs", "source_page"},
        "table": {"type", "caption", "columns", "rows", "row_headers", "cell_runs", "source_page"},
        "image": {"type", "alt", "decorative", "path", "caption", "source_page"},
        "link": {"type", "text", "url", "source_page"},
        "page_break": {"type", "page", "label"},
    }

    for index, raw in enumerate(blocks):
        where = f"blocks[{index}]"
        if not isinstance(raw, dict):
            errors.append(where + " must be an object.")
            continue
        kind = raw.get("type")
        if kind not in allowed_by_type:
            errors.append(where + " has an unsupported block type.")
            continue
        expect_keys(raw, allowed_by_type[kind], where, errors)
        block = dict(raw)

        if kind != "page_break":
            expect_int(raw.get("source_page"), where + ".source_page", errors, 1, page_count or 1000)

        if kind == "heading":
            level = expect_int(raw.get("level"), where + ".level", errors, 1, 6)
            text = expect_text(raw.get("text"), where + ".text", errors, maximum=20_000)
            block["text"] = text
            if level is not None:
                heading_levels.append(level)
        elif kind in {"paragraph", "blockquote"}:
            block["text"] = expect_text(raw.get("text"), where + ".text", errors)
            if "cite" in raw:
                block["cite"] = expect_text(raw.get("cite"), where + ".cite", errors, minimum=0, maximum=2000)
            if "runs" in raw:
                block["runs"] = validate_runs(
                    raw.get("runs"), block["text"], where + ".runs", errors
                )
        elif kind == "list":
            if not isinstance(raw.get("ordered"), bool):
                errors.append(where + ".ordered must be boolean.")
            items = raw.get("items")
            if not isinstance(items, list) or not items:
                errors.append(where + ".items must be a non-empty array.")
                items = []
            if len(items) > 1000:
                errors.append(where + ".items exceeds 1000 entries.")
            block["items"] = [
                expect_text(item, f"{where}.items[{item_index}]", errors, maximum=20_000)
                for item_index, item in enumerate(items)
            ]
            if "item_runs" in raw:
                item_runs = raw.get("item_runs")
                if not isinstance(item_runs, list) or len(item_runs) != len(block["items"]):
                    errors.append(
                        where + ".item_runs must have exactly one entry per item."
                    )
                else:
                    block["item_runs"] = [
                        validate_runs(
                            entry, block["items"][run_index], f"{where}.item_runs[{run_index}]", errors
                        )
                        for run_index, entry in enumerate(item_runs)
                    ]
        elif kind == "table":
            block["caption"] = expect_text(raw.get("caption"), where + ".caption", errors, maximum=2000)
            columns = raw.get("columns")
            rows = raw.get("rows")
            if not isinstance(columns, list) or not columns:
                errors.append(where + ".columns must be a non-empty array.")
                columns = []
            if len(columns) > 100:
                errors.append(where + ".columns exceeds 100 entries.")
            block["columns"] = [
                expect_text(value, f"{where}.columns[{column_index}]", errors, maximum=2000)
                for column_index, value in enumerate(columns)
            ]
            if not isinstance(rows, list) or not rows:
                errors.append(where + ".rows must be a non-empty array.")
                rows = []
            if len(rows) > 5000:
                errors.append(where + ".rows exceeds 5000 entries.")
            normalized_rows = []
            for row_index, row in enumerate(rows):
                if not isinstance(row, list):
                    errors.append(f"{where}.rows[{row_index}] must be an array.")
                    continue
                if len(row) != len(columns):
                    errors.append(
                        f"{where}.rows[{row_index}] has {len(row)} cells; expected {len(columns)}."
                    )
                normalized_rows.append([
                    expect_text(cell, f"{where}.rows[{row_index}][{cell_index}]", errors, minimum=0, maximum=20_000)
                    for cell_index, cell in enumerate(row)
                ])
            block["rows"] = normalized_rows
            if "row_headers" in raw and not isinstance(raw.get("row_headers"), bool):
                errors.append(where + ".row_headers must be boolean.")
            if "cell_runs" in raw:
                cell_runs = raw.get("cell_runs")
                if not isinstance(cell_runs, list) or len(cell_runs) != len(normalized_rows):
                    errors.append(where + ".cell_runs must have exactly one entry per row.")
                else:
                    validated_cell_runs = []
                    for row_index, row_entry in enumerate(cell_runs):
                        if row_entry is None:
                            validated_cell_runs.append(None)
                            continue
                        row_cells = normalized_rows[row_index] if row_index < len(normalized_rows) else []
                        if not isinstance(row_entry, list) or len(row_entry) != len(row_cells):
                            errors.append(
                                f"{where}.cell_runs[{row_index}] must be null or have one entry per cell."
                            )
                            validated_cell_runs.append(None)
                            continue
                        validated_row = []
                        for cell_index, cell_entry in enumerate(row_entry):
                            if cell_entry is None:
                                validated_row.append(None)
                            else:
                                validated_row.append(validate_runs(
                                    cell_entry,
                                    row_cells[cell_index],
                                    f"{where}.cell_runs[{row_index}][{cell_index}]",
                                    errors,
                                ))
                        validated_cell_runs.append(validated_row)
                    block["cell_runs"] = validated_cell_runs
        elif kind == "image":
            image_blocks += 1
            if image_blocks > MAX_IMAGE_BLOCKS:
                errors.append(f"The plan exceeds the {MAX_IMAGE_BLOCKS} image-block limit.")
            if not isinstance(raw.get("decorative"), bool):
                errors.append(where + ".decorative must be boolean.")
            alt = expect_text(raw.get("alt"), where + ".alt", errors, minimum=0, maximum=4000)
            if raw.get("decorative") is False and not alt:
                errors.append(where + ".alt is required for a meaningful image.")
            block["alt"] = alt
            if "caption" in raw:
                block["caption"] = expect_text(raw.get("caption"), where + ".caption", errors, minimum=0, maximum=4000)
            data_uri, image_error = image_data_uri(str(raw.get("path") or ""), plan_dir)
            if image_error:
                errors.append(where + ".path: " + image_error)
            if data_uri:
                projected = embedded_image_chars + len(data_uri)
                if projected > MAX_EMBEDDED_IMAGE_CHARS:
                    errors.append(
                        "Embedded image data exceeds the combined 4 MiB HTML budget."
                    )
                else:
                    embedded_image_chars = projected
                    block["_data_uri"] = data_uri
            elif not raw.get("decorative"):
                unresolved_images += 1
                warnings.append(where + " has no image file; the rebuild will contain an accessible text fallback.")
        elif kind == "link":
            block["text"] = expect_text(raw.get("text"), where + ".text", errors, maximum=2000)
            url = expect_text(raw.get("url"), where + ".url", errors, maximum=4000)
            if url and not safe_link(url):
                errors.append(where + ".url uses an unsafe or unsupported scheme.")
            block["url"] = url
        elif kind == "page_break":
            page = expect_int(raw.get("page"), where + ".page", errors, 1, page_count or 1000)
            block["page"] = page
            if "label" in raw:
                block["label"] = expect_text(raw.get("label"), where + ".label", errors, minimum=0, maximum=200)

        total_chars += len(block_text(block))
        normalized_blocks.append(block)

    if total_chars > MAX_TEXT_CHARS:
        errors.append(f"Combined plan text exceeds the {MAX_TEXT_CHARS:,} character limit.")
    if heading_levels.count(1) != 1:
        errors.append("The plan must contain exactly one level-1 heading.")
    if heading_levels and heading_levels[0] != 1:
        errors.append("The first heading must be level 1.")
    for previous, current in zip(heading_levels, heading_levels[1:]):
        if current > previous + 1:
            errors.append(f"Heading hierarchy skips from h{previous} to h{current}.")

    review_notes = plan.get("review_notes")
    if not isinstance(review_notes, list):
        errors.append("review_notes must be an array.")
        review_notes = []
    if len(review_notes) > 1000:
        errors.append("review_notes exceeds 1000 entries.")
    normalized_notes = [
        expect_text(note, f"review_notes[{index}]", errors, maximum=10_000)
        for index, note in enumerate(review_notes)
    ]

    recall = plan_internal_token_recall(source_pages, normalized_blocks)
    if recall is not None and recall < 0.95:
        warnings.append(
            f"Plan-internal token recall is {recall:.1%}; compare the rebuild with the actual source for omissions."
        )

    return {
        "ok": not errors,
        "errors": errors,
        "warnings": warnings,
        "document": {
            "title": title,
            "language": language,
            "source_page_count": page_count,
            "source_sha256": source_sha256,
            "document_type": doc_type,
            "subject": str(document.get("subject") or "").strip(),
        },
        "blocks": normalized_blocks,
        "review_notes": normalized_notes,
        "metrics": {
            "block_count": len(normalized_blocks),
            "text_characters": total_chars,
            "plan_internal_token_recall": recall,
            "image_blocks": image_blocks,
            "embedded_image_characters": embedded_image_chars,
            "unresolved_images": unresolved_images,
        },
    }


def esc(value: Any) -> str:
    return html.escape(str(value or ""), quote=True)


def esc_lines(value: Any) -> str:
    """Escape text and honour intentional line breaks as <br>.

    Address blocks, signature blocks, and flattened table cells carry their
    shape in newlines. HTML collapses whitespace, so without this the lines
    silently ran together and a plan that claimed to preserve them was making
    a false claim (corpus round 4, caught by the independent verifier).
    """
    return "<br>".join(esc(line) for line in str(value or "").split("\n"))


_RUN_TAGS = {"emphasis": "em", "strong": "strong"}


def render_inline(text: str, runs: Optional[List[Dict[str, str]]]) -> str:
    """Render a text block, applying inline styling when the plan supplies it.

    Falls back to the plain escaped text when there are no runs, so a plan
    without styling renders exactly as before.
    """
    if not runs:
        return esc_lines(text)
    pieces: List[str] = []
    for run in runs:
        tag = _RUN_TAGS.get(run.get("style", "normal"))
        body = esc_lines(run["text"])
        if tag:
            body = f"<{tag}>{body}</{tag}>"
        href = run.get("href")
        if href:
            body = f'<a href="{esc(href)}">{body}</a>'
        pieces.append(body)
    return "".join(pieces)


def render_html(validated: Dict[str, Any]) -> str:
    document = validated["document"]
    parts: List[str] = []
    image_caption_counter = [1]  # unique ids for aria-describedby targets
    for block in validated["blocks"]:
        kind = block["type"]
        page = block.get("source_page")
        source_attr = f' data-source-page="{int(page)}"' if page else ""
        if kind == "heading":
            level = int(block["level"])
            parts.append(f"<h{level}{source_attr}>{esc(block['text'])}</h{level}>")
        elif kind == "paragraph":
            parts.append(f"<p{source_attr}>{render_inline(block['text'], block.get('runs'))}</p>")
        elif kind == "blockquote":
            cite = f"<cite>{esc(block.get('cite'))}</cite>" if block.get("cite") else ""
            parts.append(
                f"<blockquote{source_attr}><p>"
                f"{render_inline(block['text'], block.get('runs'))}</p>{cite}</blockquote>"
            )
        elif kind == "list":
            tag = "ol" if block.get("ordered") else "ul"
            item_runs = block.get("item_runs") or []
            items = "".join(
                "<li>"
                + render_inline(item, item_runs[item_index] if item_index < len(item_runs) else None)
                + "</li>"
                for item_index, item in enumerate(block.get("items") or [])
            )
            parts.append(f"<{tag}{source_attr}>{items}</{tag}>")
        elif kind == "table":
            headers = "".join(f'<th scope="col">{esc(value)}</th>' for value in block["columns"])
            cell_runs = block.get("cell_runs") or []
            rows = []
            for row_index, row in enumerate(block["rows"]):
                row_runs = cell_runs[row_index] if row_index < len(cell_runs) else None
                cells = []
                for index, value in enumerate(row):
                    runs = row_runs[index] if row_runs and index < len(row_runs) else None
                    body = render_inline(value, runs)
                    if index == 0 and block.get("row_headers"):
                        cells.append(f'<th scope="row">{body}</th>')
                    else:
                        cells.append(f"<td>{body}</td>")
                rows.append("<tr>" + "".join(cells) + "</tr>")
            parts.append(
                f"<table{source_attr}><caption>{esc(block['caption'])}</caption>"
                f"<thead><tr>{headers}</tr></thead><tbody>{''.join(rows)}</tbody></table>"
            )
        elif kind == "image":
            # NOT <figure>/<figcaption>: Chromium's tagged-PDF export maps a
            # <figure> element to its own /Figure structure element, which
            # carries no /Alt (only the inner <img> does). That outer, altless
            # Figure fails PDF/UA-1 clause 7.3-1 (corpus round 4). A div
            # wrapper plus aria-describedby keeps the caption association in
            # HTML while leaving exactly one /Figure - the image's - in the PDF.
            data_uri = block.get("_data_uri")
            caption_id = f"alloflow-figcap-{image_caption_counter[0]}"
            has_caption = bool(block.get("caption"))
            if has_caption:
                image_caption_counter[0] += 1
            caption = (
                f'<p class="alloflow-figure-caption" id="{caption_id}">'
                f"{esc(block.get('caption'))}</p>"
                if has_caption
                else ""
            )
            describedby = f' aria-describedby="{caption_id}"' if has_caption else ""
            if data_uri:
                alt = "" if block.get("decorative") else block.get("alt", "")
                role = ' role="presentation"' if block.get("decorative") else ""
                parts.append(
                    f'<div{source_attr} class="alloflow-figure">'
                    f'<img src="{data_uri}" alt="{esc(alt)}"{role}{describedby}>'
                    f"{caption}</div>"
                )
            elif not block.get("decorative"):
                parts.append(
                    f'<div{source_attr} class="alloflow-figure alloflow-figure-fallback">'
                    f'<div role="img" aria-label="{esc(block.get("alt"))}"{describedby}>'
                    f'{esc(block.get("alt"))}</div>'
                    f"{caption}</div>"
                )
        elif kind == "link":
            link_text = esc(block["text"])
            parts.append(
                f'<p{source_attr}><a href="{esc(block["url"])}" title="{link_text}" '
                f'aria-label="{link_text}">{link_text}</a></p>'
            )
        elif kind == "page_break":
            label = block.get("label") or f"Page {block['page']}"
            parts.append(
                f'<span class="alloflow-page-break" role="doc-pagebreak" '
                f'aria-label="{esc(label)}" data-page="{int(block["page"])}"></span>'
            )

    subject_meta = (
        f'<meta name="description" content="{esc(document["subject"])}">' if document.get("subject") else ""
    )
    body = "\n".join(parts)
    return f"""<!doctype html>
<html lang="{esc(document['language'])}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(document['title'])}</title>
{subject_meta}
<style>
@page {{ size: Letter; margin: 0.75in; }}
:root {{ color-scheme: light; }}
* {{ box-sizing: border-box; }}
html {{ background: #ffffff; color: #111827; font: 12pt/1.6 Arial, Helvetica, sans-serif; }}
body {{ margin: 0 auto; max-width: 48rem; padding: 1rem; }}
.skip-link {{ position: absolute; left: -10000px; top: auto; }}
.skip-link:focus {{ left: 1rem; top: 1rem; padding: .5rem; background: #ffffff; color: #111827; z-index: 10; }}
h1, h2, h3, h4, h5, h6 {{ color: #111827; line-height: 1.25; break-after: avoid; }}
h1 {{ font-size: 2rem; border-bottom: .18rem solid #1d4ed8; padding-bottom: .3rem; }}
h2 {{ font-size: 1.55rem; margin-top: 1.6rem; }}
h3 {{ font-size: 1.3rem; }}
p, li {{ orphans: 3; widows: 3; }}
a {{ color: #0645ad; text-decoration: underline; text-underline-offset: .12em; }}
blockquote {{ border-left: .3rem solid #475569; margin-left: 0; padding-left: 1rem; }}
table {{ border-collapse: collapse; width: 100%; margin: 1rem 0; break-inside: avoid; }}
caption {{ font-weight: 700; text-align: left; margin-bottom: .35rem; }}
th, td {{ border: 1px solid #4b5563; padding: .45rem; text-align: left; vertical-align: top; }}
th {{ background: #e5e7eb; color: #111827; }}
img {{ display: block; height: auto; max-width: 100%; }}
figcaption, .alloflow-figure-caption {{ margin-top: .35rem; color: #374151; }}
.alloflow-figure-fallback {{ border: 2px solid #6b7280; padding: .75rem; }}
.alloflow-page-break {{ display: block; break-before: page; height: 0; }}
@media print {{
  body {{ max-width: none; padding: 0; }}
  .skip-link {{ display: none; }}
  h1, blockquote, th, td, .alloflow-figure-fallback {{ border: 0; }}
  th {{ background: #ffffff; }}
}}
</style>
</head>
<body data-alloflow-portable-version="{VERSION}">
<a class="skip-link" href="#main-content" title="Skip to main content" aria-label="Skip to main content">Skip to main content</a>
<main id="main-content">
{body}
</main>
</body>
</html>
"""


class StructuralAudit(HTMLParser):
    ACTIVE_TAGS = {"script", "iframe", "object", "embed", "base", "meta-refresh"}

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.errors: List[str] = []
        self.warnings: List[str] = []
        self.headings: List[int] = []
        self.images = 0
        self.tables: List[Dict[str, int]] = []
        self._table_stack: List[Dict[str, int]] = []
        self.links = 0
        self.main_count = 0
        self.lang = ""
        self._in_title = False
        self.title_text = ""

    def handle_starttag(self, tag: str, attrs: List[Tuple[str, Optional[str]]]) -> None:
        values = {key.lower(): (value or "") for key, value in attrs}
        tag = tag.lower()
        if tag in self.ACTIVE_TAGS or any(key.startswith("on") for key in values):
            self.errors.append("Active content or event handlers are not allowed.")
        if tag == "meta" and values.get("http-equiv", "").strip().lower() == "refresh":
            self.errors.append("Meta refresh navigation is not allowed.")
        if tag == "html":
            self.lang = values.get("lang", "")
        elif tag == "title":
            self._in_title = True
        elif tag == "main":
            self.main_count += 1
        elif re.fullmatch(r"h[1-6]", tag):
            self.headings.append(int(tag[1]))
        elif tag == "img":
            self.images += 1
            if "alt" not in values:
                self.errors.append("An image is missing the alt attribute.")
        elif tag == "a":
            self.links += 1
            if not safe_link(values.get("href", "")):
                self.errors.append("A link has an unsafe URL.")
        elif tag == "table":
            table = {"captions": 0, "headers": 0, "scoped_headers": 0}
            self._table_stack.append(table)
        elif tag == "caption" and self._table_stack:
            self._table_stack[-1]["captions"] += 1
        elif tag == "th" and self._table_stack:
            self._table_stack[-1]["headers"] += 1
            if values.get("scope") in {"col", "row", "colgroup", "rowgroup"}:
                self._table_stack[-1]["scoped_headers"] += 1

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if tag == "title":
            self._in_title = False
        elif tag == "table" and self._table_stack:
            table = self._table_stack.pop()
            self.tables.append(table)
            if table["captions"] != 1:
                self.errors.append("Each table must have exactly one caption.")
            if table["headers"] < 1 or table["headers"] != table["scoped_headers"]:
                self.errors.append("Every table header must have a valid scope.")

    def handle_data(self, data: str) -> None:
        if self._in_title:
            self.title_text += data


def audit_html(content: str) -> Dict[str, Any]:
    parser = StructuralAudit()
    try:
        parser.feed(content)
        parser.close()
    except Exception as exc:
        parser.errors.append("HTML parser failed: " + compact_error(exc))
    if not parser.lang:
        parser.errors.append("The html element is missing a language.")
    if not parser.title_text.strip():
        parser.errors.append("The document is missing a title.")
    if parser.main_count != 1:
        parser.errors.append("The document must contain exactly one main landmark.")
    if parser.headings.count(1) != 1:
        parser.errors.append("The document must contain exactly one h1.")
    for previous, current in zip(parser.headings, parser.headings[1:]):
        if current > previous + 1:
            parser.errors.append(f"Heading hierarchy skips from h{previous} to h{current}.")
    return {
        "ok": not parser.errors,
        "errors": sorted(set(parser.errors)),
        "warnings": sorted(set(parser.warnings)),
        "counts": {
            "headings": len(parser.headings),
            "images": parser.images,
            "links": parser.links,
            "tables": len(parser.tables),
        },
    }


def renderer_helper() -> Path:
    return Path(__file__).resolve().with_name("render_tagged_pdf.cjs")


def renderer_capability() -> Dict[str, Any]:
    node = shutil.which("node")
    helper = renderer_helper()
    if not node or not helper.is_file():
        return {"available": False, "reason": "Node.js or the local renderer helper is unavailable."}
    try:
        result = subprocess.run(
            [node, str(helper), "--capabilities"],
            capture_output=True,
            encoding="utf-8",
            errors="replace",
            timeout=20,
            check=False,
        )
        data = json.loads(result.stdout) if result.stdout.strip() else {}
        if result.returncode == 0 and data.get("available") is True:
            return data
        return {"available": False, "reason": compact_error(data.get("reason") or result.stderr or "Renderer unavailable.")}
    except (OSError, subprocess.SubprocessError, json.JSONDecodeError) as exc:
        return {"available": False, "reason": compact_error(exc)}


def find_verapdf_jar() -> Optional[Path]:
    configured = os.environ.get("ALLOFLOW_VERAPDF_JAR")
    candidates: List[Path] = []
    if configured:
        candidates.append(Path(configured))
    script_path = Path(__file__).resolve()
    candidates.append(script_path.parent.parent / "assets" / "verapdf-cli.jar")
    for parent in script_path.parents:
        candidates.append(parent / "verapdf" / "verapdf-cli.jar")
    for candidate in candidates:
        try:
            resolved = candidate.resolve()
        except OSError:
            continue
        if resolved.is_file():
            return resolved
    return None


def verapdf_capability() -> Dict[str, Any]:
    java = shutil.which("java")
    jar = find_verapdf_jar()
    if not java:
        return {"available": False, "reason": "Java is unavailable."}
    if not jar:
        return {"available": False, "reason": "The local veraPDF CLI JAR is unavailable."}
    return {"available": True, "java": Path(java).name, "validator": "veraPDF CLI"}


def capabilities() -> Dict[str, Any]:
    renderer = renderer_capability()
    validator = verapdf_capability()
    return {
        "version": VERSION,
        "semanticHtml": True,
        "staticHtmlAudit": True,
        "sourceStructuralAudit": True,
        "sourceImageExtraction": True,
        "sourceTextExtraction": True,
        "independentVerification": True,
        "inlineStyling": sorted(RUN_STYLES),
        "inlineLinks": True,
        "officeTextExtraction": True,
        "officeInput": True,
        "batchRemediation": True,
        "planMerging": True,
        "planVariants": sorted(PLAN_VARIANTS),
        "taggedPdfGeneration": renderer.get("available") is True,
        "taggedPdfDetail": renderer,
        "pdfUaFinalization": renderer.get("available") is True,
        "pdfUaValidation": validator.get("available") is True,
        "pdfUaDetail": validator,
        "networkPolicy": "deny",
        "alloflowServiceUsed": False,
        "modelApiKeyRequired": False,
    }


def render_pdf(html_path: Path, pdf_path: Path, pdfua_id: str = "none") -> Dict[str, Any]:
    node = shutil.which("node")
    if not node:
        return {"status": "not_run", "reason": "Node.js is unavailable."}
    try:
        result = subprocess.run(
            [
                node,
                str(renderer_helper()),
                "--html",
                str(html_path),
                "--pdf",
                str(pdf_path),
                "--pdfua-id",
                pdfua_id,
            ],
            capture_output=True,
            encoding="utf-8",
            errors="replace",
            timeout=180,
            check=False,
        )
        data = json.loads(result.stdout) if result.stdout.strip() else {}
        if result.returncode != 0 or data.get("ok") is not True:
            return {
                "status": "failed",
                "reason": compact_error(data.get("error") or result.stderr or "Tagged-PDF renderer failed."),
            }
        finalization = data.get("pdfUaFinalization") or {}
        return {
            "status": "completed",
            "bytes": int(data.get("bytes") or 0),
            "structuralMarkers": data.get("structuralMarkers") or {},
            "pdfUaFinalization": finalization,
            "pdfUaIdentifierClaimed": finalization.get("pdfuaIdentifierClaimed") is True,
            "blockedNetworkRequests": int(data.get("blockedNetworkRequests") or 0),
        }
    except (OSError, subprocess.SubprocessError, json.JSONDecodeError) as exc:
        return {"status": "failed", "reason": compact_error(exc)}


def normalize_verapdf(parsed: Dict[str, Any]) -> Dict[str, Any]:
    root = parsed.get("report") if isinstance(parsed.get("report"), dict) else parsed
    jobs = root.get("jobs") if isinstance(root, dict) else None
    if not isinstance(jobs, list) or not jobs:
        raise PortableError("veraPDF returned no validation job.", 5)
    job = jobs[0]
    validation = job.get("validationResult") if isinstance(job, dict) else None
    if isinstance(validation, list):
        validation = validation[0] if validation else None
    if not isinstance(validation, dict):
        raise PortableError("veraPDF returned no validation result.", 5)
    details = validation.get("details") if isinstance(validation.get("details"), dict) else {}
    summaries = details.get("ruleSummaries") if isinstance(details.get("ruleSummaries"), list) else []
    failed_rules = []
    for rule in summaries:
        if not isinstance(rule, dict):
            continue
        status = str(rule.get("ruleStatus") or rule.get("status") or "").upper()
        if status != "FAILED":
            continue
        failed_rules.append({
            "clause": rule.get("clause"),
            "testNumber": rule.get("testNumber"),
            "description": compact_error(rule.get("description") or rule.get("specification")),
            "failedChecks": rule.get("failedChecks") or rule.get("failedChecksCount"),
        })
    compliant_value = validation.get("isCompliant")
    if compliant_value is None:
        compliant_value = validation.get("compliant")
    if isinstance(compliant_value, bool):
        compliant = compliant_value
    elif isinstance(compliant_value, str) and compliant_value.strip().lower() in {"true", "false"}:
        compliant = compliant_value.strip().lower() == "true"
    else:
        raise PortableError("veraPDF omitted an explicit compliance result.", 5)
    if compliant and failed_rules:
        raise PortableError("veraPDF returned inconsistent compliance and failed-rule results.", 5)
    reported_failed = details.get("failedRules")
    if isinstance(reported_failed, bool) or not isinstance(reported_failed, int):
        reported_failed = len(failed_rules)
    return {
        "status": "completed",
        "validator": "veraPDF",
        "standard": "PDF/UA-1",
        "compliant": compliant,
        "failedRuleCount": reported_failed,
        "failedRules": failed_rules,
    }


def validate_pdf_ua(pdf_path: Path) -> Dict[str, Any]:
    java = shutil.which("java")
    jar = find_verapdf_jar()
    if not java or not jar:
        return {"status": "not_run", "reason": "Local Java and veraPDF are both required."}
    command = [
        java,
        "-Djava.awt.headless=true",
        "-jar",
        str(jar),
        "--format",
        "json",
        "--flavour",
        "ua1",
        "--maxfailuresdisplayed",
        "100",
        str(pdf_path),
    ]
    try:
        result = subprocess.run(
            command,
            capture_output=True,
            encoding="utf-8",
            errors="replace",
            timeout=180,
            check=False,
        )
    except subprocess.TimeoutExpired:
        return {"status": "failed", "reason": "veraPDF exceeded the 180 second timeout."}
    except OSError as exc:
        return {"status": "failed", "reason": compact_error(exc)}
    if not result.stdout.strip():
        return {"status": "failed", "reason": compact_error(result.stderr or "veraPDF returned no JSON.")}
    try:
        parsed = json.loads(result.stdout)
        normalized = normalize_verapdf(parsed)
        normalized["processExitCode"] = result.returncode
        return normalized
    except (json.JSONDecodeError, PortableError) as exc:
        return {"status": "failed", "reason": compact_error(exc), "processExitCode": result.returncode}


def _has_interactive_fields(data: bytes) -> bool:
    """True when the PDF really carries fillable form fields.

    An /AcroForm dictionary alone is NOT enough: Word and Acrobat leave an
    empty one behind on ordinary prose documents (corpus round 4: a business
    letter carried /AcroForm with an empty /Fields array and was wrongly
    refused). Require a non-empty /Fields array or a real /Widget annotation.
    """
    if re.search(rb"/Subtype\s*/Widget\b", data):
        return True
    index: Dict[int, Tuple[bytes, Optional[bytes]]] = {}
    for number, dictionary, raw in _pdf_iter_stream_objects(data):
        index[number] = (dictionary, raw)

    def fields_non_empty(fields_blob: bytes) -> bool:
        inline = re.match(rb"\s*\[(.*?)\]", fields_blob, re.S)
        if inline:
            return bool(re.search(rb"\d+\s+0\s+R", inline.group(1)))
        ref = re.match(rb"\s*(\d+)\s+0\s+R", fields_blob)
        if ref:
            entry = index.get(int(ref.group(1)))
            if entry is None:
                return False
            body = entry[0]
            # An indirect /Fields resolves to an array object, which the
            # dictionary-only walk stores as its raw slice.
            array = re.search(rb"\[(.*?)\]", body, re.S)
            target = array.group(1) if array else body
            return bool(re.search(rb"\d+\s+0\s+R", target))
        return False

    for _number, (dictionary, _raw) in index.items():
        acro = re.search(rb"/AcroForm\s+(\d+)\s+0\s+R", dictionary)
        if acro:
            entry = index.get(int(acro.group(1)))
            if entry is None:
                continue
            fields = re.search(rb"/Fields(.{0,80})", entry[0], re.S)
            if fields and fields_non_empty(fields.group(1)):
                return True
    for match in re.finditer(rb"/AcroForm\s*<<(.{0,400})", data, re.S):
        fields = re.search(rb"/Fields(.{0,80})", match.group(1), re.S)
        if fields and fields_non_empty(fields.group(1)):
            return True
    return False


def ensure_source_document(path: Path) -> Dict[str, Any]:
    """Accept a local .pdf, .docx, or .pptx source and return its binding receipt."""
    if not path.is_file():
        raise PortableError("Source document not found.")
    size = path.stat().st_size
    if size < 5 or size > MAX_SOURCE_BYTES:
        raise PortableError("Source document is empty or exceeds the 200 MB limit.")
    with path.open("rb") as handle:
        signature = handle.read(5)
    if signature == b"%PDF-":
        kind = "pdf"
    elif signature[:4] == b"PK\x03\x04" and path.suffix.lower() in OFFICE_SUFFIXES:
        kind = path.suffix.lower().lstrip(".")
    else:
        raise PortableError("Source file must be a PDF, .docx, or .pptx (signature check failed).")
    return {"basename": path.name, "bytes": size, "kind": kind, "sha256": sha256_file(path)}


def ensure_source_pdf(path: Path) -> Dict[str, Any]:
    receipt = ensure_source_document(path)
    if receipt["kind"] != "pdf":
        raise PortableError("This command requires a PDF source.")
    return receipt


def publish_staged(pairs: List[Tuple[Path, Path]]) -> None:
    """Publish staged files without overwriting and roll back partial publication."""
    published: List[Path] = []
    try:
        for staged, destination in pairs:
            if not staged.is_file():
                raise PortableError("A staged artifact is missing: " + destination.name)
            with staged.open("rb") as source_handle:
                with destination.open("xb") as destination_handle:
                    shutil.copyfileobj(source_handle, destination_handle, length=1024 * 1024)
            published.append(destination)
    except Exception:
        for destination in published:
            try:
                destination.unlink()
            except OSError:
                pass
        raise


def remediate(args: argparse.Namespace) -> Dict[str, Any]:
    source = Path(args.source).resolve()
    plan_path = Path(args.plan).resolve()
    out_dir = Path(args.out_dir).resolve()
    if args.verapdf == "required" and args.pdf == "never":
        raise PortableError("--verapdf required cannot be combined with --pdf never.", 2)
    source_receipt = ensure_source_document(source)
    plan = read_plan(plan_path)
    validated = validate_plan(plan, plan_path.parent)
    if not validated["ok"]:
        raise PortableError(
            "Repair plan validation failed:\n- " + "\n- ".join(validated["errors"]),
            3,
        )
    if validated["document"]["source_sha256"] != source_receipt["sha256"]:
        raise PortableError(
            "Repair plan source mismatch: document.source_sha256 does not match the supplied PDF.",
            3,
        )

    # The blocked-type gate reads document_type, which the plan author supplies.
    # Cross-check it against the source itself so a mislabelled interactive form
    # cannot slip through: relabelling a fillable form as "report" bypassed the
    # gate entirely until this check existed (corpus round 4). This catches
    # digital forms only - a SCANNED form carries no machine-detectable fields,
    # so classifying those still depends on the reader.
    if source_receipt["kind"] == "pdf" and _has_interactive_fields(source.read_bytes()):
        raise PortableError(
            "The source contains interactive form fields but the plan declares document_type '"
            + str(validated["document"]["document_type"])
            + "'. Rebuilding a form can change field behaviour and meaning. Declare it as "
            "'form' for an explicit refusal, or deliver an audit-only explanation and refer "
            "the document owner.",
            3,
        )

    out_dir.mkdir(parents=True, exist_ok=True)
    stem = safe_stem(source.name)
    names = {
        "html": f"{stem}-accessible.html",
        "pdf": f"{stem}-alloflow-accessible.pdf",
        "report": f"{stem}-accessibility-report.json",
        "receipt": f"{stem}-privacy-receipt.json",
    }
    final_paths = {key: out_dir / value for key, value in names.items()}
    planned_paths = [final_paths["html"], final_paths["report"], final_paths["receipt"]]
    if args.pdf != "never":
        planned_paths.append(final_paths["pdf"])
    existing = [path.name for path in planned_paths if path.exists()]
    if existing:
        raise PortableError("Refusing to overwrite existing output: " + ", ".join(existing))

    # Independent ground truth where the source allows it: extract the source
    # PDF's own text layer and measure how much of it the plan carries. This
    # does not trust the plan author. Scanned or out-of-scope encodings report
    # null with a reason rather than a flattering number.
    source_recall: Optional[float] = None
    source_recall_detail: Dict[str, Any] = {"status": "not_run"}
    if source_receipt["kind"] == "pdf":
        try:
            extraction = _pdf_extract_text(source.read_bytes())
            source_tokens = _tokens(extraction["text"])
            token_total = sum(source_tokens.values())
            if token_total >= MIN_RECALL_TOKENS:
                plan_tokens = _tokens(_plan_text(validated))
                source_recall = _token_recall(source_tokens, plan_tokens)
                # Show WHAT is missing, so a reviewer can tell disclosed page
                # furniture (running footers, repeated footnotes) from real
                # content loss at a glance (corpus round 3: a 0.76 recall was
                # entirely an every-page footnote consolidated by design).
                missing = sorted(
                    ((token, count - plan_tokens.get(token, 0))
                     for token, count in source_tokens.items()
                     if count > plan_tokens.get(token, 0)),
                    key=lambda item: -item[1],
                )
                source_recall_detail = {
                    "status": "completed",
                    "sourceTokens": token_total,
                    "recall": source_recall,
                    "missingTokens": sum(count for _, count in missing),
                    "topMissingTokens": [
                        {"token": token, "count": count} for token, count in missing[:20]
                    ],
                }
            else:
                source_recall_detail = {
                    "status": "not_measurable",
                    "sourceTokens": token_total,
                    "reason": (
                        "The source has no usable extractable text layer (scanned pages or an "
                        "encoding outside deterministic scope); fidelity rests on the plan "
                        "author's reading plus independent verification."
                    ),
                }
        except Exception as exc:  # extraction must never sink a remediation
            source_recall_detail = {"status": "failed", "reason": compact_error(exc)}

    rendered = render_html(validated)
    if len(rendered.encode("utf-8")) > MAX_HTML_BYTES:
        raise PortableError("Generated HTML exceeds the 8 MiB limit.", 3)
    html_audit = audit_html(rendered)
    if not html_audit["ok"]:
        raise PortableError(
            "Generated HTML failed its structural audit: " + "; ".join(html_audit["errors"]),
            3,
        )

    with tempfile.TemporaryDirectory(prefix=".alloflow-portable-", dir=out_dir) as staging_name:
        staging = Path(staging_name)
        staged_paths = {key: staging / value for key, value in names.items()}
        write_text_new(staged_paths["html"], rendered)

        pdf_result: Dict[str, Any]
        if args.pdf == "never":
            pdf_result = {"status": "not_run", "reason": "Disabled by request."}
        else:
            pdf_cap = renderer_capability()
            if pdf_cap.get("available") is not True:
                if args.pdf == "required":
                    raise PortableError(
                        "Tagged-PDF generation was required but is unavailable: "
                        + compact_error(pdf_cap.get("reason")),
                        4,
                    )
                pdf_result = {"status": "not_run", "reason": compact_error(pdf_cap.get("reason"))}
            else:
                pdf_result = render_pdf(staged_paths["html"], staged_paths["pdf"], pdfua_id="1")
                if args.pdf == "required" and pdf_result.get("status") != "completed":
                    raise PortableError(
                        "Tagged-PDF generation failed: " + compact_error(pdf_result.get("reason")),
                        4,
                    )

        if pdf_result.get("status") == "completed":
            if args.verapdf == "never":
                pdf_ua = {"status": "not_run", "reason": "Disabled by request."}
            else:
                pdf_ua = validate_pdf_ua(staged_paths["pdf"])
        else:
            pdf_ua = {"status": "not_run", "reason": "No generated PDF was available to validate."}

        # Honesty pass: the file initially carries the PDF/UA-1 identifier so a
        # fully conforming result is machine-identifiable. If validation found
        # unresolved rules, the file has not earned that claim — rebuild it
        # without the identifier (the same withholding convention the main
        # pipeline uses) and report the withheld state.
        pdf_ua_identifier_withheld = False
        if (
            pdf_result.get("status") == "completed"
            and pdf_result.get("pdfUaIdentifierClaimed") is True
            and pdf_ua.get("status") == "completed"
            and pdf_ua.get("compliant") is False
        ):
            staged_paths["pdf"].unlink()
            retry = render_pdf(staged_paths["html"], staged_paths["pdf"], pdfua_id="none")
            if retry.get("status") == "completed":
                pdf_result = retry
                pdf_ua = validate_pdf_ua(staged_paths["pdf"])
                pdf_ua_identifier_withheld = True
            else:
                pdf_result = {
                    "status": "failed",
                    "reason": "Rebuilding the PDF without the PDF/UA identifier failed: "
                    + compact_error(retry.get("reason")),
                }
                pdf_ua = {"status": "not_run", "reason": "No generated PDF was available to validate."}

        if args.verapdf == "required":
            if pdf_ua.get("status") != "completed":
                raise PortableError("PDF/UA validation was required but did not complete.", 5)
            if pdf_ua.get("compliant") is not True:
                raise PortableError("PDF/UA validation was required to pass but found unresolved rules.", 6)

        artifacts = {
            "accessibleHtml": names["html"],
            "accessibilityReport": names["report"],
            "privacyReceipt": names["receipt"],
            "taggedPdf": names["pdf"] if pdf_result.get("status") == "completed" else None,
        }
        manual_review = list(validated["review_notes"])
        manual_review.extend(validated["warnings"])
        manual_review.append(
            "Compare every page of the rebuild with the source; automated checks cannot verify meaning."
        )
        if pdf_ua.get("status") == "completed" and pdf_ua.get("compliant") is False:
            manual_review.append("veraPDF found unresolved PDF/UA-1 rules; review the failedRules list.")
        elif pdf_ua.get("status") != "completed":
            manual_review.append("PDF/UA validation did not run to completion.")
        if pdf_ua_identifier_withheld:
            manual_review.append(
                "The PDF/UA identifier was deliberately withheld because validation found unresolved "
                "rules. A missing-identification failure in failedRules reflects that withholding, "
                "not an additional defect."
            )

        # Output-side check, always computable when a PDF was generated: the
        # tagged PDF's own extractable text must carry the plan. This catches a
        # rendering path that silently drops content.
        output_recall_detail: Dict[str, Any] = {"status": "not_run"}
        if pdf_result.get("status") == "completed":
            try:
                pdf_extraction = _pdf_extract_text(staged_paths["pdf"].read_bytes())
                plan_tokens = _tokens(_plan_text(validated, include_alt=False))
                output_recall = _token_recall(plan_tokens, _tokens(pdf_extraction["text"]))
                output_recall_detail = {
                    "status": "completed",
                    "planTokens": sum(plan_tokens.values()),
                    "recall": output_recall,
                }
                if output_recall is not None and output_recall < 0.98:
                    manual_review.append(
                        "The tagged PDF's extractable text does not fully carry the plan "
                        f"(recall {output_recall}); compare the PDF against the HTML before "
                        "distributing the PDF."
                    )
            except Exception as exc:
                output_recall_detail = {"status": "failed", "reason": compact_error(exc)}
        if source_recall_detail.get("status") == "completed" and source_recall is not None:
            if source_recall < 0.9:
                manual_review.append(
                    "Deterministic source-text recall is "
                    f"{source_recall}: a measurable share of the source PDF's own text layer "
                    "is absent from the plan. Re-read the source before trusting this rebuild."
                )

        if pdf_result.get("status") != "completed":
            verdict = "html_only_review_required"
        elif pdf_ua.get("status") != "completed":
            verdict = "pdf_generated_unverified_review_required"
        elif pdf_ua.get("compliant") is True:
            verdict = "pdf_generated_validation_passed_review_required"
        else:
            verdict = "pdf_generated_with_known_issues"

        report = {
            "schemaVersion": "1.0",
            "alloflowPortableVersion": VERSION,
            "createdAt": utc_now(),
            "verdict": verdict,
            "complianceClaim": False,
            "source": source_receipt,
            "artifacts": artifacts,
            "checks": {
                "repairPlan": {
                    "status": "completed",
                    "sourceBinding": {
                        "algorithm": "sha256",
                        "matched": True,
                    },
                    "warnings": validated["warnings"],
                    "metrics": validated["metrics"],
                },
                "sourceTextRecall": source_recall_detail,
                "outputTextRecall": output_recall_detail,
                "independentVerification": {
                    "status": "not_run",
                    "how": (
                        "Run verify-init to derive a worksheet, have a fresh-context reader "
                        "fill it, then verify-check to stamp the verification report."
                    ),
                },
                "semanticHtml": {"status": "completed"},
                "staticHtmlAudit": {
                    "status": "completed",
                    **html_audit,
                },
                "taggedPdfGeneration": pdf_result,
                "pdfUaValidation": {
                    **pdf_ua,
                    "identifierWithheld": pdf_ua_identifier_withheld,
                },
                "humanSourceComparison": {"status": "required"},
            },
            "manualReview": manual_review,
        }
        privacy_receipt = {
            "schemaVersion": "1.0",
            "createdAt": report["createdAt"],
            "source": source_receipt,
            "assuranceScope": (
                "AlloFlow packaged scripts only; excludes the host AI provider, operating system, "
                "filesystem synchronization, and resolved local executables."
            ),
            "documentNetworkPolicy": "deny",
            "documentRequestsBlockedByRenderer": int(pdf_result.get("blockedNetworkRequests") or 0),
            "systemWideNetworkUseVerified": False,
            "alloflowServiceInvokedByScripts": False,
            "remoteMcpInvokedByScripts": False,
            "modelApiCalledByScripts": False,
            "documentTextLoggedByScripts": False,
            "artifacts": artifacts,
        }
        write_json_new(staged_paths["report"], report)
        write_json_new(staged_paths["receipt"], privacy_receipt)
        staged_pairs = [
            (staged_paths["html"], final_paths["html"]),
            (staged_paths["report"], final_paths["report"]),
            (staged_paths["receipt"], final_paths["receipt"]),
        ]
        if pdf_result.get("status") == "completed":
            staged_pairs.insert(1, (staged_paths["pdf"], final_paths["pdf"]))
        publish_staged(staged_pairs)

    return {
        "ok": True,
        "verdict": verdict,
        "outputDirectory": out_dir.name or "output",
        "outputPathRedacted": True,
        "artifacts": artifacts,
        "taggedPdfGeneration": pdf_result.get("status"),
        "pdfUaValidation": pdf_ua.get("status"),
        "pdfUaCompliant": pdf_ua.get("compliant") if pdf_ua.get("status") == "completed" else None,
        "humanReviewRequired": True,
    }


# ---------------------------------------------------------------------------
# Source-side commands (deterministic, stdlib-only, no network).
#
# These close the gap between "the host model reads the pages" and what the
# keyed pipeline extracts mechanically: raw image XObjects for figure reuse,
# structural before-facts for an honest baseline, and Office text so a .docx
# or .pptx can be planned without vision.
# ---------------------------------------------------------------------------

_PDF_OBJ_HEADER = re.compile(rb"(\d+)\s+0\s+obj\b")
_PDF_WHITESPACE = b" \t\r\n\f\x00"


def _pdf_iter_stream_objects(data: bytes):
    """Yield (object_number, dict_bytes, raw_stream_bytes_or_None).

    A byte-level scan rather than a full xref parse: it works identically on
    classic-xref and xref-stream files, and image/content streams can never
    hide inside object streams. Dictionaries are captured with balanced
    <<...>> scanning (a lazy regex truncates any dict containing a nested
    dict, silently losing keys like /Contents). Streams are sliced to
    `endstream`; when the dictionary carries a direct /Length that disagrees,
    /Length wins. Stream bodies are skipped over, never scanned for headers.
    """
    position = 0
    length = len(data)
    while True:
        header = _PDF_OBJ_HEADER.search(data, position)
        if not header:
            return
        number = int(header.group(1))
        i = header.end()
        while i < length and data[i:i + 1] in _PDF_WHITESPACE:
            i += 1
        if data[i:i + 2] != b"<<":
            position = header.end()
            continue
        dictionary = _balanced_dict(data, i)
        if dictionary is None:
            position = header.end()
            continue
        j = i + len(dictionary)
        while j < length and data[j:j + 1] in _PDF_WHITESPACE:
            j += 1
        if data[j:j + 6] != b"stream":
            yield number, dictionary, None
            position = j
            continue
        start = j + 6
        if data[start:start + 1] == b"\r":
            start += 1
        if data[start:start + 1] == b"\n":
            start += 1
        end = data.find(b"endstream", start)
        if end < 0:
            return
        raw = data[start:end]
        length_match = re.search(rb"/Length\s+(\d+)(?![\d\s]*0\s+R)", dictionary)
        if length_match:
            declared = int(length_match.group(1))
            if 0 < declared <= len(raw):
                raw = raw[:declared]
        else:
            raw = raw.rstrip(b"\r\n")
        yield number, dictionary, raw
        # PDF 1.5+ object streams: non-stream objects (page dicts, fonts,
        # the catalog) can live compressed inside /ObjStm containers, where a
        # raw byte walk never sees them (corpus round 1: a 77 MB NIST handbook
        # reported 0 pages). Expand each container and yield its embedded
        # dictionary objects. Embedded objects cannot themselves be streams.
        if re.search(rb"/Type\s*/ObjStm\b", dictionary):
            expanded = _decompress_stream(dictionary, raw)
            count_match = re.search(rb"/N\s+(\d+)", dictionary)
            first_match = re.search(rb"/First\s+(\d+)", dictionary)
            if expanded and count_match and first_match:
                count = int(count_match.group(1))
                first = int(first_match.group(1))
                header = expanded[:first].split()
                pairs = []
                for i in range(0, min(len(header) - 1, count * 2), 2):
                    try:
                        pairs.append((int(header[i]), int(header[i + 1])))
                    except ValueError:
                        break
                for idx, (embedded_num, offset) in enumerate(pairs):
                    body_start = first + offset
                    body_end = first + pairs[idx + 1][1] if idx + 1 < len(pairs) else len(expanded)
                    body = expanded[body_start:body_end].strip()
                    if body.startswith(b"<<"):
                        yield embedded_num, _balanced_dict(body, 0) or body, None
                    elif body.startswith(b"["):
                        # Array objects (colour spaces like [/ICCBased 675 0 R],
                        # /Contents arrays) also live inside ObjStm containers;
                        # dropping them made every ICCBased image unresolvable
                        # (corpus round 6: 10 Artemis figures).
                        yield embedded_num, body, None
        position = end


def _png_chunk(tag: bytes, payload: bytes) -> bytes:
    import struct
    import zlib as _zlib

    return (
        struct.pack(">I", len(payload))
        + tag
        + payload
        + struct.pack(">I", _zlib.crc32(tag + payload) & 0xFFFFFFFF)
    )


def _undo_png_predictor(data: bytes, colors: int, bits: int, columns: int) -> bytes:
    """Reverse PNG row filters (Predictor >= 10) applied before Flate encoding.

    Each row is prefixed by a filter-type byte. Without this, predictor-encoded
    images cannot be decoded at all and were skipped outright.
    """
    bpp = max(1, (colors * bits + 7) // 8)
    stride = (columns * colors * bits + 7) // 8
    out = bytearray()
    previous = bytearray(stride)
    position = 0
    while position + 1 + stride <= len(data):
        filter_type = data[position]
        row = bytearray(data[position + 1:position + 1 + stride])
        position += 1 + stride
        if filter_type == 1:  # Sub
            for i in range(bpp, stride):
                row[i] = (row[i] + row[i - bpp]) & 0xFF
        elif filter_type == 2:  # Up
            for i in range(stride):
                row[i] = (row[i] + previous[i]) & 0xFF
        elif filter_type == 3:  # Average
            for i in range(stride):
                left = row[i - bpp] if i >= bpp else 0
                row[i] = (row[i] + ((left + previous[i]) >> 1)) & 0xFF
        elif filter_type == 4:  # Paeth
            for i in range(stride):
                left = row[i - bpp] if i >= bpp else 0
                up = previous[i]
                upper_left = previous[i - bpp] if i >= bpp else 0
                estimate = left + up - upper_left
                da, db, dc = abs(estimate - left), abs(estimate - up), abs(estimate - upper_left)
                predictor = left if (da <= db and da <= dc) else (up if db <= dc else upper_left)
                row[i] = (row[i] + predictor) & 0xFF
        elif filter_type != 0:
            raise PortableError(f"Unsupported PNG row filter {filter_type}.")
        out.extend(row)
        previous = row
    return bytes(out)


def _decode_parms(dictionary: bytes) -> Dict[str, int]:
    """Read /DecodeParms. /Predictor defaults to 1 (no prediction) when absent -
    treating any DecodeParms as unsupported skipped perfectly plain images."""
    blob = re.search(rb"/DecodeParms\s*<<(.{0,300}?)>>", dictionary, re.S)
    body = blob.group(1) if blob else b""

    def value(key: str, default: int) -> int:
        found = re.search(rb"/" + key.encode("ascii") + rb"\s+(\d+)", body)
        return int(found.group(1)) if found else default

    return {
        "predictor": value("Predictor", 1),
        "colors": value("Colors", 1),
        "bits": value("BitsPerComponent", 8),
        "columns": value("Columns", 1),
    }


def _write_png(path: Path, width: int, height: int, color_type: int, raw: bytes,
               palette: Optional[bytes] = None) -> None:
    """Wrap already-decoded 8-bit scanlines (gray=0, rgb=2, indexed=3) as a PNG."""
    import struct
    import zlib as _zlib

    channels = 3 if color_type == 2 else 1
    stride = width * channels
    if len(raw) < stride * height:
        raise PortableError("Decoded image data is shorter than its declared dimensions.")
    rows = bytearray()
    for row in range(height):
        rows.append(0)
        rows.extend(raw[row * stride:(row + 1) * stride])
    header = struct.pack(">IIBBBBB", width, height, 8, color_type, 0, 0, 0)
    plte = _png_chunk(b"PLTE", palette) if (color_type == 3 and palette) else b""
    body = (
        b"\x89PNG\r\n\x1a\n"
        + _png_chunk(b"IHDR", header)
        + plte
        + _png_chunk(b"IDAT", _zlib.compress(bytes(rows), 9))
        + _png_chunk(b"IEND", b"")
    )
    with path.open("xb") as handle:
        handle.write(body)


def _resolve_color_space(
    dictionary: bytes, index: Dict[int, Tuple[bytes, Optional[bytes]]]
) -> Tuple[Optional[int], str]:
    """Resolve /ColorSpace to (png_color_type, label, palette), following refs.

    Direct names, indirect refs, and [/ICCBased N 0 R] arrays are handled - an
    ICC profile's /N gives the component count, and decoding its samples as
    Device colour is the standard close-enough treatment (the profile is almost
    always sRGB-like). Indexed/Separation/Lab return (None, label) so the
    caller can skip with an honest reason instead of mis-decoding.
    """
    match = re.search(rb"/ColorSpace\s*(/\w+|\d+\s+0\s+R|\[[^\]]*\])", dictionary)
    if not match:
        return None, "no /ColorSpace", None
    blob = match.group(1)
    ref = re.match(rb"(\d+)\s+0\s+R", blob)
    if ref:
        entry = index.get(int(ref.group(1)))
        if entry is None:
            return None, f"unresolvable colour space ref {int(ref.group(1))}", None
        blob = entry[0]
    if re.search(rb"/DeviceRGB\b", blob) and b"/Indexed" not in blob:
        return 2, "DeviceRGB", None
    if re.search(rb"/DeviceGray\b", blob) and b"/Indexed" not in blob:
        return 0, "DeviceGray", None
    indexed = re.search(
        rb"/Indexed\s*(/\w+|\[[^\]]*\]|\d+\s+0\s+R)\s+(\d+)\s+(\d+\s+0\s+R|\([^)]*\)|<[0-9A-Fa-f\s]*>)",
        blob,
    )
    if indexed:
        hival = int(indexed.group(2))
        lookup_blob = indexed.group(3)
        palette: Optional[bytes] = None
        lookup_ref = re.match(rb"(\d+)\s+0\s+R", lookup_blob)
        if lookup_ref:
            lookup_entry = index.get(int(lookup_ref.group(1)))
            if lookup_entry is not None and lookup_entry[1] is not None:
                palette = _decompress_stream(lookup_entry[0], lookup_entry[1])
        elif lookup_blob.startswith(b"<"):
            digits = re.sub(rb"[^0-9A-Fa-f]", b"", lookup_blob)
            palette = bytes.fromhex(digits.decode("ascii"))
        elif lookup_blob.startswith(b"("):
            palette = lookup_blob[1:-1]
        base_rgb = b"/DeviceRGB" in indexed.group(1) or b"/ICCBased" in indexed.group(1)
        if palette is not None and base_rgb and len(palette) >= 3 * (hival + 1):
            return 3, f"Indexed RGB ({hival + 1} colours)", palette[: 3 * (hival + 1)]
        return None, f"Indexed with unresolvable base/lookup (hival={hival})", None
    icc = re.search(rb"/ICCBased\s+(\d+)\s+0\s+R", blob)
    if icc:
        icc_entry = index.get(int(icc.group(1)))
        if icc_entry is not None:
            n = re.search(rb"/N\s+(\d+)", icc_entry[0])
            if n and n.group(1) == b"3":
                return 2, "ICCBased N=3 (decoded as RGB)", None
            if n and n.group(1) == b"1":
                return 0, "ICCBased N=1 (decoded as Gray)", None
            return None, f"ICCBased N={(n.group(1).decode() if n else '?')}", None
        return None, "ICCBased profile unresolvable", None
    return None, "unsupported colour space " + blob[:40].decode("latin1", "replace"), None


def extract_images_command(args: argparse.Namespace) -> Dict[str, Any]:
    import zlib as _zlib

    source = Path(args.source).resolve()
    receipt = ensure_source_pdf(source)
    out_dir = Path(args.out_dir).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)
    min_pixels = max(0, int(args.min_pixels))
    data = source.read_bytes()
    object_index: Dict[int, Tuple[bytes, Optional[bytes]]] = {}
    for object_number, object_dict, object_raw in _pdf_iter_stream_objects(data):
        object_index[object_number] = (object_dict, object_raw)

    extracted: List[Dict[str, Any]] = []
    skipped: List[Dict[str, Any]] = []
    index = 0
    for number, dictionary, raw in _pdf_iter_stream_objects(data):
        if raw is None or b"/Subtype" not in dictionary or b"/Image" not in dictionary:
            continue
        if not re.search(rb"/Subtype\s*/Image\b", dictionary):
            continue
        width_match = re.search(rb"/Width\s+(\d+)", dictionary)
        height_match = re.search(rb"/Height\s+(\d+)", dictionary)
        if not width_match or not height_match:
            continue
        width = int(width_match.group(1))
        height = int(height_match.group(1))
        index += 1
        entry: Dict[str, Any] = {
            "object": number,
            "width": width,
            "height": height,
            "softMask": bool(re.search(rb"/SMask\s+\d+\s+0\s+R", dictionary)),
        }
        if re.search(rb"/ImageMask\s+true", dictionary):
            entry["reason"] = "Stencil image mask (no standalone pixel data)."
            skipped.append(entry)
            continue
        if width * height < min_pixels:
            entry["reason"] = f"Below the {min_pixels}-pixel floor (likely decorative)."
            skipped.append(entry)
            continue
        filters = b"".join(re.findall(rb"/(?:Filter)\s*(/\w+|\[[^\]]*\])", dictionary))
        name = f"image-{index:03d}-obj{number}"
        try:
            if b"DCTDecode" in filters:
                target = out_dir / f"{name}.jpg"
                with target.open("xb") as handle:
                    handle.write(raw)
                entry.update({"file": target.name, "format": "jpeg"})
            elif b"JPXDecode" in filters:
                target = out_dir / f"{name}.jp2"
                with target.open("xb") as handle:
                    handle.write(raw)
                entry.update({"file": target.name, "format": "jpeg2000"})
            elif b"FlateDecode" in filters:
                bits_match = re.search(rb"/BitsPerComponent\s+(\d+)", dictionary)
                bits = int(bits_match.group(1)) if bits_match else 8
                if bits != 8:
                    raise PortableError(f"Unsupported bit depth {bits}.")
                color_type, cs_label, palette = _resolve_color_space(dictionary, object_index)
                if color_type is None:
                    raise PortableError(f"Unsupported colour space for deterministic decode: {cs_label}.")
                entry["colorSpace"] = cs_label
                parms = _decode_parms(dictionary)
                pixels = _zlib.decompress(raw)
                if parms["predictor"] >= 10:
                    pixels = _undo_png_predictor(
                        pixels,
                        parms["colors"] or (3 if color_type == 2 else 1),
                        parms["bits"],
                        parms["columns"] or width,
                    )
                elif parms["predictor"] != 1:
                    raise PortableError(
                        f"Unsupported predictor {parms['predictor']} (TIFF prediction)."
                    )
                target = out_dir / f"{name}.png"
                _write_png(target, width, height, color_type, pixels, palette)
                entry.update({"file": target.name, "format": "png"})
            else:
                raise PortableError(
                    "Unsupported filter chain: " + (filters.decode("latin1") or "none")
                )
        except (PortableError, _zlib.error, OSError) as exc:
            entry["reason"] = compact_error(exc)
            skipped.append(entry)
            continue
        extracted.append(entry)

    inventory = {
        "ok": True,
        "source": receipt,
        "extracted": extracted,
        "skipped": skipped,
        "note": (
            "Object numbers identify images; page mapping requires reading the document. "
            "JPEG 2000 (.jp2) files may need conversion before embedding. Reuse an image in "
            "a repair plan by copying it next to the plan and referencing its relative path."
        ),
    }
    inventory_path = out_dir / "image-inventory.json"
    if inventory_path.exists():
        raise PortableError("Refusing to overwrite an existing image inventory.")
    write_json_new(inventory_path, inventory)
    return {**inventory, "inventory": inventory_path.name, "outputDirectory": out_dir.name}


def audit_source_command(args: argparse.Namespace) -> Dict[str, Any]:
    import zlib as _zlib

    source = Path(args.source).resolve()
    receipt = ensure_source_pdf(source)
    data = source.read_bytes()

    # Count pages by walking real objects and deduplicating by object number:
    # a raw byte regex over-counts on incrementally-updated files, where a
    # revised page object appears twice (corpus round 1: an 8-page UDHR PDF
    # with two revised pages reported 10).
    page_numbers = set()
    for number, dictionary, _raw in _pdf_iter_stream_objects(data):
        if re.search(rb"/Type\s*/Page\b", dictionary) and not re.search(rb"/Type\s*/Pages\b", dictionary):
            page_numbers.add(number)
    page_count = len(page_numbers)
    image_count = len(re.findall(rb"/Subtype\s*/Image\b", data))
    font_count = len(re.findall(rb"/Type\s*/Font\b", data))
    tagged = b"/StructTreeRoot" in data and re.search(rb"/Marked\s+true", data) is not None
    has_lang = re.search(rb"/Lang\s*\(", data) is not None or re.search(rb"/Lang\s*<", data) is not None
    has_xmp = re.search(rb"/Type\s*/Metadata\b", data) is not None
    claims_pdfua = b"pdfuaid:part" in data or b"http://www.aiim.org/pdfua/ns/id/" in data
    encrypted = re.search(rb"/Encrypt\s+\d+\s+0\s+R", data) is not None
    has_acroform = b"/AcroForm" in data
    has_outline = b"/Outlines" in data
    has_title = re.search(rb"/Title\s*[(<]", data) is not None or b"<dc:title>" in data

    # Text detection: inflate content streams (not image streams) and look for
    # ACTUAL text-showing operators - a string or array operand followed by
    # Tj/TJ/'/". Requiring the operand matters: a bare \bBT\b matched vector
    # line-work in a pure page scan (corpus round 1, 1913 Form 1040) and
    # reported searchable text on a document with none.
    has_text = False
    inflate_failures = 0
    text_pattern = re.compile(rb"[)>]\s*(?:Tj|'|\")|\]\s*TJ")
    for _, dictionary, raw in _pdf_iter_stream_objects(data):
        if has_text or raw is None or b"/Image" in dictionary:
            continue
        if b"/FlateDecode" in dictionary:
            try:
                if text_pattern.search(_zlib.decompress(raw)):
                    has_text = True
            except _zlib.error:
                inflate_failures += 1
        elif b"/Filter" not in dictionary:
            if text_pattern.search(raw):
                has_text = True
    is_scanned = not has_text and image_count >= max(1, page_count)

    issues: List[Dict[str, str]] = []

    def issue(identifier: str, severity: str, description: str) -> None:
        issues.append({"id": identifier, "severity": severity, "description": description})

    if encrypted:
        issue("encrypted", "serious", "The document is encrypted; assistive access and rebuild may be restricted.")
    if not has_text:
        issue(
            "no-text-layer",
            "critical",
            "No text-showing operators were found; screen readers have nothing to read.",
        )
    if not tagged:
        issue("untagged", "critical", "The document has no structure tree; it is not a tagged PDF.")
    if not has_lang:
        issue("no-language", "serious", "No document language is declared.")
    if not has_title:
        issue("no-title", "moderate", "No document title was found in Info or XMP metadata.")
    if not has_xmp:
        issue("no-xmp-metadata", "minor", "No XMP metadata stream is present.")
    if has_acroform:
        issue(
            "form-fields",
            "review",
            "Interactive form fields are present; the portable rebuild deliberately blocks forms.",
        )

    return {
        "ok": True,
        "source": receipt,
        "structuralFindings": {
            "pageCount": page_count,
            "imageXObjects": image_count,
            "fontObjects": font_count,
            "hasSearchableText": has_text,
            "isScannedLikely": is_scanned,
            "tagged": tagged,
            "declaresLanguage": has_lang,
            "hasTitle": has_title,
            "hasXmpMetadata": has_xmp,
            "claimsPdfUa": claims_pdfua,
            "encrypted": encrypted,
            "hasFormFields": has_acroform,
            "hasOutline": has_outline,
            "contentStreamInflateFailures": inflate_failures,
        },
        "issues": issues,
        "note": (
            "Deterministic byte-level facts only: no rendering, no OCR, no semantic judgement, "
            "and no score. Semantic quality (alt text, reading order, table structure) still "
            "requires the host model to read the document."
        ),
    }


def _docx_paragraphs(document_xml: bytes) -> List[Dict[str, Any]]:
    import xml.etree.ElementTree as ET

    ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
    root = ET.fromstring(document_xml)
    paragraphs: List[Dict[str, Any]] = []
    for paragraph in root.iter(f"{{{ns['w']}}}p"):
        text = "".join(node.text or "" for node in paragraph.iter(f"{{{ns['w']}}}t"))
        if not text.strip():
            continue
        style_node = paragraph.find(f"{{{ns['w']}}}pPr/{{{ns['w']}}}pStyle")
        style = style_node.get(f"{{{ns['w']}}}val") if style_node is not None else None
        entry: Dict[str, Any] = {"text": text}
        if style:
            entry["style"] = style
        if paragraph.find(f"{{{ns['w']}}}pPr/{{{ns['w']}}}numPr") is not None:
            entry["listItem"] = True
        paragraphs.append(entry)
    return paragraphs


def extract_office_command(args: argparse.Namespace) -> Dict[str, Any]:
    import zipfile

    source = Path(args.source).resolve()
    receipt = ensure_source_document(source)
    if receipt["kind"] not in {"docx", "pptx"}:
        raise PortableError("extract-office requires a .docx or .pptx source.")

    total_chars = 0

    def budget(text: str) -> str:
        nonlocal total_chars
        total_chars += len(text)
        if total_chars > MAX_TEXT_CHARS:
            raise PortableError("Extracted text exceeds the 2,000,000 character budget.")
        return text

    try:
        with zipfile.ZipFile(source) as archive:
            if receipt["kind"] == "docx":
                with archive.open("word/document.xml") as handle:
                    paragraphs = _docx_paragraphs(handle.read())
                for entry in paragraphs:
                    budget(entry["text"])
                return {
                    "ok": True,
                    "source": receipt,
                    "kind": "docx",
                    "paragraphs": paragraphs,
                    "characters": total_chars,
                    "note": (
                        "Styles named Heading1-Heading6 (or localized equivalents) mark headings; "
                        "listItem marks numbered/bulleted paragraphs. Tables, images, and text "
                        "boxes are not extracted here - read the document for them."
                    ),
                }
            import xml.etree.ElementTree as ET

            slide_names = sorted(
                (name for name in archive.namelist()
                 if re.fullmatch(r"ppt/slides/slide\d+\.xml", name)),
                key=lambda name: int(re.search(r"\d+", name).group()),
            )
            a_ns = "http://schemas.openxmlformats.org/drawingml/2006/main"
            slides = []
            for slide_number, name in enumerate(slide_names, start=1):
                with archive.open(name) as handle:
                    root = ET.fromstring(handle.read())
                texts = []
                for paragraph in root.iter(f"{{{a_ns}}}p"):
                    text = "".join(node.text or "" for node in paragraph.iter(f"{{{a_ns}}}t"))
                    if text.strip():
                        texts.append(budget(text))
                slides.append({"slide": slide_number, "texts": texts})
            return {
                "ok": True,
                "source": receipt,
                "kind": "pptx",
                "slides": slides,
                "characters": total_chars,
                "note": "Speaker notes, images, and charts are not extracted here - read the document for them.",
            }
    except (zipfile.BadZipFile, KeyError) as exc:
        raise PortableError("Could not read the Office archive: " + compact_error(exc)) from exc


MAX_BATCH_ITEMS = 60


def batch_remediate_command(args: argparse.Namespace) -> Dict[str, Any]:
    manifest_path = Path(args.manifest).resolve()
    if not manifest_path.is_file():
        raise PortableError("Batch manifest not found.")
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise PortableError("Could not parse the batch manifest: " + compact_error(exc)) from exc
    items = manifest.get("items") if isinstance(manifest, dict) else manifest
    if not isinstance(items, list) or not items:
        raise PortableError('The manifest must be {"items": [{"source": ..., "plan": ...}, ...]}.')
    if len(items) > MAX_BATCH_ITEMS:
        raise PortableError(f"The manifest exceeds the {MAX_BATCH_ITEMS}-document batch limit.")

    out_root = Path(args.out_dir).resolve()
    out_root.mkdir(parents=True, exist_ok=True)
    scoreboard: List[Dict[str, Any]] = []
    completed = 0
    for index, item in enumerate(items):
        if not isinstance(item, dict) or "source" not in item or "plan" not in item:
            scoreboard.append({"index": index, "ok": False, "error": "Item needs source and plan."})
            continue
        source_path = Path(str(item["source"])).resolve()
        entry: Dict[str, Any] = {"index": index, "source": source_path.name}
        item_out = out_root / f"{index + 1:02d}-{safe_stem(source_path.name)}"
        try:
            result = remediate(argparse.Namespace(
                source=str(source_path),
                plan=str(item["plan"]),
                out_dir=str(item_out),
                pdf=args.pdf,
                verapdf=args.verapdf,
            ))
            entry.update({
                "ok": True,
                "verdict": result["verdict"],
                "pdfUaCompliant": result.get("pdfUaCompliant"),
                "outputDirectory": item_out.name,
            })
            completed += 1
        except PortableError as exc:
            entry.update({"ok": False, "error": str(exc)})
        except Exception as exc:  # continue the batch; fail only this item
            entry.update({"ok": False, "error": "Unexpected failure: " + compact_error(exc)})
        scoreboard.append(entry)

    summary = {
        "ok": completed == len(items),
        "total": len(items),
        "completed": completed,
        "failed": len(items) - completed,
        "outputDirectory": out_root.name,
        "items": scoreboard,
    }
    summary_path = out_root / "batch-scoreboard.json"
    if not summary_path.exists():
        write_json_new(summary_path, summary)
    return summary


# ---------------------------------------------------------------------------
# Deterministic PDF text extraction (stdlib-only).
#
# Purpose: independent ground truth. When a source PDF has a text layer, the
# script itself can measure how much of that text a repair plan carries -
# without trusting the model that wrote the plan. Handles the two encodings
# that dominate born-digital PDFs: literal strings (PDFDoc/WinAnsi, read as
# latin-1) and hex strings decoded through each font's /ToUnicode CMap
# (Identity-H subset fonts, as produced by Word, Chrome, and LaTeX).
# Known limits, by design: no CID fonts without ToUnicode, no Type3 glyph
# programs, no encrypted files. Extraction that finds too little text reports
# that honestly instead of guessing.
# ---------------------------------------------------------------------------

_LITERAL_ESCAPES = {
    b"n": "\n", b"r": "\r", b"t": "\t", b"b": "\b", b"f": "\f",
    b"(": "(", b")": ")", b"\\": "\\",
}


def _decode_literal_string(body: bytes, font: Optional[Dict[str, Any]] = None) -> str:
    # Literal strings are byte codes in the CURRENT FONT's encoding, not
    # latin-1. Subset fonts remap them arbitrarily - corpus round 2: the
    # Spanish UDHR types every accented letter through a 6-glyph subset font
    # whose literal "(!)" means 'ó' via its ToUnicode CMap. Decode through the
    # font's single-byte CMap when it has one; latin-1 otherwise.
    codes: List[int] = []
    i = 0
    while i < len(body):
        char = body[i:i + 1]
        if char != b"\\":
            codes.append(body[i])
            i += 1
            continue
        nxt = body[i + 1:i + 2]
        octal = re.match(rb"[0-7]{1,3}", body[i + 1:i + 4] or b"")
        if octal:
            codes.append(int(octal.group(), 8) & 0xFF)
            i += 1 + len(octal.group())
        elif nxt in (b"\r", b"\n"):
            i += 2
            if nxt == b"\r" and body[i:i + 1] == b"\n":
                i += 1
        else:
            replacement = _LITERAL_ESCAPES.get(nxt)
            codes.append(ord(replacement) if replacement else (nxt[0] if nxt else 0))
            i += 2
    return _decode_font_bytes(bytes(code & 0xFF for code in codes), font)


# Ligature presentation forms expanded to their letter sequences: a ToUnicode
# that maps a glyph to U+FB01 is correct PDF, but the text layer this feeds is
# compared against pdf.js output, which expands them (corpus round 7: 'qualified'
# vs 'qualiﬁed' read as a recall miss).
_LIGATURE_EXPANSIONS = {
    "ﬀ": "ff", "ﬁ": "fi", "ﬂ": "fl",
    "ﬃ": "ffi", "ﬄ": "ffl", "ﬅ": "st", "ﬆ": "st",
}

# The Adobe Glyph List entries that actually occur in subset-font /Differences
# arrays, plus the algorithmic uniXXXX / uXXXXXX forms handled in
# _glyph_to_unicode. Deliberately small: an unknown name resolves to None and
# the byte falls through to the raw-char path, same as before.
_AGL_SUBSET = {
    "fi": "fi", "fl": "fl", "ff": "ff", "ffi": "ffi", "ffl": "ffl",
    "space": " ", "exclam": "!", "quotedbl": '"', "numbersign": "#",
    "dollar": "$", "percent": "%", "ampersand": "&", "quotesingle": "'",
    "parenleft": "(", "parenright": ")", "asterisk": "*", "plus": "+",
    "comma": ",", "hyphen": "-", "period": ".", "slash": "/",
    "zero": "0", "one": "1", "two": "2", "three": "3", "four": "4",
    "five": "5", "six": "6", "seven": "7", "eight": "8", "nine": "9",
    "colon": ":", "semicolon": ";", "less": "<", "equal": "=", "greater": ">",
    "question": "?", "at": "@", "bracketleft": "[", "backslash": "\\",
    "bracketright": "]", "asciicircum": "^", "underscore": "_",
    "grave": "`", "braceleft": "{", "bar": "|", "braceright": "}",
    "asciitilde": "~", "quoteleft": "‘", "quoteright": "’",
    "quotedblleft": "“", "quotedblright": "”",
    "endash": "–", "emdash": "—", "bullet": "•",
    "ellipsis": "…", "degree": "°", "cent": "¢",
    "section": "§", "paragraph": "¶", "dagger": "†",
    "daggerdbl": "‡", "trademark": "™", "registered": "®",
    "copyright": "©",
}


def _glyph_to_unicode(name: str) -> Optional[str]:
    """Resolve a glyph NAME to text (AGL subset + AGL algorithmic rules)."""
    if "." in name:  # variant suffix: 'fi.alt' names a variant OF 'fi'
        name = name.split(".", 1)[0]
        if not name:
            return None
    if name in _AGL_SUBSET:
        return _AGL_SUBSET[name]
    if len(name) == 1 and name.isalpha():
        return name
    m = re.fullmatch(r"uni((?:[0-9A-Fa-f]{4})+)", name)
    if m:
        hexes = m.group(1)
        return "".join(chr(int(hexes[i:i + 4], 16)) for i in range(0, len(hexes), 4))
    m = re.fullmatch(r"u([0-9A-Fa-f]{4,6})", name)
    if m:
        try:
            return chr(int(m.group(1), 16))
        except ValueError:
            return None
    if "_" in name:  # AGL ligature convention: 'f_i' joins its components
        parts = [_glyph_to_unicode(part) for part in name.split("_")]
        if parts and all(parts):
            return "".join(parts)
    return None


def _expand_ligatures(text: str) -> str:
    if not any(ch in _LIGATURE_EXPANSIONS for ch in text):
        return text
    return "".join(_LIGATURE_EXPANSIONS.get(ch, ch) for ch in text)


def _decode_font_bytes(raw: bytes, font: Optional[Dict[str, Any]]) -> str:
    """Decode raw string bytes through the current font's ToUnicode CMap.

    Shared by literal "(...)" and hex "<...>" strings: both are byte codes in
    the font's encoding, and composite fonts use MULTI-BYTE codes. Handling
    only single-byte codes here turned a 2-byte Identity-H font's literal
    strings into raw glyph bytes (corpus round 4: an FDA/AstraZeneca letter
    extracted as pure binary and scored 0.39 recall).
    """
    mapping = font.get("map") if font else None
    if not mapping:
        return raw.decode("latin1")
    code_len = font.get("codeLen") or 1
    if code_len <= 1:
        return _expand_ligatures("".join(mapping.get(byte, chr(byte)) for byte in raw))
    out: List[str] = []
    for index in range(0, len(raw) - (len(raw) % code_len), code_len):
        code = int.from_bytes(raw[index:index + code_len], "big")
        out.append(mapping.get(code, ""))
    return _expand_ligatures("".join(out))


def _bfrange_target(dst_hex: bytes, offset: int) -> str:
    text = bytes.fromhex(dst_hex.decode("ascii")).decode("utf-16-be", "ignore")
    if not text:
        return ""
    return text[:-1] + chr(ord(text[-1]) + offset)


def _parse_tounicode(cmap_bytes: bytes) -> Dict[str, Any]:
    mapping: Dict[int, str] = {}
    code_len = 2
    space = re.search(rb"begincodespacerange\s*<([0-9A-Fa-f]+)>", cmap_bytes)
    if space:
        code_len = max(1, len(space.group(1)) // 2)
    for section in re.findall(rb"beginbfchar(.*?)endbfchar", cmap_bytes, re.S):
        for src, dst in re.findall(rb"<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>", section):
            mapping[int(src, 16)] = bytes.fromhex(dst.decode("ascii")).decode("utf-16-be", "ignore")
    for section in re.findall(rb"beginbfrange(.*?)endbfrange", cmap_bytes, re.S):
        for low, high, arr in re.findall(
            rb"<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*\[(.*?)\]", section, re.S
        ):
            targets = re.findall(rb"<([0-9A-Fa-f]+)>", arr)
            for offset, dst in enumerate(targets):
                mapping[int(low, 16) + offset] = bytes.fromhex(dst.decode("ascii")).decode(
                    "utf-16-be", "ignore"
                )
        for low, high, dst in re.findall(
            rb"<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>", section
        ):
            low_i, high_i = int(low, 16), int(high, 16)
            for offset in range(min(high_i - low_i, 0xFFFF) + 1):
                mapping[low_i + offset] = _bfrange_target(dst, offset)
    return {"map": mapping, "codeLen": code_len}


def _balanced_dict(data: bytes, start: int) -> Optional[bytes]:
    depth = 0
    i = start
    while i < len(data) - 1:
        pair = data[i:i + 2]
        if pair == b"<<":
            depth += 1
            i += 2
        elif pair == b">>":
            depth -= 1
            i += 2
            if depth == 0:
                return data[start:i]
        else:
            i += 1
    return None


def _dict_value(index: Dict[int, Tuple[bytes, Optional[bytes]]], container: Optional[bytes], key: str) -> Optional[bytes]:
    """Resolve /Key as an inline dictionary or a single indirect reference."""
    if not container:
        return None
    inline = re.search(rb"/" + key.encode("ascii") + rb"\s*<<", container)
    if inline:
        return _balanced_dict(container, inline.end() - 2)
    ref = re.search(rb"/" + key.encode("ascii") + rb"\s+(\d+)\s+0\s+R", container)
    if ref:
        entry = index.get(int(ref.group(1)))
        return entry[0] if entry else None
    return None


# The last alternative is `/Name Do`, a Form XObject invocation, captured HERE
# in stream order rather than by walking the page's /XObject resource dict: a
# dict walk visits each XObject once, so a badge stamped four times on a page
# contributed its text once and in the wrong place (corpus round 8 — the
# i1040's STOP badge is one XObject drawn at every flowchart dead end, and 2
# of 9 survived). The Tf alternative requires a number before Tf, so `/I1 Do`
# cannot be mistaken for a font selection.
_TEXT_OPS = re.compile(
    rb"/(\w+)\s+[\d.+-]+\s+Tf"
    rb"|\(((?:[^()\\]|\\.)*)\)\s*(Tj|'|\")"
    rb"|<([0-9A-Fa-f\s]+)>\s*Tj"
    rb"|\[((?:[^\]\\]|\\.)*)\]\s*TJ"
    rb"|\b(ET|T\*)\b"
    rb"|/([\w.]+)\s+Do\b",
    re.S,
)
_TJ_PIECES = re.compile(
    rb"\(((?:[^()\\]|\\.)*)\)|<([0-9A-Fa-f\s]+)>|(-?\d+(?:\.\d+)?)"
)
# A TJ kern this large (thousandths of an em) is a synthesized word gap.
_TJ_SPACE_THRESHOLD = 150


def _decode_hex_string(hex_bytes: bytes, font: Optional[Dict[str, Any]]) -> str:
    digits = re.sub(rb"\s+", b"", hex_bytes).decode("ascii")
    if len(digits) % 2:
        digits += "0"
    return _decode_font_bytes(bytes.fromhex(digits), font)


def _page_content_segments(
    content: bytes, fonts: Dict[str, Dict[str, Any]]
) -> List[Tuple[str, str]]:
    """One content stream in order as ("text", s) and ("xobject", name) parts.

    The caller resolves "xobject" parts, because resolution needs the resource
    dictionary the stream was invoked with.
    """
    # Consecutive show operators are glyph runs of the same visual line (word
    # gaps arrive as explicit space glyphs or large TJ kerns), so they join
    # without a separator; only true line operators (ET, T*, ', ") break.
    segments: List[Tuple[str, str]] = []
    pieces: List[str] = []
    current: Optional[Dict[str, Any]] = None

    def flush() -> None:
        if pieces:
            segments.append(("text", "".join(pieces)))
            pieces.clear()

    for match in _TEXT_OPS.finditer(content):
        font_name, literal, literal_op, hex_str, tj_array, line_op, xobject = match.groups()
        if font_name is not None:
            current = fonts.get(font_name.decode("latin1"))
        elif literal is not None:
            if literal_op in (b"'", b'"'):
                pieces.append("\n")
            pieces.append(_decode_literal_string(literal, current))
        elif hex_str is not None:
            pieces.append(_decode_hex_string(hex_str, current))
        elif tj_array is not None:
            for lit, hexs, number in _TJ_PIECES.findall(tj_array):
                if lit:
                    pieces.append(_decode_literal_string(lit, current))
                elif hexs:
                    pieces.append(_decode_hex_string(hexs, current))
                elif number and abs(float(number)) >= _TJ_SPACE_THRESHOLD:
                    pieces.append(" ")
        elif line_op is not None:
            pieces.append("\n")
        elif xobject is not None:
            flush()
            segments.append(("xobject", xobject.decode("latin1")))
    flush()
    return segments


def _page_content_text(content: bytes, fonts: Dict[str, Dict[str, Any]]) -> str:
    return "".join(body for kind, body in _page_content_segments(content, fonts) if kind == "text")


def _decompress_stream(dictionary: bytes, raw: bytes) -> Optional[bytes]:
    import zlib as _zlib

    if b"/FlateDecode" in dictionary:
        # decompressobj tolerates trailing bytes after the deflate stream,
        # which occur whenever /Length is an indirect reference and the slice
        # runs to `endstream` (corpus round 1: every content stream of the
        # 1913 Form 1040 failed strict zlib.decompress this way).
        try:
            decompressor = _zlib.decompressobj()
            out = decompressor.decompress(raw)
            return out if out else None
        except _zlib.error:
            return None
    if b"/Filter" not in dictionary:
        return raw
    return None


# ── CFF (Type1C) built-in encoding (corpus round 7, i1040) ───────────────────
# A subset CFF font with no /ToUnicode and no /Differences keeps its code→glyph
# assignment ONLY inside the font program: the i1040's HelveticaNeueLTStd
# subsets park fi at code 0x1F this way, and 25 words per document decoded with
# a raw control char in the middle. The CFF charset names every glyph by SID,
# so code→GID→SID→name is fully deterministic — same class of stdlib parsing as
# the ObjStm/CMap/predictor readers above. Any structural surprise returns {}
# and the caller keeps the existing raw-byte behaviour.

# Standard-strings SIDs 1..95 are the ASCII printables in order, with Adobe's
# two quote quirks; these are the non-ASCII entries above 95 that occur in
# text fonts. SIDs ≥ 391 come from the font's own String INDEX.
_CFF_SID_EXTRA = {
    96: "¡", 97: "¢", 98: "£", 100: "¥", 102: "§", 104: "'", 105: "“",
    106: "«", 109: "fi", 110: "fl", 111: "–", 112: "†", 113: "‡", 114: "·",
    115: "¶", 116: "•", 119: "”", 120: "»", 121: "…", 123: "¿", 124: "`",
    137: "—", 138: "Æ", 141: "ª", 145: "æ", 149: "ı", 152: "ø", 153: "œ",
    155: "º", 158: "Ø", 159: "Œ",
}


def _cff_sid_to_text(sid: int, strings: List[bytes]) -> Optional[str]:
    if sid <= 0:
        return None
    if sid <= 95:
        if sid == 8:
            return "’"  # quoteright sits where ASCII has the apostrophe
        if sid == 65:
            return "‘"  # quoteleft sits where ASCII has the grave accent
        return chr(0x20 + sid - 1)
    if sid in _CFF_SID_EXTRA:
        return _CFF_SID_EXTRA[sid]
    if sid >= 391 and sid - 391 < len(strings):
        return _glyph_to_unicode(strings[sid - 391].decode("latin1", "replace"))
    return None


def _cff_read_index(data: bytes, pos: int) -> Tuple[List[bytes], int]:
    count = int.from_bytes(data[pos:pos + 2], "big")
    pos += 2
    if count == 0:
        return [], pos
    off_size = data[pos]
    pos += 1
    if not 1 <= off_size <= 4:
        raise ValueError("bad offSize")
    offsets = []
    for _ in range(count + 1):
        offsets.append(int.from_bytes(data[pos:pos + off_size], "big"))
        pos += off_size
    base = pos - 1
    items = [data[base + offsets[i]:base + offsets[i + 1]] for i in range(count)]
    return items, base + offsets[-1]


def _cff_parse_dict(blob: bytes) -> Dict[int, List[int]]:
    out: Dict[int, List[int]] = {}
    operands: List[int] = []
    i = 0
    while i < len(blob):
        b0 = blob[i]
        if b0 <= 21:
            op = b0
            i += 1
            if b0 == 12:
                op = 1200 + blob[i]
                i += 1
            out[op] = operands
            operands = []
        elif b0 == 28:
            operands.append(int.from_bytes(blob[i + 1:i + 3], "big", signed=True))
            i += 3
        elif b0 == 29:
            operands.append(int.from_bytes(blob[i + 1:i + 5], "big", signed=True))
            i += 5
        elif b0 == 30:  # real number: nibble stream, 0xF nibble terminates
            i += 1
            while i < len(blob):
                v = blob[i]
                i += 1
                if (v & 0x0F) == 0x0F or (v >> 4) == 0x0F:
                    break
            operands.append(0)
        elif 32 <= b0 <= 246:
            operands.append(b0 - 139)
            i += 1
        elif 247 <= b0 <= 250:
            operands.append((b0 - 247) * 256 + blob[i + 1] + 108)
            i += 2
        elif 251 <= b0 <= 254:
            operands.append(-(b0 - 251) * 256 - blob[i + 1] - 108)
            i += 2
        else:
            i += 1
    return out


def _cff_code_map(cff: bytes) -> Dict[int, str]:
    """code → text from a CFF font program's own encoding + charset."""
    try:
        pos = cff[2]  # header size
        _, pos = _cff_read_index(cff, pos)  # Name INDEX
        top_dicts, pos = _cff_read_index(cff, pos)  # Top DICT INDEX
        strings, pos = _cff_read_index(cff, pos)  # String INDEX
        if not top_dicts:
            return {}
        top = _cff_parse_dict(top_dicts[0])
        charstrings_off = (top.get(17) or [0])[-1]
        if charstrings_off <= 0 or charstrings_off + 2 > len(cff):
            return {}
        n_glyphs = int.from_bytes(cff[charstrings_off:charstrings_off + 2], "big")
        if not n_glyphs:
            return {}
        # charset: GID → SID. 0 = ISOAdobe identity; 1/2 = expert (not text).
        charset_off = (top.get(15) or [0])[-1]
        if charset_off in (1, 2):
            return {}
        gid_to_sid = list(range(n_glyphs))
        if charset_off > 2:
            sids = [0]
            p = charset_off
            fmt = cff[p]
            p += 1
            if fmt == 0:
                for _ in range(n_glyphs - 1):
                    sids.append(int.from_bytes(cff[p:p + 2], "big"))
                    p += 2
            elif fmt in (1, 2):
                left_size = 1 if fmt == 1 else 2
                while len(sids) < n_glyphs:
                    first = int.from_bytes(cff[p:p + 2], "big")
                    p += 2
                    n_left = int.from_bytes(cff[p:p + left_size], "big")
                    p += left_size
                    for k in range(n_left + 1):
                        if len(sids) < n_glyphs:
                            sids.append(first + k)
            else:
                return {}
            gid_to_sid = sids
        # encoding: code → GID. 0/1 predefined (standard/expert): nothing to
        # repair — the raw-byte fallback already matches standard codes.
        enc_off = (top.get(16) or [0])[-1]
        if enc_off <= 1:
            return {}
        p = enc_off
        fmt = cff[p]
        p += 1
        code_to_gid: Dict[int, int] = {}
        supplements: List[Tuple[int, int]] = []
        base_fmt = fmt & 0x7F
        if base_fmt == 0:
            n_codes = cff[p]
            p += 1
            for gid in range(1, n_codes + 1):
                code_to_gid[cff[p]] = gid
                p += 1
        elif base_fmt == 1:
            n_ranges = cff[p]
            p += 1
            gid = 1
            for _ in range(n_ranges):
                first, n_left = cff[p], cff[p + 1]
                p += 2
                for k in range(n_left + 1):
                    code_to_gid[first + k] = gid
                    gid += 1
        else:
            return {}
        if fmt & 0x80:
            n_sups = cff[p]
            p += 1
            for _ in range(n_sups):
                supplements.append((cff[p], int.from_bytes(cff[p + 1:p + 3], "big")))
                p += 3
        out: Dict[int, str] = {}
        for code, gid in code_to_gid.items():
            if 0 <= gid < len(gid_to_sid):
                text = _cff_sid_to_text(gid_to_sid[gid], strings)
                if text:
                    out[code] = text
        for code, sid in supplements:
            text = _cff_sid_to_text(sid, strings)
            if text:
                out[code] = text
        return out
    except Exception:
        return {}


def _fonts_from_resources(
    index: Dict[int, Tuple[bytes, Optional[bytes]]], resources: Optional[bytes]
) -> Dict[str, Dict[str, Any]]:
    """Build {resource name -> font info} for one /Resources dictionary.

    Code length comes from the FONT SUBTYPE, not from the ToUnicode CMap's
    codespacerange: simple fonts (Type1/TrueType/Type3) always take 1-byte
    codes, and only Type0 composite fonts take multi-byte ones. Trusting the
    CMap's range instead silently broke every simple font whose generator
    wrote a <0000><FFFF> codespace (corpus round 4).
    """
    font_dict = _dict_value(index, resources, "Font")
    fonts: Dict[str, Dict[str, Any]] = {}
    if not font_dict:
        return fonts
    for name, ref in re.findall(rb"/(\w+)\s+(\d+)\s+0\s+R", font_dict):
        entry = index.get(int(ref))
        if not entry:
            continue
        parsed: Dict[str, Any] = {}
        unicode_ref = re.search(rb"/ToUnicode\s+(\d+)\s+0\s+R", entry[0])
        if unicode_ref:
            cmap_entry = index.get(int(unicode_ref.group(1)))
            if cmap_entry and cmap_entry[1] is not None:
                cmap_bytes = _decompress_stream(cmap_entry[0], cmap_entry[1])
                if cmap_bytes:
                    parsed = _parse_tounicode(cmap_bytes)
        composite = re.search(rb"/Subtype\s*/Type0\b", entry[0]) is not None
        parsed["codeLen"] = 2 if composite else 1
        # /Encoding /Differences supplement (corpus round 7, i1040): subset
        # fonts park ligature glyphs at otherwise-unmapped codes with no
        # ToUnicode entry — HelveticaNeueLTStd puts fi at 0x1F, so the decoder
        # emitted a raw control char and 'qualified' read as 'qualied'. The
        # Differences array NAMES the glyph, which is deterministic. ToUnicode
        # still wins wherever it speaks; simple fonts only (Type0 has none).
        if not composite:
            encoding = _dict_value(index, entry[0], "Encoding")
            differences = (
                re.search(rb"/Differences\s*\[(.*?)\]", encoding, re.S)
                if encoding
                else None
            )
            if differences:
                mapping = parsed.setdefault("map", {})
                code = 0
                for num, glyph in re.findall(
                    rb"(\d+)|/([^\s/\[\]<>()]+)", differences.group(1)
                ):
                    if num:
                        code = int(num)
                        continue
                    if code not in mapping:
                        uni = _glyph_to_unicode(glyph.decode("latin1"))
                        if uni:
                            mapping[code] = uni
                    code += 1
            # Last in precedence: the CFF program's own encoding, for codes
            # neither ToUnicode nor Differences spoke for (fill-only-missing
            # keeps the precedence order, so attempting it is always safe).
            descriptor = _dict_value(index, entry[0], "FontDescriptor")
            file_ref = (
                re.search(rb"/FontFile3\s+(\d+)\s+0\s+R", descriptor)
                if descriptor
                else None
            )
            file_entry = index.get(int(file_ref.group(1))) if file_ref else None
            if file_entry and file_entry[1] is not None and re.search(
                rb"/Subtype\s*/Type1C\b", file_entry[0]
            ):
                cff = _decompress_stream(file_entry[0], file_entry[1])
                if cff:
                    cff_map = _cff_code_map(cff)
                    if cff_map:
                        mapping = parsed.setdefault("map", {})
                        for code, text in cff_map.items():
                            if code not in mapping:
                                mapping[code] = text
        fonts[name.decode("latin1")] = parsed
    return fonts


def _pdf_extract_text(data: bytes) -> Dict[str, Any]:
    index: Dict[int, Tuple[bytes, Optional[bytes]]] = {}
    for number, dictionary, raw in _pdf_iter_stream_objects(data):
        index[number] = (dictionary, raw)

    def page_fonts(page_dict: bytes) -> Dict[str, Dict[str, Any]]:
        resources = _dict_value(index, page_dict, "Resources")
        seen_parents = 0
        node = page_dict
        while resources is None and seen_parents < 8:
            parent = re.search(rb"/Parent\s+(\d+)\s+0\s+R", node)
            if not parent:
                break
            entry = index.get(int(parent.group(1)))
            if not entry:
                break
            node = entry[0]
            resources = _dict_value(index, node, "Resources")
            seen_parents += 1
        return _fonts_from_resources(index, resources)

    pages: List[str] = []
    for number, (dictionary, raw) in sorted(index.items(), key=lambda item: item[0]):
        if not re.search(rb"/Type\s*/Page\b", dictionary) or re.search(rb"/Type\s*/Pages\b", dictionary):
            continue
        content_refs: List[int] = []
        direct = re.search(rb"/Contents\s+(\d+)\s+0\s+R", dictionary)
        if direct:
            ref = int(direct.group(1))
            if ref in index:
                content_refs.append(ref)
            else:
                # /Contents may reference an ARRAY OBJECT of stream refs
                # ("3 0 obj [139 0 R 5 0 R ...]"), which the dict-only object
                # walk never yields (corpus round 1: the 1913 Form 1040 keeps
                # every page's streams behind one). Resolve it from raw bytes.
                array_obj = re.search(
                    rb"(?:^|[\r\n])" + str(ref).encode("ascii") + rb"\s+0\s+obj\s*\[([^\]]*)\]",
                    data,
                )
                if array_obj:
                    content_refs.extend(
                        int(item) for item in re.findall(rb"(\d+)\s+0\s+R", array_obj.group(1))
                    )
        else:
            array = re.search(rb"/Contents\s*\[([^\]]*)\]", dictionary)
            if array:
                content_refs.extend(int(ref) for ref in re.findall(rb"(\d+)\s+0\s+R", array.group(1)))
        fonts = page_fonts(dictionary)
        page_text: List[str] = []

        draw_budget = [4000]

        def collect(
            stream_num: int,
            inherited_fonts: Dict[str, Dict[str, Any]],
            parent_resources: Optional[bytes],
            depth: int,
            stack: Tuple[int, ...],
        ) -> None:
            """Extract a content stream, splicing each Form XObject's text in at
            its `Do` — text layers routinely live inside Form XObjects, not the
            page's direct content stream (corpus round 1: the 1913 Form 1040's
            hidden print-production text layer), and a stamped XObject may be
            drawn many times (corpus round 8). `stack` guards reference cycles.
            """
            if depth > 6 or stream_num in stack:
                return
            entry = index.get(stream_num)
            if not entry or entry[1] is None:
                return
            content = _decompress_stream(entry[0], entry[1])
            if not content:
                return
            own_resources = _dict_value(index, entry[0], "Resources")
            own_fonts = inherited_fonts
            if own_resources is not None:
                own_font_dict = _fonts_from_resources(index, own_resources)
                if own_font_dict:
                    own_fonts = {**inherited_fonts, **own_font_dict}
            resources = own_resources if own_resources is not None else parent_resources
            xobjects = _dict_value(index, resources, "XObject")
            next_stack = stack + (stream_num,)
            for kind, body in _page_content_segments(content, own_fonts):
                if kind == "text":
                    page_text.append(body)
                    continue
                if not xobjects or draw_budget[0] <= 0:
                    continue
                named = re.search(
                    rb"/" + re.escape(body.encode("latin1")) + rb"\s+(\d+)\s+0\s+R", xobjects
                )
                if not named:
                    continue
                xentry = index.get(int(named.group(1)))
                if not xentry or not re.search(rb"/Subtype\s*/Form\b", xentry[0]):
                    continue
                draw_budget[0] -= 1
                collect(int(named.group(1)), own_fonts, resources, depth + 1, next_stack)

        page_resources = _dict_value(index, dictionary, "Resources")
        for ref in content_refs:
            collect(ref, fonts, page_resources, 0, ())
        pages.append("".join(page_text))

    text = "\n".join(pages)
    # A document with no text layer yields only the per-page newline joins. Reporting
    # "3 characters extracted" for a pure scan overstates what was recovered, so collapse
    # a whitespace-only result to a true zero (cross-check against the MCP connector's
    # independent extractor, which reports 0 for the same file).
    if not text.strip():
        return {"pages": len(pages), "characters": 0, "text": ""}
    return {"pages": len(pages), "characters": len(text), "text": text[:MAX_TEXT_CHARS]}


def _tokens(text: str) -> "Counter[str]":
    from collections import Counter

    return Counter(re.findall(r"[^\W_]+", text.lower(), re.UNICODE))


def _plan_text(validated: Dict[str, Any], include_alt: bool = True) -> str:
    """Concatenate the plan's text.

    include_alt=False drops image alt text, which is authored by the plan and
    lives in the tagged PDF's /Alt structure attribute rather than in visible
    page content. Counting it against the OUTPUT recall made a correctly
    rendered image look like content loss (corpus round 4).
    """
    # Ordered-list numbering is carried structurally by <ol>, but in a source
    # text layer the numerals are literal glyphs; emit them here so recall
    # compares semantics, not markup choices (corpus round 1: UDHR's clause
    # numbers were the entire 1.8% "missing" share).
    pieces: List[str] = []
    for block in validated["blocks"]:
        if block.get("type") == "list" and block.get("ordered"):
            for position, item in enumerate(block["items"], start=1):
                pieces.append(f"{position}. {item}")
        elif block.get("type") == "image" and not include_alt:
            pieces.append(str(block.get("caption") or ""))
        else:
            pieces.append(block_text(block))
    return "\n".join(pieces)


def _token_recall(reference: "Counter[str]", candidate: "Counter[str]") -> Optional[float]:
    total = sum(reference.values())
    if not total:
        return None
    matched = sum(min(count, candidate.get(token, 0)) for token, count in reference.items())
    return round(matched / total, 4)


MIN_RECALL_TOKENS = 50


def merge_plans_command(args: argparse.Namespace) -> Dict[str, Any]:
    """Merge tranche plans authored across multiple sessions into one plan.

    Long documents (the corpus has a 126-page instruction book) cannot be read
    and authored in one sitting. The protocol: each session authors a TRANCHE -
    a complete plan file covering a contiguous page range - and this command
    concatenates them with the checks that make the split safe:
      - every tranche's document header must be IDENTICAL (same source binding,
        title, language), so tranches cannot silently describe different files;
      - tranche page ranges must be in order and non-overlapping across
        boundaries, so a mis-ordered or duplicated tranche is refused;
      - the merged result must pass FULL plan validation (single h1, heading
        ladder, budgets) before anything is written;
      - pages no tranche covered are reported, so partial coverage is visible
        rather than silent.
    """
    paths = [Path(p).resolve() for p in args.tranches]
    if len(paths) < 2:
        raise PortableError("merge-plans needs at least two tranche files.", 2)
    tranches = []
    for path in paths:
        if not path.is_file():
            raise PortableError(f"Tranche not found: {path.name}", 2)
        if path.stat().st_size > MAX_PLAN_BYTES:
            raise PortableError(f"Tranche exceeds the plan size limit: {path.name}", 2)
        try:
            tranches.append(json.loads(path.read_text(encoding="utf-8")))
        except (OSError, json.JSONDecodeError) as exc:
            raise PortableError(f"Could not parse tranche {path.name}: {compact_error(exc)}") from exc

    head = tranches[0].get("document")
    if not isinstance(head, dict):
        raise PortableError("Tranche 1 has no document header.", 3)
    for position, tranche in enumerate(tranches[1:], start=2):
        if tranche.get("document") != head:
            raise PortableError(
                f"Tranche {position} ({paths[position - 1].name}) has a different document "
                "header than tranche 1. All tranches must bind to the same source with the "
                "same title/language/type.",
                3,
            )

    merged_blocks: List[Any] = []
    previous_last = 0
    ranges = []
    for position, tranche in enumerate(tranches, start=1):
        blocks = tranche.get("blocks")
        if not isinstance(blocks, list) or not blocks:
            raise PortableError(f"Tranche {position} has no blocks.", 3)
        pages = [b.get("source_page") for b in blocks
                 if isinstance(b, dict) and isinstance(b.get("source_page"), int)]
        first, last = (min(pages), max(pages)) if pages else (None, None)
        if first is not None and first < previous_last:
            raise PortableError(
                f"Tranche {position} starts at page {first} but tranche {position - 1} "
                f"already covered up to page {previous_last}. Tranches must be supplied in "
                "reading order and may not overlap across their boundary.",
                3,
            )
        previous_last = last if last is not None else previous_last
        ranges.append({"tranche": paths[position - 1].name, "firstPage": first, "lastPage": last,
                       "blocks": len(blocks)})
        merged_blocks.extend(blocks)

    seen_notes = set()
    merged_notes: List[str] = []
    for tranche in tranches:
        for note in tranche.get("review_notes") or []:
            if isinstance(note, str) and note not in seen_notes:
                seen_notes.add(note)
                merged_notes.append(note)

    merged = {
        "schema_version": "1.0",
        "document": head,
        "blocks": merged_blocks,
        "review_notes": merged_notes,
    }

    validated = validate_plan(merged, paths[0].parent)
    if not validated["ok"]:
        raise PortableError(
            "Merged plan failed validation:\n- " + "\n- ".join(validated["errors"]), 3
        )

    covered = {b.get("source_page") for b in merged_blocks
               if isinstance(b, dict) and isinstance(b.get("source_page"), int)}
    page_count = head.get("source_page_count") or 0
    uncovered = sorted(set(range(1, page_count + 1)) - covered)

    out_path = Path(args.out).resolve()
    if out_path.exists():
        raise PortableError("Refusing to overwrite an existing merged plan.")
    write_json_new(out_path, merged)
    return {
        "ok": True,
        "out": out_path.name,
        "tranches": ranges,
        "blocks": len(merged_blocks),
        "reviewNotes": len(merged_notes),
        "pagesWithoutBlocks": uncovered,
        "note": (
            "Pages listed in pagesWithoutBlocks have no block assigned to them. Blank pages "
            "are fine; content pages there mean a tranche is missing. The merged plan passed "
            "full validation but has NOT been remediated or verified yet."
        ),
    }


def extract_text_command(args: argparse.Namespace) -> Dict[str, Any]:
    source = Path(args.source).resolve()
    receipt = ensure_source_pdf(source)
    extraction = _pdf_extract_text(source.read_bytes())
    token_count = sum(_tokens(extraction["text"]).values())
    result = {
        "ok": True,
        "source": receipt,
        "pages": extraction["pages"],
        "characters": extraction["characters"],
        "tokens": token_count,
        "note": (
            "Deterministic extraction (literal strings + ToUnicode CMaps). Low counts on a "
            "document that visibly contains text mean the encoding is out of scope, not that "
            "the document is empty - fall back to reading it."
        ),
    }
    if args.include_text:
        result["text"] = extraction["text"]
    return result


# ---------------------------------------------------------------------------
# Independent verification (two-model rule).
#
# The model that wrote the repair plan graded its own fidelity; these commands
# make a SECOND, fresh-context reader grade it instead. verify-init derives a
# worksheet from the plan deterministically - one attestation per source page,
# heading, table, list, and image, plus global items. The verifier (a model or
# a person who did NOT author the plan) reads the source document and the
# rebuilt HTML directly and fills every item. verify-check then enforces
# completeness and bindings, and stamps a verification report. The script
# cannot prove the verifier's independence; it records the attestation and
# refuses to stamp without it.
# ---------------------------------------------------------------------------

VERIFY_STATUSES = {"verified", "discrepancy", "unreadable"}
MIN_DISCREPANCY_NOTE = 20
MIN_VERIFIER_STATEMENT = 40


def _worksheet_items(validated: Dict[str, Any]) -> List[Dict[str, Any]]:
    items: List[Dict[str, Any]] = []

    def add(identifier: str, kind: str, instruction: str, **extra: Any) -> None:
        items.append({
            "id": identifier,
            "kind": kind,
            "instruction": instruction,
            **extra,
            "status": None,
            "note": "",
        })

    for page in range(1, validated["document"]["source_page_count"] + 1):
        add(
            f"page-{page:03d}",
            "page",
            "Read source page "
            f"{page} in full and confirm every piece of its content is represented in the "
            "rebuild (or covered by a disclosed omission in the review notes).",
            source_page=page,
        )
    counters = {"heading": 0, "table": 0, "list": 0, "image": 0, "emphasis": 0, "link": 0}
    for block in validated["blocks"]:
        kind = block.get("type")
        run_groups = (
            [cell for row in block["cell_runs"] for cell in (row or [])]
            if block.get("cell_runs")
            else (block["item_runs"] if block.get("item_runs") else [block.get("runs")])
        )
        all_runs = [run for group in run_groups for run in (group or [])]
        linked = [run for run in all_runs if run.get("href")]
        if linked:
            counters["link"] += 1
            add(
                f"linkrun-{counters['link']:03d}",
                "inline_link",
                "For each linked span: does the source really carry a link here (annotation or "
                "written-out URL), does the destination match, and is the link text meaningful "
                "out of context?",
                links=[{"text": run["text"][:80], "href": run["href"][:200]} for run in linked[:10]],
                source_page=block.get("source_page"),
            )
        styled = block.get("runs") or block.get("item_runs") or block.get("cell_runs")
        if styled:
            counters["emphasis"] += 1
            emphasised = [
                run["text"] for run in all_runs if run.get("style") in {"emphasis", "strong"}
            ]
            add(
                f"emphasis-{counters['emphasis']:03d}",
                "inline_style",
                "Check the source's character formatting for this block: are exactly these "
                "spans emphasised (and none missed), and does the emphasis type match?",
                emphasised=emphasised[:20],
                source_page=block.get("source_page"),
            )
        if kind == "heading":
            counters["heading"] += 1
            add(
                f"heading-{counters['heading']:03d}",
                "heading",
                "Confirm this heading exists in the source with this meaning and that its "
                "level reflects the document's actual hierarchy.",
                level=block["level"],
                text=block["text"],
                source_page=block["source_page"],
            )
        elif kind == "table":
            counters["table"] += 1
            add(
                f"table-{counters['table']:03d}",
                "table",
                "Compare EVERY cell of this table against the source, including header "
                "assignment and row/column order.",
                caption=block["caption"],
                columns=len(block["columns"]),
                rows=len(block["rows"]),
                source_page=block["source_page"],
            )
        elif kind == "list":
            counters["list"] += 1
            add(
                f"list-{counters['list']:03d}",
                "list",
                "Confirm the list has exactly these items in the source's order, none "
                "dropped, merged, or invented.",
                items=len(block["items"]),
                ordered=block["ordered"],
                source_page=block["source_page"],
            )
        elif kind == "image" and not block.get("decorative"):
            counters["image"] += 1
            add(
                f"image-{counters['image']:03d}",
                "image_alt",
                "Look at the source image and judge whether this alt text is accurate and "
                "sufficient (not merely plausible).",
                alt=block.get("alt", ""),
                source_page=block["source_page"],
            )
    add(
        "global-completeness",
        "global",
        "After reading all pages: is any source content absent from the rebuild without a "
        "disclosed review note?",
    )
    add(
        "global-no-invention",
        "global",
        "Is there any content in the rebuild that does not exist in the source?",
    )
    add(
        "global-reading-order",
        "global",
        "Does the rebuild's linear order preserve or improve the source's logical reading "
        "order, with any relocation disclosed?",
    )
    add(
        "global-review-notes",
        "global",
        "Does every transformation you observed (moved content, dropped furniture, rejoined "
        "sentences) appear in the review notes, and is every note accurate?",
    )
    return items


def _verify_bindings(plan_path: Path, source_path: Path, html_path: Path) -> Dict[str, str]:
    return {
        "source_sha256": sha256_file(source_path),
        "plan_sha256": sha256_file(plan_path),
        "html_sha256": sha256_file(html_path),
    }


def _load_validated_plan(plan_path: Path) -> Dict[str, Any]:
    plan = read_plan(plan_path)
    validated = validate_plan(plan, plan_path.parent)
    if not validated["ok"]:
        raise PortableError(
            "Repair plan validation failed:\n- " + "\n- ".join(validated["errors"]), 3
        )
    return validated


def verify_init_command(args: argparse.Namespace) -> Dict[str, Any]:
    plan_path = Path(args.plan).resolve()
    source_path = Path(args.source).resolve()
    html_path = Path(args.html).resolve()
    ensure_source_document(source_path)
    if not html_path.is_file():
        raise PortableError("Rebuilt HTML not found.")
    validated = _load_validated_plan(plan_path)
    worksheet = {
        "schemaVersion": "1.0",
        "createdAt": utc_now(),
        "binding": _verify_bindings(plan_path, source_path, html_path),
        "verifier": {
            "model": "",
            "context_isolation": "",
            "read_source_directly": None,
            "statement": "",
        },
        "instructions": (
            "You are the independent verifier. You must NOT be the model instance that "
            "authored the repair plan, and you must read the source document and the rebuilt "
            "HTML directly. Fill status for every item: 'verified', 'discrepancy', or "
            "'unreadable'. Every 'discrepancy' or 'unreadable' needs a specific note "
            f"(>= {MIN_DISCREPANCY_NOTE} characters) naming what and where. Then fill the "
            "verifier block: model, context_isolation='fresh-context', "
            "read_source_directly=true, and a statement (>= "
            f"{MIN_VERIFIER_STATEMENT} characters) of what you read and how."
        ),
        "items": _worksheet_items(validated),
    }
    out_path = Path(args.out).resolve()
    if out_path.exists():
        raise PortableError("Refusing to overwrite an existing worksheet.")
    write_json_new(out_path, worksheet)
    return {
        "ok": True,
        "worksheet": out_path.name,
        "items": len(worksheet["items"]),
        "nextStep": "Have a fresh-context reader fill the worksheet, then run verify-check.",
    }


def verify_check_command(args: argparse.Namespace) -> Dict[str, Any]:
    worksheet_path = Path(args.worksheet).resolve()
    if not worksheet_path.is_file():
        raise PortableError("Worksheet not found.")
    try:
        worksheet = json.loads(worksheet_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise PortableError("Could not parse the worksheet: " + compact_error(exc)) from exc

    plan_path = Path(args.plan).resolve()
    source_path = Path(args.source).resolve()
    html_path = Path(args.html).resolve()
    problems: List[str] = []

    expected_binding = _verify_bindings(plan_path, source_path, html_path)
    actual_binding = worksheet.get("binding") or {}
    for key, value in expected_binding.items():
        if actual_binding.get(key) != value:
            problems.append(f"binding.{key} does not match the supplied file.")

    validated = _load_validated_plan(plan_path)
    expected_ids = [item["id"] for item in _worksheet_items(validated)]
    actual_items = worksheet.get("items") or []
    actual_ids = [item.get("id") for item in actual_items if isinstance(item, dict)]
    if sorted(actual_ids) != sorted(expected_ids):
        problems.append(
            "Worksheet items do not match the plan (missing, duplicated, or invented ids)."
        )

    discrepancies: List[Dict[str, Any]] = []
    unreadable: List[Dict[str, Any]] = []
    for item in actual_items:
        if not isinstance(item, dict):
            problems.append("A worksheet item is not an object.")
            continue
        status = item.get("status")
        note = str(item.get("note") or "")
        if status not in VERIFY_STATUSES:
            problems.append(f"Item {item.get('id')} has no valid status.")
            continue
        if status in {"discrepancy", "unreadable"}:
            if len(note.strip()) < MIN_DISCREPANCY_NOTE:
                problems.append(
                    f"Item {item.get('id')} is '{status}' but its note is too short to act on."
                )
            record = {"id": item.get("id"), "kind": item.get("kind"), "note": note}
            (discrepancies if status == "discrepancy" else unreadable).append(record)

    verifier = worksheet.get("verifier") or {}
    if not str(verifier.get("model") or "").strip():
        problems.append("verifier.model is empty.")
    if verifier.get("context_isolation") != "fresh-context":
        problems.append("verifier.context_isolation must be exactly 'fresh-context'.")
    if verifier.get("read_source_directly") is not True:
        problems.append("verifier.read_source_directly must be true.")
    if len(str(verifier.get("statement") or "").strip()) < MIN_VERIFIER_STATEMENT:
        problems.append("verifier.statement is missing or too short.")

    if problems:
        raise PortableError(
            "Verification worksheet is incomplete or invalid:\n- " + "\n- ".join(problems), 3
        )

    result = "verified" if not discrepancies and not unreadable else "discrepancies-found"
    report = {
        "schemaVersion": "1.0",
        "createdAt": utc_now(),
        "result": result,
        "binding": expected_binding,
        "verifier": {
            "model": verifier.get("model"),
            "context_isolation": verifier.get("context_isolation"),
            "statement": verifier.get("statement"),
        },
        "counts": {
            "items": len(actual_items),
            "verified": len(actual_items) - len(discrepancies) - len(unreadable),
            "discrepancies": len(discrepancies),
            "unreadable": len(unreadable),
        },
        "discrepancies": discrepancies,
        "unreadable": unreadable,
        "meaning": (
            "'verified' means an independent reader attested every item against the source. "
            "It does not upgrade any compliance claim, and the script cannot prove the "
            "reader's independence - it records the attestation."
        ),
    }
    if args.out:
        out_path = Path(args.out).resolve()
        if out_path.exists():
            raise PortableError("Refusing to overwrite an existing verification report.")
        write_json_new(out_path, report)
        report["reportFile"] = out_path.name
    report["ok"] = True
    return report


def lint_command(args: argparse.Namespace) -> Dict[str, Any]:
    input_path = Path(args.html).resolve()
    if not input_path.is_file():
        raise PortableError("HTML file not found.")
    if input_path.stat().st_size > MAX_PLAN_BYTES:
        raise PortableError("HTML file exceeds the 8 MiB limit.")
    result = audit_html(input_path.read_text(encoding="utf-8"))
    if args.out:
        out_path = Path(args.out).resolve()
        if out_path.exists():
            raise PortableError("Refusing to overwrite existing lint output.")
        write_json_new(out_path, result)
    return result


def validate_pdf_command(args: argparse.Namespace) -> Dict[str, Any]:
    pdf_path = Path(args.pdf).resolve()
    ensure_source_pdf(pdf_path)
    result = validate_pdf_ua(pdf_path)
    result["ok"] = result.get("status") == "completed" and result.get("compliant") is True
    if args.out:
        out_path = Path(args.out).resolve()
        if out_path.exists():
            raise PortableError("Refusing to overwrite existing validation output.")
        write_json_new(out_path, result)
    return result


def source_info_command(args: argparse.Namespace) -> Dict[str, Any]:
    return ensure_source_document(Path(args.source).resolve())


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="alloflow_portable.py")
    parser.add_argument("--version", action="version", version=VERSION)
    subparsers = parser.add_subparsers(dest="command", required=True)

    cap = subparsers.add_parser("capabilities", help="Report local, independent capabilities.")
    cap.add_argument("--json", action="store_true", help="Emit JSON.")

    source_info = subparsers.add_parser(
        "source-info",
        help="Return a redacted receipt used to bind a repair plan to one PDF.",
    )
    source_info.add_argument("--source", required=True)

    remediate_parser = subparsers.add_parser("remediate", help="Build artifacts from a validated repair plan.")
    remediate_parser.add_argument("--source", required=True)
    remediate_parser.add_argument("--plan", required=True)
    remediate_parser.add_argument("--out-dir", required=True)
    remediate_parser.add_argument("--pdf", choices=("auto", "never", "required"), default="auto")
    remediate_parser.add_argument("--verapdf", choices=("auto", "never", "required"), default="auto")

    lint_parser = subparsers.add_parser("lint", help="Run the deterministic HTML structural audit.")
    lint_parser.add_argument("--html", required=True)
    lint_parser.add_argument("--out")

    pdf_parser = subparsers.add_parser("validate-pdf", help="Run local veraPDF PDF/UA-1 validation.")
    pdf_parser.add_argument("--pdf", required=True)
    pdf_parser.add_argument("--out")

    audit_parser = subparsers.add_parser(
        "audit-source",
        help="Deterministic structural before-facts for a source PDF (no rendering, no score).",
    )
    audit_parser.add_argument("--source", required=True)

    images_parser = subparsers.add_parser(
        "extract-images",
        help="Extract image XObjects from a source PDF for reuse in a repair plan.",
    )
    images_parser.add_argument("--source", required=True)
    images_parser.add_argument("--out-dir", required=True)
    images_parser.add_argument("--min-pixels", type=int, default=4096)

    office_parser = subparsers.add_parser(
        "extract-office",
        help="Extract text from a .docx or .pptx so a repair plan can be authored without vision.",
    )
    office_parser.add_argument("--source", required=True)

    batch_parser = subparsers.add_parser(
        "batch-remediate",
        help="Remediate up to 60 (source, plan) pairs from a manifest; emits a per-file scoreboard.",
    )
    batch_parser.add_argument("--manifest", required=True)
    batch_parser.add_argument("--out-dir", required=True)
    batch_parser.add_argument("--pdf", choices=("auto", "never", "required"), default="auto")
    batch_parser.add_argument("--verapdf", choices=("auto", "never", "required"), default="auto")

    merge_parser = subparsers.add_parser(
        "merge-plans",
        help="Merge tranche plans authored across sessions into one validated plan (long documents).",
    )
    merge_parser.add_argument("--tranches", nargs="+", required=True)
    merge_parser.add_argument("--out", required=True)

    text_parser = subparsers.add_parser(
        "extract-text",
        help="Deterministically extract a PDF's text layer (literal strings + ToUnicode CMaps).",
    )
    text_parser.add_argument("--source", required=True)
    text_parser.add_argument("--include-text", action="store_true")

    verify_init = subparsers.add_parser(
        "verify-init",
        help="Derive an independent-verification worksheet from a repair plan.",
    )
    verify_init.add_argument("--plan", required=True)
    verify_init.add_argument("--source", required=True)
    verify_init.add_argument("--html", required=True)
    verify_init.add_argument("--out", required=True)

    verify_check = subparsers.add_parser(
        "verify-check",
        help="Validate a filled worksheet and stamp the verification report.",
    )
    verify_check.add_argument("--worksheet", required=True)
    verify_check.add_argument("--plan", required=True)
    verify_check.add_argument("--source", required=True)
    verify_check.add_argument("--html", required=True)
    verify_check.add_argument("--out")
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    try:
        exit_code = 0
        if args.command == "capabilities":
            result = capabilities()
        elif args.command == "source-info":
            result = source_info_command(args)
        elif args.command == "remediate":
            result = remediate(args)
        elif args.command == "lint":
            result = lint_command(args)
            if result.get("ok") is not True:
                exit_code = 7
        elif args.command == "validate-pdf":
            result = validate_pdf_command(args)
            if result.get("status") != "completed":
                exit_code = 5
            elif result.get("compliant") is not True:
                exit_code = 6
        elif args.command == "audit-source":
            result = audit_source_command(args)
        elif args.command == "extract-images":
            result = extract_images_command(args)
        elif args.command == "extract-office":
            result = extract_office_command(args)
        elif args.command == "batch-remediate":
            result = batch_remediate_command(args)
            if result.get("ok") is not True:
                exit_code = 8
        elif args.command == "merge-plans":
            result = merge_plans_command(args)
        elif args.command == "extract-text":
            result = extract_text_command(args)
        elif args.command == "verify-init":
            result = verify_init_command(args)
        elif args.command == "verify-check":
            result = verify_check_command(args)
            if result.get("result") == "discrepancies-found":
                exit_code = 9
        else:
            parser.error("Unknown command.")
            return 2
        emit_json(result)
        return exit_code
    except PortableError as exc:
        emit_json({"ok": False, "error": str(exc), "code": exc.code})
        return exc.code
    except Exception as exc:  # Fail closed without printing document content.
        emit_json({"ok": False, "error": "Unexpected local failure: " + compact_error(exc), "code": 1})
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
