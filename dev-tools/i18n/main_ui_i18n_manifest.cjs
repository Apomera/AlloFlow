'use strict';

// Localization surfaces exercised by the main-shell Playwright audit. Keep this
// intentionally narrower than the enormous content/simulation catalog: these
// strings belong to navigation, setup, documents, reading-library, and global
// accessibility controls that every language pack must provide.
const ENGLISH_ADDITIONS = {
  readinglib_open_rn_mirror_notice: 'Accessibility-ready Open RN chapter mirror · CC BY 4.0 · educational material only. Follow current clinical policy, instructor guidance, and professional standards for patient-care decisions.',
  wizard: {
    step_status: 'Step',
    step_of: 'of',
    progress: 'Quick Start progress',
    progress_value: 'Step {current} of {total}',
    help_click_element: 'Click any element below for a detailed explanation',
  },
  bot: {
    assistant_landmark: 'AlloBot assistant',
    move_instructions: 'Use the arrow keys to move AlloBot. Hold Shift with an arrow key for a larger step.',
  },
  header: {
    voice_speed: 'Speed',
    voice_volume: 'Volume',
  },
  student_tools: {
    focus: 'Focus',
    input_practice: 'Input & practice',
    read: 'Read',
  },
  ai_backend: {
    advanced_toggle: 'Advanced settings',
    advanced_toggle_close: 'Back to guided setup',
    engine_connected: 'Connected — this app is using it right now.',
    engine_desktop_only: 'The Built-in Engine runs inside AlloFlow Desktop. Install the desktop app to use local AI on this computer — no account or key needed.',
    engine_downloading: 'Downloading',
    engine_first_run: '(first start downloads the AI model — about 2 GB, one time)',
    engine_reload_note: 'Reload the app to start using it.',
    engine_running: 'Engine running',
    engine_start_btn: 'Start engine',
    engine_starting: 'Starting the engine…',
    engine_stopped: 'Engine is not running.',
    engine_unreachable: 'Could not reach the desktop runtime from this page.',
    gemini_images_fix: 'For pictures, run AlloFlow in Gemini Canvas instead, or enable billing on this key. Neither is needed for anything else.',
    gemini_images_kicker: 'Text yes, pictures no',
    gemini_images_note: 'The free Google API tier does not include image generation. Every text tool works: lessons, questions, translation, levelling, glossaries. The tools that DRAW something will not, on a free key.',
    guided_back: 'Back',
    guided_backend_custom_label: 'your custom endpoint',
    guided_backend_private_label: 'the built-in private AI',
    guided_card_connect_body: 'Already use LM Studio, Ollama, or LocalAI on this computer? Connect it.',
    guided_card_connect_title: 'An AI app I already run',
    guided_card_gemini_badge: 'Recommended',
    guided_card_gemini_body: "Best quality and speed. Runs in Google's cloud with a free key — we'll walk you through getting one (about 2 minutes).",
    guided_card_gemini_req: 'Works anywhere · needs internet',
    guided_card_gemini_title: 'Google Gemini',
    guided_card_private_badge: 'Most private',
    guided_card_private_body: 'Everything stays on this computer — no account, no internet needed after setup. One click downloads a starter AI model.',
    guided_card_private_req: '8 GB+ memory recommended · ~2.5 GB one-time download',
    guided_card_private_title: 'Private AI on this computer',
    guided_choose_kicker: 'First-time setup · Choose your AI',
    guided_connect_custom_body: 'Any OpenAI-compatible server.',
    guided_connect_custom_step1: 'Enter your server address below.',
    guided_connect_custom_step2: 'Add an API key only if your server requires one.',
    guided_connect_custom_step3: 'Press Test Connection below.',
    guided_connect_custom_title: 'Custom endpoint',
    guided_connect_detail_kicker: 'Step 3 of 3 · Connect',
    guided_connect_key_hint: '(only if your server needs one)',
    guided_connect_key_label: 'API key',
    guided_connect_kicker: 'Step 2 of 3 · Which app do you run?',
    guided_connect_lmstudio_body: 'Desktop app with a friendly model browser.',
    guided_connect_lmstudio_step1: 'Install LM Studio from lmstudio.ai (free).',
    guided_connect_lmstudio_step2: 'Use its search to download a model — "Qwen 2.5 7B Instruct" is a good start.',
    guided_connect_lmstudio_step3: 'Open the Developer / Local Server tab and press Start.',
    guided_connect_lmstudio_step4: 'Press Test Connection below.',
    guided_connect_localai_body: 'Self-hosted server (advanced).',
    guided_connect_localai_step1: 'Follow the LocalAI install guide at localai.io.',
    guided_connect_localai_step2: 'Start the server with at least one text model.',
    guided_connect_localai_step3: 'Press Test Connection below.',
    guided_connect_ollama_body: 'Lightweight command-line runner.',
    guided_connect_ollama_step1: 'Install Ollama from ollama.com (free).',
    guided_connect_ollama_step2: 'In a terminal, run: ollama run llama3.2',
    guided_connect_ollama_step3: 'Leave it running.',
    guided_connect_ollama_step4: 'Press Test Connection below.',
    guided_connected_chip: 'Connected —',
    guided_current_badge: 'Current',
    guided_done: 'Done',
    guided_gemini_key_label: 'Your Gemini API key',
    guided_gemini_key_note: 'Stored only on this device. The free tier covers everyday classroom use.',
    guided_gemini_kicker: 'Step 2 of 2 · Google Gemini',
    guided_gemini_step1: 'Open Google AI Studio ↗',
    guided_gemini_step2: 'Sign in with any Google account (a free one is fine).',
    guided_gemini_step3: 'Press "Create API key" and copy it.',
    guided_gemini_step4: 'Paste the key below.',
    guided_intro: "AlloFlow uses an AI engine to create lessons, read aloud, and answer questions. Pick how you'd like it to work — you can change this any time.",
    guided_private_b1a: 'Private:',
    guided_private_b1b: 'lessons and student text never leave this computer.',
    guided_private_b2a: 'One-time download:',
    guided_private_b2b: 'a starter AI model (about 2 GB). Keep the app open until it finishes.',
    guided_private_b3a: 'Hardware:',
    guided_private_b3b: 'works best with 8 GB+ memory and ~2.5 GB free disk.',
    guided_private_b4a: 'Speed:',
    guided_private_b4b: "answers take a bit longer than cloud AI — that's the privacy trade.",
    guided_private_kicker: 'Step 2 of 2 · Private AI on this computer',
    guided_ready: "You're ready — AlloFlow is using",
    guided_ready_note: 'Your choice is active now — close this window and start working.',
    personal_privacy_notice: 'Your prompts and activity content are sent directly to the provider you choose and may create charges. Follow your school or district rules, do not include private student information, and use a restricted, low-budget key. Avoid shared devices.',
    personal_session_title: 'Personal AI for this session',
    personal_storage_notice: 'Use only your own provider account. Your credential is stored only in this browser tab and transmitted only to the provider you choose; it is never placed in the QR, Class Mailbox, or student submission.',
    personal_title: 'Connect Personal AI',
    pledge_body: 'A developer key is a developer tool. If something breaks I will report it, and if I build a lesson or tool worth sharing I will send it to the Community Catalog from my history so other teachers get it too.',
    pledge_report: 'Report something ↗',
    pledge_share: 'Share what you made ↗',
    pledge_title: 'I will help make AlloFlow better.',
    preset_applied: 'Preset applied. Test connection to discover models, then reload to apply.',
    reload_after_change: 'Reload page after changing backend to apply.',
    sd_available: 'Available. Downloads a ~2GB model once, then images generate on this computer at no cost.',
    sd_download_btn: 'Download & enable',
    sd_downloading: 'Downloading the model... about 2GB, one time only.',
    sd_failed: 'Download failed. Check the connection and try again.',
    sd_no_gpu: 'Not available on this computer (no WebGPU graphics adapter). Cloud image AI needs Gemini Canvas or a billing-enabled key; the free API tier does not generate images.',
    sd_ready: 'Ready. Images generate on this computer when cloud image AI is unavailable.',
    sd_title: 'Local images (SD-Turbo)',
    student_verified_note: 'Verified connections enable text AI only for this browser tab. Media generation stays off unless separately verified.',
  },
};

