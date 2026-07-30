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


VERSION = "0.1.0"
MAX_SOURCE_BYTES = 30 * 1024 * 1024
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
}
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
    sys.stdout.write(json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n")


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
        "paragraph": {"type", "text", "source_page"},
        "blockquote": {"type", "text", "cite", "source_page"},
        "list": {"type", "ordered", "items", "source_page"},
        "table": {"type", "caption", "columns", "rows", "row_headers", "source_page"},
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


def render_html(validated: Dict[str, Any]) -> str:
    document = validated["document"]
    parts: List[str] = []
    for block in validated["blocks"]:
        kind = block["type"]
        page = block.get("source_page")
        source_attr = f' data-source-page="{int(page)}"' if page else ""
        if kind == "heading":
            level = int(block["level"])
            parts.append(f"<h{level}{source_attr}>{esc(block['text'])}</h{level}>")
        elif kind == "paragraph":
            parts.append(f"<p{source_attr}>{esc(block['text'])}</p>")
        elif kind == "blockquote":
            cite = f"<cite>{esc(block.get('cite'))}</cite>" if block.get("cite") else ""
            parts.append(f"<blockquote{source_attr}><p>{esc(block['text'])}</p>{cite}</blockquote>")
        elif kind == "list":
            tag = "ol" if block.get("ordered") else "ul"
            items = "".join(f"<li>{esc(item)}</li>" for item in block.get("items") or [])
            parts.append(f"<{tag}{source_attr}>{items}</{tag}>")
        elif kind == "table":
            headers = "".join(f'<th scope="col">{esc(value)}</th>' for value in block["columns"])
            rows = []
            for row in block["rows"]:
                cells = []
                for index, value in enumerate(row):
                    if index == 0 and block.get("row_headers"):
                        cells.append(f'<th scope="row">{esc(value)}</th>')
                    else:
                        cells.append(f"<td>{esc(value)}</td>")
                rows.append("<tr>" + "".join(cells) + "</tr>")
            parts.append(
                f"<table{source_attr}><caption>{esc(block['caption'])}</caption>"
                f"<thead><tr>{headers}</tr></thead><tbody>{''.join(rows)}</tbody></table>"
            )
        elif kind == "image":
            data_uri = block.get("_data_uri")
            caption = f"<figcaption>{esc(block.get('caption'))}</figcaption>" if block.get("caption") else ""
            if data_uri:
                alt = "" if block.get("decorative") else block.get("alt", "")
                role = ' role="presentation"' if block.get("decorative") else ""
                parts.append(
                    f"<figure{source_attr}><img src=\"{data_uri}\" alt=\"{esc(alt)}\"{role}>{caption}</figure>"
                )
            elif not block.get("decorative"):
                parts.append(
                    f'<figure{source_attr} class="alloflow-figure-fallback">'
                    f'<div role="img" aria-label="{esc(block.get("alt"))}">{esc(block.get("alt"))}</div>'
                    f"{caption}</figure>"
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
figcaption {{ margin-top: .35rem; color: #374151; }}
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
        "taggedPdfGeneration": renderer.get("available") is True,
        "taggedPdfDetail": renderer,
        "pdfUaValidation": validator.get("available") is True,
        "pdfUaDetail": validator,
        "networkPolicy": "deny",
        "alloflowServiceUsed": False,
        "modelApiKeyRequired": False,
    }


def render_pdf(html_path: Path, pdf_path: Path) -> Dict[str, Any]:
    node = shutil.which("node")
    if not node:
        return {"status": "not_run", "reason": "Node.js is unavailable."}
    try:
        result = subprocess.run(
            [node, str(renderer_helper()), "--html", str(html_path), "--pdf", str(pdf_path)],
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
        return {
            "status": "completed",
            "bytes": int(data.get("bytes") or 0),
            "structuralMarkers": data.get("structuralMarkers") or {},
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


def ensure_source_pdf(path: Path) -> Dict[str, Any]:
    if not path.is_file():
        raise PortableError("Source PDF not found.")
    size = path.stat().st_size
    if size < 5 or size > MAX_SOURCE_BYTES:
        raise PortableError("Source PDF is empty or exceeds the 30 MiB limit.")
    with path.open("rb") as handle:
        if handle.read(5) != b"%PDF-":
            raise PortableError("Source file does not have a PDF signature.")
    return {"basename": path.name, "bytes": size, "sha256": sha256_file(path)}


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
    source_receipt = ensure_source_pdf(source)
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
                pdf_result = render_pdf(staged_paths["html"], staged_paths["pdf"])
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
                "semanticHtml": {"status": "completed"},
                "staticHtmlAudit": {
                    "status": "completed",
                    **html_audit,
                },
                "taggedPdfGeneration": pdf_result,
                "pdfUaValidation": pdf_ua,
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
    return ensure_source_pdf(Path(args.source).resolve())


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
