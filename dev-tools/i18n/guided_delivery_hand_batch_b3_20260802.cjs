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
  chin_falam: make([
    'Backup', 'QTI in quiz a her. H5P in compatible content leh target libraries a her. Storybook leh Persona exports cu an resources view ah an um. Homework expiry leh hosting cu deployment danglam in an danglam.', 'Access herhna danglam ah primary lam leh backup lam khat khat hmang rawh.', 'Export leh delivery thil thlan', 'Priority sang bik', 'Access herhnak', 'Assessment', 'Edit theih', 'Interactive', 'Connection a tlawm', 'Recommended', 'Thlan dingah in bawm', 'Zirhternak setting', 'Live class', 'LMS', 'Print / paper', 'Inn ah lak ding', 'A tum zulhin delivery thlang rawh'
  ]),
  chin_hakha: make([
    'Backup', 'QTI in quiz a mamawh. H5P in compatible content le destination libraries a mamawh. Storybook le Persona exports cu resource views anih ah an um. Homework expiry le hosting cu deployment chungah a danglam.', 'Access mamawh a danglam ah primary lam khat le backup lam khat hmang.', 'Export le delivery choices', 'Priority sang bik', 'Accessibilty', 'Assessment', 'Edit theih', 'Interactive', 'Connection tlem', 'Recommended', 'Thlan dingah in bawm', 'Zirhternak setting', 'Live class', 'LMS', 'Print / paper', 'Inn ah lak ding', 'Tum a zirin delivery thlang'
  ]),
  dari: make([
    'پشتیبان', 'QTI به یک آزمون نیاز دارد. H5P به محتوای سازگار و کتابخانه‌های مقصد نیاز دارد. خروجی‌های Storybook و Persona در نمای منابع خود باقی می‌مانند. مهلت تکلیف و میزبانی بسته به استقرار متفاوت است.', 'وقتی نیازهای دسترسی متفاوت است، یک مسیر اصلی و یک پشتیبان استفاده کنید.', 'گزینه‌های خروجی و ارائه', 'بالاترین اولویت', 'دسترس‌پذیری', 'ارزیابی', 'قابل ویرایش', 'تعاملی', 'اتصال ضعیف', 'پیشنهادشده', 'کمک کنید انتخاب کنم', 'تنظیم آموزشی', 'کلاس زنده', 'LMS', 'چاپ / کاغذ', 'برای بردن به خانه', 'ارائه را بر اساس هدف انتخاب کنید'
  ]),
  esperanto: make([
    'Rezerva kopio', 'QTI bezonas kvizon. H5P bezonas kongruan enhavon kaj celbibliotekojn. Eksportoj de Storybook kaj Persona restas en siaj rimedaj vidoj. Limdato de hejmtasko kaj gastigado varias laŭ deplojo.', 'Uzu unu ĉefan vojon kaj unu rezervan vojon kiam la alirbezonoj malsamas.', 'Opcioj pri eksporto kaj livero', 'Plej alta prioritato', 'Alirebleco', 'Takso', 'Redaktebla', 'Interaga', 'Malforta konekto', 'Rekomendita', 'Helpu min elekti', 'Instrua agordo', 'Viva klaso', 'LMS', 'Presi / papero', 'Por kunporti hejmen', 'Elektu liveron laŭ celo'
  ]),
  farsi: make([
    'پشتیبان', 'QTI به یک آزمون نیاز دارد. H5P به محتوای سازگار و کتابخانه‌های مقصد نیاز دارد. خروجی‌های Storybook و Persona در نمای منابع خود باقی می‌مانند. انقضای تکلیف و میزبانی بر اساس استقرار متفاوت است.', 'وقتی نیازهای دسترسی متفاوت هستند، یک مسیر اصلی و یک پشتیبان استفاده کنید.', 'گزینه‌های خروجی و ارائه', 'بالاترین اولویت', 'دسترس‌پذیری', 'ارزیابی', 'قابل ویرایش', 'تعاملی', 'اتصال ضعیف', 'پیشنهادشده', 'برای انتخاب کمکم کن', 'تنظیم آموزشی', 'کلاس زنده', 'LMS', 'چاپ / کاغذ', 'برای بردن به خانه', 'ارائه را بر اساس هدف انتخاب کنید'
  ]),
  french_canadian: make([
    'Sauvegarde', 'QTI a besoin d’un quiz. H5P a besoin de contenu compatible et de bibliothèques de destination. Les exportations Storybook et Persona restent dans leurs vues de ressources. L’expiration des devoirs et l’hébergement varient selon le déploiement.', 'Utilisez une voie principale et une sauvegarde lorsque les besoins d’accès diffèrent.', 'Options d’exportation et de diffusion', 'Priorité maximale', 'Accessibilité', 'Évaluation', 'Modifiable', 'Interactif', 'Connexion limitée', 'Recommandé', 'Aidez-moi à choisir', 'Contexte d’enseignement', 'Cours en direct', 'LMS', 'Impression / papier', 'À rapporter à la maison', 'Choisir la diffusion selon l’objectif'
  ]),
  gujarati: make([
    'બેકઅપ', 'QTI માટે ક્વિઝ જરૂરી છે. H5P માટે સુસંગત સામગ્રી અને લક્ષ્ય લાઇબ્રેરી જરૂરી છે. Storybook અને Persona નિકાસ તેમના સંસાધન દૃશ્યમાં જ રહે છે. હોમવર્કની સમયમર્યાદા અને હોસ્ટિંગ ડિપ્લોયમેન્ટ પ્રમાણે બદલાય છે.', 'ઍક્સેસની જરૂરિયાતો અલગ હોય ત્યારે એક મુખ્ય માર્ગ અને એક બેકઅપ વાપરો.', 'નિકાસ અને ડિલિવરી વિકલ્પો', 'સર્વોચ્ચ પ્રાથમિકતા', 'ઍક્સેસિબિલિટી', 'મૂલ્યાંકન', 'ફેરફાર કરી શકાય તેવું', 'ઇન્ટરેક્ટિવ', 'ઓછી કનેક્ટિવિટી', 'ભલામણ કરેલ', 'પસંદગીમાં મદદ કરો', 'શિક્ષણ સેટિંગ', 'લાઇવ ક્લાસ', 'LMS', 'પ્રિન્ટ / કાગળ', 'ઘરે લઈ જવા માટે', 'હેતુ પ્રમાણે ડિલિવરી પસંદ કરો'
  ]),
  hmong: make([
    'Daim theej tseg', 'QTI xav tau ib qho quiz. H5P xav tau cov ntsiab lus sib raug thiab cov tsev qiv ntawv lub hom phiaj. Cov khoom xa tawm ntawm Storybook thiab Persona tseem nyob hauv lawv qhov kev saib resource. Hnub tas homework thiab hosting txawv raws li deployment.', 'Siv ib txoj kev tseem ceeb thiab ib daim theej tseg thaum cov kev xav tau nkag mus txawv.', 'Cov kev xaiv xa tawm thiab xa mus', 'Qhov tseem ceeb tshaj', 'Kev siv tau rau txhua tus', 'Kev ntsuam xyuas', 'Kho tau', 'Sib cuam tshuam', 'Kev txuas tsawg', 'Pom zoo', 'Pab kuv xaiv', 'Kev teeb tsa qhia', 'Chav kawm nyob', 'LMS', 'Luam / ntawv', 'Nqa mus tsev', 'Xa raws li lub hom phiaj'
  ]),
  igbo: make([
    'Ndabere', 'QTI chọrọ ajụjụ nyocha. H5P chọrọ ọdịnaya dakọtara na ọba akwụkwọ ebe aga. Mbupụ Storybook na Persona na-anọgide n’ime nlele akụrụngwa ha. Oge ngafe ọrụ ụlọ na hosting na-adị iche site na deployment.', 'Jiri ụzọ bụ isi na ndabere mgbe mkpa ịnweta dị iche.', 'Nhọrọ mbupụ na nnyefe', 'Ihe kacha mkpa', 'Ịnweta maka mmadụ niile', 'Ntụle', 'Enwere ike idezi', 'Na-emekọrịta', 'Njikọ adịghị ike', 'A tụrụ aro', 'Nyere m aka ịhọrọ', 'Nhazi nkuzi', 'Klas dị ndụ', 'LMS', 'Bipụta / akwụkwọ', 'Maka iburu ụlọ', 'Họrọ nnyefe dabere na ebumnuche'
  ]),
  kannada: make([
    'ಬ್ಯಾಕಪ್', 'QTIಗೆ ಕ್ವಿಜ್ ಅಗತ್ಯವಿದೆ. H5Pಗೆ ಹೊಂದಾಣಿಕೆಯ ವಿಷಯ ಮತ್ತು ಗುರಿ ಲೈಬ್ರರಿಗಳು ಅಗತ್ಯವಿವೆ. Storybook ಮತ್ತು Persona ರಫ್ತುಗಳು ಅವುಗಳ ಸಂಪನ್ಮೂಲ ವೀಕ್ಷಣೆಯಲ್ಲೇ ಉಳಿಯುತ್ತವೆ. ಗೃಹಕಾರ್ಯದ ಅವಧಿ ಮತ್ತು ಹೋಸ್ಟಿಂಗ್ ಡಿಪ್ಲಾಯ್‌ಮೆಂಟ್‌ಗನುಸಾರ ಬದಲಾಗುತ್ತವೆ.', 'ಪ್ರವೇಶದ ಅಗತ್ಯಗಳು ಬೇರೆಬೇರೆ ಇದ್ದಾಗ ಒಂದು ಮುಖ್ಯ ಮಾರ್ಗ ಮತ್ತು ಒಂದು ಬ್ಯಾಕಪ್ ಬಳಸಿ.', 'ರಫ್ತು ಮತ್ತು ವಿತರಣೆ ಆಯ್ಕೆಗಳು', 'ಅತ್ಯುನ್ನತ ಆದ್ಯತೆ', 'ಪ್ರವೇಶಸಾಧ್ಯತೆ', 'ಮೌಲ್ಯಮಾಪನ', 'ತಿದ್ದುಪಡಿ ಮಾಡಬಹುದಾದ', 'ಸಂವಾದಾತ್ಮಕ', 'ಕಡಿಮೆ ಸಂಪರ್ಕ', 'ಶಿಫಾರಸು ಮಾಡಲಾಗಿದೆ', 'ಆಯ್ಕೆ ಮಾಡಲು ಸಹಾಯ ಮಾಡಿ', 'ಬೋಧನಾ ಸೆಟ್ಟಿಂಗ್', 'ಲೈವ್ ತರಗತಿ', 'LMS', 'ಮುದ್ರಣ / ಕಾಗದ', 'ಮನೆಗೆ ತೆಗೆದುಕೊಂಡು ಹೋಗಲು', 'ಉದ್ದೇಶದಂತೆ ವಿತರಣೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ'
  ]),
  karen: make([
    'Backup', 'QTI htee quiz ta htee. H5P htee content leh library ma a thok a htee. Storybook leh Persona export cu resource view ah an um. Homework expiry leh hosting cu deployment in a danglam.', 'Access mamawh a danglam ah primary lam khat leh backup lam khat hmang.', 'Export leh pekhnak thil thlan', 'Priority sang bik', 'Accessibilty', 'Assessment', 'Edit theih', 'Interactive', 'Connection tlem', 'Recommended', 'Thlan dingah in bawm', 'Zirhternak setting', 'Live class', 'LMS', 'Print / paper', 'Inn ah lak ding', 'Tum a zirin pekhnak thlang'
  ]),
  khmer: make([
    'ការបម្រុងទុក', 'QTI ត្រូវការកម្រងសំណួរ។ H5P ត្រូវការមាតិកាដែលត្រូវគ្នា និងបណ្ណាល័យគោលដៅ។ ការនាំចេញពី Storybook និង Persona នៅតែស្ថិតក្នុងទិដ្ឋភាពធនធានរបស់វា។ កាលកំណត់កិច្ចការផ្ទះ និងការបង្ហោះខុសគ្នាតាមការដាក់ឱ្យប្រើ។', 'ប្រើផ្លូវចម្បងមួយ និងការបម្រុងទុកមួយ នៅពេលតម្រូវការចូលប្រើខុសគ្នា។', 'ជម្រើសនាំចេញ និងការចែកចាយ', 'អាទិភាពខ្ពស់បំផុត', 'ភាពងាយស្រួលប្រើ', 'ការវាយតម្លៃ', 'អាចកែបាន', 'អន្តរកម្ម', 'ការតភ្ជាប់ទាប', 'បានណែនាំ', 'ជួយខ្ញុំជ្រើសរើស', 'ការកំណត់ការបង្រៀន', 'ថ្នាក់ផ្ទាល់', 'LMS', 'បោះពុម្ព / ក្រដាស', 'យកទៅផ្ទះ', 'ជ្រើសរើសការចែកចាយតាមគោលបំណង'
  ]),
  kinyarwanda: make([
    'Ububiko bw’inyongera', 'QTI ikenera ikizamini. H5P ikenera ibikubiyemo bihuye n’amasomero agenewe. Ibyoherezwa muri Storybook na Persona biguma mu byo kureba by’ibikoresho byabyo. Igihe umukoro urangirira n’hosting biratandukana bitewe n’uko byashyizwe ahagaragara.', 'Koresha inzira nyamukuru imwe n’ububiko bw’inyongera igihe ibikenewe mu kugera bitandukanye.', 'Amahitamo yo kohereza no gutanga', 'Icyihutirwa kurusha ibindi', 'Kugerwaho na bose', 'Isuzuma', 'Bihindurwa', 'Bikorana', 'Umuyoboro muke', 'Byasabwe', 'Mfasha guhitamo', 'Imiterere yo kwigisha', 'Isomo rikorwa ako kanya', 'LMS', 'Gucapa / impapuro', 'Gutahana', 'Hitamo itangwa ukurikije intego'
  ])
};
