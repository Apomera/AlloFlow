#!/usr/bin/env node
'use strict';

// The PDF audit score renderer supplies the total before this label. The old
// catalog values embedded {count}, which rendered a duplicate or literal count
// because this translation call has no count parameter.
//
// This utility changes only the confirmed_issues value in each affected pack,
// preserving all other catalog text and the root/mirror differences that may
// already exist elsewhere.

const fs = require('node:fs');
const path = require('node:path');
const { LANGUAGE_CODES } = require('./main_ui_i18n_manifest.cjs');

const ROOT = path.resolve(__dirname, '..', '..');
const LANG_DIR = path.join(ROOT, 'lang');
const MIRROR_DIR = path.join(ROOT, 'desktop', 'web-app', 'public', 'lang');
const APPLY = process.argv.includes('--apply');

const CORRECTIONS = {
  arabic: ['{count} من المشكلات المؤكدة', 'المشكلات المؤكدة'],
  burmese: ['အတည်ပြုထားသော ပြဿနာ {count} ခု', 'အတည်ပြုထားသော ပြဿနာများ'],
  chinese_simplified: ['已确认的问题：{count} 个', '已确认的问题'],
  chinese_traditional: ['已確認的問題：{count} 個', '已確認的問題'],
  dari: ['{count} مشکل تأییدشده', 'مشکل تأییدشده'],
  dutch: ['{count} bevestigde problemen', 'bevestigde problemen'],
  esperanto: ['{count} konfirmitaj problemoj', 'konfirmitaj problemoj'],
  farsi: ['{count} مشکل تأییدشده', 'مشکل تأییدشده'],
  german: ['{count} bestätigte(s) Problem(e)', 'bestätigte(s) Problem(e)'],
  greek: ['{count} επιβεβαιωμένο/α πρόβλημα/τα', 'επιβεβαιωμένο/α πρόβλημα/τα'],
  gujarati: ['{count} પુષ્ટિ થયેલી સમસ્યાઓ', 'પુષ્ટિ થયેલી સમસ્યાઓ'],
  haitian_creole: ['{count} pwoblèm konfime', 'pwoblèm konfime'],
  hausa: ['matsala {count} da aka tabbatar', 'matsalolin da aka tabbatar'],
  hebrew: ['{count} בעיות שאושרו', 'בעיות שאושרו'],
  hindi: ['{count} पुष्ट समस्या', 'पुष्ट समस्याएँ'],
  hmong: ['{count} qhov teeb meem lees paub', 'qhov teeb meem lees paub'],
  igbo: ['okwu {count} akwadoro', 'okwu akwadoro'],
  indonesian: ['{count} masalah terkonfirmasi', 'masalah terkonfirmasi'],
  italian: ['{count} problema/i confermato/i', 'problema/i confermato/i'],
  japanese: ['確認済みの問題: {count} 件', '確認済みの問題'],
  kannada: ['{count} ದೃಢೀಕರಿಸಿದ ಸಮಸ್ಯೆಗಳು', 'ದೃಢೀಕರಿಸಿದ ಸಮಸ್ಯೆಗಳು'],
  khmer: ['បញ្ហាដែលបានបញ្ជាក់ {count}', 'បញ្ហាដែលបានបញ្ជាក់'],
  kinyarwanda: ['ibibazo {count} byemejwe', 'ibibazo byemejwe'],
  kirundi: ['ibibazo {count} vyemejwe', 'ibibazo vyemejwe'],
  korean: ['확인된 문제 {count}개', '확인된 문제'],
  latin: ['{count} quaestio confirmata', 'quaestio confirmata'],
  lingala: ['likambo {count} endimami', 'likambo endimami'],
  malayalam: ['{count} സ്ഥിരീകരിച്ച പ്രശ്നങ്ങൾ', 'സ്ഥിരീകരിച്ച പ്രശ്നങ്ങൾ'],
  marathi: ['{count} पुष्टी केलेल्या समस्या', 'पुष्टी केलेल्या समस्या'],
  nepali: ['{count} पुष्टि भएका समस्या', 'पुष्टि भएका समस्या'],
  pashto: ['{count} تایید شوې ستونزې', 'تایید شوې ستونزې'],
  polish: ['Potwierdzone problemy: {count}', 'Potwierdzone problemy'],
  portuguese_angola: ['{count} problema(s) confirmado(s)', 'problema(s) confirmado(s)'],
  portuguese_brazil: ['{count} problema(s) confirmado(s)', 'problema(s) confirmado(s)'],
  portuguese_portugal: ['{count} problema(s) confirmado(s)', 'problema(s) confirmado(s)'],
  punjabi: ['{count} ਪੁਸ਼ਟੀ ਕੀਤੀਆਂ ਸਮੱਸਿਆਵਾਂ', 'ਪੁਸ਼ਟੀ ਕੀਤੀਆਂ ਸਮੱਸਿਆਵਾਂ'],
  romanian: ['{count} problemă(e) confirmată(e)', 'problemă(e) confirmată(e)'],
  russian: ['Подтверждённых проблем: {count}', 'Подтверждённых проблем'],
  somali: ['{count} arrimood oo la xaqiijiyey', 'arrimood oo la xaqiijiyey'],
  swahili: ['tatizo {count} lililothibitishwa', 'matatizo yaliyothibitishwa'],
  tamil: ['{count} உறுதிப்படுத்தப்பட்ட சிக்கல்கள்', 'உறுதிப்படுத்தப்பட்ட சிக்கல்கள்'],
  telugu: ['{count} నిర్ధారిత సమస్యలు', 'నిర్ధారిత సమస్యలు'],
  thai: ['ปัญหาที่ได้รับการยืนยัน {count} รายการ', 'ปัญหาที่ได้รับการยืนยัน'],
  tigrinya: ['{count} ዝተረጋገጹ ጸገማት', 'ዝተረጋገጹ ጸገማት'],
  turkish: ['{count} doğrulanmış sorun', 'doğrulanmış sorun'],
  ukrainian: ['Підтверджених проблем: {count}', 'Підтверджених проблем'],
  urdu: ['{count} تصدیق شدہ مسائل', 'تصدیق شدہ مسائل'],
  vietnamese: ['{count} vấn đề đã xác nhận', 'vấn đề đã xác nhận'],
  yoruba: ['ìṣòro {count} tí a fìdí rẹ̀ múlẹ̀', 'ìṣòro tí a fìdí rẹ̀ múlẹ̀'],
};

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

