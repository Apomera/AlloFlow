#!/usr/bin/env node
// add_help_mode_pdf_audit.cjs — one-shot script that inserts the 54
// pdf_audit_* help_mode keys (Phases α.1 + α.2 — already live in
// ui_strings.js since 2026-06-08) into each lang/*.js pack using
// hand-written translations.
//
// Run modes:
//   node dev-tools/i18n/add_help_mode_pdf_audit.cjs --check     # report status
//   node dev-tools/i18n/add_help_mode_pdf_audit.cjs --write     # apply changes
//   node dev-tools/i18n/add_help_mode_pdf_audit.cjs --lang=spanish_latin_america --write
//
// Per-pack backup written as lang/<pack>.js.bak.help_mode_<TS>

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const LANG_DIR = path.join(ROOT, 'lang');
const argv = process.argv.slice(2);
const arg = (n, d) => { const f = '--' + n + '='; const m = argv.find(a => a.startsWith(f)); return m ? m.slice(f.length) : (argv.includes('--' + n) ? true : d); };
const WRITE = !!arg('write', false);
const CHECK = !!arg('check', false) || (!WRITE && !arg('lang', false));
const ONLY_LANG = arg('lang', null);

// Canonical English (the master copy that lives in ui_strings.js).
// Pasted here for self-containment so the script doesn't need to reparse
// ui_strings.js. Order matches Batches A → K from workflow w6usocnc8.
const KEYS = [
  // Batch A — Web mode entry
  'pdf_audit_view_web_url_input',
  'pdf_audit_view_web_fetch_btn',
  'pdf_audit_view_web_html_textarea',
  'pdf_audit_view_web_audit_btn',
  'pdf_audit_view_web_remediate_btn',
  // Batch B — Batch queue UI
  'pdf_audit_view_batch_dropzone',
  'pdf_audit_view_batch_browse_btn',
  'pdf_audit_view_batch_resume_btn',
  'pdf_audit_view_batch_discard_btn',
  'pdf_audit_view_batch_clear_all_btn',
  'pdf_audit_view_batch_row_retry_btn',
  'pdf_audit_view_batch_row_remove_btn',
  'pdf_audit_view_batch_stop_btn',
  'pdf_audit_view_batch_retry_all_failed_btn',
  'pdf_audit_view_batch_start_btn',
  'pdf_audit_view_batch_download_zip_btn',
  'pdf_audit_view_batch_new_batch_btn',
  'pdf_audit_view_batch_dashboard_btn',
  // Batch C — Pipeline Settings
  'pdf_audit_view_settings_panel',
  'pdf_audit_view_audit_passes_slider',
  'pdf_audit_view_target_score_slider',
  'pdf_audit_view_max_fix_passes_slider',
  'pdf_audit_view_auto_continue_toggle',
  'pdf_audit_view_polish_passes_slider',
  // Batch D — Branding panel
  'pdf_audit_view_branding_panel',
  'pdf_audit_view_brand_mode_auto_btn',
  'pdf_audit_view_brand_mode_upload_input',
  'pdf_audit_view_brand_mode_none_btn',
  // Batch E — Audit Results header
  'pdf_audit_results_tab_remediation_btn',
  'pdf_audit_results_tab_original_btn',
  'pdf_audit_results_score_badge',
  'pdf_audit_results_reliability_details',
  'pdf_audit_results_score_breakdown_details',
  'pdf_audit_results_score_how_ai_details',
  'pdf_audit_results_score_how_axe_details',
  // Batch F — Issue Explain + image failures
  'pdf_audit_results_issue_explain',
  'pdf_audit_results_image_failures_details',
  'pdf_audit_results_image_regenerate_btn',
  // Batch J — Reports + Tier B
  'pdf_audit_view_report_menu_btn',
  'pdf_audit_view_adobe_report_btn',
  'pdf_audit_view_tierb_diff_view_btn',
  'pdf_audit_view_tierb_rerun_restore_btn',
  'pdf_audit_view_formatted_report_btn',
  'pdf_audit_view_html_report_btn',
  'pdf_audit_view_json_data_btn',
  'pdf_audit_view_audit_trail_signed_btn',
  // Batch K — Save/Load + Alt formats
  'pdf_audit_view_save_project_btn',
  'pdf_audit_view_load_project_btn',
  'pdf_audit_view_save_template_btn',
  'pdf_audit_alt_formats_summary',
  'pdf_audit_alt_formats_epub_btn',
  'pdf_audit_alt_formats_braille_btn',
  'pdf_audit_alt_formats_text_btn',
  'pdf_audit_alt_formats_markdown_btn',
];

// Translations. PER LANGUAGE, an object keyed by the 54 key names above.
// Confidence tier noted in comment per language. Languages not yet
// translated are present as { _todo: true } and will be SKIPPED by the
// script (not overwritten as English) so subsequent phases can add them.
const T = {};

// ─────────────────────────────────────────────────────────────────────
// PHASE λ.1 — Romance + Germanic high-confidence packs
// ─────────────────────────────────────────────────────────────────────

// Spanish (Latin America). High-confidence.
T.spanish_latin_america = {
  'pdf_audit_view_web_url_input': 'Pega la dirección de la página web que quieres revisar (por ejemplo https://tudistrito.org/manual), luego haz clic en Obtener para descargar su HTML y poder auditarlo y remediarlo.',
  'pdf_audit_view_web_fetch_btn': 'Descarga la página de la URL de arriba y coloca su HTML en el cuadro de abajo. Si el sitio bloquea la descarga, pega el código fuente de la página directamente en el cuadro HTML.',
  'pdf_audit_view_web_html_textarea': 'El HTML que se está auditando — colocado por Obtener o pegado por ti. Puedes editarlo aquí antes de auditar (por ejemplo, quitar una barra de navegación que no te pertenece).',
  'pdf_audit_view_web_audit_btn': 'Califica la página según WCAG 2.1 AA usando tanto un auditor de IA como el motor axe-core (el mismo motor que usan los auditores profesionales). No se cambia nada — usa esto cuando solo quieras saber cómo está la página hoy.',
  'pdf_audit_view_web_remediate_btn': 'Califica la página, luego reescribe el HTML para arreglar lo que pueda (contraste, etiqueta de idioma, enlace de salto, puntos de referencia) y te da una copia accesible para descargar. Siempre revisa el resultado tú mismo antes de publicar.',
  'pdf_audit_view_batch_dropzone': 'Arrastra archivos PDF desde tu escritorio o carpeta de descargas directamente a este cuadro para añadirlos a la cola de lote. Los archivos que no sean PDF se ignoran.',
  'pdf_audit_view_batch_browse_btn': 'Abre tu selector de archivos para elegir uno o varios PDFs. Usa esto si arrastrar archivos no es fácil (dispositivo táctil, lector de pantalla, baja visión, o una Chromebook).',
  'pdf_audit_view_batch_resume_btn': 'Continúa tu último lote donde lo dejaste — los PDFs ya terminados se conservan y solo se vuelven a ejecutar los que no terminaron. Usa esto cuando un lote se cortó (pestaña cerrada, recarga, caída).',
  'pdf_audit_view_batch_discard_btn': 'Descarta el progreso guardado de tu último lote interrumpido — el banner desaparece y los resultados en caché se eliminan de tu navegador.',
  'pdf_audit_view_batch_clear_all_btn': 'Elimina todos los PDFs de la cola para que puedas empezar de nuevo. Solo disponible antes de pulsar Iniciar Lote.',
  'pdf_audit_view_batch_row_retry_btn': 'Vuelve a ejecutar solo este archivo fallido sin tocar el resto del lote. Pasa primero el cursor sobre la X roja para leer por qué falló — si es un problema estructural (PDF dañado, escaneo solo de imágenes), reintentar no ayudará.',
  'pdf_audit_view_batch_row_remove_btn': 'Quita este PDF de la cola para que el lote lo omita. Solo disponible antes de que el lote esté en ejecución.',
  'pdf_audit_view_batch_stop_btn': 'Pide al lote que se detenga después de que termine el archivo que está procesando ahora mismo. Los PDFs ya terminados se quedan terminados — no perderás trabajo concluido, y puedes reanudar el resto después.',
  'pdf_audit_view_batch_retry_all_failed_btn': 'Vuelve a poner en cola cada PDF que falló y los ejecuta de nuevo. Los archivos ya completados no se tocan. Vale la pena intentar una vez si las fallas parecen errores de red intermitentes; no insistas con PDFs realmente dañados.',
  'pdf_audit_view_batch_start_btn': 'Inicia la auditoría y la reparación de cada PDF en la cola. Primero aparece una confirmación con una estimación de llamadas a la IA (y costo, en el plan auto-alojado) para que decidas antes de lanzarlo.',
  'pdf_audit_view_batch_download_zip_btn': 'Descarga cada PDF remediado con éxito como un solo archivo ZIP. Útil para devolver una carpeta entera a un docente o contacto del distrito de una sola vez.',
  'pdf_audit_view_batch_new_batch_btn': 'Limpia el lote terminado para que puedas soltar un nuevo conjunto de PDFs. Cualquier ZIP que ya hayas descargado se queda en tu computadora — esto solo reinicia la pantalla.',
  'pdf_audit_view_batch_dashboard_btn': 'Abre un panel de cumplimiento imprimible en una nueva pestaña — promedio de puntaje, cuántos PDFs alcanzaron 90+, los problemas WCAG más comunes. Útil para compartir con un administrador o adjuntar a un registro de Título II / 504.',
  'pdf_audit_view_settings_panel': 'Perillas de ajuste para el pipeline de auditoría y remediación. Los valores predeterminados son sensatos — solo cámbialos si la corrida estándar no te está dando lo que necesitas (más exhaustividad, menor costo, otro punto de parada).',
  'pdf_audit_view_audit_passes_slider': 'Cuántos auditores de IA independientes miran el PDF — coinciden en problemas reales y discrepan en el ruido, así que más auditores significan menos falsas alarmas. 5 es el punto ideal; súbelo para documentos de alto riesgo de cumplimiento, bájalo para revisiones rápidas.',
  'pdf_audit_view_target_score_slider': 'El puntaje que quieres que alcance el PDF remediado — 90 es un sólido aprobado WCAG 2.1 AA, 95+ es casi perfecto, 70 es un piso útil para documentos escaneados. Combínalo con Continuar automáticamente para que el pipeline siga trabajando hasta alcanzar el puntaje.',
  'pdf_audit_view_max_fix_passes_slider': 'Cuántas rondas de reparación automática se le permite ejecutar al pipeline antes de detenerse. 8 es el valor predeterminado; bájalo para limitar el costo en el plan auto-alojado, o ponlo en 0 para omitir la auto-reparación por completo (solo auditoría).',
  'pdf_audit_view_auto_continue_toggle': 'Cuando está activado, el pipeline sigue haciendo rondas extra de reparación (hasta 3 más) hasta alcanzar el Puntaje Meta, luego se detiene solo. Apágalo si quieres exactamente una pasada y un resultado único para inspeccionar.',
  'pdf_audit_view_polish_passes_slider': 'Rondas extra de limpieza después de las reparaciones de accesibilidad reales — ajusta espaciado, encabezados, pulido visual. 0 omite, 2 es estándar, 3 es para documentos que van a impresión o a audiencias externas.',
  'pdf_audit_view_branding_panel': 'Opcional — controla cómo se ve el PDF remediado: colores de marca y estilo de diseño general. Omite para el aspecto accesible predeterminado, o despliega si el documento necesita coincidir con la marca de una escuela o distrito.',
  'pdf_audit_view_brand_mode_auto_btn': 'Saca los colores de marca del PDF que subiste para que la versión remediada se parezca al original. Mejor predeterminado — mantiene el documento reconocible para el personal y las familias.',
  'pdf_audit_view_brand_mode_upload_input': 'Sube una hoja de marca, logotipo o guía de estilo aparte (imagen o PDF) y el pipeline saca colores y fuentes de ella. Útil cuando el PDF original es de aspecto simple pero necesita coincidir con la marca del distrito.',
  'pdf_audit_view_brand_mode_none_btn': 'Omite los colores de marca por completo y usa la paleta accesible incorporada. Elige esto para hojas de trabajo genéricas, o cuando los colores originales no cumplen el contraste y no necesitas preservar el aspecto.',
  'pdf_audit_results_tab_remediation_btn': 'Muestra los resultados de la auditoría después de que AlloFlow remedió el PDF. Usa esta pestaña para ver el puntaje mejorado y qué problemas ya están corregidos.',
  'pdf_audit_results_tab_original_btn': 'Cambia de regreso a la auditoría del PDF original antes de que AlloFlow arreglara algo. Útil para comparar puntajes de antes vs. después en paralelo.',
  'pdf_audit_results_score_badge': 'El puntaje general de accesibilidad de tu PDF de 0 a 100. Verde (80+) está cerca de WCAG AA, ámbar (50-79) necesita trabajo, rojo (<50) tiene barreras grandes para estudiantes que usan lectores de pantalla o tecnología de apoyo.',
  'pdf_audit_results_reliability_details': 'Despliega para ver qué tan seguros estaban los auditores de IA con este puntaje. Múltiples pasadas de IA corren en paralelo — un acuerdo estrecho significa que el puntaje es confiable, un amplio desacuerdo significa que revises los problemas individualmente tú mismo.',
  'pdf_audit_results_score_breakdown_details': 'Despliega para ver exactamente cómo se calculó el puntaje — cuántas verificaciones se ejecutaron, qué se descontó por problema y cómo se promediaron los puntajes de la rúbrica de IA y axe-core. Esta es la capa de transparencia detrás del número titular.',
  'pdf_audit_results_score_how_ai_details': 'Despliega para ver qué tan severamente califica la IA cada problema: descuentos más grandes para problemas críticos que bloquean a usuarios de lectores de pantalla, descuentos más pequeños para los menores, y puntos recuperados por verificaciones que pasan.',
  'pdf_audit_results_score_how_axe_details': 'Despliega para ver cómo el verificador axe-core (el mismo motor que usan los auditores profesionales de accesibilidad) calificó tu PDF, con los IDs exactos de regla WCAG que fallaron.',
  'pdf_audit_results_issue_explain': 'Haz clic para leer qué bloquea realmente este problema para los estudiantes y cómo aplica la regla WCAG. Incluye un enlace a la explicación oficial de WCAG si quieres profundizar.',
  'pdf_audit_results_image_failures_details': 'Despliega para ver cualquier imagen que se haya perdido durante la remediación. Cada fila ofrece un botón Regenerar de un clic para que ninguna figura se pierda en silencio.',
  'pdf_audit_results_image_regenerate_btn': 'Recrea esta imagen perdida usando IA basándose en su descripción guardada. La nueva imagen aterriza directamente de vuelta en el documento — sin necesidad de subida manual.',
  'pdf_audit_view_report_menu_btn': 'Abre el menú de reportes para descargar un reporte de accesibilidad en diferentes formatos — estilo Adobe para oficiales de cumplimiento, PDF con formato para uso general, JSON para investigación, o un rastro firmado para registros de auditoría.',
  'pdf_audit_view_adobe_report_btn': 'Descarga un reporte con el formato del Verificador de Accesibilidad de Adobe, calificado contra PDF/UA-1 (el estándar federal de accesibilidad para PDFs). Lo mejor para compartir con oficiales de cumplimiento o adjuntar a una presentación de Título II / 504.',
  'pdf_audit_view_tierb_diff_view_btn': 'Revisa las palabras que se perdieron durante el último guardado antes de decidir si correr una pasada de restauración. Solo lectura — no se cambia nada hasta que elijas restaurar.',
  'pdf_audit_view_tierb_rerun_restore_btn': 'Empalma las palabras fuente perdidas de vuelta en el documento y reconstruye el PDF etiquetado. Las palabras que no se pueden colocar con seguridad terminan en una sección de Recuperación de Contenido para que nada se pierda — el conteo residual antes y después siempre se muestra para que veas si ayudó.',
  'pdf_audit_view_formatted_report_btn': 'Abre un reporte de accesibilidad antes/después imprimible en una nueva pestaña — haz clic en Guardar como PDF en el banner para conservar una copia para tus registros o una reunión con padres.',
  'pdf_audit_view_html_report_btn': 'Descarga el reporte antes/después como un archivo HTML que puedes alojar en un sitio web o editar. El contenido coincide con la versión PDF imprimible.',
  'pdf_audit_view_json_data_btn': 'Exporta los números crudos de auditoría y los datos regla por regla como JSON. Úsalo cuando quieras analizar resultados de accesibilidad en una hoja de cálculo, cuaderno de investigación u otra herramienta.',
  'pdf_audit_view_audit_trail_signed_btn': 'Genera un rastro de auditoría autoverificable (un archivo HTML con un botón integrado Verificar Integridad que detecta manipulación). Bueno como evidencia de cumplimiento — ten en cuenta que es una firma del lado del navegador, no una legalmente vinculante.',
  'pdf_audit_view_save_project_btn': 'Guarda tu trabajo de remediación — HTML accesible, puntajes, configuración, progreso página por página — en un archivo portátil. Reábrelo con Cargar Proyecto para seguir editando sin volver a ejecutar la IA.',
  'pdf_audit_view_load_project_btn': 'Reabre un archivo de proyecto que guardaste antes. Trae de vuelta el HTML remediado, los puntajes y cualquier rango de páginas ya completado — retoma exactamente donde lo dejaste.',
  'pdf_audit_view_save_template_btn': 'Guarda la estructura accesible del documento (esquema de encabezados, tablas, listas, puntos de referencia) como una plantilla reutilizable. Úsala en el Constructor de Documentos para iniciar nuevos documentos — IEPs, programas — ya pre-estructurados para accesibilidad.',
  'pdf_audit_alt_formats_summary': 'Despliega para formatos alternativos — ePub, Braille electrónico, texto plano, Markdown — para estudiantes que necesitan un tipo de archivo distinto a PDF o HTML.',
  'pdf_audit_alt_formats_epub_btn': 'Guarda el documento remediado como un archivo ePub con tabla de contenidos y metadatos de accesibilidad. Funciona en Kindle, Apple Books y la mayoría de los lectores móviles — los estudiantes pueden cambiar tamaño de fuente, color y velocidad de lectura.',
  'pdf_audit_alt_formats_braille_btn': 'Guarda un archivo Braille de Grado 1 (sin contracciones) que puede ser impreso en una impresora Braille o enviado a una pantalla Braille refrescable. Para las contracciones de Grado 2, entrega el archivo a un TVI (maestro de estudiantes con discapacidades visuales) para terminarlo.',
  'pdf_audit_alt_formats_text_btn': 'Guarda un archivo .txt plano con todo el formato eliminado — el formato más fácil para lectores de pantalla, conversión a letra grande, o pegar en otra herramienta.',
  'pdf_audit_alt_formats_markdown_btn': 'Guarda el documento como Markdown — entra limpiamente en páginas de Canvas, Schoology o D2L, Google Docs (pegando), wikis y notas estilo GitHub sin perder encabezados ni enlaces.',
};

