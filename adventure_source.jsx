// Adventure UI Components — extracted from AlloFlowANTI.txt

// Fallback: define ADVENTURE_SHOP_ITEMS if not available from main app
if (typeof ADVENTURE_SHOP_ITEMS === 'undefined') {
  var ADVENTURE_SHOP_ITEMS = window.ADVENTURE_SHOP_ITEMS || [
    { id: 'ration', name: 'Emergency Ration', cost: 50, description: 'Restores 20 Energy.', effectType: 'energy', effectValue: 20, icon: '🍎' },
    { id: 'feast', name: 'Field Feast', cost: 120, description: 'Fully restores energy.', effectType: 'energy', effectValue: 100, icon: '🍱' },
    { id: 'hint', name: 'Oracle Whisper', cost: 75, description: 'Rewinds your previous turn.', effectType: 'hint', effectValue: 1, icon: '🔮' },
    { id: 'charm', name: 'Luck Charm', cost: 100, description: '+5 to next roll.', effectType: 'modifier', effectValue: 5, icon: '🍀' },
    { id: 'journal', name: "Scholar's Journal", cost: 100, description: 'Double XP next turn.', effectType: 'xp_boost', effectValue: 2, icon: '📔' },
    { id: 'detector', name: 'Metal Detector', cost: 50, description: 'More gold for 3 scenes.', effectType: 'gold_boost', effectValue: 3, icon: '💰' },
    { id: 'guiding_hand', name: 'Guiding Hand', cost: 125, description: 'A timely intervention resolves the current obstacle and teaches useful knowledge for later scenes. No XP or Gold is awarded.', effectType: 'story_assist', effectValue: 1, icon: '\u{1F91D}' },
  ];
}

