// Locally authored hand translations for header, languages 01-21.
const KEYS=['reading_theme_warm','reading_theme_sepia','reading_theme_dark','reading_theme_contrast','reading_theme_easy_read','reading_theme_dim','personal_ai_connect','personal_ai_connected','personal_ai_ready','personal_ai_disconnect','personal_ai_disconnect_detail'];
const common={
  acholi:['Tep ma lyeto','Tep calo sepia','Tep ma lal','Tep matek','Kwano mayot','Tep ma piny','Kube ki AI mari','AI mari okube','AI tye atera','Geng AI mari','Geng AI mari ka golo nyuth i browser man'],
  amharic:['ሙቅ','ሴፒያ','ጨለማ','ከፍተኛ ንፅፅር','ቀላል ንባብ','ደብዛዛ','የግል AI ያገናኙ','የግል AI ተገናኝቷል','AI ዝግጁ ነው','የግል AI ግንኙነት ይቋረጥ','የግል AI ግንኙነትን ያቋርጡ እና ቁልፉን ከዚህ የአሳሽ ትር ያጥፉ'],
  arabic:['دافئ','بني داكن','داكن','تباين عالٍ','قراءة سهلة','خافت','توصيل الذكاء الاصطناعي الشخصي','تم توصيل الذكاء الاصطناعي الشخصي','الذكاء الاصطناعي جاهز','فصل الذكاء الاصطناعي الشخصي','افصل الذكاء الاصطناعي الشخصي وامسح المفتاح من علامة تبويب المتصفح هذه'],
  bengali:['উষ্ণ','সেপিয়া','গাঢ়','উচ্চ কনট্রাস্ট','সহজ পাঠ','ম্লান','ব্যক্তিগত AI সংযোগ করুন','ব্যক্তিগত AI সংযুক্ত','AI প্রস্তুত','ব্যক্তিগত AI সংযোগ বিচ্ছিন্ন করুন','ব্যক্তিগত AI সংযোগ বিচ্ছিন্ন করে এই ব্রাউজার ট্যাব থেকে কী মুছে দিন'],
  burmese:['နွေးထွေး','Sepia','အမှောင်','မြင့်မားသော Contrast','လွယ်ကူဖတ်ရှု','မှိန်','ကိုယ်ပိုင် AI ချိတ်ဆက်ပါ','ကိုယ်ပိုင် AI ချိတ်ဆက်ပြီး','AI အသင့်ဖြစ်သည်','ကိုယ်ပိုင် AI ချိတ်ဆက်မှု ဖြုတ်ပါ','ကိုယ်ပိုင် AI ချိတ်ဆက်မှုဖြုတ်ပြီး ဤဘရောက်ဇာ tab မှ သော့ကို ဖျက်ပါ'],
  chin_falam:['Warm','Sepia','Dark','High Contrast','Easy Read','Dim','Personal AI peh','Personal AI a peh','AI a tim','Personal AI phawih','Personal AI phawih in hi browser tab chungin key hlawhter'],
  chin_hakha:['Warm','Sepia','Dark','High Contrast','Easy Read','Dim','Personal AI peh','Personal AI a peh','AI a tim','Personal AI phawih','Personal AI phawih in hi browser tab chungin key hlawhter'],
  chinese_simplified:['暖色','棕褐色','深色','高对比度','易读','调暗','连接个人 AI','个人 AI 已连接','AI 已就绪','断开个人 AI','断开个人 AI，并从此浏览器标签页中删除密钥'],
  chinese_traditional:['暖色','深褐色','深色','高對比度','易讀','調暗','連接個人 AI','個人 AI 已連接','AI 已就緒','中斷個人 AI','中斷個人 AI 並從此瀏覽器分頁刪除金鑰'],
  dari:['گرم','سپیا','تاریک','تضاد بلند','خواندن آسان','کم‌نور','اتصال هوش مصنوعی شخصی','هوش مصنوعی شخصی وصل است','هوش مصنوعی آماده است','قطع اتصال هوش مصنوعی شخصی','اتصال هوش مصنوعی شخصی را قطع کنید و کلید را از این برگه مرورگر پاک کنید'],
  dutch:['Warm','Sepia','Donker','Hoog contrast','Gemakkelijk lezen','Gedimd','Persoonlijke AI verbinden','Persoonlijke AI verbonden','AI klaar','Persoonlijke AI loskoppelen','Koppel persoonlijke AI los en wis de sleutel uit dit browsertabblad'],
  esperanto:['Varma','Sepio','Malhela','Alta kontrasto','Facila legado','Malforta','Konekti personan AI','Persona AI konektita','AI preta','Malkonekti personan AI','Malkonektu personan AI kaj forigu la ŝlosilon el ĉi tiu retumila langeto'],
  farsi:['گرم','قهوه‌ای','تیره','کنتراست بالا','خواندن آسان','کم‌نور','اتصال هوش مصنوعی شخصی','هوش مصنوعی شخصی متصل است','هوش مصنوعی آماده است','قطع اتصال هوش مصنوعی شخصی','اتصال هوش مصنوعی شخصی را قطع کنید و کلید را از این برگه مرورگر پاک کنید'],
  french:['Chaud','Sépia','Sombre','Contraste élevé','Lecture facile','Atténué','Connecter l’IA personnelle','IA personnelle connectée','IA prête','Déconnecter l’IA personnelle','Déconnecter l’IA personnelle et effacer la clé de cet onglet du navigateur'],
  french_canadian:['Chaud','Sépia','Sombre','Contraste élevé','Lecture facile','Atténué','Connecter l’IA personnelle','IA personnelle connectée','IA prête','Déconnecter l’IA personnelle','Déconnecter l’IA personnelle et effacer la clé de cet onglet du navigateur'],
  german:['Warm','Sepia','Dunkel','Hoher Kontrast','Leicht lesen','Gedämpft','Persönliche KI verbinden','Persönliche KI verbunden','KI bereit','Persönliche KI trennen','Persönliche KI trennen und den Schlüssel aus diesem Browser-Tab löschen'],
  greek:['Θερμό','Σέπια','Σκούρο','Υψηλή αντίθεση','Εύκολη ανάγνωση','Αμυδρό','Σύνδεση προσωπικής AI','Η προσωπική AI συνδέθηκε','Η AI είναι έτοιμη','Αποσύνδεση προσωπικής AI','Αποσυνδέστε την προσωπική AI και διαγράψτε το κλειδί από αυτή την καρτέλα'],
  gujarati:['ગરમ','સેપિયા','ઘેરો','ઉચ્ચ કોન્ટ્રાસ્ટ','સરળ વાંચન','ઝાંખો','વ્યક્તિગત AI જોડો','વ્યક્તિગત AI જોડાયેલ','AI તૈયાર છે','વ્યક્તિગત AI ડિસ્કનેક્ટ કરો','વ્યક્તિગત AI ડિસ્કનેક્ટ કરો અને આ બ્રાઉઝર ટેબમાંથી કી ભૂંસી નાખો'],
  haitian_creole:['Cho','Sepya','Fonse','Gwo kontras','Lekti fasil','Pal','Konekte AI pèsonèl','AI pèsonèl konekte','AI pare','Dekonekte AI pèsonèl','Dekonekte AI pèsonèl la epi efase kle a nan onglet navigatè sa a'],
  hausa:['Dumi','Sepia','Duhu','Babban bambanci','Karatu mai sauƙi','Rauni','Haɗa AI na kanka','AI na kanka ya haɗu','AI a shirye','Cire haɗin AI na kanka','Cire AI na kanka kuma goge mabudin daga wannan shafin burauza'],
  hebrew:['חם','ספיה','כהה','ניגודיות גבוהה','קריאה קלה','עמום','חיבור AI אישי','AI אישי מחובר','AI מוכן','ניתוק AI אישי','נתקו את ה‑AI האישי ומחקו את המפתח מהכרטיסייה הזו בדפדפן'],
};
const extra={
  acholi:{reading_theme_default:'Tep ma pire',reading_theme_green:'Green',learning_tools_tooltip:'Tools me pwony (STEM Lab, SEL Hub, Research Hub, LitLab, PoetTree, StoryForge)',learning_tools_aria:'Tools me pwony'},
  arabic:{reading_theme_default:'افتراضي'},
  chin_falam:{reading_theme_default:'Default',reading_theme_green:'Green',reading_theme_rose:'Rose',learning_tools_tooltip:'Learning Tools (STEM Lab, SEL Hub, Research Hub, LitLab, PoetTree, StoryForge)',learning_tools_aria:'Learning Tools'},
  chin_hakha:{reading_theme_default:'Default',reading_theme_green:'Green',reading_theme_rose:'Rose',learning_tools_tooltip:'Learning Tools (STEM Lab, SEL Hub, Research Hub, LitLab, PoetTree, StoryForge)',learning_tools_aria:'Learning Tools'},
  chinese_traditional:{reading_theme_default:'預設',reading_theme_blue:'藍色'},
  chinese_simplified:{reading_theme_blue:'蓝色'},
  dari:{reading_theme_blue:'آبی'},
  farsi:{reading_theme_blue:'آبی'},
  haitian_creole:{reading_theme_default:'Defo'},
  japanese:{reading_theme_default:'デフォルト',reading_theme_blue:'青'},
};
const out={};for(const [lang,values] of Object.entries(common)){if(values.length!==KEYS.length)throw new Error(lang+' header table length');out[lang]=Object.fromEntries(KEYS.map((k,i)=>[k,values[i]]));Object.assign(out[lang],extra[lang]||{});}module.exports=out;