// Spanish (Castilian). High-confidence — same Spanish, minor regional adjustments.
T.spanish_castilian = {
  'pdf_audit_view_web_url_input': 'Pega la dirección de la página web que quieres comprobar (por ejemplo https://tudistrito.org/manual), luego haz clic en Obtener para descargar su HTML y así poder auditarlo y remediarlo.',
  'pdf_audit_view_web_fetch_btn': 'Descarga la página de la URL de arriba y coloca su HTML en el cuadro de abajo. Si el sitio bloquea la descarga, pega el código fuente de la página directamente en el cuadro HTML.',
  'pdf_audit_view_web_html_textarea': 'El HTML que se está auditando — colocado por Obtener o pegado por ti. Puedes editarlo aquí antes de auditar (por ejemplo, quitar una barra de navegación que no te pertenece).',
  'pdf_audit_view_web_audit_btn': 'Puntúa la página según WCAG 2.1 AA usando tanto un auditor de IA como el motor axe-core (el mismo motor que utilizan los auditores profesionales). No se cambia nada — utiliza esto cuando solo quieras saber cómo está la página hoy.',
  'pdf_audit_view_web_remediate_btn': 'Puntúa la página, luego reescribe el HTML para arreglar lo que pueda (contraste, etiqueta de idioma, enlace de salto, puntos de referencia) y te da una copia accesible para descargar. Revisa siempre el resultado tú mismo antes de publicar.',
  'pdf_audit_view_batch_dropzone': 'Arrastra archivos PDF desde tu escritorio o carpeta de descargas directamente a este cuadro para añadirlos a la cola de lote. Los archivos que no sean PDF se ignoran.',
  'pdf_audit_view_batch_browse_btn': 'Abre el selector de archivos para elegir uno o varios PDFs. Utiliza esto si arrastrar archivos no es fácil (dispositivo táctil, lector de pantalla, baja visión, o un Chromebook).',
  'pdf_audit_view_batch_resume_btn': 'Continúa tu último lote donde se quedó — los PDFs ya terminados se conservan y solo se vuelven a ejecutar los que no terminaron. Utiliza esto cuando un lote se cortó (pestaña cerrada, recarga, caída).',
  'pdf_audit_view_batch_discard_btn': 'Descarta el progreso guardado de tu último lote interrumpido — el banner desaparece y los resultados en caché se eliminan del navegador.',
  'pdf_audit_view_batch_clear_all_btn': 'Elimina todos los PDFs de la cola para que puedas empezar de nuevo. Solo disponible antes de pulsar Iniciar Lote.',
  'pdf_audit_view_batch_row_retry_btn': 'Vuelve a ejecutar solo este archivo fallido sin tocar el resto del lote. Pasa primero el cursor sobre la X roja para leer por qué falló — si es un problema estructural (PDF dañado, escaneo solo de imágenes), reintentar no ayudará.',
  'pdf_audit_view_batch_row_remove_btn': 'Quita este PDF de la cola para que el lote lo omita. Solo disponible antes de que el lote esté ejecutándose.',
  'pdf_audit_view_batch_stop_btn': 'Pide al lote que se detenga después de que termine el archivo que está procesando ahora mismo. Los PDFs ya terminados se quedan terminados — no perderás trabajo concluido y puedes reanudar el resto después.',
  'pdf_audit_view_batch_retry_all_failed_btn': 'Vuelve a poner en cola cada PDF que falló y los ejecuta de nuevo. Los archivos ya completados no se tocan. Vale la pena intentarlo una vez si los fallos parecen errores de red intermitentes; no insistas con PDFs realmente dañados.',
  'pdf_audit_view_batch_start_btn': 'Inicia la auditoría y reparación de cada PDF en la cola. Aparece primero una confirmación con una estimación de llamadas a la IA (y coste, en el plan auto-alojado) para que decidas antes de lanzarlo.',
  'pdf_audit_view_batch_download_zip_btn': 'Descarga cada PDF remediado correctamente como un único archivo ZIP. Útil para devolver una carpeta entera a un docente o contacto del distrito de una sola vez.',
  'pdf_audit_view_batch_new_batch_btn': 'Limpia el lote terminado para que puedas soltar un nuevo conjunto de PDFs. Cualquier ZIP que ya hayas descargado se queda en tu ordenador — esto solo reinicia la pantalla.',
  'pdf_audit_view_batch_dashboard_btn': 'Abre un panel de cumplimiento imprimible en una nueva pestaña — puntuación media, cuántos PDFs alcanzaron 90+, los problemas WCAG más comunes. Útil para compartir con un administrador o adjuntar a un registro de Título II / 504.',
  'pdf_audit_view_settings_panel': 'Ajustes para el pipeline de auditoría y remediación. Los valores predeterminados son sensatos — solo cámbialos si la ejecución estándar no te está dando lo que necesitas (más exhaustividad, menor coste, otro punto de parada).',
  'pdf_audit_view_audit_passes_slider': 'Cuántos auditores de IA independientes revisan el PDF — coinciden en problemas reales y discrepan en el ruido, así que más auditores significan menos falsas alarmas. 5 es el punto óptimo; súbelo para documentos de alto riesgo de cumplimiento, bájalo para revisiones rápidas.',
  'pdf_audit_view_target_score_slider': 'La puntuación que quieres que alcance el PDF remediado — 90 es un sólido aprobado WCAG 2.1 AA, 95+ es casi perfecto, 70 es un suelo útil para documentos escaneados. Combínalo con Continuar automáticamente para que el pipeline siga trabajando hasta alcanzar la puntuación.',
  'pdf_audit_view_max_fix_passes_slider': 'Cuántas rondas de reparación automática se permiten al pipeline antes de detenerse. 8 es el valor predeterminado; bájalo para limitar el coste en el plan auto-alojado, o ponlo en 0 para omitir la auto-reparación por completo (solo auditoría).',
  'pdf_audit_view_auto_continue_toggle': 'Cuando está activado, el pipeline sigue haciendo rondas extra de reparación (hasta 3 más) hasta alcanzar la Puntuación Objetivo, luego se detiene solo. Apágalo si quieres exactamente una pasada y un resultado único para inspeccionar.',
  'pdf_audit_view_polish_passes_slider': 'Rondas extra de limpieza tras las reparaciones de accesibilidad reales — ajusta espaciado, encabezados, acabado visual. 0 omite, 2 es estándar, 3 es para documentos que van a imprenta o a audiencias externas.',
  'pdf_audit_view_branding_panel': 'Opcional — controla el aspecto del PDF remediado: colores de marca y estilo de diseño general. Omite para el aspecto accesible predeterminado, o despliega si el documento necesita coincidir con la marca de un centro o distrito.',
  'pdf_audit_view_brand_mode_auto_btn': 'Extrae los colores de marca del PDF que subiste para que la versión remediada se parezca al original. Mejor predeterminado — mantiene el documento reconocible para el personal y las familias.',
  'pdf_audit_view_brand_mode_upload_input': 'Sube una hoja de marca, logotipo o guía de estilo aparte (imagen o PDF) y el pipeline extrae colores y fuentes de ella. Útil cuando el PDF original tiene un aspecto sencillo pero necesita coincidir con la marca del distrito.',
  'pdf_audit_view_brand_mode_none_btn': 'Omite los colores de marca por completo y usa la paleta accesible incorporada. Elige esto para fichas genéricas, o cuando los colores originales no cumplen el contraste y no necesitas preservar el aspecto.',
  'pdf_audit_results_tab_remediation_btn': 'Muestra los resultados de la auditoría después de que AlloFlow remedió el PDF. Usa esta pestaña para ver la puntuación mejorada y qué problemas ya están corregidos.',
  'pdf_audit_results_tab_original_btn': 'Cambia de vuelta a la auditoría del PDF original antes de que AlloFlow arreglara nada. Útil para comparar puntuaciones antes y después en paralelo.',
  'pdf_audit_results_score_badge': 'La puntuación general de accesibilidad de tu PDF de 0 a 100. Verde (80+) está cerca de WCAG AA, ámbar (50-79) necesita trabajo, rojo (<50) tiene barreras importantes para estudiantes que usan lectores de pantalla o tecnología de apoyo.',
  'pdf_audit_results_reliability_details': 'Despliega para ver lo seguros que estaban los auditores de IA con esta puntuación. Varias pasadas de IA se ejecutan en paralelo — un acuerdo estrecho significa que la puntuación es fiable, un amplio desacuerdo significa que revises los problemas individualmente tú mismo.',
  'pdf_audit_results_score_breakdown_details': 'Despliega para ver exactamente cómo se calculó la puntuación — cuántas comprobaciones se ejecutaron, qué se descontó por problema y cómo se promediaron las puntuaciones de la rúbrica de IA y axe-core. Esta es la capa de transparencia tras el número titular.',
  'pdf_audit_results_score_how_ai_details': 'Despliega para ver con qué dureza puntúa la IA cada problema: descuentos mayores para problemas críticos que bloquean a usuarios de lectores de pantalla, descuentos menores para los menores, y puntos recuperados por comprobaciones que pasan.',
  'pdf_audit_results_score_how_axe_details': 'Despliega para ver cómo el verificador axe-core (el mismo motor que utilizan los auditores profesionales de accesibilidad) puntuó tu PDF, con los IDs exactos de regla WCAG que fallaron.',
  'pdf_audit_results_issue_explain': 'Haz clic para leer qué bloquea realmente este problema para los estudiantes y cómo se aplica la regla WCAG. Incluye un enlace a la explicación oficial de WCAG por si quieres profundizar.',
  'pdf_audit_results_image_failures_details': 'Despliega para ver cualquier imagen que se haya perdido durante la remediación. Cada fila ofrece un botón Regenerar de un solo clic para que ninguna figura se pierda en silencio.',
  'pdf_audit_results_image_regenerate_btn': 'Recrea esta imagen perdida usando IA basándose en su descripción guardada. La nueva imagen aterriza directamente de vuelta en el documento — sin necesidad de subida manual.',
  'pdf_audit_view_report_menu_btn': 'Abre el menú de informes para descargar un informe de accesibilidad en distintos formatos — estilo Adobe para oficiales de cumplimiento, PDF con formato para uso general, JSON para investigación, o un rastro firmado para registros de auditoría.',
  'pdf_audit_view_adobe_report_btn': 'Descarga un informe con el formato del Comprobador de Accesibilidad de Adobe, puntuado contra PDF/UA-1 (el estándar federal de accesibilidad para PDFs). Lo mejor para compartir con oficiales de cumplimiento o adjuntar a una presentación de Título II / 504.',
  'pdf_audit_view_tierb_diff_view_btn': 'Revisa las palabras que se perdieron durante el último guardado antes de decidir si ejecutar una pasada de restauración. Solo lectura — no se cambia nada hasta que elijas restaurar.',
  'pdf_audit_view_tierb_rerun_restore_btn': 'Inserta las palabras fuente que faltan de vuelta en el documento y reconstruye el PDF etiquetado. Las palabras que no se pueden colocar con seguridad terminan en una sección de Recuperación de Contenido para que nada se pierda — el recuento residual antes y después siempre se muestra para que veas si ha ayudado.',
  'pdf_audit_view_formatted_report_btn': 'Abre un informe de accesibilidad antes/después imprimible en una nueva pestaña — haz clic en Guardar como PDF en el banner para conservar una copia para tus registros o una reunión con familias.',
  'pdf_audit_view_html_report_btn': 'Descarga el informe antes/después como un archivo HTML que puedes alojar en un sitio web o editar. El contenido coincide con la versión PDF imprimible.',
  'pdf_audit_view_json_data_btn': 'Exporta los números brutos de la auditoría y los datos regla por regla como JSON. Úsalo cuando quieras analizar los resultados de accesibilidad en una hoja de cálculo, cuaderno de investigación u otra herramienta.',
  'pdf_audit_view_audit_trail_signed_btn': 'Genera un rastro de auditoría autoverificable (un archivo HTML con un botón integrado Verificar Integridad que detecta manipulaciones). Bueno como evidencia de cumplimiento — ten en cuenta que es una firma del lado del navegador, no una legalmente vinculante.',
  'pdf_audit_view_save_project_btn': 'Guarda tu trabajo de remediación — HTML accesible, puntuaciones, ajustes, progreso página a página — en un archivo portátil. Reábrelo con Cargar Proyecto para seguir editando sin volver a ejecutar la IA.',
  'pdf_audit_view_load_project_btn': 'Reabre un archivo de proyecto que guardaste antes. Trae de vuelta el HTML remediado, las puntuaciones y cualquier rango de páginas ya completado — retoma exactamente donde lo dejaste.',
  'pdf_audit_view_save_template_btn': 'Guarda la estructura accesible del documento (esquema de encabezados, tablas, listas, puntos de referencia) como una plantilla reutilizable. Úsala en el Constructor de Documentos para empezar nuevos documentos — IEPs, programas — ya pre-estructurados para accesibilidad.',
  'pdf_audit_alt_formats_summary': 'Despliega para formatos alternativos — ePub, Braille electrónico, texto plano, Markdown — para estudiantes que necesitan un tipo de archivo distinto a PDF o HTML.',
  'pdf_audit_alt_formats_epub_btn': 'Guarda el documento remediado como un archivo ePub con índice de contenidos y metadatos de accesibilidad. Funciona en Kindle, Apple Books y la mayoría de lectores móviles — los estudiantes pueden cambiar el tamaño de fuente, color y velocidad de lectura.',
  'pdf_audit_alt_formats_braille_btn': 'Guarda un archivo Braille de Grado 1 (sin contracciones) que puede ser impreso en una impresora Braille o enviado a una pantalla Braille refrescable. Para las contracciones de Grado 2, entrega el archivo a un TVI (maestro de estudiantes con discapacidades visuales) para terminarlo.',
  'pdf_audit_alt_formats_text_btn': 'Guarda un archivo .txt plano con todo el formato eliminado — el formato más fácil para lectores de pantalla, conversión a letra grande, o para pegar en otra herramienta.',
  'pdf_audit_alt_formats_markdown_btn': 'Guarda el documento como Markdown — entra limpiamente en páginas de Canvas, Schoology o D2L, Google Docs (pegando), wikis y notas estilo GitHub sin perder encabezados ni enlaces.',
};