// ═══ MissionReportCard (lines 8564-8670) ═══
const MissionReportCard = React.memo(({ adventureState, globalLevel, onClose, onExport, onContinue, onNewGame, isProcessing }) => {
  const { t } = useContext(LanguageContext);
  const reportRef = useRef(null);
  useFocusTrap(reportRef, true, onClose);
  const { stats, climax, xp, level } = adventureState;
  const safeStats = stats || { successes: 0, failures: 0, decisions: 0, partials: 0, conceptsFound: [] };
  const totalDecisions = Math.max(1, safeStats.decisions);
  // Partial credit counts (2026-08-23): partials sat in the DENOMINATOR only, so a partial
  // scored identically to a misconception. Half credit matches the 3-band assessment's intent.
  const efficiency = Math.round(((safeStats.successes + (safeStats.partials || 0) * 0.5) / totalDecisions) * 100);
  const proficiency = Math.max(0, Math.min(100, Number(climax?.masteryScore) || 0));
  // Honest framing (2026-07-16): "Proficiency Rating"/"Mastery" overclaimed what an
  // AI-scored story number can support. New keys (old keys kept so lang packs are
  // unaffected); an explicit AI-estimate caption renders under the bar.
  const performanceLabel = t('adventure.mission_report.performance_rating') || 'Story Performance';
  let ratingLabel = t('adventure.mission_report.rating2_beginning') || 'Just Beginning';
  if (proficiency >= 90) ratingLabel = t('adventure.mission_report.rating2_strong') || 'Strong Command';
  else if (proficiency >= 70) ratingLabel = t('adventure.mission_report.rating2_solid') || 'Solid Command';
  else if (proficiency >= 50) ratingLabel = t('adventure.mission_report.rating2_developing') || 'Developing';
  return (
    <div ref={reportRef} role="dialog" aria-modal="true" aria-labelledby="adventure-mission-report-title" className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-700 p-4">
      <div className="bg-slate-900 w-full max-w-md rounded-3xl border-4 border-yellow-500 shadow-[0_0_50px_rgba(234,179,8,0.3)] overflow-hidden relative transform scale-100 animate-in zoom-in-95 duration-500 flex flex-col max-h-[90vh]">
        <div className="bg-yellow-500 p-4 text-center shrink-0">
            <h2 id="adventure-mission-report-title" className="text-3xl font-black text-slate-900 uppercase tracking-widest drop-shadow-sm flex items-center justify-center gap-2">
                <Trophy size={32} aria-hidden="true" /> {t('adventure.mission_report.title')}
            </h2>
            <div className="flex items-center justify-center gap-2 text-slate-900 font-bold text-sm opacity-80 mt-1">
                <span>{t('adventure.mission_report.status_success')}</span>
                <span aria-hidden="true">•</span>
                <span>{new Date().toLocaleDateString()}</span>
            </div>
        </div>
        <div className="p-8 space-y-6 relative z-10 text-white overflow-y-auto custom-scrollbar flex-grow">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none"></div>
            <div className="text-center mb-2 relative z-20">
                <div className="text-xs font-bold text-yellow-500 uppercase tracking-widest mb-1">{t('adventure.mission_report.final_score')}</div>
                <div className="text-6xl font-black text-white tracking-tighter drop-shadow-lg">{xp}</div>
                <div className="inline-block bg-indigo-600 px-3 py-1 rounded-full border border-indigo-400 shadow-sm text-sm font-bold mt-2">
                    {t('adventure.mission_report.level_achieved', { level: level || 1 })}
                </div>
            </div>
            <div className="relative z-20">
                <div className="flex justify-between text-xs font-bold mb-2">
                    <span className="text-cyan-400 uppercase">{performanceLabel}</span>
                    <span className="text-white">{proficiency}/100 ({ratingLabel})</span>
                </div>
                <div role="progressbar" aria-label={performanceLabel} aria-valuemin={0} aria-valuemax={100} aria-valuenow={proficiency} className="h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-700 relative">
                    <div
                        className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-1000 ease-out"
                        style={{ width: `${proficiency}%` }}
                    ></div>
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5 leading-snug">
                    {t('adventure.mission_report.ai_estimate_note') || 'Estimated by AI from story decisions — a reflection prompt, not a formal assessment.'}
                </p>
                {Number(climax?.attempts) > 0 && (
                    <p className="text-[10px] text-slate-300 mt-1 font-bold">
                        {(t('adventure.mission_report.climax_attempts') || 'Final challenge attempts') + ': ' + climax.attempts}
                    </p>
                )}
            </div>
            {/* 3-band decision breakdown (2026-07-16): partial_success used to be
                invisible — counted in neither successes nor failures, silently
                dragging "Efficiency" down. All three bands now show. */}
            <div className="grid grid-cols-3 gap-2 relative z-20">
                <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-700 flex flex-col items-center justify-center">
                    <span className="text-[10px] font-bold uppercase text-green-400">{t('adventure.mission_report.band_strong') || 'Strong moves'}</span>
                    <span className="text-xl font-black text-white">{safeStats.successes || 0}</span>
                </div>
                <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-700 flex flex-col items-center justify-center">
                    <span className="text-[10px] font-bold uppercase text-yellow-400">{t('adventure.mission_report.band_partial') || 'Partial credit'}</span>
                    <span className="text-xl font-black text-white">{safeStats.partials || 0}</span>
                </div>
                <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-700 flex flex-col items-center justify-center">
                    <span className="text-[10px] font-bold uppercase text-rose-400">{t('adventure.mission_report.band_misconception') || 'Misconceptions'}</span>
                    <span className="text-xl font-black text-white">{safeStats.failures || 0}</span>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4 relative z-20">
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex flex-col items-center justify-center" title={t('adventure.mission_report.efficiency_formula') || 'Strong moves count fully, partial credit counts half, out of all decisions.'}>
                    <div className="flex items-center gap-2 mb-2 text-yellow-400">
                        <Zap size={16} aria-hidden="true" /> <span className="text-[11px] font-bold uppercase">{t('adventure.mission_report.efficiency')}</span>
                    </div>
                    <div className="text-3xl font-black">{efficiency}%</div>
                </div>
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex flex-col items-center justify-center">
                    <div className="flex items-center gap-2 mb-2 text-green-400">
                        <Key size={16} aria-hidden="true" /> <span className="text-[11px] font-bold uppercase">{t('adventure.mission_report.concepts')}</span>
                    </div>
                    <div className="text-3xl font-black">{safeStats.conceptsFound.length}</div>
                </div>
            </div>
            {safeStats.conceptsFound.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-700/50 relative z-20">
                    <div className="text-[11px] text-slate-300 font-bold uppercase mb-2">{t('adventure.mission_report.concepts_secured')}</div>
                    <div className="flex flex-wrap gap-2">
                        {safeStats.conceptsFound.map((c, i) => (
                            <span key={i} className="px-2 py-1 rounded-md bg-cyan-900/30 text-cyan-200 text-xs border border-cyan-800/50">
                                {c}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
        <div className="p-4 bg-slate-800 border-t border-slate-700 flex flex-col gap-3 relative z-20 shrink-0">
             <button aria-label={t('common.create_storybook')}
                onClick={onExport}
                disabled={isProcessing}
                className="w-full min-h-11 py-3 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors shadow-lg flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800"
             >
                 {isProcessing ? <RefreshCw size={18} className="animate-spin motion-reduce:animate-none" aria-hidden="true"/> : <BookOpen size={18} aria-hidden="true"/>}
                 {isProcessing ? t('adventure.storybook_writing') : t('adventure.storybook')}
             </button>
             <div className="grid grid-cols-2 gap-3">
                 <button
                    onClick={() => { onClose(); if(onContinue) onContinue(); }}
                    className="w-full min-h-11 py-3 rounded-xl font-bold bg-green-700 text-white hover:bg-green-600 transition-colors shadow-lg flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800"
                 >
                     <MapIcon size={18} aria-hidden="true" /> {t('adventure.start_sequel') || "Continue"}
                 </button>
                 <button aria-label={t('adventure.new_game') || "New Game"}
                    onClick={() => { onClose(); if(onNewGame) onNewGame(); }}
                    className="w-full min-h-11 py-3 rounded-xl font-bold bg-slate-700 text-slate-200 hover:bg-slate-600 hover:text-white transition-colors border border-slate-500 flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800"
                 >
                     <RefreshCw size={18} aria-hidden="true" /> {t('adventure.new_game') || "New Game"}
                 </button>
             </div>
             <button
                 aria-label={t('common.close')}
                onClick={onClose}
                className="w-full min-h-11 py-2 text-sm font-bold text-slate-200 hover:text-white transition-colors rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800"
             >
                 {t('adventure.mission_report.confirm_exit')}
             </button>
        </div>
      </div>
    </div>
  );
});

// ═══ playAdventureEventSound (lines 9264-9336) ═══
// (2026-08-23) playAdventureEventSoundLegacy REMOVED — it was dead code (no caller anywhere,
// module or monolith) and a trap: it contained its own 'success'/'failure' oscillator recipes,
// so a future session hunting "why does success sound wrong" could edit the wrong function.
// The live cues are in playAdventureEventSound below (fixed-tonic resolved cadences, 2026-08-23).

// ═══ playGenerativeSoundscape (lines 9337-9498) ═══
const playGenerativeSoundscapeLegacy = (ctx, dest, params) => {
    const safeParams = params || {};
    const atmosphere = safeParams.atmosphere || 'Calm';
    const element = safeParams.element || 'Wind';
    const now = ctx.currentTime;
    const activeNodes = [];
    const atmOsc1 = ctx.createOscillator();
    const atmOsc2 = ctx.createOscillator();
    const atmGain = ctx.createGain();
    const atmFilter = ctx.createBiquadFilter();
    atmOsc1.connect(atmFilter);
    atmOsc2.connect(atmFilter);
    atmFilter.connect(atmGain);
    atmGain.connect(dest);
    let baseFreq = 220;
    let detune = 4;
    let waveType = 'sine';
    atmFilter.type = 'lowpass';
    atmFilter.frequency.value = 800;
    switch (atmosphere?.toLowerCase()) {
        case 'tense':
            baseFreq = 110;
            detune = 100;
            waveType = 'sawtooth';
            atmFilter.frequency.value = 2000;
            const tenseLFO = ctx.createOscillator();
            tenseLFO.frequency.value = 5;
            const tenseLFOGain = ctx.createGain();
            tenseLFOGain.gain.value = 50;
            tenseLFO.connect(tenseLFOGain);
            tenseLFOGain.connect(atmOsc1.frequency);
            tenseLFO.start(now);
            activeNodes.push(tenseLFO, tenseLFOGain);
            break;
        case 'dark':
            baseFreq = 55;
            detune = 12;
            waveType = 'triangle';
            atmFilter.frequency.value = 300;
            break;
        case 'ethereal':
            baseFreq = 440;
            detune = 700;
            waveType = 'sine';
            atmFilter.type = 'highpass';
            atmFilter.frequency.value = 600;
            break;
        case 'joyful':
            baseFreq = 261.63;
            detune = 400;
            waveType = 'triangle';
            atmFilter.frequency.value = 1500;
            break;
    }
    atmOsc1.type = waveType;
    atmOsc1.frequency.value = baseFreq;
    atmOsc2.type = waveType;
    atmOsc2.frequency.value = baseFreq;
    atmOsc2.detune.value = detune;
    atmGain.gain.setValueAtTime(0, now);
    atmGain.gain.linearRampToValueAtTime(0.1, now + 2);
    atmOsc1.start(now);
    atmOsc2.start(now);
    activeNodes.push(atmOsc1, atmOsc2, atmGain, atmFilter);
    if (element && element.toLowerCase() !== 'silence') {
        const bufferSize = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;
        const eleFilter = ctx.createBiquadFilter();
        const eleGain = ctx.createGain();
        noise.connect(eleFilter);
        eleFilter.connect(eleGain);
        eleGain.connect(dest);
        eleGain.gain.value = 0.05;
        switch (element.toLowerCase()) {
            case 'fire':
                eleFilter.type = 'lowpass';
                eleFilter.frequency.value = 800;
                const crackleInterval = setInterval(() => {
                     if(Math.random() > 0.8) {
                         const spike = ctx.currentTime;
                         eleGain.gain.setValueAtTime(0.05, spike);
                         eleGain.gain.linearRampToValueAtTime(0.2, spike + 0.05);
                         eleGain.gain.linearRampToValueAtTime(0.05, spike + 0.1);
                     }
                }, 100);
                activeNodes.push({ stop: () => clearInterval(crackleInterval), disconnect: () => {} });
                break;
            case 'water':
                eleFilter.type = 'lowpass';
                eleFilter.frequency.value = 400;
                const waveLFO = ctx.createOscillator();
                waveLFO.frequency.value = 0.2;
                const waveGain = ctx.createGain();
                waveGain.gain.value = 300;
                waveLFO.connect(waveGain);
                waveGain.connect(eleFilter.frequency);
                waveLFO.start(now);
                activeNodes.push(waveLFO, waveGain);
                break;
            case 'machinery':
                const clank = ctx.createOscillator();
                clank.type = 'square';
                clank.frequency.value = 100;
                const clankGain = ctx.createGain();
                clank.connect(eleFilter);
                const rhythm = ctx.createOscillator();
                rhythm.type = 'square';
                rhythm.frequency.value = 4;
                const rhythmGain = ctx.createGain();
                rhythmGain.gain.value = 1;
                rhythm.connect(rhythmGain);
                rhythmGain.connect(eleGain.gain);
                clank.start(now);
                rhythm.start(now);
                activeNodes.push(clank, rhythm, rhythmGain);
                break;
            case 'wind':
                eleFilter.type = 'bandpass';
                eleFilter.Q.value = 1;
                const windLFO = ctx.createOscillator();
                windLFO.frequency.value = 0.1;
                const windGain = ctx.createGain();
                windGain.gain.value = 600;
                windLFO.connect(windGain);
                windGain.connect(eleFilter.frequency);
                eleFilter.frequency.value = 800;
                windLFO.start(now);
                activeNodes.push(windLFO, windGain);
                break;
            case 'nature':
                 eleFilter.type = 'highpass';
                 eleFilter.frequency.value = 3000;
                 eleGain.gain.value = 0.02;
                 const birdInterval = setInterval(() => {
                     if(Math.random() > 0.7) {
                         const osc = ctx.createOscillator();
                         osc.frequency.setValueAtTime(2000 + Math.random()*1000, ctx.currentTime);
                         osc.frequency.linearRampToValueAtTime(3000, ctx.currentTime + 0.1);
                         const g = ctx.createGain();
                         g.gain.setValueAtTime(0.05, ctx.currentTime);
                         g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
                         osc.connect(g);
                         g.connect(dest);
                         osc.start();
                         osc.stop(ctx.currentTime + 0.2);
                     }
                 }, 800);
                 activeNodes.push({ stop: () => clearInterval(birdInterval), disconnect: () => {} });
                 break;
        }
        if (element.toLowerCase() !== 'machinery') {
            noise.start(now);
            activeNodes.push(noise, eleFilter, eleGain);
        }
    }
    return activeNodes;
};

// ═══ ClimaxProgressBar (lines 9499-9563) ═══
// Shared Adventure mixer. All audio is synthesized locally; no third-party
// samples are bundled. A future verified CC0 layer can feed these same buses.
let adventureAudioEngineSingleton = null;
const ADVENTURE_AUDIO_PREFS_KEY = 'alloflow-adventure-audio-v1';
const ADVENTURE_AUDIO_PREFS_DEFAULTS = Object.freeze({ ambience: 1, effects: 1, gentle: false });
let adventureAudioPreferencesCache = null;

const clampAdventureAudio = (value, min = 0, max = 1) => Math.max(min, Math.min(max, Number(value) || 0));

const normalizeAdventureAudioPreferences = (value) => {
    const safe = value && typeof value === 'object' ? value : {};
    return {
        ambience: clampAdventureAudio(safe.ambience == null ? ADVENTURE_AUDIO_PREFS_DEFAULTS.ambience : safe.ambience),
        effects: clampAdventureAudio(safe.effects == null ? ADVENTURE_AUDIO_PREFS_DEFAULTS.effects : safe.effects),
        gentle: safe.gentle === true
    };
};

const getAdventureAudioPreferences = () => {
    if (adventureAudioPreferencesCache) return { ...adventureAudioPreferencesCache };
    let stored = null;
    try {
        if (typeof window !== 'undefined' && window.localStorage) stored = JSON.parse(window.localStorage.getItem(ADVENTURE_AUDIO_PREFS_KEY) || 'null');
    } catch (_) {}
    adventureAudioPreferencesCache = normalizeAdventureAudioPreferences(stored);
    return { ...adventureAudioPreferencesCache };
};

const setAdventureAudioPreferences = (patch) => {
    adventureAudioPreferencesCache = normalizeAdventureAudioPreferences({ ...getAdventureAudioPreferences(), ...(patch || {}) });
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(ADVENTURE_AUDIO_PREFS_KEY, JSON.stringify(adventureAudioPreferencesCache));
            window.dispatchEvent(new CustomEvent('alloflow-adventure-audio-preferences', { detail: { ...adventureAudioPreferencesCache } }));
        }
    } catch (_) {}
    return { ...adventureAudioPreferencesCache };
};

const normalizeAdventureSoundParams = (params, sceneText = '') => {
    const safe = params && typeof params === 'object' ? params : {};
    const atmosphere = String(safe.atmosphere || safe.mood || 'Calm').toLowerCase();
    const rawElement = String(safe.element || safe.environment || 'Wind').toLowerCase();
    let element = rawElement;
    if (/rain|storm|drizzle/.test(rawElement)) element = 'rain';
    else if (/ocean|sea|coast|wave/.test(rawElement)) element = 'ocean';
    else if (/cave|cavern|underground/.test(rawElement)) element = 'cave';
    else if (/city|urban|street/.test(rawElement)) element = 'city';
    else if (/space|cosmic|star/.test(rawElement)) element = 'space';
    else if (/laboratory|lab|science/.test(rawElement)) element = 'laboratory';
    else if (/crowd|market|festival/.test(rawElement)) element = 'crowd';
    else if (/forest|jungle|nature|wild/.test(rawElement)) element = 'nature';
    else if (/machine|factory|engine|mechan/.test(rawElement)) element = 'machinery';
    else if (/water|river|stream|lake/.test(rawElement)) element = 'water';
    else if (/fire|flame|lava/.test(rawElement)) element = 'fire';
    else if (/silent|none|quiet/.test(rawElement)) element = 'silence';
    else element = 'wind';
    const rawSpace = String(safe.space || safe.acousticSpace || safe.room || '').toLowerCase();
    let acousticSpace = rawSpace;
    if (/cave|cavern|underground|echo/.test(rawSpace) || element === 'cave') acousticSpace = 'cave';
    else if (/void|vacuum|cosmic|outer/.test(rawSpace) || element === 'space') acousticSpace = 'void';
    else if (/open|outdoor|outside|sky|wide/.test(rawSpace) || ['wind', 'water', 'rain', 'ocean', 'fire', 'nature'].includes(element)) acousticSpace = 'open';
    else acousticSpace = 'room';
    const motion = String(safe.motion || safe.pacing || '').toLowerCase();
    const text = String(sceneText || '').toLowerCase();
    let inferred = ({ calm: 0.28, joyful: 0.48, ethereal: 0.42, dark: 0.58, tense: 0.76 }[atmosphere] || 0.4);
    if (/chase|race|escape|battle|attack|danger|urgent|collapse|storm/.test(text)) inferred += 0.16;
    if (/rest|quiet|peace|safe|gentle|calm|still/.test(text)) inferred -= 0.12;
    if (/chase|urgent|rapid/.test(motion)) inferred += 0.12;
    if (/still|rest|quiet/.test(motion)) inferred -= 0.1;
    const supplied = Number(safe.intensity);
    const intensity = clampAdventureAudio(Number.isFinite(supplied) ? supplied : inferred, 0.12, 1);
    return {
        atmosphere,
        element,
        acousticSpace,
        intensity,
        motion: motion || (intensity > 0.72 ? 'urgent' : intensity < 0.3 ? 'still' : 'steady')
    };
};

const createAdventureAudioRng = (seed) => {
    let state = 2166136261;
    const text = String(seed || 'adventure');
    for (let i = 0; i < text.length; i++) {
        state ^= text.charCodeAt(i);
        state = Math.imul(state, 16777619);
    }
    return () => {
        state += 0x6D2B79F5;
        let value = state;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
};

// AudioBuffers are safe to share between BufferSource and Convolver nodes when
// treated as immutable. Keep small per-context LRU pools so procedural details
// do not allocate a new buffer for every raindrop, crackle, or scene crossfade.
const adventureAudioBufferCaches = new WeakMap();

const getAdventureCachedBuffer = (ctx, kind, key, create, maxEntries) => {
    let contextCaches = adventureAudioBufferCaches.get(ctx);
    if (!contextCaches) {
        contextCaches = { noise: new Map(), reverb: new Map() };
        adventureAudioBufferCaches.set(ctx, contextCaches);
    }
    const cache = contextCaches[kind];
    if (cache.has(key)) {
        const cached = cache.get(key);
        cache.delete(key);
        cache.set(key, cached);
        return cached;
    }
    const value = create();
    cache.set(key, value);
    while (cache.size > maxEntries) cache.delete(cache.keys().next().value);
    return value;
};

const createAdventureNoiseBuffer = (ctx, seconds = 0.5, variation = 0) => {
    const sampleRate = Math.max(8000, Math.round(Number(ctx?.sampleRate) || 44100));
    const bucketSeconds = Math.ceil(Math.max(0.05, Math.min(4, Number(seconds) || 0.5)) * 20) / 20;
    const safeVariation = Math.abs(Math.floor(Number(variation) || 0)) % 4;
    const cacheKey = [sampleRate, bucketSeconds.toFixed(2), safeVariation].join(':');
    return getAdventureCachedBuffer(ctx, 'noise', cacheKey, () => {
        const buffer = ctx.createBuffer(1, Math.max(1, Math.floor(sampleRate * bucketSeconds)), sampleRate);
        const data = buffer.getChannelData(0);
        const noiseRng = createAdventureAudioRng('noise|' + cacheKey);
        let brown = 0;
        for (let i = 0; i < data.length; i++) {
            brown = (brown + 0.02 * (noiseRng() * 2 - 1)) / 1.02;
            data[i] = clampAdventureAudio(brown * 3.5, -1, 1);
        }
        return buffer;
    }, 32);
};

const createAdventureReverb = (ctx, seconds = 1.05, decay = 2.4) => {
    if (!ctx || typeof ctx.createConvolver !== 'function') return null;
    try {
        const sampleRate = Math.max(8000, Math.round(Number(ctx.sampleRate) || 44100));
        const bucketSeconds = Math.ceil(Math.max(0.2, Math.min(4, Number(seconds) || 1.05)) * 20) / 20;
        const bucketDecay = Math.round(Math.max(0.5, Math.min(6, Number(decay) || 2.4)) * 10) / 10;
        const cacheKey = [sampleRate, bucketSeconds.toFixed(2), bucketDecay.toFixed(1)].join(':');
        const impulse = getAdventureCachedBuffer(ctx, 'reverb', cacheKey, () => {
            const length = Math.max(1, Math.floor(sampleRate * bucketSeconds));
            const buffer = ctx.createBuffer(2, length, sampleRate);
            const impulseRng = createAdventureAudioRng('reverb|' + cacheKey);
            for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
                const data = buffer.getChannelData(channel);
                for (let i = 0; i < length; i++) {
                    const envelope = Math.pow(1 - (i / length), bucketDecay);
                    data[i] = (impulseRng() * 2 - 1) * envelope;
                }
            }
            return buffer;
        }, 12);
        const convolver = ctx.createConvolver();
        convolver.buffer = impulse;
        return convolver;
    } catch (_) { return null; }
};

const createAdventureVoiceBudget = (options = {}) => {
    const activeTokens = new Map();
    const reserves = { detail: 8, event: 5, critical: 0, ...(options.reserves || {}) };
    let nextId = 0;
    const getMaxVoices = () => Math.max(1, Math.floor(Number(typeof options.maxVoices === 'function' ? options.maxVoices() : options.maxVoices) || 24));
    const normalizePriority = priority => ['detail', 'event', 'critical'].includes(priority) ? priority : 'detail';
    const claim = (priority = 'detail') => {
        const safePriority = normalizePriority(priority);
        const capacity = Math.max(1, getMaxVoices() - Math.max(0, Number(reserves[safePriority]) || 0));
        if (activeTokens.size >= capacity) return null;
        const token = { id: ++nextId, priority: safePriority, released: false };
        activeTokens.set(token.id, token);
        return token;
    };
    const release = token => {
        if (!token || token.released || !activeTokens.has(token.id)) return;
        token.released = true;
        activeTokens.delete(token.id);
    };
    const snapshot = () => {
        const byPriority = { detail: 0, event: 0, critical: 0 };
        activeTokens.forEach(token => { byPriority[token.priority] += 1; });
        return { active: activeTokens.size, max: getMaxVoices(), byPriority };
    };
    return { claim, release, snapshot };
};

const ADVENTURE_THEME_CONTOURS = Object.freeze([
    [0, 2, 1, 3],
    [0, 1, 4, 2],
    [2, 0, 3, 1],
    [0, 3, 2, 4],
    [1, 3, 0, 2]
]);

const createAdventureThemeProfile = seed => {
    const themeRng = createAdventureAudioRng('theme|' + String(seed || 'adventure'));
    const identity = Math.floor(themeRng() * 0xFFFFFFFF).toString(36);
    const contour = ADVENTURE_THEME_CONTOURS[Math.floor(themeRng() * ADVENTURE_THEME_CONTOURS.length)].slice();
    const register = themeRng() > 0.82 ? 0.5 : 1;
    const lifts = contour.map((degree, index) => {
        const nextDegree = contour[(index + 1) % contour.length];
        return Math.max(0.88, Math.min(1.22, 1 + (nextDegree - degree) * 0.055));
    });
    return { key: identity + ':' + contour.join(''), contour, lifts, register };
};

const createAdventureThemeState = () => {
    let activeKey = '';
    let cursor = 0;
    const next = (themeKey, length) => {
        const safeLength = Math.max(1, Math.floor(Number(length) || 1));
        if (themeKey !== activeKey) {
            activeKey = themeKey;
            cursor = 0;
        }
        const index = cursor % safeLength;
        cursor += 1;
        return index;
    };
    return { next, snapshot: () => ({ key: activeKey, cursor }) };
};

const createAdventureMixFocus = () => {
    const activeTokens = new Map();
    let nextId = 0;
    const add = (priority, gentle = false) => {
        if (priority !== 'event' && priority !== 'critical') return null;
        const level = priority === 'critical'
            ? (gentle ? 0.6 : 0.45)
            : (gentle ? 0.8 : 0.7);
        const token = { id: ++nextId, level, released: false };
        activeTokens.set(token.id, token);
        return token;
    };
    const release = token => {
        if (!token || token.released || !activeTokens.has(token.id)) return;
        token.released = true;
        activeTokens.delete(token.id);
    };
    const multiplier = () => {
        let level = 1;
        activeTokens.forEach(token => { level = Math.min(level, token.level); });
        return level;
    };
    return { add, release, multiplier, snapshot: () => ({ active: activeTokens.size, multiplier: multiplier() }) };
};

const analyzeAdventureRenderedAudio = (rendered, sampleRate = 12000) => {
    const data = rendered && typeof rendered.getChannelData === 'function' ? rendered.getChannelData(0) : rendered;
    if (!data || !data.length) return { supported: true, passed: false, peak: 0, rms: 0, maxStep: 0, tailPeak: 0, nonFinite: 0 };
    let peak = 0;
    let sumSquares = 0;
    let maxStep = 0;
    let tailPeak = 0;
    let nonFinite = 0;
    const tailStart = Math.floor(data.length * 0.9);
    let previous = 0;
    for (let index = 0; index < data.length; index++) {
        const sample = Number(data[index]);
        if (!Number.isFinite(sample)) {
            nonFinite += 1;
            continue;
        }
        const absolute = Math.abs(sample);
        peak = Math.max(peak, absolute);
        sumSquares += sample * sample;
        maxStep = Math.max(maxStep, Math.abs(sample - previous));
        if (index >= tailStart) tailPeak = Math.max(tailPeak, absolute);
        previous = sample;
    }
    const rms = Math.sqrt(sumSquares / data.length);
    const round = value => Number(value.toFixed(5));
    return {
        supported: true,
        passed: nonFinite === 0 && peak >= 0.005 && peak <= 0.98 && rms >= 0.0005 && maxStep <= 0.25 && tailPeak <= 0.002,
        peak: round(peak),
        rms: round(rms),
        maxStep: round(maxStep),
        tailPeak: round(tailPeak),
        nonFinite,
        sampleRate: Math.max(1, Math.floor(Number(sampleRate) || 12000))
    };
};

const runAdventureAudioDiagnostics = async () => {
    const scope = typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : {};
    const OfflineContext = scope.OfflineAudioContext || scope.webkitOfflineAudioContext;
    if (typeof OfflineContext !== 'function') return { supported: false, passed: false, reason: 'Offline audio rendering is unavailable in this browser.' };
    try {
        const sampleRate = 12000;
        const offline = new OfflineContext(1, Math.floor(sampleRate * 1.1), sampleRate);
        const oscillator = offline.createOscillator();
        const gain = offline.createGain();
        const compressor = typeof offline.createDynamicsCompressor === 'function' ? offline.createDynamicsCompressor() : null;
        oscillator.type = 'sine';
        oscillator.frequency.value = 440;
        gain.gain.setValueAtTime(0.0001, 0);
        gain.gain.exponentialRampToValueAtTime(0.22, 0.02);
        gain.gain.setValueAtTime(0.22, 0.42);
        gain.gain.exponentialRampToValueAtTime(0.0001, 0.8);
        oscillator.connect(gain);
        if (compressor) {
            compressor.threshold.value = -18;
            compressor.knee.value = 16;
            compressor.ratio.value = 5;
            gain.connect(compressor);
            compressor.connect(offline.destination);
        } else gain.connect(offline.destination);
        oscillator.start(0);
        oscillator.stop(0.82);
        const rendered = await offline.startRendering();
        return analyzeAdventureRenderedAudio(rendered, sampleRate);
    } catch (error) {
        return { supported: true, passed: false, reason: String(error?.message || error || 'Audio diagnostic failed.') };
    }
};

const isAdventureAudioDocumentHidden = () => {
    try { return typeof document !== 'undefined' && document.visibilityState === 'hidden'; } catch (_) { return false; }
};

const stopAdventureAudioNodes = (nodes) => {
    (nodes || []).forEach(node => {
        try { if (node && typeof node.stop === 'function') node.stop(); } catch (_) {}
        try { if (node && typeof node.disconnect === 'function') node.disconnect(); } catch (_) {}
    });
};

const playGenerativeSoundscape = (ctx, dest, params, options = {}) => {
    const profile = normalizeAdventureSoundParams(params, options.sceneText);
    const gentle = options.gentle === true;
    const intensity = gentle ? Math.min(profile.intensity, 0.5) : profile.intensity;
    const rng = createAdventureAudioRng([options.sceneText || '', profile.atmosphere, profile.element, profile.acousticSpace].join('|'));
    const themeProfile = options.themeProfile || createAdventureThemeProfile(options.themeSeed || options.sceneText || 'adventure');
    const themeState = options.themeState || createAdventureThemeState();
    const rawMotionFactor = ({ still: 0.45, steady: 0.72, travel: 1, chase: 1.22, urgent: 1.42 })[profile.motion] || 0.82;
    const motionFactor = gentle ? Math.min(rawMotionFactor, 1) : rawMotionFactor;
    const cadence = milliseconds => Math.max(260, Math.round(milliseconds / motionFactor));
    const maxTransientCount = gentle ? 4 : 10;
    const transientBudget = options.voiceBudget || createAdventureVoiceBudget({
        maxVoices: maxTransientCount,
        reserves: { detail: 0, event: 0, critical: 0 }
    });
    const claimTransient = () => transientBudget.claim('detail');
    const releaseTransient = token => transientBudget.release(token);
    const legacyElement = ({ rain: 'water', ocean: 'water', city: 'machinery', laboratory: 'machinery', cave: 'wind', crowd: 'nature', space: 'silence' })[profile.element] || profile.element;
    const spaceColoration = ({ open: { cutoff: 5200, q: 0.35 }, room: { cutoff: 3600, q: 0.55 }, cave: { cutoff: 1800, q: 0.8 }, void: { cutoff: 2600, q: 0.4 } })[profile.acousticSpace] || { cutoff: 3600, q: 0.55 };
    const textureDest = ctx.createGain();
    const spaceFilter = ctx.createBiquadFilter();
    const spaceLfo = ctx.createOscillator();
    const spaceDepth = ctx.createGain();
    const ambienceSwell = ctx.createOscillator();
    const ambienceSwellDepth = ctx.createGain();
    textureDest.gain.value = 0.92;
    spaceFilter.type = 'lowpass';
    spaceFilter.frequency.value = spaceColoration.cutoff;
    spaceFilter.Q.value = spaceColoration.q;
    spaceLfo.type = 'sine';
    spaceLfo.frequency.value = 0.035 + motionFactor * 0.018;
    spaceDepth.gain.value = spaceColoration.cutoff * (gentle ? 0.045 : 0.09);
    textureDest.connect(spaceFilter);
    spaceFilter.connect(dest);
    spaceLfo.connect(spaceDepth);
    spaceDepth.connect(spaceFilter.frequency);
    spaceLfo.start();
    ambienceSwell.type = 'sine';
    const swellRate = ({ open: 0.024, room: 0.018, cave: 0.012, void: 0.008 })[profile.acousticSpace] || 0.018;
    ambienceSwell.frequency.value = swellRate + intensity * 0.006 + Math.min(motionFactor, 1.4) * 0.004;
    ambienceSwellDepth.gain.value = profile.element === 'silence'
        ? 0
        : (gentle ? 0.014 : 0.032) + intensity * (gentle ? 0.012 : 0.028);
    ambienceSwell.connect(ambienceSwellDepth);
    ambienceSwellDepth.connect(textureDest.gain);
    ambienceSwell.start();
    const nodes = playGenerativeSoundscapeLegacy(ctx, textureDest, {
        atmosphere: profile.atmosphere,
        element: legacyElement
    });
    const timers = [];
    nodes.push({ stop: () => timers.forEach(clearInterval), disconnect: () => {} });
    nodes.push(textureDest, spaceFilter, spaceLfo, spaceDepth, ambienceSwell, ambienceSwellDepth);
    const reverbSpace = ({ open: { seconds: 0.78, decay: 3.2, wet: 0.022 }, room: { seconds: 1.05, decay: 2.4, wet: 0.045 }, cave: { seconds: 1.65, decay: 1.65, wet: 0.075 }, void: { seconds: 2.35, decay: 1.35, wet: 0.055 } })[profile.acousticSpace] || { seconds: 1.05, decay: 2.4, wet: 0.045 };
    const detailReverb = createAdventureReverb(ctx, reverbSpace.seconds, reverbSpace.decay);
    let detailReverbWet = null;
    if (detailReverb) {
        detailReverbWet = ctx.createGain();
        detailReverbWet.gain.value = reverbSpace.wet * (gentle ? 0.68 : 1) + intensity * (gentle ? 0.012 : 0.028);
        detailReverb.connect(detailReverbWet);
        detailReverbWet.connect(textureDest);
        nodes.push(detailReverb, detailReverbWet);
    }

    // Add a subtle pace layer. It responds to scene intensity without replacing
    // the established atmosphere/element contract used by saved adventures.
    if (profile.atmosphere === 'tense' || profile.motion === 'urgent' || profile.motion === 'chase') {
        const pulse = ctx.createOscillator();
        const pulseGain = ctx.createGain();
        const lfo = ctx.createOscillator();
        const depth = ctx.createGain();
        pulse.type = 'triangle';
        pulse.frequency.value = profile.atmosphere === 'dark' ? 41.2 : 55;
        pulseGain.gain.value = (gentle ? 0.003 : 0.006) + intensity * (gentle ? 0.004 : 0.012);
        lfo.type = gentle ? 'sine' : 'square';
        lfo.frequency.value = (1.2 + intensity * (gentle ? 0.7 : 1.5)) * Math.min(motionFactor, 1.35);
        depth.gain.value = (gentle ? 0.0015 : 0.004) + intensity * (gentle ? 0.003 : 0.009);
        lfo.connect(depth);
        depth.connect(pulseGain.gain);
        pulse.connect(pulseGain);
        pulseGain.connect(textureDest);
        pulse.start();
        lfo.start();
        nodes.push(pulse, pulseGain, lfo, depth);
    }

    const playDetail = (from, to, duration, volume) => {
        if (ctx.state !== 'running' || isAdventureAudioDocumentHidden()) return;
        const voiceToken = claimTransient();
        if (!voiceToken) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const panner = typeof ctx.createStereoPanner === 'function' ? ctx.createStereoPanner() : null;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(from, now);
        osc.frequency.exponentialRampToValueAtTime(Math.max(30, to), now + duration);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(volume, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        osc.connect(gain);
        if (panner) {
            const startPan = rng() * 1.2 - 0.6;
            const endPan = clampAdventureAudio(startPan + (rng() * 0.5 - 0.25) * motionFactor, -0.85, 0.85);
            try {
                panner.pan.setValueAtTime(startPan, now);
                panner.pan.linearRampToValueAtTime(endPan, now + duration);
            } catch (_) { panner.pan.value = startPan; }
            gain.connect(panner);
            panner.connect(textureDest);
            if (detailReverb) panner.connect(detailReverb);
        } else {
            gain.connect(textureDest);
            if (detailReverb) gain.connect(detailReverb);
        }
        osc.start(now);
        osc.stop(now + duration + 0.02);
        setTimeout(() => {
            releaseTransient(voiceToken);
            try { osc.disconnect(); } catch (_) {}
            try { gain.disconnect(); } catch (_) {}
            try { panner?.disconnect(); } catch (_) {}
        }, Math.max(80, duration * 1000 + 100));
    };

    const playNoiseDetail = (from, to, duration, volume) => {
        if (ctx.state !== 'running' || isAdventureAudioDocumentHidden()) return;
        const voiceToken = claimTransient();
        if (!voiceToken) return;
        const now = ctx.currentTime;
        const source = ctx.createBufferSource();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();
        const panner = typeof ctx.createStereoPanner === 'function' ? ctx.createStereoPanner() : null;
        source.buffer = createAdventureNoiseBuffer(ctx, duration + 0.05, Math.floor(rng() * 4));
        filter.type = 'bandpass';
        filter.Q.value = 0.75 + rng() * 1.4;
        filter.frequency.setValueAtTime(Math.max(40, from), now);
        filter.frequency.exponentialRampToValueAtTime(Math.max(40, to), now + duration);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(volume, now + Math.min(0.018, duration * 0.2));
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        source.connect(filter);
        filter.connect(gain);
        if (panner) {
            const startPan = rng() * 1.4 - 0.7;
            const endPan = clampAdventureAudio(startPan + (rng() * 0.6 - 0.3) * motionFactor, -0.9, 0.9);
            try {
                panner.pan.setValueAtTime(startPan, now);
                panner.pan.linearRampToValueAtTime(endPan, now + duration);
            } catch (_) { panner.pan.value = startPan; }
            gain.connect(panner);
            panner.connect(textureDest);
            if (detailReverb) panner.connect(detailReverb);
        } else {
            gain.connect(textureDest);
            if (detailReverb) gain.connect(detailReverb);
        }
        source.start(now);
        source.stop(now + duration + 0.03);
        setTimeout(() => {
            releaseTransient(voiceToken);
            try { source.disconnect(); } catch (_) {}
            try { filter.disconnect(); } catch (_) {}
            try { gain.disconnect(); } catch (_) {}
            try { panner?.disconnect(); } catch (_) {}
        }, Math.max(80, duration * 1000 + 100));
    };

    const motifScales = {
        calm: [196, 246.94, 293.66, 392, 493.88],
        joyful: [261.63, 329.63, 392, 523.25, 659.25],
        ethereal: [220, 277.18, 329.63, 440, 554.37],
        dark: [110, 130.81, 146.83, 174.61, 207.65],
        tense: [110, 116.54, 130.81, 155.56, 174.61]
    };
    const motifScale = motifScales[profile.atmosphere];
    if (motifScale && profile.element !== 'silence' && profile.element !== 'machinery' && profile.element !== 'city') {
        timers.push(setInterval(() => {
            if (rng() > (gentle ? 0.78 : 0.58)) return;
            const themeIndex = themeState.next(themeProfile.key, themeProfile.contour.length);
            const degree = themeProfile.contour[themeIndex] % motifScale.length;
            const root = motifScale[degree] * themeProfile.register;
            const lift = themeProfile.lifts[themeIndex];
            playDetail(root, root * lift, gentle ? 0.34 : 0.46, (gentle ? 0.0025 : 0.004) + intensity * (gentle ? 0.002 : 0.004));
        }, cadence(gentle ? 5200 : 3600)));
    }

    if (profile.element === 'water' || profile.element === 'rain' || profile.element === 'ocean') {
        timers.push(setInterval(() => {
            const rainLift = profile.element === 'rain' ? 500 : 0;
            if (rng() > (gentle ? 0.7 : 0.56)) {
                playDetail(900 + rainLift + rng() * 500, 480 + rng() * 260, 0.18 + rng() * 0.16, (gentle ? 0.004 : 0.009) + intensity * 0.009);
                if (profile.element === 'rain' && rng() > (gentle ? 0.74 : 0.46)) playNoiseDetail(1600 + rng() * 1100, 520 + rng() * 420, 0.07 + rng() * 0.08, (gentle ? 0.002 : 0.004) + intensity * 0.004);
            }
        }, cadence(profile.element === 'rain' ? 520 : profile.element === 'ocean' ? 1150 : 760)));
    } else if (profile.element === 'nature') {
        timers.push(setInterval(() => {
            if (rng() > (gentle ? 0.76 : 0.62)) playDetail(1700 + rng() * 800, 2500 + rng() * 1100, 0.12 + rng() * 0.14, (gentle ? 0.004 : 0.008) + intensity * 0.008);
        }, cadence(1100)));
    } else if (profile.element === 'machinery' || profile.element === 'city' || profile.element === 'laboratory') {
        timers.push(setInterval(() => {
            if (rng() > (gentle ? 0.65 : 0.4)) {
                playDetail(180 + rng() * 70, 85 + rng() * 35, 0.06 + rng() * 0.05, (gentle ? 0.004 : 0.01) + intensity * 0.012);
                if (rng() > (gentle ? 0.82 : 0.58)) playNoiseDetail(420 + rng() * 420, 120 + rng() * 160, 0.045 + rng() * 0.06, (gentle ? 0.0015 : 0.003) + intensity * 0.003);
            }
        }, cadence(Math.max(260, 650 - intensity * 340))));
    } else if (profile.element === 'cave') {
        timers.push(setInterval(() => {
            if (rng() > 0.64) playDetail(320 + rng() * 120, 160 + rng() * 60, 0.65 + rng() * 0.45, (gentle ? 0.003 : 0.006) + intensity * 0.004);
        }, cadence(1800)));
    } else if (profile.element === 'space') {
        timers.push(setInterval(() => {
            if (rng() > 0.7) playDetail(620 + rng() * 180, 930 + rng() * 260, 1.1 + rng() * 0.7, (gentle ? 0.0025 : 0.005) + intensity * 0.003);
        }, cadence(2400)));
    } else if (profile.element === 'crowd') {
        timers.push(setInterval(() => {
            if (rng() > (gentle ? 0.8 : 0.58)) {
                playDetail(180 + rng() * 220, 150 + rng() * 180, 0.18 + rng() * 0.22, (gentle ? 0.0025 : 0.006) + intensity * 0.004);
                if (rng() > (gentle ? 0.84 : 0.62)) playNoiseDetail(260 + rng() * 300, 520 + rng() * 420, 0.12 + rng() * 0.18, (gentle ? 0.0015 : 0.003) + intensity * 0.003);
            }
        }, cadence(680)));
    } else if (profile.element === 'fire') {
        timers.push(setInterval(() => {
            if (rng() > (gentle ? 0.82 : 0.56)) {
                playDetail(1150 + rng() * 900, 260 + rng() * 240, 0.08 + rng() * 0.12, (gentle ? 0.003 : 0.006) + intensity * 0.006);
                if (rng() > (gentle ? 0.8 : 0.5)) playNoiseDetail(900 + rng() * 1000, 180 + rng() * 220, 0.045 + rng() * 0.07, (gentle ? 0.002 : 0.004) + intensity * 0.004);
            }
        }, cadence(420)));
    } else if (profile.element === 'wind') {
        timers.push(setInterval(() => {
            if (rng() > (gentle ? 0.78 : 0.58)) playDetail(430 + rng() * 240, 180 + rng() * 130, 0.45 + rng() * 0.35, (gentle ? 0.0025 : 0.005) + intensity * 0.004);
        }, cadence(1450)));
    }
    return nodes;
};

const getAdventureAudioEngine = () => {
    if (adventureAudioEngineSingleton) return adventureAudioEngineSingleton;
    let ctx = null;
    let masterGain = null;
    let ambienceBus = null;
    let sfxBus = null;
    let currentAmbience = null;
    let currentPreview = null;
    let speechActive = false;
    let enabled = true;
    let preferences = getAdventureAudioPreferences();
    let documentHidden = isAdventureAudioDocumentHidden();
    const lastEventAt = {};
    const voiceBudget = createAdventureVoiceBudget({
        maxVoices: () => preferences.gentle ? 12 : 24,
        // Background details yield first, ordinary cues keep five voices in
        // reserve, and critical feedback can use the complete safe ceiling.
        reserves: { detail: 8, event: 5, critical: 0 }
    });
    const themeState = createAdventureThemeState();
    const previewThemeState = createAdventureThemeState();
    const mixFocus = createAdventureMixFocus();

    const getSfxBusLevel = () => 0.72 * preferences.effects * (preferences.gentle ? 0.68 : 1) * (speechActive ? 0.42 : 1);
    const getAmbienceBusLevel = () => (speechActive ? 0.24 : 1) * preferences.ambience * mixFocus.multiplier();

    const rampGain = (node, value, seconds = 0.12) => {
        if (!node || !ctx) return;
        const now = ctx.currentTime;
        const target = Math.max(0.0001, Number(value) || 0.0001);
        try {
            node.gain.cancelScheduledValues(now);
            node.gain.setValueAtTime(Math.max(0.0001, node.gain.value), now);
            node.gain.exponentialRampToValueAtTime(target, now + Math.max(0.01, seconds));
        } catch (_) { node.gain.value = value; }
    };

    const focusEvent = (priority, durationMs = 500) => {
        const token = mixFocus.add(priority, preferences.gentle);
        if (!token) return null;
        if (ambienceBus && ctx) rampGain(ambienceBus, getAmbienceBusLevel(), 0.055);
        setTimeout(() => {
            mixFocus.release(token);
            if (ambienceBus && ctx) rampGain(ambienceBus, getAmbienceBusLevel(), preferences.gentle ? 0.48 : 0.34);
        }, Math.max(80, Math.min(2000, Number(durationMs) || 500)));
        return token;
    };

    const ensureGraph = () => {
        const nextCtx = getGlobalAudioContext();
        if (!nextCtx) return null;
        if (ctx === nextCtx && masterGain) return ctx;
        ctx = nextCtx;
        masterGain = ctx.createGain();
        ambienceBus = ctx.createGain();
        sfxBus = ctx.createGain();
        const compressor = ctx.createDynamicsCompressor();
        masterGain.gain.value = isGlobalMuted() ? 0.0001 : 0.82;
        ambienceBus.gain.value = getAmbienceBusLevel();
        sfxBus.gain.value = getSfxBusLevel();
        compressor.threshold.value = -18;
        compressor.knee.value = 16;
        compressor.ratio.value = 5;
        compressor.attack.value = 0.004;
        compressor.release.value = 0.22;
        ambienceBus.connect(masterGain);
        sfxBus.connect(masterGain);
        masterGain.connect(compressor);
        compressor.connect(ctx.destination);
        return ctx;
    };

    const resume = () => {
        const audioCtx = ensureGraph();
        if (audioCtx && audioCtx.state === 'suspended' && !isGlobalMuted()) {
            try { audioCtx.resume(); } catch (_) {}
        }
        return audioCtx;
    };

    const stopLayer = (layer, fadeSeconds = 1.2) => {
        if (!layer || layer.stopping) return;
        layer.stopping = true;
        if (layer.autoStopTimer) { clearTimeout(layer.autoStopTimer); layer.autoStopTimer = null; }
        rampGain(layer.gain, 0.0001, fadeSeconds);
        layer.stopTimer = setTimeout(() => {
            stopAdventureAudioNodes(layer.nodes);
            try { layer.gain.disconnect(); } catch (_) {}
        }, Math.max(60, fadeSeconds * 1000 + 80));
    };

    const notifyPreviewState = active => {
        try {
            if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('alloflow-adventure-audio-preview', { detail: { active: !!active } }));
        } catch (_) {}
    };

    const stopPreview = (fadeSeconds = 0.2, restoreLiveLayer = true) => {
        const oldPreview = currentPreview;
        currentPreview = null;
        if (oldPreview?.previewTimer) clearTimeout(oldPreview.previewTimer);
        stopLayer(oldPreview, fadeSeconds);
        if (restoreLiveLayer && currentAmbience && !currentAmbience.stopping) rampGain(currentAmbience.gain, currentAmbience.volume, 0.32);
        if (oldPreview) notifyPreviewState(false);
    };

    const playPreview = (params, options = {}) => {
        const audioCtx = resume() || ensureGraph();
        if (!audioCtx || !ambienceBus) return null;
        stopPreview(0.08, false);
        const profile = normalizeAdventureSoundParams(params, options.sceneText || 'Adventure Sound Lab');
        const themeProfile = createAdventureThemeProfile(options.themeSeed || 'adventure-sound-lab');
        const gain = audioCtx.createGain();
        const volume = clampAdventureAudio(options.volume == null ? 0.16 : options.volume, 0, 0.32);
        gain.gain.value = 0.0001;
        gain.connect(ambienceBus);
        const layer = {
            signature: 'preview:' + [profile.atmosphere, profile.element, profile.acousticSpace, profile.motion, profile.intensity.toFixed(2), themeProfile.key].join(':'),
            profile,
            themeProfile,
            gain,
            nodes: playGenerativeSoundscape(audioCtx, gain, profile, {
                sceneText: options.sceneText || 'Adventure Sound Lab',
                gentle: preferences.gentle,
                themeProfile,
                themeState: previewThemeState,
                voiceBudget
            }),
            volume,
            stopping: false,
            previewTimer: null
        };
        currentPreview = layer;
        if (currentAmbience && !currentAmbience.stopping) rampGain(currentAmbience.gain, Math.max(0.0001, currentAmbience.volume * 0.16), 0.12);
        rampGain(gain, volume, 0.18);
        const durationMs = Math.max(1200, Math.min(12000, Number(options.durationMs) || 8000));
        layer.previewTimer = setTimeout(() => { if (currentPreview === layer) stopPreview(0.35); }, durationMs);
        notifyPreviewState(true);
        return layer;
    };

    const playAmbience = (params, options = {}) => {
        const audioCtx = resume() || ensureGraph();
        if (!audioCtx || !ambienceBus) return null;
        const profile = normalizeAdventureSoundParams(params, options.sceneText);
        const themeProfile = createAdventureThemeProfile(options.themeSeed || options.sceneText || 'adventure');
        const signature = [profile.atmosphere, profile.element, profile.acousticSpace, profile.motion, profile.intensity.toFixed(2), themeProfile.key, preferences.gentle ? 'gentle' : 'full'].join(':');
        const volume = clampAdventureAudio(options.volume == null ? 0.2 : options.volume, 0, 0.5);
        if (currentAmbience && currentAmbience.signature === signature && !currentAmbience.stopping) {
            currentAmbience.volume = volume;
            rampGain(currentAmbience.gain, volume, 0.45);
            // Re-playing the same scene refreshes (or newly imposes) the declared lifetime —
            // an early-returned layer must not outlive the bound its caller asked for.
            const refreshMs = Number(options.autoStopMs);
            if (Number.isFinite(refreshMs) && refreshMs > 0) {
                if (currentAmbience.autoStopTimer) clearTimeout(currentAmbience.autoStopTimer);
                const held = currentAmbience;
                held.autoStopTimer = setTimeout(() => {
                    if (currentAmbience === held && !held.stopping) stopAmbience(2.2);
                    else if (!held.stopping) stopLayer(held, 2.2);
                }, refreshMs);
            }
            return currentAmbience;
        }
        const oldLayer = currentAmbience;
        const gain = audioCtx.createGain();
        gain.gain.value = 0.0001;
        gain.connect(ambienceBus);
        const layer = {
            signature,
            profile,
            themeProfile,
            gain,
            nodes: playGenerativeSoundscape(audioCtx, gain, profile, {
                sceneText: options.sceneText,
                gentle: preferences.gentle,
                themeProfile,
                themeState,
                voiceBudget
            }),
            volume,
            stopping: false
        };
        currentAmbience = layer;
        rampGain(gain, volume, oldLayer ? 1.7 : 1.05);
        if (oldLayer) stopLayer(oldLayer, 1.8);
        // Engine-level bound (2026-08-23, field report: a drone kept playing "perpetually" over a
        // whole session). When the caller declares a lifetime, the LAYER enforces it — a leaked
        // component, a missed cleanup, or any future caller that forgets to stop cannot leave an
        // oscillator running. Belt to the component's braces; no autoStopMs = old behavior.
        const autoStopMs = Number(options.autoStopMs);
        if (Number.isFinite(autoStopMs) && autoStopMs > 0) {
            layer.autoStopTimer = setTimeout(() => {
                if (currentAmbience === layer && !layer.stopping) stopAmbience(2.2);
                else if (!layer.stopping) stopLayer(layer, 2.2);
            }, autoStopMs);
        }
        return layer;
    };

    const stopAmbience = (fadeSeconds = 0.75) => {
        const oldLayer = currentAmbience;
        currentAmbience = null;
        stopLayer(oldLayer, fadeSeconds);
    };

    const setMuted = (muted) => {
        if (masterGain && ctx) rampGain(masterGain, muted || documentHidden ? 0.0001 : 0.82, muted ? 0.05 : 0.2);
        if (!muted && !documentHidden && masterGain) resume();
    };

    const setSpeechActive = (active) => {
        speechActive = !!active;
        if (ambienceBus && ctx) rampGain(ambienceBus, getAmbienceBusLevel(), speechActive ? 0.15 : 0.7);
        if (sfxBus && ctx) rampGain(sfxBus, getSfxBusLevel(), speechActive ? 0.08 : 0.3);
    };

    const setDocumentHidden = (hidden) => {
        documentHidden = !!hidden;
        if (!masterGain || !ctx) return;
        rampGain(masterGain, documentHidden || isGlobalMuted() ? 0.0001 : 0.82, documentHidden ? 0.08 : 0.18);
        if (!documentHidden && !isGlobalMuted()) resume();
    };

    const applyPreferences = (next, persist = false) => {
        preferences = persist ? setAdventureAudioPreferences(next) : normalizeAdventureAudioPreferences(next);
        if (ambienceBus && ctx) rampGain(ambienceBus, getAmbienceBusLevel(), 0.25);
        if (sfxBus && ctx) rampGain(sfxBus, getSfxBusLevel(), 0.18);
        return { ...preferences };
    };

    const canPlayEvent = (type, cooldownMs) => {
        if (!enabled || documentHidden || isGlobalMuted()) return false;
        const now = Date.now();
        if (lastEventAt[type] && now - lastEventAt[type] < cooldownMs) return false;
        lastEventAt[type] = now;
        return true;
    };

    if (typeof window !== 'undefined') {
        window.addEventListener('alloflow-mute-changed', event => setMuted(!!event?.detail?.muted));
        window.addEventListener('allo-speech-state', event => setSpeechActive(!!event?.detail?.isPlaying));
        window.addEventListener('alloflow-adventure-audio-preferences', event => applyPreferences(event?.detail || getAdventureAudioPreferences(), false));
        document.addEventListener('visibilitychange', () => setDocumentHidden(isAdventureAudioDocumentHidden()));
    }

    adventureAudioEngineSingleton = {
        canPlayEvent,
        claimVoice: priority => voiceBudget.claim(priority),
        focusEvent,
        getMixFocusSnapshot: () => mixFocus.snapshot(),
        getSfxBus: () => sfxBus,
        getPreferences: () => ({ ...preferences }),
        getSceneProfile: () => currentPreview ? { ...currentPreview.profile } : currentAmbience ? { ...currentAmbience.profile } : null,
        getThemeProfile: () => currentPreview ? { ...currentPreview.themeProfile } : currentAmbience ? { ...currentAmbience.themeProfile } : null,
        getVoiceBudgetSnapshot: () => voiceBudget.snapshot(),
        playAmbience,
        playPreview,
        releaseVoice: token => voiceBudget.release(token),
        resume,
        runDiagnostics: runAdventureAudioDiagnostics,
        setEnabled: value => { enabled = value !== false; },
        setPreferences: value => applyPreferences(value, true),
        stopAmbience,
        stopPreview
    };
    return adventureAudioEngineSingleton;
};

const ADVENTURE_EVENT_SCALES = {
    calm: [196, 246.94, 293.66, 392, 493.88],
    joyful: [261.63, 329.63, 392, 523.25, 659.25],
    ethereal: [220, 277.18, 329.63, 440, 554.37],
    dark: [110, 130.81, 146.83, 174.61, 207.65],
    tense: [110, 116.54, 130.81, 155.56, 174.61]
};

// ── Positive-reinforcement tonic (2026-08-23, Aaron's classroom feedback) ──────────────────
// Success cues used to borrow the SCENE's atmosphere scale, so a good dice roll in a tense
// scene rang out on a low semitone-cluster root and resolved nowhere. Reinforcement should
// sound like reinforcement no matter the scene: positive cues (success / critical_success /
// item_get) are now anchored on one fixed bright tonic and built from pure ratios (3/2 fifth,
// 5/4 major third), ending ON the tonic — a conventional authentic cadence, the same cue every
// time so students learn the association. Failure / damage / tension cues keep the scene's
// darker language on purpose ("drums are good for some things").
const ADVENTURE_REWARD_TONIC = 523.25; // C5

const ADVENTURE_EVENT_ELEMENT_BANDS = {
    water: [170, 1100], rain: [500, 2400], ocean: [110, 900], nature: [700, 2600],
    machinery: [90, 700], city: [120, 900], laboratory: [250, 1400], fire: [260, 1900],
    wind: [300, 2100], cave: [90, 500], space: [600, 1800], crowd: [180, 1200], silence: [220, 1100]
};

const getAdventureEventRoot = (profile, variation, mode = 'scene', themeProfile = null) => {
    const atmosphere = mode === 'failure' ? 'dark' : String(profile?.atmosphere || 'calm').toLowerCase();
    const scale = ADVENTURE_EVENT_SCALES[atmosphere] || ADVENTURE_EVENT_SCALES.calm;
    const elementOffset = profile?.element === 'water' || profile?.element === 'ocean' ? 1 : profile?.element === 'machinery' ? 2 : 0;
    const contour = Array.isArray(themeProfile?.contour) && themeProfile.contour.length ? themeProfile.contour : null;
    const themeDegree = contour ? contour[variation % contour.length] : variation;
    return scale[(themeDegree + elementOffset) % scale.length];
};

const getAdventureEventBand = (profile) => {
    const element = String(profile?.element || 'silence').toLowerCase();
    return ADVENTURE_EVENT_ELEMENT_BANDS[element] || ADVENTURE_EVENT_ELEMENT_BANDS.silence;
};

const playAdventureEventSound = (type) => {
    const engine = getAdventureAudioEngine();
    const cooldown = type === 'transition' ? 500 : type === 'decision_select' ? 45 : 100;
    if (!engine.canPlayEvent(type, cooldown)) return;
    const ctx = engine.resume();
    const destination = engine.getSfxBus();
    if (!ctx || !destination) return;
    const now = ctx.currentTime;
    const variation = Math.floor(Math.random() * 3);
    const sceneProfile = engine.getSceneProfile();
    const themeProfile = engine.getThemeProfile();
    const eventRoot = getAdventureEventRoot(sceneProfile, variation, 'scene', themeProfile);
    const [bandLow, bandHigh] = getAdventureEventBand(sceneProfile);
    const materialWave = sceneProfile?.element === 'machinery' || sceneProfile?.element === 'city' ? 'triangle' : 'sine';
    const eventSpace = String(sceneProfile?.acousticSpace || 'room').toLowerCase();
    const eventSpaceLift = ({ open: 1, room: 0.97, cave: 0.82, void: 1.08 })[eventSpace] || 0.97;
    const eventPriority = ['critical_success', 'failure', 'damage'].includes(type)
        ? 'critical'
        : type === 'decision_select' ? 'detail' : 'event';
    let playedAnyVoice = false;

    const tone = ({ wave = 'sine', frequency, endFrequency, start = 0, duration = 0.25, volume = 0.05, pan = 0 }) => {
        const voiceToken = engine.claimVoice(eventPriority);
        if (!voiceToken) return false;
        let osc = null;
        let gain = null;
        let panner = null;
        const cleanup = () => {
            engine.releaseVoice(voiceToken);
            try { osc?.disconnect(); } catch (_) {}
            try { gain?.disconnect(); } catch (_) {}
            try { panner?.disconnect(); } catch (_) {}
        };
        try {
            osc = ctx.createOscillator();
            gain = ctx.createGain();
            panner = typeof ctx.createStereoPanner === 'function' ? ctx.createStereoPanner() : null;
            const at = now + start;
            osc.type = wave;
            osc.frequency.setValueAtTime(Math.max(30, frequency), at);
            if (endFrequency) osc.frequency.exponentialRampToValueAtTime(Math.max(30, endFrequency), at + duration);
            gain.gain.setValueAtTime(0.0001, at);
            gain.gain.exponentialRampToValueAtTime(volume, at + Math.min(0.018, duration * 0.2));
            gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
            osc.connect(gain);
            if (panner) {
                panner.pan.value = clampAdventureAudio(pan, -1, 1);
                gain.connect(panner);
                panner.connect(destination);
            } else gain.connect(destination);
            osc.onended = cleanup;
            osc.start(at);
            osc.stop(at + duration + 0.025);
            playedAnyVoice = true;
            setTimeout(cleanup, Math.max(80, (start + duration) * 1000 + 120));
            return true;
        } catch (_) {
            cleanup();
            return false;
        }
    };

    // Give major cues a quiet harmonic companion shaped by the current
    // acoustic space. This keeps transitions and rewards connected to the
    // scene without introducing any sampled material or extra loudness.
    const playSceneAccent = (ratio, start = 0.08, duration = 0.46, volume = 0.012, pan = 0) => {
        const frequency = Math.max(60, Math.min(4600, eventRoot * ratio * eventSpaceLift));
        const endFrequency = eventSpace === 'void' ? frequency * 1.06 : frequency * 1.012;
        tone({
            wave: eventSpace === 'cave' ? 'triangle' : 'sine',
            frequency,
            endFrequency,
            start,
            duration,
            volume,
            pan
        });
    };

    const noise = ({ duration = 0.2, volume = 0.035, from = 300, to = 1400, pan = 0 }) => {
        const voiceToken = engine.claimVoice(eventPriority);
        if (!voiceToken) return false;
        let source = null;
        let filter = null;
        let gain = null;
        let panner = null;
        const cleanup = () => {
            engine.releaseVoice(voiceToken);
            try { source?.disconnect(); } catch (_) {}
            try { filter?.disconnect(); } catch (_) {}
            try { gain?.disconnect(); } catch (_) {}
            try { panner?.disconnect(); } catch (_) {}
        };
        try {
            source = ctx.createBufferSource();
            filter = ctx.createBiquadFilter();
            gain = ctx.createGain();
            panner = typeof ctx.createStereoPanner === 'function' ? ctx.createStereoPanner() : null;
            source.buffer = createAdventureNoiseBuffer(ctx, duration + 0.05, variation);
            filter.type = 'bandpass';
            filter.Q.value = 0.8;
            filter.frequency.setValueAtTime(from, now);
            filter.frequency.exponentialRampToValueAtTime(to, now + duration);
            gain.gain.setValueAtTime(0.0001, now);
            gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
            source.connect(filter);
            filter.connect(gain);
            if (panner) {
                panner.pan.value = clampAdventureAudio(pan, -1, 1);
                gain.connect(panner);
                panner.connect(destination);
            } else gain.connect(destination);
            source.onended = cleanup;
            source.start(now);
            source.stop(now + duration + 0.03);
            playedAnyVoice = true;
            setTimeout(cleanup, Math.max(80, duration * 1000 + 120));
            return true;
        } catch (_) {
            cleanup();
            return false;
        }
    };

    switch (type) {
        case 'transition':
            noise({ duration: 0.48, volume: 0.03, from: bandLow, to: bandHigh, pan: variation === 0 ? -0.25 : 0.25 });
            tone({ wave: materialWave, frequency: Math.max(55, eventRoot * 0.5), endFrequency: eventRoot, duration: 0.42, volume: 0.02 });
            playSceneAccent(2, 0.1, 0.54, 0.011, variation === 0 ? 0.22 : -0.22);
            break;
        case 'critical_success': {
            // Full authentic cadence: sol + ti (the dominant's pull) resolving into a rising
            // C-major arpeggio that lands and RINGS on the octave, grounded by a soft low tonic
            // pad. The leading tone is what makes the landing feel earned.
            const doN = ADVENTURE_REWARD_TONIC;
            tone({ frequency: doN * 3 / 4, duration: 0.14, volume: 0.034, pan: -0.18 });
            tone({ wave: 'triangle', frequency: doN * 15 / 16, duration: 0.14, volume: 0.026, pan: 0.14 });
            [[1, 0.16, 0.3, 0.048], [5 / 4, 0.27, 0.32, 0.044], [3 / 2, 0.38, 0.36, 0.046], [2, 0.5, 0.72, 0.06]]
                .forEach(([ratio, start, duration, volume], index) => tone({ wave: index === 3 ? 'sine' : 'triangle', frequency: doN * ratio, start, duration, volume, pan: (index - 1.5) * 0.16 }));
            tone({ frequency: doN / 2, start: 0.16, duration: 0.9, volume: 0.02 });
            break;
        }
        case 'success': {
            // sol → do: the dominant pickup resolves onto the tonic, which rings, with a quiet
            // pure major third underneath. Two beats, unmistakably "that went well".
            const doN = ADVENTURE_REWARD_TONIC;
            tone({ frequency: doN * 3 / 4, duration: 0.16, volume: 0.04, pan: variation === 1 ? 0.1 : -0.1 });
            tone({ frequency: doN, start: 0.14, duration: 0.5, volume: 0.05, pan: 0.08 });
            tone({ wave: 'triangle', frequency: doN * 5 / 4, start: 0.2, duration: 0.42, volume: 0.02, pan: 0.16 });
            break;
        }
        case 'failure': {
            const root = getAdventureEventRoot(sceneProfile, variation, 'failure', themeProfile);
            tone({ wave: 'triangle', frequency: root * 1.5, endFrequency: root, duration: 0.45, volume: 0.048 });
            tone({ frequency: root * 1.1, endFrequency: root * 0.78, start: 0.09, duration: 0.4, volume: 0.03, pan: -0.2 });
            playSceneAccent(0.5, 0.07, 0.48, 0.008, 0.2);
            break;
        }
        case 'damage':
            noise({ duration: 0.18, volume: 0.056, from: Math.max(90, bandHigh * 0.75), to: bandLow, pan: variation === 0 ? -0.2 : 0.2 });
            tone({ wave: 'sawtooth', frequency: Math.max(60, eventRoot * 0.75), endFrequency: Math.max(35, eventRoot * 0.24), duration: 0.24, volume: 0.042 });
            break;
        case 'item_get': {
            // do-mi-sol-do′ sparkle an octave up — a complete major arpeggio, so even the small
            // reward resolves instead of trailing off mid-air.
            const root = ADVENTURE_REWARD_TONIC * 2;
            [1, 5 / 4, 3 / 2, 2].forEach((ratio, index) => tone({ frequency: root * ratio, start: index * 0.07, duration: 0.16 + index * 0.07, volume: index === 3 ? 0.03 : 0.024, pan: (index - 1.5) * 0.22 }));
            break;
        }
        case 'decision_select':
            tone({ wave: 'triangle', frequency: eventRoot * 3.1, endFrequency: eventRoot * 3.8, duration: 0.055, volume: 0.023 });
            break;
    }
    if (playedAnyVoice) {
        const focusDuration = ({ transition: 620, success: 700, critical_success: 1300, failure: 680, damage: 430, item_get: 560 })[type] || 0;
        if (focusDuration) engine.focusEvent(eventPriority, focusDuration);
    }
};

const ClimaxProgressBar = React.memo(({ climaxState }) => {
  const { t } = useContext(LanguageContext);
  if (!climaxState || !climaxState.isActive) return null;
  const { masteryScore, archetype } = climaxState;
  let typeKey = (archetype || 'default').toLowerCase();
  if (typeKey === 'auto') typeKey = 'default';
  const label = t('adventure.climax_archetypes.' + typeKey + '.label') || t('adventure.climax_archetypes.default.label');
  const leftLabel = t('adventure.climax_archetypes.' + typeKey + '.left') || t('adventure.climax_archetypes.default.left');
  const rightLabel = t('adventure.climax_archetypes.' + typeKey + '.right') || t('adventure.climax_archetypes.default.right');
  const normalizedScore = Math.max(0, Math.min(100, Number(masteryScore) || 0));
  let icon = "\u2694\uFE0F";
  switch (archetype) {
    case 'Antagonist': icon = "\u2694\uFE0F"; break;
    case 'Catastrophe': icon = "\u26A0\uFE0F"; break;
    case 'Masterpiece': icon = "\uD83C\uDFA8"; break;
    case 'Discovery': icon = "\uD83D\uDDFA\uFE0F"; break;
  }
  let barColor = "bg-yellow-500";
  let textColor = "text-yellow-400";
  let borderColor = "border-yellow-600";
  if (normalizedScore >= 80) {
      barColor = "bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.6)]";
      textColor = "text-green-400";
      borderColor = "border-green-600";
  } else if (normalizedScore <= 30) {
      barColor = "bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)]";
      textColor = "text-red-400";
      borderColor = "border-red-600";
  }
  return (
    <div className={'w-full bg-slate-900/95 backdrop-blur-md border-y-4 ' + borderColor + ' p-4 shadow-2xl animate-in slide-in-from-top-4 motion-reduce:animate-none relative z-40 mb-2 transition-colors duration-500 motion-reduce:transition-none'}>
      <div className="flex justify-between items-end mb-2 px-1">
        <div className="flex items-center gap-2">
            <span className="text-xl animate-pulse motion-reduce:animate-none" aria-hidden="true">{icon}</span>
            <span className="text-xs font-black text-indigo-200 uppercase tracking-widest">{label}</span>
        </div>
        <span className={'text-2xl font-black ' + textColor + ' drop-shadow-sm font-mono transition-colors duration-500 motion-reduce:transition-none'}>
          {Math.round(normalizedScore)}%
        </span>
      </div>
      <div
        className="relative h-6 w-full bg-slate-800 rounded-full border-2 border-slate-600 overflow-hidden shadow-inner"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(normalizedScore)}
        aria-valuetext={Math.round(normalizedScore) + '%; ' + leftLabel + ' to ' + rightLabel}
      >
        <div
          className={'h-full ' + barColor + ' transition-all duration-1000 ease-out motion-reduce:transition-none relative'}
          style={{ width: normalizedScore + '%' }}
          aria-hidden="true"
        >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_infinite] motion-reduce:animate-none"></div>
        </div>
        <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/30 z-10 border-l border-black/20" aria-hidden="true"></div>
        <div className="absolute top-0 bottom-0 left-[25%] w-px bg-white/10 z-0" aria-hidden="true"></div>
        <div className="absolute top-0 bottom-0 left-[75%] w-px bg-white/10 z-0" aria-hidden="true"></div>
      </div>
      <div className="flex justify-between text-[11px] font-bold uppercase mt-1.5 px-1">
        <span className="text-red-300">{leftLabel} (0%)</span>
        <span className="text-green-400">{rightLabel} (100%)</span>
      </div>
    </div>
  );
});
// ═══ AdventureAmbience (lines 9565-9642) ═══
// ═══ playDiceSound + getD20Rotation (lines 10760-10811) ═══
// ── Scene-bookend ambience (2026-08-23, Aaron's classroom feedback) ─────────────────────────
// The old behavior held the generative bed for the ENTIRE scene (ducked under TTS, then ramped
// back to full when speech ended). In class that reads as "the drone never stops", and students
// need silence to focus on the text/TTS. New contract: ambience INTRODUCES a scene (swell in,
// hold a few seconds, fade to silence) and the next scene's swell is the closing bookend of the
// one before it. Between bookends: silence. TTS starting during the intro cuts it short — speech
// always wins. Dice/XP/event SFX are untouched (sfx bus, separate path).
const ADVENTURE_AMBIENCE_INTRO_HOLD_MS = 7000;   // swell + hold before the fade begins
const ADVENTURE_AMBIENCE_OUTRO_FADE_S = 3.5;     // gentle fade, not a cut

