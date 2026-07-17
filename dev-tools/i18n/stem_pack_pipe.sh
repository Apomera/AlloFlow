#!/bin/sh
# stem_pack_pipe.sh — validate, apply, audit, and pathspec-commit ONE hand-translated STEM pack.
# Usage: sh dev-tools/i18n/stem_pack_pipe.sh <tool> <slug> <iso> <lang-name> <ai-note> <htModulePath> [contam-regex]
#   tool          e.g. typingpractice | music | manipulatives | solarsystem
#   slug          lang/<slug>.js pack name, e.g. hindi
#   iso           short code used in handtl filename, e.g. hi
#   lang-name     human name for the commit message, e.g. "Hindi"
#   ai-note       e.g. "AI kept" or "AI->KI"
#   htModulePath  absolute path to your HT module (module.exports = {CORR:{},HT:{...}})
#   contam-regex  optional override; default flags Arabic/Hebrew/CJK/Hangul/Thai/Devanagari/replacement-char.
#                 For packs whose OWN script is in that set, pass a regex excluding it.
# Safe under concurrent sessions: retries on index.lock, commits ONLY its 3 files by pathspec.
set -e
REPO=/c/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated
tool=$1; slug=$2; iso=$3; lang=$4; ai=$5; HT=$6
contam=${7:-'[؀-ۿ֐-׿一-鿿가-힣ก-๛ऀ-ॿ�]'}
cd "$REPO"
node -c "$HT" || { echo "SYNTAXFAIL $slug"; exit 1; }
mkdir -p "dev-tools/i18n/tm_$tool"
[ -f "dev-tools/i18n/tm_$tool/$slug.json" ] || node -e "require('fs').writeFileSync('dev-tools/i18n/tm_$tool/$slug.json',JSON.stringify({filled:{}}))"
node dev-tools/i18n/gen_stem_handtl.cjs "$slug" "$iso" "$tool" "$HT" 2>&1 | tail -1
node dev-tools/i18n/apply_stem_tool_translations.cjs "$tool" "dev-tools/i18n/handtl_${tool}_${iso}.json" 2>&1 | grep -E "\+[0-9]"
N=$(node -e "console.log(Object.keys(JSON.parse(require('fs').readFileSync('dev-tools/i18n/stem_${tool}_en.json','utf8'))).length)")
node -e "const fs=require('fs');const re=new RegExp(process.argv[1]);const f=JSON.parse(fs.readFileSync('lang/$slug.js','utf8')).stem['$tool'];let b=[];for(const k in f){if(re.test(f[k]))b.push(k);}console.log('$slug contam:',b.slice(0,8).join(',')||'none','| keys:',Object.keys(f).length,'/',$N);" "$contam"
node dev-tools/check_lang_json.cjs 2>&1 | tail -1
P="lang/$slug.js dev-tools/i18n/handtl_${tool}_${iso}.json dev-tools/i18n/tm_$tool/$slug.json"
i=1
while [ $i -le 10 ]; do
  if [ -f .git/index.lock ]; then echo "lock $i"; sleep 1; i=$((i+1)); continue; fi
  if git add $P 2>/tmp/spe && git commit -q -m "i18n($tool): hand-translate $lang pack" -m "$N/$N keys. Hand-translated by the model (never runtime AI). $ai." -m "Co-Authored-By: Claude <noreply@anthropic.com>" -- $P 2>/tmp/spe; then
    echo "COMMITTED $slug $(git log --oneline -1 -- lang/$slug.js | cut -d' ' -f1)"; break
  else echo "retry $i:"; head -2 /tmp/spe; sleep 1; i=$((i+1)); fi
done
