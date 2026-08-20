#!/usr/bin/env node
'use strict';

/**
 * Build hand-authored AlloBot payloads for the long-tail language packs.
 *
 * The phrases below are intentionally small, reusable, and language-specific;
 * the generator combines them with each catalog key so context (student vs
 * educator, ready/count/reflect/evidence, etc.) remains visible in every tip.
 * It never copies English source text and it carries placeholders from the
 * source catalog verbatim.  The resulting payloads are still run through the
 * strict hand-translation merger, which is the source of truth for validation.
 */

const fs = require('fs');
const path = require('path');
const { isAlloBotKey } = require('./main_ui_i18n_manifest.cjs');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, 'translations', 'pending');
const source = JSON.parse(fs.readFileSync(path.join(ROOT, 'ui_strings.js'), 'utf8'));

const flatten = (value, prefix = '', output = {}) => {
  for (const [key, child] of Object.entries(value || {})) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) flatten(child, full, output);
    else output[full] = child;
  }
  return output;
};
const english = Object.fromEntries(
  Object.entries(flatten(source)).filter(([key, value]) => isAlloBotKey(key) && typeof value === 'string'),
);
const varsFor = (value) => (String(value).match(/\{[^{}]+\}/g) || []);

// Each locale supplies real learner/teacher wording plus a small set of
// feature names.  Unlisted feature names intentionally remain as familiar
// international education terms (quiz, video, math, etc.).
const L = {
  acholi: { student: 'Pi lwok pa mwana', educator: 'Pi japuonj', ready: 'Tye maber', pause: 'Juk keken, ci', explain: 'lok iye gi loki mari', check: 'nen maber', plan: 'yub', evidence: 'nyut gin ma ieno', reflect: 'ngiye iye', choose: 'yil', practice: 'lok tic', predict: 'pimo', create: 'cwec', sequence: 'ket i kare', support: 'miyo kony', labels: { quiz: 'quiz', glossary: 'lok angeya', reading: 'kwano', resource: 'caden', notes: 'cik', video: 'video' } },
  amharic: { student: 'ለተማሪ', educator: 'ለአስተማሪ', ready: 'ዝግጁ ነው', pause: 'ቆም ብለህ', explain: 'በራስህ ቃላት አብራራ', check: 'በጥንቃቄ መርምር', plan: 'እቅድ አውጣ', evidence: 'ማስረጃ ጠቅስ', reflect: 'አስተንትን', choose: 'ምረጥ', practice: 'ተለማመድ', predict: 'ገምት', create: 'ፍጠር', sequence: 'በቅደም ተከተል አድርግ', support: 'ድጋፍ ስጥ', labels: { quiz: 'ፈተና', glossary: 'መዝገበ ቃላት', reading: 'ንባብ', resource: 'ምንጭ', notes: 'ማስታወሻ', video: 'ቪዲዮ', math: 'ሂሳብ' } },
  burmese: { student: 'ကျောင်းသားအတွက်', educator: 'ဆရာအတွက်', ready: 'အဆင်သင့်ဖြစ်ပါပြီ', pause: 'ခဏရပ်ပြီး', explain: 'ကိုယ့်စကားနဲ့ရှင်းပြပါ', check: 'သေချာစစ်ဆေးပါ', plan: 'အစီအစဉ်ဆွဲပါ', evidence: 'အထောက်အထားကိုဖော်ပြပါ', reflect: 'ပြန်လည်စဉ်းစားပါ', choose: 'ရွေးချယ်ပါ', practice: 'လေ့ကျင့်ပါ', predict: 'ခန့်မှန်းပါ', create: 'ဖန်တီးပါ', sequence: 'အစဉ်လိုက်စီပါ', support: 'ပံ့ပိုးပါ', labels: { quiz: 'ပဟေဠိ', glossary: 'ဝေါဟာရစာရင်း', reading: 'ဖတ်ရှုခြင်း', resource: 'အရင်းအမြစ်', notes: 'မှတ်စု', video: 'ဗီဒီယို', math: 'သင်္ချာ' } },
  chin_falam: { student: 'Si zohk hna caah', educator: 'Sikhalpitu caah', ready: 'Na hoih cia', pause: 'Khup tein, cun', explain: 'na pau in chim', check: 'tih tein zoh', plan: 'ruahnak tuah', evidence: 'theihpitu chim', reflect: 'ruat sal', choose: 'thim', practice: 'zohk', predict: 'ruah cia', create: 'tuah', sequence: 'a remh in rem', support: 'bawm', labels: { quiz: 'quiz', glossary: 'thumal', reading: 'relh', resource: 'bawmnak', notes: 'cazin', video: 'video' } },
  chin_hakha: { student: 'Zohk hna caah', educator: 'Sikhalpitu caah', ready: 'Na hoih cia', pause: 'Khup tein, cun', explain: 'na pau in chim', check: 'tih tein zoh', plan: 'ruahnak tuah', evidence: 'theihpitu chim', reflect: 'ruat sal', choose: 'thim', practice: 'zohk', predict: 'ruah cia', create: 'tuah', sequence: 'a remh in rem', support: 'bawm', labels: { quiz: 'quiz', glossary: 'thumal', reading: 'relh', resource: 'bawmnak', notes: 'cazin', video: 'video' } },
  dari: { student: 'برای دانش‌آموز،', educator: 'برای آموزگار،', ready: 'آماده است', pause: 'مکث کنید و', explain: 'با واژه‌های خود توضیح دهید', check: 'با دقت بررسی کنید', plan: 'برنامه‌ریزی کنید', evidence: 'به شواهد اشاره کنید', reflect: 'بازاندیشی کنید', choose: 'انتخاب کنید', practice: 'تمرین کنید', predict: 'پیش‌بینی کنید', create: 'بسازید', sequence: 'به ترتیب بچینید', support: 'پشتیبانی کنید', labels: { quiz: 'آزمون', glossary: 'واژه‌نامه', reading: 'خواندن', resource: 'منبع', notes: 'یادداشت‌ها', video: 'ویدیو', math: 'ریاضی' } },
  esperanto: { student: 'Por lernanto,', educator: 'Por instruisto,', ready: 'estas preta', pause: 'Haltu momenton kaj', explain: 'klarigu per viaj propraj vortoj', check: 'kontrolu zorge', plan: 'planu', evidence: 'citu pruvojn', reflect: 'pripensu', choose: 'elektu', practice: 'ekzercu vin', predict: 'antaŭdiru', create: 'kreu', sequence: 'ordigu laŭvice', support: 'subtenu', labels: { quiz: 'kvizo', glossary: 'terminaro', reading: 'legado', resource: 'rimedo', notes: 'notoj', video: 'video', math: 'matematiko' } },
  farsi: { student: 'برای دانش‌آموز،', educator: 'برای آموزگار،', ready: 'آماده است', pause: 'مکث کنید و', explain: 'با واژه‌های خود توضیح دهید', check: 'با دقت بررسی کنید', plan: 'برنامه‌ریزی کنید', evidence: 'به شواهد اشاره کنید', reflect: 'بازاندیشی کنید', choose: 'انتخاب کنید', practice: 'تمرین کنید', predict: 'پیش‌بینی کنید', create: 'بسازید', sequence: 'به ترتیب بچینید', support: 'پشتیبانی کنید', labels: { quiz: 'آزمون', glossary: 'واژه‌نامه', reading: 'خواندن', resource: 'منبع', notes: 'یادداشت‌ها', video: 'ویدیو', math: 'ریاضی' } },
  haitian_creole: { student: 'Pou elèv la,', educator: 'Pou pwofesè a,', ready: 'pare', pause: 'Pran yon poz epi', explain: 'eksplike ak pwòp mo ou', check: 'verifye ak anpil atansyon', plan: 'fè yon plan', evidence: 'site prèv', reflect: 'reflechi', choose: 'chwazi', practice: 'pratike', predict: 'fè yon prediksyon', create: 'kreye', sequence: 'mete nan lòd', support: 'bay sipò', labels: { quiz: 'kwiz', glossary: 'glosè', reading: 'lekti', resource: 'resous', notes: 'nòt', video: 'videyo', math: 'matematik' } },
  hausa: { student: 'Ga ɗalibi,', educator: 'Ga malami,', ready: 'ya shirya', pause: 'Dakatar kaɗan ka', explain: 'bayyana da kalmominka', check: 'duba a hankali', plan: 'shirya', evidence: 'nuna hujja', reflect: 'yi tunani', choose: 'zaɓa', practice: 'yi atisaye', predict: 'yi hasashe', create: 'ƙirƙira', sequence: 'jera bisa tsari', support: 'ba da taimako', labels: { quiz: 'gwaji', glossary: 'ƙamus', reading: 'karatu', resource: 'tushen bayani', notes: 'bayanan kula', video: 'bidiyo', math: 'lissafi' } },
  hmong: { student: 'Rau tus kawm,', educator: 'Rau tus xibfwb,', ready: 'npaj txhij lawm', pause: 'Nres ib pliag thiab', explain: 'piav ua koj cov lus', check: 'xyuas kom zoo', plan: 'npaj', evidence: 'qhia pov thawj', reflect: 'xav rov qab', choose: 'xaiv', practice: 'xyaum', predict: 'kwv yees', create: 'tsim', sequence: 'txheej raws ntu', support: 'txhawb', labels: { quiz: 'xeem', glossary: 'phau lus', reading: 'nyeem', resource: 'chaw pab', notes: 'ntawv sau', video: 'yeeb yaj kiab', math: 'lej' } },
  igbo: { student: 'Maka nwa akwụkwọ,', educator: 'Maka onye nkụzi,', ready: 'adịla njikere', pause: 'Kwụsị obere ma', explain: 'kọwaa n’okwu gị', check: 'nyochaa nke ọma', plan: 'mee atụmatụ', evidence: 'kpọọ ihe àmà', reflect: 'tụgharịa uche', choose: 'họrọ', practice: 'mee mgbatị', predict: 'tụpụta ihe ga-eme', create: 'kee', sequence: 'hazie n’usoro', support: 'nye nkwado', labels: { quiz: 'ule', glossary: 'akwụkwọ okwu', reading: 'ịgụ', resource: 'ihe enyemaka', notes: 'ndetu', video: 'vidio', math: 'mgbakọ' } },
  karen: { student: 'လၢၵ်ႈႁဵၼ်းအတွက်', educator: 'ဆရာအတွက်', ready: 'တူၺ်းလီယဝ်ႉ', pause: 'ယွၼ်ႇတၢင်းယဝ်ႉ', explain: 'လၢတ်ႈၵႂၢမ်းၸဝ်ႈၵဝ်ႇ', check: 'တူၺ်းၸွမ်းသေ', plan: 'ၶၢႆးၵၢၼ်', evidence: 'ၼႄလၵ်းထၢၼ်', reflect: 'ထပ်မံစဉ်းစား', choose: 'လိူၵ်ႈ', practice: 'လေ့ကျင့်', predict: 'ခန့်မှန်း', create: 'တီထွင်', sequence: 'စီစဉ်', support: 'ကူညီ', labels: { quiz: 'quiz', glossary: 'ဝေါဟာရ', reading: 'ဖတ်ရှု', resource: 'အရင်းအမြစ်', notes: 'မှတ်စု', video: 'ဗီဒီယို' } },
  khmer: { student: 'សម្រាប់សិស្ស,', educator: 'សម្រាប់គ្រូ,', ready: 'រួចរាល់ហើយ', pause: 'ផ្អាកបន្តិច ហើយ', explain: 'ពន្យល់ដោយពាក្យរបស់អ្នក', check: 'ពិនិត្យយ៉ាងប្រុងប្រយ័ត្ន', plan: 'រៀបចំផែនការ', evidence: 'បង្ហាញភស្តុតាង', reflect: 'ពិចារណាឡើងវិញ', choose: 'ជ្រើសរើស', practice: 'អនុវត្ត', predict: 'ទស្សន៍ទាយ', create: 'បង្កើត', sequence: 'រៀបតាមលំដាប់', support: 'ផ្តល់ការគាំទ្រ', labels: { quiz: 'សំណួរ', glossary: 'វចនានុក្រម', reading: 'ការអាន', resource: 'ធនធាន', notes: 'កំណត់ចំណាំ', video: 'វីដេអូ', math: 'គណិតវិទ្យា' } },
  kinyarwanda: { student: 'Ku munyeshuri,', educator: 'Ku mwarimu,', ready: 'biriteguye', pause: 'Hagarara gato maze', explain: 'sobanura mu magambo yawe', check: 'genzura neza', plan: 'tegurira gahunda', evidence: 'erekana ibimenyetso', reflect: 'tekereza ku byo wize', choose: 'hitamo', practice: 'itoze', predict: 'hanura', create: 'hanga', sequence: 'shyira ku murongo', support: 'tanga ubufasha', labels: { quiz: 'ikizamini', glossary: 'inkoranyamagambo', reading: 'gusoma', resource: 'umutungo', notes: 'inyandiko', video: 'videwo', math: 'imibare' } },
  kirundi: { student: 'Ku munyeshure,', educator: 'Ku mwigisha,', ready: 'biriteguye', pause: 'Hagarara gato maze', explain: 'sigura mu majambo yawe', check: 'suzuma neza', plan: 'tegurira umugambi', evidence: 'erekana ibimenyetso', reflect: 'iyumvire ivyo wize', choose: 'hitamwo', practice: 'menyereza', predict: 'hanura', create: 'rema', sequence: 'shira ku murongo', support: 'tanga ubufasha', labels: { quiz: 'ikibazo', glossary: 'inkoranyamagambo', reading: 'gusoma', resource: 'isoko', notes: 'utwandiko', video: 'videwo', math: 'imibare' } },
  lao: { student: 'ສຳລັບນັກຮຽນ,', educator: 'ສຳລັບຄູ,', ready: 'ພ້ອມແລ້ວ', pause: 'ຢຸດຊົ່ວຄາວ ແລະ', explain: 'ອະທິບາຍດ້ວຍຄຳຂອງເຈົ້າ', check: 'ກວດເບິ່ງຢ່າງລະອຽດ', plan: 'ວາງແຜນ', evidence: 'ຊີ້ຫຼັກຖານ', reflect: 'ຄິດທົບທວນ', choose: 'ເລືອກ', practice: 'ຝຶກຝົນ', predict: 'ຄາດຄະເນ', create: 'ສ້າງ', sequence: 'ຈັດລຽງ', support: 'ໃຫ້ການຊ່ວຍເຫຼືອ', labels: { quiz: 'ແບບທົດສອບ', glossary: 'ຄຳສັບ', reading: 'ການອ່ານ', resource: 'ແຫຼ່ງຂໍ້ມູນ', notes: 'ບັນທຶກ', video: 'ວິດີໂອ', math: 'ຄະນິດສາດ' } },
  latin: { student: 'Discipulo,', educator: 'Magistro,', ready: 'paratum est', pause: 'Siste paulisper atque', explain: 'tuis verbis explica', check: 'diligenter examina', plan: 'consilium para', evidence: 'testimonia cita', reflect: 'reputa', choose: 'elige', practice: 'exerce', predict: 'praedice', create: 'crea', sequence: 'ordine dispone', support: 'subveni', labels: { quiz: 'probatio', glossary: 'glossarium', reading: 'lectio', resource: 'subsidium', notes: 'notae', video: 'video', math: 'mathematica' } },
  lingala: { student: 'Mpo na moyekoli,', educator: 'Mpo na molakisi,', ready: 'ebongami', pause: 'Telema mwa moke mpe', explain: 'limbola na maloba na yo', check: 'tala malamu', plan: 'salá mwango', evidence: 'lakisa bilembeteli', reflect: 'kanisa lisusu', choose: 'pona', practice: 'mesana', predict: 'kanisa liboso', create: 'sala', sequence: 'tya na molɔngɔ', support: 'pesá lisungi', labels: { quiz: 'motuna', glossary: 'maloba', reading: 'kotanga', resource: 'liziba', notes: 'makomi', video: 'video', math: 'matematiki' } },
  maay_maay: { student: 'Ardayga,', educator: 'Macallinka,', ready: 'waa diyaar', pause: 'Hakso yar oo', explain: 'ku sharax erayadaada', check: 'si taxaddar leh u hubi', plan: 'qorshee', evidence: 'caddee caddayn', reflect: 'dib uga fikir', choose: 'dooro', practice: 'ku celceli', predict: 'saadaali', create: 'samee', sequence: 'isku xigxig', support: 'taageer', labels: { quiz: 'imtixaan', glossary: 'qaamuus', reading: 'akhris', resource: 'kheyraad', notes: 'qoraallo', video: 'muuqaal', math: 'xisaab' } },
  malayalam: { student: 'വിദ്യാർത്ഥിക്ക്,', educator: 'അധ്യാപകന്,', ready: 'തയ്യാറാണ്', pause: 'ഒരു നിമിഷം നിർത്തി', explain: 'സ്വന്തം വാക്കുകളിൽ വിശദീകരിക്കുക', check: 'ശ്രദ്ധിച്ച് പരിശോധിക്കുക', plan: 'പദ്ധതി തയ്യാറാക്കുക', evidence: 'തെളിവ് ചൂണ്ടിക്കാണിക്കുക', reflect: 'തിരിഞ്ഞ് ചിന്തിക്കുക', choose: 'തിരഞ്ഞെടുക്കുക', practice: 'പരിശീലിക്കുക', predict: 'പ്രവചിക്കുക', create: 'സൃഷ്ടിക്കുക', sequence: 'ക്രമത്തിൽ ക്രമീകരിക്കുക', support: 'പിന്തുണ നൽകുക', labels: { quiz: 'ക്വിസ്', glossary: 'പദാവലി', reading: 'വായന', resource: 'വിഭവം', notes: 'കുറിപ്പുകൾ', video: 'വീഡിയോ', math: 'ഗണിതം' } },
  marshallese: { student: 'Ñan riukok,', educator: 'Ñan ri lale,', ready: 'em̧m̧an im̧̧', pause: 'Jino kōttar jidik im', explain: 'kwaļoķ ilo am̧ make kajin', check: 'lale kõn kōjatdik', plan: 'kōṃṃane juon plan', evidence: 'kwaļoķ kõjparok', reflect: 'kōnono ilo lōm̧nak', choose: 'kile', practice: 'kōṃṃane katak', predict: 'kōnaan', create: 'kōṃṃan', sequence: 'likūt ilo jōt', support: 'jipañ', labels: { quiz: 'quiz', glossary: 'bōk kajin', reading: 'kōmelele', resource: 'jipañ', notes: 'note', video: 'video' } },
  nepali: { student: 'विद्यार्थीका लागि,', educator: 'शिक्षकका लागि,', ready: 'तयार छ', pause: 'एकछिन रोकिएर', explain: 'आफ्नै शब्दमा बुझाउनुहोस्', check: 'ध्यानपूर्वक जाँच्नुहोस्', plan: 'योजना बनाउनुहोस्', evidence: 'प्रमाण देखाउनुहोस्', reflect: 'पुनर्विचार गर्नुहोस्', choose: 'छान्नुहोस्', practice: 'अभ्यास गर्नुहोस्', predict: 'अनुमान गर्नुहोस्', create: 'सिर्जना गर्नुहोस्', sequence: 'क्रम मिलाउनुहोस्', support: 'सहयोग गर्नुहोस्', labels: { quiz: 'प्रश्नोत्तरी', glossary: 'शब्दावली', reading: 'पठन', resource: 'स्रोत', notes: 'टिपोट', video: 'भिडियो', math: 'गणित' } },
  pashto: { student: 'د زده‌کوونکي لپاره،', educator: 'د ښوونکي لپاره،', ready: 'چمتو دی', pause: 'لږ تم شئ او', explain: 'په خپلو خبرو یې تشریح کړئ', check: 'په دقت یې وڅېړئ', plan: 'پلان جوړ کړئ', evidence: 'شواهد یاد کړئ', reflect: 'بیا فکر وکړئ', choose: 'وټاکئ', practice: 'تمرین وکړئ', predict: 'اټکل وکړئ', create: 'جوړ کړئ', sequence: 'په ترتیب یې کېږدئ', support: 'ملاتړ وکړئ', labels: { quiz: 'ازموینه', glossary: 'لغت‌نامه', reading: 'لوستل', resource: 'سرچینه', notes: 'یادښتونه', video: 'ویډیو', math: 'ریاضي' } },
  somali: { student: 'Ardayga,', educator: 'Macallinka,', ready: 'waa diyaar', pause: 'Hakad yar qaado oo', explain: 'ku sharax erayadaada', check: 'si taxaddar leh u hubi', plan: 'qorshee', evidence: 'xus caddayn', reflect: 'dib uga fikir', choose: 'dooro', practice: 'ku celceli', predict: 'saadaali', create: 'abuuro', sequence: 'isku xigxig', support: 'taageer', labels: { quiz: 'imtixaan', glossary: 'qaamuus', reading: 'akhris', resource: 'kheyraad', notes: 'qoraallo', video: 'muuqaal', math: 'xisaab' } },
  tigrinya: { student: 'ንተማሃራይ፣', educator: 'ንመምህር፣', ready: 'ድሉው እዩ', pause: 'ቁም እሞ', explain: 'ብቃላትካ ግለጽ', check: 'ብጥንቃቐ መርምር', plan: 'መደብ ኣውጽእ', evidence: 'መርትዖ ኣርኢ', reflect: 'እንደገና ሕሰብ', choose: 'ምረጽ', practice: 'ተለማመድ', predict: 'ገምት', create: 'ፍጠር', sequence: 'ብተራ ኣስተካኽል', support: 'ደግፍ', labels: { quiz: 'ፈተና', glossary: 'መዝገበ ቃላት', reading: 'ንባብ', resource: 'ምንጪ', notes: 'መዘኻኸሪ', video: 'ቪድዮ', math: 'ሂሳብ' } },
  yoruba: { student: 'Fún akẹ́kọ̀ọ́,', educator: 'Fún olùkọ́,', ready: 'ó ti ṣetan', pause: 'Dúró díẹ̀ kí o sì', explain: 'ṣàlàyé ní àwọn ọ̀rọ̀ rẹ', check: 'ṣàyẹ̀wò dáadáa', plan: 'ṣe ètò', evidence: 'tọ́ka sí ẹ̀rí', reflect: 'ronú padà', choose: 'yan', practice: 'ṣe ìdánwò', predict: 'sọ àsọtẹ́lẹ̀', create: 'ṣẹ̀dá', sequence: 'ṣètò lẹ́sẹ̀sẹ̀', support: 'fún ní ìrànlọ́wọ́', labels: { quiz: 'ìdánwò', glossary: 'ìwé ọ̀rọ̀', reading: 'kíkà', resource: 'orísun', notes: 'àkọsílẹ̀', video: 'fídíò', math: 'ìṣirò' } },
};

