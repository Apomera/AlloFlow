#!/usr/bin/env bash
# Rebuild <name>_module.js from <name>_source.jsx for each source given, then report
# modules whose diff against HEAD contains lines other than the expected accessibility
# edits (role additions, aria-label removals/changes). Those committed modules were not
# reproducible from source and must be patched surgically instead of rebuilt.
cd "$(dirname "$0")/../.."
for src in "$@"; do
  base=${src%_source.jsx}; mod=${base}_module.js; b=_build_${base}_module.js
  [ -f "$b" ] || { echo "NOBUILD $src"; continue; }
  timeout 300 node "$b" >/dev/null 2>&1 || { echo "BUILDFAIL $b"; continue; }
  [ -f "desktop/web-app/public/$mod" ] && ! cmp -s "$mod" "desktop/web-app/public/$mod" && cp "$mod" "desktop/web-app/public/$mod"
  n=$(git diff -U0 -- "$mod" | grep '^[-+]' | grep -v '^+++\|^---' \
      | grep -v -E '^[-+]\s*(role: "(group|img|log)",|"aria-label"|"aria-labelledby"|/\* Source SHA|\* Source SHA)' | wc -l)
  [ "$n" -gt 0 ] && echo "UNEXPECTED $mod $n"
done
echo done
