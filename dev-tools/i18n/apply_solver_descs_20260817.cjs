#!/usr/bin/env node
// STEM Lab tab-description re-translation (107547c05 follow-up).
//
// Two English values changed intentionally when the tab descriptions stopped
// lying about what the tabs are (Create is math-only; Explore is a 144-tool
// catalog, not "manipulatives"):
//   stem.solver.generate_assess  "Generate & assess"  -> "Math problems & assessments"
//   stem.solver.manipulatives    "Manipulatives"      -> "Interactive tools & labs"
// All 63 packs still carry translations of the OLD meanings, which is exactly
// the +126-over-watermark the staleness ratchet reports. This applies hand
// translations of the new values across both lang dirs.
//
// Safety: a pack's key is rewritten ONLY when dev-tools/i18n/lang_staleness/
// <pack>.json lists that key as stale — i.e. the ratchet itself says the pack
// was translated against the old English. Anything a concurrent lane already
// re-translated is left alone and reported. Idempotent.
//
// Low-resource packs follow the apply_glossary_rename_20260816 precedent:
// packs that code-switch to English heads (acholi, chin_falam, chin_hakha,
// karen, marshallese) receive the new English values rather than invented
// terms ([STEMi18n] code-switch precedent).
//
// After running: node dev-tools/i18n/update? -> update_lang_manifest.cjs, then
// bless_lang_sources.cjs for the two keys, then re-run check_lang_staleness.
//
// Usage: node dev-tools/i18n/apply_solver_descs_20260817.cjs [--dry-run]
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const DIRS = [path.join(ROOT, 'lang'), path.join(ROOT, 'desktop/web-app/public/lang')];
const STALE_DIR = path.join(__dirname, 'lang_staleness');
const DRY = process.argv.includes('--dry-run');

const KEY_A = 'stem.solver.generate_assess'; // "Math problems & assessments"
const KEY_B = 'stem.solver.manipulatives';   // "Interactive tools & labs"

