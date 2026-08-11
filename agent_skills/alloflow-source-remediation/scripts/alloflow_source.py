#!/usr/bin/env python3
"""AlloFlow source remediation: patch-plan engine (experimental).

The documents pathway's contract, translated to code: plans bind to exact
file bytes by SHA-256, every edit must locate uniquely, application never
touches the original tree, and the before/after comparison treats behavior
preservation (rendered text, introduced violations) as first-class evidence.

Stdlib only. Network is never used.
"""

import argparse
import hashlib
import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

VERSION = "0.2.0"

MAX_PATCHES = 200
MAX_COPY_BYTES = 200 * 1024 * 1024
COPY_EXCLUDE = {".git", "node_modules", "__pycache__", ".venv", "dist"}
REFUSED_PATH_PARTS = {"node_modules", "vendor", "vendored", "third_party"}
REFUSED_SUFFIX_HINTS = (".min.js", ".min.css", ".bundle.js", ".map")


class SourceError(Exception):
    def __init__(self, message: str, code: int = 2) -> None:
        super().__init__(message)
        self.code = code


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def within(child: Path, parent: Path) -> bool:
    try:
        child.resolve().relative_to(parent.resolve())
        return True
    except ValueError:
        return False


def load_plan(plan_path: Path) -> Dict[str, Any]:
    try:
        plan = json.loads(plan_path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as error:
        raise SourceError(f"Could not read the patch plan: {error}") from error
    if not isinstance(plan, dict):
        raise SourceError("The patch plan must be a JSON object.")
    return plan


def validate_plan(plan: Dict[str, Any], root: Path) -> Dict[str, Any]:
    errors: List[str] = []
    warnings: List[str] = []

    if plan.get("schema_version") != "0.1":
        errors.append("schema_version must be '0.1'.")
    for key in plan:
        if key not in {"schema_version", "target", "patches", "review_notes"}:
            errors.append(f"Unexpected top-level key: {key}")

    target = plan.get("target") or {}
    files = target.get("files") if isinstance(target, dict) else None
    bound: Dict[str, str] = {}
    if not isinstance(files, list) or not files:
        errors.append("target.files must be a non-empty array of {path, sha256}.")
        files = []
    for index, entry in enumerate(files):
        where = f"target.files[{index}]"
        if not isinstance(entry, dict) or not entry.get("path") or not entry.get("sha256"):
            errors.append(where + " must carry path and sha256.")
            continue
        rel = str(entry["path"]).replace("\\", "/")
        candidate = root / rel
        if not within(candidate, root):
            errors.append(where + " escapes the root.")
            continue
        if not candidate.is_file():
            errors.append(where + f" does not exist under the root: {rel}")
            continue
        actual = sha256_file(candidate)
        if actual.lower() != str(entry["sha256"]).lower():
            errors.append(
                where + f" SHA-256 mismatch for {rel}: the tree has changed since the plan was authored."
            )
        bound[rel] = actual

    patches = plan.get("patches")
    if not isinstance(patches, list) or not patches:
        errors.append("patches must be a non-empty array.")
        patches = []
    if len(patches) > MAX_PATCHES:
        errors.append(f"patches exceeds the {MAX_PATCHES}-patch limit.")

    texts: Dict[str, str] = {}
    spans_by_file: Dict[str, List[tuple]] = {}
    for index, patch in enumerate(patches):
        where = f"patches[{index}]"
        if not isinstance(patch, dict):
            errors.append(where + " must be an object.")
            continue
        for key in patch:
            if key not in {"file", "find", "replace", "rationale", "wcag", "changes_rendered_text", "occurrence"}:
                errors.append(where + f" has an unexpected key: {key}")
        rel = str(patch.get("file") or "").replace("\\", "/")
        find = patch.get("find")
        replace = patch.get("replace")
        rationale = str(patch.get("rationale") or "")
        if rel not in bound:
            errors.append(where + f".file '{rel}' is not bound in target.files.")
            continue
        lowered = rel.lower()
        if any(part in lowered.split("/") for part in REFUSED_PATH_PARTS) or lowered.endswith(REFUSED_SUFFIX_HINTS):
            errors.append(
                where + f" targets vendored/minified code ({rel}); refuse and record it in review_notes instead."
            )
        if not isinstance(find, str) or not find:
            errors.append(where + ".find must be a non-empty string.")
            continue
        if not isinstance(replace, str):
            errors.append(where + ".replace must be a string.")
            continue
        if find == replace:
            errors.append(where + " find and replace are identical.")
        if len(rationale.strip()) < 20:
            errors.append(where + ".rationale must say what this fixes (at least 20 characters).")
        if rel not in texts:
            # newline='' everywhere (E-SRC-3, W3C BAD round 2): default text
            # mode translates line endings on read AND write, so apply was
            # silently rewriting an LF file as CRLF — 389 phantom bytes the
            # independent verifier had to explain. Bytes must round-trip.
            with (root / rel).open(encoding="utf-8", errors="replace", newline="") as handle:
                texts[rel] = handle.read()
        # E-SRC-1 (W3C BAD run, 2026-08-11): byte-identical repeated markup
        # (spacer GIFs x7) is unpatchable under an exactly-once contract. An
        # explicit 1-based `occurrence` targets the Nth match. All positions
        # are located in the ORIGINAL bound bytes and applied by span, so an
        # earlier patch can never shift or manufacture a later patch's match
        # (sequential replace-on-evolving-text had exactly that hazard).
        positions: List[int] = []
        start = texts[rel].find(find)
        while start >= 0:
            positions.append(start)
            start = texts[rel].find(find, start + 1)
        occurrence = patch.get("occurrence")
        if occurrence is not None:
            if not isinstance(occurrence, int) or isinstance(occurrence, bool) or occurrence < 1:
                errors.append(where + ".occurrence must be a positive integer (1-based).")
                continue
            if occurrence > len(positions):
                errors.append(
                    where + f".occurrence is {occurrence} but the find occurs only {len(positions)} time(s) in {rel}."
                )
                continue
            chosen = positions[occurrence - 1]
        else:
            if len(positions) != 1:
                errors.append(
                    where + f".find occurs {len(positions)} times in {rel}; it must occur exactly once "
                    "(or carry an explicit 1-based `occurrence`)."
                )
                continue
            chosen = positions[0]
        spans_by_file.setdefault(rel, []).append((chosen, chosen + len(find), index, replace))

    for rel, spans in spans_by_file.items():
        ordered = sorted(spans)
        for (start_a, end_a, idx_a, _), (start_b, end_b, idx_b, _) in zip(ordered, ordered[1:]):
            if start_b < end_a:
                errors.append(
                    f"patches[{idx_a}] and patches[{idx_b}] overlap in {rel}; overlapping edits are refused."
                )

    notes = plan.get("review_notes")
    if not isinstance(notes, list):
        errors.append("review_notes must be an array (empty is allowed only by saying so with []).")

    text_changing = sum(1 for p in patches if isinstance(p, dict) and p.get("changes_rendered_text") is True)
    return {
        "ok": not errors,
        "errors": errors,
        "warnings": warnings,
        "metrics": {
            "patches": len(patches),
            "boundFiles": len(bound),
            "textChangingPatches": text_changing,
            "occurrenceIndexedPatches": sum(
                1 for p in patches if isinstance(p, dict) and p.get("occurrence") is not None
            ),
        },
        "_spans": spans_by_file,
    }


def cmd_validate(args: argparse.Namespace) -> Dict[str, Any]:
    root = Path(args.root).resolve()
    if not root.is_dir():
        raise SourceError("--root must be an existing directory.")
    plan = load_plan(Path(args.plan).resolve())
    result = validate_plan(plan, root)
    result.pop("_spans", None)
    result["note"] = (
        "Validation proves the plan binds to this exact tree and applies uniquely. "
        "It does not judge whether the fixes are RIGHT - the before/after audits and a human do."
    )
    return result


def cmd_apply(args: argparse.Namespace) -> Dict[str, Any]:
    root = Path(args.root).resolve()
    out_dir = Path(args.out_dir).resolve()
    if not root.is_dir():
        raise SourceError("--root must be an existing directory.")
    if out_dir.exists():
        raise SourceError("Refusing to overwrite an existing --out-dir.")
    if within(out_dir, root):
        raise SourceError("--out-dir must lie outside the root being copied.")
    plan = load_plan(Path(args.plan).resolve())
    validation = validate_plan(plan, root)
    if not validation["ok"]:
        raise SourceError("Patch plan validation failed:\n- " + "\n- ".join(validation["errors"]), 3)

    total = 0
    for path in root.rglob("*"):
        if any(part in COPY_EXCLUDE for part in path.parts):
            continue
        if path.is_file():
            total += path.stat().st_size
            if total > MAX_COPY_BYTES:
                raise SourceError("The tree exceeds the 200 MB copy cap; point --root at the app subtree instead.")

    shutil.copytree(
        root,
        out_dir,
        ignore=shutil.ignore_patterns(*COPY_EXCLUDE),
    )

    # Position-based application against the ORIGINAL bytes: every span was
    # located during validation (and the copy's bytes are sha-bound to the
    # original), so splicing in descending order applies all patches without
    # any patch shifting or manufacturing another's match.
    applied: List[Dict[str, Any]] = []
    per_file_before: Dict[str, str] = {}
    for rel, spans in validation["_spans"].items():
        target = out_dir / rel
        per_file_before[rel] = sha256_file(target)
        with target.open(encoding="utf-8", errors="replace", newline="") as handle:
            text = handle.read()
        for start, end, _, replace in sorted(spans, reverse=True):
            text = text[:start] + replace + text[end:]
        with target.open("w", encoding="utf-8", newline="") as handle:
            handle.write(text)
    for patch in plan["patches"]:
        rel = str(patch["file"]).replace("\\", "/")
        applied.append({
            "file": rel,
            "rationale": patch["rationale"],
            "wcag": patch.get("wcag") or [],
            "occurrence": patch.get("occurrence"),
            "changesRenderedText": bool(patch.get("changes_rendered_text")),
            "sha256Before": per_file_before[rel],
            "sha256After": sha256_file(out_dir / rel),
        })

    manifest = {
        "schemaVersion": "0.1",
        "createdAt": utc_now(),
        "engineVersion": VERSION,
        "root": root.name,
        "patchesApplied": applied,
        "reviewNotes": list(plan.get("review_notes") or []),
        "note": (
            "The original tree was not modified. Rebuild this copy if the project needs a build step, "
            "re-audit the same pages from it, then run compare. The project's own test suite must pass "
            "on this copy before any merge."
        ),
    }
    (out_dir / "applied-manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    return {"ok": True, "outDir": out_dir.name, "patchesApplied": len(applied), "manifest": "applied-manifest.json"}


def _load(path_value: str) -> Dict[str, Any]:
    try:
        loaded = json.loads(Path(path_value).resolve().read_text(encoding="utf-8"))
    except (OSError, ValueError) as error:
        raise SourceError(f"Could not read {Path(path_value).name}: {error}") from error
    if not isinstance(loaded, dict) or not loaded.get("ok"):
        raise SourceError(f"{Path(path_value).name} is not a successful audit report.")
    return loaded


def cmd_compare(args: argparse.Namespace) -> Dict[str, Any]:
    before = _load(args.before)["audit"]
    after = _load(args.after)["audit"]
    plan = load_plan(Path(args.plan).resolve()) if args.plan else None

    before_ids = {v["id"]: v for v in before["axe"]["violations"]}
    after_ids = {v["id"]: v for v in after["axe"]["violations"]}
    fixed = sorted(set(before_ids) - set(after_ids))
    introduced = sorted(set(after_ids) - set(before_ids))
    remaining = sorted(set(after_ids) & set(before_ids))

    text_changed = before["text"]["sha256"] != after["text"]["sha256"]
    disclosed = bool(plan and any(p.get("changes_rendered_text") for p in plan.get("patches", [])))

    unreachable_before = len(before["keyboard"]["unreachable"])
    unreachable_after = len(after["keyboard"]["unreachable"])

    problems: List[str] = []
    if introduced:
        problems.append("New axe violations were INTRODUCED: " + ", ".join(introduced))
    if unreachable_after > unreachable_before:
        problems.append("Keyboard reachability regressed.")
    if text_changed and not disclosed:
        problems.append(
            "The rendered text changed but no patch declares changes_rendered_text; "
            "undisclosed content drift is treated as a failure."
        )
    verdict = "regressed" if problems else ("improved" if (fixed or unreachable_after < unreachable_before) else "unchanged")

    return {
        "ok": True,
        "verdict": verdict,
        "problems": problems,
        "axe": {
            "before": len(before_ids),
            "after": len(after_ids),
            "fixed": fixed,
            "introduced": introduced,
            "remaining": remaining,
        },
        "keyboard": {
            "unreachableBefore": unreachable_before,
            "unreachableAfter": unreachable_after,
            "suspectedTrapBefore": before["keyboard"]["suspectedTrap"],
            "suspectedTrapAfter": after["keyboard"]["suspectedTrap"],
        },
        "outline": {
            "imagesWithoutAlt": [before["outline"]["imagesWithoutAlt"], after["outline"]["imagesWithoutAlt"]],
            "unlabeledControls": [before["outline"]["unlabeledControls"], after["outline"]["unlabeledControls"]],
            "langBefore": before["outline"]["lang"],
            "langAfter": after["outline"]["lang"],
        },
        "behavior": {
            "renderedTextChanged": text_changed,
            "declaredByPlan": disclosed,
        },
        "note": (
            "An axe pass is necessary, not sufficient; this comparison is evidence for a human "
            "reviewer and the project's own test suite, never a compliance determination."
        ),
        "createdAt": utc_now(),
    }


# ── Independent verification (two-model rule), ported from the documents
# pathway. The patch author graded its own work; a fresh-context reader who
# did not author the patches must attest every item before the toolchain
# will stamp a verification report. The script cannot prove independence;
# it records the attestation and refuses to stamp without it.

VERIFY_STATUSES = {"verified", "discrepancy", "unreadable"}
MIN_DISCREPANCY_NOTE = 20
MIN_VERIFIER_STATEMENT = 40


def _sha256_path(path: Path) -> str:
    return sha256_file(path)


def _verify_binding(plan_path: Path, before_path: Path, after_path: Path) -> Dict[str, str]:
    return {
        "plan_sha256": _sha256_path(plan_path),
        "before_audit_sha256": _sha256_path(before_path),
        "after_audit_sha256": _sha256_path(after_path),
    }


def _introduces_text_alternative(replace: str) -> bool:
    lowered = replace.lower()
    return 'alt="' in lowered or "aria-label=" in lowered


def cmd_verify_init(args: argparse.Namespace) -> Dict[str, Any]:
    plan_path = Path(args.plan).resolve()
    before_path = Path(args.before).resolve()
    after_path = Path(args.after).resolve()
    plan = load_plan(plan_path)
    after = _load(str(after_path))["audit"]

    items: List[Dict[str, Any]] = []

    def add(identifier: str, kind: str, instruction: str, **extra: Any) -> None:
        items.append({"id": identifier, "kind": kind, "instruction": instruction, **extra, "status": None, "note": ""})

    for index, patch in enumerate(plan.get("patches") or []):
        base = (
            "Read this patch in context in the PATCHED file. Verify: the change does what the "
            "rationale claims, touches only the semantics or attributes it names, and changes "
            "no behavior or rendered text beyond what changes_rendered_text declares."
        )
        if _introduces_text_alternative(str(patch.get("replace") or "")):
            base += (
                " This patch introduces a text alternative: view the referenced image or rendered "
                "element and judge whether the alternative is accurate and sufficient, not merely plausible."
            )
        add(
            f"patch-{index:03d}",
            "patch",
            base,
            file=patch.get("file"),
            find=str(patch.get("find") or "")[:600],
            replace=str(patch.get("replace") or "")[:600],
            rationale=patch.get("rationale"),
            occurrence=patch.get("occurrence"),
            changes_rendered_text=bool(patch.get("changes_rendered_text")),
        )

    add(
        "global-no-behavior-change",
        "global",
        "Compare the before and after pages (render both, or reason from the full diff plus the "
        "compare evidence): is every behavioral difference accounted for by a declared patch?",
    )
    add(
        "global-completeness",
        "global",
        "Every violation remaining in the after-audit must be covered by an accurate review note. "
        f"Remaining after-audit violation ids: {[v['id'] for v in after['axe']['violations']]}.",
    )
    add(
        "global-review-notes",
        "global",
        "Read every review note in the plan: is each one accurate, and is every refusal or "
        "known remainder you observed actually recorded?",
    )
    add(
        "global-keyboard",
        "global",
        "Operate (or independently re-run the keyboard walk on) the patched page: every "
        "interactive element reachable, no traps, focus never thrown away.",
    )

    worksheet = {
        "schemaVersion": "0.1",
        "createdAt": utc_now(),
        "binding": _verify_binding(plan_path, before_path, after_path),
        "instructions": (
            "You are the independent verifier. You must NOT be the model instance or person who "
            "authored the patch plan, and you must read the patched sources and audits directly. "
            "Fill status for every item: 'verified', 'discrepancy', or 'unreadable'. Every "
            "'discrepancy' or 'unreadable' needs a specific note (>= 20 characters) naming what "
            "and where. Then fill the verifier block: model, context_isolation='fresh-context', "
            "read_source_directly=true, and a statement (>= 40 characters) of what you read and how."
        ),
        "items": items,
        "verifier": {"model": "", "context_isolation": "", "read_source_directly": None, "statement": ""},
    }
    out_path = Path(args.out).resolve()
    out_path.write_text(json.dumps(worksheet, indent=1), encoding="utf-8")
    return {"ok": True, "worksheet": out_path.name, "items": len(items),
            "nextStep": "Have a fresh-context reader fill the worksheet, then run verify-check."}


def cmd_verify_check(args: argparse.Namespace) -> Dict[str, Any]:
    worksheet_path = Path(args.worksheet).resolve()
    try:
        worksheet = json.loads(worksheet_path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as error:
        raise SourceError(f"Could not read the worksheet: {error}") from error

    expected = _verify_binding(Path(args.plan).resolve(), Path(args.before).resolve(), Path(args.after).resolve())
    binding = worksheet.get("binding") or {}
    for key, value in expected.items():
        if str(binding.get(key) or "").lower() != value.lower():
            raise SourceError(
                f"Worksheet binding mismatch on {key}: the plan or audits changed after verify-init "
                "(or the worksheet was tampered with). Re-run verify-init.",
                4,
            )

    items = worksheet.get("items")
    if not isinstance(items, list) or not items:
        raise SourceError("The worksheet has no items.", 4)
    discrepancies: List[Dict[str, Any]] = []
    unreadable: List[Dict[str, Any]] = []
    for item in items:
        status = item.get("status")
        if status not in VERIFY_STATUSES:
            raise SourceError(
                f"Item {item.get('id')} is unfilled or carries an invalid status; every item must be "
                "'verified', 'discrepancy', or 'unreadable'.",
                4,
            )
        note = str(item.get("note") or "")
        if status in {"discrepancy", "unreadable"}:
            if len(note.strip()) < MIN_DISCREPANCY_NOTE:
                raise SourceError(
                    f"Item {item.get('id')} is a {status} but its note does not name what and where "
                    f"(>= {MIN_DISCREPANCY_NOTE} characters).",
                    4,
                )
            record = {"id": item.get("id"), "kind": item.get("kind"), "note": note}
            (discrepancies if status == "discrepancy" else unreadable).append(record)

    verifier = worksheet.get("verifier") or {}
    if verifier.get("context_isolation") != "fresh-context" or verifier.get("read_source_directly") is not True:
        raise SourceError(
            "The verifier block must attest context_isolation='fresh-context' and read_source_directly=true.",
            4,
        )
    if len(str(verifier.get("statement") or "").strip()) < MIN_VERIFIER_STATEMENT:
        raise SourceError("The verifier statement must describe what was read and how (>= 40 characters).", 4)

    counts = {
        "items": len(items),
        "verified": sum(1 for i in items if i.get("status") == "verified"),
        "discrepancies": len(discrepancies),
        "unreadable": len(unreadable),
    }
    report = {
        "schemaVersion": "0.1",
        "createdAt": utc_now(),
        "binding": expected,
        "counts": counts,
        "discrepancies": discrepancies,
        "unreadable": unreadable,
        "verifier": {
            "model": verifier.get("model"),
            "context_isolation": verifier.get("context_isolation"),
            "statement": verifier.get("statement"),
        },
        "result": "discrepancies-found" if discrepancies else ("verified" if not unreadable else "verified-with-unreadable"),
        "meaning": (
            "'verified' means an independent reader attested every item against the patched sources "
            "and audits. It does not upgrade any compliance claim, and the script cannot prove the "
            "reader's independence - it records the attestation."
        ),
        "ok": True,
    }
    if args.out:
        Path(args.out).resolve().write_text(json.dumps(report, indent=1), encoding="utf-8")
    return report


def main() -> None:
    parser = argparse.ArgumentParser(prog="alloflow_source", description="AlloFlow source remediation engine (experimental).")
    parser.add_argument("--version", action="version", version=VERSION)
    sub = parser.add_subparsers(dest="command", required=True)

    cap = sub.add_parser("capabilities", help="Report local capabilities.")
    cap.add_argument("--json", action="store_true")

    val = sub.add_parser("validate-plan", help="Validate a patch plan against a source tree.")
    val.add_argument("--plan", required=True)
    val.add_argument("--root", required=True)

    app = sub.add_parser("apply", help="Copy the tree and apply the plan to the COPY only.")
    app.add_argument("--plan", required=True)
    app.add_argument("--root", required=True)
    app.add_argument("--out-dir", required=True)

    cmp_parser = sub.add_parser("compare", help="Compare before/after audit reports into an evidence verdict.")
    cmp_parser.add_argument("--before", required=True)
    cmp_parser.add_argument("--after", required=True)
    cmp_parser.add_argument("--plan")
    cmp_parser.add_argument("--out")

    vinit = sub.add_parser("verify-init", help="Derive an independent-verification worksheet from a patch plan.")
    vinit.add_argument("--plan", required=True)
    vinit.add_argument("--before", required=True)
    vinit.add_argument("--after", required=True)
    vinit.add_argument("--out", required=True)

    vcheck = sub.add_parser("verify-check", help="Enforce a filled, attested worksheet and stamp a verification report.")
    vcheck.add_argument("--worksheet", required=True)
    vcheck.add_argument("--plan", required=True)
    vcheck.add_argument("--before", required=True)
    vcheck.add_argument("--after", required=True)
    vcheck.add_argument("--out")

    args = parser.parse_args()
    try:
        if args.command == "capabilities":
            result = {
                "ok": True,
                "version": VERSION,
                "planValidation": True,
                "applyToCopyOnly": True,
                "occurrenceIndexedPatches": True,
                "networkPolicy": "deny",
                "auditor": "scripts/audit_page.cjs (needs local Playwright/Chromium; axe-core optional but recommended)",
                "independentVerification": True,
            }
        elif args.command == "validate-plan":
            result = cmd_validate(args)
        elif args.command == "apply":
            result = cmd_apply(args)
        elif args.command == "compare":
            result = cmd_compare(args)
            if args.out:
                Path(args.out).resolve().write_text(json.dumps(result, indent=2), encoding="utf-8")
        elif args.command == "verify-init":
            result = cmd_verify_init(args)
        elif args.command == "verify-check":
            result = cmd_verify_check(args)
        else:  # pragma: no cover
            raise SourceError("Unknown command.")
    except SourceError as error:
        print(json.dumps({"ok": False, "error": str(error), "code": error.code}, indent=2))
        sys.exit(error.code)
    print(json.dumps(result, indent=2))
    if args.command == "validate-plan" and not result.get("ok"):
        sys.exit(3)
    if args.command == "verify-check" and result.get("result") == "discrepancies-found":
        sys.exit(9)


if __name__ == "__main__":
    main()