const AdventureAmbience = React.memo(({ sceneText, soundParams, themeSeed, active, volume = 0.3 }) => {
    const engineRef = useRef(null);
    const lastSceneRef = useRef(null);   // scene identity: bookend fires once per scene, not per re-render
    const holdTimerRef = useRef(null);

    useEffect(() => {
        const engine = engineRef.current || getAdventureAudioEngine();
        engineRef.current = engine;
        if (!active || !sceneText) {
            lastSceneRef.current = null;
            if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
            engine.setEnabled(false);
            engine.stopAmbience(0.65);
            return;
        }
        engine.setEnabled(true);
        // Re-renders of the SAME scene (state churn recreates currentScene/soundParams identity)
        // must not restart the bookend — the mid-scene silence is the whole point.
        if (lastSceneRef.current === sceneText) return;
        lastSceneRef.current = sceneText;
        if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
        // autoStopMs: the engine enforces the lifetime even if this component leaks — the exact
        // "kept going perpetually" failure this redesign exists to make impossible.
        engine.playAmbience(soundParams, {
            sceneText, themeSeed, volume,
            autoStopMs: ADVENTURE_AMBIENCE_INTRO_HOLD_MS + ADVENTURE_AMBIENCE_OUTRO_FADE_S * 1000 + 4000,
        });
        holdTimerRef.current = setTimeout(() => {
            holdTimerRef.current = null;
            engine.stopAmbience(ADVENTURE_AMBIENCE_OUTRO_FADE_S);
        }, ADVENTURE_AMBIENCE_INTRO_HOLD_MS);
    }, [sceneText, soundParams, themeSeed, active, volume]);

    // TTS beats ambience: if speech starts during the intro hold, fade out early instead of
    // ducking-then-returning. Mount-scoped listener so same-scene effect re-runs can't drop it.
    useEffect(() => {
        const onSpeech = (event) => {
            if (!event?.detail?.isPlaying) return;
            if (holdTimerRef.current) {
                clearTimeout(holdTimerRef.current);
                holdTimerRef.current = null;
                if (engineRef.current) engineRef.current.stopAmbience(1.3);
            }
        };
        window.addEventListener('allo-speech-state', onSpeech);
        return () => window.removeEventListener('allo-speech-state', onSpeech);
    }, []);

    useEffect(() => () => {
        if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
        if (engineRef.current) {
            engineRef.current.setEnabled(false);
            engineRef.current.stopAmbience(0.45);
        }
    }, []);

    return null;
});

