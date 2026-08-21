#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PACK_DIRS = [
  path.join(ROOT, 'lang'),
  path.join(ROOT, 'desktop', 'web-app', 'public', 'lang'),
];

// These are exact semantic matches to existing, previously hand-translated
// labels. Keep this allowlist explicit: identical English wording is not enough
// when the context differs (for example, compass "Direction" versus a GM prompt).
const REUSED_TRANSLATIONS = {
  phase_explore: 'sidebar.stem_lab_explore',
  phase_complete: 'stem.graphcalc.complete',
  resume: 'escape_room.timer_resume',
  pause: 'common.pause',
  actions: 'dashboard.header_actions',
  challenge: 'stem.areaperimeter.challenge',
  discard: 'common.discard',
  accuracy: 'word_sounds.accuracy',
  no_items: 'outline.no_items',
  ability_analyze_name: 'stem.learning_lab.analyze',
  ability_explain_name: 'text_tools.explain',
  ability_connect_name: 'common.connect',
};

function writeWithRetry(file, contents) {
  let lastError;
  const waitArray = new Int32Array(new SharedArrayBuffer(4));
  for (let attempt = 1; attempt <= 12; attempt += 1) {
    try {
      fs.writeFileSync(file, contents, 'utf8');
      return;
    } catch (error) {
      lastError = error;
      if (!['EBUSY', 'EPERM', 'EACCES', 'UNKNOWN'].includes(error.code)) throw error;
      // OneDrive can hold a mapped section open while still allowing an
      // in-place update. Preserve the file handle and replace its bytes so a
      // transient sync lock does not leave a language batch half-applied.
      try {
        const bytes = Buffer.from(contents, 'utf8');
        const fd = fs.openSync(file, 'r+');
        try {
          let offset = 0;
          while (offset < bytes.length) {
            offset += fs.writeSync(fd, bytes, offset, bytes.length - offset, offset);
          }
          fs.ftruncateSync(fd, bytes.length);
        } finally {
          fs.closeSync(fd);
        }
        return;
      } catch (inPlaceError) {
        lastError = inPlaceError;
      }
      Atomics.wait(waitArray, 0, 0, attempt * 100);
    }
  }
  throw lastError;
}

function replaceOnce(file, before, after) {
  const source = fs.readFileSync(file, 'utf8');
  if (source.includes(after)) {
    console.log(`${file}: already localized`);
    return;
  }
  const first = source.indexOf(before);
  if (first < 0 || source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`${file}: expected exactly one localization target`);
  }
  writeWithRetry(file, source.slice(0, first) + after + source.slice(first + before.length));
  console.log(`${file}: localized launcher controls`);
}

function getDeep(object, dottedPath) {
  return dottedPath.split('.').reduce((value, part) => value && value[part], object);
}

function applyReusedPackTranslations() {
  let valuesAdded = 0;
  let filesChanged = 0;
  for (const directory of PACK_DIRS) {
    for (const name of fs.readdirSync(directory).filter(file => file.endsWith('.js'))) {
      const file = path.join(directory, name);
      const pack = JSON.parse(fs.readFileSync(file, 'utf8'));
      const namespace = pack.concept_quest && typeof pack.concept_quest === 'object'
        ? pack.concept_quest
        : (pack.concept_quest = {});
      let dirty = false;
      for (const [key, sourcePath] of Object.entries(REUSED_TRANSLATIONS)) {
        if (typeof namespace[key] === 'string' && namespace[key].trim()) continue;
        const translated = getDeep(pack, sourcePath);
        if (typeof translated !== 'string' || !translated.trim()) {
          throw new Error(`${name}: missing reusable translation ${sourcePath}`);
        }
        namespace[key] = translated;
        valuesAdded += 1;
        dirty = true;
      }
      if (dirty) {
        writeWithRetry(file, JSON.stringify(pack, null, 2) + '\n');
        filesChanged += 1;
      }
    }
  }
  console.log(`language packs: reused ${valuesAdded} reviewed values in ${filesChanged} files`);
}

function placeholderSet(value) {
  return [...String(value).matchAll(/\{[a-zA-Z0-9_]+\}/g)].map(match => match[0]).sort();
}

function applyHandPackTranslations(payloadFile) {
  if (!payloadFile) return;
  const canonical = JSON.parse(fs.readFileSync(path.join(ROOT, 'ui_strings.js'), 'utf8')).concept_quest;
  const payload = require(path.resolve(payloadFile));
  let valuesApplied = 0;
  let filesChanged = 0;
  for (const directory of PACK_DIRS) {
    for (const [slug, translations] of Object.entries(payload)) {
      const file = path.join(directory, slug + '.js');
      if (!fs.existsSync(file)) throw new Error(`missing language pack: ${file}`);
      const pack = JSON.parse(fs.readFileSync(file, 'utf8'));
      const namespace = pack.concept_quest && typeof pack.concept_quest === 'object'
        ? pack.concept_quest
        : (pack.concept_quest = {});
      for (const [key, value] of Object.entries(translations)) {
        if (typeof canonical[key] !== 'string') throw new Error(`${slug}: unknown Concept Quest key ${key}`);
        if (typeof value !== 'string' || !value.trim()) throw new Error(`${slug}: blank Concept Quest key ${key}`);
        const expected = placeholderSet(canonical[key]);
        const actual = placeholderSet(value);
        if (expected.join('|') !== actual.join('|')) {
          throw new Error(`${slug}.${key}: placeholders ${actual.join(', ')} do not match ${expected.join(', ')}`);
        }
        namespace[key] = value;
        valuesApplied += 1;
      }
      writeWithRetry(file, JSON.stringify(pack, null, 2) + '\n');
      filesChanged += 1;
    }
  }
  console.log(`language packs: applied ${valuesApplied} hand translations in ${filesChanged} files`);
}

