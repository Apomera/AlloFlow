const keys = ['summary_completed', 'summary_emoji', 'summary_label', 'summary_resources', 'summary_skipped'];
const make = (values) => Object.fromEntries(keys.map((key, index) => [key, values[index]]));
module.exports = {
  portuguese_angola: make(['Concluído', 'Suporte de emojis', 'Resumo de conclusão do Modo Guiado', 'Recursos', 'Ignorado']),
  portuguese_brazil: make(['Concluído', 'Suporte a emojis', 'Resumo de conclusão do Modo Guiado', 'Recursos', 'Ignorado']),
  portuguese_portugal: make(['Concluído', 'Suporte de emojis', 'Resumo de conclusão do Modo Guiado', 'Recursos', 'Ignorado']),
  punjabi: make(['ਮੁਕੰਮਲ', 'ਇਮੋਜੀ ਸਹਾਇਤਾ', 'ਮਾਰਗਦਰਸ਼ਿਤ ਮੋਡ ਪੂਰਾ ਹੋਣ ਦਾ ਸਾਰ', 'ਸਰੋਤ', 'ਛੱਡਿਆ ਗਿਆ']),
  romanian: make(['Finalizat', 'Suport emoji', 'Rezumatul finalizării modului ghidat', 'Resurse', 'Omis']),
  russian: make(['Завершено', 'Поддержка эмодзи', 'Итоги завершения управляемого режима', 'Ресурсы', 'Пропущено']),
  somali: make(['La dhammeeyey', 'Taageerada emoji', 'Soo koobidda dhammaystirka Habka Hagidda', 'Khayraad', 'La booday']),
  spanish_castilian: make(['Completado', 'Compatibilidad con emojis', 'Resumen de finalización del modo guiado', 'Recursos', 'Omitido']),
  spanish_latin_america: make(['Completado', 'Compatibilidad con emojis', 'Resumen de finalización del modo guiado', 'Recursos', 'Omitido']),
  swahili: make(['Imekamilika', 'Usaidizi wa emoji', 'Muhtasari wa kukamilisha Hali ya Kuongozwa', 'Rasilimali', 'Imepitwa']),
  tagalog: make(['Nakumpleto', 'Suporta sa emoji', 'Buod ng pagkumpleto ng Guided Mode', 'Mga resource', 'Nilaktawan']),
  tamil: make(['முடிந்தது', 'எமோஜி ஆதரவு', 'வழிகாட்டி பயன்முறை நிறைவு சுருக்கம்', 'வளங்கள்', 'தவிர்க்கப்பட்டது']),
  telugu: make(['పూర్తయింది', 'ఎమోజీ మద్దతు', 'మార్గదర్శక మోడ్ పూర్తి సారాంశం', 'వనరులు', 'దాటవేయబడింది']),
  thai: make(['เสร็จสมบูรณ์', 'รองรับอีโมจิ', 'สรุปการจบโหมดแนะนำ', 'ทรัพยากร', 'ข้ามแล้ว']),
  tigrinya: make(['ተዛዚሙ', 'ደገፍ ኢሞጂ', 'ማጠቓለያ ምዝዛም ዝተመርሐ ሞድ', 'ሃብቲ', 'ተሓሊፉ']),
  turkish: make(['Tamamlandı', 'Emoji desteği', 'Yönlendirmeli Mod tamamlama özeti', 'Kaynaklar', 'Atlandı']),
  ukrainian: make(['Завершено', 'Підтримка емодзі', 'Підсумок завершення керованого режиму', 'Ресурси', 'Пропущено']),
  urdu: make(['مکمل', 'ایموجی معاونت', 'رہنمائی والے موڈ کی تکمیل کا خلاصہ', 'وسائل', 'چھوڑا گیا']),
  vietnamese: make(['Đã hoàn tất', 'Hỗ trợ emoji', 'Tóm tắt hoàn tất Chế độ Hướng dẫn', 'Tài nguyên', 'Đã bỏ qua']),
  yoruba: make(['Ti parí', 'Àtìlẹ́yìn emoji', 'Àkótán ìparí Ìpo Ìtọ́sọ́nà', 'Àwọn ohun èlò', 'A fo']),
};
