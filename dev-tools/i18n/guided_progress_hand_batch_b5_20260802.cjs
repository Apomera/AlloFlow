const keys = [
  'progress_label', 'progress_not_saved', 'progress_not_saved_exit', 'progress_not_saved_hint',
  'progress_not_saved_short', 'progress_not_saved_title', 'progress_saved', 'progress_saved_at',
  'progress_saved_short', 'progress_saving', 'progress_saving_short',
];
const make = (values) => Object.fromEntries(keys.map((key, index) => [key, values[index]]));

module.exports = {
  pashto: make([
    'د لارښود سفر پرمختګ', 'پرمختګ خوندي نه شو', 'لارښود حالت وتړل شو، خو دې وسیلې ستاسو پرمختګ نه شو خوندي کولی.', 'د وسیلې زېرمه د کار وړ نه ده. بیا د خوندي کولو هڅه وکړئ، درس د پروژې د شاتړ په توګه وساتئ، یا لارښود حالت پرانیستی پرېږدئ.',
    'خوندي نه شو', 'پرمختګ خوندي کېدای نه شو', 'لارښود پرمختګ خوندي شو. هر وخت له تنظیماتو څخه دوام ورکړئ.', 'په دې وسیله کې په {time} خوندي شو', 'خوندي شو', 'پرمختګ خوندي کېږي…', 'خوندي کېږي',
  ]),
  portuguese_portugal: make([
    'Progresso da visita guiada', 'O progresso não foi guardado', 'O Modo Guiado foi fechado, mas este dispositivo não conseguiu guardar o seu progresso.', 'O armazenamento do dispositivo está indisponível. Tente guardar novamente, conserve a lição como cópia de segurança do projecto ou mantenha o Modo Guiado aberto.',
    'Não guardado', 'Não foi possível guardar o progresso', 'O progresso guiado foi guardado. Retome a qualquer momento a partir da Configuração.', 'Guardado neste dispositivo às {time}', 'Guardado', 'A guardar o progresso…', 'A guardar',
  ]),
  punjabi: make([
    'ਮਾਰਗਦਰਸ਼ਿਤ ਟੂਰ ਦੀ ਤਰੱਕੀ', 'ਤਰੱਕੀ ਸੁਰੱਖਿਅਤ ਨਹੀਂ ਹੋਈ', 'ਮਾਰਗਦਰਸ਼ਿਤ ਮੋਡ ਬੰਦ ਹੋ ਗਿਆ, ਪਰ ਇਹ ਡਿਵਾਈਸ ਤੁਹਾਡੀ ਤਰੱਕੀ ਸੁਰੱਖਿਅਤ ਨਹੀਂ ਕਰ ਸਕਿਆ।', 'ਡਿਵਾਈਸ ਦਾ ਸਟੋਰੇਜ ਉਪਲਬਧ ਨਹੀਂ ਹੈ। ਮੁੜ ਸੇਵ ਕਰਨ ਦੀ ਕੋਸ਼ਿਸ਼ ਕਰੋ, ਪਾਠ ਨੂੰ ਪ੍ਰੋਜੈਕਟ ਬੈਕਅੱਪ ਵਜੋਂ ਰੱਖੋ ਜਾਂ ਮਾਰਗਦਰਸ਼ਿਤ ਮੋਡ ਖੁੱਲ੍ਹਾ ਰੱਖੋ।',
    'ਸੁਰੱਖਿਅਤ ਨਹੀਂ', 'ਤਰੱਕੀ ਸੁਰੱਖਿਅਤ ਨਹੀਂ ਕੀਤੀ ਜਾ ਸਕੀ', 'ਮਾਰਗਦਰਸ਼ਿਤ ਤਰੱਕੀ ਸੁਰੱਖਿਅਤ ਹੋ ਗਈ। ਸੈਟਅਪ ਤੋਂ ਕਿਸੇ ਵੀ ਸਮੇਂ ਜਾਰੀ ਰੱਖੋ।', '{time} ਤੇ ਇਸ ਡਿਵਾਈਸ ਵਿੱਚ ਸੁਰੱਖਿਅਤ ਕੀਤਾ', 'ਸੁਰੱਖਿਅਤ', 'ਤਰੱਕੀ ਸੁਰੱਖਿਅਤ ਕੀਤੀ ਜਾ ਰਹੀ ਹੈ…', 'ਸੁਰੱਖਿਅਤ ਕੀਤਾ ਜਾ ਰਿਹਾ ਹੈ',
  ]),
  somali: make([
    'Horumarka socdaalka la hago', 'Horumarka lama kaydin', 'Habka Hagistu waa la xiray, laakiin qalabkani ma kaydin karin horumarkaaga.', 'Kaydinta qalabku lama heli karo. Mar kale isku day kaydinta, casharka u hay kayd mashruuc, ama Habka Hagidda fur.',
    'Lama kaydin', 'Horumarka lama kaydin karin', 'Horumarka hagidda waa la kaydiyey. Dib uga sii wad Dejinta wakhti kasta.', 'Qalabkan waxaa lagu kaydiyey {time}', 'La kaydiyey', 'Horumarka waa la kaydinayaa…', 'Waa la kaydinayaa',
  ]),
  spanish_castilian: make([
    'Progreso de la visita guiada', 'El progreso no se ha guardado', 'El modo guiado se ha cerrado, pero este dispositivo no ha podido guardar tu progreso.', 'El almacenamiento del dispositivo no está disponible. Vuelve a intentar guardarlo, conserva la lección como copia de seguridad del proyecto o deja abierto el modo guiado.',
    'No guardado', 'No se ha podido guardar el progreso', 'El progreso guiado se ha guardado. Puedes continuar en cualquier momento desde Configuración.', 'Guardado en este dispositivo a las {time}', 'Guardado', 'Guardando el progreso…', 'Guardando',
  ]),
  spanish_latin_america: make([
    'Progreso del recorrido guiado', 'El progreso no se guardó', 'El modo guiado se cerró, pero este dispositivo no pudo guardar tu progreso.', 'El almacenamiento del dispositivo no está disponible. Intenta guardar de nuevo, conserva la lección como respaldo del proyecto o deja abierto el modo guiado.',
    'No guardado', 'No se pudo guardar el progreso', 'El progreso guiado se guardó. Continúa en cualquier momento desde Configuración.', 'Guardado en este dispositivo a las {time}', 'Guardado', 'Guardando el progreso…', 'Guardando',
  ]),
  tamil: make([
    'வழிகாட்டப்பட்ட சுற்றுப்பயண முன்னேற்றம்', 'முன்னேற்றம் சேமிக்கப்படவில்லை', 'வழிகாட்டி பயன்முறை மூடப்பட்டது; இந்தச் சாதனத்தால் உங்கள் முன்னேற்றத்தைச் சேமிக்க முடியவில்லை.', 'சாதனச் சேமிப்பு கிடைக்கவில்லை. மீண்டும் சேமிக்க முயற்சிக்கவும், பாடத்தைத் திட்ட காப்புப்பிரதியாக வைத்திருக்கவும் அல்லது வழிகாட்டி பயன்முறையைத் திறந்து வைக்கவும்.',
    'சேமிக்கப்படவில்லை', 'முன்னேற்றத்தைச் சேமிக்க முடியவில்லை', 'வழிகாட்டப்பட்ட முன்னேற்றம் சேமிக்கப்பட்டது. அமைப்பிலிருந்து எப்போது வேண்டுமானாலும் தொடரலாம்.', '{time} மணிக்கு இந்தச் சாதனத்தில் சேமிக்கப்பட்டது', 'சேமிக்கப்பட்டது', 'முன்னேற்றம் சேமிக்கப்படுகிறது…', 'சேமிக்கப்படுகிறது',
  ]),
  telugu: make([
    'మార్గదర్శక టూర్ పురోగతి', 'పురోగతి సేవ్ కాలేదు', 'మార్గదర్శక మోడ్ మూసివేయబడింది, కానీ ఈ పరికరం మీ పురోగతిని సేవ్ చేయలేకపోయింది.', 'పరికర నిల్వ అందుబాటులో లేదు. మళ్లీ సేవ్ చేయడానికి ప్రయత్నించండి, పాఠాన్ని ప్రాజెక్ట్ బ్యాకప్‌గా ఉంచండి లేదా మార్గదర్శక మోడ్‌ను తెరిచి ఉంచండి.',
    'సేవ్ కాలేదు', 'పురోగతిని సేవ్ చేయలేకపోయాం', 'మార్గదర్శక పురోగతి సేవ్ చేయబడింది. సెటప్ నుంచి ఎప్పుడైనా కొనసాగండి.', '{time}కి ఈ పరికరంలో సేవ్ చేయబడింది', 'సేవ్ చేయబడింది', 'పురోగతిని సేవ్ చేస్తున్నాం…', 'సేవ్ చేస్తున్నాం',
  ]),
  thai: make([
    'ความคืบหน้าของทัวร์แนะนำ', 'ไม่ได้บันทึกความคืบหน้า', 'ปิดโหมดแนะนำแล้ว แต่อุปกรณ์นี้ไม่สามารถบันทึกความคืบหน้าของคุณได้', 'พื้นที่จัดเก็บของอุปกรณ์ไม่พร้อมใช้งาน ลองบันทึกอีกครั้ง เก็บบทเรียนเป็นข้อมูลสำรองของโครงการ หรือเปิดโหมดแนะนำไว้',
    'ไม่ได้บันทึก', 'ไม่สามารถบันทึกความคืบหน้าได้', 'บันทึกความคืบหน้าของโหมดแนะนำแล้ว ดำเนินการต่อได้ทุกเมื่อจากการตั้งค่า', 'บันทึกในอุปกรณ์นี้เมื่อ {time}', 'บันทึกแล้ว', 'กำลังบันทึกความคืบหน้า…', 'กำลังบันทึก',
  ]),
  tigrinya: make([
    'ዕቤት ዝተመርሐ ምብጻሕ', 'ዕቤት ኣይተዓቀበን', 'ዝተመርሐ ሞድ ተዓጽዩ፣ እዚ መሳርሒ ግን ዕቤትካ ከዕቅብ ኣይከኣለን።', 'መቐመጢ ናይ መሳርሒ ኣይርከብን። እንደገና ንምዕቃብ ፈትን፣ ትምህርቲ ከም መተካእታ ፕሮጀክት ዕቀብ፣ ወይ ዝተመርሐ ሞድ ክፉት ግበሮ።',
    'ኣይተዓቀበን', 'ዕቤት ክዕቀብ ኣይከኣለን', 'ዝተመርሐ ዕቤት ተዓቂቡ። ካብ ምድላው ኣብ ዝኾነ ግዜ ቀጽል።', 'ኣብዚ መሳርሒ ኣብ {time} ተዓቂቡ', 'ተዓቂቡ', 'ዕቤት ይዕቀብ ኣሎ…', 'ይዕቀብ ኣሎ',
  ]),
  turkish: make([
    'Yönlendirmeli tur ilerlemesi', 'İlerleme kaydedilmedi', 'Yönlendirmeli Mod kapatıldı ancak bu cihaz ilerlemenizi kaydedemedi.', 'Cihaz depolaması kullanılamıyor. Yeniden kaydetmeyi deneyin, dersi proje yedeği olarak saklayın veya Yönlendirmeli Modu açık bırakın.',
    'Kaydedilmedi', 'İlerleme kaydedilemedi', 'Yönlendirmeli ilerleme kaydedildi. Kurulumdan istediğiniz zaman devam edin.', '{time} tarihinde bu cihaza kaydedildi', 'Kaydedildi', 'İlerleme kaydediliyor…', 'Kaydediliyor',
  ]),
  ukrainian: make([
    'Прогрес керованого туру', 'Прогрес не збережено', 'Керований режим закрито, але цьому пристрою не вдалося зберегти ваш прогрес.', 'Сховище пристрою недоступне. Повторіть збереження, збережіть урок як резервну копію проєкту або залиште керований режим відкритим.',
    'Не збережено', 'Не вдалося зберегти прогрес', 'Керований прогрес збережено. Продовжуйте будь-коли з налаштувань.', 'Збережено на цьому пристрої о {time}', 'Збережено', 'Збереження прогресу…', 'Збереження',
  ]),
  urdu: make([
    'رہنمائی والے ٹور کی پیش رفت', 'پیش رفت محفوظ نہیں ہوئی', 'رہنمائی والا موڈ بند ہو گیا، لیکن یہ ڈیوائس آپ کی پیش رفت محفوظ نہیں کر سکی۔', 'ڈیوائس کا اسٹوریج دستیاب نہیں۔ دوبارہ محفوظ کرنے کی کوشش کریں، سبق کو پروجیکٹ بیک اپ کے طور پر رکھیں، یا رہنمائی والا موڈ کھلا چھوڑیں۔',
    'محفوظ نہیں', 'پیش رفت محفوظ نہیں ہو سکی', 'رہنمائی والی پیش رفت محفوظ ہو گئی۔ سیٹ اپ سے کسی بھی وقت جاری رکھیں۔', '{time} پر اس ڈیوائس میں محفوظ کیا گیا', 'محفوظ', 'پیش رفت محفوظ کی جا رہی ہے…', 'محفوظ کیا جا رہا ہے',
  ]),
  yoruba: make([
    'Ìlọsíwájú ìrìn-àjò tí a ń darí', 'A kò fi ìlọsíwájú pamọ́', 'A ti pa Ìpo Ìtọ́sọ́nà, ṣùgbọ́n ẹ̀rọ yìí kò lè fi ìlọsíwájú rẹ pamọ́.', 'Ìpamọ́ ẹ̀rọ kò sí. Gbìyànjú láti fi pamọ́ lẹ́ẹ̀kan síi, fi ẹ̀kọ́ náà pamọ́ gẹ́gẹ́ bí àfikún iṣẹ́, tàbí jẹ́ kí Ìpo Ìtọ́sọ́nà ṣí.',
    'A kò fi pamọ́', 'A kò lè fi ìlọsíwájú pamọ́', 'A ti fi ìlọsíwájú ìtọ́sọ́nà pamọ́. Tẹ̀síwájú nígbàkigbà láti Ètò.', 'A fi pamọ́ sí ẹ̀rọ yìí ní {time}', 'A ti fi pamọ́', 'A ń fi ìlọsíwájú pamọ́…', 'A ń fi pamọ́',
  ]),
};