const T = {
  acholi:               { a: 'Math problems & assessments', b: 'Interactive tools & labs' },
  amharic:              { a: 'የሒሳብ ጥያቄዎች እና ምዘናዎች', b: 'መስተጋብራዊ መሣሪያዎች እና ላቦራቶሪዎች' },
  arabic:               { a: 'مسائل رياضيات وتقييمات', b: 'أدوات ومختبرات تفاعلية' },
  bengali:              { a: 'গণিত সমস্যা ও মূল্যায়ন', b: 'ইন্টারঅ্যাক্টিভ টুল ও ল্যাব' },
  burmese:              { a: 'သင်္ချာပုစ္ဆာများနှင့် အကဲဖြတ်မှုများ', b: 'အပြန်အလှန်တုံ့ပြန် ကိရိယာများနှင့် ဓာတ်ခွဲခန်းများ' },
  chinese_simplified:   { a: '数学题与测评', b: '互动工具与实验室' },
  chinese_traditional:  { a: '數學題與測評', b: '互動工具與實驗室' },
  chin_falam:           { a: 'Math problems & assessments', b: 'Interactive tools & labs' },
  chin_hakha:           { a: 'Math problems & assessments', b: 'Interactive tools & labs' },
  dari:                 { a: 'مسائل ریاضی و ارزیابی‌ها', b: 'ابزارها و آزمایشگاه‌های تعاملی' },
  dutch:                { a: 'Wiskundeopgaven en toetsen', b: 'Interactieve tools en labs' },
  esperanto:            { a: 'Matematikaj problemoj kaj taksadoj', b: 'Interagaj iloj kaj laboratorioj' },
  farsi:                { a: 'مسائل ریاضی و ارزیابی‌ها', b: 'ابزارها و آزمایشگاه‌های تعاملی' },
  french:               { a: 'Problèmes de maths et évaluations', b: 'Outils interactifs et laboratoires' },
  french_canadian:      { a: 'Problèmes de maths et évaluations', b: 'Outils interactifs et laboratoires' },
  german:               { a: 'Matheaufgaben und Tests', b: 'Interaktive Tools und Labore' },
  greek:                { a: 'Μαθηματικά προβλήματα και αξιολογήσεις', b: 'Διαδραστικά εργαλεία και εργαστήρια' },
  gujarati:             { a: 'ગણિતના પ્રશ્નો અને મૂલ્યાંકન', b: 'ઇન્ટરેક્ટિવ સાધનો અને લેબ' },
  haitian_creole:       { a: 'Pwoblèm matematik ak evalyasyon', b: 'Zouti entèaktif ak laboratwa' },
  hausa:                { a: 'Matsalolin lissafi da kimantawa', b: 'Kayan aiki na muʼamala da dakunan gwaje-gwaje' },
  hebrew:               { a: 'בעיות מתמטיקה והערכות', b: 'כלים ומעבדות אינטראקטיביים' },
  hindi:                { a: 'गणित के प्रश्न और आकलन', b: 'इंटरैक्टिव उपकरण और लैब' },
  hmong:                { a: 'Cov teeb meem lej thiab kev ntsuam xyuas', b: 'Cov cuab yeej siv tau thiab chav kuaj' },
  igbo:                 { a: 'Nsogbu mgbakọ na ntule', b: 'Ngwaọrụ mmekọrịta na ụlọ nyocha' },
  indonesian:           { a: 'Soal matematika dan penilaian', b: 'Alat interaktif dan lab' },
  italian:              { a: 'Problemi di matematica e valutazioni', b: 'Strumenti interattivi e laboratori' },
  japanese:             { a: '数学の問題と評価', b: 'インタラクティブなツールとラボ' },
  kannada:              { a: 'ಗಣಿತದ ಸಮಸ್ಯೆಗಳು ಮತ್ತು ಮೌಲ್ಯಮಾಪನಗಳು', b: 'ಸಂವಾದಾತ್ಮಕ ಸಾಧನಗಳು ಮತ್ತು ಲ್ಯಾಬ್‌ಗಳು' },
  karen:                { a: 'Math problems & assessments', b: 'Interactive tools & labs' },
  khmer:                { a: 'លំហាត់គណិតវិទ្យា និងការវាយតម្លៃ', b: 'ឧបករណ៍អន្តរកម្ម និងបន្ទប់ពិសោធន៍' },
  kinyarwanda:          { a: "Ibibazo by'imibare n'isuzuma", b: 'Ibikoresho bikorana na laboratwari' },
  kirundi:              { a: "Ibibazo vy'imibare n'isuzuma", b: 'Ibikoresho bikorana na laboratware' },
  korean:               { a: '수학 문제와 평가', b: '인터랙티브 도구와 실험실' },
  lao:                  { a: 'ບົດເລກ ແລະ ການປະເມີນ', b: 'ເຄື່ອງມືໂຕ້ຕອບ ແລະ ຫ້ອງທົດລອງ' },
  latin:                { a: 'Problemata mathematica et aestimationes', b: 'Instrumenta interactiva et officinae' },
  lingala:              { a: 'Mituna ya mituya mpe bomeki', b: 'Bisaleli ya kosalela mpe balaboratware' },
  maay_maay:            { a: "Su'aalaha xisaabta iyo qiimeynta", b: 'Qalabka wada-shaqeynta iyo shaybaarada' },
  malayalam:            { a: 'ഗണിത പ്രശ്നങ്ങളും വിലയിരുത്തലുകളും', b: 'ഇന്ററാക്ടീവ് ഉപകരണങ്ങളും ലാബുകളും' },
  marathi:              { a: 'गणिताचे प्रश्न आणि मूल्यमापन', b: 'परस्परसंवादी साधने आणि प्रयोगशाळा' },
  marshallese:          { a: 'Math problems & assessments', b: 'Interactive tools & labs' },
  nepali:               { a: 'गणितका समस्या र मूल्याङ्कन', b: 'अन्तरक्रियात्मक उपकरण र प्रयोगशाला' },
  pashto:               { a: 'د ریاضي مسئلې او ارزونې', b: 'متقابل وسایل او لابراتوارونه' },
  polish:               { a: 'Zadania matematyczne i sprawdziany', b: 'Interaktywne narzędzia i laboratoria' },
  portuguese_angola:    { a: 'Problemas de matemática e avaliações', b: 'Ferramentas interativas e laboratórios' },
  portuguese_brazil:    { a: 'Problemas de matemática e avaliações', b: 'Ferramentas interativas e laboratórios' },
  portuguese_portugal:  { a: 'Problemas de matemática e avaliações', b: 'Ferramentas interativas e laboratórios' },
  punjabi:              { a: 'ਗਣਿਤ ਦੇ ਸਵਾਲ ਅਤੇ ਮੁਲਾਂਕਣ', b: 'ਇੰਟਰਐਕਟਿਵ ਟੂਲ ਅਤੇ ਲੈਬ' },
  romanian:             { a: 'Probleme de matematică și evaluări', b: 'Instrumente interactive și laboratoare' },
  russian:              { a: 'Математические задачи и оценивание', b: 'Интерактивные инструменты и лаборатории' },
  somali:               { a: "Su'aalaha xisaabta iyo qiimeynta", b: 'Qalab is-dhexgal ah iyo shaybaaro' },
  spanish_castilian:    { a: 'Problemas de matemáticas y evaluaciones', b: 'Herramientas interactivas y laboratorios' },
  spanish_latin_america:{ a: 'Problemas de matemáticas y evaluaciones', b: 'Herramientas interactivas y laboratorios' },
  swahili:              { a: 'Maswali ya hisabati na tathmini', b: 'Zana shirikishi na maabara' },
  tagalog:              { a: 'Mga problema sa math at pagtatasa', b: 'Mga interactive na tool at lab' },
  tamil:                { a: 'கணிதக் கணக்குகளும் மதிப்பீடுகளும்', b: 'ஊடாடும் கருவிகளும் ஆய்வகங்களும்' },
  telugu:               { a: 'గణిత సమస్యలు మరియు మూల్యాంకనాలు', b: 'ఇంటరాక్టివ్ సాధనాలు మరియు ల్యాబ్‌లు' },
  thai:                 { a: 'โจทย์คณิตศาสตร์และการประเมิน', b: 'เครื่องมือแบบโต้ตอบและห้องทดลอง' },
  tigrinya:             { a: 'ሕቶታት ሒሳብን ገምጋማትን', b: 'ተሳታፍነት ዘለዎም መሳርሒታትን ላብራቶሪታትን' },
  turkish:              { a: 'Matematik soruları ve değerlendirmeler', b: 'Etkileşimli araçlar ve laboratuvarlar' },
  ukrainian:            { a: 'Математичні задачі та оцінювання', b: 'Інтерактивні інструменти та лабораторії' },
  urdu:                 { a: 'ریاضی کے سوالات اور جائزے', b: 'انٹرایکٹو ٹولز اور لیبز' },
  vietnamese:           { a: 'Bài toán và bài đánh giá', b: 'Công cụ tương tác và phòng thí nghiệm' },
  yoruba:               { a: 'Àwọn ìṣòro ìṣirò àti àyẹ̀wò', b: 'Àwọn irinṣẹ́ oníbáṣepọ̀ àti ilé ìdánwò' },
};

