
## youtube (1 hits)
  L546:         off_task_gaming: /\b(fortnite|minecraft|roblox|among us|pokemon|call of duty|valorant|apex|gta|fifa|playstation|xbox|nintendo|twitch

## url_import (0 hits)

## source_text_state (64 hits)
  L11485:             const passageTitle = (r.data.sourceText || '').substring(0, 40).replace(/[\n\r,]/g, ' ').trim() || 'Untitled';
  L12374:             sourceText: passage,
  L12447:     const generateFluencyScoreSheet = (result, sourceText) => {
  L30864:       sourceText: passage,
  L36437:     const sourceText = parts[0].trim();
  L36439:     const sourcePars = sourceText.split(/\n{2,}/).filter(p => p.trim());
  L36441:     return { source: sourcePars, target: targetPars, sourceFull: sourceText, targetFull: targetText };
  L36798:                   let sourceText = "";
  L36800:                       sourceText = generatedContent?.data.split('--- ENGLISH TRANSLATION ---')[0];
  L36801:                       sourceText = sourceText.replace(/^#{1,6}\s/gm, '').replace(/\*{1,3}/g, '').replace(/[`~]/g, '');
  L36803:                       sourceText = generatedContent?.data.originalText;
  L36805:                   sourceText = sourceText.replace(/\[([^\]]*)\]\([^)]+\)/g, '$1');
  L36806:                   sourceText = sourceText.replace(/https?:\/\/[^\s]+/g, '');
  L36807:                   sourceText = sourceText.replace(/\[\d+\]/g, '');
  L36808:                   sourceText = sourceText.replace(/[⁽⁾⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, '');
  ... and 49 more

## url_input (15 hits)
  L27237:   const [urlInput, setUrlInput] = useState('');
  L27393:           setUrlInput('');
  L27397:       setUrlInput(option.url);
  L27650:                                       value={urlInput}
  L27651:                                       onChange={(e) => setUrlInput(e.target.value)}
  L27655:                                       onKeyDown={(e) => e.key === 'Enter' && handleWizardUrlFetch(urlInput)}
  L27661:                                       onClick={() => handleWizardUrlFetch(urlInput)}
  L27662:                                       disabled={isFetching || !urlInput}
  L27741:                                                     setUrlInput('');
  L34515:   const [showUrlInput, setShowUrlInput] = useState(false);
  L38176:             setShowUrlInput(false);
  L56530:                             if (!showUrlInput && !expandedTools.includes('source-input')) {
  L56533:                             setShowUrlInput(!showUrlInput);
  L56539:                         {showUrlInput ? t('common.cancel') : t('common.link')}
  L56561:                 {showUrlInput && (

## generateContent (7 hits)
  L604:             const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODELS.safety}:generateContent?key=${apiKey}`;
  L14861:   const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODELS.default}:generateContent?key=${apiKey}`;
  L19717:   const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODELS.default}:generateContent?key=${apiKey}`;
  L36905:     const _buildUrl = (model) => { console.log(`[callGemini] ✉ Using model: ${model}`); return `https://generativelanguage.googleapis.com/v1
  L37528:     const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODELS.image}:generateContent?key=${apiKey}`;
  L37555:     const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODELS.flash}:generateContent?key=${apiKey}`;
  L37582:         const baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODELS.tts}:generateContent`;

## gemini_api (10 hits)
  L72:   : (process.env.REACT_APP_GEMINI_API_KEY || '');
  L604:             const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODELS.safety}:generateContent?key=${apiKey}`;
  L14861:   const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODELS.default}:generateContent?key=${apiKey}`;
  L19717:   const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODELS.default}:generateContent?key=${apiKey}`;
  L36905:     const _buildUrl = (model) => { console.log(`[callGemini] ✉ Using model: ${model}`); return `https://generativelanguage.googleapis.com/v1
  L37053:           debugLog('🩺 [HealthCheck] Calling Gemini API...');
  L37528:     const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODELS.image}:generateContent?key=${apiKey}`;
  L37555:     const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODELS.flash}:generateContent?key=${apiKey}`;
  L37582:         const baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODELS.tts}:generateContent`;
  L37753:     const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`;

## paste_event (0 hits)

## url_regex (66 hits)
  L14:     along with this program.  If not, see <https://www.gnu.org/licenses/>.
  L27: const _AUDIO_BANK_URL = 'https://raw.githubusercontent.com/Apomera/AlloFlow/main/audio_bank.json';
  L604:             const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODELS.safety}:generateContent?key=${apiKey}`;
  L4278:         const response = await fetch('https://raw.githubusercontent.com/Apomera/AlloFlow/main/psychometric_probes.js');
  L8738:                 const ns = "http://www.w3.org/2000/svg";
  L11083:         script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js';
  L12460: <style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');*{box-sizing:border-box;margin:0;padd
  L12551:         @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
  L14123:     link.href = `https://fonts.googleapis.com/css2?family=${fonts.join('&family=')}&display=swap`;
  L14348:     const resp = await fetch("https://raw.githubusercontent.com/Apomera/AlloFlow/main/ui_strings.js?v=" + Date.now());
  L14378:     const hsResp = await fetch("https://raw.githubusercontent.com/Apomera/AlloFlow/main/help_strings.js?v=" + Date.now());
  L14760:             targetUrl = 'https://' + targetUrl;
  L14769:         const jinaUrl = `https://r.jina.ai/${targetUrl}`;
  L14773:             const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(jinaUrl)}`;
  L14783:                 const fallbackUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(jinaUrl)}&t=${Date.now()}`;
  ... and 51 more
