#!/usr/bin/env node
// apply_audit_fixes_20260604.cjs — Surgical patch for the 11 today-introduced defects
// (from refugee_pack_audit_20260604.json) plus the visible "check-ilo" / "Real-iien" /
// "wuu kara't" / "maroñ't" pre-existing-fossil corruptions (Aaron-approved P0 quick-wins).
//
// Conservative principle: where the audit gave a confident dictionary-level Lao fix,
// apply it verbatim. Where I have low confidence (Acholi/Marshallese/Karen clinical
// compounds), revert to mixed-English or partial-English forms rather than invent terms.
//
// Backup format: lang/<slug>.js.bak.auditfix-20260604

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const LANG_DIR = path.join(ROOT, 'lang');

const setDeep = (obj, dotted, value) => {
  const parts = dotted.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
};
const getDeep = (obj, dotted) => {
  const parts = dotted.split('.');
  let cur = obj;
  for (const p of parts) { if (!cur || typeof cur !== 'object') return undefined; cur = cur[p]; }
  return cur;
};

// === FIX SETS ===
const FIXES = {
  lao: {
    // 4 today-defects (audit-suggested verbatim, dictionary-level confident)
    'behavior_lens.hub.cycle_title': 'ວົງຈອນພຶດຕິກຳລະເບີດ',
    'behavior_lens.hub.reinforcement_title': 'ບັນຊີສຳຫຼວດຕົວເສີມແຮງ',
    'behavior_lens.hub.caseload_title': 'ແຜງຂໍ້ມູນລາຍຊື່ນັກຮຽນທີ່ດູແລ',
    'behavior_lens.hub.fidelity_title': 'ລາຍການກວດສອບການປະຕິບັດຕາມແຜນ',
  },
  acholi: {
    // 2 today-defects — keep clinical English term + Acholi connector (conservative)
    'behavior_lens.hub.cycle_title': 'Cawa me Acting-Out',
    'behavior_lens.hub.crisis_desc': 'Generator me three-tier crisis intervention protocol',
  },
  maay_maay: {
    // 3 today-defects (Somali — matching the pack's actual language per audit identity finding)
    'behavior_lens.hub.wizard_title': 'Hagaha BehaviorLens',
    'behavior_lens.obs_occurred': 'Wuu dhacay',
    'behavior_lens.hub.favorites': 'Kuwa La Jecel Yahay',
    // P0 visible corruption (audit highlight)
    'behavior_lens.hub.cantdowontdo_title': 'Ma Awoodo / Ma Doonayo',
  },
  marshallese: {
    // 1 today-defect — revert to English clinical term (audit suggestion)
    'behavior_lens.hub.condprob_title': 'Conditional Probability',
    // P0 visible corruption: 'maroñ't Do' contraction-stub → revert English compound
    'behavior_lens.hub.cantdowontdo_title': "Can't Do / Won't Do",
  },
  karen: {
    // 1 today-defect — revert to English (very low confidence)
    'behavior_lens.abc.duration_placeholder': 'Optional',
  },
  chin_falam: {},
  chin_hakha: {},
};

// === REGEX FIXES (compound-stub corruption sweep in marshallese behavior_lens.*) ===
// These are pre-existing fossils from the prior build pipeline that replaced "time"→"iien"
// and "in"→"ilo" inside hyphenated English compounds, leaving "Real-iien" / "check-ilo" stubs.
// Audit flagged 2-3 as visible; we fix all behavior_lens.* sites since it's the same defect class.
const REGEX_FIXES_MARSHALLESE = [
  { from: /Real-iien/g, to: 'Real-time' },
  { from: /real-iien/g, to: 'real-time' },
  { from: /check-ilo/g, to: 'check-in' },
  { from: /Check-Ilo/g, to: 'Check-In' },
];

// ====================================================================
let totalChanges = 0;
const changeLog = [];

for (const [slug, fixMap] of Object.entries(FIXES)) {
  const langPath = path.join(LANG_DIR, slug + '.js');
  const pack = JSON.parse(fs.readFileSync(langPath, 'utf8'));
  let packChanges = 0;

  // 1. Explicit key-level fixes
  for (const [key, value] of Object.entries(fixMap)) {
    const before = getDeep(pack, key);
    if (before === undefined) {
      console.log('  WARN: ' + slug + ' :: ' + key + ' — key not found, skipping');
      continue;
    }
    if (before === value) {
      console.log('  noop: ' + slug + ' :: ' + key + ' (already at target)');
      continue;
    }
    setDeep(pack, key, value);
    packChanges++;
    changeLog.push({ slug, key, before, after: value });
  }

  // 2. Regex compound-stub sweep (marshallese only) — only within behavior_lens.* namespace
  if (slug === 'marshallese' && pack.behavior_lens) {
    const walkAndPatch = (obj, prefix='behavior_lens') => {
      for (const [k, v] of Object.entries(obj)) {
        const full = prefix + '.' + k;
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          walkAndPatch(v, full);
        } else if (typeof v === 'string') {
          let nv = v;
          for (const { from, to } of REGEX_FIXES_MARSHALLESE) nv = nv.replace(from, to);
          if (nv !== v) {
            obj[k] = nv;
            packChanges++;
            changeLog.push({ slug, key: full, before: v, after: nv, kind: 'regex-stub-fix' });
          }
        }
      }
    };
    walkAndPatch(pack.behavior_lens);
  }

  if (packChanges > 0) {
    const bakPath = langPath + '.bak.auditfix-20260604';
    fs.copyFileSync(langPath, bakPath);
    fs.writeFileSync(langPath, JSON.stringify(pack, null, 2) + '\n');
    console.log(slug + ': ' + packChanges + ' fixes applied, backup → ' + path.relative(ROOT, bakPath));
    totalChanges += packChanges;
  } else {
    console.log(slug + ': no changes');
  }
}

console.log('\n=== TOTAL: ' + totalChanges + ' fixes across ' + Object.keys(FIXES).length + ' packs ===');
console.log('\nChange log:');
for (const c of changeLog) {
  const k = c.kind === 'regex-stub-fix' ? '[stub-fix]' : '[fix]';
  console.log('  ' + k + ' ' + c.slug + ' :: ' + c.key);
  console.log('    -  ' + JSON.stringify(c.before).slice(0, 120));
  console.log('    +  ' + JSON.stringify(c.after).slice(0, 120));
}
