// Locally authored hand translations for header, languages 22-42.
const KEYS=['reading_theme_warm','reading_theme_sepia','reading_theme_dark','reading_theme_contrast','reading_theme_easy_read','reading_theme_dim','personal_ai_connect','personal_ai_connected','personal_ai_ready','personal_ai_disconnect','personal_ai_disconnect_detail'];
const common={
  hindi:['गर्म','सेपिया','गहरा','उच्च कंट्रास्ट','आसान पठन','धुंधला','व्यक्तिगत AI कनेक्ट करें','व्यक्तिगत AI कनेक्टेड','AI तैयार है','व्यक्तिगत AI डिस्कनेक्ट करें','व्यक्तिगत AI डिस्कनेक्ट करें और इस ब्राउज़र टैब से कुंजी मिटाएँ'],
  hmong:['Sov','Sepia','Tsaus','Zoo sib txawv siab','Nyeem yooj yim','Tsaus me ntsis','Txuas tus AI ntiag tug','Tus AI ntiag tug txuas lawm','AI npaj lawm','Txiav tus AI ntiag tug','Txiav tus AI ntiag tug thiab rho tus yuam sij tawm ntawm browser tab no'],
  igbo:['Ọkụ','Sepia','Ọchịchịrị','Ọdịiche dị elu','Ọgụgụ dị mfe','Ọchịchịrị ntakịrị','Jikọọ AI nkeonwe','AI nkeonwe ejikọtala','AI dị njikere','Kwụpụ AI nkeonwe','Kwụpụ AI nkeonwe ma hichapụ igodo n’ime taabụ nchọgharị a'],
  indonesian:['Hangat','Sepia','Gelap','Kontras tinggi','Mudah dibaca','Redup','Hubungkan AI pribadi','AI pribadi terhubung','AI siap','Putuskan AI pribadi','Putuskan AI pribadi dan hapus kunci dari tab browser ini'],
  italian:['Caldo','Seppia','Scuro','Contrasto elevato','Lettura facile','Attenuato','Connetti IA personale','IA personale connessa','IA pronta','Disconnetti IA personale','Disconnetti l’IA personale ed elimina la chiave da questa scheda del browser'],
  japanese:['暖色','セピア','ダーク','高コントラスト','読みやすい','薄暗い','個人 AI に接続','個人 AI 接続済み','AI の準備完了','個人 AI を切断','個人 AI を切断して、このブラウザタブからキーを削除'],
  kannada:['ಬೆಚ್ಚಗೆ','ಸೆಪಿಯಾ','ಗಾಢ','ಹೆಚ್ಚಿನ ಕಾಂಟ್ರಾಸ್ಟ್','ಸುಲಭ ಓದು','ಮಂದ','ವೈಯಕ್ತಿಕ AI ಸಂಪರ್ಕಿಸಿ','ವೈಯಕ್ತಿಕ AI ಸಂಪರ್ಕಗೊಂಡಿದೆ','AI ಸಿದ್ಧವಾಗಿದೆ','ವೈಯಕ್ತಿಕ AI ಸಂಪರ್ಕ ಕಡಿತಗೊಳಿಸಿ','ವೈಯಕ್ತಿಕ AI ಸಂಪರ್ಕ ಕಡಿತಗೊಳಿಸಿ ಮತ್ತು ಈ ಬ್ರೌಸರ್ ಟ್ಯಾಬ್‌ನಿಂದ ಕೀ ಅಳಿಸಿ'],
  karen:['နွေးထွေး','Sepia','အမှောင်','မြင့်မားသော Contrast','လွယ်ကူဖတ်ရှု','မှိန်','ကိုယ်ပိုင် AI ချိတ်ဆက်ပါ','ကိုယ်ပိုင် AI ချိတ်ဆက်ပြီး','AI အသင့်ဖြစ်သည်','ကိုယ်ပိုင် AI ချိတ်ဆက်မှု ဖြုတ်ပါ','ကိုယ်ပိုင် AI ချိတ်ဆက်မှုဖြုတ်ပြီး ဤဘရောက်ဇာ tab မှ သော့ကို ဖျက်ပါ'],
  khmer:['ក្តៅ','សេពីយ៉ា','ងងឹត','កម្រិតពណ៌ខ្ពស់','អានងាយ','ស្រអាប់','ភ្ជាប់ AI ផ្ទាល់ខ្លួន','AI ផ្ទាល់ខ្លួនបានភ្ជាប់','AI រួចរាល់','ផ្តាច់ AI ផ្ទាល់ខ្លួន','ផ្តាច់ AI ផ្ទាល់ខ្លួន ហើយលុបកូនសោពីផ្ទាំងកម្មវិធីរុករកនេះ'],
  kinyarwanda:['Bishyushye','Sepia','Umwijima','Itandukaniro rikomeye','Gusoma byoroshye','Byijimye','Huza AI yawe bwite','AI yawe bwite yahujwe','AI iriteguye','Hagarika AI yawe bwite','Hagarika AI yawe bwite kandi usibe urufunguzo muri iyi tab ya browser'],
  kirundi:['Bishyushye','Sepia','Umwijima','Itandukaniro rikomeye','Gusoma vyoroshe','Byijimye','Huza AI yawe bwite','AI yawe bwite yarahujwe','AI iriteguye','Hagarika AI yawe bwite','Hagarika AI yawe bwite kandi usibe urufunguzo muri iyi tab ya browser'],
  korean:['따뜻한 색','세피아','어두운 색','고대비','읽기 편함','어둡게','개인 AI 연결','개인 AI 연결됨','AI 준비됨','개인 AI 연결 해제','개인 AI 연결을 해제하고 이 브라우저 탭에서 키 삭제'],
  lao:['ອົບອຸ່ນ','Sepia','ມືດ','ຄວາມຕ່າງສູງ','ອ່ານງ່າຍ','ມືດລົງ','ເຊື່ອມຕໍ່ AI ສ່ວນຕົວ','AI ສ່ວນຕົວເຊື່ອມຕໍ່ແລ້ວ','AI ພ້ອມແລ້ວ','ຕັດການເຊື່ອມຕໍ່ AI ສ່ວນຕົວ','ຕັດການເຊື່ອມຕໍ່ AI ສ່ວນຕົວ ແລະລຶບຄີຈາກ browser tab ນີ້'],
  latin:['Calidus','Sepia','Obscūrus','Contrāstus altus','Lectiō facilis','Obscūrātus','AI personale coniunge','AI personale coniunctum','AI parātum','AI personale disiunge','AI personale disiunge et clāvem ex hāc tabulā nāvigātrī dele'],
  lingala:['Molunge','Sepia','Molili','Bokeseni ya likolo','Kotanga na pete','Molili moke','Sangisa AI na yo moko','AI na yo moko esangisami','AI ezali pene','Kata AI na yo moko','Kata AI na yo moko mpe longola fungola na tab ya navigateur oyo'],
  maay_maay:['Diiran','Sepia','Madow','Isbarbardhig sare','Akhris fudud','Daciif','Ku xir AI-gaaga gaarka ah','AI-ga gaarka ah wuu xiran yahay','AI waa diyaar','Ka jar AI-gaaga gaarka ah','Ka jar AI-gaaga gaarka ah oo furaha ka tirtir tab-kan browser-ka'],
  malayalam:['ഊഷ്മളം','സെപിയ','ഇരുണ്ട','ഉയർന്ന കോൺട്രാസ്റ്റ്','എളുപ്പവായന','മങ്ങിയ','വ്യക്തിഗത AI ബന്ധിപ്പിക്കുക','വ്യക്തിഗത AI ബന്ധിപ്പിച്ചു','AI തയ്യാറാണ്','വ്യക്തിഗത AI വിച്ഛേദിക്കുക','വ്യക്തിഗത AI വിച്ഛേദിച്ച് ഈ ബ്രൗസർ ടാബിൽ നിന്ന് കീ ഇല്ലാതാക്കുക'],
  marathi:['उबदार','सेपिया','गडद','उच्च कॉन्ट्रास्ट','सोपे वाचन','फिकट','वैयक्तिक AI जोडा','वैयक्तिक AI जोडले','AI तयार आहे','वैयक्तिक AI डिस्कनेक्ट करा','वैयक्तिक AI डिस्कनेक्ट करून या ब्राउझर टॅबमधून की पुसा'],
  marshallese:['Warm','Sepia','Dark','High Contrast','Easy Read','Dim','Connect personal AI','Personal AI connected','AI ready','Disconnect personal AI','Disconnect personal AI im delete key eo jān browser tab in'],
  nepali:['तातो','सेपिया','गाढा','उच्च कन्ट्रास्ट','सजिलो पठन','धुमिल','व्यक्तिगत AI जडान गर्नुहोस्','व्यक्तिगत AI जडान भयो','AI तयार छ','व्यक्तिगत AI विच्छेद गर्नुहोस्','व्यक्तिगत AI विच्छेद गरी यो ब्राउजर ट्याबबाट कुञ्जी मेटाउनुहोस्'],
  pashto:['تود','سیپیا','تیاره','لوړ تضاد','اسانه لوستل','کم رڼا','شخصي AI وصل کړئ','شخصي AI وصل شو','AI چمتو دی','شخصي AI قطع کړئ','شخصي AI قطع کړئ او له دې براوزر ټب څخه کیلي پاکه کړئ'],
};
const extra={
  igbo:{reading_theme_blue:'Acha anụnụ anụnụ'},
  karen:{reading_theme_default:'မူလ',reading_theme_blue:'အပြာ',reading_theme_green:'အစိမ်း',reading_theme_rose:'နှင်းဆီ',learning_tools_tooltip:'Learning Tools (STEM Lab, SEL Hub, Research Hub, LitLab, PoetTree, StoryForge)',learning_tools_aria:'Learning Tools'},
  kirundi:{reading_theme_blue:'Ubururu',learning_tools_aria:'Learning Tools'},
  lao:{reading_theme_default:'ຄ່າເດີມ',reading_theme_green:'ສີຂຽວ',learning_tools_tooltip:'Learning Tools (STEM Lab, SEL Hub, Research Hub, LitLab, PoetTree, StoryForge)',learning_tools_aria:'Learning Tools'},
  maay_maay:{reading_theme_default:'Asal',reading_theme_green:'Cagaar',learning_tools_tooltip:'Learning Tools (STEM Lab, SEL Hub, Research Hub, LitLab, PoetTree, StoryForge)',learning_tools_aria:'Learning Tools'},
  marshallese:{reading_theme_default:'Default',reading_theme_blue:'Blue',reading_theme_green:'Green',reading_theme_rose:'Rose',learning_tools_tooltip:'Learning Tools (STEM Lab, SEL Hub, Research Hub, LitLab, PoetTree, StoryForge)',learning_tools_aria:'Learning Tools'},
  nepali:{reading_theme_blue:'निलो'},
  pashto:{reading_theme_blue:'آبي'},
};
const out={};for(const [lang,values] of Object.entries(common)){if(values.length!==KEYS.length)throw new Error(lang+' header table length');out[lang]=Object.fromEntries(KEYS.map((k,i)=>[k,values[i]]));Object.assign(out[lang],extra[lang]||{});}module.exports=out;