function getConfirmedIssues(pack) {
  return pack?.pdf_audit?.score?.confirmed_issues;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceFile(file, text) {
  const temporary = `${file}.i18n-pdf-count-${process.pid}.tmp`;
  try {
    fs.writeFileSync(temporary, text, 'utf8');
    try {
      fs.renameSync(temporary, file);
    } catch (error) {
      if (!['EPERM', 'EACCES', 'EBUSY'].includes(error.code)) throw error;
      fs.writeFileSync(file, text, 'utf8');
    }
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

const errors = [];
let changedValues = 0;
let changedPacks = 0;
for (const [slug, [oldValue, newValue]] of Object.entries(CORRECTIONS)) {
  if (!LANGUAGE_CODES[slug]) {
    errors.push(`${slug}: not present in LANGUAGE_CODES`);
    continue;
  }
  let packChanged = false;
  for (const dir of [LANG_DIR, MIRROR_DIR]) {
    const file = path.join(dir, `${slug}.js`);
    if (!fs.existsSync(file)) {
      errors.push(`${slug}: missing ${file}`);
      continue;
    }
    let pack;
    try { pack = readJson(file); }
    catch (error) {
      errors.push(`${slug}: invalid JSON in ${file} (${error.message})`);
      continue;
    }
    const current = getConfirmedIssues(pack);
    if (current === newValue) continue;
    const strippedOldValue = oldValue.replace('{count}', '');
    const trimmedStrippedOldValue = strippedOldValue.trim();
    if (current !== oldValue && current !== strippedOldValue && current !== trimmedStrippedOldValue) {
      errors.push(`${slug}: unexpected confirmed_issues value in ${file}: ${JSON.stringify(current)}`);
      continue;
    }
    const text = fs.readFileSync(file, 'utf8');
    const oldLiteral = JSON.stringify(current);
    const newLiteral = JSON.stringify(newValue);
    const expression = new RegExp('(\\"confirmed_issues\\"\\s*:\\s*)' + escapeRegex(oldLiteral) + '(?=\\s*[,}])', 'g');
    const matches = [...text.matchAll(expression)];
    if (matches.length !== 1) {
      errors.push(`${slug}: expected one exact confirmed_issues source line in ${file}, found ${matches.length}`);
      continue;
    }
    const output = text.replace(expression, `$1${newLiteral}`);
    if (output === text) {
      errors.push(`${slug}: replacement was a no-op in ${file}`);
      continue;
    }
    changedValues += 1;
    packChanged = true;
    if (APPLY) {
      replaceFile(file, output);
      try {
        if (getConfirmedIssues(readJson(file)) !== newValue) {
          errors.push(`${slug}: post-write value mismatch in ${file}`);
        }
      } catch (error) {
        errors.push(`${slug}: post-write validation failed in ${file} (${error.message})`);
      }
    }
  }
  if (packChanged) changedPacks += 1;
}

if (errors.length) {
  console.error(`normalize_pdf_audit_count_placeholder: ${errors.length} problem(s); ${APPLY ? 'partial writes may exist' : 'nothing written'}.`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log(`normalize_pdf_audit_count_placeholder: ${changedValues} value(s) in ${changedPacks} pack(s) ${APPLY ? 'written' : 'would be written'}.`);