const LANGUAGE_CODES = {
  acholi: 'ach', amharic: 'am', arabic: 'ar', bengali: 'bn', burmese: 'my',
  chinese_simplified: 'zh-CN', chinese_traditional: 'zh-TW', chin_falam: 'cfm', chin_hakha: 'cnh',
  dari: 'fa', dutch: 'nl', esperanto: 'eo', farsi: 'fa', french: 'fr', french_canadian: 'fr',
  german: 'de', greek: 'el', gujarati: 'gu', haitian_creole: 'ht', hausa: 'ha', hebrew: 'he',
  hindi: 'hi', hmong: 'hmn', igbo: 'ig', indonesian: 'id', italian: 'it', japanese: 'ja',
  kannada: 'kn', karen: 'ksw', khmer: 'km', kinyarwanda: 'rw', kirundi: 'rn', korean: 'ko',
  lao: 'lo', latin: 'la', lingala: 'ln', maay_maay: 'so', malayalam: 'ml', marathi: 'mr',
  marshallese: 'mh', nepali: 'ne', pashto: 'ps', polish: 'pl', portuguese_angola: 'pt',
  portuguese_brazil: 'pt', portuguese_portugal: 'pt', punjabi: 'pa', romanian: 'ro', russian: 'ru',
  somali: 'so', spanish_castilian: 'es', spanish_latin_america: 'es', swahili: 'sw', tagalog: 'tl',
  tamil: 'ta', telugu: 'te', thai: 'th', tigrinya: 'ti', turkish: 'tr', ukrainian: 'uk',
  urdu: 'ur', vietnamese: 'vi', yoruba: 'yo',
};

function isMainUiKey(key) {
  return key.startsWith('readinglib_')
    || key.startsWith('sidebar.tool_finder_')
    || key.startsWith('export_menu.')
    || key.startsWith('student_tools.')
    || key.startsWith('canvas_settings.local_storage_')
    || key.startsWith('ai_backend.')
    || key === 'common.recall_hints_and_messages'
    || key === 'a11y.resize_panes'
    || key === 'error_reporter_badge_aria'
    || key === 'bot.assistant_landmark'
    || key === 'bot.move_instructions'
    || key.startsWith('wizard.step_')
    || key === 'wizard.progress'
    || key === 'wizard.progress_value'
    || key === 'wizard.help_click_element'
    || key === 'header.voice_speed'
    || key === 'header.voice_volume';
}

// AlloBot has its own additive pass because its catalog grows independently
// of the navigation/setup strings audited by the main-shell parity check.
// Keeping this predicate separate lets CI report the AlloBot gap without
// masking unrelated main-shell localization regressions.
const isAlloBotKey = (key) => key.startsWith('tips.') || key.startsWith('bot_events.');

module.exports = { ENGLISH_ADDITIONS, LANGUAGE_CODES, isMainUiKey, isAlloBotKey };