replaceOnce(
  'view_quiz_source.jsx',
  'title="Launch an eight-room cooperative concept dungeon with teacher co-GM controls" aria-label="Launch Concept Quest"><Gamepad2 size={14} /> Concept Quest',
  "title={t('concept_quest.launch_tooltip')} aria-label={t('concept_quest.launch_aria')}><Gamepad2 size={14} /> {t('concept_quest.title')}"
);

replaceOnce(
  'teacher_source.jsx',
  ">Phase: {bossStats.phaseName || 'Watchful'}</span>",
  ">{t('concept_quest.boss_phase', { phase: bossPhaseLabel })}</span>"
);
replaceOnce(
  'teacher_source.jsx',
  '>Mastery streak: {bossStats.masteryStreak || 0}</span>',
  ">{t('concept_quest.boss_mastery_streak', { count: bossStats.masteryStreak || 0 })}</span>"
);
replaceOnce(
  'teacher_source.jsx',
  '>⚡ Combo +{bossStats.lastComboBonus}</span>',
  ">⚡ {t('concept_quest.boss_combo_bonus', { bonus: bossStats.lastComboBonus })}</span>"
);
replaceOnce(
  'teacher_source.jsx',
  'aria-label="Teacher monster pacing controls"',
  "aria-label={t('concept_quest.boss_pacing_aria')}"
);
replaceOnce(
  'teacher_source.jsx',
  '>Rally class +10 HP</button>',
  ">{t('concept_quest.boss_rally_class_hp')}</button>"
);
replaceOnce(
  'teacher_source.jsx',
  '>Expose weakness</button>',
  ">{t('concept_quest.boss_expose_weakness')}</button>"
);
replaceOnce(
  'teacher_source.jsx',
  '>Intensify monster</button>',
  ">{t('concept_quest.boss_intensify_monster')}</button>"
);
replaceOnce(
  'teacher_source.jsx',
  '>🎲 Co-GM event workshop</summary>',
  ">🎲 {t('concept_quest.boss_event_workshop')}</summary>"
);
replaceOnce(
  'teacher_source.jsx',
  '>AI drafts only. Preview and edit before publishing.</p>',
  ">{t('concept_quest.ai_draft_notice')}</p>"
);
replaceOnce(
  'teacher_source.jsx',
  'placeholder="Introduce an event tied to the current concept"',
  "placeholder={t('concept_quest.boss_event_placeholder')}"
);
replaceOnce(
  'teacher_source.jsx',
  '>Manual draft</button>',
  ">{t('concept_quest.manual_draft')}</button>"
);
replaceOnce(
  'teacher_source.jsx',
  "{bossGmBusy ? 'Drafting…' : 'AI draft'}</button>",
  "{bossGmBusy ? t('concept_quest.boss_drafting') : t('concept_quest.ai_draft')}</button>"
);
replaceOnce(
  'teacher_source.jsx',
  '>Title<input value={bossGmDraft.title}',
  ">{t('concept_quest.draft_title_label')}<input value={bossGmDraft.title}"
);
replaceOnce(
  'teacher_source.jsx',
  '>Description<textarea value={bossGmDraft.description}',
  ">{t('concept_quest.description')}<textarea value={bossGmDraft.description}"
);
replaceOnce(
  'teacher_source.jsx',
  '<p className="mt-1 text-xs text-amber-900">Effect: <strong>{bossGmDraft.effect}</strong> · Strength {bossGmDraft.amount}</p>',
  "<p className=\"mt-1 text-xs text-amber-900\">{t('concept_quest.boss_effect')} <strong>{t(`concept_quest.boss_effect_${bossGmDraft.effect}`)}</strong> · {t('concept_quest.boss_strength', { amount: bossGmDraft.amount })}</p>"
);
replaceOnce(
  'teacher_source.jsx',
  '<button type="button" onClick={() => setBossGmDraft(null)} className="min-h-11 flex-1 rounded-lg bg-slate-200 text-xs font-bold">Discard</button>',
  "<button type=\"button\" onClick={() => setBossGmDraft(null)} className=\"min-h-11 flex-1 rounded-lg bg-slate-200 text-xs font-bold\">{t('concept_quest.discard')}</button>"
);
replaceOnce(
  'teacher_source.jsx',
  '<button type="button" onClick={publishBossGmDraft} className="min-h-11 flex-1 rounded-lg bg-emerald-700 text-xs font-bold text-white">Publish event</button>',
  "<button type=\"button\" onClick={publishBossGmDraft} className=\"min-h-11 flex-1 rounded-lg bg-emerald-700 text-xs font-bold text-white\">{t('concept_quest.boss_publish_event')}</button>"
);

applyReusedPackTranslations();
applyHandPackTranslations(process.argv[2]);