const AdventureAudioControls = React.memo(({ soundEnabled = true, t = key => key }) => {
    const [preferences, setPreferences] = useState(() => getAdventureAudioPreferences());
    const [open, setOpen] = useState(false);
    const [previewActive, setPreviewActive] = useState(false);
    const [diagnostic, setDiagnostic] = useState({ status: 'idle', result: null });
    const [labProfile, setLabProfile] = useState({ atmosphere: 'calm', element: 'nature', acousticSpace: 'open', motion: 'steady', intensity: 0.4 });
    const triggerRef = useRef(null);
    const dialogRef = useRef(null);
    const update = (patch) => {
        const next = getAdventureAudioEngine().setPreferences(patch);
        setPreferences(next);
    };
    const translate = (key, fallback) => {
        try {
            const value = t(key);
            return value && value !== key ? value : fallback;
        } catch (_) { return fallback; }
    };
    const closeDialog = () => {
        getAdventureAudioEngine().stopPreview(0.18);
        setOpen(false);
        setTimeout(() => { try { triggerRef.current?.focus(); } catch (_) {} }, 0);
    };
    const updateLabProfile = (field, value) => setLabProfile(current => ({ ...current, [field]: value }));
    const playSelectedLabProfile = engine => engine.playPreview(labProfile, {
        sceneText: 'Adventure Sound Lab ' + [labProfile.atmosphere, labProfile.element, labProfile.acousticSpace, labProfile.motion].join(' '),
        themeSeed: 'adventure-sound-lab',
        volume: 0.16,
        durationMs: 8000
    });
    const startLabPreview = () => {
        const engine = getAdventureAudioEngine();
        engine.setEnabled(true);
        playSelectedLabProfile(engine);
    };
    const previewLabEvent = type => {
        const engine = getAdventureAudioEngine();
        engine.setEnabled(true);
        playSelectedLabProfile(engine);
        playAdventureEventSound(type);
    };
    const runLabDiagnostic = async () => {
        setDiagnostic({ status: 'running', result: null });
        const result = await getAdventureAudioEngine().runDiagnostics();
        setDiagnostic({ status: 'complete', result });
    };
    useEffect(() => {
        if (!open) return;
        const onKeyDown = event => {
            if (event.key === 'Escape') {
                event.preventDefault();
                closeDialog();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        const focusTimer = setTimeout(() => { try { dialogRef.current?.focus(); } catch (_) {} }, 0);
        return () => {
            clearTimeout(focusTimer);
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const onPreferences = event => setPreferences(normalizeAdventureAudioPreferences(event?.detail || getAdventureAudioPreferences()));
        const onPreview = event => setPreviewActive(!!event?.detail?.active);
        const onStorage = event => {
            if (event.key !== ADVENTURE_AUDIO_PREFS_KEY) return;
            let next = null;
            try { next = JSON.parse(event.newValue || 'null'); } catch (_) {}
            adventureAudioPreferencesCache = normalizeAdventureAudioPreferences(next);
            setPreferences(adventureAudioPreferencesCache);
            getAdventureAudioEngine().setPreferences(adventureAudioPreferencesCache);
        };
        window.addEventListener('alloflow-adventure-audio-preferences', onPreferences);
        window.addEventListener('alloflow-adventure-audio-preview', onPreview);
        window.addEventListener('storage', onStorage);
        return () => {
            getAdventureAudioEngine().stopPreview(0.08);
            window.removeEventListener('alloflow-adventure-audio-preferences', onPreferences);
            window.removeEventListener('alloflow-adventure-audio-preview', onPreview);
            window.removeEventListener('storage', onStorage);
        };
    }, []);
    const ambiencePercent = Math.round(preferences.ambience * 100);
    const effectsPercent = Math.round(preferences.effects * 100);
    const audioAvailable = soundEnabled && (ambiencePercent > 0 || effectsPercent > 0);
    const label = translate('adventure.audio_settings', 'Adventure sound settings');
    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                onClick={() => setOpen(true)}
                className="min-w-11 min-h-11 shrink-0 flex items-center justify-center gap-2 px-3 py-2 rounded-full text-xs font-bold transition-colors border shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-900 bg-indigo-800 text-indigo-200 border-indigo-600 hover:bg-indigo-700 hover:text-white"
                aria-label={label}
                aria-haspopup="dialog"
                aria-expanded={open}
                title={label}
            >
                {audioAvailable ? <Volume2 size={15} aria-hidden="true" /> : <VolumeX size={15} aria-hidden="true" />}
                <span className="hidden xl:inline">{translate('adventure.audio_short', 'Sound mix')}</span>
            </button>
            {open && <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) closeDialog(); }}>
            <div ref={dialogRef} tabIndex={-1} className="relative max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border-2 border-indigo-300 bg-white p-5 text-slate-800 shadow-2xl focus:outline-none" role="dialog" aria-modal="true" aria-labelledby="adventure-audio-dialog-title">
                <button type="button" onClick={closeDialog} className="absolute right-2 top-2 flex min-h-11 min-w-11 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700" aria-label={translate('common.close', 'Close')}><X size={18} aria-hidden="true" /></button>
                <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                        <div id="adventure-audio-dialog-title" className="pr-10 font-black text-indigo-950">{label}</div>
                        <div className="text-[11px] leading-snug text-slate-600">{soundEnabled ? translate('adventure.audio_local_note', 'Created on this device with procedural audio.') : translate('adventure.audio_muted_note', 'App sound is currently muted.')}</div>
                    </div>
                    <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${audioAvailable ? 'bg-emerald-500' : 'bg-slate-400'}`} aria-hidden="true"></span>
                </div>
                <label className="mb-3 block text-xs font-bold" htmlFor="adventure-ambience-level">
                    <span className="mb-1 flex justify-between"><span>{translate('adventure.audio_ambience', 'Ambience')}</span><output>{ambiencePercent}%</output></span>
                    <input id="adventure-ambience-level" type="range" min="0" max="100" step="10" value={ambiencePercent} onChange={event => update({ ambience: Number(event.target.value) / 100 })} className="min-h-11 w-full accent-indigo-700" />
                    <span className="mt-1 block text-[10px] font-normal leading-snug text-slate-600">{translate('adventure.audio_ambience_hint', 'Scene sound plays at the start of each scene, then fades out so reading and narration stay clear.')}</span>
                </label>
                <label className="mb-3 block text-xs font-bold" htmlFor="adventure-effects-level">
                    <span className="mb-1 flex justify-between"><span>{translate('adventure.audio_effects', 'Effects')}</span><output>{effectsPercent}%</output></span>
                    <input id="adventure-effects-level" type="range" min="0" max="100" step="10" value={effectsPercent} onChange={event => update({ effects: Number(event.target.value) / 100 })} className="min-h-11 w-full accent-indigo-700" />
                </label>
                <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-950">
                    <input type="checkbox" checked={preferences.gentle} onChange={event => update({ gentle: event.target.checked })} className="h-5 w-5 accent-indigo-700" />
                    <span><span className="block">{translate('adventure.audio_gentle', 'Gentle sound mode')}</span><span className="block font-normal text-indigo-700">{translate('adventure.audio_gentle_note', 'Softer effects and calmer motion.')}</span></span>
                </label>
                <details className="mt-3 rounded-xl border border-violet-200 bg-violet-50/70 p-3">
                    <summary className="min-h-11 cursor-pointer select-none py-2 text-sm font-black text-violet-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-700">
                        {translate('adventure.audio_sound_lab', 'Adventure Sound Lab')}
                    </summary>
                    <div className="mt-2 space-y-3 border-t border-violet-200 pt-3">
                        <p className="text-[11px] leading-snug text-violet-900">{translate('adventure.audio_sound_lab_note', 'Audition procedural scene profiles without replacing the live adventure ambience.')}</p>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <label className="text-xs font-bold text-slate-800" htmlFor="adventure-lab-atmosphere">
                                <span className="mb-1 block">{translate('adventure.audio_atmosphere', 'Atmosphere')}</span>
                                <select id="adventure-lab-atmosphere" value={labProfile.atmosphere} onChange={event => updateLabProfile('atmosphere', event.target.value)} className="min-h-11 w-full rounded-lg border border-slate-400 bg-white px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-700">
                                    {['calm', 'joyful', 'ethereal', 'dark', 'tense'].map(value => <option key={value} value={value}>{value.charAt(0).toUpperCase() + value.slice(1)}</option>)}
                                </select>
                            </label>
                            <label className="text-xs font-bold text-slate-800" htmlFor="adventure-lab-element">
                                <span className="mb-1 block">{translate('adventure.audio_environment', 'Environment')}</span>
                                <select id="adventure-lab-element" value={labProfile.element} onChange={event => updateLabProfile('element', event.target.value)} className="min-h-11 w-full rounded-lg border border-slate-400 bg-white px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-700">
                                    {['nature', 'water', 'rain', 'ocean', 'wind', 'fire', 'cave', 'city', 'machinery', 'laboratory', 'space', 'crowd', 'silence'].map(value => <option key={value} value={value}>{value.charAt(0).toUpperCase() + value.slice(1)}</option>)}
                                </select>
                            </label>
                            <label className="text-xs font-bold text-slate-800" htmlFor="adventure-lab-space">
                                <span className="mb-1 block">{translate('adventure.audio_space', 'Acoustic space')}</span>
                                <select id="adventure-lab-space" value={labProfile.acousticSpace} onChange={event => updateLabProfile('acousticSpace', event.target.value)} className="min-h-11 w-full rounded-lg border border-slate-400 bg-white px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-700">
                                    {['open', 'room', 'cave', 'void'].map(value => <option key={value} value={value}>{value.charAt(0).toUpperCase() + value.slice(1)}</option>)}
                                </select>
                            </label>
                            <label className="text-xs font-bold text-slate-800" htmlFor="adventure-lab-motion">
                                <span className="mb-1 block">{translate('adventure.audio_motion', 'Motion')}</span>
                                <select id="adventure-lab-motion" value={labProfile.motion} onChange={event => updateLabProfile('motion', event.target.value)} className="min-h-11 w-full rounded-lg border border-slate-400 bg-white px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-700">
                                    {['still', 'steady', 'travel', 'chase', 'urgent'].map(value => <option key={value} value={value}>{value.charAt(0).toUpperCase() + value.slice(1)}</option>)}
                                </select>
                            </label>
                        </div>
                        <label className="block text-xs font-bold text-slate-800" htmlFor="adventure-lab-intensity">
                            <span className="mb-1 flex justify-between"><span>{translate('adventure.audio_intensity', 'Intensity')}</span><output>{Math.round(labProfile.intensity * 100)}%</output></span>
                            <input id="adventure-lab-intensity" type="range" min="10" max="100" step="10" value={Math.round(labProfile.intensity * 100)} onChange={event => updateLabProfile('intensity', Number(event.target.value) / 100)} className="min-h-11 w-full accent-violet-700" />
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <button type="button" disabled={!soundEnabled} onClick={startLabPreview} className="min-h-11 rounded-xl bg-violet-700 px-3 py-2 text-xs font-black text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-700 focus-visible:ring-offset-2">{previewActive ? translate('adventure.audio_restart_preview', 'Restart preview') : translate('adventure.audio_start_preview', 'Preview ambience')}</button>
                            <button type="button" disabled={!previewActive} onClick={() => getAdventureAudioEngine().stopPreview(0.2)} className="min-h-11 rounded-xl border border-violet-400 bg-white px-3 py-2 text-xs font-black text-violet-900 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-700">{translate('adventure.audio_stop_preview', 'Stop preview')}</button>
                        </div>
                        <div role="group" aria-label={translate('adventure.audio_event_previews', 'Event cue previews')} className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                            {[['transition', 'Transition'], ['success', 'Success'], ['critical_success', 'Big win'], ['failure', 'Failure'], ['item_get', 'Item']].map(([type, text]) => <button key={type} type="button" disabled={!soundEnabled} onClick={() => previewLabEvent(type)} className="min-h-11 rounded-lg border border-violet-300 bg-white px-2 py-2 text-[11px] font-bold text-violet-900 hover:bg-violet-100 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-700">{text}</button>)}
                        </div>
                        <div role="status" aria-live="polite" className="min-h-5 text-[11px] font-bold text-violet-900">{previewActive ? translate('adventure.audio_preview_active', 'Preview playing for up to 8 seconds.') : translate('adventure.audio_preview_idle', 'Preview stopped.')}</div>
                        <div className="rounded-lg border border-slate-300 bg-white p-2">
                            <button type="button" disabled={diagnostic.status === 'running'} onClick={runLabDiagnostic} className="min-h-11 w-full rounded-lg border border-slate-400 px-3 py-2 text-xs font-black text-slate-800 hover:bg-slate-100 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-700">{diagnostic.status === 'running' ? translate('adventure.audio_check_running', 'Rendering audio check…') : translate('adventure.audio_run_check', 'Run waveform check')}</button>
                            {diagnostic.status === 'complete' && diagnostic.result && <div role="status" aria-live="polite" className={`mt-2 rounded-md px-2 py-1.5 text-[11px] font-bold ${diagnostic.result.passed ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-950'}`}>{diagnostic.result.supported === false ? diagnostic.result.reason : diagnostic.result.passed ? `Passed · peak ${diagnostic.result.peak} · RMS ${diagnostic.result.rms} · quiet tail ${diagnostic.result.tailPeak}` : `Needs review${diagnostic.result.reason ? ` · ${diagnostic.result.reason}` : ` · peak ${diagnostic.result.peak} · step ${diagnostic.result.maxStep} · tail ${diagnostic.result.tailPeak}`}`}</div>}
                        </div>
                    </div>
                </details>
                <button type="button" onClick={() => update(ADVENTURE_AUDIO_PREFS_DEFAULTS)} className="mt-3 min-h-11 w-full rounded-xl border border-indigo-300 px-3 py-2 text-xs font-bold text-indigo-800 transition-colors hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700">{translate('adventure.audio_reset', 'Reset sound settings')}</button>
            </div>
            </div>}
        </>
    );
});