// French. High-confidence.
T.french = {
  'pdf_audit_view_web_url_input': "Collez l'adresse de la page web que vous voulez vérifier (par exemple https://votredistrict.org/manuel), puis cliquez sur Récupérer pour charger son HTML afin de pouvoir l'auditer et le remédier.",
  'pdf_audit_view_web_fetch_btn': "Télécharge la page de l'URL ci-dessus et place son HTML dans la zone en dessous. Si le site bloque le téléchargement, collez vous-même le code source de la page dans la zone HTML.",
  'pdf_audit_view_web_html_textarea': "Le HTML en cours d'audit — déposé par Récupérer ou collé par vous. Vous pouvez le modifier ici avant d'auditer (par exemple, retirer une barre de navigation qui ne vous appartient pas).",
  'pdf_audit_view_web_audit_btn': "Note la page selon WCAG 2.1 AA en utilisant à la fois un auditeur IA et le moteur axe-core (le même moteur qu'utilisent les auditeurs professionnels). Rien n'est modifié — utilisez ceci quand vous voulez seulement savoir où en est la page aujourd'hui.",
  'pdf_audit_view_web_remediate_btn': "Note la page, puis réécrit le HTML pour corriger ce qu'il peut (contraste, balise de langue, lien d'évitement, repères) et vous donne une copie accessible à télécharger. Vérifiez toujours le résultat vous-même avant publication.",
  'pdf_audit_view_batch_dropzone': "Glissez les fichiers PDF de votre bureau ou de votre dossier de téléchargements directement sur cette boîte pour les ajouter à la file d'attente de lot. Les fichiers non-PDF sont ignorés.",
  'pdf_audit_view_batch_browse_btn': "Ouvre votre sélecteur de fichiers pour choisir un ou plusieurs PDFs. Utilisez ceci si glisser des fichiers n'est pas facile (appareil tactile, lecteur d'écran, basse vision, ou un Chromebook).",
  'pdf_audit_view_batch_resume_btn': "Reprend votre dernier lot là où il s'est arrêté — les PDFs déjà terminés sont conservés et seuls ceux qui n'ont pas fini sont relancés. Utilisez ceci quand un lot a été interrompu (onglet fermé, rechargement, plantage).",
  'pdf_audit_view_batch_discard_btn': "Jette la progression enregistrée de votre dernier lot interrompu — la bannière disparaît et les résultats en cache sont supprimés de votre navigateur.",
  'pdf_audit_view_batch_clear_all_btn': "Retire tous les PDFs de la file pour que vous puissiez recommencer. Disponible uniquement avant que vous n'appuyiez sur Démarrer le Lot.",
  'pdf_audit_view_batch_row_retry_btn': "Réexécute uniquement ce fichier ayant échoué sans toucher au reste du lot. Survolez d'abord la croix rouge pour lire pourquoi il a échoué — s'il s'agit d'un problème structurel (PDF corrompu, numérisation purement image), réessayer n'aidera pas.",
  'pdf_audit_view_batch_row_remove_btn': "Retire ce PDF de la file pour que le lot le saute. Disponible uniquement avant que le lot ne tourne.",
  'pdf_audit_view_batch_stop_btn': "Demande au lot de s'arrêter après que le fichier en cours soit terminé. Les PDFs déjà terminés restent terminés — vous ne perdrez pas le travail achevé, et vous pourrez reprendre le reste plus tard.",
  'pdf_audit_view_batch_retry_all_failed_btn': "Remet en file chaque PDF qui a échoué et les relance. Les fichiers déjà réussis ne sont pas touchés. Cela vaut un essai si les échecs ressemblent à des erreurs réseau intermittentes ; ne vous obstinez pas avec des PDFs vraiment cassés.",
  'pdf_audit_view_batch_start_btn': "Lance l'audit et la correction de chaque PDF dans la file. Une confirmation apparaît d'abord avec une estimation des appels IA (et du coût, sur le plan auto-hébergé) afin que vous puissiez décider avant de lancer.",
  'pdf_audit_view_batch_download_zip_btn': "Télécharge chaque PDF remédié avec succès dans un seul fichier ZIP. Pratique pour rendre un dossier entier à un enseignant ou un contact du district en une seule fois.",
  'pdf_audit_view_batch_new_batch_btn': "Vide le lot terminé pour que vous puissiez déposer un nouvel ensemble de PDFs. Tout ZIP que vous avez déjà téléchargé reste sur votre ordinateur — ceci réinitialise simplement l'écran.",
  'pdf_audit_view_batch_dashboard_btn': "Ouvre un tableau de bord de conformité imprimable dans un nouvel onglet — score moyen, combien de PDFs ont atteint 90+, les problèmes WCAG les plus fréquents. Utile à partager avec un administrateur ou à joindre à un dossier Titre II / 504.",
  'pdf_audit_view_settings_panel': "Boutons de réglage pour le pipeline d'audit et de remédiation. Les valeurs par défaut sont sensées — ne les changez que si l'exécution standard ne vous donne pas ce dont vous avez besoin (plus de profondeur, coût plus bas, autre point d'arrêt).",
  'pdf_audit_view_audit_passes_slider': "Combien d'auditeurs IA indépendants regardent le PDF — ils s'accordent sur les vrais problèmes et divergent sur le bruit, donc plus d'auditeurs signifie moins de fausses alertes. 5 est le bon équilibre ; augmentez pour des documents à fort enjeu de conformité, diminuez pour des vérifications rapides.",
  'pdf_audit_view_target_score_slider': "Le score que vous voulez que le PDF remédié atteigne — 90 est un solide passage WCAG 2.1 AA, 95+ est quasi-parfait, 70 est un plancher utile pour les documents numérisés. Combinez avec Continuation automatique pour laisser le pipeline travailler jusqu'à atteindre le score.",
  'pdf_audit_view_max_fix_passes_slider': "Combien de tours de correction automatique le pipeline a le droit d'exécuter avant de s'arrêter. 8 est la valeur par défaut ; baissez pour plafonner le coût sur le plan auto-hébergé, ou mettez à 0 pour ignorer la correction automatique entièrement (audit seulement).",
  'pdf_audit_view_auto_continue_toggle': "Quand c'est activé, le pipeline continue à faire des tours supplémentaires de correction (jusqu'à 3 de plus) jusqu'à atteindre le Score Cible, puis s'arrête de lui-même. Désactivez si vous voulez exactement une passe et un seul résultat à inspecter.",
  'pdf_audit_view_polish_passes_slider': "Tours de nettoyage supplémentaires après les vraies corrections d'accessibilité — resserre l'espacement, les titres, le rendu visuel. 0 saute, 2 est standard, 3 est pour les documents partant à l'impression ou destinés à des publics externes.",
  'pdf_audit_view_branding_panel': "Optionnel — contrôle l'apparence du PDF remédié : couleurs de marque et style de design global. Sautez pour le look accessible par défaut, ou ouvrez si le document doit correspondre à la marque d'une école ou d'un district.",
  'pdf_audit_view_brand_mode_auto_btn': "Extrait les couleurs de marque du PDF que vous avez chargé pour que la version remédiée ressemble à l'original. Meilleur défaut — garde le document reconnaissable pour le personnel et les familles.",
  'pdf_audit_view_brand_mode_upload_input': "Chargez une feuille de marque, un logo ou un guide de style séparé (image ou PDF) et le pipeline en extrait couleurs et polices. Utile quand le PDF original a un look sobre mais doit correspondre à la marque du district.",
  'pdf_audit_view_brand_mode_none_btn': "Sautez complètement les couleurs de marque et utilisez la palette accessible intégrée. Choisissez ceci pour des fiches génériques, ou quand les couleurs originales échouent au contraste et que vous n'avez pas besoin de préserver l'apparence.",
  'pdf_audit_results_tab_remediation_btn': "Montre les résultats d'audit après qu'AlloFlow a remédié le PDF. Utilisez cet onglet pour voir le score amélioré et quels problèmes sont maintenant corrigés.",
  'pdf_audit_results_tab_original_btn': "Revient à l'audit du PDF original avant qu'AlloFlow ne corrige quoi que ce soit. Utile pour comparer les scores avant/après côte à côte.",
  'pdf_audit_results_score_badge': "Le score global d'accessibilité de votre PDF de 0 à 100. Vert (80+) est proche de WCAG AA, ambre (50-79) a besoin de travail, rouge (<50) a des barrières majeures pour les élèves utilisant des lecteurs d'écran ou des technologies d'assistance.",
  'pdf_audit_results_reliability_details': "Déroulez pour voir à quel point les auditeurs IA étaient confiants dans ce score. Plusieurs passes IA tournent en parallèle — un accord serré signifie que le score est fiable, un large écart signifie qu'il faut revoir les problèmes vous-même.",
  'pdf_audit_results_score_breakdown_details': "Déroulez pour voir exactement comment le score a été calculé — combien de vérifications ont tourné, ce qui a été retiré par problème, et comment les scores de la grille IA et d'axe-core ont été moyennés. C'est la couche de transparence derrière le chiffre titre.",
  'pdf_audit_results_score_how_ai_details': "Déroulez pour voir à quel point l'IA note durement chaque problème : retraits plus gros pour les problèmes critiques qui bloquent les utilisateurs de lecteurs d'écran, retraits plus petits pour les mineurs, et points récupérés pour les vérifications qui passent.",
  'pdf_audit_results_score_how_axe_details': "Déroulez pour voir comment le vérificateur axe-core (le même moteur qu'utilisent les auditeurs d'accessibilité professionnels) a noté votre PDF, avec les identifiants exacts des règles WCAG qui ont échoué.",
  'pdf_audit_results_issue_explain': "Cliquez pour lire ce que ce problème bloque réellement pour les élèves et comment la règle WCAG s'applique. Inclut un lien vers l'explication officielle WCAG si vous voulez approfondir.",
  'pdf_audit_results_image_failures_details': "Déroulez pour voir toute image qui aurait été perdue lors de la remédiation. Chaque ligne propose un bouton Régénérer en un clic pour qu'aucune figure ne soit silencieusement perdue.",
  'pdf_audit_results_image_regenerate_btn': "Recrée cette image manquante en utilisant l'IA à partir de sa description enregistrée. La nouvelle image atterrit directement dans le document — pas besoin de téléversement manuel.",
  'pdf_audit_view_report_menu_btn': "Ouvre le menu de rapport pour télécharger un rapport d'accessibilité dans différents formats — style Adobe pour les responsables de conformité, PDF formaté pour le partage général, JSON pour la recherche, ou une trace signée pour les archives d'audit.",
  'pdf_audit_view_adobe_report_btn': "Télécharge un rapport au format du Vérificateur d'Accessibilité d'Adobe, noté selon PDF/UA-1 (la norme fédérale d'accessibilité pour les PDFs). Idéal pour partager avec les responsables de conformité ou joindre à un dépôt Titre II / 504.",
  'pdf_audit_view_tierb_diff_view_btn': "Examinez les mots qui ont disparu lors du dernier enregistrement avant de décider de lancer une passe de restauration. Lecture seule — rien n'est modifié tant que vous ne choisissez pas de restaurer.",
  'pdf_audit_view_tierb_rerun_restore_btn': "Réinsère les mots source manquants dans le document et reconstruit le PDF balisé. Les mots qui ne peuvent pas être placés en sécurité finissent dans une section Récupération de Contenu pour que rien ne soit perdu — le nombre résiduel avant et après est toujours affiché pour que vous voyiez si ça a aidé.",
  'pdf_audit_view_formatted_report_btn': "Ouvre un rapport d'accessibilité avant/après imprimable dans un nouvel onglet — cliquez sur Enregistrer en PDF dans la bannière pour garder une copie pour vos archives ou une réunion avec les parents.",
  'pdf_audit_view_html_report_btn': "Télécharge le rapport avant/après comme un fichier HTML que vous pouvez héberger sur un site ou modifier. Le contenu correspond à la version PDF imprimable.",
  'pdf_audit_view_json_data_btn': "Exporte les chiffres bruts d'audit et les données règle par règle en JSON. Utilisez-le quand vous voulez analyser les résultats d'accessibilité dans un tableur, un cahier de recherche, ou un autre outil.",
  'pdf_audit_view_audit_trail_signed_btn': "Génère une trace d'audit auto-vérifiable (un fichier HTML avec un bouton Vérifier l'Intégrité intégré qui détecte les altérations). Utile comme preuve de conformité — notez qu'il s'agit d'une signature côté navigateur, pas légalement contraignante.",
  'pdf_audit_view_save_project_btn': "Sauvegarde votre travail de remédiation — HTML accessible, scores, paramètres, progression page par page — dans un fichier portable. Réouvrez avec Charger Projet pour continuer à éditer sans relancer l'IA.",
  'pdf_audit_view_load_project_btn': "Rouvre un fichier de projet que vous avez sauvegardé plus tôt. Ramène le HTML remédié, les scores et toutes les plages de pages déjà terminées — reprend exactement là où vous vous étiez arrêté.",
  'pdf_audit_view_save_template_btn': "Sauvegarde la structure accessible du document (plan de titres, tableaux, listes, repères) comme un modèle réutilisable. Utilisez-le dans le Constructeur de Documents pour démarrer de nouveaux documents — PEIs, syllabus — déjà pré-structurés pour l'accessibilité.",
  'pdf_audit_alt_formats_summary': "Déroulez pour les formats alternatifs — ePub, Braille électronique, texte brut, Markdown — pour les élèves qui ont besoin d'un type de fichier différent de PDF ou HTML.",
  'pdf_audit_alt_formats_epub_btn': "Sauvegarde le document remédié en fichier ePub avec table des matières et métadonnées d'accessibilité. Fonctionne sur Kindle, Apple Books, et la plupart des lecteurs mobiles — les élèves peuvent changer la taille de police, la couleur et la vitesse de lecture.",
  'pdf_audit_alt_formats_braille_btn': "Sauvegarde un fichier Braille de Grade 1 (non contracté) qui peut être embossé sur une imprimante Braille ou envoyé à un afficheur Braille rafraîchissable. Pour les contractions de Grade 2, remettez le fichier à un enseignant pour élèves déficients visuels pour finition.",
  'pdf_audit_alt_formats_text_btn': "Sauvegarde un fichier .txt brut avec toute mise en forme retirée — le format le plus facile pour les lecteurs d'écran, la conversion gros caractères, ou le collage dans un autre outil.",
  'pdf_audit_alt_formats_markdown_btn': "Sauvegarde le document en Markdown — s'intègre proprement dans les pages Canvas, Schoology, ou D2L, Google Docs (en collant), wikis, et notes style GitHub sans perdre les titres ni les liens.",
};

