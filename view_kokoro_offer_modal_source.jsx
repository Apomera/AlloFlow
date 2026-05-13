/**
 * AlloFlow — Kokoro Offer Modal Module
 *
 * Modal shown when Gemini TTS is unavailable (quota/network) offering the
 * user the option to download Kokoro (~40MB browser-based offline voice).
 *
 * Pure props-driven; zero internal state. Conditional render lives at the
 * call site in AlloFlowANTI.txt; this component renders the modal contents
 * when invoked.
 *
 * Extracted from AlloFlowANTI.txt lines 20085-20122 (May 2026) as the
 * first proof-of-concept for the JSX render-block extraction pipeline.
 *
 * Required props:
 *   setShowKokoroOfferModal — closes the modal
 *   setSelectedVoice        — switches to Kokoro voice on download success
 *   addToast                — surface user-facing status messages
 */
function KokoroOfferModal({ setShowKokoroOfferModal, setSelectedVoice, addToast }) {
  return (
    <div className="fixed inset-0 z-[9998] bg-black/60 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setShowKokoroOfferModal(false)}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md mx-4 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-amber-100 p-3 rounded-full"><span className="text-2xl">🎤</span></div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">Cloud Voice Unavailable</h3>
            <p className="text-xs text-slate-600">Gemini TTS is temporarily unavailable (quota or network issue)</p>
          </div>
        </div>
        <p className="text-sm text-slate-600 mb-4">
          Would you like to download a free browser-based voice? It's ~40MB and works completely offline — no cloud needed.
        </p>
        <p className="text-xs text-slate-600 mb-4">
          Note: In this environment, the download won't persist between sessions.
        </p>
        <div className="flex gap-3">
          <button onClick={() => { setShowKokoroOfferModal(false); window.__kokoroOfferDeclined = true; }} className="flex-1 py-2.5 px-4 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors text-sm">
            No Thanks
          </button>
          <button onClick={() => {
            setShowKokoroOfferModal(false);
            if (window.__loadKokoroTTS) {
              window.__kokoroTTSDownloading = true;
              addToast('Downloading Kokoro voice model (~40MB)...', 'info');
              window.__loadKokoroTTS().then(ok => {
                window.__kokoroTTSDownloading = false;
                if (ok) { addToast('Kokoro voice ready! Switching to offline voice.', 'success'); setSelectedVoice('af_heart'); }
                else addToast('Download failed — please try again later', 'error');
              });
            }
          }} className="flex-1 py-2.5 px-4 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors text-sm">
            Download Voice
          </button>
        </div>
      </div>
    </div>
  );
}