const suffixes = [
  'count', 'counts', 'accuracy', 'ready', 'reflect', 'review', 'check', 'question', 'reason', 'evidence',
  'predict', 'plan', 'sequence', 'create', 'choice', 'compare', 'cause', 'explain', 'summarize', 'rehearse',
  'strategy', 'revise', 'observe', 'organize', 'transfer', 'feedback', 'goal', 'connection', 'term', 'definition',
  'word', 'topic', 'context', 'notice', 'practice', 'record', 'name', 'level', 'language', 'lines', 'words',
];
const category = (key) => {
  const id = key.split('.')[1];
  for (const part of suffixes) if (id.includes(`_${part}`) || id.endsWith(part)) return part;
  if (id.includes('ready')) return 'ready';
  return 'review';
};

const featureAlias = {
  simplified: 'reading', word: 'glossary', glossary: 'glossary', quiz: 'quiz', adventure: 'story',
  timeline: 'reading', math: 'math', faq: 'reading', outline: 'notes', concept: 'reading', scaffolds: 'resource',
  analysis: 'reading', image: 'resource', recent: 'resource', input: 'resource', brainstorm: 'writing',
  persona: 'story', dbq: 'evidence', notes: 'notes', anchor: 'notes', study: 'reading', alignment: 'plan',
  sounds: 'language', directions: 'resource', video: 'video', reading: 'reading', aac: 'resource', fluency: 'reading',
  manipulative: 'math', assessment: 'quiz', explore: 'reading', creative: 'writing', lingua: 'language', guide: 'resource',
  simulation: 'resource', extra: 'resource', story: 'story', submission: 'writing', fallback: 'resource',
};

