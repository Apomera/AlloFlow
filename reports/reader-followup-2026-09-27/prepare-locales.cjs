// Frozen, reviewed-scope translations. No external provider or learner data.
const fs = require('node:fs');
const parser = require('@babel/parser'), traverse = require('@babel/traverse').default;
const rows = {
  offline_audio_stopped: [
    'Se detuvo la preparación del audio. Se conservan los fragmentos completados; prepara el audio que falta para continuar.',
    'توقّف إعداد الصوت. تُحفظ المقاطع المكتملة؛ أعدّ الصوت الناقص للمتابعة.',
    '音频准备已停止。已完成的片段会保留；请准备缺失的音频以继续。',
    'หยุดเตรียมเสียงแล้ว คลิปที่เสร็จแล้วจะยังคงอยู่ เตรียมเสียงที่ขาดเพื่อดำเนินการต่อ'
  ],
  offline_audio_prepared_checking: [
    'El audio está preparado. Comprobando si está guardado en este dispositivo.',
    'الصوت جاهز. جارٍ التحقق من حفظه على هذا الجهاز.',
    '音频已准备好。正在检查是否已保存在此设备上。',
    'เสียงพร้อมแล้ว กำลังตรวจสอบว่าบันทึกไว้ในอุปกรณ์นี้แล้วหรือไม่'
  ],
  lookup_dictionary_not_found: ['El diccionario no tiene una entrada para esta palabra.', 'لا يوجد مدخل لهذه الكلمة في القاموس.', '词典中没有这个词的词条。', 'พจนานุกรมไม่มีรายการสำหรับคำนี้'],
  lookup_dictionary_timeout: ['El diccionario tardó demasiado en responder. Puedes intentarlo de nuevo.', 'استغرق القاموس وقتًا طويلًا للرد. يمكنك المحاولة مرة أخرى.', '词典响应超时。你可以重试。', 'พจนานุกรมใช้เวลาตอบกลับนานเกินไป คุณสามารถลองอีกครั้งได้'],
  lookup_dictionary_connection: ['No se pudo conectar con el diccionario. Se sigue mostrando cualquier ayuda disponible.', 'تعذّر الاتصال بالقاموس. تظل أي مساعدة متاحة معروضة.', '无法连接词典。仍会显示可用的帮助。', 'เชื่อมต่อพจนานุกรมไม่ได้ ความช่วยเหลือที่มีอยู่ยังคงแสดงอยู่'],
  lookup_dictionary_invalid: ['El diccionario devolvió una entrada que no se puede usar. Puedes intentarlo de nuevo.', 'أعاد القاموس مدخلًا غير صالح للاستخدام. يمكنك المحاولة مرة أخرى.', '词典返回的词条无法使用。你可以重试。', 'พจนานุกรมส่งคืนรายการที่ใช้ไม่ได้ คุณสามารถลองอีกครั้งได้'],
  lookup_dictionary_unavailable: ['No hay ninguna entrada del diccionario disponible.', 'لا يتوفر مدخل في القاموس.', '没有可用的词典词条。', 'ไม่มีรายการพจนานุกรมที่ใช้ได้'],
  lookup_ready: ['Ayuda de palabras lista', 'مساعدة الكلمات جاهزة', '词语帮助已准备好', 'ความช่วยเหลือเกี่ยวกับคำพร้อมแล้ว'],
  lookup_dictionary_ready: ['Entrada del diccionario lista', 'مدخل القاموس جاهز', '词典词条已准备好', 'รายการพจนานุกรมพร้อมแล้ว'],
  lookup_ai_disabled: ['Las explicaciones de IA están desactivadas. Puedes seguir usando cualquier ayuda de palabras disponible.', 'شروحات الذكاء الاصطناعي معطّلة. يمكنك الاستمرار في استخدام أي مساعدة كلمات متاحة.', 'AI 解释已关闭。你仍可使用已有的词语帮助。', 'ปิดคำอธิบายจาก AI อยู่ คุณยังใช้ความช่วยเหลือเกี่ยวกับคำที่มีอยู่ได้'],
  lookup_loading: ['Preparando ayuda de palabras…', 'جارٍ إعداد مساعدة الكلمات…', '正在准备词语帮助…', 'กำลังเตรียมความช่วยเหลือเกี่ยวกับคำ…'],
  lookup_ai_timeout: ['La ayuda de palabras de IA tardó demasiado. Se sigue mostrando cualquier ayuda disponible. Puedes intentarlo de nuevo.', 'استغرقت مساعدة الكلمات بالذكاء الاصطناعي وقتًا طويلًا. تظل أي مساعدة متاحة معروضة. يمكنك المحاولة مرة أخرى.', 'AI 词语帮助响应超时。仍会显示可用的帮助。你可以重试。', 'ความช่วยเหลือเกี่ยวกับคำจาก AI ใช้เวลานานเกินไป ความช่วยเหลือที่มีอยู่ยังคงแสดงอยู่ คุณสามารถลองอีกครั้งได้'],
  lookup_ai_failed: ['No se pudo cargar la ayuda de palabras de IA. Se sigue mostrando cualquier ayuda disponible.', 'تعذّر تحميل مساعدة الكلمات بالذكاء الاصطناعي. تظل أي مساعدة متاحة معروضة.', '无法加载 AI 词语帮助。仍会显示可用的帮助。', 'โหลดความช่วยเหลือเกี่ยวกับคำจาก AI ไม่ได้ ความช่วยเหลือที่มีอยู่ยังคงแสดงอยู่'],
  lookup_retrying: ['Intentando de nuevo…', 'جارٍ إعادة المحاولة…', '正在重试…', 'กำลังลองอีกครั้ง…'],
  lookup_retry: ['Volver a intentar la ayuda de palabras', 'إعادة محاولة مساعدة الكلمات', '重试词语帮助', 'ลองความช่วยเหลือเกี่ยวกับคำอีกครั้ง'],
  lookup_dictionary_loading: ['Buscando una entrada del diccionario…', 'جارٍ البحث عن مدخل في القاموس…', '正在查找词典词条…', 'กำลังค้นหารายการในพจนานุกรม…'],
  lookup_dictionary_english_words: ['Las entradas del diccionario están disponibles para palabras individuales en inglés. Se sigue mostrando cualquier otra ayuda de palabras disponible.', 'تتوفر مداخل القاموس للكلمات الإنجليزية المفردة. تظل أي مساعدة كلمات أخرى متاحة معروضة.', '词典词条适用于单个英语单词。仍会显示其他可用的词语帮助。', 'พจนานุกรมมีรายการสำหรับคำภาษาอังกฤษทีละคำ ความช่วยเหลือเกี่ยวกับคำอื่น ๆ ที่มีอยู่ยังคงแสดงอยู่'],
  lookup_dictionary_retry: ['Volver a intentar el diccionario', 'إعادة محاولة القاموس', '重试词典', 'ลองพจนานุกรมอีกครั้ง'],
  lookup_picture_loading: ['Preparando imagen…', 'جارٍ إعداد الصورة…', '正在准备图片…', 'กำลังเตรียมรูปภาพ…'],
  lookup_picture_ready: ['Imagen lista', 'الصورة جاهزة', '图片已准备好', 'รูปภาพพร้อมแล้ว'],
  lookup_picture_retry: ['Volver a intentar la imagen', 'إعادة محاولة الصورة', '重试图片', 'ลองรูปภาพอีกครั้ง'],
  lookup_picture_disabled: ['La creación de imágenes con IA está desactivada.', 'إنشاء صور جديدة بالذكاء الاصطناعي معطّل.', '已关闭生成新 AI 图片的功能。', 'ปิดการสร้างรูปภาพใหม่ด้วย AI อยู่'],
  lookup_listen_english: ['Escuchar en inglés', 'الاستماع بالإنجليزية', '听英语朗读', 'ฟังเป็นภาษาอังกฤษ'],
  lookup_hear_passage: ['Escuchar en el texto', 'الاستماع ضمن النص', '在文章中听读', 'ฟังในบทอ่าน'],
  offline_audio_save_unconfirmed: ['No se confirmó que el audio se haya guardado en este dispositivo. Mantén esta página abierta e intenta guardarlo de nuevo.', 'لم يتم تأكيد حفظ الصوت على هذا الجهاز. أبقِ هذه الصفحة مفتوحة وحاول الحفظ مرة أخرى.', '尚未确认音频是否已保存在此设备上。请保持此页面打开并重试保存。', 'ยังยืนยันไม่ได้ว่าบันทึกเสียงไว้ในอุปกรณ์นี้แล้ว โปรดเปิดหน้านี้ไว้แล้วลองบันทึกอีกครั้ง'],
  offline_audio_save_failed: ['No se pudo guardar el audio en este dispositivo. Mantén esta página abierta e intenta guardarlo de nuevo.', 'تعذّر حفظ الصوت على هذا الجهاز. أبقِ هذه الصفحة مفتوحة وحاول الحفظ مرة أخرى.', '无法将音频保存在此设备上。请保持此页面打开并重试保存。', 'บันทึกเสียงไว้ในอุปกรณ์นี้ไม่ได้ โปรดเปิดหน้านี้ไว้แล้วลองบันทึกอีกครั้ง'],
  offline_audio_counts: ['Se guardaron {saved} de {total} fragmentos en este dispositivo; aún faltan {remaining} por preparar.', 'تم حفظ {saved} من أصل {total} مقطعًا على هذا الجهاز؛ لا يزال {remaining} بحاجة إلى الإعداد.', '已在此设备上保存 {saved}/{total} 个片段；仍有 {remaining} 个需要准备。', 'บันทึกแล้ว {saved} จาก {total} คลิปในอุปกรณ์นี้ ยังต้องเตรียมอีก {remaining} คลิป'],
  offline_audio_check: ['Comprueba el almacenamiento del dispositivo antes de depender del audio guardado.', 'تحقّق من تخزين الجهاز قبل الاعتماد على الصوت المحفوظ.', '依赖已保存的音频前，请检查设备存储。', 'ตรวจสอบพื้นที่จัดเก็บของอุปกรณ์ก่อนพึ่งพาเสียงที่บันทึกไว้'],
  offline_audio_session_count: ['No se ha verificado que {count} fragmentos utilizables estén guardados en el dispositivo.', 'لم يتم التحقق من وجود {count} مقطعًا صالحًا للاستخدام في تخزين الجهاز.', '有 {count} 个可用片段尚未确认已存储在设备上。', 'มีคลิปที่ใช้ได้ {count} คลิปที่ยังไม่ได้ยืนยันว่าอยู่ในพื้นที่จัดเก็บของอุปกรณ์'],
  offline_audio_pictures: ['Imágenes de apoyo no incluidas al guardar en el dispositivo: {count}.', 'صور المساعدة غير المشمولة في الحفظ على الجهاز: {count}.', '未包含在设备保存内容中的辅助图片：{count} 张。', 'รูปภาพประกอบที่ไม่ได้รวมไว้ในการบันทึกลงอุปกรณ์: {count} รูป'],
  offline_audio_saving: ['Guardando audio en este dispositivo…', 'جارٍ حفظ الصوت على هذا الجهاز…', '正在将音频保存在此设备上…', 'กำลังบันทึกเสียงลงอุปกรณ์นี้…'],
  offline_audio_preparing_announcement: ['Preparando audio. Usa Detener guardado de audio para cancelar.', 'جارٍ إعداد الصوت. استخدم «إيقاف حفظ الصوت» للإلغاء.', '正在准备音频。使用“停止保存音频”可取消。', 'กำลังเตรียมเสียง ใช้ปุ่มหยุดบันทึกเสียงเพื่อยกเลิก'],
  offline_audio_prepare_missing: ['Preparar el audio que falta', 'إعداد الصوت الناقص', '准备缺失的音频', 'เตรียมเสียงที่ขาด'],
  offline_audio_retry_save: ['Reintentar guardar el audio', 'إعادة محاولة حفظ الصوت', '重试保存音频', 'ลองบันทึกเสียงอีกครั้ง'],
  offline_audio_check_again: ['Comprobar el guardado en el dispositivo', 'التحقق من الحفظ على الجهاز', '检查设备保存状态', 'ตรวจสอบการบันทึกลงอุปกรณ์'],
  offline_audio_review_recordings: ['Revisar grabaciones', 'مراجعة التسجيلات', '查看录音', 'ตรวจทานเสียงบันทึก'],
  review_audio_breakdown: ['Por actualizar: {stale}; ajustes desconocidos: {unverified}; dañados: {corrupt}; faltantes: {missing}.', 'بحاجة إلى تحديث: {stale}؛ إعدادات غير معروفة: {unverified}؛ تالف: {corrupt}؛ مفقود: {missing}.', '待更新：{stale}；设置未知：{unverified}；损坏：{corrupt}；缺失：{missing}。', 'ต้องอัปเดต: {stale}; ไม่ทราบการตั้งค่า: {unverified}; เสียหาย: {corrupt}; ขาดหาย: {missing}'],
  audio_recovery_title: ['Oraciones que necesitan audio', 'جمل تحتاج إلى صوت', '需要音频的句子', 'ประโยคที่ต้องมีเสียง'],
  audio_recovery_remaining: ['Última preparación: {count} fragmentos necesitaron atención. Revisa las oraciones pendientes a continuación.', 'في الإعداد الأخير، احتاج {count} مقطعًا إلى المراجعة. راجع الجمل المتبقية أدناه.', '上次准备时，有 {count} 个片段需要处理。请查看下方仍需处理的句子。', 'การเตรียมครั้งล่าสุด: มี {count} คลิปที่ต้องตรวจสอบ ตรวจทานประโยคที่ยังเหลือด้านล่าง'],
  audio_recovery_sentence: ['Revisar la oración {number}', 'مراجعة الجملة {number}', '查看第 {number} 句', 'ตรวจทานประโยคที่ {number}'],
  audio_recovery_recording: ['Esta grabación está protegida. Revísala y elige si quieres grabarla de nuevo o generar un reemplazo.', 'هذا التسجيل محمي. راجعه واختر ما إذا كنت تريد التسجيل مجددًا أو إنشاء بديل.', '此录音受保护。请查看后选择重新录制或生成替代音频。', 'เสียงบันทึกนี้ได้รับการป้องกัน ตรวจทานแล้วเลือกว่าจะบันทึกใหม่หรือสร้างเสียงแทน'],
  audio_recovery_storage: ['El audio superó un límite de almacenamiento. Revisa esta oración antes de volver a intentarlo.', 'تجاوز الصوت حدّ التخزين. راجع هذه الجملة قبل إعادة المحاولة.', '音频超出了存储限制。重试前请查看此句。', 'เสียงเกินขีดจำกัดพื้นที่จัดเก็บ ตรวจทานประโยคนี้ก่อนลองอีกครั้ง'],
  audio_recovery_retry: ['La preparación falló. Reintenta esta oración o vuelve a preparar el audio restante.', 'فشل الإعداد. أعد محاولة هذه الجملة أو حاول إعداد الصوت المتبقي مرة أخرى.', '准备失败。请重试此句，或重新准备剩余音频。', 'เตรียมไม่สำเร็จ ลองประโยคนี้อีกครั้งหรือลองเตรียมเสียงที่เหลือใหม่'],
  layout_preview_read_hint: ['Lee a tu propio ritmo. El menú de visualización cambia el aspecto de esta vista previa.', 'اقرأ بالسرعة التي تناسبك. تغيّر قائمة العرض مظهر هذه المعاينة.', '按自己的节奏阅读。使用显示菜单可更改此预览的外观。', 'อ่านตามจังหวะของคุณ เมนูการแสดงผลใช้เปลี่ยนรูปลักษณ์ของตัวอย่างนี้'],
  layout_preview_refresh: ['Actualizar vista previa', 'تحديث المعاينة', '刷新预览', 'รีเฟรชตัวอย่าง'],
  layout_preview_refresh_hint: ['Al actualizar, se usan la lectura y el aspecto actuales. Los cambios hechos en esta vista previa se descartan al actualizarla o cerrarla.', 'يستخدم التحديث القراءة والمظهر الحاليين. تُلغى التغييرات التي أجريتها في هذه المعاينة عند تحديثها أو إغلاقها.', '刷新会使用当前阅读内容和外观。在此预览中进行的更改会在刷新或关闭时丢弃。', 'การรีเฟรชจะใช้บทอ่านและรูปลักษณ์ปัจจุบัน การเปลี่ยนแปลงที่ทำในตัวอย่างนี้จะถูกยกเลิกเมื่อรีเฟรชหรือปิด'],
  layout_preview_refreshed: ['Vista previa actualizada.', 'تم تحديث المعاينة.', '预览已刷新。', 'รีเฟรชตัวอย่างแล้ว'],
  layout_preview_refresh_unavailable: ['Se necesita una lectura adaptada actual para actualizar. Cierra la vista previa para elegir una.', 'يلزم وجود قراءة مكيّفة حالية للتحديث. أغلق المعاينة لاختيار واحدة.', '刷新需要当前的改编阅读内容。请关闭预览后选择一篇。', 'ต้องมีบทอ่านที่ปรับแล้วในปัจจุบันเพื่อรีเฟรช ปิดตัวอย่างเพื่อเลือกบทอ่าน'],
  layout_preview_note: ['Prueba el aspecto, la navegación y la ayuda de palabras preparada. Esta copia permanece igual hasta que la actualices o vuelvas a abrirla. No es una vista previa de una lección enviada.', 'جرّب المظهر والتنقّل ومساعدة الكلمات المُعدّة. تظل هذه النسخة كما هي حتى تحدّثها أو تعيد فتحها. هذه ليست معاينة لدرس تم إرساله.', '试用外观、导航和预先准备的词语帮助。此快照会保持不变，直到你刷新或重新打开它。它不是已发送课程的预览。', 'ลองใช้รูปลักษณ์ การนำทาง และความช่วยเหลือเกี่ยวกับคำที่เตรียมไว้ สำเนานี้จะคงเดิมจนกว่าจะรีเฟรชหรือเปิดใหม่ นี่ไม่ใช่ตัวอย่างบทเรียนที่ส่งแล้ว'],
  place_copy_changed: ['El borrador o la copia de recuperación cambió. Revísalo de nuevo antes de continuar.', 'تغيّرت المسودة أو نسخة الاسترداد. راجعها مرة أخرى قبل المتابعة.', '草稿或恢复副本已更改。继续前请再次查看。', 'ฉบับร่างหรือสำเนาสำหรับกู้คืนเปลี่ยนไปแล้ว ตรวจทานอีกครั้งก่อนดำเนินการต่อ'],
  place_copy_empty: ['Esta copia de recuperación no tiene respuestas ni marcadores legibles que restaurar.', 'لا تحتوي نسخة الاسترداد هذه على إجابات أو علامة قراءة قابلة للقراءة لاستعادتها.', '此恢复副本没有可恢复的可读答案或书签。', 'สำเนาสำหรับกู้คืนนี้ไม่มีคำตอบหรือที่คั่นที่อ่านได้ให้กู้คืน'],
  place_copy_review_title: ['Revisar una copia de recuperación', 'مراجعة نسخة استرداد', '查看恢复副本', 'ตรวจทานสำเนาสำหรับกู้คืน'],
  place_copy_restore_help: ['Restaurar reemplaza las respuestas y el marcador de esta página con la copia de abajo. Tu trabajo actual se conserva en otra copia de recuperación. Revisa el borrador restaurado antes de guardarlo.', 'تستبدل الاستعادة إجابات هذه الصفحة وعلامة القراءة بالنسخة أدناه. يُحتفظ بعملك الحالي في نسخة استرداد أخرى. راجع المسودة المستعادة قبل حفظها.', '恢复会用下方副本替换本页的答案和书签。你当前的作业会保留在另一个恢复副本中。保存前请查看恢复后的草稿。', 'การกู้คืนจะแทนที่คำตอบและที่คั่นในหน้านี้ด้วยสำเนาด้านล่าง งานปัจจุบันของคุณจะเก็บไว้ในสำเนาสำหรับกู้คืนอีกชุด ตรวจทานฉบับร่างที่กู้คืนก่อนบันทึก'],
  place_copy_selected: ['Copia de recuperación seleccionada', 'نسخة الاسترداد المحددة', '所选恢复副本', 'สำเนาสำหรับกู้คืนที่เลือก'],
  place_copy_no_readable_work: ['Esta copia no tiene respuestas ni marcadores legibles que restaurar. Su registro original sigue disponible en la descarga de recuperación.', 'لا تحتوي هذه النسخة على إجابات أو علامة قراءة قابلة للقراءة لاستعادتها. يظل سجلها الأصلي متاحًا في ملف تنزيل الاسترداد.', '此副本没有可恢复的可读答案或书签。其原始记录仍可在恢复下载文件中找到。', 'สำเนานี้ไม่มีคำตอบหรือที่คั่นที่อ่านได้ให้กู้คืน ระเบียนต้นฉบับยังคงมีอยู่ในไฟล์ดาวน์โหลดสำหรับกู้คืน'],
  place_copy_restore: ['Restaurar como borrador', 'استعادة كمسودة', '恢复为草稿', 'กู้คืนเป็นฉบับร่าง'],
  place_copy_remove_help: ['Eliminar esta copia solo la quita de esta página. No cambia tus respuestas, marcador ni trabajo guardado actuales.', 'تزيل إزالة هذه النسخة وجودها من هذه الصفحة فقط. ولا تغيّر إجاباتك الحالية أو علامة القراءة أو عملك المحفوظ.', '移除此副本只会将其从本页移除，不会更改你当前的答案、书签或已保存的作业。', 'การลบสำเนานี้จะลบออกจากหน้านี้เท่านั้น ไม่เปลี่ยนคำตอบปัจจุบัน ที่คั่น หรืองานที่บันทึกไว้'],
  place_copy_remove_confirm: ['He conservado esta copia o ya no la necesito.', 'احتفظت بهذه النسخة أو لم أعد بحاجة إليها.', '我已保留此副本，或已不再需要它。', 'ฉันเก็บสำเนานี้ไว้แล้วหรือไม่ต้องการอีกต่อไป'],
  place_copy_remove: ['Eliminar esta copia de recuperación', 'إزالة نسخة الاسترداد هذه', '移除此恢复副本', 'ลบสำเนาสำหรับกู้คืนนี้'],
  place_copy_restored: ['La copia de recuperación se restauró en esta página. Revísala y luego elige Guardar trabajo restaurado. Al recargar, se perderán los cambios sin guardar.', 'تمت استعادة نسخة الاسترداد على هذه الصفحة. راجعها ثم اختر «حفظ العمل المستعاد». ستؤدي إعادة تحميل الصفحة إلى فقدان التغييرات غير المحفوظة.', '恢复副本已在本页恢复。请查看后选择“保存恢复的作业”。重新加载会丢弃未保存的更改。', 'กู้คืนสำเนาในหน้านี้แล้ว ตรวจทานแล้วเลือกบันทึกงานที่กู้คืน การโหลดหน้าใหม่จะทำให้การเปลี่ยนแปลงที่ยังไม่บันทึกสูญหาย'],
  place_copy_save: ['Guardar trabajo restaurado', 'حفظ العمل المستعاد', '保存恢复的作业', 'บันทึกงานที่กู้คืน'],
  place_copy_review_action: ['Revisar copia {number}', 'مراجعة النسخة {number}', '查看副本 {number}', 'ตรวจทานสำเนาที่ {number}']
};

