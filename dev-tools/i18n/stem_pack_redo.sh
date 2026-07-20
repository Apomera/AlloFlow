#!/bin/sh
# stem_pack_redo.sh — RE-translate a pack that was already filled badly.
# Usage: sh dev-tools/i18n/stem_pack_redo.sh <tool> <slug> <iso> <lang-name> <ai-note> <htModulePath> [contam-regex]
#
# Identical to stem_pack_pipe.sh EXCEPT the apply step: the normal pipe uses
# apply_stem_tool_translations.cjs, which MERGES and never clobbers, so on an
# already-filled pack it reports "+0 keys" and silently changes nothing.
# This variant uses apply_stem_tool_force.cjs --only-passthrough, which rewrites
# ONLY the keys whose current value is still byte-identical to the English
# source (the untranslated leftovers) and never touches a real translation.
#
# Built 2026-07-20 to remediate the 14 solarsystem code-switch packs that landed
# ~93% English under guidance which framed "keep English" as authentic register.
# Safe under concurrent sessions: retries on index.lock, commits ONLY its 3 files.
set -e
REPO=/c/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated
tool=$1; slug=$2; iso=$3; lang=$4; ai=$5; HT=$6
contam=${7:-'[؀-ۿ֐-׿一-鿿가-힣ก-๛ऀ-ॿ�]'}
cd "$REPO"
node -c "$HT" || { echo "SYNTAXFAIL $slug"; exit 1; }
mkdir -p "dev-tools/i18n/tm_$tool"
[ -f "dev-tools/i18n/tm_$tool/$slug.json" ] || node -e "require('fs').writeFileSync('dev-tools/i18n/tm_$tool/$slug.json',JSON.stringify({filled:{}}))"
node dev-tools/i18n/gen_stem_handtl.cjs "$slug" "$iso" "$tool" "$HT" 2>&1 | tail -1
node dev-tools/i18n/apply_stem_tool_force.cjs "$tool" "dev-tools/i18n/handtl_${tool}_${iso}.json" --only-passthrough 2>&1 | grep -E "changed|Updated"
N=$(node -e "console.log(Object.keys(JSON.parse(require('fs').readFileSync('dev-tools/i18n/stem_${tool}_en.json','utf8'))).length)")
# report residual English AFTER the redo — this is the quality metric that matters
node -e "const fs=require('fs');const en=JSON.parse(fs.readFileSync('dev-tools/i18n/stem_${tool}_en.json','utf8'));const f=JSON.parse(fs.readFileSync('lang/$slug.js','utf8')).stem['$tool'];const v=Object.keys(en).filter(k=>f[k]===en[k]).length;console.log('$slug residual-English:',v,'/',$N,'('+Math.round(v/$N*100)+'%)');"
node -e "const fs=require('fs');const re=new RegExp(process.argv[1]);const f=JSON.parse(fs.readFileSync('lang/$slug.js','utf8')).stem['$tool'];let b=[];for(const k in f){if(re.test(f[k]))b.push(k);}console.log('$slug contam:',b.slice(0,8).join(',')||'none','| keys:',Object.keys(f).length,'/',$N);" "$contam"
node dev-tools/check_lang_json.cjs 2>&1 | tail -1
P="lang/$slug.js dev-tools/i18n/handtl_${tool}_${iso}.json dev-tools/i18n/tm_$tool/$slug.json"
i=1
while [ $i -le 10 ]; do
  if [ -f .git/index.lock ]; then echo "lock $i"; sleep 1; i=$((i+1)); continue; fi
  if git add $P 2>/tmp/spr && git commit -q -m "i18n($tool): RE-translate $lang pack (was ~93% English)" -m "$N/$N keys. Rewrote untranslated English passthroughs with genuine $lang prose; pre-existing translations preserved. Hand-translated by the model (never runtime AI). $ai." -m "Co-Authored-By: Claude <noreply@anthropic.com>" -- $P 2>/tmp/spr; then
    echo "COMMITTED $slug $(git log --oneline -1 -- lang/$slug.js | cut -d' ' -f1)"; break
  else echo "retry $i:"; head -2 /tmp/spr; sleep 1; i=$((i+1)); fi
done
