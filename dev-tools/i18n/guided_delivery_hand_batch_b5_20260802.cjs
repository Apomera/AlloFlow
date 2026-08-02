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
  portuguese_portugal: make([
    'Cópia de segurança', 'O QTI precisa de um questionário. O H5P precisa de conteúdo compatível e bibliotecas de destino. As exportações do Storybook e da Persona permanecem nas respectivas vistas de recursos. O prazo dos trabalhos de casa e o alojamento variam consoante a implementação.', 'Utilize uma via principal e uma cópia de segurança quando as necessidades de acesso forem diferentes.', 'Opções de exportação e entrega', 'Prioridade máxima', 'Acessibilidade', 'Avaliação', 'Editável', 'Interactivo', 'Conectividade reduzida', 'Recomendado', 'Ajude-me a escolher', 'Contexto de ensino', 'Aula em directo', 'LMS', 'Impressão / papel', 'Para levar para casa', 'Escolha a entrega conforme o objectivo'
  ]),
  punjabi: make([
    'ਬੈਕਅੱਪ', 'QTI ਲਈ ਕਵਿਜ਼ ਦੀ ਲੋੜ ਹੁੰਦੀ ਹੈ। H5P ਲਈ ਅਨੁਕੂਲ ਸਮੱਗਰੀ ਅਤੇ ਮੰਜ਼ਿਲ ਲਾਇਬ੍ਰੇਰੀਆਂ ਦੀ ਲੋੜ ਹੁੰਦੀ ਹੈ। Storybook ਅਤੇ Persona ਦੇ ਨਿਰਯਾਤ ਆਪਣੇ ਸਰੋਤ ਦ੍ਰਿਸ਼ ਵਿੱਚ ਰਹਿੰਦੇ ਹਨ। ਹੋਮਵਰਕ ਦੀ ਮਿਆਦ ਅਤੇ ਹੋਸਟਿੰਗ ਡਿਪਲੌਇਮੈਂਟ ਅਨੁਸਾਰ ਬਦਲਦੇ ਹਨ।', 'ਜਦੋਂ ਪਹੁੰਚ ਦੀਆਂ ਲੋੜਾਂ ਵੱਖਰੀਆਂ ਹੋਣ ਤਾਂ ਇੱਕ ਮੁੱਖ ਰਸਤਾ ਅਤੇ ਇੱਕ ਬੈਕਅੱਪ ਵਰਤੋ।', 'ਨਿਰਯਾਤ ਅਤੇ ਡਿਲੀਵਰੀ ਵਿਕਲਪ', 'ਸਭ ਤੋਂ ਉੱਚੀ ਤਰਜੀਹ', 'ਪਹੁੰਚਯੋਗਤਾ', 'ਮੁਲਾਂਕਣ', 'ਸੋਧਯੋਗ', 'ਇੰਟਰਐਕਟਿਵ', 'ਘੱਟ ਕਨੈਕਸ਼ਨ', 'ਸਿਫ਼ਾਰਸ਼ੀ', 'ਚੁਣਨ ਵਿੱਚ ਮੇਰੀ ਮਦਦ ਕਰੋ', 'ਅਧਿਆਪਨ ਸੈਟਿੰਗ', 'ਲਾਈਵ ਕਲਾਸ', 'LMS', 'ਪ੍ਰਿੰਟ / ਕਾਗਜ਼', 'ਘਰ ਲੈ ਜਾਣ ਲਈ', 'ਉਦੇਸ਼ ਅਨੁਸਾਰ ਡਿਲੀਵਰੀ ਚੁਣੋ'
  ]),
  romanian: make([
    'Copie de rezervă', 'QTI are nevoie de un chestionar. H5P are nevoie de conținut compatibil și biblioteci de destinație. Exporturile Storybook și Persona rămân în vizualizările propriilor resurse. Expirarea temelor și găzduirea diferă în funcție de implementare.', 'Folosiți o cale principală și o copie de rezervă atunci când nevoile de acces diferă.', 'Opțiuni de export și livrare', 'Prioritate maximă', 'Accesibilitate', 'Evaluare', 'Editabil', 'Interactiv', 'Conexiune slabă', 'Recomandat', 'Ajută-mă să aleg', 'Setare pentru predare', 'Clasă live', 'LMS', 'Tipărire / hârtie', 'De luat acasă', 'Alegeți livrarea în funcție de scop'
  ]),
  somali: make([
    'Kaydin', 'QTI wuxuu u baahan yahay imtixaan. H5P wuxuu u baahan yahay nuxur ku habboon iyo maktabado loo socdo. Dhoofinta Storybook iyo Persona waxay ku sii jiraan muuqaalka kheyraadkooda. Dhicitaanka shaqada guriga iyo martigelintu way kala duwanaadaan iyadoo ku xiran hawlgelinta.', 'Isticmaal waddo weyn iyo kayd marka baahiyaha gelitaanka ay kala duwan yihiin.', 'Ikhtiyaarrada dhoofinta iyo gaarsiinta', 'Mudnaanta ugu sarreysa', 'Helitaan', 'Qiimayn', 'La tafatiri karo', 'Isdhexgal', 'Xiriir hoose', 'La taliyay', 'I caawi inaan doorto', 'Dejinta waxbaridda', 'Fasal toos ah', 'LMS', 'Daabac / warqad', 'Guriga u qaado', 'Gaarsiinta ku dooro ujeeddo'
  ]),
  spanish_castilian: make([
    'Copia de seguridad', 'QTI necesita un cuestionario. H5P necesita contenido compatible y bibliotecas de destino. Las exportaciones de Storybook y Persona permanecen en sus vistas de recursos. La caducidad de los deberes y el alojamiento varían según el despliegue.', 'Usa una vía principal y una copia de seguridad cuando las necesidades de acceso sean distintas.', 'Opciones de exportación y entrega', 'Máxima prioridad', 'Accesibilidad', 'Evaluación', 'Editable', 'Interactivo', 'Conectividad baja', 'Recomendado', 'Ayúdame a elegir', 'Configuración docente', 'Clase en directo', 'LMS', 'Imprimir / papel', 'Para llevar a casa', 'Elige la entrega según el objetivo'
  ]),
  spanish_latin_america: make([
    'Respaldo', 'QTI necesita un cuestionario. H5P necesita contenido compatible y bibliotecas de destino. Las exportaciones de Storybook y Persona permanecen en sus vistas de recursos. El vencimiento de la tarea y el alojamiento varían según el despliegue.', 'Usa una ruta principal y un respaldo cuando las necesidades de acceso sean diferentes.', 'Opciones de exportación y entrega', 'Máxima prioridad', 'Accesibilidad', 'Evaluación', 'Editable', 'Interactivo', 'Conectividad baja', 'Recomendado', 'Ayúdame a elegir', 'Configuración de enseñanza', 'Clase en vivo', 'LMS', 'Imprimir / papel', 'Para llevar a casa', 'Elige la entrega según el propósito'
  ]),
  tamil: make([
    'காப்புப்பிரதி', 'QTIக்கு ஒரு வினாடி வினா தேவை. H5Pக்கு இணக்கமான உள்ளடக்கமும் இலக்கு நூலகங்களும் தேவை. Storybook மற்றும் Persona ஏற்றுமதிகள் அவற்றின் வளக் காட்சிகளிலேயே இருக்கும். வீட்டுப்பாட காலாவதியும் ஹோஸ்டிங்கும் பயன்படுத்தும் முறையைப் பொறுத்து மாறும்.', 'அணுகல் தேவைகள் மாறுபட்டால் ஒரு முதன்மை வழியையும் ஒரு காப்புப்பிரதியையும் பயன்படுத்துங்கள்.', 'ஏற்றுமதி மற்றும் வழங்கல் விருப்பங்கள்', 'மிக உயர்ந்த முன்னுரிமை', 'அணுகல்தன்மை', 'மதிப்பீடு', 'திருத்தக்கூடியது', 'ஊடாடும்', 'குறைந்த இணைப்பு', 'பரிந்துரைக்கப்பட்டது', 'தேர்வு செய்ய எனக்கு உதவுங்கள்', 'கற்பித்தல் அமைப்பு', 'நேரடி வகுப்பு', 'LMS', 'அச்சு / காகிதம்', 'வீட்டிற்கு எடுத்துச் செல்ல', 'நோக்கத்தின் அடிப்படையில் வழங்கலைத் தேர்ந்தெடுக்கவும்'
  ]),
  telugu: make([
    'బ్యాకప్', 'QTIకి క్విజ్ అవసరం. H5Pకి అనుకూలమైన కంటెంట్ మరియు గమ్య లైబ్రరీలు అవసరం. Storybook మరియు Persona ఎగుమతులు వాటి వనరుల వీక్షణలోనే ఉంటాయి. హోంవర్క్ గడువు మరియు హోస్టింగ్ డిప్లాయ్‌మెంట్‌ను బట్టి మారుతాయి.', 'యాక్సెస్ అవసరాలు వేరుగా ఉన్నప్పుడు ఒక ప్రధాన మార్గం మరియు ఒక బ్యాకప్‌ను ఉపయోగించండి.', 'ఎగుమతి మరియు డెలివరీ ఎంపికలు', 'అత్యధిక ప్రాధాన్యత', 'అందుబాటు', 'మూల్యాంకనం', 'సవరించగలిగేది', 'ఇంటరాక్టివ్', 'తక్కువ కనెక్టివిటీ', 'సిఫార్సు చేయబడింది', 'ఎంచుకోవడంలో నాకు సహాయం చేయండి', 'బోధనా సెట్టింగ్', 'లైవ్ తరగతి', 'LMS', 'ప్రింట్ / కాగితం', 'ఇంటికి తీసుకెళ్లడానికి', 'లక్ష్యాన్ని బట్టి డెలివరీని ఎంచుకోండి'
  ]),
  thai: make([
    'สำรองข้อมูล', 'QTI ต้องมีแบบทดสอบ H5P ต้องมีเนื้อหาที่เข้ากันได้และไลบรารีปลายทาง การส่งออกของ Storybook และ Persona จะยังอยู่ในมุมมองทรัพยากรของตนเอง วันหมดอายุของการบ้านและโฮสติ้งแตกต่างกันตามการติดตั้งใช้งาน', 'ใช้เส้นทางหลักหนึ่งเส้นทางและข้อมูลสำรองหนึ่งชุดเมื่อความต้องการด้านการเข้าถึงแตกต่างกัน', 'ตัวเลือกการส่งออกและการส่งมอบ', 'ความสำคัญสูงสุด', 'การเข้าถึง', 'การประเมิน', 'แก้ไขได้', 'โต้ตอบได้', 'การเชื่อมต่อต่ำ', 'แนะนำ', 'ช่วยฉันเลือก', 'การตั้งค่าการสอน', 'ชั้นเรียนสด', 'LMS', 'พิมพ์ / กระดาษ', 'นำกลับบ้าน', 'เลือกการส่งมอบตามวัตถุประสงค์'
  ]),
  tigrinya: make([
    'መተካእታ ቅዳሕ', 'QTI ፈተና የድልዮ። H5P ዝሰማማዕ ትሕዝቶን ናይ መዓልቲ ቤተ-መጻሕፍትን የድልዮ። ምውጻእ Storybookን Personaን ኣብ ናይ ሃብቲ ርእይቶኦም ይተርፍ። ግዜ ምውዳእ ዕዮ ገዛን hostingን ከከም deployment ይፈላለ።', 'ናይ ምእታው ድሌታት እንተተፈላለዩ፣ ሓደ ቀንዲ መንገዲን ሓደ መተካእታን ተጠቐም።', 'ኣማራጺታት ምውጻእን ምቕራብን', 'ዝለዓለ ቀዳምነት', 'ተበጻሕነት', 'ግምገማ', 'ክትእርም ዝከኣል', 'ተሳታፊ', 'ትሑት ርክብ', 'ዝተመከረ', 'ክመርጽ ሓግዙኒ', 'ናይ ምምሃር ምድላው', 'ቀጥታዊ ክፍሊ', 'LMS', 'ምሕታም / ወረቐት', 'ናብ ገዛ ንምውሳድ', 'ብመሰረት ዕላማ ምቕራብ ምረጽ'
  ]),
  turkish: make([
    'Yedek', 'QTI bir test gerektirir. H5P uyumlu içerik ve hedef kitaplıklar gerektirir. Storybook ve Persona dışa aktarımları kendi kaynak görünümlerinde kalır. Ödevin süresi ve barındırma dağıtıma göre değişir.', 'Erişim gereksinimleri farklı olduğunda birincil yol ve yedek yol kullanın.', 'Dışa aktarma ve teslim seçenekleri', 'En yüksek öncelik', 'Erişilebilirlik', 'Değerlendirme', 'Düzenlenebilir', 'Etkileşimli', 'Düşük bağlantı', 'Önerilen', 'Seçmeme yardım et', 'Öğretim ayarı', 'Canlı ders', 'LMS', 'Yazdır / kâğıt', 'Eve götürmek için', 'Teslimi amaca göre seçin'
  ]),
  ukrainian: make([
    'Резервна копія', 'QTI потребує тесту. H5P потребує сумісного вмісту та цільових бібліотек. Експорти Storybook і Persona залишаються у своїх поданнях ресурсів. Термін виконання домашньої роботи та хостинг залежать від розгортання.', 'Коли потреби доступу різняться, використовуйте один основний шлях і одну резервну копію.', 'Параметри експорту й доставки', 'Найвищий пріоритет', 'Доступність', 'Оцінювання', 'Редагований', 'Інтерактивний', 'Низьке з’єднання', 'Рекомендовано', 'Допоможіть мені вибрати', 'Налаштування викладання', 'Живий урок', 'LMS', 'Друк / папір', 'Взяти додому', 'Виберіть доставку за метою'
  ]),
  urdu: make([
    'بیک اپ', 'QTI کو ایک کوئز درکار ہے۔ H5P کو ہم آہنگ مواد اور ہدف لائبریریاں درکار ہیں۔ Storybook اور Persona کے ایکسپورٹ اپنے وسائل کے منظر میں رہتے ہیں۔ ہوم ورک کی میعاد اور ہوسٹنگ تعیناتی کے مطابق مختلف ہوتی ہے۔', 'جب رسائی کی ضروریات مختلف ہوں تو ایک بنیادی راستہ اور ایک بیک اپ استعمال کریں۔', 'ایکسپورٹ اور ترسیل کے اختیارات', 'سب سے زیادہ ترجیح', 'رسائی پذیری', 'جائزہ', 'قابل تدوین', 'تعامل پذیر', 'کمزور کنکشن', 'تجویز کردہ', 'انتخاب میں میری مدد کریں', 'تدریسی ترتیب', 'براہ راست کلاس', 'LMS', 'پرنٹ / کاغذ', 'گھر لے جانے کے لیے', 'مقصد کے مطابق ترسیل منتخب کریں'
  ]),
  yoruba: make([
    'Àfihàn àfipamọ́', 'QTI nílò ìdánwò. H5P nílò àkóónú tó bá mu àti àwọn ìkàwé ibi-afẹ́. Àwọn ohun tí Storybook àti Persona ń gbé jáde wà nínú àwòrán àwọn ohun èlò wọn. Ìparí iṣẹ́ ilé àti ìgbélejò yàtọ̀ gẹ́gẹ́ bí ìfọwọ́sowọ́pọ̀.', 'Lo ọ̀nà pàtàkì kan àti àfipamọ́ kan nígbà tí àwọn àìní ìwọlé bá yàtọ̀.', 'Àwọn àṣàyàn gbígbé jáde àti fífi ránṣẹ́', 'Àkọ́kọ́ jùlọ', 'Ìrọ̀rùn ìwọlé', 'Ìdánwò', 'A lè ṣàtúnṣe', 'Ìbáṣepọ̀', 'Ìsopọ̀ kékeré', 'A dámọ̀ràn', 'Ràn mí lọ́wọ́ láti yan', 'Ètò kíkọ́ni', 'Kíláàsì tààrà', 'LMS', 'Tẹ̀wé / bébà', 'Láti mú lọ sílé', 'Yan fífi ránṣẹ́ gẹ́gẹ́ bí ète'
  ])
};