const source = fs.readFileSync('view_simplified_source.jsx', 'utf8');
const original = fs.readFileSync('ui_strings.js', 'utf8'), english = JSON.parse(original);
const pack = JSON.parse(fs.readFileSync('lang/spanish_latin_america.js', 'utf8'));
const pending = {};
traverse(parser.parse(source, { sourceType: 'script', plugins: ['jsx'] }), { CallExpression(p) {
  const a = p.node.arguments;
  if (a[0]?.type === 'StringLiteral' && /^simplified\.(lookup_|offline_audio_)/.test(a[0].value) && a[1]?.type === 'StringLiteral' && !pack.simplified[a[0].value.split('.')[1]]) pending[a[0].value] = a[1].value;
} });
for (const [key, value] of Object.entries(english.simplified)) if (/^(layout_preview_|audio_recovery_|review_audio_(unavailable|current_detail|breakdown)$|place_copy_)/.test(key) && !pack.simplified[key]) pending['simplified.' + key] = value;
if (Object.keys(pending).length !== 69) throw Error('Review changed scope before regenerating');
const earlier = JSON.parse(fs.readFileSync('.codex-artifacts/reader-localization-preview-track17/translations/reader-preview-locales.json', 'utf8'));
const locales = ['spanish_latin_america', 'spanish_castilian', 'arabic', 'chinese_simplified', 'thai'];
const payload = { schemaVersion: 1, sourceRevision: '452e7cd230b62f4e192f055826817653d5b997f4', scope: '69 deferred reader messages: preview, reading-place copies, narration and lookup. AI-authored; native-speaker review pending.', english: pending, locales: {} };
for (const [index, locale] of locales.entries()) {
  const values = payload.locales[locale] = {};
  for (const [key, value] of Object.entries(pending)) {
    const leaf = key.slice(11);
    const existingEnglish = english.simplified[leaf];
    if (existingEnglish !== undefined && existingEnglish !== value) throw Error('English conflict ' + key);
    const translated = rows[leaf]?.[index < 2 ? 0 : index - 1] ?? (earlier.english[key] === value ? earlier.locales[locale][key] : undefined);
    if (!translated) throw Error('Missing translation ' + locale + ' ' + key);
    values[key] = translated;
  }
}
const { validatePayload } = require('../../dev-tools/i18n/apply_reader_contract_locales.cjs');
const addedEnglish = [];
for (const [key, value] of Object.entries(pending)) {
  const leaf = key.slice(11);
  if (english.simplified[leaf] === undefined) { english.simplified[leaf] = value; addedEnglish.push(key); }
}
validatePayload(payload, english, 69);
const mirror = 'desktop/web-app/public/ui_strings.js';
if (fs.readFileSync(mirror, 'utf8') !== original) throw Error('English mirror differs');
const changes = [
  ['translations/reader-followup-locales.json', JSON.stringify(payload, null, 2) + '\n', null],
  ...['ui_strings.js', mirror].map(file => [file, JSON.stringify(english, null, 2) + (original.endsWith('\n') ? '\n' : ''), original])
];
for (const [file, , before] of changes) if (before === null ? fs.existsSync(file) : fs.readFileSync(file, 'utf8') !== before) throw Error('Concurrent change ' + file);
for (const [file, contents, before] of changes) {
  if (before !== null) { const backup = __dirname + '/before/' + file; fs.mkdirSync(require('node:path').dirname(backup), { recursive: true }); fs.writeFileSync(backup, before); }
  const temp = file + '.followup-' + process.pid + '.tmp';
  try { fs.writeFileSync(temp, contents); fs.renameSync(temp, file); }
  finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
}
fs.writeFileSync(__dirname + '/english-registration.json', JSON.stringify({ addedEnglish, keys: Object.keys(pending).length }, null, 2) + '\n');
console.log(JSON.stringify({ addedEnglish: addedEnglish.length, keys: Object.keys(pending).length }));