function getLeaf(obj, dotted) {
  const parts = dotted.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cur || typeof cur[parts[i]] !== 'object') return { holder: null, leaf: null };
    cur = cur[parts[i]];
  }
  return { holder: cur, leaf: parts[parts.length - 1] };
}

let changed = 0, guarded = 0, already = 0, unmapped = 0;
const notes = [];

for (const dir of DIRS) {
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.js'))) {
    const slug = f.replace(/\.js$/, '');
    const terms = T[slug];
    if (!terms) { notes.push(`${slug}: no translation mapped`); unmapped++; continue; }
    let staleList = {};
    try { staleList = JSON.parse(fs.readFileSync(path.join(STALE_DIR, slug + '.json'), 'utf8')).stale || {}; }
    catch (e) { staleList = {}; }
    const p = path.join(dir, f);
    const pack = JSON.parse(fs.readFileSync(p, 'utf8'));
    let dirty = false;
    for (const [key, val] of [[KEY_A, terms.a], [KEY_B, terms.b]]) {
      const { holder, leaf } = getLeaf(pack, key);
      if (!holder || typeof holder[leaf] !== 'string') continue;
      if (holder[leaf] === val) { already++; continue; }
      // Only rewrite what the ratchet itself says is stale for this pack — or
      // the untranslated OLD ENGLISH verbatim (maay_maay), which is not "stale"
      // to the ratchet (never translated = gap) but is unambiguously the old
      // value and now wrong text.
      const oldEnglish = key === KEY_A ? 'Generate & assess' : 'Manipulatives';
      if (!(key in staleList) && holder[leaf] !== oldEnglish) { notes.push(`${slug}.${key}: not in staleness list, left as ${JSON.stringify(holder[leaf]).slice(0, 60)}`); guarded++; continue; }
      holder[leaf] = val;
      dirty = true;
      changed++;
    }
    if (dirty && !DRY) {
      const out = JSON.stringify(pack, null, 2);
      JSON.parse(out);
      fs.writeFileSync(p, out, 'utf8');
    }
  }
}
notes.slice(0, 20).forEach((n) => console.log('  ' + n));
console.log(`${DRY ? '[dry] ' : ''}solver descs: ${changed} rewritten, ${already} already new, ${guarded} guarded (not stale), ${unmapped} unmapped.`);
