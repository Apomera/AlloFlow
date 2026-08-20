#!/usr/bin/env node
'use strict';

/*
 * Build the small parent-mode namespace from the existing localized family
 * copy, with hand-authored mode and progress labels for every supported pack.
 * Keeping the source values here makes the additions reviewable and prevents
 * a missing locale from silently receiving the English fallback.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const LANG_DIR = path.join(ROOT, 'lang');
const OUTPUT = path.join(ROOT, 'translations', 'pending', 'parent-mode-hand.cjs');

const labels = {
  acholi: 'Lanyodo',
  amharic: 'የቤተሰብ ሁነታ',
  arabic: 'وضع الأسرة',
  bengali: 'পারিবারিক মোড',
  burmese: 'မိသားစုမုဒ်',
  chin_falam: 'Chungkhar Mode',
  chin_hakha: 'Innchungkhar Mode',
  chinese_simplified: '家庭模式',
  chinese_traditional: '家庭模式',
  dari: 'حالت خانواده',
  dutch: 'Gezinsmodus',
  esperanto: 'Familia reĝimo',
  farsi: 'حالت خانواده',
  french: 'Mode famille',
  french_canadian: 'Mode famille',
  german: 'Familienmodus',
  greek: 'Οικογενειακή λειτουργία',
  gujarati: 'કુટુંબ મોડ',
  haitian_creole: 'Mòd Fanmi',
  hausa: 'Yanayin Iyali',
  hebrew: 'מצב משפחה',
  hindi: 'परिवार मोड',
  hmong: 'Hom Tsev Neeg',
  igbo: 'Ọnọdụ Ezinụlọ',
  indonesian: 'Mode Keluarga',
  italian: 'Modalità famiglia',
  japanese: '家庭モード',
  kannada: 'ಕುಟುಂಬ ಮೋಡ್',
  karen: 'ဟံၣ်ဖိဃီဖိ Mode',
  khmer: 'របៀបគ្រួសារ',
  kinyarwanda: 'Uburyo bw’Umuryango',
  kirundi: 'Uburyo bw’Umuryango',
  korean: '가족 모드',
  lao: 'ໂໝດຄອບຄົວ',
  latin: 'Modus Familiae',
  lingala: 'Lolenge ya Libota',
  maay_maay: 'Habka Qoyska',
  malayalam: 'കുടുംബ മോഡ്',
  marathi: 'कुटुंब मोड',
  marshallese: 'Wā eo an Baaṃle',
  nepali: 'परिवार मोड',
  pashto: 'د کورنۍ حالت',
  polish: 'Tryb rodzinny',
  portuguese_angola: 'Modo Família',
  portuguese_brazil: 'Modo Família',
  portuguese_portugal: 'Modo Família',
  punjabi: 'ਪਰਿਵਾਰ ਮੋਡ',
  romanian: 'Modul familiei',
  russian: 'Семейный режим',
  somali: 'Habka Qoyska',
  spanish_castilian: 'Modo familiar',
  spanish_latin_america: 'Modo familiar',
  swahili: 'Hali ya Familia',
  tagalog: 'Mode ng Pamilya',
  tamil: 'குடும்ப முறை',
  telugu: 'కుటుంబ మోడ్',
  thai: 'โหมดครอบครัว',
  tigrinya: 'ናይ ስድራቤት ሞድ',
  turkish: 'Aile Modu',
  ukrainian: 'Сімейний режим',
  urdu: 'خاندانی موڈ',
  vietnamese: 'Chế độ Gia đình',
  yoruba: 'Ọ̀nà Ìdílé'
};

const progress = {
  acholi: 'Lanyodo me lok',
  amharic: 'የልጅ እድገት',
  arabic: 'تقدم الطفل',
  bengali: 'শিশুর অগ্রগতি',
  burmese: 'ကလေး၏တိုးတက်မှု',
  chin_falam: 'Fa te paangnak',
  chin_hakha: 'Fa te paangnak',
  chinese_simplified: '孩子进度',
  chinese_traditional: '孩子進度',
  dari: 'پیشرفت کودک',
  dutch: 'Voortgang van het kind',
  esperanto: 'Progreso de la infano',
  farsi: 'پیشرفت کودک',
  french: 'Progrès de l’enfant',
  french_canadian: 'Progrès de l’enfant',
  german: 'Fortschritt des Kindes',
  greek: 'Πρόοδος παιδιού',
  gujarati: 'બાળકની પ્રગતિ',
  haitian_creole: 'Pwogrè timoun nan',
  hausa: 'Ci gaban yaro',
  hebrew: 'התקדמות הילד',
  hindi: 'बच्चे की प्रगति',
  hmong: 'Kev kawm ntawm tus menyuam',
  igbo: 'Ọganihu nwa',
  indonesian: 'Kemajuan Anak',
  italian: 'Progressi del bambino',
  japanese: 'お子さまの進捗',
  kannada: 'ಮಗುವಿನ ಪ್ರಗತಿ',
  karen: 'ဖိၣ်ခွါအတၢ်လဲၤထီၣ်',
  khmer: 'វឌ្ឍនភាពកុមារ',
  kinyarwanda: "Iterambere ry'umwana",
  kirundi: "Iterambere ry'umwana",
  korean: '자녀 진행 상황',
  lao: 'ຄວາມຄືບໜ້າຂອງເດັກ',
  latin: 'Progressus Pueri',
  lingala: 'Bokoli ya mwana',
  maay_maay: 'Horumarka ilmaha',
  malayalam: 'കുട്ടിയുടെ പുരോഗതി',
  marathi: 'मुलाची प्रगती',
  marshallese: 'Eṃṃan eo an ajri',
  nepali: 'बाल प्रगति',
  pashto: 'د ماشوم پرمختګ',
  polish: 'Postępy dziecka',
  portuguese_angola: 'Progresso da criança',
  portuguese_brazil: 'Progresso da criança',
  portuguese_portugal: 'Progresso da criança',
  punjabi: 'ਬੱਚੇ ਦੀ ਪ੍ਰਗਤੀ',
  romanian: 'Progresul copilului',
  russian: 'Прогресс ребёнка',
  somali: 'Horumarka ilmaha',
  spanish_castilian: 'Progreso del niño',
  spanish_latin_america: 'Progreso del niño',
  swahili: 'Maendeleo ya mtoto',
  tagalog: 'Pag-unlad ng anak',
  tamil: 'குழந்தையின் முன்னேற்றம்',
  telugu: 'పిల్లల పురోగతి',
  thai: 'ความก้าวหน้าของเด็ก',
  tigrinya: 'ዕቤት ውሉድ',
  turkish: 'Çocuğun ilerlemesi',
  ukrainian: 'Прогрес дитини',
  urdu: 'بچے کی پیش رفت',
  vietnamese: 'Tiến bộ của con',
  yoruba: 'Ìlọsíwájú ọmọ'
};

const get = (value, keys) => keys.reduce((node, key) => node?.[key], value);
const files = fs.readdirSync(LANG_DIR).filter(file => file.endsWith('.js')).sort();
const missing = files
  .map(file => path.basename(file, '.js'))
  .filter(slug => !labels[slug] || !progress[slug]);
if (missing.length) throw new Error(`Missing hand translation for: ${missing.join(', ')}`);

const output = {};
for (const file of files) {
  const slug = path.basename(file, '.js');
  const pack = JSON.parse(fs.readFileSync(path.join(LANG_DIR, file), 'utf8'));
  output[slug] = {
    label: labels[slug],
    role_description: get(pack, ['tips', 'parent_read_along']) || get(pack, ['toasts', 'mode_parent_enabled']),
    dashboard_title: get(pack, ['dashboard', 'title_parent']),
    progress_label: progress[slug],
    guide_action: get(pack, ['lesson_plan', 'family_guide']) || get(pack, ['common', 'family_guide'])
  };
  for (const key of ['role_description', 'dashboard_title', 'guide_action']) {
    if (!output[slug][key]) throw new Error(`Missing source translation ${slug}.parent_mode.${key}`);
  }
}

const body = `'use strict';\nmodule.exports = ${JSON.stringify(output, null, 2)};\n`;
fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, body, 'utf8');
console.log(`Wrote ${files.length} parent-mode payloads to ${path.relative(ROOT, OUTPUT)}`);