// French Canadian — variant of French with regional adjustments.
T.french_canadian = T.french;  // Use same translations; can be hand-tuned later

// German. High-confidence.
T.german = {
  'pdf_audit_view_web_url_input': 'Fügen Sie die Adresse der Webseite ein, die Sie prüfen möchten (zum Beispiel https://ihrdistrikt.org/handbuch), und klicken Sie dann auf Abrufen, um das HTML zu laden, damit Sie es auditieren und korrigieren können.',
  'pdf_audit_view_web_fetch_btn': 'Lädt die Seite von der URL oben herunter und legt deren HTML in das Feld darunter. Wenn die Website das Abrufen blockiert, fügen Sie den Quelltext der Seite selbst in das HTML-Feld ein.',
  'pdf_audit_view_web_html_textarea': 'Das HTML, das auditiert wird — entweder von Abrufen eingefügt oder von Ihnen eingefügt. Sie können es hier vor dem Audit bearbeiten (zum Beispiel eine Navigationsleiste entfernen, die nicht zu Ihnen gehört).',
  'pdf_audit_view_web_audit_btn': 'Bewertet die Seite nach WCAG 2.1 AA mit sowohl einem KI-Auditor als auch der axe-core-Engine (dieselbe Engine, die professionelle Auditoren verwenden). Nichts wird verändert — verwenden Sie dies, wenn Sie nur wissen möchten, wie die Seite heute dasteht.',
  'pdf_audit_view_web_remediate_btn': 'Bewertet die Seite, schreibt dann das HTML um, um zu korrigieren, was es kann (Kontrast, Sprach-Tag, Skip-Link, Landmarks) und gibt Ihnen eine zugängliche Kopie zum Download. Überprüfen Sie das Ergebnis immer selbst vor der Veröffentlichung.',
  'pdf_audit_view_batch_dropzone': 'Ziehen Sie PDF-Dateien von Ihrem Desktop oder Download-Ordner direkt auf dieses Feld, um sie zur Stapel-Warteschlange hinzuzufügen. Nicht-PDF-Dateien werden ignoriert.',
  'pdf_audit_view_batch_browse_btn': 'Öffnet Ihren Dateiauswahl-Dialog, um eine oder mehrere PDFs auszuwählen. Verwenden Sie dies, wenn das Ziehen von Dateien nicht einfach ist (Touchgerät, Screenreader, Sehbehinderung oder ein Chromebook).',
  'pdf_audit_view_batch_resume_btn': 'Setzt Ihren letzten Stapel dort fort, wo er aufgehört hat — bereits fertige PDFs bleiben erhalten und nur die, die nicht fertig wurden, werden erneut ausgeführt. Verwenden Sie dies, wenn ein Stapel unterbrochen wurde (Tab geschlossen, Neuladen, Absturz).',
  'pdf_audit_view_batch_discard_btn': 'Verwirft den gespeicherten Fortschritt Ihres letzten unterbrochenen Stapels — das Banner verschwindet und gecachte Ergebnisse werden aus Ihrem Browser gelöscht.',
  'pdf_audit_view_batch_clear_all_btn': 'Entfernt jedes PDF aus der Warteschlange, damit Sie neu beginnen können. Nur verfügbar, bevor Sie auf Stapel starten drücken.',
  'pdf_audit_view_batch_row_retry_btn': 'Führt nur diese eine fehlgeschlagene Datei erneut aus, ohne den Rest des Stapels zu berühren. Schweben Sie zuerst über das rote X, um zu lesen, warum es fehlgeschlagen ist — wenn es strukturell ist (beschädigtes PDF, reines Bildscan), hilft ein erneuter Versuch nicht.',
  'pdf_audit_view_batch_row_remove_btn': 'Entfernt dieses eine PDF aus der Warteschlange, sodass der Stapel es überspringt. Nur verfügbar, bevor der Stapel läuft.',
  'pdf_audit_view_batch_stop_btn': 'Bittet den Stapel anzuhalten, nachdem die gerade bearbeitete Datei fertig ist. Bereits abgeschlossene PDFs bleiben fertig — Sie verlieren keine fertige Arbeit, und Sie können den Rest später fortsetzen.',
  'pdf_audit_view_batch_retry_all_failed_btn': 'Stellt jedes fehlgeschlagene PDF wieder in die Warteschlange und führt sie erneut aus. Bereits erfolgreiche Dateien werden nicht angerührt. Einen Versuch wert, wenn Fehlschläge nach flüchtigen Netzwerkfehlern aussehen; bestehen Sie nicht auf wirklich kaputten PDFs.',
  'pdf_audit_view_batch_start_btn': 'Startet das Auditieren und Korrigieren jedes PDFs in der Warteschlange. Eine Bestätigung erscheint zuerst mit einer Schätzung der KI-Aufrufe (und Kosten, im selbst gehosteten Plan), damit Sie vor dem Start entscheiden können.',
  'pdf_audit_view_batch_download_zip_btn': 'Lädt jedes erfolgreich korrigierte PDF als eine einzige ZIP-Datei herunter. Praktisch, um einen ganzen Ordner auf einmal an eine Lehrkraft oder einen Distriktkontakt zurückzugeben.',
  'pdf_audit_view_batch_new_batch_btn': 'Leert den fertigen Stapel, damit Sie einen neuen Satz PDFs hineinziehen können. Jedes ZIP, das Sie bereits heruntergeladen haben, bleibt auf Ihrem Computer — dies setzt nur den Bildschirm zurück.',
  'pdf_audit_view_batch_dashboard_btn': 'Öffnet ein druckbares Compliance-Dashboard in einem neuen Tab — durchschnittliche Punktzahl, wie viele PDFs 90+ erreicht haben, die häufigsten WCAG-Probleme. Nützlich zum Teilen mit einem Administrator oder zum Anhängen an eine Title II / 504-Akte.',
  'pdf_audit_view_settings_panel': 'Stellknöpfe für die Audit- und Remediation-Pipeline. Die Standardwerte sind vernünftig — ändern Sie diese nur, wenn der Standardlauf nicht das liefert, was Sie brauchen (mehr Gründlichkeit, geringere Kosten, anderer Haltepunkt).',
  'pdf_audit_view_audit_passes_slider': 'Wie viele unabhängige KI-Auditoren das PDF betrachten — sie stimmen bei echten Problemen überein und sind bei Rauschen uneinig, also bedeuten mehr Auditoren weniger Fehlalarme. 5 ist der Sweetspot; erhöhen für hochriskante Compliance-Dokumente, verringern für Schnellprüfungen.',
  'pdf_audit_view_target_score_slider': 'Die Punktzahl, die das korrigierte PDF erreichen soll — 90 ist ein solides WCAG 2.1 AA Bestanden, 95+ ist nahezu perfekt, 70 ist ein nützlicher Boden für gescannte Dokumente. Kombinieren Sie mit Auto-Fortsetzen, damit die Pipeline weiterarbeitet, bis die Punktzahl erreicht ist.',
  'pdf_audit_view_max_fix_passes_slider': 'Wie viele Auto-Fix-Runden die Pipeline laufen darf, bevor sie stoppt. 8 ist Standard; verringern, um Kosten auf dem selbst gehosteten Plan zu begrenzen, oder auf 0 setzen, um Auto-Fix ganz zu überspringen (nur Audit).',
  'pdf_audit_view_auto_continue_toggle': 'Wenn aktiviert, macht die Pipeline weiter mit zusätzlichen Korrekturrunden (bis zu 3 weitere), bis die Zielpunktzahl erreicht ist, und stoppt dann von selbst. Ausschalten, wenn Sie genau einen Durchgang und ein einzelnes Ergebnis zum Prüfen möchten.',
  'pdf_audit_view_polish_passes_slider': 'Zusätzliche Aufräumrunden nach den eigentlichen Barrierefreiheits-Korrekturen — strafft Abstände, Überschriften, visuelle Politur. 0 überspringt, 2 ist Standard, 3 ist für Dokumente, die in den Druck oder zu externen Zielgruppen gehen.',
  'pdf_audit_view_branding_panel': 'Optional — steuert, wie das korrigierte PDF aussieht: Markenfarben und Gesamtdesignstil. Überspringen für das standardmäßige zugängliche Aussehen, oder ausklappen, wenn das Dokument der Marke einer Schule oder eines Distrikts entsprechen muss.',
  'pdf_audit_view_brand_mode_auto_btn': 'Zieht Markenfarben aus dem PDF, das Sie hochgeladen haben, damit die korrigierte Version wie das Original aussieht. Beste Voreinstellung — hält das Dokument für Personal und Familien wiedererkennbar.',
  'pdf_audit_view_brand_mode_upload_input': 'Laden Sie ein separates Markenblatt, Logo oder einen Styleguide (Bild oder PDF) hoch, und die Pipeline zieht daraus Farben und Schriften. Nützlich, wenn das Original-PDF schlicht aussieht, aber dem Distrikt-Branding entsprechen muss.',
  'pdf_audit_view_brand_mode_none_btn': 'Überspringen Sie Markenfarben ganz und verwenden Sie die eingebaute barrierefreie Palette. Wählen Sie dies für generische Arbeitsblätter, oder wenn die Originalfarben den Kontrast nicht bestehen und Sie das Aussehen nicht erhalten müssen.',
  'pdf_audit_results_tab_remediation_btn': 'Zeigt die Audit-Ergebnisse, nachdem AlloFlow das PDF korrigiert hat. Verwenden Sie diesen Tab, um die verbesserte Punktzahl und welche Probleme jetzt behoben sind zu sehen.',
  'pdf_audit_results_tab_original_btn': 'Wechselt zurück zum Audit des Original-PDFs, bevor AlloFlow irgendetwas korrigiert hat. Nützlich, um Vorher-Nachher-Punktzahlen nebeneinander zu vergleichen.',
  'pdf_audit_results_score_badge': 'Die Gesamt-Barrierefreiheitspunktzahl Ihres PDFs von 0 bis 100. Grün (80+) ist nahe an WCAG AA, gelb (50-79) braucht Arbeit, rot (<50) hat große Barrieren für Schüler, die Screenreader oder Hilfstechnologien verwenden.',
  'pdf_audit_results_reliability_details': 'Ausklappen, um zu sehen, wie sicher die KI-Auditoren bei dieser Punktzahl waren. Mehrere KI-Durchgänge laufen parallel — enge Übereinstimmung bedeutet, dass die Punktzahl vertrauenswürdig ist, weite Streuung bedeutet, dass Sie die einzelnen Probleme selbst durchgehen sollten.',
  'pdf_audit_results_score_breakdown_details': 'Ausklappen, um genau zu sehen, wie die Punktzahl berechnet wurde — wie viele Prüfungen liefen, was pro Problem abgezogen wurde, und wie die KI-Rubrik- und axe-core-Punktzahlen gemittelt wurden. Das ist die Transparenzebene hinter der Schlagzeilen-Zahl.',
  'pdf_audit_results_score_how_ai_details': 'Ausklappen, um zu sehen, wie streng die KI jedes Problem benotet: größere Abzüge für kritische Probleme, die Screenreader-Nutzer blockieren, kleinere Abzüge für geringfügige, und wiedergewonnene Punkte für bestandene Prüfungen.',
  'pdf_audit_results_score_how_axe_details': 'Ausklappen, um zu sehen, wie der axe-core-Prüfer (dieselbe Engine, die professionelle Barrierefreiheits-Auditoren verwenden) Ihr PDF benotet hat, mit den genauen WCAG-Regel-IDs, die fehlgeschlagen sind.',
  'pdf_audit_results_issue_explain': 'Klicken Sie, um zu lesen, was dieses Problem tatsächlich für Schüler blockiert und wie die WCAG-Regel zutrifft. Enthält einen Link zur offiziellen WCAG-Erklärung, falls Sie tiefer einsteigen möchten.',
  'pdf_audit_results_image_failures_details': 'Ausklappen, um Bilder zu sehen, die während der Remediation verloren gingen. Jede Zeile bietet eine Ein-Klick-Regenerieren-Schaltfläche, damit keine Abbildung still verloren geht.',
  'pdf_audit_results_image_regenerate_btn': 'Erzeugt dieses fehlende Bild mit KI auf Basis seiner gespeicherten Beschreibung neu. Das neue Bild landet direkt zurück im Dokument — kein manueller Upload nötig.',
  'pdf_audit_view_report_menu_btn': 'Öffnet das Report-Menü, um einen Barrierefreiheitsbericht in verschiedenen Formaten herunterzuladen — Adobe-Stil für Compliance-Beauftragte, formatiertes PDF für allgemeines Teilen, JSON für Forschung, oder eine signierte Spur für Audit-Aufzeichnungen.',
  'pdf_audit_view_adobe_report_btn': 'Lädt einen Bericht im Format des Adobe Accessibility Checkers herunter, bewertet gegen PDF/UA-1 (den föderalen Barrierefreiheitsstandard für PDFs). Am besten zum Teilen mit Compliance-Beauftragten oder zum Anhängen an eine Title II / 504-Einreichung.',
  'pdf_audit_view_tierb_diff_view_btn': 'Überprüfen Sie die Wörter, die beim letzten Speichern verloren gingen, bevor Sie entscheiden, einen Wiederherstellungslauf zu starten. Schreibgeschützt — nichts wird verändert, bis Sie sich für Wiederherstellen entscheiden.',
  'pdf_audit_view_tierb_rerun_restore_btn': 'Fügt die fehlenden Quellwörter wieder ins Dokument ein und baut das getaggte PDF neu auf. Wörter, die nicht sicher platziert werden können, landen in einem Inhalts-Wiederherstellungsabschnitt, damit nichts verloren geht — die Rest-Zahl vorher und nachher wird immer angezeigt, damit Sie sehen, ob es geholfen hat.',
  'pdf_audit_view_formatted_report_btn': 'Öffnet einen druckbaren Vorher/Nachher-Barrierefreiheitsbericht in einem neuen Tab — klicken Sie im Banner auf Als PDF speichern, um eine Kopie für Ihre Unterlagen oder eine Elternkonferenz aufzubewahren.',
  'pdf_audit_view_html_report_btn': 'Lädt den Vorher/Nachher-Bericht als HTML-Datei herunter, die Sie auf einer Website hosten oder bearbeiten können. Der Inhalt entspricht der druckbaren PDF-Version.',
  'pdf_audit_view_json_data_btn': 'Exportiert die rohen Audit-Zahlen und Regel-für-Regel-Daten als JSON. Verwenden Sie dies, wenn Sie Barrierefreiheitsergebnisse in einer Tabelle, einem Forschungsnotizbuch oder einem anderen Werkzeug analysieren möchten.',
  'pdf_audit_view_audit_trail_signed_btn': 'Erzeugt eine selbstverifizierende Audit-Spur (eine HTML-Datei mit eingebautem Integrität-Verifizieren-Button, der Manipulationen erkennt). Gut als Compliance-Nachweis — beachten Sie, dass es eine browserseitige Signatur ist, nicht rechtsverbindlich.',
  'pdf_audit_view_save_project_btn': 'Speichert Ihre Remediation-Arbeit — zugängliches HTML, Punktzahlen, Einstellungen, Seite-für-Seite-Fortschritt — in einer portablen Datei. Erneut öffnen mit Projekt laden, um ohne erneutes Ausführen der KI weiterzubearbeiten.',
  'pdf_audit_view_load_project_btn': 'Öffnet eine Projektdatei, die Sie früher gespeichert haben, erneut. Bringt das korrigierte HTML, die Punktzahlen und alle bereits abgeschlossenen Seitenbereiche zurück — setzt genau dort an, wo Sie aufgehört haben.',
  'pdf_audit_view_save_template_btn': 'Speichert die zugängliche Struktur des Dokuments (Überschriften-Gliederung, Tabellen, Listen, Landmarks) als wiederverwendbare Vorlage. Verwenden Sie sie im Dokumenten-Builder, um neue Dokumente zu starten — IEPs, Lehrpläne — bereits barrierefrei vorstrukturiert.',
  'pdf_audit_alt_formats_summary': 'Ausklappen für alternative Formate — ePub, elektronische Braille, einfacher Text, Markdown — für Schüler, die einen anderen Dateityp als PDF oder HTML benötigen.',
  'pdf_audit_alt_formats_epub_btn': 'Speichert das korrigierte Dokument als ePub-Datei mit Inhaltsverzeichnis und Barrierefreiheits-Metadaten. Funktioniert auf Kindle, Apple Books und den meisten mobilen Lesegeräten — Schüler können Schriftgröße, Farbe und Lesegeschwindigkeit ändern.',
  'pdf_audit_alt_formats_braille_btn': 'Speichert eine Grade-1-Braille-Datei (unverkürzt), die auf einem Brailledrucker geprägt oder an eine wiederaufladbare Braillezeile gesendet werden kann. Für Grade-2-Kürzungen geben Sie die Datei an einen TVI (Lehrer für Schüler mit Sehbehinderungen) zur Fertigstellung.',
  'pdf_audit_alt_formats_text_btn': 'Speichert eine einfache .txt-Datei mit entfernter gesamter Formatierung — das einfachste Format für Screenreader, Großdruck-Konvertierung oder zum Einfügen in ein anderes Werkzeug.',
  'pdf_audit_alt_formats_markdown_btn': 'Speichert das Dokument als Markdown — fügt sich sauber in Canvas-, Schoology- oder D2L-Seiten ein, Google Docs (per Einfügen), Wikis und GitHub-artige Notizen, ohne Überschriften oder Links zu verlieren.',
};

