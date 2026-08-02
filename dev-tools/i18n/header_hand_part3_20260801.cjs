// Locally authored hand translations for header, languages 43-63.
const KEYS=['reading_theme_warm','reading_theme_sepia','reading_theme_dark','reading_theme_contrast','reading_theme_easy_read','reading_theme_dim','personal_ai_connect','personal_ai_connected','personal_ai_ready','personal_ai_disconnect','personal_ai_disconnect_detail'];
const common={
  polish:['Ciepły','Sepia','Ciemny','Wysoki kontrast','Łatwe czytanie','Przyciemniony','Połącz osobistą AI','Osobista AI połączona','AI gotowa','Odłącz osobistą AI','Odłącz osobistą AI i usuń klucz z tej karty przeglądarki'],
  portuguese_angola:['Quente','Sépia','Escuro','Alto contraste','Leitura fácil','Esbatido','Ligar IA pessoal','IA pessoal ligada','IA pronta','Desligar IA pessoal','Desligar a IA pessoal e apagar a chave deste separador do navegador'],
  portuguese_brazil:['Quente','Sépia','Escuro','Alto contraste','Leitura fácil','Esmaecido','Conectar IA pessoal','IA pessoal conectada','IA pronta','Desconectar IA pessoal','Desconectar a IA pessoal e excluir a chave desta aba do navegador'],
  portuguese_portugal:['Quente','Sépia','Escuro','Alto contraste','Leitura fácil','Esbatido','Ligar IA pessoal','IA pessoal ligada','IA pronta','Desligar IA pessoal','Desligar a IA pessoal e apagar a chave deste separador do navegador'],
  punjabi:['ਗਰਮ','ਸੇਪੀਆ','ਗੂੜ੍ਹਾ','ਉੱਚਾ ਕਾਂਟ੍ਰਾਸਟ','ਆਸਾਨ ਪਾਠ','ਮੱਧਮ','ਨਿੱਜੀ AI ਕਨੈਕਟ ਕਰੋ','ਨਿੱਜੀ AI ਕਨੈਕਟ ਹੈ','AI ਤਿਆਰ ਹੈ','ਨਿੱਜੀ AI ਡਿਸਕਨੈਕਟ ਕਰੋ','ਨਿੱਜੀ AI ਡਿਸਕਨੈਕਟ ਕਰੋ ਅਤੇ ਇਸ ਬ੍ਰਾਊਜ਼ਰ ਟੈਬ ਤੋਂ ਕੁੰਜੀ ਮਿਟਾਓ'],
  romanian:['Cald','Sepia','Întunecat','Contrast ridicat','Citire ușoară','Estompat','Conectează AI personal','AI personal conectat','AI pregătit','Deconectează AI personal','Deconectează AI personal și șterge cheia din această filă de browser'],
  russian:['Тёплый','Сепия','Тёмный','Высокий контраст','Лёгкое чтение','Приглушённый','Подключить личный ИИ','Личный ИИ подключён','ИИ готов','Отключить личный ИИ','Отключить личный ИИ и удалить ключ из этой вкладки браузера'],
  somali:['Diiran','Sepia','Madow','Isbarbardhig sare','Akhris fudud','Daciif','Ku xidh AI-ga gaarka ah','AI-ga gaarka ah waa xiran yahay','AI waa diyaar','Ka jar AI-ga gaarka ah','Ka jar AI-ga gaarka ah oo ka tirtir furaha tab-kan browser-ka'],
  spanish_castilian:['Cálido','Sepia','Oscuro','Alto contraste','Lectura fácil','Atenuado','Conectar IA personal','IA personal conectada','IA lista','Desconectar IA personal','Desconectar IA personal y eliminar la clave de esta pestaña del navegador'],
  spanish_latin_america:['Cálido','Sepia','Oscuro','Alto contraste','Lectura fácil','Atenuado','Conectar IA personal','IA personal conectada','IA lista','Desconectar IA personal','Desconectar IA personal y eliminar la clave de esta pestaña del navegador'],
  swahili:['Joto','Sepia','Giza','Tofauti kubwa','Usomaji rahisi','Hafifu','Unganisha AI ya binafsi','AI ya binafsi imeunganishwa','AI iko tayari','Tenganisha AI ya binafsi','Tenganisha AI ya binafsi na ufute ufunguo kwenye kichupo hiki cha kivinjari'],
  tagalog:['Mainit','Sepia','Madilim','Mataas na contrast','Madaling basahin','Malabo','Ikonekta ang personal na AI','Nakakonekta ang personal na AI','Handa na ang AI','Idiskonekta ang personal na AI','Idiskonekta ang personal na AI at tanggalin ang key sa browser tab na ito'],
  tamil:['சூடான','செபியா','இருண்ட','அதிக மாறுபாடு','எளிதாகப் படிக்க','மங்கலான','தனிப்பட்ட AI-ஐ இணைக்கவும்','தனிப்பட்ட AI இணைக்கப்பட்டுள்ளது','AI தயாராக உள்ளது','தனிப்பட்ட AI-ஐ துண்டிக்கவும்','தனிப்பட்ட AI-ஐ துண்டித்து இந்த உலாவி தாவலில் உள்ள விசையை நீக்கவும்'],
  telugu:['వెచ్చని','సెపియా','చీకటి','అధిక కాంట్రాస్ట్','సులభ పఠనం','మసక','వ్యక్తిగత AIని కనెక్ట్ చేయండి','వ్యక్తిగత AI కనెక్ట్ అయింది','AI సిద్ధంగా ఉంది','వ్యక్తిగత AIని డిస్‌కనెక్ట్ చేయండి','వ్యక్తిగత AIని డిస్‌కనెక్ట్ చేసి ఈ బ్రౌజర్ ట్యాబ్ నుండి కీని తొలగించండి'],
  thai:['อุ่น','ซีเปีย','มืด','คอนทราสต์สูง','อ่านง่าย','จาง','เชื่อมต่อ AI ส่วนตัว','เชื่อมต่อ AI ส่วนตัวแล้ว','AI พร้อมใช้งาน','ยกเลิกการเชื่อมต่อ AI ส่วนตัว','ยกเลิกการเชื่อมต่อ AI ส่วนตัวและลบคีย์ออกจากแท็บเบราว์เซอร์นี้'],
  tigrinya:['ሙቕ','ሰፒያ','ጸልማት','ልዑል ንጽጽር','ቀሊል ንባብ','ዝደበዘዘ','ውልቃዊ AI ኣራኽብ','ውልቃዊ AI ተራኺቡ','AI ድሉው እዩ','ውልቃዊ AI ፍታሕ','ውልቃዊ AI ፍታሕ እሞ ካብዚ ናይ መርበብ ሓበሬታ ታብ መፍትሕ ሰርዝ'],
  turkish:['Sıcak','Sepya','Koyu','Yüksek kontrast','Kolay okuma','Soluk','Kişisel yapay zekâyı bağla','Kişisel yapay zekâ bağlandı','Yapay zekâ hazır','Kişisel yapay zekâ bağlantısını kes','Kişisel yapay zekâ bağlantısını kes ve anahtarı bu tarayıcı sekmesinden sil'],
  ukrainian:['Тепла','Сепія','Темна','Високий контраст','Легке читання','Приглушена','Підключити особистий ШІ','Особистий ШІ підключено','ШІ готовий','Відключити особистий ШІ','Відключити особистий ШІ та видалити ключ із цієї вкладки браузера'],
  urdu:['گرم','سیپیا','گہرا','زیادہ تضاد','آسان مطالعہ','مدھم','ذاتی AI سے جڑیں','ذاتی AI منسلک ہے','AI تیار ہے','ذاتی AI منقطع کریں','ذاتی AI منقطع کریں اور اس براؤزر ٹیب سے کلید حذف کریں'],
  vietnamese:['Ấm','Nâu đỏ','Tối','Tương phản cao','Dễ đọc','Mờ','Kết nối AI cá nhân','AI cá nhân đã kết nối','AI sẵn sàng','Ngắt kết nối AI cá nhân','Ngắt kết nối AI cá nhân và xóa khóa khỏi thẻ trình duyệt này'],
  yoruba:['Gbígbóná','Sepia','Dúdú','Ìyàtọ̀ gíga','Kíka rọrùn','Dídán','So AI ti ara ẹni pọ̀','AI ti ara ẹni ti sopọ̀','AI ti ṣetan','Ge AI ti ara ẹni kúrò','Ge AI ti ara ẹni kúrò kí o sì pa kọ́kọ́rọ́ rẹ́ kúrò nínú taabu aṣàwákiri yìí'],
};
const extra={
  polish:{reading_theme_default:'Domyślny',reading_theme_blue:'Niebieski'},
  portuguese_portugal:{reading_theme_default:'Predefinido'},
  russian:{reading_theme_blue:'Синий'},
  swahili:{reading_theme_blue:'Bluu'},
  tagalog:{reading_theme_default:'Default'},
  thai:{learning_tools_aria:'เครื่องมือการเรียนรู้'},
  ukrainian:{reading_theme_blue:'Синя'},
  urdu:{reading_theme_default:'طے شدہ',reading_theme_blue:'نیلا'},
  vietnamese:{reading_theme_blue:'Xanh dương'},
};
const out={};for(const [lang,values] of Object.entries(common)){if(values.length!==KEYS.length)throw new Error(lang+' header table length');out[lang]=Object.fromEntries(KEYS.map((k,i)=>[k,values[i]]));Object.assign(out[lang],extra[lang]||{});}module.exports=out;