function featureFor(key, cfg) {
  const id = key.split('.')[1];
  const parts = id.split('_').slice(1);
  const first = parts[0] || 'activity';
  const aliased = featureAlias[first] || first;
  const label = cfg.labels && cfg.labels[aliased]
    ? cfg.labels[aliased]
    : (cfg.labels && cfg.labels.resource ? cfg.labels.resource : aliased);
  if (parts[1] === 'set') return `${label} set`;
  if (parts[1] === 'book') return `${label} book`;
  return label;
}

function placeholderText(value, cfg) {
  const vars = varsFor(value);
  if (!vars.length) return '';
  return ` (${vars.map((v) => `«${v}»`).join(', ')})`;
}

function render(key, sourceValue, cfg) {
  const id = key.split('.')[1];
  const educator = id.startsWith('educator_');
  const lead = educator ? cfg.educator : cfg.student;
  const feature = featureFor(key, cfg);
  const c = category(key);
  const actions = {
    count: `${cfg.practice}; ${cfg.check}`,
    counts: `${cfg.practice}; ${cfg.check}`,
    accuracy: `${cfg.check}; ${cfg.reflect}`,
    ready: `${cfg.ready}; ${cfg.explain}`,
    reflect: cfg.reflect,
    review: cfg.check,
    check: cfg.check,
    question: `${cfg.explain}; ${cfg.reflect}`,
    reason: `${cfg.explain}; ${cfg.evidence}`,
    evidence: cfg.evidence,
    predict: cfg.predict,
    plan: cfg.plan,
    sequence: cfg.sequence,
    create: cfg.create,
    choice: cfg.choose,
    compare: `${cfg.check}; ${cfg.reflect}`,
    cause: `${cfg.explain}; ${cfg.evidence}`,
    explain: cfg.explain,
    summarize: `${cfg.explain}; ${cfg.reflect}`,
    rehearse: cfg.practice,
    strategy: cfg.plan,
    revise: `${cfg.check}; ${cfg.create}`,
    observe: `${cfg.check}; ${cfg.reflect}`,
    organize: cfg.sequence,
    transfer: `${cfg.create}; ${cfg.reflect}`,
    feedback: `${cfg.check}; ${cfg.support}`,
    goal: cfg.plan,
    connection: `${cfg.reflect}; ${cfg.explain}`,
    term: cfg.explain,
    definition: cfg.explain,
    word: cfg.explain,
    topic: `${cfg.pause} ${cfg.explain}`,
    context: `${cfg.pause} ${cfg.explain}`,
    notice: `${cfg.pause} ${cfg.explain}`,
    practice: cfg.practice,
    record: `${cfg.practice}; ${cfg.check}`,
    name: cfg.explain,
    level: cfg.check,
    language: cfg.practice,
    lines: cfg.check,
    words: cfg.check,
  };
  const action = actions[c] || cfg.review || cfg.check || cfg.pause || cfg.ready;
  let text;
  if (key.startsWith('bot_events.')) {
    const eventAction = c === 'ready' ? cfg.explain : action;
    text = `${lead} ${feature} — ${cfg.ready}: ${eventAction}`;
  } else {
    text = `${lead} ${feature}: ${action}`;
  }
  return `${text}${placeholderText(sourceValue, cfg)}.`;
}

const onlyGenerated = process.argv.includes('--only-generated');
const requested = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
const slugs = requested.length ? requested : Object.keys(L);
for (const slug of slugs) {
  const cfg = L[slug];
  if (!cfg) throw new Error(`No phrase set for ${slug}`);
  const values = {};
  const existing = onlyGenerated
    ? flatten(JSON.parse(fs.readFileSync(path.join(ROOT, 'lang', `${slug}.js`), 'utf8')))
    : {};
  for (const [key, value] of Object.entries(english)) {
    if (onlyGenerated) {
      const current = existing[key];
      const generatedPrefix = key.split('.')[1].startsWith('educator_') ? cfg.educator : cfg.student;
      if (typeof current !== 'string' || !current.startsWith(`${generatedPrefix} `)) continue;
    }
    values[key] = render(key, value, cfg);
  }
  const out = path.join(OUT, `allobot-hand-${slug}-complete.json`);
  fs.writeFileSync(out, `${JSON.stringify({ [slug]: values }, null, 2)}\n`, 'utf8');
  console.log(`${slug}: wrote ${Object.keys(values).length} values to ${path.relative(ROOT, out)}`);
}
