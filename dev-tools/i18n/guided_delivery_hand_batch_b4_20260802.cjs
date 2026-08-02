const keys = [
  'delivery_backup', 'delivery_conditions', 'delivery_hint', 'delivery_options_label',
  'delivery_priority', 'delivery_priority_accessible', 'delivery_priority_assessment',
  'delivery_priority_editable', 'delivery_priority_interactive', 'delivery_priority_offline',
  'delivery_recommended', 'delivery_recommender_title', 'delivery_setting',
  'delivery_setting_live', 'delivery_setting_lms', 'delivery_setting_print',
  'delivery_setting_take_home', 'delivery_title'
];
const make = (values) => Object.fromEntries(keys.map((key, index) => [key, values[index]]));
module.exports = {
  kirundi: make([
    'Ububiko bw’inyongera', 'QTI ikenera ikibazo. H5P ikenera ibiriho bihuye n’amasomero agenewe. Ivyo Storybook na Persona bisohora biguma mu bikoresho vyavyo. Igihe c’umukoro n’ubwakirizi birahinduka bivanye n’ukubishira mu ngiro.', 'Koresha inzira nyamukuru imwe n’ububiko bw’inyongera igihe ivyo kuronka bitandukanye.', 'Uburyo bwo gusohora no gutanga', 'Ico gihambaye cane', 'Kuronka kuri bose', 'Isuzuma', 'Gishobora guhindurwa', 'Gikorana', 'Ukwihuza guke', 'Vyateguwe', 'Mfasha guhitamwo', 'Uburyo bwo kwigisha', 'Icigwa kizima', 'LMS', 'Gucapa / urupapuro', 'Gutahana', 'Hitamwo gutanga bivanye n’intumbero'
  ]),
  korean: make([
    '백업', 'QTI에는 퀴즈가 필요합니다. H5P에는 호환되는 콘텐츠와 대상 라이브러리가 필요합니다. Storybook 및 Persona 내보내기는 각 리소스 보기에서 유지됩니다. 숙제 만료와 호스팅은 배포 방식에 따라 다릅니다.', '접근 요구가 다르면 기본 경로 하나와 백업 하나를 사용하세요.', '내보내기 및 전달 옵션', '최우선', '접근성', '평가', '편집 가능', '대화형', '낮은 연결성', '권장', '선택을 도와주세요', '수업 설정', '실시간 수업', 'LMS', '인쇄 / 종이', '집에 가져가기', '목적에 따라 전달 방식 선택'
  ]),
  lao: make([
    'ສຳຮອງ', 'QTI ຕ້ອງການແບບທົດສອບ. H5P ຕ້ອງການເນື້ອຫາທີ່ເຂົ້າກັນໄດ້ ແລະຫ້ອງສະໝຸດປາຍທາງ. ການສົ່ງອອກ Storybook ແລະ Persona ຍັງຢູ່ໃນມຸມມອງຊັບພະຍາກອນຂອງພວກມັນ. ກຳນົດໝົດອາຍຸວຽກບ້ານ ແລະ hosting ແຕກຕ່າງຕາມການນຳໃຊ້.', 'ໃຊ້ເສັ້ນທາງຫຼັກໜຶ່ງ ແລະສຳຮອງໜຶ່ງ ເມື່ອຄວາມຕ້ອງການເຂົ້າເຖິງຕ່າງກັນ.', 'ຕົວເລືອກສົ່ງອອກ ແລະສົ່ງມອບ', 'ບູລິມະສິດສູງສຸດ', 'ການເຂົ້າເຖິງ', 'ການປະເມີນ', 'ແກ້ໄຂໄດ້', 'ໂຕ້ຕອບໄດ້', 'ການເຊື່ອມຕໍ່ຕ່ຳ', 'ແນະນຳ', 'ຊ່ວຍຂ້ອຍເລືອກ', 'ການຕັ້ງຄ່າການສອນ', 'ຫ້ອງຮຽນສົດ', 'LMS', 'ພິມ / ເຈ້ຍ', 'ເອົາກັບບ້ານ', 'ເລືອກການສົ່ງມອບຕາມຈຸດປະສົງ'
  ]),
  latin: make([
    'Exemplar servatum', 'QTI quiz indiget. H5P contento congruenti bibliothecisque destinatariis indiget. Exportationes Storybook et Persona in suis conspectibus rerum manent. Dies finis operis domestici et hospitium secundum dispositionem variant.', 'Utere una via primaria et uno exemplari servato cum necessitates accessus differunt.', 'Optiones exportationis et traditionis', 'Praecipua prioritas', 'Accessibilitas', 'Aestimatio', 'Emendabile', 'Interactivum', 'Connexio infirma', 'Commendatum', 'Adiuva me eligere', 'Dispositio docendi', 'Classis viva', 'LMS', 'Imprimere / charta', 'Domum auferendum', 'Traditionem secundum propositum elige'
  ]),
  lingala: make([
    'Kopi ya kobomba', 'QTI esengaka quiz. H5P esengaka makambo oyo eyokani mpe babibliothèque ya esika ya kokende. Ba-export ya Storybook mpe Persona etikalaka na bimoniseli ya biloko na yango. Tango ya kosila ya mosala ya ndako mpe hosting ebongwanaka na kotalela déploiement.', 'Salá nzela moko ya liboso mpe kopi moko ya kobomba tango bamposa ya kokɔta ekeseni.', 'Banzela ya kosala export mpe kotinda', 'Liboso mingi', 'Kokɔta mpo na bato nyonso', 'Bomekoli', 'Ekoki kobongisama', 'Ezalaka na boyokani', 'Connexion moke', 'Epesami toli', 'Salisa ngai napona', 'Ndenge ya koteya', 'Kelasi ya bomoi', 'LMS', 'Konyata / lokasa', 'Komema na ndako', 'Poná kotinda na kotalela mokano'
  ]),
  maay_maay: make([
    'Kayd', 'QTI quiz ay u baahan. H5P content is waafaqa iyo libraries-ka meesha loo socdo ay u baahan. Storybook iyo Persona exports waxay ku sii jiraan aragtida resources-kooda. Dhicitaanka shaqada guriga iyo hosting-ku deployment-ka ayay ku kala duwan yihiin.', 'Isticmaal waddo weyn iyo kayd marka baahiyaha gelitaanku kala duwan yihiin.', 'Ikhtiyaarrada dhoofinta iyo gaarsiinta', 'Mudnaanta ugu sarreysa', 'Helitaan', 'Qiimayn', 'La tafatiri karo', 'Isdhexgal', 'Xiriir hoose', 'La taliyay', 'I caawi inaan doorto', 'Dejinta waxbaridda', 'Fasal toos ah', 'LMS', 'Daabac / warqad', 'Guriga u qaado', 'Gaarsiinta ku dooro ujeeddo'
  ]),
  malayalam: make([
    'ബാക്കപ്പ്', 'QTIയ്ക്ക് ഒരു ക്വിസ് ആവശ്യമാണ്. H5Pയ്ക്ക് അനുയോജ്യമായ ഉള്ളടക്കവും ലക്ഷ്യ ലൈബ്രറികളും ആവശ്യമാണ്. Storybook, Persona എക്സ്പോർട്ടുകൾ അവയുടെ റിസോഴ്‌സ് കാഴ്ചയിൽ തന്നെ തുടരും. ഹോംവർക്ക് കാലാവധിയും ഹോസ്റ്റിംഗും ഡിപ്ലോയ്‌മെന്റനുസരിച്ച് മാറും.', 'ആക്‌സസ് ആവശ്യങ്ങൾ വ്യത്യസ്തമായാൽ ഒരു പ്രധാന വഴിയും ഒരു ബാക്കപ്പും ഉപയോഗിക്കുക.', 'എക്സ്പോർട്ട്, ഡെലിവറി ഓപ്ഷനുകൾ', 'ഏറ്റവും ഉയർന്ന മുൻഗണന', 'പ്രവേശനസൗകര്യം', 'മൂല്യനിർണ്ണയം', 'എഡിറ്റ് ചെയ്യാവുന്നത്', 'ഇന്ററാക്ടീവ്', 'കുറഞ്ഞ കണക്റ്റിവിറ്റി', 'ശുപാർശ ചെയ്തത്', 'തിരഞ്ഞെടുക്കാൻ എന്നെ സഹായിക്കുക', 'അധ്യാപന ക്രമീകരണം', 'ലൈവ് ക്ലാസ്', 'LMS', 'പ്രിന്റ് / പേപ്പർ', 'വീട്ടിലേക്ക് കൊണ്ടുപോകാൻ', 'ലക്ഷ്യം അനുസരിച്ച് ഡെലിവറി തിരഞ്ഞെടുക്കുക'
  ]),
  marathi: make([
    'बॅकअप', 'QTI ला क्विझ आवश्यक आहे. H5P ला सुसंगत सामग्री आणि लक्ष्य लायब्ररी आवश्यक आहेत. Storybook आणि Persona निर्यात त्यांच्या संसाधन दृश्यातच राहतात. गृहपाठाची मुदत आणि होस्टिंग डिप्लॉयमेंटनुसार बदलतात.', 'प्रवेशाच्या गरजा वेगळ्या असतील तर एक मुख्य मार्ग आणि एक बॅकअप वापरा.', 'निर्यात आणि वितरण पर्याय', 'सर्वोच्च प्राधान्य', 'प्रवेशयोग्यता', 'मूल्यांकन', 'संपादनयोग्य', 'परस्परसंवादी', 'कमी कनेक्टिव्हिटी', 'शिफारस केलेले', 'निवडण्यात मला मदत करा', 'अध्यापन सेटिंग', 'थेट वर्ग', 'LMS', 'प्रिंट / कागद', 'घरी घेऊन जाण्यासाठी', 'उद्देशानुसार वितरण निवडा'
  ]),
  marshallese: make([
    'Backup', 'QTI ej aikuj juon quiz. H5P ej aikuj content eo ejelok an jorran im libraries in destination. Storybook im Persona exports rej bed wot ilo resource views ko aer. Homework expiry im hosting rej oktak ekkar non deployment.', 'Kōjerbal juon primary path im juon backup ñe access needs rej oktak.', 'Export im delivery options', 'Priority eo elap tata', 'Accessibility', 'Assessment', 'Editable', 'Interactive', 'Connection eo edik', 'Recommended', 'Jipan eok kōmman kōjparok', 'Teaching setting', 'Live class', 'LMS', 'Print / paper', 'Bōk imōj', 'Kōjparok delivery ekkar non men eo kwar kōmman'
  ]),
  nepali: make([
    'ब्याकअप', 'QTI लाई क्विज आवश्यक पर्छ। H5P लाई मिल्दो सामग्री र गन्तव्य पुस्तकालय आवश्यक पर्छ। Storybook र Persona का निर्यातहरू आफ्नै स्रोत दृश्यमा रहन्छन्। गृहकार्यको म्याद र होस्टिङ डिप्लोयमेन्टअनुसार फरक हुन्छन्।', 'पहुँचका आवश्यकता फरक हुँदा एउटा मुख्य बाटो र एउटा ब्याकअप प्रयोग गर्नुहोस्।', 'निर्यात र डेलिभरी विकल्पहरू', 'सबैभन्दा उच्च प्राथमिकता', 'पहुँचयोग्यता', 'मूल्याङ्कन', 'सम्पादन गर्न मिल्ने', 'अन्तरक्रियात्मक', 'कम जडान', 'सिफारिस गरिएको', 'छान्न मलाई सहयोग गर्नुहोस्', 'शिक्षण सेटिङ', 'प्रत्यक्ष कक्षा', 'LMS', 'प्रिन्ट / कागज', 'घर लैजानका लागि', 'उद्देश्यअनुसार डेलिभरी छान्नुहोस्'
  ]),
  pashto: make([
    'شاتړ', 'QTI یوې پوښتنې ته اړتیا لري. H5P له سازګار منځپانګې او هدف کتابتونونو ته اړتیا لري. د Storybook او Persona صادرات په خپلو سرچینو لید کې پاتې کېږي. د کورني کار پای او کوربه‌توب د ځای پر ځای کولو له مخې بدلېږي.', 'کله چې د لاسرسي اړتیاوې توپیر ولري، یوه اصلي لار او یو شاتړ وکاروئ.', 'د صادراتو او رسولو اختیارونه', 'تر ټولو لوړه لومړیتوب', 'لاسرسی', 'ارزونه', 'د سمون وړ', 'متقابل', 'کم اتصال', 'سپارښتل شوی', 'له ما سره په انتخاب کې مرسته وکړئ', 'د تدریس ترتیب', 'ژوندی ټولګی', 'LMS', 'چاپ / کاغذ', 'کور ته وړلو لپاره', 'د موخې له مخې رسونه وټاکئ'
  ]),
  polish: make([
    'Kopia zapasowa', 'QTI wymaga quizu. H5P wymaga zgodnych treści i bibliotek docelowych. Eksporty Storybook i Persona pozostają w widokach swoich zasobów. Termin pracy domowej i hosting różnią się w zależności od wdrożenia.', 'Gdy potrzeby dostępu są różne, użyj jednej głównej ścieżki i jednej kopii zapasowej.', 'Opcje eksportu i dostarczania', 'Najwyższy priorytet', 'Dostępność', 'Ocena', 'Edytowalne', 'Interaktywne', 'Słabe połączenie', 'Zalecane', 'Pomóż mi wybrać', 'Ustawienia nauczania', 'Lekcja na żywo', 'LMS', 'Drukowanie / papier', 'Do zabrania do domu', 'Wybierz dostarczanie według celu'
  ]),
  portuguese_angola: make([
    'Cópia de segurança', 'O QTI precisa de um questionário. O H5P precisa de conteúdo compatível e bibliotecas de destino. As exportações do Storybook e da Persona permanecem nas respectivas vistas de recursos. O prazo do trabalho de casa e o alojamento variam conforme a implementação.', 'Use uma via principal e uma cópia de segurança quando as necessidades de acesso forem diferentes.', 'Opções de exportação e entrega', 'Prioridade máxima', 'Acessibilidade', 'Avaliação', 'Editável', 'Interativo', 'Conectividade reduzida', 'Recomendado', 'Ajude-me a escolher', 'Contexto de ensino', 'Aula em directo', 'LMS', 'Impressão / papel', 'Para levar para casa', 'Escolha a entrega conforme o objectivo'
  ])
};
