const keys = [
  'progress_label', 'progress_not_saved', 'progress_not_saved_exit', 'progress_not_saved_hint',
  'progress_not_saved_short', 'progress_not_saved_title', 'progress_saved', 'progress_saved_at',
  'progress_saved_short', 'progress_saving', 'progress_saving_short',
];
const make = (values) => Object.fromEntries(keys.map((key, index) => [key, values[index]]));

module.exports = {
  french_canadian: make([
    'Progression de la visite guidée', 'La progression n’est pas enregistrée', 'Le mode guidé a été fermé, mais cet appareil n’a pas pu enregistrer votre progression.', 'Le stockage de l’appareil est indisponible. Réessayez l’enregistrement, conservez la leçon comme sauvegarde de projet ou laissez le mode guidé ouvert.',
    'Non enregistrée', 'La progression n’a pas pu être enregistrée', 'Progression guidée enregistrée. Reprenez quand vous voulez depuis la configuration.', 'Enregistrée sur cet appareil à {time}', 'Enregistrée', 'Enregistrement de la progression…', 'Enregistrement',
  ]),
  farsi: make([
    'پیشرفت تور هدایت‌شده', 'پیشرفت ذخیره نشد', 'حالت هدایت‌شده بسته شد، اما این دستگاه نتوانست پیشرفت شما را ذخیره کند.', 'ذخیره‌سازی دستگاه در دسترس نیست. دوباره ذخیره کنید، درس را به‌عنوان پشتیبان پروژه نگه دارید یا حالت هدایت‌شده را باز بگذارید.',
    'ذخیره نشده', 'پیشرفت ذخیره نشد', 'پیشرفت هدایت‌شده ذخیره شد. هر زمان از تنظیمات ادامه دهید.', 'در این دستگاه در {time} ذخیره شد', 'ذخیره شد', 'در حال ذخیرهٔ پیشرفت…', 'در حال ذخیره',
  ]),
  gujarati: make([
    'માર્ગદર્શિત ટૂરની પ્રગતિ', 'પ્રગતિ સાચવાઈ નથી', 'માર્ગદર્શિત મોડ બંધ થયું, પરંતુ આ ઉપકરણ તમારી પ્રગતિ સાચવી શક્યું નથી.', 'ઉપકરણનું સ્ટોરેજ ઉપલબ્ધ નથી. ફરી સાચવવાનો પ્રયાસ કરો, પાઠને પ્રોજેક્ટ બેકઅપ તરીકે રાખો અથવા માર્ગદર્શિત મોડ ખુલ્લું રાખો.',
    'સાચવેલ નથી', 'પ્રગતિ સાચવી શકાઈ નથી', 'માર્ગદર્શિત પ્રગતિ સાચવાઈ. સેટઅપમાંથી ગમે ત્યારે ફરી શરૂ કરો.', '{time} વાગ્યે આ ઉપકરણમાં સાચવ્યું', 'સાચવ્યું', 'પ્રગતિ સાચવી રહ્યા છીએ…', 'સાચવી રહ્યા છીએ',
  ]),
  kannada: make([
    'ಮಾರ್ಗದರ್ಶಿತ ಪ್ರವಾಸದ ಪ್ರಗತಿ', 'ಪ್ರಗತಿಯನ್ನು ಉಳಿಸಲಾಗಿಲ್ಲ', 'ಮಾರ್ಗದರ್ಶಿತ ಮೋಡ್ ಮುಚ್ಚಲಾಗಿದೆ, ಆದರೆ ಈ ಸಾಧನವು ನಿಮ್ಮ ಪ್ರಗತಿಯನ್ನು ಉಳಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.', 'ಸಾಧನದ ಸಂಗ್ರಹಣೆ ಲಭ್ಯವಿಲ್ಲ. ಉಳಿಸಲು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ, ಪಾಠವನ್ನು ಪ್ರಾಜೆಕ್ಟ್ ಬ್ಯಾಕಪ್ ಆಗಿ ಉಳಿಸಿ ಅಥವಾ ಮಾರ್ಗದರ್ಶಿತ ಮೋಡ್ ಅನ್ನು ತೆರೆಯೇ ಇಡಿ.',
    'ಉಳಿಸಲಾಗಿಲ್ಲ', 'ಪ್ರಗತಿಯನ್ನು ಉಳಿಸಲಾಗಲಿಲ್ಲ', 'ಮಾರ್ಗದರ್ಶಿತ ಪ್ರಗತಿಯನ್ನು ಉಳಿಸಲಾಗಿದೆ. ಸೆಟಪ್‌ನಿಂದ ಯಾವಾಗ ಬೇಕಾದರೂ ಮುಂದುವರಿಯಿರಿ.', '{time}ಕ್ಕೆ ಈ ಸಾಧನದಲ್ಲಿ ಉಳಿಸಲಾಗಿದೆ', 'ಉಳಿಸಲಾಗಿದೆ', 'ಪ್ರಗತಿಯನ್ನು ಉಳಿಸಲಾಗುತ್ತಿದೆ…', 'ಉಳಿಸಲಾಗುತ್ತಿದೆ',
  ]),
  korean: make([
    '가이드 투어 진행률', '진행률이 저장되지 않았습니다', '가이드 모드가 닫혔지만 이 기기에서 진행률을 저장하지 못했습니다.', '기기 저장소를 사용할 수 없습니다. 저장을 다시 시도하거나 수업을 프로젝트 백업으로 보관하거나 가이드 모드를 열어 두세요.',
    '저장되지 않음', '진행률을 저장할 수 없습니다', '가이드 진행률이 저장되었습니다. 설정에서 언제든지 다시 시작할 수 있습니다.', '{time}에 이 기기에 저장됨', '저장됨', '진행률 저장 중…', '저장 중',
  ]),
  lao: make([
    'ຄວາມຄືບໜ້າການນຳທ່ຽວ', 'ບໍ່ໄດ້ບັນທຶກຄວາມຄືບໜ້າ', 'ໂໝດຄຳແນະນຳຖືກປິດ, ແຕ່ອຸປະກອນນີ້ບໍ່ສາມາດບັນທຶກຄວາມຄືບໜ້າຂອງທ່ານໄດ້.', 'ບ່ອນເກັບຂອງອຸປະກອນບໍ່ພ້ອມໃຊ້. ລອງບັນທຶກອີກຄັ້ງ, ເກັບບົດຮຽນເປັນສຳຮອງໂຄງການ, ຫຼື ເປີດໂໝດຄຳແນະນຳໄວ້.',
    'ບໍ່ໄດ້ບັນທຶກ', 'ບໍ່ສາມາດບັນທຶກຄວາມຄືບໜ້າ', 'ບັນທຶກຄວາມຄືບໜ້າແລ້ວ. ສືບຕໍ່ໄດ້ທຸກເວລາຈາກການຕັ້ງຄ່າ.', 'ບັນທຶກໃນອຸປະກອນນີ້ເວລາ {time}', 'ບັນທຶກແລ້ວ', 'ກຳລັງບັນທຶກຄວາມຄືບໜ້າ…', 'ກຳລັງບັນທຶກ',
  ]),
  malayalam: make([
    'മാർഗനിർദ്ദേശ ടൂർ പുരോഗതി', 'പുരോഗതി സംരക്ഷിച്ചിട്ടില്ല', 'മാർഗനിർദ്ദേശ മോഡ് അടച്ചു, പക്ഷേ ഈ ഉപകരണത്തിന് നിങ്ങളുടെ പുരോഗതി സംരക്ഷിക്കാനായില്ല.', 'ഉപകരണ സംഭരണം ലഭ്യമല്ല. വീണ്ടും സംരക്ഷിക്കാൻ ശ്രമിക്കുക, പാഠം പ്രോജക്റ്റ് ബാക്കപ്പായി സൂക്ഷിക്കുക, അല്ലെങ്കിൽ മാർഗനിർദ്ദേശ മോഡ് തുറന്നുവെക്കുക.',
    'സംരക്ഷിച്ചിട്ടില്ല', 'പുരോഗതി സംരക്ഷിക്കാനായില്ല', 'മാർഗനിർദ്ദേശ പുരോഗതി സംരക്ഷിച്ചു. സജ്ജീകരണത്തിൽ നിന്ന് എപ്പോൾ വേണമെങ്കിലും തുടരാം.', '{time}-ന് ഈ ഉപകരണത്തിൽ സംരക്ഷിച്ചു', 'സംരക്ഷിച്ചു', 'പുരോഗതി സംരക്ഷിക്കുന്നു…', 'സംരക്ഷിക്കുന്നു',
  ]),
  marathi: make([
    'मार्गदर्शित टूरची प्रगती', 'प्रगती जतन केलेली नाही', 'मार्गदर्शित मोड बंद झाला, पण या डिव्हाइसला तुमची प्रगती जतन करता आली नाही.', 'डिव्हाइसचे स्टोरेज उपलब्ध नाही. पुन्हा जतन करण्याचा प्रयत्न करा, धडा प्रकल्प बॅकअप म्हणून ठेवा किंवा मार्गदर्शित मोड उघडा ठेवा.',
    'जतन केलेले नाही', 'प्रगती जतन करता आली नाही', 'मार्गदर्शित प्रगती जतन झाली. सेटअपमधून कधीही पुन्हा सुरू करा.', '{time} वाजता या डिव्हाइसवर जतन केले', 'जतन केले', 'प्रगती जतन होत आहे…', 'जतन होत आहे',
  ]),
  nepali: make([
    'निर्देशित टुरको प्रगति', 'प्रगति सुरक्षित गरिएको छैन', 'निर्देशित मोड बन्द भयो, तर यो उपकरणले तपाईंको प्रगति सुरक्षित गर्न सकेन।', 'उपकरणको भण्डारण उपलब्ध छैन। फेरि सुरक्षित गर्ने प्रयास गर्नुहोस्, पाठलाई परियोजना ब्याकअपका रूपमा राख्नुहोस् वा निर्देशित मोड खुला राख्नुहोस्।',
    'सुरक्षित छैन', 'प्रगति सुरक्षित गर्न सकिएन', 'निर्देशित प्रगति सुरक्षित भयो। सेटअपबाट जुनसुकै बेला जारी राख्नुहोस्।', '{time} मा यो उपकरणमा सुरक्षित गरियो', 'सुरक्षित गरियो', 'प्रगति सुरक्षित हुँदैछ…', 'सुरक्षित हुँदैछ',
  ]),
  polish: make([
    'Postęp przewodnika', 'Postęp nie został zapisany', 'Tryb prowadzony został zamknięty, ale to urządzenie nie mogło zapisać postępu.', 'Pamięć urządzenia jest niedostępna. Spróbuj zapisać ponownie, zachowaj lekcję jako kopię projektu lub pozostaw tryb prowadzony otwarty.',
    'Nie zapisano', 'Nie można zapisać postępu', 'Postęp przewodnika zapisano. Wznów w dowolnym momencie z poziomu konfiguracji.', 'Zapisano na tym urządzeniu o {time}', 'Zapisano', 'Zapisywanie postępu…', 'Zapisywanie',
  ]),
  portuguese_angola: make([
    'Progresso da visita guiada', 'O progresso não foi guardado', 'O Modo Guiado foi fechado, mas este dispositivo não conseguiu guardar o seu progresso.', 'O armazenamento do dispositivo está indisponível. Tente guardar novamente, conserve a lição como cópia de segurança do projecto ou mantenha o Modo Guiado aberto.',
    'Não guardado', 'Não foi possível guardar o progresso', 'O progresso guiado foi guardado. Retome a qualquer momento a partir da Configuração.', 'Guardado neste dispositivo às {time}', 'Guardado', 'A guardar o progresso…', 'A guardar',
  ]),
  romanian: make([
    'Progresul turului ghidat', 'Progresul nu a fost salvat', 'Modul ghidat a fost închis, dar acest dispozitiv nu a putut salva progresul.', 'Stocarea dispozitivului nu este disponibilă. Încearcă să salvezi din nou, păstrează lecția ca backup al proiectului sau lasă modul ghidat deschis.',
    'Nesalvat', 'Progresul nu a putut fi salvat', 'Progresul ghidat a fost salvat. Reia oricând din Configurare.', 'Salvat pe acest dispozitiv la {time}', 'Salvat', 'Se salvează progresul…', 'Se salvează',
  ]),
};