// Italian. High-confidence.
T.italian = {
  'pdf_audit_view_web_url_input': "Incolla l'indirizzo della pagina web che vuoi controllare (per esempio https://tuodistretto.org/manuale), poi clicca su Scarica per ottenere il suo HTML e poterlo verificare e correggere.",
  'pdf_audit_view_web_fetch_btn': "Scarica la pagina dall'URL qui sopra e mette il suo HTML nella casella sotto. Se il sito blocca lo scaricamento, incolla tu stesso il codice sorgente della pagina nella casella HTML.",
  'pdf_audit_view_web_html_textarea': "L'HTML che viene verificato — inserito da Scarica o incollato da te. Puoi modificarlo qui prima della verifica (per esempio, rimuovere una barra di navigazione che non ti appartiene).",
  'pdf_audit_view_web_audit_btn': "Valuta la pagina secondo WCAG 2.1 AA usando sia un auditor IA sia il motore axe-core (lo stesso motore usato dagli auditor professionali). Niente viene modificato — usa questo quando vuoi solo sapere com'è la pagina oggi.",
  'pdf_audit_view_web_remediate_btn': "Valuta la pagina, poi riscrive l'HTML per correggere ciò che può (contrasto, tag di lingua, link di salto, landmark) e ti dà una copia accessibile da scaricare. Ricontrolla sempre tu stesso il risultato prima di pubblicare.",
  'pdf_audit_view_batch_dropzone': "Trascina file PDF dal tuo desktop o dalla cartella dei download direttamente su questa casella per aggiungerli alla coda del lotto. File non-PDF vengono ignorati.",
  'pdf_audit_view_batch_browse_btn': "Apre il tuo selettore di file per scegliere uno o più PDF. Usa questo se trascinare file non è facile (dispositivo touch, screen reader, ipovisione, o un Chromebook).",
  'pdf_audit_view_batch_resume_btn': "Riprende il tuo ultimo lotto dove si era fermato — i PDF già completati vengono mantenuti e solo quelli che non hanno finito vengono rieseguiti. Usa questo quando un lotto è stato interrotto (scheda chiusa, ricarica, crash).",
  'pdf_audit_view_batch_discard_btn': "Scarta il progresso salvato del tuo ultimo lotto interrotto — il banner sparisce e i risultati in cache vengono eliminati dal tuo browser.",
  'pdf_audit_view_batch_clear_all_btn': "Rimuove ogni PDF dalla coda così puoi ricominciare. Disponibile solo prima di premere Avvia Lotto.",
  'pdf_audit_view_batch_row_retry_btn': "Riesegue solo questo file fallito senza toccare il resto del lotto. Passa prima sopra la X rossa per leggere perché è fallito — se è strutturale (PDF corrotto, scansione solo immagine), riprovare non aiuterà.",
  'pdf_audit_view_batch_row_remove_btn': "Rimuove questo PDF dalla coda così il lotto lo salta. Disponibile solo prima che il lotto sia in esecuzione.",
  'pdf_audit_view_batch_stop_btn': "Chiede al lotto di fermarsi dopo che il file su cui sta lavorando ora è terminato. I PDF già completati restano completati — non perderai lavoro finito, e puoi riprendere il resto più tardi.",
  'pdf_audit_view_batch_retry_all_failed_btn': "Rimette in coda ogni PDF fallito e li riesegue. I file già riusciti non vengono toccati. Vale la pena un tentativo se i fallimenti sembrano errori di rete intermittenti; non insistere con PDF veramente rotti.",
  'pdf_audit_view_batch_start_btn': "Avvia la verifica e correzione di ogni PDF in coda. Appare prima una conferma con una stima delle chiamate IA (e costo, sul piano auto-ospitato) così puoi decidere prima di lanciare.",
  'pdf_audit_view_batch_download_zip_btn': "Scarica ogni PDF corretto con successo come un singolo file ZIP. Comodo per riconsegnare un'intera cartella a un docente o contatto del distretto tutto in una volta.",
  'pdf_audit_view_batch_new_batch_btn': "Pulisce il lotto finito così puoi inserire un nuovo set di PDF. Qualsiasi ZIP già scaricato resta sul tuo computer — questo resetta solo lo schermo.",
  'pdf_audit_view_batch_dashboard_btn': "Apre un cruscotto di conformità stampabile in una nuova scheda — punteggio medio, quanti PDF hanno raggiunto 90+, i problemi WCAG più comuni. Utile per condividere con un amministratore o allegare a un registro Title II / 504.",
  'pdf_audit_view_settings_panel': "Manopole di regolazione per la pipeline di verifica e correzione. I valori predefiniti sono sensati — cambiali solo se l'esecuzione standard non sta dando quello di cui hai bisogno (più completezza, costo più basso, punto di stop diverso).",
  'pdf_audit_view_audit_passes_slider': "Quanti auditor IA indipendenti guardano il PDF — sono d'accordo sui problemi reali e in disaccordo sul rumore, quindi più auditor significano meno falsi allarmi. 5 è il punto ideale; alza per documenti di conformità ad alto rischio, abbassa per controlli rapidi.",
  'pdf_audit_view_target_score_slider': "Il punteggio che vuoi che il PDF corretto raggiunga — 90 è un solido passaggio WCAG 2.1 AA, 95+ è quasi perfetto, 70 è un utile pavimento per documenti scansionati. Combinare con Auto-continua per lasciare che la pipeline continui a lavorare fino al raggiungimento del punteggio.",
  'pdf_audit_view_max_fix_passes_slider': "Quanti round di correzione automatica la pipeline è autorizzata a eseguire prima di fermarsi. 8 è il valore predefinito; abbassa per limitare il costo sul piano auto-ospitato, o metti a 0 per saltare del tutto l'auto-correzione (solo verifica).",
  'pdf_audit_view_auto_continue_toggle': "Quando attivo, la pipeline continua a fare round extra di correzione (fino a 3 in più) finché non viene raggiunto il Punteggio Obiettivo, poi si ferma da sola. Spegni se vuoi esattamente un passaggio e un singolo risultato da ispezionare.",
  'pdf_audit_view_polish_passes_slider': "Round extra di pulizia dopo le vere correzioni di accessibilità — stringe spaziatura, intestazioni, rifinitura visiva. 0 salta, 2 è standard, 3 è per documenti che vanno in stampa o a pubblico esterno.",
  'pdf_audit_view_branding_panel': "Opzionale — controlla come appare il PDF corretto: colori del brand e stile di design complessivo. Salta per l'aspetto accessibile predefinito, o espandi se il documento deve corrispondere al brand di una scuola o distretto.",
  'pdf_audit_view_brand_mode_auto_btn': "Estrae i colori del brand dal PDF che hai caricato così la versione corretta assomiglia all'originale. Migliore predefinito — mantiene il documento riconoscibile per il personale e le famiglie.",
  'pdf_audit_view_brand_mode_upload_input': "Carica un foglio di brand separato, un logo o una guida di stile (immagine o PDF) e la pipeline ne estrae colori e font. Utile quando il PDF originale ha un aspetto semplice ma deve corrispondere al brand del distretto.",
  'pdf_audit_view_brand_mode_none_btn': "Salta del tutto i colori del brand e usa la tavolozza accessibile incorporata. Scegli questo per fogli di lavoro generici, o quando i colori originali falliscono il contrasto e non hai bisogno di preservare l'aspetto.",
  'pdf_audit_results_tab_remediation_btn': "Mostra i risultati della verifica dopo che AlloFlow ha corretto il PDF. Usa questa scheda per vedere il punteggio migliorato e quali problemi sono ora risolti.",
  'pdf_audit_results_tab_original_btn': "Torna alla verifica del PDF originale prima che AlloFlow correggesse qualcosa. Utile per confrontare punteggi prima-vs-dopo affiancati.",
  'pdf_audit_results_score_badge': "Il punteggio complessivo di accessibilità del tuo PDF da 0 a 100. Verde (80+) è vicino a WCAG AA, ambra (50-79) ha bisogno di lavoro, rosso (<50) ha barriere importanti per studenti che usano screen reader o tecnologie assistive.",
  'pdf_audit_results_reliability_details': "Espandi per vedere quanto erano confidenti gli auditor IA in questo punteggio. Più passaggi IA girano in parallelo — accordo stretto significa che il punteggio è affidabile, ampia divergenza significa rivedere i singoli problemi tu stesso.",
  'pdf_audit_results_score_breakdown_details': "Espandi per vedere esattamente come è stato calcolato il punteggio — quante verifiche sono state eseguite, cosa è stato detratto per problema, e come i punteggi della rubrica IA e di axe-core sono stati mediati. Questo è lo strato di trasparenza dietro il numero del titolo.",
  'pdf_audit_results_score_how_ai_details': "Espandi per vedere quanto duramente l'IA valuta ogni problema: detrazioni più grandi per problemi critici che bloccano gli utenti di screen reader, detrazioni più piccole per quelli minori, e punti recuperati per verifiche che passano.",
  'pdf_audit_results_score_how_axe_details': "Espandi per vedere come il verificatore axe-core (lo stesso motore usato dagli auditor di accessibilità professionali) ha valutato il tuo PDF, con gli ID esatti delle regole WCAG che hanno fallito.",
  'pdf_audit_results_issue_explain': "Clicca per leggere cosa blocca davvero questo problema per gli studenti e come si applica la regola WCAG. Include un link alla spiegazione ufficiale WCAG se vuoi approfondire.",
  'pdf_audit_results_image_failures_details': "Espandi per vedere qualsiasi immagine che sia caduta durante la correzione. Ogni riga offre un pulsante Rigenera a un clic così nessuna figura va silenziosamente persa.",
  'pdf_audit_results_image_regenerate_btn': "Ricrea questa immagine mancante usando l'IA sulla base della sua descrizione memorizzata. La nuova immagine atterra direttamente nel documento — niente upload manuale necessario.",
  'pdf_audit_view_report_menu_btn': "Apre il menu del report per scaricare un report di accessibilità in formati diversi — stile Adobe per responsabili compliance, PDF formattato per condivisione generica, JSON per ricerca, o una traccia firmata per registri di audit.",
  'pdf_audit_view_adobe_report_btn': "Scarica un report formattato come il Verificatore di Accessibilità di Adobe, valutato secondo PDF/UA-1 (lo standard federale di accessibilità per i PDF). Ideale per condividere con responsabili compliance o allegare a un deposito Title II / 504.",
  'pdf_audit_view_tierb_diff_view_btn': "Esamina le parole che sono andate mancanti durante l'ultimo salvataggio prima di decidere se eseguire un passaggio di ripristino. Sola lettura — niente viene cambiato finché non scegli di ripristinare.",
  'pdf_audit_view_tierb_rerun_restore_btn': "Reinserisce le parole sorgente mancanti nel documento e ricostruisce il PDF taggato. Le parole che non possono essere collocate in sicurezza finiscono in una sezione di Recupero Contenuti così niente va perso — il conteggio residuo prima e dopo è sempre mostrato così vedi se ha aiutato.",
  'pdf_audit_view_formatted_report_btn': "Apre un report di accessibilità prima/dopo stampabile in una nuova scheda — clicca su Salva come PDF nel banner per tenere una copia per i tuoi archivi o un incontro con i genitori.",
  'pdf_audit_view_html_report_btn': "Scarica il report prima/dopo come un file HTML che puoi ospitare su un sito o modificare. Il contenuto corrisponde alla versione PDF stampabile.",
  'pdf_audit_view_json_data_btn': "Esporta i numeri grezzi della verifica e i dati regola per regola come JSON. Usalo quando vuoi analizzare risultati di accessibilità in un foglio di calcolo, taccuino di ricerca o altro strumento.",
  'pdf_audit_view_audit_trail_signed_btn': "Genera una traccia di audit auto-verificante (un file HTML con un pulsante Verifica Integrità incorporato che rileva manomissioni). Buono come prova di conformità — nota che è una firma lato browser, non legalmente vincolante.",
  'pdf_audit_view_save_project_btn': "Salva il tuo lavoro di correzione — HTML accessibile, punteggi, impostazioni, progresso pagina per pagina — in un file portatile. Riapri con Carica Progetto per continuare a modificare senza rieseguire l'IA.",
  'pdf_audit_view_load_project_btn': "Riapre un file di progetto che hai salvato in precedenza. Riporta l'HTML corretto, i punteggi e qualsiasi intervallo di pagine già completato — riprende esattamente da dove avevi lasciato.",
  'pdf_audit_view_save_template_btn': "Salva la struttura accessibile del documento (struttura dei titoli, tabelle, liste, landmark) come modello riutilizzabile. Usalo in Document Builder per iniziare nuovi documenti — PEI, sillabi — già pre-strutturati per l'accessibilità.",
  'pdf_audit_alt_formats_summary': "Espandi per formati alternativi — ePub, Braille elettronico, testo semplice, Markdown — per studenti che hanno bisogno di un tipo di file diverso da PDF o HTML.",
  'pdf_audit_alt_formats_epub_btn': "Salva il documento corretto come file ePub con indice e metadati di accessibilità. Funziona su Kindle, Apple Books e la maggior parte dei lettori mobili — gli studenti possono cambiare dimensione del carattere, colore e velocità di lettura.",
  'pdf_audit_alt_formats_braille_btn': "Salva un file Braille di Grado 1 (non contratto) che può essere stampato su una stampante Braille o inviato a un display Braille aggiornabile. Per contrazioni di Grado 2, consegna il file a un TVI (insegnante per studenti con disabilità visiva) per il completamento.",
  'pdf_audit_alt_formats_text_btn': "Salva un file .txt semplice con tutta la formattazione rimossa — il formato più facile per screen reader, conversione a stampa grande, o incollare in un altro strumento.",
  'pdf_audit_alt_formats_markdown_btn': "Salva il documento come Markdown — entra pulitamente in pagine Canvas, Schoology o D2L, Google Docs (incollando), wiki e note in stile GitHub senza perdere titoli o link.",
};

