/**
 * AlloFlow — Voice Config Module
 *
 * Three TTS voice catalog tables (GEMINI_VOICES, KOKORO_VOICES,
 * EDGE_TTS_VOICES) plus the derived AVAILABLE_VOICES list. Used by the
 * voice-picker UI in project settings + various TTS dispatch points.
 *
 * Pure data. No external dependencies.
 *
 * Extracted verbatim from AlloFlowANTI.txt lines 1876-1966 (May 2026).
 */
(function () {
  'use strict';
  if (window.AlloModules && window.AlloModules.VoiceConfig) {
    console.log('[CDN] VoiceConfigModule already loaded, skipping');
    return;
  }

const GEMINI_VOICES = [
  { id: "Kore",       label: "Kore — Bright, energetic female" },
  { id: "Puck",       label: "Puck — Energetic, expressive male" },
  { id: "Charon",     label: "Charon — Deep, warm male" },
  { id: "Fenrir",     label: "Fenrir — Friendly, clear male" },
  { id: "Aoede",      label: "Aoede — Warm, articulate female" },
  { id: "Leda",       label: "Leda" },
  { id: "Orus",       label: "Orus" },
  { id: "Zephyr",     label: "Zephyr" },
  { id: "Callirrhoe", label: "Callirrhoe" },
  { id: "Autonoe",    label: "Autonoe" },
  { id: "Enceladus",  label: "Enceladus" },
  { id: "Iapetus",    label: "Iapetus" },
  { id: "Umbriel",    label: "Umbriel" },
  { id: "Algieba",    label: "Algieba" },
  { id: "Despina",    label: "Despina" },
  { id: "Erinome",    label: "Erinome" },
  { id: "Algenib",    label: "Algenib" },
  { id: "Rasalgethi", label: "Rasalgethi" },
  { id: "Laomedeia",  label: "Laomedeia" },
  { id: "Achernar",   label: "Achernar" },
  { id: "Alnilam",    label: "Alnilam" },
  { id: "Schedar",    label: "Schedar" },
  { id: "Gacrux",     label: "Gacrux" },
  { id: "Pulcherrima",label: "Pulcherrima" },
  { id: "Achird",     label: "Achird" },
  { id: "Zubenelgenubi",  label: "Zubenelgenubi" },
  { id: "Vindemiatrix",   label: "Vindemiatrix" },
  { id: "Sadachbia",  label: "Sadachbia" },
  { id: "Sadaltager", label: "Sadaltager" },
  { id: "Sulafat",    label: "Sulafat" },
];
const KOKORO_VOICES = [
  { id: 'af_heart',     label: '❤️ Heart — Warm female (English US)' },
  { id: 'af_nova',      label: '⭐ Nova — Clear female (English US)' },
  { id: 'af_sky',       label: '🌤️ Sky — Bright female (English US)' },
  { id: 'af_bella',     label: '🔔 Bella — Elegant female (English US)' },
  { id: 'af_sarah',     label: '🌸 Sarah — Gentle female (English US)' },
  { id: 'af_nicole',    label: '🎵 Nicole — Musical female (English US)' },
  { id: 'af_alloy',     label: '🔩 Alloy — Versatile female (English US)' },
  { id: 'af_aoede',     label: '🎶 Aoede — Melodic female (English US)' },
  { id: 'af_jessica',   label: '💐 Jessica — Friendly female (English US)' },
  { id: 'af_kore',      label: '🌿 Kore — Calm female (English US)' },
  { id: 'af_river',     label: '🌊 River — Smooth female (English US)' },
  { id: 'am_adam',      label: '🧑 Adam — Natural male (English US)' },
  { id: 'am_michael',   label: '🎙️ Michael — Deep male (English US)' },
  { id: 'am_echo',      label: '📡 Echo — Resonant male (English US)' },
  { id: 'am_eric',      label: '🎤 Eric — Confident male (English US)' },
  { id: 'am_fenrir',    label: '🐺 Fenrir — Bold male (English US)' },
  { id: 'am_liam',      label: '📘 Liam — Steady male (English US)' },
  { id: 'am_onyx',      label: '🖤 Onyx — Rich male (English US)' },
  { id: 'am_puck',      label: '🃏 Puck — Playful male (English US)' },
  { id: 'bf_emma',      label: '🇬🇧 Emma — British female' },
  { id: 'bf_isabella',  label: '🇬🇧 Isabella — British female' },
  { id: 'bf_alice',     label: '🇬🇧 Alice — British female' },
  { id: 'bf_lily',      label: '🇬🇧 Lily — British female' },
  { id: 'bm_george',    label: '🇬🇧 George — British male' },
  { id: 'bm_lewis',     label: '🇬🇧 Lewis — British male' },
  { id: 'bm_daniel',    label: '🇬🇧 Daniel — British male' },
  { id: 'bm_fable',     label: '🇬🇧 Fable — British male' },
];
const EDGE_TTS_VOICES = [
  { id: "alloy",   label: "🇺🇸 Ava (English, US)" },
  { id: "echo",    label: "🇺🇸 Andrew (English, US)" },
  { id: "nova",    label: "🇺🇸 Jenny (English, US)" },
  { id: "shimmer", label: "🇺🇸 Aria (English, US)" },
  { id: "puck",    label: "🇺🇸 Brian (English, US)" },
  { id: "onyx",    label: "🇺🇸 Guy (English, US)" },
  { id: "fable",   label: "🇬🇧 Sonia (English, UK)" },
  { id: "es",      label: "🇪🇸 Elvira (Spanish)" },
  { id: "fr",      label: "🇫🇷 Denise (French)" },
  { id: "de",      label: "🇩🇪 Katja (German)" },
  { id: "pt",      label: "🇧🇷 Francisca (Portuguese)" },
  { id: "it",      label: "🇮🇹 Elsa (Italian)" },
  { id: "zh",      label: "🇨🇳 Xiaoxiao (Chinese)" },
  { id: "ja",      label: "🇯🇵 Nanami (Japanese)" },
  { id: "ko",      label: "🇰🇷 Sun-Hi (Korean)" },
  { id: "ar",      label: "🇸🇦 Zariyah (Arabic)" },
  { id: "hi",      label: "🇮🇳 Swara (Hindi)" },
  { id: "ru",      label: "🇷🇺 Svetlana (Russian)" },
  { id: "tr",      label: "🇹🇷 Emel (Turkish)" },
  { id: "vi",      label: "🇻🇳 Hoài My (Vietnamese)" },
  { id: "th",      label: "🇹🇭 Premwadee (Thai)" },
  { id: "pl",      label: "🇵🇱 Agnieszka (Polish)" },
  { id: "nl",      label: "🇳🇱 Colette (Dutch)" },
  { id: "sv",      label: "🇸🇪 Sofie (Swedish)" },
  { id: "uk",      label: "🇺🇦 Polina (Ukrainian)" },
  { id: "id",      label: "🇮🇩 Gadis (Indonesian)" },
  { id: "ms",      label: "🇲🇾 Yasmin (Malay)" },
];
const AVAILABLE_VOICES = GEMINI_VOICES.map(v => v.id);

  // Mirror to window for any consumer that reads window.GEMINI_VOICES etc.
  if (typeof window !== 'undefined') {
    window.GEMINI_VOICES = GEMINI_VOICES;
    window.KOKORO_VOICES = KOKORO_VOICES;
    window.EDGE_TTS_VOICES = EDGE_TTS_VOICES;
    window.AVAILABLE_VOICES = AVAILABLE_VOICES;
  }

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.VoiceConfig = {
    GEMINI_VOICES: GEMINI_VOICES,
    KOKORO_VOICES: KOKORO_VOICES,
    EDGE_TTS_VOICES: EDGE_TTS_VOICES,
    AVAILABLE_VOICES: AVAILABLE_VOICES
  };

  if (typeof window._upgradeVoiceConfig === 'function') {
    try { window._upgradeVoiceConfig(); } catch (e) { console.warn('[VoiceConfig] upgrade hook failed', e); }
  }

  console.log('[CDN] VoiceConfigModule loaded — ' + GEMINI_VOICES.length + ' Gemini, ' + KOKORO_VOICES.length + ' Kokoro, ' + EDGE_TTS_VOICES.length + ' Edge voices');
})();
