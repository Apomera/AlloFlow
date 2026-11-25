// Shared-Device Station Kiosk helpers and Zero-AI Bilingual / Home-Language Bridge
// for AlloFlow Packets (offline-first, connect-src 'none', DOM-built nodes only, zero AI).
// One plain script for browser pages (window.AlloPacketStationBilingual) and Node (module.exports).
(function (root) {
  'use strict';

  var STATION_MAX_QUEUE = 15;

  var STATION_LABELS = {
    station_next_student: 'Ready for next student',
    station_cleared: 'Ready for the next student. Previous answers were cleared from this screen.',
    station_queued_note: 'Results sealed into the station deck ({n} ready for teacher).',
    station_full_note: 'Station deck is full ({max} ready). Ask your teacher to scan and clear the deck before the next student.',
    station_deck_button: 'Teacher Station Deck ({n} ready)',
    station_deck_title: 'Teacher Station Deck',
    station_deck_empty: 'No sealed student results in the station deck yet.',
    station_deck_item: 'Student {n} of {total} · {label}',
    station_deck_prev: 'Previous',
    station_deck_next: 'Next',
    station_deck_clear: 'Clear deck',
    station_deck_cleared: 'Station deck cleared.',
    station_deck_hide: 'Hide deck',
    station_deck_note: 'Kept in tab memory only, never saved to browser storage. Closing this tab clears the deck.',
    station_teacher_fold: 'For the teacher',
    station_about: 'Shared-device station mode: clears each student session for the next student without reloading and holds up to {max} encrypted QR codes in tab memory only (never in browser storage).',
  };

  var STATION_CSS = [
    '.station-bar{margin:14px 0 6px;display:flex;flex-wrap:wrap;justify-content:center;gap:10px}',
    '.station-note{margin:6px 0;text-align:center;font-size:.92rem}',
    '.station-deck-wrap{margin-top:12px;padding-top:12px;border-top:1px solid var(--line)}',
    '.station-deck-panel{margin-top:10px;padding:14px;border:1px solid var(--line);border-radius:12px;background:var(--soft);text-align:center}',
    '.station-deck-head{margin:0 0 8px;font-weight:700;font-size:1rem}',
    '.station-deck-nav{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-top:10px}',
    '.station-start-fold{margin-top:14px;border-top:1px solid var(--line);padding-top:4px}',
    '.station-start-fold summary{cursor:pointer;padding:10px 0;font-weight:700;color:var(--ink)}',
    '@media (forced-colors:active){.station-deck-panel{border:2px solid CanvasText}}',
  ].join('\n');

  var BILINGUAL_CSS = [
    '.bi-bar{display:inline-flex;flex-wrap:wrap;align-items:center;gap:6px;margin-inline-end:auto}',
    '.bi-btn{min-height:44px;min-width:44px;padding:6px 12px;font-size:.9rem;border-radius:999px;border:2px solid var(--line);background:var(--card);color:var(--ink)}',
    '.bi-btn[aria-pressed=true]{background:var(--accent);color:var(--accent-ink);border-color:var(--accent);font-weight:700;outline:none}',
    '.bi-btn:focus-visible{outline:3px solid var(--focus);outline-offset:2px}',
    '.bi-banner{margin:0 0 12px;padding:12px 14px;border:1px solid var(--line);border-inline-start:4px solid var(--accent);border-radius:12px;background:var(--soft)}',
    '.bi-banner[dir=rtl],.bi-glossary[dir=rtl],.bi-family[dir=rtl]{text-align:right}',
    '.bi-head{margin:0 0 4px;font-size:.86rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.03em}',
    '.bi-text{margin:0;font-size:1rem;line-height:1.45}',
    '.bi-chips{display:flex;flex-wrap:wrap;gap:6px 10px;margin:8px 0 0;padding:0;list-style:none;font-size:.88rem}',
    '.bi-chips li{padding:3px 9px;border-radius:8px;background:var(--card);border:1px solid var(--line)}',
    '.bi-glossary{margin:0 0 12px;padding:10px 14px;border:1px solid var(--line);border-radius:12px;background:var(--card)}',
    '.bi-gloss-list{list-style:none;margin:6px 0 0;padding:0;display:grid;gap:6px}',
    '.bi-gloss-row{display:flex;flex-wrap:wrap;justify-content:space-between;gap:4px 12px;padding:6px 10px;border-radius:8px;background:var(--soft)}',
    '.bi-gloss-en{font-weight:700}',
    '.bi-family{margin:12px 0 0;padding:12px 14px;border:1px solid var(--line);border-radius:12px;background:var(--soft)}',
    '.bi-family summary{cursor:pointer;min-height:44px;padding:4px 0;font-weight:700}',
    '.bi-family p{margin:6px 0 0;font-size:.95rem;line-height:1.5}',
    'button[data-bi-label]::after,summary[data-bi-label]::after,label[data-bi-label]::after,.lt-l[data-bi-label]::after,.lt-h[data-bi-label]::after{content:attr(data-bi-label);display:block;font-size:.78em;font-weight:500;opacity:.92;line-height:1.25;margin-top:2px}',
    'button[data-bi-dir=rtl]::after,summary[data-bi-dir=rtl]::after,label[data-bi-dir=rtl]::after,.lt-l[data-bi-dir=rtl]::after,.lt-h[data-bi-dir=rtl]::after{direction:rtl;unicode-bidi:isolate}',
    '@media (max-width:480px){[data-step] .lt-bar:has(.bi-bar){margin:0 0 8px}[data-step] #app:has(.bi-bar)>h2:first-child{padding-inline-end:0;min-height:0}}',
    '@media (forced-colors:active){.bi-btn[aria-pressed=true]{outline:3px solid Highlight}.bi-banner,.bi-glossary,.bi-family{border:1px solid CanvasText}}',
    '@media print{.bi-bar{display:none!important}}',
  ].join('\n');

  // Six curated static home-language packs (zero live translation, zero AI, zero network).
  var LANGUAGES = {
    es: {
      code: 'es',
      name: 'Spanish',
      nativeName: 'Espa\u00f1ol',
      dir: 'ltr',
      strings: {
        toggle_label: 'Idioma del hogar',
        english_only: 'Solo ingl\u00e9s',
        directions_heading: 'Instrucciones (Espa\u00f1ol)',
        intro: 'Escucha o lee con atenci\u00f3n y responde cada pregunta. Puedes tomar tu tiempo y volver a intentarlo.',
        learner_label: 'Tu nombre o nombre clave',
        start: 'Comenzar',
        continue: 'Continuar',
        next: 'Siguiente',
        finish: 'Ver mis resultados',
        save_work: 'Guardar mi trabajo',
        try_again: 'Casi. Revisa o escucha de nuevo e int\u00e9ntalo una vez m\u00e1s.',
        correct: '\u00a1S\u00ed! Eso es correcto.',
        missed: 'Aqu\u00ed est\u00e1 la respuesta.',
        done_title: '\u00a1Terminaste!',
        done_last_step: '\u00daltimo paso: guarda tu trabajo para tu maestro o maestra.',
        station_next: 'Listo para el siguiente estudiante',
        hint_heading: 'Pista y ejemplo paso a paso',
        stretch_button: 'Probar un reto extra',
        glossary_heading: 'Ayuda con palabras',
        family_note_heading: 'Nota para la familia',
        family_note: 'Esta actividad funciona completamente sin internet, sin cuenta y sin inteligencia artificial. Su hijo o hija puede tomar su tiempo y usar las herramientas de lectura (Aa). Al terminar, presione "Guardar mi trabajo" o muestre el c\u00f3digo QR sellado al docente.',
        offline_badge: 'Sin internet \u00b7 Sin cuenta \u00b7 Sin IA',
        check: 'Revisar',
        skip: 'Saltar',
        reading_tools: 'Herramientas de lectura',
        start_over: 'Empezar de nuevo',
        back: 'Atr\u00e1s',
        clear: 'Borrar',
        reset: 'Reiniciar',
        show_hint: 'Ver pista',
        done: 'Listo',
        close: 'Cerrar',
        show_teacher: 'Mostrar al docente',
        tools_size: 'Tama\u00f1o de texto',
        tools_colors: 'Colores',
        tools_spacing: 'Espaciado',
        tools_font: 'Tipo de letra',
        tools_focus: 'Enfoque de lectura',
        tools_lens: 'Lupa',
        tools_speed: 'Velocidad de voz',
        tools_motion: 'Movimiento',
        tools_normal: 'Normal',
        tools_larger: 'M\u00e1s grande',
        tools_largest: 'Muy grande',
        tools_high_contrast: 'Alto contraste',
        tools_soft: 'Suave',
        tools_dark: 'Oscuro',
        tools_wider: 'M\u00e1s amplio',
        tools_off: 'Desactivado',
        tools_on: 'Activado',
        tools_ruler: 'Regla',
        tools_slower: 'M\u00e1s lento',
        tools_faster: 'M\u00e1s r\u00e1pido',
        about_file: 'Acerca de este archivo',
        keep_results: 'Conservar mis resultados',
        switch_pathway: 'Cambiar opci\u00f3n',
        print: 'Imprimir',
        undo: 'Deshacer',
        hide_hint: 'Ocultar pista',
        speak_sentence: 'Leer oraci\u00f3n',
        backspace: 'Borrar \u00faltima',
        start_timer: 'Iniciar temporizador',
      },
    },
    pt: {
      code: 'pt',
      name: 'Portuguese',
      nativeName: 'Portugu\u00eas',
      dir: 'ltr',
      strings: {
        toggle_label: 'Idioma de casa',
        english_only: 'Somente ingl\u00eas',
        directions_heading: 'Instru\u00e7\u00f5es (Portugu\u00eas)',
        intro: 'Ou\u00e7a ou leia com aten\u00e7\u00e3o e responda a cada pergunta. Voc\u00ea pode levar o tempo que precisar e tentar novamente.',
        learner_label: 'Seu nome ou c\u00f3digo',
        start: 'Come\u00e7ar',
        continue: 'Continuar',
        next: 'Pr\u00f3ximo',
        finish: 'Ver meus resultados',
        save_work: 'Salvar meu trabalho',
        try_again: 'Quase l\u00e1. Verifique ou ou\u00e7a novamente e tente mais uma vez.',
        correct: 'Sim! Est\u00e1 correto.',
        missed: 'Aqui est\u00e1 a resposta.',
        done_title: 'Voc\u00ea terminou!',
        done_last_step: '\u00daltimo passo: salve seu trabalho para o professor ou professora.',
        station_next: 'Pronto para o pr\u00f3ximo estudante',
        hint_heading: 'Dica e exemplo passo a passo',
        stretch_button: 'Tentar um desafio extra',
        glossary_heading: 'Ajuda com palavras',
        family_note_heading: 'Nota para a fam\u00edlia',
        family_note: 'Esta atividade funciona totalmente offline, sem internet, sem conta e sem intelig\u00eancia artificial. A crian\u00e7a pode trabalhar no pr\u00f3prio ritmo e usar as ferramentas de leitura (Aa). Ao terminar, toque em "Salvar meu trabalho" ou mostre o c\u00f3digo QR selado ao docente.',
        offline_badge: 'Sem internet \u00b7 Sem conta \u00b7 Sem IA',
        check: 'Verificar',
        skip: 'Pular',
        reading_tools: 'Ferramentas de leitura',
        start_over: 'Recome\u00e7ar',
        back: 'Voltar',
        clear: 'Limpar',
        reset: 'Redefinir',
        show_hint: 'Ver dica',
        done: 'Conclu\u00eddo',
        close: 'Fechar',
        show_teacher: 'Mostrar ao docente',
        tools_size: 'Tamanho do texto',
        tools_colors: 'Cores',
        tools_spacing: 'Espa\u00e7amento',
        tools_font: 'Letras',
        tools_focus: 'Foco de leitura',
        tools_lens: 'Lupa',
        tools_speed: 'Velocidade da voz',
        tools_motion: 'Movimento',
        tools_normal: 'Normal',
        tools_larger: 'Maior',
        tools_largest: 'Bem grande',
        tools_high_contrast: 'Alto contraste',
        tools_soft: 'Suave',
        tools_dark: 'Escuro',
        tools_wider: 'Mais amplo',
        tools_off: 'Desativado',
        tools_on: 'Ativado',
        tools_ruler: 'R\u00e9gua',
        tools_slower: 'Mais devagar',
        tools_faster: 'Mais r\u00e1pido',
        about_file: 'Sobre este arquivo',
        keep_results: 'Manter meus resultados',
        switch_pathway: 'Trocar op\u00e7\u00e3o',
        print: 'Imprimir',
        undo: 'Desfazer',
        hide_hint: 'Ocultar dica',
        speak_sentence: 'Falar frase',
        backspace: 'Apagar \u00faltima',
        start_timer: 'Iniciar temporizador',
      },
    },
    fr: {
      code: 'fr',
      name: 'French',
      nativeName: 'Fran\u00e7ais',
      dir: 'ltr',
      strings: {
        toggle_label: 'Langue de la maison',
        english_only: 'Anglais seulement',
        directions_heading: 'Consignes (Fran\u00e7ais)',
        intro: '\u00c9coute ou lis attentivement et r\u00e9ponds \u00e0 chaque question. Tu peux prendre ton temps et r\u00e9essayer.',
        learner_label: 'Ton pr\u00e9nom ou nom de code',
        start: 'Commencer',
        continue: 'Continuer',
        next: 'Suivant',
        finish: 'Voir mes r\u00e9sultats',
        save_work: 'Enregistrer mon travail',
        try_again: 'Pas tout \u00e0 fait. V\u00e9rifie ou r\u00e9\u00e9coute et essaie encore une fois.',
        correct: 'Oui ! C\u2019est exact.',
        missed: 'Voici la r\u00e9ponse.',
        done_title: 'Tu as termin\u00e9 !',
        done_last_step: 'Derni\u00e8re \u00e9tape : enregistre ton travail pour ton enseignant.',
        station_next: 'Pr\u00eat pour l\u2019\u00e9l\u00e8ve suivant',
        hint_heading: 'Indice et exemple guid\u00e9',
        stretch_button: 'Essayer un d\u00e9fi suppl\u00e9mentaire',
        glossary_heading: 'Aide aux mots',
        family_note_heading: 'Note pour la famille',
        family_note: 'Cette activit\u00e9 fonctionne enti\u00e8rement hors ligne, sans internet, sans compte et sans intelligence artificielle. Votre enfant peut avancer \u00e0 son rythme et utiliser les outils de lecture (Aa). \u00c0 la fin, appuyez sur \u00ab Enregistrer mon travail \u00bb ou montrez le code QR scell\u00e9 \u00e0 l\u2019enseignant.',
        offline_badge: 'Hors ligne \u00b7 Sans compte \u00b7 Sans IA',
        check: 'V\u00e9rifier',
        skip: 'Passer',
        reading_tools: 'Outils de lecture',
        start_over: 'Recommencer',
        back: 'Retour',
        clear: 'Effacer',
        reset: 'R\u00e9initialiser',
        show_hint: 'Voir un indice',
        done: 'Termin\u00e9',
        close: 'Fermer',
        show_teacher: 'Montrer \u00e0 l\u2019enseignant',
        tools_size: 'Taille du texte',
        tools_colors: 'Couleurs',
        tools_spacing: 'Espacement',
        tools_font: 'Police',
        tools_focus: 'Aide \u00e0 la lecture',
        tools_lens: 'Loupe',
        tools_speed: 'Vitesse de la voix',
        tools_motion: 'Animations',
        tools_normal: 'Normal',
        tools_larger: 'Plus grand',
        tools_largest: 'Tr\u00e8s grand',
        tools_high_contrast: 'Contraste \u00e9lev\u00e9',
        tools_soft: 'Doux',
        tools_dark: 'Sombre',
        tools_wider: 'Plus large',
        tools_off: 'D\u00e9sactiv\u00e9',
        tools_on: 'Activ\u00e9',
        tools_ruler: 'R\u00e8gle',
        tools_slower: 'Plus lent',
        tools_faster: 'Plus rapide',
        about_file: '\u00c0 propos de ce fichier',
        keep_results: 'Garder mes r\u00e9sultats',
        switch_pathway: 'Changer d\u2019option',
        print: 'Imprimer',
        undo: 'Annuler',
        hide_hint: 'Masquer l\u2019indice',
        speak_sentence: 'Lire la phrase',
        backspace: 'Effacer le dernier',
        start_timer: 'Lancer le minuteur',
      },
    },
    ar: {
      code: 'ar',
      name: 'Arabic',
      nativeName: '\u0627\u0644\u0639\u0631\u0628\u064a\u0629',
      dir: 'rtl',
      strings: {
        toggle_label: '\u0644\u063a\u0629 \u0627\u0644\u0645\u0646\u0632\u0644',
        english_only: '\u0627\u0644\u0625\u0646\u062c\u0644\u064a\u0632\u064a\u0629 \u0641\u0642\u0637',
        directions_heading: '\u0627\u0644\u062a\u0639\u0644\u064a\u0645\u0627\u062a (\u0627\u0644\u0639\u0631\u0628\u064a\u0629)',
        intro: '\u0627\u0633\u062a\u0645\u0639 \u0623\u0648 \u0627\u0642\u0631\u0623 \u0628\u0639\u0646\u0627\u064a\u0629 \u062b\u0645 \u0623\u062c\u0628 \u0639\u0646 \u0643\u0644 \u0633\u0624\u0627\u0644. \u064a\u0645\u0643\u0646\u0643 \u0623\u062e\u0630 \u0648\u0642\u062a\u0643 \u0648\u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649.',
        learner_label: '\u0627\u0633\u0645\u0643 \u0623\u0648 \u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0631\u0645\u0632\u064a',
        start: '\u0627\u0628\u062f\u0623',
        continue: '\u0645\u062a\u0627\u0628\u0639\u0629',
        next: '\u0627\u0644\u062a\u0627\u0644\u064a',
        finish: '\u0639\u0631\u0636 \u0646\u062a\u0627\u0626\u062c\u064a',
        save_work: '\u062d\u0641\u0638 \u0639\u0645\u0644\u064a',
        try_again: '\u0644\u064a\u0633 \u062a\u0645\u0627\u0645\u064b\u0627. \u062a\u062d\u0642\u0642 \u0623\u0648 \u0627\u0633\u062a\u0645\u0639 \u0645\u062c\u062f\u062f\u064b\u0627 \u0648\u062d\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649.',
        correct: '\u0646\u0639\u0645! \u0647\u0630\u0627 \u0635\u062d\u064a\u062d.',
        missed: '\u0647\u0630\u0647 \u0647\u064a \u0627\u0644\u0625\u062c\u0627\u0628\u0629.',
        done_title: '\u0644\u0642\u062f \u0623\u0646\u0647\u064a\u062a!',
        done_last_step: '\u0627\u0644\u062e\u0637\u0648\u0629 \u0627\u0644\u0623\u062e\u064a\u0631\u0629: \u0627\u062d\u0641\u0638 \u0639\u0645\u0644\u0643 \u0644\u0645\u0639\u0644\u0645\u0643.',
        station_next: '\u062c\u0627\u0647\u0632 \u0644\u0644\u0637\u0627\u0644\u0628 \u0627\u0644\u062a\u0627\u0644\u064a',
        hint_heading: '\u062a\u0644\u0645\u064a\u062d \u0648\u0645\u062b\u0627\u0644 \u062e\u0637\u0648\u0629 \u0628\u062e\u0637\u0648\u0629',
        stretch_button: '\u062c\u0631\u0651\u0628 \u062a\u062d\u062f\u064a\u064b\u0627 \u0625\u0636\u0627\u0641\u064a\u064b\u0627',
        glossary_heading: '\u0645\u0633\u0627\u0639\u062f\u0629 \u0627\u0644\u0643\u0644\u0645\u0627\u062a',
        family_note_heading: '\u0645\u0644\u0627\u062d\u0638\u0629 \u0644\u0644\u0623\u0633\u0631\u0629',
        family_note: '\u064a\u0639\u0645\u0644 \u0647\u0630\u0627 \u0627\u0644\u0645\u0644\u0641 \u0628\u062f\u0648\u0646 \u0625\u0646\u062a\u0631\u0646\u062a \u0648\u0628\u062f\u0648\u0646 \u062d\u0633\u0627\u0628 \u0648\u0628\u062f\u0648\u0646 \u0630\u0643\u0627\u0621 \u0627\u0635\u0637\u0646\u0627\u0639\u064a. \u064a\u0645\u0643\u0646 \u0644\u0637\u0641\u0644\u0643 \u0623\u062e\u0630 \u0648\u0642\u062a\u0647 \u0648\u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u0623\u062f\u0648\u0627\u062a \u0627\u0644\u0642\u0631\u0627\u0621\u0629 (Aa). \u0639\u0646\u062f \u0627\u0644\u0627\u0646\u062a\u0647\u0627\u0621\u060c \u0627\u0636\u063a\u0637 \u0639\u0644\u0649 \u00ab\u062d\u0641\u0638 \u0639\u0645\u0644\u064a\u00bb \u0623\u0648 \u0627\u0639\u0631\u0636 \u0631\u0645\u0632 QR \u0627\u0644\u0645\u062e\u062a\u0648\u0645 \u0644\u0644\u0645\u0639\u0644\u0645.',
        offline_badge: '\u0628\u062f\u0648\u0646 \u0625\u0646\u062a\u0631\u0646\u062a \u00b7 \u0628\u062f\u0648\u0646 \u062d\u0633\u0627\u0628 \u00b7 \u0628\u062f\u0648\u0646 \u0630\u0643\u0627\u0621 \u0627\u0635\u0637\u0646\u0627\u0639\u064a',
        check: '\u062a\u062d\u0642\u0642',
        skip: '\u062a\u062e\u0637\u064a',
        reading_tools: '\u0623\u062f\u0648\u0627\u062a \u0627\u0644\u0642\u0631\u0627\u0621\u0629',
        start_over: '\u0627\u0644\u0628\u062f\u0621 \u0645\u0646 \u062c\u062f\u064a\u062f',
        back: '\u0631\u062c\u0648\u0639',
        clear: '\u0645\u0633\u062d',
        reset: '\u0625\u0639\u0627\u062f\u0629 \u062a\u0639\u064a\u064a\u0646',
        show_hint: '\u0625\u0638\u0647\u0627\u0631 \u062a\u0644\u0645\u064a\u062d',
        done: '\u062a\u0645',
        close: '\u0625\u063a\u0644\u0627\u0642',
        show_teacher: '\u0639\u0631\u0636 \u0639\u0644\u0649 \u0627\u0644\u0645\u0639\u0644\u0645',
        tools_size: '\u062d\u062c\u0645 \u0627\u0644\u0646\u0635',
        tools_colors: '\u0627\u0644\u0623\u0644\u0648\u0627\u0646',
        tools_spacing: '\u0627\u0644\u062a\u0628\u0627\u0639\u062f',
        tools_font: '\u0627\u0644\u062d\u0631\u0648\u0641',
        tools_focus: '\u062a\u0631\u0643\u064a\u0632 \u0627\u0644\u0642\u0631\u0627\u0621\u0629',
        tools_lens: '\u0627\u0644\u0639\u062f\u0633\u0629 \u0627\u0644\u0645\u0643\u0628\u0631\u0629',
        tools_speed: '\u0633\u0631\u0639\u0629 \u0627\u0644\u0635\u0648\u062a',
        tools_motion: '\u0627\u0644\u062d\u0631\u0643\u0629',
        tools_normal: '\u0639\u0627\u062f\u064a',
        tools_larger: '\u0623\u0643\u0628\u0631',
        tools_largest: '\u0623\u0643\u0628\u0631 \u062c\u062f\u064b\u0627',
        tools_high_contrast: '\u062a\u0628\u0627\u064a\u0646 \u0639\u0627\u0644\u064d',
        tools_soft: '\u0647\u0627\u062f\u0626',
        tools_dark: '\u062f\u0627\u0643\u0646',
        tools_wider: '\u0623\u0648\u0633\u0639',
        tools_off: '\u0625\u064a\u0642\u0627\u0641',
        tools_on: '\u062a\u0634\u063a\u064a\u0644',
        tools_ruler: '\u0645\u0633\u0637\u0631\u0629',
        tools_slower: '\u0623\u0628\u0637\u0623',
        tools_faster: '\u0623\u0633\u0631\u0639',
        about_file: '\u062d\u0648\u0644 \u0647\u0630\u0627 \u0627\u0644\u0645\u0644\u0641',
        keep_results: '\u0627\u0644\u0627\u062d\u062a\u0641\u0627\u0638 \u0628\u0646\u062a\u0627\u0626\u062c\u064a',
        switch_pathway: '\u062a\u063a\u064a\u064a\u0631 \u0627\u0644\u0645\u0633\u0627\u0631',
        print: '\u0637\u0628\u0627\u0639\u0629',
        undo: '\u062a\u0631\u0627\u062c\u0639',
        hide_hint: '\u0625\u062e\u0641\u0627\u0621 \u0627\u0644\u062a\u0644\u0645\u064a\u062d',
        speak_sentence: '\u0646\u0637\u0642 \u0627\u0644\u062c\u0645\u0644\u0629',
        backspace: '\u062d\u0630\u0641 \u0627\u0644\u0623\u062e\u064a\u0631',
        start_timer: '\u0628\u062f\u0621 \u0627\u0644\u0645\u0624\u0642\u062a',
      },
    },
    vi: {
      code: 'vi',
      name: 'Vietnamese',
      nativeName: 'Ti\u1ebfng Vi\u1ec7t',
      dir: 'ltr',
      strings: {
        toggle_label: 'Ng\u00f4n ng\u1eef gia \u0111\u00ecnh',
        english_only: 'Ch\u1ec9 ti\u1ebfng Anh',
        directions_heading: 'H\u01b0\u1edbng d\u1eabn (Ti\u1ebfng Vi\u1ec7t)',
        intro: 'H\u00e3y nghe ho\u1eb7c \u0111\u1ecdc k\u1ef9 v\u00e0 tr\u1ea3 l\u1eddi t\u1eebng c\u00e2u h\u1ecfi. Em c\u00f3 th\u1ec3 l\u00e0m t\u1eeb t\u1eeb v\u00e0 th\u1eed l\u1ea1i.',
        learner_label: 'T\u00ean ho\u1eb7c m\u00e3 t\u00ean c\u1ee7a em',
        start: 'B\u1eaft \u0111\u1ea7u',
        continue: 'Ti\u1ebfp t\u1ee5c',
        next: 'Ti\u1ebfp theo',
        finish: 'Xem k\u1ebft qu\u1ea3',
        save_work: 'L\u01b0u b\u00e0i l\u00e0m',
        try_again: 'Ch\u01b0a \u0111\u00fang l\u1eafm. H\u00e3y nghe ho\u1eb7c ki\u1ec3m tra l\u1ea1i r\u1ed3i th\u1eed th\u00eam l\u1ea7n n\u1eefa.',
        correct: '\u0110\u00fang r\u1ed3i! R\u1ea5t t\u1ed1t.',
        missed: '\u0110\u00e2y l\u00e0 \u0111\u00e1p \u00e1n.',
        done_title: 'Em \u0111\u00e3 ho\u00e0n th\u00e0nh!',
        done_last_step: 'B\u01b0\u1edbc cu\u1ed1i: l\u01b0u b\u00e0i l\u00e0m \u0111\u1ec3 g\u1eedi th\u1ea7y c\u00f4.',
        station_next: 'S\u1eb5n s\u00e0ng cho h\u1ecdc sinh ti\u1ebfp theo',
        hint_heading: 'G\u1ee3i \u00fd v\u00e0 v\u00ed d\u1ee5 t\u1eebng b\u01b0\u1edbc',
        stretch_button: 'Th\u1eed th\u1eed th\u00e1ch n\u00e2ng cao',
        glossary_heading: 'H\u1ed7 tr\u1ee3 t\u1eeb v\u1ef1ng',
        family_note_heading: 'Ghi ch\u00fa cho gia \u0111\u00ecnh',
        family_note: 'B\u00e0i t\u1eadp n\u00e0y ch\u1ea1y ho\u00e0n to\u00e0n ngo\u1ea1i tuy\u1ebfn, kh\u00f4ng c\u1ea7n internet, kh\u00f4ng c\u1ea7n t\u00e0i kho\u1ea3n v\u00e0 kh\u00f4ng d\u00f9ng AI. Con c\u00f3 th\u1ec3 l\u00e0m theo nh\u1ecbp ri\u00eang v\u00e0 d\u00f9ng c\u00f4ng c\u1ee5 \u0111\u1ecdc (Aa). Khi xong, b\u1ea5m "L\u01b0u b\u00e0i l\u00e0m" ho\u1eb7c \u0111\u01b0a m\u00e3 QR ni\u00eam phong cho gi\u00e1o vi\u00ean.',
        offline_badge: 'Kh\u00f4ng internet \u00b7 Kh\u00f4ng t\u00e0i kho\u1ea3n \u00b7 Kh\u00f4ng AI',
        check: 'Ki\u1ec3m tra',
        skip: 'B\u1ecf qua',
        reading_tools: 'C\u00f4ng c\u1ee5 \u0111\u1ecdc',
        start_over: 'L\u00e0m l\u1ea1i t\u1eeb \u0111\u1ea7u',
        back: 'Quay l\u1ea1i',
        clear: 'X\u00f3a',
        reset: '\u0110\u1eb7t l\u1ea1i',
        show_hint: 'Xem g\u1ee3i \u00fd',
        done: 'Xong',
        close: '\u0110\u00f3ng',
        show_teacher: 'Cho th\u1ea7y c\u00f4 xem',
        tools_size: 'C\u1ee1 ch\u1eef',
        tools_colors: 'M\u00e0u s\u1eafc',
        tools_spacing: 'Gi\u00e3n c\u00e1ch',
        tools_font: 'Ki\u1ec3u ch\u1eef',
        tools_focus: 'T\u1eadp trung \u0111\u1ecdc',
        tools_lens: 'K\u00ednh l\u00fap',
        tools_speed: 'T\u1ed1c \u0111\u1ed9 gi\u1ecdng \u0111\u1ecdc',
        tools_motion: 'Chuy\u1ec3n \u0111\u1ed9ng',
        tools_normal: 'B\u00ecnh th\u01b0\u1eddng',
        tools_larger: 'L\u1edbn h\u01a1n',
        tools_largest: 'R\u1ea5t l\u1edbn',
        tools_high_contrast: 'T\u01b0\u01a1ng ph\u1ea3n cao',
        tools_soft: 'D\u1ecbu m\u1eaft',
        tools_dark: 'T\u1ed1i',
        tools_wider: 'R\u1ed9ng h\u01a1n',
        tools_off: 'T\u1eaft',
        tools_on: 'B\u1eadt',
        tools_ruler: 'Th\u01b0\u1edbc \u0111\u1ecdc',
        tools_slower: 'Ch\u1eadm h\u01a1n',
        tools_faster: 'Nhanh h\u01a1n',
        about_file: 'Th\u00f4ng tin t\u1ec7p n\u00e0y',
        keep_results: 'Gi\u1eef k\u1ebft qu\u1ea3 c\u1ee7a em',
        switch_pathway: '\u0110\u1ed5i c\u00e1ch l\u00e0m',
        print: 'In',
        undo: 'Ho\u00e0n t\u00e1c',
        hide_hint: '\u1ea8n g\u1ee3i \u00fd',
        speak_sentence: '\u0110\u1ecdc c\u00e2u',
        backspace: 'X\u00f3a t\u1eeb cu\u1ed1i',
        start_timer: 'B\u1eaft \u0111\u1ea7u \u0111\u1ebfm gi\u1edd',
      },
    },
    zh: {
      code: 'zh',
      name: 'Simplified Chinese',
      nativeName: '\u7b80\u4f53\u4e2d\u6587',
      dir: 'ltr',
      strings: {
        toggle_label: '\u5bb6\u5ead\u8bed\u8a00',
        english_only: '\u4ec5\u82f1\u8bed',
        directions_heading: '\u7ec3\u4e60\u8bf4\u660e\uff08\u7b80\u4f53\u4e2d\u6587\uff09',
        intro: '\u8bf7\u4ed4\u7ec6\u542c\u6216\u9605\u8bfb\uff0c\u7136\u540e\u56de\u7b54\u6bcf\u4e00\u9898\u3002\u4f60\u53ef\u4ee5\u6162\u6162\u6765\uff0c\u4e5f\u53ef\u4ee5\u518d\u8bd5\u4e00\u6b21\u3002',
        learner_label: '\u4f60\u7684\u540d\u5b57\u6216\u4ee3\u53f7',
        start: '\u5f00\u59cb',
        continue: '\u7ee7\u7eed',
        next: '\u4e0b\u4e00\u9898',
        finish: '\u67e5\u770b\u7ed3\u679c',
        save_work: '\u4fdd\u5b58\u6211\u7684\u4f5c\u4e1a',
        try_again: '\u8fd8\u5dee\u4e00\u70b9\u3002\u8bf7\u518d\u542c\u6216\u68c0\u67e5\u4e00\u904d\uff0c\u7136\u540e\u518d\u8bd5\u4e00\u6b21\u3002',
        correct: '\u5bf9\u4e86\uff01\u505a\u5f97\u5f88\u597d\u3002',
        missed: '\u8fd9\u662f\u6b63\u786e\u7b54\u6848\u3002',
        done_title: '\u4f60\u5b8c\u6210\u4e86\uff01',
        done_last_step: '\u6700\u540e\u4e00\u6b65\uff1a\u4fdd\u5b58\u4f60\u7684\u4f5c\u4e1a\u4ea4\u7ed9\u8001\u5e08\u3002',
        station_next: '\u51c6\u5907\u597d\u7ed9\u4e0b\u4e00\u4f4d\u540c\u5b66',
        hint_heading: '\u63d0\u793a\u4e0e\u5206\u6b65\u793a\u4f8b',
        stretch_button: '\u5c1d\u8bd5\u62d3\u5c55\u6311\u6218',
        glossary_heading: '\u8bcd\u8bed\u5e2e\u52a9',
        family_note_heading: '\u5bb6\u957f\u8bf4\u660e',
        family_note: '\u672c\u7ec3\u4e60\u6587\u4ef6\u5b8c\u5168\u79bb\u7ebf\u8fd0\u884c\uff0c\u65e0\u9700\u8054\u7f51\u3001\u65e0\u9700\u8d26\u53f7\uff0c\u4e5f\u4e0d\u4f7f\u7528\u4eba\u5de5\u667a\u80fd\u3002\u5b69\u5b50\u53ef\u4ee5\u6309\u81ea\u5df1\u7684\u8282\u594f\u5b8c\u6210\uff0c\u5e76\u4f7f\u7528\u9605\u8bfb\u5de5\u5177 (Aa)\u3002\u5b8c\u6210\u540e\u8bf7\u70b9\u51fb\u201c\u4fdd\u5b58\u6211\u7684\u4f5c\u4e1a\u201d\u6216\u5411\u8001\u5e08\u5c55\u793a\u52a0\u5bc6\u4e8c\u7ef4\u7801\u3002',
        offline_badge: '\u79bb\u7ebf \u00b7 \u65e0\u9700\u8d26\u53f7 \u00b7 \u65e0 AI',
        check: '\u68c0\u67e5',
        skip: '\u8df3\u8fc7',
        reading_tools: '\u9605\u8bfb\u5de5\u5177',
        start_over: '\u91cd\u65b0\u5f00\u59cb',
        back: '\u8fd4\u56de',
        clear: '\u6e05\u9664',
        reset: '\u91cd\u7f6e',
        show_hint: '\u67e5\u770b\u63d0\u793a',
        done: '\u5b8c\u6210',
        close: '\u5173\u95ed',
        show_teacher: '\u7ed9\u8001\u5e08\u770b',
        tools_size: '\u6587\u5b57\u5927\u5c0f',
        tools_colors: '\u989c\u8272',
        tools_spacing: '\u95f4\u8ddd',
        tools_font: '\u5b57\u4f53',
        tools_focus: '\u9605\u8bfb\u805a\u7126',
        tools_lens: '\u653e\u5927\u955c',
        tools_speed: '\u8bed\u901f',
        tools_motion: '\u52a8\u6548',
        tools_normal: '\u6b63\u5e38',
        tools_larger: '\u8f83\u5927',
        tools_largest: '\u6700\u5927',
        tools_high_contrast: '\u9ad8\u5bf9\u6bd4\u5ea6',
        tools_soft: '\u67d4\u548c',
        tools_dark: '\u6df1\u8272',
        tools_wider: '\u66f4\u5bbd',
        tools_off: '\u5173\u95ed',
        tools_on: '\u5f00\u542f',
        tools_ruler: '\u9605\u8bfb\u5c3a',
        tools_slower: '\u66f4\u6162',
        tools_faster: '\u66f4\u5feb',
        about_file: '\u5173\u4e8e\u6b64\u6587\u4ef6',
        keep_results: '\u4fdd\u7559\u6211\u7684\u7ed3\u679c',
        switch_pathway: '\u5207\u6362\u65b9\u5f0f',
        print: '\u6253\u5370',
        undo: '\u64a4\u9500',
        hide_hint: '\u9690\u85cf\u63d0\u793a',
        speak_sentence: '\u6717\u8bfb\u53e5\u5b50',
        backspace: '\u5220\u9664\u4e0a\u4e00\u4e2a',
        start_timer: '\u5f00\u59cb\u8ba1\u65f6',
      },
    },
  };

  var SUPPORTED_LANGUAGES = ['es', 'pt', 'fr', 'ar', 'vi', 'zh'];

  function cleanText(val, maxLen) {
    var s = val == null ? '' : String(val);
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      out += c < 32 || c === 127 ? ' ' : s.charAt(i);
    }
    return out.replace(/\s+/g, ' ').trim().slice(0, maxLen || 240);
  }

  function isBlockedKey(k) {
    return k === '__proto__' || k === 'constructor' || k === 'prototype';
  }

  // FERPA-safe masking for shared-device station deck headers: never exposes full student names.
  function maskStudentLabel(name, slotNumber) {
    var clean = cleanText(name, 60);
    var num = Math.max(1, Math.floor(Number(slotNumber) || 1));
    if (!clean) return 'Student ' + num;
    var parts = clean.split(/\s+/).filter(Boolean).slice(0, 2);
    var masked = parts.map(function (word) {
      var chars = Array.from ? Array.from(word) : word.split('');
      var first = chars[0] || '';
      return chars.length <= 1 ? first + '*' : first + '***';
    }).join(' ');
    return masked || ('Student ' + num);
  }

  function normalizeStationConfig(input) {
    if (input === true) return { enabled: true, maxQueue: STATION_MAX_QUEUE, autoQueueOnFinish: true };
    if (!input || typeof input !== 'object') return { enabled: false, maxQueue: STATION_MAX_QUEUE, autoQueueOnFinish: true };
    var enabled = input.enabled !== false && (input.enabled === true || input.stationMode === true);
    var maxQ = Number(input.maxQueue);
    var bounded = isFinite(maxQ) && maxQ >= 1 ? Math.min(STATION_MAX_QUEUE, Math.floor(maxQ)) : STATION_MAX_QUEUE;
    return { enabled: enabled, maxQueue: bounded, autoQueueOnFinish: input.autoQueueOnFinish !== false };
  }

  function normalizeHomeLanguages(langs, glossary) {
    var out = [];
    var add = function (raw) {
      var code = String(raw || '').trim().toLowerCase().slice(0, 8);
      if (code.indexOf('-') > 0) code = code.split('-')[0];
      if (SUPPORTED_LANGUAGES.indexOf(code) >= 0 && out.indexOf(code) < 0) out.push(code);
    };
    if (Array.isArray(langs)) langs.forEach(add);
    else if (typeof langs === 'string' && langs.trim()) langs.split(/[,\s]+/).forEach(add);
    if (glossary && typeof glossary === 'object' && !Array.isArray(glossary)) {
      Object.keys(glossary).forEach(function (word) {
        if (isBlockedKey(word)) return;
        var entry = glossary[word];
        if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
          Object.keys(entry).forEach(function (code) {
            if (!isBlockedKey(code) && typeof entry[code] === 'string' && entry[code].trim()) add(code);
          });
        }
      });
    }
    return out;
  }

  function sanitizeGlossary(rawGlossary, allowedLangs) {
    var out = {};
    if (!rawGlossary || typeof rawGlossary !== 'object' || Array.isArray(rawGlossary)) return out;
    var allow = Array.isArray(allowedLangs) && allowedLangs.length ? allowedLangs : SUPPORTED_LANGUAGES;
    var words = Object.keys(rawGlossary).slice(0, 120);
    words.forEach(function (rawWord) {
      if (isBlockedKey(rawWord)) return;
      var word = cleanText(rawWord, 80);
      if (!word) return;
      var map = rawGlossary[rawWord];
      if (!map || typeof map !== 'object' || Array.isArray(map)) return;
      var kept = {};
      allow.forEach(function (code) {
        if (isBlockedKey(code) || !Object.prototype.hasOwnProperty.call(map, code)) return;
        var tr = cleanText(map[code], 200);
        if (tr) kept[code] = tr;
      });
      if (Object.keys(kept).length) out[word] = kept;
    });
    return out;
  }

  // Build an allowlisted, self-contained bilingual bundle containing ONLY selected languages + glossary.
  function bilingualBundle(homeLanguages, rawGlossary) {
    var codes = normalizeHomeLanguages(homeLanguages, rawGlossary);
    if (!codes.length) return null;
    var packs = {};
    codes.forEach(function (code) {
      var src = LANGUAGES[code];
      if (!src) return;
      packs[code] = {
        code: src.code,
        name: src.name,
        nativeName: src.nativeName,
        dir: src.dir,
        strings: Object.assign({}, src.strings),
      };
    });
    var glossary = sanitizeGlossary(rawGlossary, codes);
    return { codes: codes, packs: packs, glossary: glossary };
  }

  // Self-contained student-packet runtime for the Bilingual / Home-Language Bridge.
  // Embedded via Function.prototype.toString() ONLY into packets that opt into homeLanguages/bilingualGlossary.
  // Uses ONLY its opts argument; DOM-built nodes only, no browser storage, no network.
  function takeHomeBilingual(opts) {
    var doc = opts.doc, el = opts.el, data = (opts.lesson && opts.lesson.bilingual) || opts.data || {};
    var codes = Array.isArray(data.codes) ? data.codes : [];
    var packs = data.packs && typeof data.packs === 'object' ? data.packs : {};
    var glossary = data.glossary && typeof data.glossary === 'object' ? data.glossary : {};
    if (!codes.length) return null;

    var activeCode = '';
    var buttons = [];
    var curOverlay = null;
    var obs = null;

    // Exact-match allowlist for dual-language button/summary subtitles (never mutates textContent).
    var chromeMap = {
      'start': 'start',
      'continue': 'continue',
      'continue where i left off': 'continue',
      'next': 'next',
      'check': 'check',
      'check answer': 'check',
      'check answers': 'check',
      'check my answer': 'check',
      'check my answers': 'check',
      'submit': 'check',
      'skip': 'skip',
      'show hint': 'show_hint',
      'hint': 'show_hint',
      'see my results': 'finish',
      'finish': 'finish',
      'done': 'done',
      'save my work': 'save_work',
      'save my work as a file': 'save_work',
      'ready for next student': 'station_next',
      'try a stretch challenge': 'stretch_button',
      'reading tools': 'reading_tools',
      'more reading tools': 'reading_tools',
      'start over': 'start_over',
      'practice again': 'start_over',
      'back': 'back',
      'previous': 'back',
      'clear': 'clear',
      'reset': 'reset',
      'close': 'close',
      'show my teacher': 'show_teacher',
      'for grown-ups': 'family_note_heading',
      'text size': 'tools_size',
      'colors': 'tools_colors',
      'spacing': 'tools_spacing',
      'letters': 'tools_font',
      'reading focus': 'tools_focus',
      'magnifier': 'tools_lens',
      'voice speed': 'tools_speed',
      'motion': 'tools_motion',
      'normal': 'tools_normal',
      'usual': 'tools_normal',
      'larger': 'tools_larger',
      'largest': 'tools_largest',
      'extra large': 'tools_largest',
      'high contrast': 'tools_high_contrast',
      'soft': 'tools_soft',
      'dark': 'tools_dark',
      'wider': 'tools_wider',
      'extra wide': 'tools_wider',
      'off': 'tools_off',
      'on': 'tools_on',
      'ruler': 'tools_ruler',
      'slower': 'tools_slower',
      'very slow': 'tools_slower',
      'faster': 'tools_faster',
      'fastest': 'tools_faster',
      'about this file': 'about_file',
      'keep my results': 'keep_results',
      'keep my answers': 'keep_results',
      'check my sort': 'check',
      'check order': 'check',
      'check blocks': 'check',
      'check fraction': 'check',
      'check point': 'check',
      'check balance': 'check',
      'check work': 'check',
      'check amount': 'check',
      'check budget': 'check',
      'check choice': 'check',
      'check loads': 'check',
      'check blanks': 'check',
      'submit answer': 'check',
      'submit work': 'check',
      'submit point': 'check',
      'submit blocks': 'check',
      'submit fraction': 'check',
      'submit balance': 'check',
      'submit order': 'check',
      'submit sort': 'check',
      'reset sort': 'reset',
      'reset order': 'reset',
      'reset blocks': 'reset',
      'reset scale': 'reset',
      'clear shading': 'clear',
      'clear grid': 'clear',
      'clear tray': 'clear',
      'clear basket': 'clear',
      'uncheck all': 'clear',
      'switch pathway': 'switch_pathway',
      'hide hint': 'hide_hint',
      'undo hop': 'undo',
      'undo step': 'undo',
      'go back': 'back',
      'print my writing': 'print',
      'print study poster': 'print',
      'print paper backup': 'print',
      'finish writing': 'done',
      'finish checklist': 'done',
      'finish focus block': 'done',
      'done with reset': 'done',
      'complete reflection': 'done',
      'complete adventure': 'done',
      'mark study guide reviewed': 'done',
      'start stage 1': 'start',
      'open communication board': 'start',
      'start timer': 'start_timer',
      'speak sentence': 'speak_sentence',
      'backspace': 'backspace',
      'your code name or first name': 'learner_label',
      'name or initials (optional)': 'learner_label',
      'your name': 'learner_label',
    };

    var syncChrome = function () {
      if (!doc || typeof doc.querySelectorAll !== 'function') return;
      var p = activeCode && packs[activeCode] ? packs[activeCode] : null;
      var s = (p && p.strings) || null;
      var dirAttr = p && p.dir === 'rtl' ? 'rtl' : 'ltr';
      var nodes = doc.querySelectorAll('button, summary, label, .lt-l, .lt-h');
      for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        if (!node || !node.hasAttribute) continue;
        if (node.hasAttribute('data-bilingual-lang')) continue;
        if (node.hasAttribute('data-tools-open')) {
          if (s && s.reading_tools) node.setAttribute('aria-description', s.reading_tools);
          else node.removeAttribute('aria-description');
          continue;
        }
        var raw = String(node.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
        var key = Object.prototype.hasOwnProperty.call(chromeMap, raw) ? chromeMap[raw] : '';
        var label = s && key && typeof s[key] === 'string' ? s[key] : '';
        if (label) {
          node.setAttribute('data-bi-label', label);
          node.setAttribute('data-bi-dir', dirAttr);
          node.setAttribute('aria-description', label);
        } else if (node.hasAttribute('data-bi-label')) {
          node.removeAttribute('data-bi-label');
          node.removeAttribute('data-bi-dir');
          node.removeAttribute('aria-description');
        }
      }
    };

    var syncObserver = function () {
      if (obs) { try { obs.disconnect(); } catch (_) {} obs = null; }
      if (!activeCode || !packs[activeCode]) return;
      var target = (doc && doc.body) || (doc && doc.getElementById && doc.getElementById('app'));
      if (!target) return;
      var MO = (doc.defaultView && doc.defaultView.MutationObserver) || (typeof MutationObserver === 'function' ? MutationObserver : null);
      if (!MO) return;
      obs = new MO(function () { syncChrome(); });
      try { obs.observe(target, { childList: true, subtree: true, characterData: true }); } catch (_) { obs = null; }
    };

    var setLang = function (code) {
      var next = code && Object.prototype.hasOwnProperty.call(packs, code) ? code : '';
      activeCode = next;
      buttons.forEach(function (b) {
        var bCode = b.getAttribute('data-bilingual-lang') || '';
        b.setAttribute('aria-pressed', String(bCode === activeCode));
      });
      if (opts.announce) {
        var p = activeCode ? packs[activeCode] : null;
        opts.announce(p ? (p.nativeName + ' (' + p.name + ')') : 'English');
      }
      if (curOverlay) curOverlay.paint();
      syncChrome();
      syncObserver();
      if (activeCode && typeof opts.sup === 'function') opts.sup('bilingualBridge');
      else if (activeCode && typeof opts.onBi === 'function') opts.onBi(activeCode);
      if (typeof opts.onChange === 'function') opts.onChange(activeCode);
    };

    var bar = el('div', { class: 'bi-bar', role: 'group', 'aria-label': 'Home language', 'data-bilingual-bar': '' });
    if (codes.length === 1) {
      var single = packs[codes[0]];
      if (single) {
        var singleBtn = el('button', {
          type: 'button',
          class: 'bi-btn',
          lang: single.code,
          dir: single.dir,
          'data-bilingual-lang': single.code,
          'aria-pressed': 'false',
          on: { click: function () { setLang(activeCode === single.code ? '' : single.code); } },
          text: single.nativeName,
        });
        buttons.push(singleBtn);
        bar.appendChild(singleBtn);
      }
    } else {
      var enBtn = el('button', {
        type: 'button',
        class: 'bi-btn',
        lang: 'en',
        'data-bilingual-lang': '',
        'aria-pressed': 'true',
        on: { click: function () { setLang(''); } },
        text: 'EN',
      });
      buttons.push(enBtn);
      bar.appendChild(enBtn);
      codes.forEach(function (code) {
        var p = packs[code];
        if (!p) return;
        var btn = el('button', {
          type: 'button',
          class: 'bi-btn',
          lang: p.code,
          dir: p.dir,
          'data-bilingual-lang': p.code,
          'aria-pressed': 'false',
          on: { click: function () { setLang(activeCode === p.code ? '' : p.code); } },
          text: p.nativeName,
        });
        buttons.push(btn);
        bar.appendChild(btn);
      });
    }

    var matchGlossary = function (item, code) {
      var matches = [];
      var keys = Object.keys(glossary);
      if (!keys.length || !code) return matches;
      var hay = '';
      if (item && typeof item === 'object') {
        var parts = [item.word, item.term, item.target, item.prompt, item.sentence, item.passage];
        if (Array.isArray(item.words)) parts = parts.concat(item.words);
        hay = parts.filter(function (v) { return typeof v === 'string' && v; }).join(' ').toLowerCase();
      }
      keys.forEach(function (word) {
        var entry = glossary[word];
        var tr = entry && typeof entry[code] === 'string' ? entry[code] : '';
        if (!tr) return;
        var low = word.toLowerCase();
        if (!item || hay.indexOf(low) >= 0) matches.push({ word: word, translation: tr });
      });
      return matches;
    };

    var buildOverlay = function (kind, item) {
      var wrap = el('div', { 'data-bilingual-region': kind });
      var paint = function () {
        while (wrap.firstChild) wrap.removeChild(wrap.firstChild);
        if (!activeCode || !packs[activeCode]) { wrap.hidden = true; return; }
        wrap.hidden = false;
        var p = packs[activeCode], s = p.strings || {};
        var dirAttr = p.dir === 'rtl' ? 'rtl' : 'ltr';
        if (kind === 'start') {
          var chips = [s.learner_label, s.start, s.offline_badge].filter(Boolean);
          wrap.appendChild(el('section', { class: 'bi-banner', lang: p.code, dir: dirAttr, 'aria-label': s.directions_heading || p.nativeName, 'data-bilingual-banner': 'start' }, [
            el('p', { class: 'bi-head', text: s.directions_heading || p.nativeName }),
            el('p', { class: 'bi-text', text: s.intro || '' }),
            chips.length ? el('ul', { class: 'bi-chips' }, chips.map(function (t) { return el('li', { text: t }); })) : null,
          ]));
          if (s.family_note) {
            wrap.appendChild(el('details', { class: 'bi-family', lang: p.code, dir: dirAttr, 'data-bilingual-family': '' }, [
              el('summary', { text: s.family_note_heading || 'Family note' }),
              el('p', { text: s.family_note }),
            ]));
          }
          var allGloss = matchGlossary(null, activeCode);
          if (allGloss.length) {
            wrap.appendChild(el('details', { class: 'bi-family', lang: p.code, dir: dirAttr, 'data-bilingual-glossary': 'all' }, [
              el('summary', { text: (s.glossary_heading || 'Word help') + ' (' + allGloss.length + ')' }),
              el('ul', { class: 'bi-gloss-list' }, allGloss.map(function (g) {
                return el('li', { class: 'bi-gloss-row' }, [
                  el('span', { class: 'bi-gloss-en', lang: 'en', dir: 'ltr', text: g.word }),
                  el('span', { text: g.translation }),
                ]);
              })),
            ]));
          }
        } else if (kind === 'item') {
          var itemChips = [s.next, s.try_again].filter(Boolean);
          wrap.appendChild(el('div', { class: 'bi-banner', lang: p.code, dir: dirAttr, 'data-bilingual-banner': 'item' }, [
            el('p', { class: 'bi-head', text: s.directions_heading || p.nativeName }),
            el('p', { class: 'bi-text', text: s.intro || '' }),
            itemChips.length ? el('ul', { class: 'bi-chips' }, itemChips.map(function (t) { return el('li', { text: t }); })) : null,
          ]));
          var itemGloss = matchGlossary(item, activeCode);
          if (itemGloss.length) {
            wrap.appendChild(el('div', { class: 'bi-glossary', lang: p.code, dir: dirAttr, 'data-bilingual-glossary': 'item' }, [
              el('p', { class: 'bi-head', text: s.glossary_heading || 'Word help' }),
              el('ul', { class: 'bi-gloss-list' }, itemGloss.map(function (g) {
                return el('li', { class: 'bi-gloss-row' }, [
                  el('span', { class: 'bi-gloss-en', lang: 'en', dir: 'ltr', text: g.word }),
                  el('span', { text: g.translation }),
                ]);
              })),
            ]));
          }
        } else if (kind === 'finish') {
          var endChips = [s.save_work, s.station_next].filter(Boolean);
          wrap.appendChild(el('section', { class: 'bi-banner', lang: p.code, dir: dirAttr, 'aria-label': s.done_title || p.nativeName, 'data-bilingual-banner': 'finish' }, [
            el('p', { class: 'bi-head', text: s.done_title || p.nativeName }),
            el('p', { class: 'bi-text', text: s.done_last_step || '' }),
            endChips.length ? el('ul', { class: 'bi-chips' }, endChips.map(function (t) { return el('li', { text: t }); })) : null,
          ]));
          if (s.family_note) {
            wrap.appendChild(el('details', { class: 'bi-family', lang: p.code, dir: dirAttr, 'data-bilingual-family': '' }, [
              el('summary', { text: s.family_note_heading || 'Family note' }),
              el('p', { text: s.family_note }),
            ]));
          }
        }
      };
      paint();
      return { node: wrap, paint: paint };
    };

    var mountToBar = function (toolBar) {
      if (!toolBar) return;
      if (bar.parentNode !== toolBar) toolBar.insertBefore(bar, toolBar.firstChild);
    };
    if (opts.bar) mountToBar(opts.bar);
    var view = function (kind, item) {
      curOverlay = buildOverlay(kind, item || null);
      if (activeCode) {
        syncChrome();
        if (typeof Promise === 'function') Promise.resolve().then(syncChrome);
      }
      return curOverlay.node;
    };
    var ctxApi = {
      lang: function () { return activeCode; },
      pack: function () { return activeCode && packs[activeCode] ? packs[activeCode] : null; },
      dir: function () { return activeCode && packs[activeCode] ? packs[activeCode].dir : 'ltr'; },
      syncChrome: syncChrome,
      glossary: function (word) {
        if (!activeCode || !word) return '';
        var low = String(word).trim().toLowerCase();
        var keys = Object.keys(glossary);
        for (var i = 0; i < keys.length; i++) {
          if (keys[i].toLowerCase() === low) return (glossary[keys[i]] && glossary[keys[i]][activeCode]) || '';
        }
        return '';
      },
    };

    return {
      bar: bar,
      mountToBar: mountToBar,
      ctx: ctxApi,
      lang: ctxApi.lang,
      pack: ctxApi.pack,
      dir: ctxApi.dir,
      glossary: ctxApi.glossary,
      syncChrome: syncChrome,
      setLang: setLang,
      buildOverlay: buildOverlay,
      view: view,
      v: view,
      doc: doc,
    };
  }

  // Reusable DOM-built helpers for Waves 2-5 teacher maker pages.
  function createStationConfigControl(doc, options) {
    var o = options || {};
    var id = cleanText(o.id || 'opt-station-mode', 40) || 'opt-station-mode';
    var labelText = cleanText(o.label || 'Shared device / station mode (let multiple students take turns and queue sealed QRs)', 200);
    var input = doc.createElement('input');
    input.type = 'checkbox';
    input.id = id;
    input.checked = !!o.checked;
    if (typeof o.onChange === 'function') {
      input.addEventListener('change', function () { o.onChange(!!input.checked); });
    }
    var label = doc.createElement('label');
    label.className = o.className || 'qr-check-opt';
    label.appendChild(input);
    label.appendChild(doc.createTextNode(' ' + labelText));
    return { node: label, input: input, isEnabled: function () { return !!input.checked; } };
  }

  function createBilingualPickerControl(doc, options) {
    var o = options || {};
    var initial = normalizeHomeLanguages(o.selected || []);
    var fieldset = doc.createElement('fieldset');
    fieldset.className = o.className || 'bi-picker';
    var legend = doc.createElement('legend');
    legend.textContent = cleanText(o.legend || 'Optional home-language bridge (curated offline directions)', 140);
    fieldset.appendChild(legend);
    var inputs = {};
    var notify = function () {
      if (typeof o.onChange === 'function') o.onChange(getSelected());
    };
    var getSelected = function () {
      return SUPPORTED_LANGUAGES.filter(function (c) { return inputs[c] && inputs[c].checked; });
    };
    SUPPORTED_LANGUAGES.forEach(function (code) {
      var pack = LANGUAGES[code];
      var lbl = doc.createElement('label');
      lbl.className = 'bi-picker-opt';
      var cb = doc.createElement('input');
      cb.type = 'checkbox';
      cb.value = code;
      cb.checked = initial.indexOf(code) >= 0;
      cb.addEventListener('change', notify);
      inputs[code] = cb;
      lbl.appendChild(cb);
      lbl.appendChild(doc.createTextNode(' ' + pack.name + ' (' + pack.nativeName + ')'));
      fieldset.appendChild(lbl);
    });
    return { node: fieldset, getSelected: getSelected };
  }

  var api = {
    STATION_MAX_QUEUE: STATION_MAX_QUEUE,
    STATION_LABELS: STATION_LABELS,
    STATION_CSS: STATION_CSS,
    BILINGUAL_CSS: BILINGUAL_CSS,
    SUPPORTED_LANGUAGES: SUPPORTED_LANGUAGES,
    LANGUAGES: LANGUAGES,
    maskStudentLabel: maskStudentLabel,
    normalizeStationConfig: normalizeStationConfig,
    normalizeHomeLanguages: normalizeHomeLanguages,
    sanitizeGlossary: sanitizeGlossary,
    bilingualBundle: bilingualBundle,
    takeHomeBilingual: takeHomeBilingual,
    createStationConfigControl: createStationConfigControl,
    createBilingualPickerControl: createBilingualPickerControl,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.AlloPacketStationBilingual = api;
})(typeof window !== 'undefined' ? window : globalThis);
