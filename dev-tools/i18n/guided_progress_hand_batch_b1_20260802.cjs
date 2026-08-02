const keys = [
  'progress_label', 'progress_not_saved', 'progress_not_saved_exit', 'progress_not_saved_hint',
  'progress_not_saved_short', 'progress_not_saved_title', 'progress_saved', 'progress_saved_at',
  'progress_saved_short', 'progress_saving', 'progress_saving_short',
];
const make = (values) => Object.fromEntries(keys.map((key, index) => [key, values[index]]));

module.exports = {
  french: make([
    'Progression de la visite guidée', 'La progression n’est pas enregistrée', 'Le mode guidé a été fermé, mais cet appareil n’a pas pu enregistrer votre progression.', 'Le stockage de l’appareil est indisponible. Réessayez l’enregistrement, conservez la leçon comme sauvegarde de projet ou laissez le mode guidé ouvert.',
    'Non enregistrée', 'La progression n’a pas pu être enregistrée', 'Progression guidée enregistrée. Reprenez quand vous voulez depuis la configuration.', 'Enregistrée sur cet appareil à {time}', 'Enregistrée', 'Enregistrement de la progression…', 'Enregistrement',
  ]),
  german: make([
    'Fortschritt der geführten Tour', 'Fortschritt wird nicht gespeichert', 'Der geführte Modus wurde geschlossen, aber dieses Gerät konnte Ihren Fortschritt nicht speichern.', 'Der Gerätespeicher ist nicht verfügbar. Wiederholen Sie das Speichern, sichern Sie die Lektion als Projekt oder lassen Sie den geführten Modus geöffnet.',
    'Nicht gespeichert', 'Fortschritt konnte nicht gespeichert werden', 'Fortschritt der Führung gespeichert. Sie können jederzeit über die Einrichtung fortsetzen.', 'Auf diesem Gerät um {time} gespeichert', 'Gespeichert', 'Fortschritt wird gespeichert…', 'Speichern',
  ]),
  arabic: make([
    'تقدم الجولة الموجّهة', 'لم يتم حفظ التقدم', 'تم إغلاق الوضع الموجّه، لكن هذا الجهاز لم يتمكن من حفظ تقدمك.', 'التخزين على الجهاز غير متاح. أعد محاولة الحفظ، أو احتفظ بالدرس كنسخة احتياطية للمشروع، أو اترك الوضع الموجّه مفتوحاً.',
    'غير محفوظ', 'تعذر حفظ التقدم', 'تم حفظ التقدم الموجّه. يمكنك الاستئناف في أي وقت من الإعداد.', 'تم الحفظ على هذا الجهاز في {time}', 'تم الحفظ', 'جارٍ حفظ التقدم…', 'جارٍ الحفظ',
  ]),
  chinese_simplified: make([
    '引导教程进度', '进度未保存', '引导模式已关闭，但此设备无法保存你的进度。', '设备存储不可用。请重试保存、将课程保留为项目备份，或保持引导模式打开。',
    '未保存', '无法保存进度', '引导进度已保存。随时可以从设置继续。', '已于 {time} 保存到此设备', '已保存', '正在保存进度…', '正在保存',
  ]),
  japanese: make([
    'ガイドツアーの進捗', '進捗は保存されていません', 'ガイドモードを閉じましたが、このデバイスでは進捗を保存できませんでした。', 'デバイスのストレージを利用できません。保存を再試行するか、レッスンをプロジェクトのバックアップとして保存するか、ガイドモードを開いたままにしてください。',
    '未保存', '進捗を保存できませんでした', 'ガイドの進捗を保存しました。いつでも設定から再開できます。', '{time} にこのデバイスへ保存', '保存済み', '進捗を保存中…', '保存中',
  ]),
  hindi: make([
    'निर्देशित टूर की प्रगति', 'प्रगति सहेजी नहीं गई', 'निर्देशित मोड बंद हो गया, लेकिन यह डिवाइस आपकी प्रगति सहेज नहीं सका।', 'डिवाइस का स्टोरेज उपलब्ध नहीं है। सेव करने का फिर प्रयास करें, पाठ को प्रोजेक्ट बैकअप के रूप में रखें या निर्देशित मोड खुला रखें।',
    'सहेजा नहीं गया', 'प्रगति सहेजी नहीं जा सकी', 'निर्देशित प्रगति सहेजी गई। सेटअप से कभी भी फिर शुरू करें।', '{time} पर इस डिवाइस में सहेजा गया', 'सहेजा गया', 'प्रगति सहेजी जा रही है…', 'सहेज रहे हैं',
  ]),
  swahili: make([
    'Maendeleo ya ziara iliyoongozwa', 'Maendeleo hayajahifadhiwa', 'Hali ya Kuongozwa ilifungwa, lakini kifaa hiki hakikuweza kuhifadhi maendeleo yako.', 'Hifadhi ya kifaa haipatikani. Jaribu kuhifadhi tena, hifadhi somo kama nakala ya mradi, au acha Hali ya Kuongozwa ikiwa wazi.',
    'Haijahifadhiwa', 'Maendeleo hayakuweza kuhifadhiwa', 'Maendeleo yaliyoongozwa yamehifadhiwa. Endelea wakati wowote kutoka Usanidi.', 'Imehifadhiwa kwenye kifaa hiki saa {time}', 'Imehifadhiwa', 'Inahifadhi maendeleo…', 'Inahifadhi',
  ]),
  vietnamese: make([
    'Tiến độ hướng dẫn', 'Tiến độ chưa được lưu', 'Chế độ Hướng dẫn đã đóng nhưng thiết bị này không thể lưu tiến độ của bạn.', 'Bộ nhớ thiết bị không khả dụng. Hãy thử lưu lại, giữ bài học làm bản sao lưu dự án hoặc để Chế độ Hướng dẫn mở.',
    'Chưa lưu', 'Không thể lưu tiến độ', 'Đã lưu tiến độ hướng dẫn. Bạn có thể tiếp tục bất cứ lúc nào từ phần Thiết lập.', 'Đã lưu trên thiết bị này lúc {time}', 'Đã lưu', 'Đang lưu tiến độ…', 'Đang lưu',
  ]),
  russian: make([
    'Прогресс управляемого тура', 'Прогресс не сохранён', 'Управляемый режим закрыт, но этому устройству не удалось сохранить ваш прогресс.', 'Хранилище устройства недоступно. Повторите сохранение, сохраните урок как резервную копию проекта или оставьте управляемый режим открытым.',
    'Не сохранено', 'Не удалось сохранить прогресс', 'Прогресс тура сохранён. В любой момент продолжите из раздела настройки.', 'Сохранено на этом устройстве в {time}', 'Сохранено', 'Сохранение прогресса…', 'Сохранение',
  ]),
  korean: make([
    '가이드 투어 진행률', '진행률이 저장되지 않았습니다', '가이드 모드가 닫혔지만 이 기기에서 진행률을 저장하지 못했습니다.', '기기 저장소를 사용할 수 없습니다. 저장을 다시 시도하거나 수업을 프로젝트 백업으로 보관하거나 가이드 모드를 열어 두세요.',
    '저장되지 않음', '진행률을 저장할 수 없습니다', '가이드 진행률이 저장되었습니다. 설정에서 언제든지 다시 시작할 수 있습니다.', '{time}에 이 기기에 저장됨', '저장됨', '진행률 저장 중…', '저장 중',
  ]),
  portuguese_brazil: make([
    'Progresso do tour guiado', 'O progresso não foi salvo', 'O Modo Guiado foi fechado, mas este dispositivo não conseguiu salvar seu progresso.', 'O armazenamento do dispositivo está indisponível. Tente salvar novamente, preserve a lição como backup do projeto ou mantenha o Modo Guiado aberto.',
    'Não salvo', 'Não foi possível salvar o progresso', 'Progresso guiado salvo. Retome a qualquer momento pela Configuração.', 'Salvo neste dispositivo às {time}', 'Salvo', 'Salvando o progresso…', 'Salvando',
  ]),
  tagalog: make([
    'Pag-usad ng guided tour', 'Hindi nase-save ang pag-usad', 'Isinara ang Guided Mode, pero hindi nase-save ng device na ito ang iyong pag-usad.', 'Hindi available ang storage ng device. Subukang i-save muli, panatilihin ang lesson bilang project backup, o panatilihing bukas ang Guided Mode.',
    'Hindi nase-save', 'Hindi nase-save ang pag-usad', 'Nase-save ang guided progress. Magpatuloy anumang oras mula sa Setup.', 'Nase-save sa device na ito noong {time}', 'Nase-save', 'Sine-save ang pag-usad…', 'Sine-save',
  ]),
};
