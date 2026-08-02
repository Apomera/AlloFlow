const keys = [
  'progress_label', 'progress_not_saved', 'progress_not_saved_exit', 'progress_not_saved_hint',
  'progress_not_saved_short', 'progress_not_saved_title', 'progress_saved', 'progress_saved_at',
  'progress_saved_short', 'progress_saving', 'progress_saving_short',
];
const make = (values) => Object.fromEntries(keys.map((key, index) => [key, values[index]]));

module.exports = {
  acholi: make([
    'Mede pa wot ma gin telo', 'Mede pe ogwoko', 'Mode ma gin telo oloke, ento device man pe twero gwoko mede mamegi.', 'Keno pa device pe tye. Tem gwoko doki, gwok kwan calo backup me project, onyo iwek Mode ma gin telo oyabe.',
    'Pe ogwoko', 'Mede pe onongo twero ogwoko', 'Mede ma gin telo ogwoko. Dok i Setup kare mo keken.', 'Ogwoko i device man i {time}', 'Ogwoko', 'Gwoko mede…', 'Gwoko',
  ]),
  amharic: make([
    'የተመራ ጉብኝት ሂደት', 'ሂደቱ አልተቀመጠም', 'የተመራ ሁነታ ተዘግቷል፣ ነገር ግን ይህ መሣሪያ ሂደትዎን ማስቀመጥ አልቻለም።', 'የመሣሪያው ማከማቻ አይገኝም። ማስቀመጡን እንደገና ይሞክሩ፣ ትምህርቱን እንደ የፕሮጀክት ምትኬ ያስቀምጡ፣ ወይም የተመራ ሁነታን ክፍት ያድርጉ።',
    'አልተቀመጠም', 'ሂደቱ ሊቀመጥ አልቻለም', 'የተመራ ሂደት ተቀምጧል። ከማዋቀር በማንኛውም ጊዜ ይቀጥሉ።', 'በዚህ መሣሪያ ላይ በ {time} ተቀምጧል', 'ተቀምጧል', 'ሂደቱን በማስቀመጥ ላይ…', 'በማስቀመጥ ላይ',
  ]),
  bengali: make([
    'নির্দেশিত ট্যুরের অগ্রগতি', 'অগ্রগতি সেভ হয়নি', 'নির্দেশিত মোড বন্ধ হয়েছে, কিন্তু এই ডিভাইস আপনার অগ্রগতি সেভ করতে পারেনি।', 'ডিভাইসের স্টোরেজ উপলভ্য নয়। আবার সেভ করার চেষ্টা করুন, পাঠটি প্রজেক্ট ব্যাকআপ হিসেবে রাখুন, অথবা নির্দেশিত মোড খোলা রাখুন।',
    'সেভ হয়নি', 'অগ্রগতি সেভ করা যায়নি', 'নির্দেশিত অগ্রগতি সেভ হয়েছে। সেটআপ থেকে যেকোনো সময় আবার শুরু করুন।', '{time}-এ এই ডিভাইসে সেভ হয়েছে', 'সেভ হয়েছে', 'অগ্রগতি সেভ করা হচ্ছে…', 'সেভ করা হচ্ছে',
  ]),
  burmese: make([
    'လမ်းညွှန်ခရီးစဉ် တိုးတက်မှု', 'တိုးတက်မှုကို မသိမ်းဆည်းရသေးပါ', 'လမ်းညွှန်မုဒ် ပိတ်သွားသော်လည်း ဤစက်သည် သင်၏တိုးတက်မှုကို မသိမ်းဆည်းနိုင်ပါ။', 'စက်၏သိုလှောင်မှု မရနိုင်ပါ။ သိမ်းဆည်းမှုကို ထပ်စမ်းပါ၊ သင်ခန်းစာကို ပရောဂျက်အရန်အဖြစ် ထားပါ သို့မဟုတ် လမ်းညွှန်မုဒ်ကို ဖွင့်ထားပါ။',
    'မသိမ်းရသေး', 'တိုးတက်မှုကို မသိမ်းနိုင်ပါ', 'လမ်းညွှန်တိုးတက်မှု သိမ်းဆည်းပြီးပါပြီ။ Setup မှ အချိန်မရွေး ပြန်စနိုင်ပါသည်။', '{time} တွင် ဤစက်၌ သိမ်းဆည်းထားသည်', 'သိမ်းဆည်းပြီး', 'တိုးတက်မှု သိမ်းဆည်းနေသည်…', 'သိမ်းဆည်းနေသည်',
  ]),
  chinese_traditional: make([
    '引導教學進度', '進度未儲存', '引導模式已關閉，但此裝置無法儲存您的進度。', '裝置儲存空間無法使用。請重試儲存、將課程保留為專案備份，或保持引導模式開啟。',
    '未儲存', '無法儲存進度', '引導進度已儲存。隨時可以從設定繼續。', '已於 {time} 儲存到此裝置', '已儲存', '正在儲存進度…', '正在儲存',
  ]),
  dutch: make([
    'Voortgang van de begeleide rondleiding', 'Voortgang niet opgeslagen', 'De begeleide modus is gesloten, maar dit apparaat kon je voortgang niet opslaan.', 'De opslagruimte van het apparaat is niet beschikbaar. Probeer opnieuw op te slaan, bewaar de les als projectback-up of laat de begeleide modus open.',
    'Niet opgeslagen', 'Voortgang kon niet worden opgeslagen', 'Voortgang van de begeleiding opgeslagen. Ga op elk moment verder vanuit Instellen.', 'Op dit apparaat opgeslagen om {time}', 'Opgeslagen', 'Voortgang opslaan…', 'Opslaan',
  ]),
  greek: make([
    'Πρόοδος καθοδηγούμενης περιήγησης', 'Η πρόοδος δεν αποθηκεύτηκε', 'Η καθοδηγούμενη λειτουργία έκλεισε, αλλά αυτή η συσκευή δεν μπόρεσε να αποθηκεύσει την πρόοδό σας.', 'Ο χώρος αποθήκευσης της συσκευής δεν είναι διαθέσιμος. Δοκιμάστε ξανά την αποθήκευση, κρατήστε το μάθημα ως αντίγραφο του έργου ή αφήστε την καθοδηγούμενη λειτουργία ανοιχτή.',
    'Δεν αποθηκεύτηκε', 'Δεν ήταν δυνατή η αποθήκευση της προόδου', 'Η καθοδηγούμενη πρόοδος αποθηκεύτηκε. Συνεχίστε οποιαδήποτε στιγμή από τη Ρύθμιση.', 'Αποθηκεύτηκε σε αυτή τη συσκευή στις {time}', 'Αποθηκεύτηκε', 'Αποθήκευση προόδου…', 'Αποθήκευση',
  ]),
  haitian_creole: make([
    'Pwogrè vizit gide a', 'Pwogrè a pa sove', 'Mòd Gid la fèmen, men aparèy sa a pa t kapab sove pwogrè ou.', 'Depo aparèy la pa disponib. Eseye sove ankò, kenbe leson an kòm yon sovgad pwojè, oswa kite Mòd Gid la louvri.',
    'Pa sove', 'Pwogrè a pa t kapab sove', 'Pwogrè gide a sove. Rekòmanse nenpòt lè nan Konfigirasyon.', 'Sove sou aparèy sa a a {time}', 'Sove', 'Ap sove pwogrè a…', 'Ap sove',
  ]),
  hausa: make([
    'Ci gaban yawon jagora', 'Ba a adana ci gaban ba', 'An rufe Yanayin Jagora, amma wannan na’urar ta kasa adana ci gabanka.', 'Ba a samun ajiyar na’urar. Sake gwada adanawa, ajiye darasin a matsayin madadin aiki, ko bar Yanayin Jagora a buɗe.',
    'Ba a adana ba', 'An kasa adana ci gaban', 'An adana ci gaban jagora. Ci gaba kowane lokaci daga Saitin.', 'An adana a wannan na’ura da ƙarfe {time}', 'An adana', 'Ana adana ci gaba…', 'Ana adanawa',
  ]),
  hebrew: make([
    'התקדמות הסיור המודרך', 'ההתקדמות לא נשמרה', 'המצב המודרך נסגר, אך המכשיר הזה לא הצליח לשמור את ההתקדמות שלך.', 'האחסון במכשיר אינו זמין. נסו לשמור שוב, שמרו את השיעור כגיבוי של הפרויקט, או השאירו את המצב המודרך פתוח.',
    'לא נשמר', 'לא ניתן לשמור את ההתקדמות', 'ההתקדמות המודרכת נשמרה. אפשר להמשיך בכל עת מההגדרות.', 'נשמר במכשיר הזה בשעה {time}', 'נשמר', 'שומר את ההתקדמות…', 'שומר',
  ]),
  indonesian: make([
    'Kemajuan tur terpandu', 'Kemajuan belum disimpan', 'Mode Terpandu ditutup, tetapi perangkat ini tidak dapat menyimpan kemajuan Anda.', 'Penyimpanan perangkat tidak tersedia. Coba simpan lagi, simpan pelajaran sebagai cadangan proyek, atau biarkan Mode Terpandu tetap terbuka.',
    'Belum disimpan', 'Kemajuan tidak dapat disimpan', 'Kemajuan terpandu disimpan. Lanjutkan kapan saja dari Penyiapan.', 'Disimpan di perangkat ini pada {time}', 'Tersimpan', 'Menyimpan kemajuan…', 'Menyimpan',
  ]),
  italian: make([
    'Avanzamento del tour guidato', 'Avanzamento non salvato', 'La modalità guidata è stata chiusa, ma questo dispositivo non ha potuto salvare il tuo avanzamento.', 'Lo spazio di archiviazione del dispositivo non è disponibile. Riprova a salvare, conserva la lezione come backup del progetto oppure lascia aperta la modalità guidata.',
    'Non salvato', 'Impossibile salvare l’avanzamento', 'Avanzamento guidato salvato. Riprendi in qualsiasi momento dalla configurazione.', 'Salvato su questo dispositivo alle {time}', 'Salvato', 'Salvataggio dell’avanzamento…', 'Salvataggio',
  ]),
};