const playDiceSound = () => {
  const engine = getAdventureAudioEngine();
  if (!engine.canPlayEvent('dice', 250)) return;
  const ctx = engine.resume();
  const destination = engine.getSfxBus();
  if (!ctx || !destination) return;
  const now = ctx.currentTime;
  const playClack = (time, velocity, index) => {
    const voiceToken = engine.claimVoice(index < 2 ? 'event' : 'detail');
    if (!voiceToken) return false;
    let noise = null;
    let filter = null;
    let gain = null;
    const cleanup = () => {
      engine.releaseVoice(voiceToken);
      try { noise?.disconnect(); } catch (_) {}
      try { filter?.disconnect(); } catch (_) {}
      try { gain?.disconnect(); } catch (_) {}
    };
    try {
      noise = ctx.createBufferSource();
      noise.buffer = createAdventureNoiseBuffer(ctx, 0.1, index);
      filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1200 + Math.random() * 1000;
      filter.Q.value = 1.5;
      gain = ctx.createGain();
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(velocity, time + 0.001);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.08);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(destination);
      noise.onended = cleanup;
      noise.start(time);
      noise.stop(time + 0.1);
      setTimeout(cleanup, Math.max(120, (time - now + 0.1) * 1000 + 120));
      return true;
    } catch (_) {
      cleanup();
      return false;
    }
  };
  let playedClack = false;
  playedClack = playClack(now, 0.8, 0) || playedClack;
  playedClack = playClack(now + 0.06, 0.7, 1) || playedClack;
  playedClack = playClack(now + 0.13, 0.6, 2) || playedClack;
  playedClack = playClack(now + 0.25 + Math.random() * 0.05, 0.5, 3) || playedClack;
  playedClack = playClack(now + 0.45 + Math.random() * 0.1, 0.3, 4) || playedClack;
  playedClack = playClack(now + 0.7 + Math.random() * 0.1, 0.15, 5) || playedClack;
  if (playedClack) engine.focusEvent('event', 850);
};
const getD20Rotation = (result, spins = 5) => {
    const index = result - 1;
    const faceTransforms = [
        [0, 52.62, 0], [72, 52.62, 0], [144, 52.62, 0], [216, 52.62, 0], [288, 52.62, 0],
        [0, 10.81, 180], [72, 10.81, 180], [144, 10.81, 180], [216, 10.81, 180], [288, 10.81, 180],
        [36, -10.81, 0], [108, -10.81, 0], [180, -10.81, 0], [252, -10.81, 0], [324, -10.81, 0],
        [36, -52.62, 180], [108, -52.62, 180], [180, -52.62, 180], [252, -52.62, 180], [324, -52.62, 180]
    ];
    if (index < 0 || index >= faceTransforms.length) return 'rotateX(0deg) rotateY(0deg) rotateZ(0deg)';
    const [y, x, zOffset] = faceTransforms[index];
    const xRot = -x + (spins * 360);
    const yRot = -y + (spins * 360);
    const zRot = (360 * 2) - zOffset;
    return `rotateZ(${zRot}deg) rotateX(${xRot}deg) rotateY(${yRot}deg)`;
};