// Portuguese (Brazil). High-confidence.
T.portuguese_brazil = {
  'pdf_audit_view_web_url_input': 'Cole o endereço da página web que você quer verificar (por exemplo https://seudistrito.org/manual), depois clique em Buscar para baixar o HTML dela e poder auditar e remediar.',
  'pdf_audit_view_web_fetch_btn': 'Baixa a página da URL acima e coloca o HTML dela na caixa abaixo. Se o site bloquear o download, cole você mesmo o código-fonte da página na caixa HTML.',
  'pdf_audit_view_web_html_textarea': 'O HTML que está sendo auditado — colocado por Buscar ou colado por você. Você pode editá-lo aqui antes de auditar (por exemplo, remover uma barra de navegação que não é sua).',
  'pdf_audit_view_web_audit_btn': 'Pontua a página segundo WCAG 2.1 AA usando tanto um auditor de IA quanto o motor axe-core (o mesmo motor que auditores profissionais usam). Nada é alterado — use isso quando você só quiser saber como a página está hoje.',
  'pdf_audit_view_web_remediate_btn': 'Pontua a página, depois reescreve o HTML para corrigir o que puder (contraste, tag de idioma, link de pulo, landmarks) e te dá uma cópia acessível para baixar. Sempre revise o resultado você mesmo antes de publicar.',
  'pdf_audit_view_batch_dropzone': 'Arraste arquivos PDF do seu desktop ou pasta de downloads direto para esta caixa para adicioná-los à fila do lote. Arquivos não-PDF são ignorados.',
  'pdf_audit_view_batch_browse_btn': 'Abre seu seletor de arquivos para escolher um ou mais PDFs. Use isso se arrastar arquivos não for fácil (dispositivo touch, leitor de tela, baixa visão, ou um Chromebook).',
  'pdf_audit_view_batch_resume_btn': 'Retoma seu último lote de onde parou — PDFs já concluídos são mantidos e só os que não terminaram são reexecutados. Use isso quando um lote foi cortado (aba fechada, recarga, queda).',
  'pdf_audit_view_batch_discard_btn': 'Descarta o progresso salvo do seu último lote interrompido — o banner some e os resultados em cache são excluídos do seu navegador.',
  'pdf_audit_view_batch_clear_all_btn': 'Remove todos os PDFs da fila para você começar de novo. Só disponível antes de pressionar Iniciar Lote.',
  'pdf_audit_view_batch_row_retry_btn': 'Reexecuta apenas este arquivo que falhou sem mexer no resto do lote. Passe o cursor sobre o X vermelho primeiro para ler por que falhou — se for estrutural (PDF corrompido, escaneamento só de imagem), tentar de novo não vai ajudar.',
  'pdf_audit_view_batch_row_remove_btn': 'Remove este PDF da fila para o lote pulá-lo. Só disponível antes do lote estar rodando.',
  'pdf_audit_view_batch_stop_btn': 'Pede ao lote para parar depois que o arquivo em que está trabalhando agora terminar. PDFs já concluídos continuam concluídos — você não perderá trabalho terminado, e pode retomar o resto depois.',
  'pdf_audit_view_batch_retry_all_failed_btn': 'Recoloca na fila cada PDF que falhou e os executa de novo. Arquivos já bem-sucedidos não são tocados. Vale uma tentativa se as falhas parecem erros de rede intermitentes; não insista com PDFs realmente quebrados.',
  'pdf_audit_view_batch_start_btn': 'Inicia a auditoria e correção de cada PDF na fila. Aparece primeiro uma confirmação com uma estimativa de chamadas de IA (e custo, no plano auto-hospedado) para você decidir antes de disparar.',
  'pdf_audit_view_batch_download_zip_btn': 'Baixa cada PDF remediado com sucesso como um único arquivo ZIP. Útil para entregar uma pasta inteira a um professor ou contato do distrito de uma vez.',
  'pdf_audit_view_batch_new_batch_btn': 'Limpa o lote concluído para você poder soltar um novo conjunto de PDFs. Qualquer ZIP que você já baixou continua no seu computador — isso só reinicia a tela.',
  'pdf_audit_view_batch_dashboard_btn': 'Abre um painel de conformidade imprimível em uma nova aba — pontuação média, quantos PDFs alcançaram 90+, os problemas WCAG mais comuns. Útil para compartilhar com um administrador ou anexar a um registro Title II / 504.',
  'pdf_audit_view_settings_panel': 'Botões de ajuste para o pipeline de auditoria e remediação. Os padrões são sensatos — só altere se a execução padrão não estiver dando o que você precisa (mais minúcia, custo menor, ponto de parada diferente).',
  'pdf_audit_view_audit_passes_slider': 'Quantos auditores de IA independentes olham o PDF — eles concordam nos problemas reais e discordam no ruído, então mais auditores significam menos alarmes falsos. 5 é o ponto ideal; aumente para documentos de conformidade de alto risco, diminua para verificações rápidas.',
  'pdf_audit_view_target_score_slider': 'A pontuação que você quer que o PDF remediado atinja — 90 é um sólido WCAG 2.1 AA aprovado, 95+ é quase perfeito, 70 é um piso útil para documentos escaneados. Combine com Continuar automaticamente para deixar o pipeline trabalhar até atingir a pontuação.',
  'pdf_audit_view_max_fix_passes_slider': 'Quantas rodadas de auto-correção o pipeline pode executar antes de parar. 8 é o padrão; abaixe para limitar o custo no plano auto-hospedado, ou coloque em 0 para pular a auto-correção totalmente (só auditoria).',
  'pdf_audit_view_auto_continue_toggle': 'Quando ligado, o pipeline continua fazendo rodadas extras de correção (até 3 a mais) até atingir a Pontuação Alvo, depois para sozinho. Desligue se você quer exatamente uma passagem e um único resultado para inspecionar.',
  'pdf_audit_view_polish_passes_slider': 'Rodadas extras de limpeza depois das correções reais de acessibilidade — ajusta espaçamento, cabeçalhos, polimento visual. 0 pula, 2 é padrão, 3 é para documentos indo para impressão ou audiências externas.',
  'pdf_audit_view_branding_panel': 'Opcional — controla como o PDF remediado fica: cores de marca e estilo geral de design. Pule para o visual acessível padrão, ou expanda se o documento precisa combinar com a marca de uma escola ou distrito.',
  'pdf_audit_view_brand_mode_auto_btn': 'Extrai cores de marca do PDF que você subiu para a versão remediada parecer com o original. Melhor padrão — mantém o documento reconhecível para a equipe e as famílias.',
  'pdf_audit_view_brand_mode_upload_input': 'Suba uma folha de marca separada, logotipo ou guia de estilo (imagem ou PDF) e o pipeline extrai cores e fontes dele. Útil quando o PDF original tem visual simples mas precisa combinar com a marca do distrito.',
  'pdf_audit_view_brand_mode_none_btn': 'Pule cores de marca completamente e use a paleta acessível embutida. Escolha isso para fichas genéricas, ou quando as cores originais falham no contraste e você não precisa preservar o visual.',
  'pdf_audit_results_tab_remediation_btn': 'Mostra os resultados da auditoria depois que o AlloFlow remediou o PDF. Use esta aba para ver a pontuação melhorada e quais problemas agora estão corrigidos.',
  'pdf_audit_results_tab_original_btn': 'Volta para a auditoria do PDF original antes do AlloFlow corrigir qualquer coisa. Útil para comparar pontuações antes-vs-depois lado a lado.',
  'pdf_audit_results_score_badge': 'A pontuação geral de acessibilidade do seu PDF de 0 a 100. Verde (80+) está perto de WCAG AA, âmbar (50-79) precisa de trabalho, vermelho (<50) tem barreiras grandes para alunos usando leitores de tela ou tecnologia assistiva.',
  'pdf_audit_results_reliability_details': 'Expanda para ver quão confiantes os auditores de IA estavam nesta pontuação. Várias passagens de IA rodam em paralelo — concordância estreita significa que a pontuação é confiável, ampla divergência significa revisar os problemas individualmente você mesmo.',
  'pdf_audit_results_score_breakdown_details': 'Expanda para ver exatamente como a pontuação foi calculada — quantas verificações rodaram, o que foi deduzido por problema, e como as pontuações da rubrica de IA e do axe-core foram tiradas em média. Esta é a camada de transparência por trás do número manchete.',
  'pdf_audit_results_score_how_ai_details': 'Expanda para ver quão duramente a IA pontua cada problema: deduções maiores para problemas críticos que bloqueiam usuários de leitores de tela, deduções menores para os menores, e pontos recuperados por verificações que passam.',
  'pdf_audit_results_score_how_axe_details': 'Expanda para ver como o verificador axe-core (o mesmo motor que auditores de acessibilidade profissionais usam) pontuou seu PDF, com os IDs exatos das regras WCAG que falharam.',
  'pdf_audit_results_issue_explain': 'Clique para ler o que este problema realmente bloqueia para os alunos e como a regra WCAG se aplica. Inclui um link para a explicação oficial WCAG se você quiser ir mais fundo.',
  'pdf_audit_results_image_failures_details': 'Expanda para ver qualquer imagem que caiu durante a remediação. Cada linha oferece um botão Regenerar de um clique para nenhuma figura ser silenciosamente perdida.',
  'pdf_audit_results_image_regenerate_btn': 'Recria esta imagem ausente usando IA com base em sua descrição armazenada. A nova imagem aterrissa direto de volta no documento — sem necessidade de upload manual.',
  'pdf_audit_view_report_menu_btn': 'Abre o menu de relatório para baixar um relatório de acessibilidade em formatos diferentes — estilo Adobe para responsáveis de conformidade, PDF formatado para compartilhamento geral, JSON para pesquisa, ou um rastro assinado para registros de auditoria.',
  'pdf_audit_view_adobe_report_btn': 'Baixa um relatório formatado como o Verificador de Acessibilidade da Adobe, pontuado contra PDF/UA-1 (o padrão federal de acessibilidade para PDFs). Melhor para compartilhar com responsáveis de conformidade ou anexar a uma submissão Title II / 504.',
  'pdf_audit_view_tierb_diff_view_btn': 'Revise as palavras que sumiram durante o último salvamento antes de decidir rodar uma passagem de restauração. Somente leitura — nada é alterado até você escolher restaurar.',
  'pdf_audit_view_tierb_rerun_restore_btn': 'Reinsere as palavras-fonte ausentes de volta no documento e reconstrói o PDF marcado. Palavras que não podem ser colocadas com segurança vão para uma seção de Recuperação de Conteúdo para nada ser perdido — a contagem residual antes e depois é sempre mostrada para você ver se ajudou.',
  'pdf_audit_view_formatted_report_btn': 'Abre um relatório de acessibilidade antes/depois imprimível em uma nova aba — clique em Salvar como PDF no banner para guardar uma cópia para seus registros ou uma reunião com os pais.',
  'pdf_audit_view_html_report_btn': 'Baixa o relatório antes/depois como um arquivo HTML que você pode hospedar em um site ou editar. O conteúdo corresponde à versão PDF imprimível.',
  'pdf_audit_view_json_data_btn': 'Exporta os números brutos da auditoria e os dados regra-por-regra como JSON. Use isso quando você quer analisar resultados de acessibilidade em uma planilha, caderno de pesquisa ou outra ferramenta.',
  'pdf_audit_view_audit_trail_signed_btn': 'Gera um rastro de auditoria autoverificável (um arquivo HTML com um botão Verificar Integridade embutido que detecta adulteração). Bom como evidência de conformidade — note que é uma assinatura do lado do navegador, não legalmente vinculante.',
  'pdf_audit_view_save_project_btn': 'Salva seu trabalho de remediação — HTML acessível, pontuações, configurações, progresso página por página — em um arquivo portátil. Reabra com Carregar Projeto para continuar editando sem rodar a IA novamente.',
  'pdf_audit_view_load_project_btn': 'Reabre um arquivo de projeto que você salvou antes. Traz de volta o HTML remediado, as pontuações e quaisquer intervalos de páginas já concluídos — retoma exatamente onde você parou.',
  'pdf_audit_view_save_template_btn': 'Salva a estrutura acessível do documento (esquema de cabeçalhos, tabelas, listas, landmarks) como um modelo reutilizável. Use no Document Builder para iniciar novos documentos — PEIs, programas — já pré-estruturados para acessibilidade.',
  'pdf_audit_alt_formats_summary': 'Expanda para formatos alternativos — ePub, Braille eletrônico, texto simples, Markdown — para alunos que precisam de um tipo de arquivo diferente de PDF ou HTML.',
  'pdf_audit_alt_formats_epub_btn': 'Salva o documento remediado como um arquivo ePub com sumário e metadados de acessibilidade. Funciona em Kindle, Apple Books e na maioria dos leitores móveis — alunos podem mudar tamanho de fonte, cor e velocidade de leitura.',
  'pdf_audit_alt_formats_braille_btn': 'Salva um arquivo Braille de Grau 1 (sem contrações) que pode ser embossado em uma impressora Braille ou enviado para um display Braille atualizável. Para contrações de Grau 2, entregue o arquivo a um TVI (professor para alunos com deficiência visual) para finalização.',
  'pdf_audit_alt_formats_text_btn': 'Salva um arquivo .txt simples com toda formatação removida — o formato mais fácil para leitores de tela, conversão para letra grande, ou colar em outra ferramenta.',
  'pdf_audit_alt_formats_markdown_btn': 'Salva o documento como Markdown — entra limpinho em páginas do Canvas, Schoology ou D2L, Google Docs (colando), wikis e notas estilo GitHub sem perder cabeçalhos ou links.',
};

