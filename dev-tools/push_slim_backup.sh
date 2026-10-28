#!/bin/bash
# push_slim_backup.sh: the off-site backup (deploy.sh Step 8). Updates a SLIM copy of main
# and pushes it to a private GitLab project.
#
# Why slim: main's full history is ~8 GiB, mostly QA screenshots and generated media that
# were tracked until 2026-10-28. Codeberg's 750 MiB account quota refused every push from
# 2026-10-19 on. The slim copy keeps every commit that touches anything else, but leaves out
# images, videos and traces under reports/ (the report data tests read stays in), generated
# media under allopacks/media/, the generated desktop/web-app/public copies of lang/ and
# ui_strings.js (build.js regenerates them from the root files), and an old leaked
# prismflow-deploy/.env. About 1.8 GiB, under GitLab's 10 GiB per project and 5 GiB per push.
#
# Safety: this NEVER rewrites the main repo. It only READS it (git fast-export) and writes
# into a separate bare repo. Do not replace it with git filter-repo: on 2026-10-19 a
# filter-repo run landed in the main repo and reset every session's uncommitted work.
#
# Marks files make each run export only the commits that are new since the last one, so the
# slim commit IDs never change and every push is a fast-forward.
#
# Disk: a plain fast-export | fast-import stores every file version almost uncompressed and
# needed several times the final size (a first build reached 7 GB and was stopped on
# 2026-10-28 with C: falling toward full). So the export carries no file contents
# (--no-data); during the run the slim repo BORROWS them read-only from the main repo's
# object store (objects/info/alternates), and pack-objects then copies exactly the needed
# objects in, reusing the main repo's compression. The borrow link is removed on exit, and
# a connectivity check proves the slim repo stands alone before anything is pushed.
#
# Usage:   bash dev-tools/push_slim_backup.sh [--no-push]
# Settings (environment): SLIM_BACKUP_DIR (default C:/Users/cabba/AlloFlow-backup-slim, holds
# the bare repo and the marks), SLIM_BACKUP_URL (default the GitLab project).
# Exit 0 = pushed or nothing new; nonzero = failed (deploy.sh only warns).
set -euo pipefail
SRC=$(git rev-parse --show-toplevel)
M=${SLIM_BACKUP_DIR:-C:/Users/cabba/AlloFlow-backup-slim}
DST=$M/AlloFlow-backup-slim.git
URL=${SLIM_BACKUP_URL:-https://gitlab.com/aaron.pomeranz/alloflow-backup.git}
PUSH=1; [ "${1:-}" = "--no-push" ] && PUSH=0
case "$DST" in "$SRC"*) echo "  refusing: the slim repo must live outside the main repo"; exit 1;; esac
if [ ! -d "$DST" ]; then
  echo "  slim backup repo not found at $DST"
  echo "  first-time setup: git init --bare \"$DST\", then rerun this script"
  exit 1
fi
# The backup folder may not record file ownership; trust the slim repo for this run only.
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=safe.directory GIT_CONFIG_VALUE_0=$DST
[ "$(git -C "$DST" rev-parse --is-bare-repository)" = true ] || { echo "  $DST is not a bare repo"; exit 1; }
# Git for Windows creates repos case-insensitive, and fast-import then folds a case-only
# rename (stem_tool_algebraCAS.js -> stem_tool_algebracas.js) back to the old spelling.
git -C "$DST" config core.ignorecase false
imp_src=(); imp_dst=()
if [ -f "$M/src.marks" ] && [ -f "$M/dst.marks" ]; then
  imp_src=(--import-marks="$M/src.marks"); imp_dst=(--import-marks="$M/dst.marks")
fi
media=()
for ext in png jpg jpeg webp gif bmp webm mp4 mov zip trace har pdf; do
  media+=(":(exclude,glob,icase)reports/**/*.$ext")
done
before=$(git -C "$DST" rev-parse -q --verify refs/heads/main || true)
ALT="$DST/objects/info/alternates"
mkdir -p "$DST/objects/info"
trap 'rm -f "$ALT"' EXIT
git -C "$SRC" rev-parse --path-format=absolute --git-common-dir | sed 's#$#/objects#' > "$ALT"
git -C "$SRC" fast-export --no-data --signed-tags=strip --tag-of-filtered-object=drop --reencode=yes \
  "${imp_src[@]}" --export-marks="$M/src.marks.new" refs/heads/main -- . \
  "${media[@]}" ':(exclude)allopacks/media/' \
  ':(exclude)desktop/web-app/public/lang/' ':(exclude)desktop/web-app/public/ui_strings.js' \
  ':(exclude)prismflow-deploy/.env' \
| git -C "$DST" fast-import --quiet "${imp_dst[@]}" --export-marks="$M/dst.marks.new"
after=$(git -C "$DST" rev-parse refs/heads/main)
if [ "$before" != "$after" ]; then
  # Copy in every object the new commits reach (borrowed ones included), then stand alone.
  if [ -n "$before" ]; then range=("$after" --not "$before"); else range=("$after"); fi
  git -C "$DST" rev-list --objects "${range[@]}" \
    | git -C "$DST" pack-objects --quiet "$DST/objects/pack/pack" >/dev/null
fi
rm -f "$ALT"
packs=$(find "$DST/objects/pack" -name "*.pack" | wc -l)
if [ -z "$before" ] || [ "$packs" -gt 20 ]; then git -C "$DST" repack -a -d -q; fi
# Prove the slim repo stands alone. rev-list's own exit status must be checked on its own:
# inside one pipeline with grep's `|| true`, a "missing blob" failure read as 0 missing.
LIST="$M/reachable.lst"
git -C "$DST" rev-list --objects "$after" > "$LIST" \
  || { rm -f "$LIST"; echo "  slim repo is missing objects without the borrow link; not pushing"; exit 1; }
missing=$(cut -d' ' -f1 "$LIST" | git -C "$DST" cat-file --batch-check | grep -c ' missing$' || true)
rm -f "$LIST"
[ "$missing" = 0 ] || { echo "  slim repo is missing $missing object(s) without the borrow link; not pushing"; exit 1; }
# fast-export writes no marks file when nothing new was exported; keep the old one then.
for side in src dst; do
  if [ -f "$M/$side.marks.new" ]; then mv -f "$M/$side.marks.new" "$M/$side.marks"; fi
done
[ "$before" = "$after" ] && echo "  slim main unchanged ($after)" || echo "  slim main ${before:-(new)} -> $after"
[ "$PUSH" = 1 ] || { echo "  --no-push: built only"; exit 0; }
git -C "$DST" remote get-url gitlab >/dev/null 2>&1 || git -C "$DST" remote add gitlab "$URL"
git -C "$DST" push --quiet gitlab refs/heads/main:refs/heads/main
echo "  pushed slim main to $URL"
