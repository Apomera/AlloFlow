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

VERSION = "0.1.0"

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
    for index, patch in enumerate(patches):
        where = f"patches[{index}]"
        if not isinstance(patch, dict):
            errors.append(where + " must be an object.")
            continue
        for key in patch:
            if key not in {"file", "find", "replace", "rationale", "wcag", "changes_rendered_text"}:
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
            texts[rel] = (root / rel).read_text(encoding="utf-8", errors="replace")
        occurrences = texts[rel].count(find)
        if occurrences != 1:
            errors.append(
                where + f".find occurs {occurrences} times in {rel}; it must occur exactly once."
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
        },
    }


def cmd_validate(args: argparse.Namespace) -> Dict[str, Any]:
    root = Path(args.root).resolve()
    if not root.is_dir():
        raise SourceError("--root must be an existing directory.")
    plan = load_plan(Path(args.plan).resolve())
    result = validate_plan(plan, root)
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

    applied: List[Dict[str, Any]] = []
    for patch in plan["patches"]:
        rel = str(patch["file"]).replace("\\", "/")
        target = out_dir / rel
        before_sha = sha256_file(target)
        text = target.read_text(encoding="utf-8", errors="replace")
        if text.count(patch["find"]) != 1:
            raise SourceError(f"Post-copy uniqueness check failed for {rel}; nothing further applied.", 3)
        target.write_text(text.replace(patch["find"], patch["replace"], 1), encoding="utf-8")
        applied.append({
            "file": rel,
            "rationale": patch["rationale"],
            "wcag": patch.get("wcag") or [],
            "changesRenderedText": bool(patch.get("changes_rendered_text")),
            "sha256Before": before_sha,
            "sha256After": sha256_file(target),
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

    args = parser.parse_args()
    try:
        if args.command == "capabilities":
            result = {
                "ok": True,
                "version": VERSION,
                "planValidation": True,
                "applyToCopyOnly": True,
                "networkPolicy": "deny",
                "auditor": "scripts/audit_page.cjs (needs local Playwright/Chromium; axe-core optional but recommended)",
                "independentVerification": "manual in 0.1.x - say so in any report",
            }
        elif args.command == "validate-plan":
            result = cmd_validate(args)
        elif args.command == "apply":
            result = cmd_apply(args)
        elif args.command == "compare":
            result = cmd_compare(args)
            if args.out:
                Path(args.out).resolve().write_text(json.dumps(result, indent=2), encoding="utf-8")
        else:  # pragma: no cover
            raise SourceError("Unknown command.")
    except SourceError as error:
        print(json.dumps({"ok": False, "error": str(error), "code": error.code}, indent=2))
        sys.exit(error.code)
    print(json.dumps(result, indent=2))
    if args.command == "validate-plan" and not result.get("ok"):
        sys.exit(3)


if __name__ == "__main__":
    main()