// Portuguese (Portugal) and Angola — slight regional variation; reuse Brazil for now,
// will hand-clean per regional differences in a follow-up.
T.portuguese_portugal = T.portuguese_brazil;
T.portuguese_angola = T.portuguese_brazil;

// ─────────────────────────────────────────────────────────────────────
// Validation + write logic
// ─────────────────────────────────────────────────────────────────────

const langFiles = fs.readdirSync(LANG_DIR).filter(f => f.endsWith('.js') && !f.endsWith('.bak'));
const TIMESTAMP = '20260608b';

let totalApplied = 0, totalSkipped = 0, totalErrors = 0;
const report = [];

for (const fname of langFiles) {
  const slug = fname.replace(/\.js$/, '');
  if (ONLY_LANG && ONLY_LANG !== slug) continue;
  const fullPath = path.join(LANG_DIR, fname);
  const langName = slug;
  const translations = T[slug];

  if (!translations || translations._todo) {
    report.push({ lang: slug, status: 'skip', reason: 'no-translations-yet' });
    totalSkipped++;
    continue;
  }

  // Validate all 54 keys present in translation
  const missing = KEYS.filter(k => !(k in translations));
  if (missing.length > 0) {
    report.push({ lang: slug, status: 'error', reason: 'missing-keys', missing });
    totalErrors++;
    continue;
  }

  // Read + parse pack
  let raw;
  try { raw = fs.readFileSync(fullPath, 'utf8'); }
  catch (e) { report.push({ lang: slug, status: 'error', reason: 'read-failed', error: e.message }); totalErrors++; continue; }

  let pack;
  try { pack = JSON.parse(raw); }
  catch (e) { report.push({ lang: slug, status: 'error', reason: 'parse-failed', error: e.message }); totalErrors++; continue; }

  // Ensure help_mode exists
  if (!pack.help_mode || typeof pack.help_mode !== 'object') {
    report.push({ lang: slug, status: 'error', reason: 'no-help-mode-block' });
    totalErrors++;
    continue;
  }

  // Check whether keys already present (idempotency)
  const already = KEYS.filter(k => k in pack.help_mode);
  const toAdd = KEYS.filter(k => !(k in pack.help_mode));
  if (toAdd.length === 0) {
    report.push({ lang: slug, status: 'skip', reason: 'already-applied', alreadyCount: already.length });
    totalSkipped++;
    continue;
  }

  // Build new help_mode block: existing entries + new ones
  for (const k of toAdd) pack.help_mode[k] = translations[k];

  if (!WRITE) {
    report.push({ lang: slug, status: 'preview', adding: toAdd.length, alreadyHad: already.length });
    continue;
  }

  // Backup + write
  const backupPath = fullPath + '.bak.help_mode_' + TIMESTAMP;
  try { fs.copyFileSync(fullPath, backupPath); }
  catch (e) { report.push({ lang: slug, status: 'error', reason: 'backup-failed', error: e.message }); totalErrors++; continue; }

  try {
    const out = JSON.stringify(pack, null, 2);
    fs.writeFileSync(fullPath, out, 'utf8');
    report.push({ lang: slug, status: 'written', added: toAdd.length });
    totalApplied++;
  } catch (e) {
    report.push({ lang: slug, status: 'error', reason: 'write-failed', error: e.message });
    totalErrors++;
  }
}

// Print summary
console.log('');
console.log('─'.repeat(70));
console.log(WRITE ? 'WRITE MODE' : (CHECK ? 'CHECK / PREVIEW MODE' : 'PREVIEW MODE'));
console.log(`Total langs processed: ${langFiles.length}`);
console.log(`Applied: ${totalApplied}   Skipped: ${totalSkipped}   Errors: ${totalErrors}`);
console.log('─'.repeat(70));
for (const r of report) {
  let line = `  ${r.lang.padEnd(28)} ${r.status.padEnd(10)}`;
  if (r.adding != null) line += ` +${r.adding} new`;
  if (r.added != null) line += ` +${r.added} added`;
  if (r.alreadyHad != null && r.alreadyHad > 0) line += `  (${r.alreadyHad} already present)`;
  if (r.alreadyCount != null) line += ` (${r.alreadyCount} already present)`;
  if (r.reason) line += `  ← ${r.reason}`;
  if (r.error) line += `  err: ${r.error}`;
  if (r.missing) line += `  missing keys: ${r.missing.slice(0,3).join(', ')}...`;
  console.log(line);
}
console.log('');
process.exit(totalErrors > 0 ? 1 : 0);