// ═══ InventoryGrid (lines 10813-10867) ═══
const InventoryGrid = React.memo(({ inventory, onSelect }) => {
  const [dismissedTooltip, setDismissedTooltip] = useState(null);
  if (!inventory || inventory.length === 0) return null;
  return (
    <div className="flex items-center gap-2 bg-indigo-800/50 px-3 py-1.5 rounded-2xl border border-indigo-500">
      <Backpack size={18} className="text-yellow-300 shrink-0" aria-hidden="true" />
      <ul className="flex flex-wrap gap-2">
        {inventory.map((item, idx) => (
          <li key={item.id || idx} className="group relative hover:z-20 focus-within:z-20">
            <button
              type="button"
              data-help-key="inventory_item"
              onClick={() => onSelect(item)}
              onMouseEnter={() => setDismissedTooltip(null)}
              onFocus={() => setDismissedTooltip(null)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.stopPropagation();
                  setDismissedTooltip(idx);
                }
              }}
              className="w-11 h-11 rounded-lg bg-indigo-950 border-2 border-indigo-300 flex items-center justify-center overflow-hidden shadow-sm relative transition-transform hover:scale-105 motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-900"
              aria-label={item.name}
              aria-describedby={item.effectType && item.description ? 'inventory-item-description-' + idx : undefined}
              aria-busy={item.isLoading || undefined}
            >
              {item.image ? (
                <img loading="lazy"
                  src={item.image}
                  alt=""
                  className="w-full h-full object-contain pixelated"
                  style={STYLE_IMAGE_PIXELATED}
                  decoding="async"
                />
              ) : item.icon ? (
                <span className="text-lg" aria-hidden="true">{item.icon}</span>
              ) : item.isLoading ? (
                <RefreshCw size={16} className="text-indigo-200 animate-spin motion-reduce:animate-none" aria-hidden="true"/>
              ) : (
                <span className="text-sm font-bold text-indigo-200" aria-hidden="true">{item.name.charAt(0)}</span>
              )}
            </button>
            <div className={dismissedTooltip === idx ? 'hidden' : 'absolute top-full left-1/2 -translate-x-1/2 mt-2 hidden group-hover:flex group-focus-within:flex flex-col items-center z-50 w-36'} role="tooltip">
              <div className="w-2 h-2 bg-black/95 rotate-45 -mb-1 border-t border-l border-white/30" aria-hidden="true"></div>
              <div className="bg-black/95 text-white text-xs px-2 py-1.5 rounded shadow-lg font-bold border border-white/30 text-center">
                {item.name}
                {item.effectType && item.description && <div id={'inventory-item-description-' + idx} className="font-normal text-slate-100 text-xs mt-1 border-t border-white/20 pt-1">{item.description}</div>}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}, (prevProps, nextProps) => {
  if (prevProps.inventory === nextProps.inventory) return true;
  if (!prevProps.inventory || !nextProps.inventory) return false;
  if (prevProps.inventory.length !== nextProps.inventory.length) return false;
  for (let i = 0; i < prevProps.inventory.length; i++) {
      const prev = prevProps.inventory[i];
      const next = nextProps.inventory[i];
      if (!prev || !next) return false;
      if (prev.id !== next.id) return false;
      if (prev.image !== next.image) return false;
      if (prev.icon !== next.icon) return false;
      if (prev.name !== next.name) return false;
      if (prev.description !== next.description) return false;
      if (prev.effectType !== next.effectType) return false;
      if (prev.isLoading !== next.isLoading) return false;
  }
  return true;
});
// ═══ DiceOverlay (lines 10868-10922) ═══
const DiceOverlay = React.memo(({ result, onComplete }) => {
  const { t } = useContext(LanguageContext);
  const diceRef = useRef(null);
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  useFocusTrap(diceRef, true, onComplete);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);
  const [currentRotation, setCurrentRotation] = useState(() => {
      const rX = Math.floor(Math.random() * 360);
      const rY = Math.floor(Math.random() * 360);
      return `rotateX(${rX}deg) rotateY(${rY}deg) rotateZ(0deg)`;
  });
  useEffect(() => {
    playDiceSound();
    const spinCount = 4 + Math.floor(Math.random() * 2);
    const targetRotation = getD20Rotation(result, spinCount);
    const rollTimer = setTimeout(() => {
        setCurrentRotation(targetRotation);
    }, reduceMotion ? 0 : 50);
    const endTimer = setTimeout(() => onCompleteRef.current(), reduceMotion ? 1000 : 3500);
    return () => {
      clearTimeout(rollTimer);
      clearTimeout(endTimer);
    };
  }, [reduceMotion, result]);
  return (
    <div
      ref={diceRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="adventure-dice-result"
      className="fixed inset-0 bg-black/60 z-[200] backdrop-blur-sm flex items-center justify-center"
      onClick={onComplete}
    >
      <p id="adventure-dice-result" className="sr-only" role="status" aria-live="assertive">
        {t('adventure.dice_roll_result', { result })}
      </p>
      <button
        onClick={(e) => { e.stopPropagation(); onComplete(); }}
        className="absolute top-6 right-6 min-w-11 min-h-11 text-white hover:text-white bg-black/50 hover:bg-black/70 p-2 rounded-full transition-colors z-[202] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        title={t('common.skip_animation')}
        aria-label={t('common.skip_animation')}
        data-alloflow-close-on-escape="true"
      >
        <X size={32} aria-hidden="true" />
      </button>
      <div className="dice-container" aria-hidden="true" onClick={(e) => e.stopPropagation()}>
        <div
          className="dice"
          style={{ transform: currentRotation }}
        >
            {Array.from({ length: 20 }, (_, i) => {
                const num = i + 1;
                const isResult = num === result;
                return (
                    <div
                        key={i}
                        className={`face face-${num} ${isResult ? 'bg-yellow-400 text-indigo-900 border-yellow-500 shadow-[inset_0_0_40px_rgba(255,255,255,0.4)]' : ''}`}
                    >
                        {num}
                    </div>
                );
            })}
        </div>
      </div>
    </div>
  );
});

// ═══ AdventureShop (lines 10923-11011) ═══
const AdventureShop = React.memo(({ gold, globalXP, onClose, onPurchase }) => {
  const shopRef = useRef(null);
  useFocusTrap(shopRef, true, onClose);
  const { t } = useContext(LanguageContext);
  return (
    <div
        ref={shopRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('adventure.shop')}
        className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
        onClick={onClose}
    >
      <div className="bg-slate-900 border-4 border-indigo-500 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden relative flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="bg-indigo-600 p-3 sm:p-6 text-white flex justify-between items-center shrink-0 shadow-lg relative z-10">
            <div>
                <h2 className="text-2xl font-black uppercase tracking-widest flex items-center gap-3">
                    <div className="bg-yellow-400 text-indigo-900 p-2 rounded-lg shadow-inner border-2 border-indigo-800">
                        <ShoppingBag size={24} aria-hidden="true" />
                    </div>
                    {t('adventure.shop')}
                </h2>
                <p className="text-white text-sm font-bold mt-1 ml-1">{t('adventure.shop_desc')}</p>
            </div>
            <button onClick={onClose} className="min-w-11 min-h-11 bg-indigo-800 hover:bg-indigo-700 text-white p-2 rounded-full transition-colors border-2 border-indigo-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white" autoFocus aria-label={t('adventure.close_shop_aria')}>
                <X size={24} aria-hidden="true"/>
            </button>
        </div>
        <div className="bg-slate-800 p-2 sm:p-4 flex justify-between items-center border-b border-slate-700 shrink-0 gap-2 sm:gap-4 flex-wrap sm:flex-nowrap">
            <div className="flex gap-6">
                <div className="flex items-center gap-2 bg-slate-700 px-4 py-2 rounded-xl border border-slate-600">
                    <span className="text-2xl" aria-hidden="true">💰</span>
                    <div>
                        <div className="text-[11px] text-slate-200 font-bold uppercase tracking-wider">{t('adventure.gold')}</div>
                        <div className="text-xl font-black text-yellow-400 leading-none">{gold}</div>
                    </div>
                </div>
                <div className="flex items-center gap-2 bg-slate-700 px-4 py-2 rounded-xl border border-slate-600">
                    <span className="text-2xl" aria-hidden="true">🏆</span>
                    <div>
                        <div className="text-[11px] text-slate-200 font-bold uppercase tracking-wider">{t('adventure.global_xp')}</div>
                        <div className="text-xl font-black text-green-400 leading-none">{globalXP}</div>
                    </div>
                </div>
            </div>
            <div className="text-xs text-slate-300 italic text-right ml-auto">
                {t('adventure.xp_earn_tip')}
            </div>
        </div>
        <div className="p-3 sm:p-6 overflow-y-auto custom-scrollbar bg-slate-900 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 flex-1 min-h-0">
            {ADVENTURE_SHOP_ITEMS.map((item) => (
                <div key={item.id} className="bg-slate-800 border-2 border-slate-700 rounded-2xl p-3 sm:p-4 flex flex-col hover:border-indigo-500 transition-colors group relative overflow-hidden">
                    <div className="flex justify-between items-start mb-2 relative z-10">
                        <div className="text-2xl sm:text-4xl bg-slate-700 w-10 h-10 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center shadow-inner border border-slate-600" aria-hidden="true">
                            {item.icon}
                        </div>
                        <div className="text-right">
                            <div className="text-yellow-400 font-black text-lg">{item.cost} G</div>
                            <span className="inline-block max-w-36 truncate whitespace-nowrap text-[11px] font-bold uppercase text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-700" title={t(`adventure.effects.${item.effectType}_label`) || t(`adventure.effects.${item.effectType}`) || item.effectType}>
                                {t(`adventure.effects.${item.effectType}_label`) || t(`adventure.effects.${item.effectType}`) || item.effectType}
                            </span>
                        </div>
                    </div>
                    <div className="relative z-10 flex flex-col flex-1">
                        <h3 className="text-white font-bold text-lg mb-1 group-hover:text-indigo-300 transition-colors">
                            {t(`adventure.shop_items.${item.id}_name`) || item.name}
                        </h3>
                        <p className="text-slate-300 text-xs leading-relaxed mb-2 sm:mb-4 min-h-[2em] flex-1 overflow-y-auto custom-scrollbar">
                            {t(`adventure.shop_items.${item.id}_desc`) || item.description}
                        </p>
                        <button
                            onClick={() => onPurchase(item)}
                            disabled={gold < item.cost}
                            className={`w-full py-2 sm:py-2.5 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all active:scale-95 shrink-0 min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800 ${
                                gold >= item.cost
                                ? 'bg-yellow-500 hover:bg-yellow-400 text-indigo-900 shadow-lg shadow-yellow-500/30 border-2 border-yellow-300 ring-1 ring-yellow-400/50'
                                : 'bg-slate-700 text-slate-300 cursor-not-allowed'
                            }`}
                        >
                            {gold >= item.cost ? t('adventure.buy_now') : t('adventure.no_gold')}
                        </button>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
});

// Portrait uploads are re-encoded before storage or provider use. Drawing through
// canvas strips EXIF/embedded metadata, normalizes orientation, and bounds pixels.
const sanitizeAdventurePortraitFile = (file, { maxDimension = 1024, quality = 0.88 } = {}) => new Promise((resolve, reject) => {
    if (!file) {
        reject(new Error('No portrait file was selected.'));
        return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error('The portrait file could not be read.'));
    reader.onload = () => {
        const image = new Image();
        image.onerror = () => reject(new Error('The portrait image could not be decoded.'));
        image.onload = () => {
            try {
                const sourceWidth = Number(image.naturalWidth || image.width);
                const sourceHeight = Number(image.naturalHeight || image.height);
                if (!sourceWidth || !sourceHeight) throw new Error('The portrait has invalid dimensions.');
                const boundedDimension = Math.max(320, Math.min(2048, Number(maxDimension) || 1024));
                const scale = Math.min(1, boundedDimension / Math.max(sourceWidth, sourceHeight));
                const canvas = document.createElement('canvas'); canvas.setAttribute('aria-hidden', 'true');
                canvas.width = Math.max(1, Math.round(sourceWidth * scale));
                canvas.height = Math.max(1, Math.round(sourceHeight * scale));
                const ctx = canvas.getContext('2d');
                if (!ctx) throw new Error('Portrait processing is unavailable in this browser.');
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
                const sanitized = canvas.toDataURL('image/jpeg', Math.max(0.7, Math.min(0.95, Number(quality) || 0.88)));
                if (!sanitized?.startsWith('data:image/jpeg;base64,')) throw new Error('The sanitized portrait could not be encoded.');
                resolve(sanitized);
            } catch (error) {
                reject(error);
            }
        };
        image.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
});

// ═══ CastLobby (lines 16499-16660) ═══
const CastLobby = React.memo(({ characters, onUpdateCharacter, onConfirm, onGeneratePortrait, onRefinePortrait, onAddCharacter, onRemoveCharacter, onUploadPortrait, t }) => {
    const [editIdx, setEditIdx] = useState(null);
    const [editPrompt, setEditPrompt] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [newName, setNewName] = useState('');
    const [newRole, setNewRole] = useState('');
    const [newAppearance, setNewAppearance] = useState('');
    const [editingField, setEditingField] = useState(null); // { idx, field }
    const [editFieldValue, setEditFieldValue] = useState('');
    const [portraitUploadError, setPortraitUploadError] = useState(null);
    const [pendingPortraitUpload, setPendingPortraitUpload] = useState(null);
    const [sanitizingPortraitIdx, setSanitizingPortraitIdx] = useState(null);
    const isPortraitSanitizing = sanitizingPortraitIdx !== null;
    const hasTriggeredAutoGen = useRef(false);
    const portraitFileRefs = useRef({});
    const portraitUploadButtonRefs = useRef({});
    const portraitConsentButtonRef = useRef(null);
    const castRef = useRef(null);
    const castTitleRef = useRef(null);
    const charactersRef = useRef(characters || []);
    const portraitQueueRef = useRef([]);
    const activePortraitJobsRef = useRef(new Map());
    const portraitQueueMountedRef = useRef(true);
    const [portraitQueueState, setPortraitQueueState] = useState({ activeKeys: [], queuedKeys: [] });
    charactersRef.current = characters || [];
    const getPortraitJobKey = (character, index) => String(character?.id || (index + ':' + String(character?.name || '') + ':' + String(character?.role || '')));
    const syncPortraitQueueState = () => {
        if (!portraitQueueMountedRef.current) return;
        setPortraitQueueState({
            activeKeys: Array.from(activePortraitJobsRef.current.keys()),
            queuedKeys: portraitQueueRef.current.map(job => job.key),
        });
    };
    const pumpPortraitQueue = () => {
        if (!portraitQueueMountedRef.current) return;
        while (activePortraitJobsRef.current.size < 2 && portraitQueueRef.current.length > 0) {
            const job = portraitQueueRef.current.shift();
            if (!job || activePortraitJobsRef.current.has(job.key)) continue;
            const currentCharacters = charactersRef.current || [];
            const currentIndex = job.characterId
                ? currentCharacters.findIndex(character => character?.id === job.characterId)
                : currentCharacters.findIndex((character, index) => getPortraitJobKey(character, index) === job.key);
            const currentCharacter = currentCharacters[currentIndex];
            if (!currentCharacter || currentCharacter.isGenerating || (!job.force && (currentCharacter.portrait || currentCharacter.isUserUploaded))) continue;
            activePortraitJobsRef.current.set(job.key, true);
            let generationPromise;
            try {
                generationPromise = onGeneratePortrait(currentIndex);
            } catch (error) {
                generationPromise = Promise.reject(error);
            }
            Promise.resolve(generationPromise)
                .catch(() => {})
                .finally(() => {
                    activePortraitJobsRef.current.delete(job.key);
                    syncPortraitQueueState();
                    pumpPortraitQueue();
                });
        }
        syncPortraitQueueState();
    };
    const enqueuePortrait = (index, { force = false } = {}) => {
        const character = charactersRef.current?.[index];
        if (!character || character.isGenerating || (!force && (character.portrait || character.isUserUploaded))) return false;
        const key = getPortraitJobKey(character, index);
        if (activePortraitJobsRef.current.has(key) || portraitQueueRef.current.some(job => job.key === key)) return false;
        portraitQueueRef.current.push({ key, characterId: character.id || null, force });
        syncPortraitQueueState();
        Promise.resolve().then(pumpPortraitQueue);
        return true;
    };
    const isPortraitQueued = (index) => portraitQueueState.queuedKeys.includes(getPortraitJobKey(characters?.[index], index));
    const isCharacterPortraitBusy = (index) => {
        const key = getPortraitJobKey(characters?.[index], index);
        return !!characters?.[index]?.isGenerating || portraitQueueState.activeKeys.includes(key);
    };
    const cancelQueuedPortrait = (index) => {
        const key = getPortraitJobKey(charactersRef.current?.[index], index);
        const nextQueue = portraitQueueRef.current.filter(job => job.key !== key);
        if (nextQueue.length === portraitQueueRef.current.length) return false;
        portraitQueueRef.current = nextQueue;
        syncPortraitQueueState();
        return true;
    };
    const portraitReadyCount = (characters || []).filter(character => !!character?.portrait).length;
    const portraitTotal = (characters || []).length;
    const portraitProgressPercent = portraitTotal > 0 ? Math.round((portraitReadyCount / portraitTotal) * 100) : 0;
    const isPortraitQueueBusy = portraitQueueState.activeKeys.length > 0 || portraitQueueState.queuedKeys.length > 0 || (characters || []).some(character => character?.isGenerating);
    useFocusTrap(castRef, true);
    useEffect(() => {
        portraitQueueMountedRef.current = true;
        const frame = requestAnimationFrame(() => castTitleRef.current?.focus());
        return () => {
            portraitQueueMountedRef.current = false;
            portraitQueueRef.current = [];
            cancelAnimationFrame(frame);
            window.AlloModules?.AdventureHandlers?.cancelAdventureEstablishingShot?.();
        };
    }, []);
    useEffect(() => {
        if (!pendingPortraitUpload) return undefined;
        const frame = requestAnimationFrame(() => portraitConsentButtonRef.current?.focus());
        return () => cancelAnimationFrame(frame);
    }, [pendingPortraitUpload]);
    const clearPendingPortraitUpload = (returnFocus = false) => {
        const pending = pendingPortraitUpload;
        if (pending?.input) pending.input.value = '';
        setPendingPortraitUpload(null);
        if (returnFocus && pending) {
            requestAnimationFrame(() => portraitUploadButtonRefs.current[pending.charIdx]?.focus());
        }
    };
    const acceptPendingPortraitUpload = async () => {
        const pending = pendingPortraitUpload;
        if (!pending) return;
        setPendingPortraitUpload(null);
        setSanitizingPortraitIdx(pending.charIdx);
        try {
            const sanitizedPortrait = await sanitizeAdventurePortraitFile(pending.file);
            if (onUploadPortrait) onUploadPortrait(pending.charIdx, sanitizedPortrait);
        } catch (error) {
            setPortraitUploadError({ charIdx: pending.charIdx, message: 'This image could not be prepared securely. Please choose a different image.' });
        } finally {
            pending.input.value = '';
            setSanitizingPortraitIdx(null);
        }
    };
    const handlePortraitFileChange = (charIdx, e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const input = e.target;
        const rejectUpload = (message) => {
            setPortraitUploadError({ charIdx, message });
            input.value = '';
        };
        if (!file.type.startsWith('image/')) {
            rejectUpload('Only image files can be used for character portraits.');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            rejectUpload('Image too large (max 5MB). Please use a smaller image.');
            return;
        }
        cancelQueuedPortrait(charIdx);
        setPortraitUploadError(null);
        setPendingPortraitUpload({ charIdx, file, input });
    };
    useEffect(() => {
        if (!hasTriggeredAutoGen.current && characters?.length > 0) {
            hasTriggeredAutoGen.current = true;
            const prioritizedIndexes = characters
                .map((character, index) => ({ character, index }))
                .sort((left, right) => {
                    const leftIsLead = /protagonist|player/i.test(String(left.character?.role || ''));
                    const rightIsLead = /protagonist|player/i.test(String(right.character?.role || ''));
                    return Number(rightIsLead) - Number(leftIsLead);
                })
                .map(entry => entry.index);
            prioritizedIndexes.forEach(index => enqueuePortrait(index));
        }
    }, [characters?.length]);
    const startFieldEdit = (idx, field) => {
        setEditingField({ idx, field });
        setEditFieldValue(characters[idx]?.[field] || '');
    };
    const saveFieldEdit = () => {
        if (editingField && editFieldValue.trim()) {
            onUpdateCharacter(editingField.idx, { [editingField.field]: editFieldValue.trim() });
        }
        setEditingField(null);
        setEditFieldValue('');
    };
    return (
        <div ref={castRef} role="dialog" aria-modal="true" aria-labelledby="adventure-cast-lobby-title" className="fixed inset-0 z-[250] bg-gradient-to-br from-violet-950/95 to-indigo-950/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-500">
            <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-8">
                <div className="text-center mb-6">
                    <span className="text-4xl mb-2 block" aria-hidden="true">🎭</span>
                    <h2 ref={castTitleRef} id="adventure-cast-lobby-title" tabIndex={-1} className="text-2xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-600 focus:ring-offset-2">{t('adventure.cast_lobby') || 'Meet Your Cast'}</h2>
                    <p className="text-sm text-slate-600 mt-1">{t('adventure.cast_lobby_desc') || 'Select any name, role, or description to edit. Portraits generate automatically.'}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {characters.map((char, i) => (
                        <div key={char.id || i} className="bg-gradient-to-br from-slate-50 to-violet-50 rounded-2xl border border-violet-100 p-4 flex flex-col items-center text-center transition-all hover:shadow-lg hover:border-violet-300 relative group/card">
                            <button type="button" disabled={isPortraitSanitizing || isPortraitQueueBusy} onClick={() => { setPortraitUploadError(null); clearPendingPortraitUpload(); onRemoveCharacter(i); }} className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-100 text-red-700 hover:bg-red-200 hover:text-red-700 text-xs font-bold opacity-0 group-hover/card:opacity-100 group-focus-within/card:opacity-100 focus:opacity-100 transition-opacity flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2" title={t('adventure.remove_character')} aria-label={(t('adventure.remove_character') || 'Remove character') + ': ' + (char.name || (i + 1))}>✕</button>
                            <div className="w-24 h-24 rounded-full bg-violet-100 border-2 border-violet-200 flex items-center justify-center overflow-hidden mb-3 shadow-inner" aria-busy={!!char.isGenerating} aria-label={char.isGenerating ? (t('adventure.generating_portrait_aria') || ('Generating portrait for ' + (char.name || 'character'))) : undefined}>
                                {char.isGenerating ? (
                                    <div className="animate-spin motion-reduce:animate-none w-6 h-6 border-2 border-violet-400 border-t-transparent rounded-full" aria-hidden="true"></div>
                                ) : char.portrait ? (
                                    <img src={char.portrait} alt={char.name} className="w-full h-full object-cover rounded-full"/>
                                ) : (
                                    <span className="text-3xl" aria-hidden="true">🎭</span>
                                )}
                            </div>
                            {editingField?.idx === i && editingField?.field === 'name' ? (
                                <input type="text" aria-label={t('adventure.edit_name') || 'Edit character name'} value={editFieldValue} onChange={(e) => setEditFieldValue(e.target.value)} onBlur={saveFieldEdit} onKeyDown={(e) => { if (e.key === 'Enter') saveFieldEdit(); if (e.key === 'Escape') { setEditingField(null); setEditFieldValue(''); }}} autoFocus className="font-bold text-slate-800 text-sm text-center w-full px-2 py-0.5 border border-violet-300 rounded-lg focus:ring-2 focus:ring-violet-600 focus:outline-none bg-white"/>
                            ) : (
                                <h3><button type="button" onClick={() => startFieldEdit(i, 'name')} className="min-w-11 min-h-11 px-2 font-bold text-slate-800 text-sm cursor-pointer hover:text-violet-700 hover:underline decoration-dashed underline-offset-2 transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-700 focus-visible:ring-offset-2" title={t('adventure.edit_name')} aria-label={(t('adventure.edit_name') || 'Edit character name') + ': ' + char.name}>{char.name}</button></h3>
                            )}
                            {editingField?.idx === i && editingField?.field === 'role' ? (
                                <input type="text" aria-label={t('adventure.edit_role') || 'Edit character role'} value={editFieldValue} onChange={(e) => setEditFieldValue(e.target.value)} onBlur={saveFieldEdit} onKeyDown={(e) => { if (e.key === 'Enter') saveFieldEdit(); if (e.key === 'Escape') { setEditingField(null); setEditFieldValue(''); }}} autoFocus className="text-xs text-violet-600 font-medium text-center w-full px-2 py-0.5 border border-violet-300 rounded-lg focus:ring-2 focus:ring-violet-600 focus:outline-none bg-white mt-0.5"/>
                            ) : (
                                <button type="button" onClick={() => startFieldEdit(i, 'role')} className="min-w-11 min-h-11 px-2 text-xs text-violet-700 font-medium cursor-pointer hover:text-violet-800 hover:underline decoration-dashed underline-offset-2 transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-700 focus-visible:ring-offset-2" title={t('adventure.edit_role')} aria-label={(t('adventure.edit_role') || 'Edit character role') + ': ' + char.role}>{char.role}</button>
                            )}
                            {editingField?.idx === i && editingField?.field === 'appearance' ? (
                                <textarea aria-label={t('adventure.edit_appearance') || 'Edit character appearance'} value={editFieldValue} onChange={(e) => setEditFieldValue(e.target.value)} onBlur={saveFieldEdit} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveFieldEdit(); } if (e.key === 'Escape') { setEditingField(null); setEditFieldValue(''); }}} autoFocus rows={3} className="text-[11px] text-slate-600 mt-1 leading-relaxed w-full px-2 py-1 border border-violet-300 rounded-lg focus:ring-2 focus:ring-violet-600 focus:outline-none bg-white resize-none"/>
                            ) : (
                                <button type="button" onClick={() => startFieldEdit(i, 'appearance')} className="min-w-11 min-h-11 px-2 text-[11px] text-slate-700 mt-1 leading-relaxed cursor-pointer hover:text-slate-800 hover:underline decoration-dashed underline-offset-2 transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-700 focus-visible:ring-offset-2" title={t('adventure.edit_appearance')} aria-label={(t('adventure.edit_appearance') || 'Edit character appearance') + ': ' + char.appearance}>{char.appearance}</button>
                            )}
                            {char.portrait && !char.isGenerating && (
                                <div className="mt-2 flex flex-wrap gap-1.5 justify-center">
                                    {char.isUserUploaded && (
                                        <span className="text-[11px] px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-600 font-medium">📷 User Photo</span>
                                    )}
                                    <button type="button" onClick={() => enqueuePortrait(i, { force: true })} className="min-h-11 px-3 py-2 bg-violet-700 text-white rounded-full hover:bg-violet-800 transition-all font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-700 focus-visible:ring-offset-2" title={t('adventure.regen_portrait')}>
                                        🔄 {char.isUserUploaded ? 'AI Generate' : 'Regenerate'}
                                    </button>
                                    <input type="file" aria-label={t('adventure.upload_portrait') || 'Upload portrait image'} aria-describedby={portraitUploadError?.charIdx === i ? `adventure-portrait-upload-error-${i}` : undefined} accept="image/*" ref={el => portraitFileRefs.current[i] = el} onChange={(e) => handlePortraitFileChange(i, e)} className="hidden" />
                                    <button type="button" disabled={isPortraitSanitizing || isCharacterPortraitBusy(i)} ref={el => portraitUploadButtonRefs.current[i] = el} aria-describedby={portraitUploadError?.charIdx === i ? `adventure-portrait-upload-error-${i}` : undefined} onClick={() => { setPortraitUploadError(null); clearPendingPortraitUpload(); portraitFileRefs.current[i]?.click(); }} className="min-h-11 px-3 py-2 bg-sky-50 text-sky-700 rounded-full hover:bg-sky-100 transition-all font-medium border border-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-700 focus-visible:ring-offset-2" title={t('adventure.upload_portrait') || 'Upload your own portrait image'}>
                                        📷 Upload
                                    </button>
                                    {editIdx === i ? (
                                        <div className="w-full flex gap-1 mt-1">
                                            <input type="text" aria-label={t('adventure.portrait_refine_aria') || 'Describe how to refine portrait'} value={editPrompt} onChange={(e) => setEditPrompt(e.target.value)} placeholder={t('adventure.portrait_refine_placeholder') || 'e.g. Add green glasses'} className="flex-1 text-xs px-2 py-1 border border-violet-600 rounded-lg focus:ring-2 focus:ring-violet-400 focus:outline-none" onKeyDown={(e) => { if (e.key === 'Enter' && editPrompt.trim()) { onRefinePortrait(i, editPrompt.trim()); setEditIdx(null); setEditPrompt(''); }}}/>
                                            <button type="button" aria-label={t('common.confirm') || 'Apply portrait refinement'} onClick={() => { if (editPrompt.trim()) { onRefinePortrait(i, editPrompt.trim()); setEditIdx(null); setEditPrompt(''); }}} className="min-w-11 min-h-11 px-2 py-2 bg-violet-700 text-white rounded-lg font-bold hover:bg-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-700 focus-visible:ring-offset-2">✓</button>
                                            <button type="button" aria-label={t('common.cancel') || 'Cancel portrait refinement'} onClick={() => { setEditIdx(null); setEditPrompt(''); }} className="min-w-11 min-h-11 px-2 py-2 bg-slate-200 text-slate-700 rounded-lg font-bold hover:bg-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-700 focus-visible:ring-offset-2">✗</button>
                                        </div>
                                    ) : (
                                        <>
                                            <button type="button" aria-label={(t('adventure.edit_nanobanana') || 'Refine portrait') + ': ' + char.name} onClick={() => setEditIdx(i)} className="min-h-11 px-3 py-2 bg-slate-100 text-slate-700 rounded-full hover:bg-slate-200 transition-all font-medium border border-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-700 focus-visible:ring-offset-2" title={t('adventure.edit_nanobanana')}>
                                                ✏️ Refine
                                            </button>
                                            <button type="button" onClick={() => {
                                                const link = document.createElement('a');
                                                link.href = char.portrait;
                                                link.download = `${(char.name || 'character').replace(/\s+/g, '_')}_portrait.png`;
                                                document.body.appendChild(link);
                                                link.click();
                                                document.body.removeChild(link);
                                            }} className="min-h-11 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-full hover:bg-emerald-100 transition-all font-medium border border-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2">
                                                💾 Save
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                            {!char.portrait && !char.isGenerating && !isPortraitQueued(i) && (
                                <div className="mt-2 flex flex-wrap gap-1.5 justify-center">
                                    <button type="button" onClick={() => enqueuePortrait(i, { force: true })} className="min-h-11 px-3 py-2 bg-violet-700 text-white rounded-full hover:bg-violet-800 transition-all font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-700 focus-visible:ring-offset-2">
                                        🎨 Generate Portrait
                                    </button>
                                    <input type="file" aria-label={t('adventure.upload_portrait') || 'Upload portrait image'} aria-describedby={portraitUploadError?.charIdx === i ? `adventure-portrait-upload-error-${i}` : undefined} accept="image/*" ref={el => portraitFileRefs.current['new-' + i] = el} onChange={(e) => handlePortraitFileChange(i, e)} className="hidden" />
                                    <button type="button" disabled={isPortraitSanitizing || isCharacterPortraitBusy(i)} ref={el => portraitUploadButtonRefs.current[i] = el} aria-describedby={portraitUploadError?.charIdx === i ? `adventure-portrait-upload-error-${i}` : undefined} onClick={() => { setPortraitUploadError(null); clearPendingPortraitUpload(); portraitFileRefs.current['new-' + i]?.click(); }} className="min-h-11 px-3 py-2 bg-sky-50 text-sky-700 rounded-full hover:bg-sky-100 transition-all font-medium border border-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-700 focus-visible:ring-offset-2" title={t('adventure.upload_portrait') || 'Upload your own portrait image'}>
                                        📷 Upload Photo
                                    </button>
                                </div>
                            )}
                            {portraitUploadError?.charIdx === i && (
                                <p id={`adventure-portrait-upload-error-${i}`} role="alert" aria-atomic="true" className="w-full mt-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">
                                    {portraitUploadError.message}
                                </p>
                            )}
                            {pendingPortraitUpload?.charIdx === i && (
                                <div role="group" aria-labelledby={`adventure-portrait-consent-${i}`} className="w-full mt-2 rounded-xl border border-amber-400 bg-amber-50 px-3 py-3 text-left">
                                    <p id={`adventure-portrait-consent-${i}`} className="text-xs font-semibold leading-relaxed text-amber-950">
                                        Uploaded images are used by AI to keep this character consistent — the image is sent to the AI provider configured for this app with each scene. Only upload images you have permission to use this way (for photos of students, check your school's AI/data agreement).
                                    </p>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        <button ref={portraitConsentButtonRef} type="button" onClick={acceptPendingPortraitUpload} className="min-h-11 px-4 py-2 rounded-lg bg-amber-800 text-white font-bold hover:bg-amber-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 focus-visible:ring-offset-2">
                                            Use image
                                        </button>
                                        <button type="button" onClick={() => clearPendingPortraitUpload(true)} className="min-h-11 px-4 py-2 rounded-lg border border-slate-500 bg-white text-slate-800 font-bold hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-700 focus-visible:ring-offset-2">
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}
                            {sanitizingPortraitIdx === i && (
                                <p id="adventure-portrait-sanitizing-status" className="mt-2 text-[11px] text-sky-800 font-semibold" role="status" aria-live="polite">Preparing image securely…</p>
                            )}
                            {isPortraitQueued(i) && !char.isGenerating && (
                                <p className="mt-2 text-[11px] text-violet-700 font-medium" role="status" aria-live="polite">Waiting its turn…</p>
                            )}
                            {char.isGenerating && (
                                <p className="mt-2 text-[11px] text-violet-700 animate-pulse motion-reduce:animate-none font-medium" role="status" aria-live="polite">Creating portrait…</p>
                            )}
                        </div>
                    ))}
                    {isAdding ? (
                        <div className="bg-gradient-to-br from-violet-50 to-indigo-50 rounded-2xl border-2 border-dashed border-violet-300 p-4 flex flex-col items-center text-center">
                            <span className="text-2xl mb-2" aria-hidden="true">✨</span>
                            <input type="text" aria-label={t('adventure.char_name_placeholder') || 'Character name'} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={t('adventure.char_name_placeholder')} className="w-full text-sm px-3 py-1.5 mb-2 border border-violet-600 rounded-lg focus:ring-2 focus:ring-violet-600 focus:outline-none text-center font-bold"/>
                            <input type="text" aria-label={t('adventure.role_placeholder') || 'Character role'} value={newRole} onChange={(e) => setNewRole(e.target.value)} placeholder={t('adventure.role_placeholder')} className="w-full text-xs px-3 py-1.5 mb-2 border border-violet-600 rounded-lg focus:ring-2 focus:ring-violet-600 focus:outline-none text-center"/>
                            <input type="text" aria-label={t('adventure.appearance_placeholder') || 'Character appearance'} value={newAppearance} onChange={(e) => setNewAppearance(e.target.value)} placeholder={t('adventure.appearance_placeholder') || 'Appearance (e.g. tall, silver hair, blue robe)'} className="w-full text-xs px-3 py-1.5 mb-2 border border-violet-600 rounded-lg focus:ring-2 focus:ring-violet-400 focus:outline-none text-center" onKeyDown={(e) => { if (e.key === 'Enter' && newName.trim()) { onAddCharacter({ name: newName.trim(), role: newRole.trim() || 'Character', appearance: newAppearance.trim() || newName.trim(), portrait: null, isGenerating: false }); setNewName(''); setNewRole(''); setNewAppearance(''); setIsAdding(false); }}}/>
                            <div className="flex gap-1.5 mt-1">
                                <button type="button" onClick={() => { if (newName.trim()) { onAddCharacter({ name: newName.trim(), role: newRole.trim() || 'Character', appearance: newAppearance.trim() || newName.trim(), portrait: null, isGenerating: false }); setNewName(''); setNewRole(''); setNewAppearance(''); setIsAdding(false); }}} className="min-h-11 px-3 py-2 bg-violet-700 text-white rounded-lg font-bold hover:bg-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-700 focus-visible:ring-offset-2">Add</button>
                                <button type="button" onClick={() => { setIsAdding(false); setNewName(''); setNewRole(''); setNewAppearance(''); }} className="min-h-11 px-3 py-2 bg-slate-200 text-slate-700 rounded-lg font-bold hover:bg-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-700 focus-visible:ring-offset-2">Cancel</button>
                            </div>
                        </div>
                    ) : (
                        <button type="button" onClick={() => setIsAdding(true)} className="bg-gradient-to-br from-slate-50 to-violet-50 rounded-2xl border-2 border-dashed border-violet-600 p-4 flex flex-col items-center justify-center text-center transition-all hover:shadow-lg hover:border-violet-700 hover:from-violet-50 hover:to-indigo-50 min-h-[180px] cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-700 focus-visible:ring-offset-2">
                            <span className="text-4xl mb-2 group-hover:scale-110 transition-transform" aria-hidden="true">➕</span>
                            <span className="font-bold text-sm text-violet-600">{t('adventure.add_character')}</span>
                            <span className="text-[11px] text-slate-600 mt-0.5">{t('adventure.create_cast_member')}</span>
                        </button>
                    )}
                </div>
                <div className="mb-4 max-w-xl mx-auto" role="status" aria-live="polite" aria-atomic="true">
                    <div className="flex items-center justify-between gap-3 text-xs font-bold text-slate-700 mb-1.5">
                        <span>Portraits ready</span>
                        <span>{portraitReadyCount} of {portraitTotal}</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-200 border border-slate-300" role="progressbar" aria-label="Cast portraits ready" aria-valuemin={0} aria-valuemax={portraitTotal} aria-valuenow={portraitReadyCount}>
                        <div className="h-full bg-gradient-to-r from-violet-600 to-indigo-600 transition-all duration-500 motion-reduce:transition-none" style={{ width: portraitProgressPercent + '%' }}></div>
                    </div>
                    <p className="mt-1.5 text-[11px] text-slate-600 text-center">
                        {portraitReadyCount === portraitTotal ? 'Your cast is ready.' : isPortraitQueueBusy ? 'Creating up to two portraits at a time. You can begin whenever you are ready.' : 'You can begin now or generate the remaining portraits for stronger visual consistency.'}
                    </p>
                </div>
                <div className="flex flex-wrap justify-center gap-3">
                    <button type="button" disabled={isPortraitQueueBusy || portraitReadyCount === portraitTotal} onClick={() => { characters.forEach((character, i) => { if (!character.portrait && !character.isGenerating && !character.isUserUploaded) enqueuePortrait(i); }); }} className="min-h-11 px-5 py-2.5 bg-violet-100 text-violet-700 font-bold rounded-xl hover:bg-violet-200 transition-all text-sm border border-violet-600 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-700 focus-visible:ring-offset-2">
                        <span aria-hidden="true">🎨</span> {isPortraitQueueBusy ? 'Creating portraits…' : portraitReadyCount === portraitTotal ? 'Portraits Ready' : (t('adventure.generate_all') || 'Generate Missing Portraits')}
                    </button>
                    <button type="button" disabled={isPortraitSanitizing} aria-describedby={isPortraitSanitizing ? 'adventure-portrait-sanitizing-status' : undefined} onClick={() => { window.AlloModules?.AdventureHandlers?.cancelAdventureEstablishingShot?.(); onConfirm(); }} className="min-h-11 px-6 py-2.5 bg-violet-700 text-white font-bold rounded-xl hover:bg-violet-800 shadow-lg hover:shadow-xl transition-all text-sm hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-700 focus-visible:ring-offset-2">
                        <span aria-hidden="true">⚔️</span> {t('adventure.begin_adventure') || 'Begin Adventure'}
                    </button>
                </div>
            </div>
        </div>
    );
});
