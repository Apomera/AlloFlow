// Adventure UI Components — extracted from AlloFlowANTI.txt

// Fallback: define ADVENTURE_SHOP_ITEMS if not available from main app
if (typeof ADVENTURE_SHOP_ITEMS === 'undefined') {
  var ADVENTURE_SHOP_ITEMS = window.ADVENTURE_SHOP_ITEMS || [
    { id: 'ration', name: 'Emergency Ration', cost: 50, description: 'Restores 20 Energy.', effectType: 'energy', effectValue: 20, icon: '🍎' },
    { id: 'feast', name: 'Field Feast', cost: 120, description: 'Fully restores energy.', effectType: 'energy', effectValue: 100, icon: '🍱' },
    { id: 'hint', name: 'Oracle Whisper', cost: 75, description: 'Reveals a hint.', effectType: 'hint', effectValue: 1, icon: '🔮' },
    { id: 'charm', name: 'Luck Charm', cost: 100, description: '+5 to next roll.', effectType: 'modifier', effectValue: 5, icon: '🍀' },
    { id: 'journal', name: "Scholar's Journal", cost: 100, description: 'Double XP next turn.', effectType: 'xp_boost', effectValue: 2, icon: '📔' },
    { id: 'detector', name: 'Metal Detector', cost: 50, description: 'More gold for 3 scenes.', effectType: 'gold_boost', effectValue: 3, icon: '💰' },
  ];
}

// ═══ MissionReportCard (lines 8564-8670) ═══
const MissionReportCard = React.memo(({ adventureState, globalLevel, onClose, onExport, onContinue, onNewGame, isProcessing }) => {
  const { t } = useContext(LanguageContext);
  const { stats, climax, xp, level } = adventureState;
  const safeStats = stats || { successes: 0, failures: 0, decisions: 0, conceptsFound: [] };
  const totalDecisions = Math.max(1, safeStats.decisions);
  const efficiency = Math.round((safeStats.successes / totalDecisions) * 100);
  const proficiency = climax?.masteryScore || 0;
  let ratingLabel = t('adventure.mission_report.rating_novice');
  if (proficiency >= 90) ratingLabel = t('adventure.mission_report.rating_mastery');
  else if (proficiency >= 70) ratingLabel = t('adventure.mission_report.rating_proficient');
  else if (proficiency >= 50) ratingLabel = t('adventure.mission_report.rating_developing');
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-700 p-4">
      <div className="bg-slate-900 w-full max-w-md rounded-3xl border-4 border-yellow-500 shadow-[0_0_50px_rgba(234,179,8,0.3)] overflow-hidden relative transform scale-100 animate-in zoom-in-95 duration-500 flex flex-col max-h-[90vh]">
        <div className="bg-yellow-500 p-4 text-center shrink-0">
            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-widest drop-shadow-sm flex items-center justify-center gap-2">
                <Trophy size={32} /> {t('adventure.mission_report.title')}
            </h2>
            <div className="flex items-center justify-center gap-2 text-slate-900 font-bold text-sm opacity-80 mt-1">
                <span>{t('adventure.mission_report.status_success')}</span>
                <span>•</span>
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
                    <span className="text-cyan-400 uppercase">{t('adventure.mission_report.proficiency_rating')}</span>
                    <span className="text-white">{proficiency}/100 ({ratingLabel})</span>
                </div>
                <div className="h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-700 relative">
                    <div
                        className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-1000 ease-out"
                        style={{ width: `${proficiency}%` }}
                    ></div>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4 relative z-20">
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex flex-col items-center justify-center">
                    <div className="flex items-center gap-2 mb-2 text-yellow-400">
                        <Zap size={16} /> <span className="text-[11px] font-bold uppercase">{t('adventure.mission_report.efficiency')}</span>
                    </div>
                    <div className="text-3xl font-black">{efficiency}%</div>
                </div>
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex flex-col items-center justify-center">
                    <div className="flex items-center gap-2 mb-2 text-green-400">
                        <Key size={16} /> <span className="text-[11px] font-bold uppercase">{t('adventure.mission_report.concepts')}</span>
                    </div>
                    <div className="text-3xl font-black">{safeStats.conceptsFound.length}</div>
                </div>
            </div>
            {safeStats.conceptsFound.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-700/50 relative z-20">
                    <div className="text-[11px] text-slate-600 font-bold uppercase mb-2">{t('adventure.mission_report.concepts_secured')}</div>
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
                className="w-full py-3 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors shadow-lg flex items-center justify-center gap-2"
             >
                 {isProcessing ? <RefreshCw size={18} className="animate-spin"/> : <BookOpen size={18}/>}
                 {isProcessing ? t('adventure.storybook_writing') : t('adventure.storybook')}
             </button>
             <div className="grid grid-cols-2 gap-3">
                 <button
                    onClick={() => { onClose(); if(onContinue) onContinue(); }}
                    className="w-full py-3 rounded-xl font-bold bg-green-600 text-white hover:bg-green-500 transition-colors shadow-lg flex items-center justify-center gap-2"
                 >
                     <MapIcon size={18} /> {t('adventure.start_sequel') || "Continue"}
                 </button>
                 <button aria-label={t('common.on_close')}
                    onClick={() => { onClose(); if(onNewGame) onNewGame(); }}
                    className="w-full py-3 rounded-xl font-bold bg-slate-700 text-slate-600 hover:bg-slate-600 hover:text-white transition-colors border border-slate-600 flex items-center justify-center gap-2"
                 >
                     <RefreshCw size={18} /> {t('adventure.new_game') || "New Game"}
                 </button>
             </div>
             <button
                 aria-label={t('common.close')}
                onClick={onClose}
                className="w-full py-2 text-xs font-bold text-slate-600 hover:text-slate-600 transition-colors"
             >
                 {t('adventure.mission_report.confirm_exit')}
             </button>
        </div>
      </div>
    </div>
  );
});

// ═══ playAdventureEventSound (lines 9264-9336) ═══
const playAdventureEventSound = (type) => {
  const ctx = getGlobalAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();
  const now = ctx.currentTime;
  const playTone = (wave, freq, startTime, duration, vol = 0.1) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(vol, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration);
  };
  switch (type) {
    case 'transition':
      const tNoise = ctx.createBufferSource();
      const tBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const tData = tBuffer.getChannelData(0);
      for(let i=0; i<tBuffer.length; i++) tData[i] = Math.random() * 2 - 1;
      tNoise.buffer = tBuffer;
      const tFilter = ctx.createBiquadFilter();
      tFilter.type = 'lowpass';
      tFilter.frequency.setValueAtTime(200, now);
      tFilter.frequency.linearRampToValueAtTime(1200, now + 0.2);
      const tGain = ctx.createGain();
      tGain.gain.setValueAtTime(0.05, now);
      tGain.gain.linearRampToValueAtTime(0, now + 0.4);
      tNoise.connect(tFilter);
      tFilter.connect(tGain);
      tGain.connect(ctx.destination);
      tNoise.start(now);
      break;
    case 'critical_success':
      playTone('square', 523.25, now, 0.4);
      playTone('square', 659.25, now + 0.1, 0.4);
      playTone('square', 783.99, now + 0.2, 0.4);
      playTone('square', 1046.50, now + 0.3, 0.8, 0.15);
      break;
    case 'success':
      playTone('sine', 880, now, 0.3);
      playTone('sine', 1760, now + 0.1, 0.4);
      break;
    case 'failure':
      playTone('sawtooth', 100, now, 0.4, 0.15);
      playTone('sawtooth', 92, now, 0.4, 0.15);
      break;
    case 'damage':
      const dOsc = ctx.createOscillator();
      const dGain = ctx.createGain();
      dOsc.type = 'sawtooth';
      dOsc.frequency.setValueAtTime(150, now);
      dOsc.frequency.exponentialRampToValueAtTime(40, now + 0.2);
      dGain.gain.setValueAtTime(0.2, now);
      dGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      dOsc.connect(dGain);
      dGain.connect(ctx.destination);
      dOsc.start(now);
      dOsc.stop(now + 0.2);
      break;
    case 'item_get':
      playTone('sine', 1500, now, 0.1, 0.05);
      playTone('sine', 2000, now + 0.1, 0.1, 0.05);
      playTone('sine', 2500, now + 0.2, 0.3, 0.05);
      break;
    case 'decision_select':
      playTone('triangle', 800, now, 0.05, 0.05);
      break;
  }
};

// ═══ playGenerativeSoundscape (lines 9337-9498) ═══
const playGenerativeSoundscape = (ctx, dest, params) => {
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
const ClimaxProgressBar = React.memo(({ climaxState }) => {
  const { t } = useContext(LanguageContext);
  if (!climaxState || !climaxState.isActive) return null;
  const { masteryScore, archetype } = climaxState;
  let typeKey = (archetype || 'default').toLowerCase();
  if (typeKey === 'auto') typeKey = 'default';
  const label = t(`adventure.climax_archetypes.${typeKey}.label`) || t('adventure.climax_archetypes.default.label');
  const leftLabel = t(`adventure.climax_archetypes.${typeKey}.left`) || t('adventure.climax_archetypes.default.left');
  const rightLabel = t(`adventure.climax_archetypes.${typeKey}.right`) || t('adventure.climax_archetypes.default.right');
  let icon = "⚔️";
  switch (archetype) {
    case 'Antagonist':
      icon = "⚔️";
      break;
    case 'Catastrophe':
      icon = "⚠️";
      break;
    case 'Masterpiece':
      icon = "🎨";
      break;
    case 'Discovery':
      icon = "🗺️";
      break;
  }
  let barColor = "bg-yellow-500";
  let textColor = "text-yellow-400";
  let borderColor = "border-yellow-600";
  if (masteryScore >= 80) {
      barColor = "bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.6)]";
      textColor = "text-green-400";
      borderColor = "border-green-600";
  } else if (masteryScore <= 30) {
      barColor = "bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)]";
      textColor = "text-red-400";
      borderColor = "border-red-600";
  }
  return (
    <div className={`w-full bg-slate-900/95 backdrop-blur-md border-y-4 ${borderColor} p-4 shadow-2xl animate-in slide-in-from-top-4 relative z-40 mb-2 transition-colors duration-500`}>
      <div className="flex justify-between items-end mb-2 px-1">
        <div className="flex items-center gap-2">
            <span className="text-xl animate-pulse">{icon}</span>
            <span className="text-xs font-black text-indigo-200 uppercase tracking-widest">{label}</span>
        </div>
        <span className={`text-2xl font-black ${textColor} drop-shadow-sm font-mono transition-colors duration-500`}>
          {Math.round(masteryScore)}%
        </span>
      </div>
      <div className="relative h-6 w-full bg-slate-800 rounded-full border-2 border-slate-600 overflow-hidden shadow-inner">
        <div
          className={`h-full ${barColor} transition-all duration-1000 ease-out relative`}
          style={{ width: `${Math.max(5, Math.min(100, masteryScore))}%` }}
        >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_infinite]"></div>
        </div>
        <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/30 z-10 border-l border-black/20"></div>
        <div className="absolute top-0 bottom-0 left-[25%] w-px bg-white/10 z-0"></div>
        <div className="absolute top-0 bottom-0 left-[75%] w-px bg-white/10 z-0"></div>
      </div>
      <div className="flex justify-between text-[11px] font-bold text-slate-600 uppercase mt-1.5 px-1">
        <span className="text-red-400">{leftLabel} (0%)</span>
        <span className="text-green-400">{rightLabel} (100%)</span>
      </div>
    </div>
  );
});

// ═══ AdventureAmbience (lines 9565-9642) ═══
const AdventureAmbience = React.memo(({ sceneText, soundParams, active, volume = 0.3 }) => {
    const ctxRef = useRef(null);
    const masterGainRef = useRef(null);
    const activeNodesRef = useRef([]);
    const intervalsRef = useRef([]);
    const cleanup = () => {
        const nodesToStop = [...activeNodesRef.current];
        const intervalsToClear = [...intervalsRef.current];
        const oldGain = masterGainRef.current;
        activeNodesRef.current = [];
        intervalsRef.current = [];
        masterGainRef.current = null;
        intervalsToClear.forEach(clearInterval);
        if (oldGain && ctxRef.current) {
            try {
                oldGain.gain.cancelScheduledValues(ctxRef.current.currentTime);
                oldGain.gain.setValueAtTime(oldGain.gain.value, ctxRef.current.currentTime);
                oldGain.gain.linearRampToValueAtTime(0, ctxRef.current.currentTime + 1.0);
            } catch(e) { warnLog('Caught error:', e?.message || e); }
        }
        setTimeout(() => {
            nodesToStop.forEach(node => {
                try { node.stop(); } catch(e) { warnLog('Caught error:', e?.message || e); }
                try { node.disconnect(); } catch(e) { warnLog('Caught error:', e?.message || e); }
            });
            if (oldGain) {
                try { oldGain.disconnect(); } catch(e) { warnLog('Caught error:', e?.message || e); }
            }
        }, 1100);
    };
    useEffect(() => {
        if (!active || !sceneText) {
            cleanup();
            return;
        }
        const ctx = getGlobalAudioContext();
        if (!ctx) return;
        ctxRef.current = ctx;
        if (ctx.state === 'suspended') ctx.resume();
        cleanup();
        playAdventureEventSound('transition');
        const masterGain = ctx.createGain();
        const now = ctx.currentTime;
        const fadeInTime = 2;
        const sustainTime = 6;
        const fadeOutTime = 4;
        const totalDuration = fadeInTime + sustainTime + fadeOutTime;
        masterGain.gain.setValueAtTime(0, now);
        masterGain.gain.linearRampToValueAtTime(volume, now + fadeInTime);
        masterGain.gain.setValueAtTime(volume, now + fadeInTime + sustainTime);
        masterGain.gain.linearRampToValueAtTime(0, now + totalDuration);
        masterGain.connect(ctx.destination);
        masterGainRef.current = masterGain;
        const autoKillTimer = setTimeout(() => {
            cleanup();
        }, totalDuration * 1000 + 200);
        intervalsRef.current.push(autoKillTimer);
        try {
            if (soundParams && typeof soundParams === 'object') {
                 debugLog("DJ Gemini playing:", soundParams);
                 const nodes = playGenerativeSoundscape(ctx, masterGain, soundParams);
                 activeNodesRef.current.push(...nodes);
            }
        } catch (err) {
            warnLog("Audio generation failed, attempting fallback.", err);
            const nodes = playGenerativeSoundscape(ctx, masterGain, { atmosphere: 'Calm', element: 'Wind' });
            activeNodesRef.current.push(...nodes);
        }
        return () => cleanup();
    }, [sceneText, soundParams, active]);
    useEffect(() => {
        if (masterGainRef.current && ctxRef.current) {
             try {
             } catch(e) { warnLog('Caught error:', e?.message || e); }
        }
    }, [volume]);
    return null;
});

// ═══ playDiceSound + getD20Rotation (lines 10760-10811) ═══
const playDiceSound = () => {
  const ctx = getGlobalAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
      ctx.resume();
  }
  const now = ctx.currentTime;
  const playClack = (time, velocity) => {
    const bufferSize = ctx.sampleRate * 0.1;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1200 + Math.random() * 1000;
    filter.Q.value = 1.5;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(velocity, time + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.08);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(time);
    noise.stop(time + 0.1);
  };
  playClack(now, 0.8);
  playClack(now + 0.06, 0.7);
  playClack(now + 0.13, 0.6);
  playClack(now + 0.25 + Math.random() * 0.05, 0.5);
  playClack(now + 0.45 + Math.random() * 0.1, 0.3);
  playClack(now + 0.7 + Math.random() * 0.1, 0.15);
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
  if (!inventory || inventory.length === 0) return null;
  return (
    <div className="flex items-center gap-2 bg-indigo-800/50 px-4 py-1.5 rounded-full border border-indigo-600/50">
      <Backpack size={16} className="text-yellow-400" />
      <div className="flex -space-x-2">
        {inventory.map((item, idx) => (
          <div
            key={item.id || idx}
            data-help-key="inventory_item" onClick={() => onSelect(item)}
            className="group relative transition-transform hover:z-20 hover:scale-110 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-950 border-2 border-indigo-400 flex items-center justify-center overflow-hidden shadow-sm relative">
              {item.image ? (
                <img loading="lazy"
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-contain pixelated"
                  style={STYLE_IMAGE_PIXELATED}
                  decoding="async"
                />
              ) : item.icon ? (
                <span className="text-lg">{item.icon}</span>
              ) : item.isLoading ? (
                <RefreshCw size={10} className="text-indigo-600 animate-spin"/>
              ) : (
                <span className="text-[11px] font-bold text-indigo-300">{item.name.charAt(0)}</span>
              )}
            </div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 hidden group-hover:flex flex-col items-center z-50 w-32">
              <div className="w-2 h-2 bg-black/90 rotate-45 -mb-1 border-t border-l border-white/20"></div>
              <div className="bg-black/90 text-white text-[11px] px-2 py-1 rounded shadow-lg font-bold border border-white/20 text-center">
                {item.name}
                {item.effectType && <div className="font-normal opacity-80 text-[11px] mt-0.5 border-t border-white/10 pt-0.5">{item.description}</div>}
              </div>
            </div>
          </div>
        ))}
      </div>
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
      if (prev.isLoading !== next.isLoading) return false;
  }
  return true;
});

// ═══ DiceOverlay (lines 10868-10922) ═══
const DiceOverlay = React.memo(({ result, onComplete }) => {
  const { t } = useContext(LanguageContext);
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
    }, 50);
    const endTimer = setTimeout(() => onComplete(), 3500);
    return () => {
      clearTimeout(rollTimer);
      clearTimeout(endTimer);
    };
  }, [onComplete, result]);
  return (
    <div
      className="fixed inset-0 bg-black/60 z-[200] backdrop-blur-sm flex items-center justify-center"
      onClick={onComplete}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onComplete(); }}
        className="absolute top-6 right-6 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors z-[202]"
        title={t('common.skip_animation')}
        aria-label={t('common.skip_animation')}
      >
        <X size={32} />
      </button>
      <div role="button" tabIndex={0} className="dice-container" onClick={(e) => e.stopPropagation()}>
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
  useFocusTrap(shopRef, true);
  const { t } = useContext(LanguageContext);
  return (
    <div
        ref={shopRef}
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
        onClick={onClose}
    >
      <div role="button" tabIndex={0} className="bg-slate-900 border-4 border-indigo-500 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden relative flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="bg-indigo-600 p-3 sm:p-6 text-white flex justify-between items-center shrink-0 shadow-lg relative z-10">
            <div>
                <h2 className="text-2xl font-black uppercase tracking-widest flex items-center gap-3">
                    <div className="bg-yellow-400 text-indigo-900 p-2 rounded-lg shadow-inner border-2 border-indigo-800">
                        <ShoppingBag size={24} />
                    </div>
                    {t('adventure.shop')}
                </h2>
                <p className="text-indigo-200 text-sm font-bold mt-1 ml-1">{t('adventure.shop_desc')}</p>
            </div>
            <button onClick={onClose} className="bg-indigo-800 hover:bg-indigo-700 text-white p-2 rounded-full transition-colors border-2 border-indigo-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500" autoFocus aria-label={t('adventure.close_shop_aria')}>
                <X size={24}/>
            </button>
        </div>
        <div className="bg-slate-800 p-2 sm:p-4 flex justify-between items-center border-b border-slate-700 shrink-0 gap-2 sm:gap-4 flex-wrap sm:flex-nowrap">
            <div className="flex gap-6">
                <div className="flex items-center gap-2 bg-slate-700 px-4 py-2 rounded-xl border border-slate-600">
                    <span className="text-2xl">💰</span>
                    <div>
                        <div className="text-[11px] text-slate-600 font-bold uppercase tracking-wider">{t('adventure.gold')}</div>
                        <div className="text-xl font-black text-yellow-400 leading-none">{gold}</div>
                    </div>
                </div>
                <div className="flex items-center gap-2 bg-slate-700 px-4 py-2 rounded-xl border border-slate-600">
                    <span className="text-2xl">🏆</span>
                    <div>
                        <div className="text-[11px] text-slate-600 font-bold uppercase tracking-wider">{t('adventure.global_xp')}</div>
                        <div className="text-xl font-black text-green-400 leading-none">{globalXP}</div>
                    </div>
                </div>
            </div>
            <div className="text-xs text-slate-600 italic text-right ml-auto">
                {t('adventure.xp_earn_tip')}
            </div>
        </div>
        <div className="p-3 sm:p-6 overflow-y-auto custom-scrollbar bg-slate-900 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 flex-1 min-h-0">
            {ADVENTURE_SHOP_ITEMS.map((item) => (
                <div key={item.id} className="bg-slate-800 border-2 border-slate-700 rounded-2xl p-3 sm:p-4 flex flex-col hover:border-indigo-500 transition-colors group relative overflow-hidden">
                    <div className="flex justify-between items-start mb-2 relative z-10">
                        <div className="text-2xl sm:text-4xl bg-slate-700 w-10 h-10 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center shadow-inner border border-slate-600">
                            {item.icon}
                        </div>
                        <div className="text-right">
                            <div className="text-yellow-400 font-black text-lg">{item.cost} G</div>
                            <span className="text-[11px] font-bold uppercase text-slate-600 bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                                {t(`adventure.effects.${item.effectType}`) || item.effectType}
                            </span>
                        </div>
                    </div>
                    <div className="relative z-10 flex flex-col flex-1">
                        <h3 className="text-white font-bold text-lg mb-1 group-hover:text-indigo-300 transition-colors">
                            {t(`adventure.shop_items.${item.id}_name`) || item.name}
                        </h3>
                        <p className="text-slate-600 text-xs leading-relaxed mb-2 sm:mb-4 min-h-[2em] flex-1 overflow-y-auto custom-scrollbar">
                            {t(`adventure.shop_items.${item.id}_desc`) || item.description}
                        </p>
                        <button
                            onClick={() => onPurchase(item)}
                            disabled={gold < item.cost}
                            className={`w-full py-2 sm:py-2.5 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all active:scale-95 shrink-0 min-h-[40px] ${
                                gold >= item.cost
                                ? 'bg-yellow-500 hover:bg-yellow-400 text-indigo-900 shadow-lg shadow-yellow-500/30 border-2 border-yellow-300 ring-1 ring-yellow-400/50'
                                : 'bg-slate-700 text-slate-600 cursor-not-allowed'
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
    const hasTriggeredAutoGen = useRef(false);
    const portraitFileRefs = useRef({});
    const handlePortraitFileChange = (charIdx, e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) return;
        if (file.size > 5 * 1024 * 1024) { alert('Image too large (max 5MB). Please use a smaller image.'); return; }
        const reader = new FileReader();
        reader.onload = (ev) => { if (onUploadPortrait) onUploadPortrait(charIdx, ev.target.result); };
        reader.readAsDataURL(file);
        e.target.value = '';
    };
    useEffect(() => {
        if (!hasTriggeredAutoGen.current && characters?.length > 0) {
            hasTriggeredAutoGen.current = true;
            characters.forEach((char, i) => {
                if (!char.portrait && !char.isGenerating && !char.isUserUploaded) {
                    setTimeout(() => onGeneratePortrait(i), i * 600);
                }
            });
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
        <div className="fixed inset-0 z-[250] bg-gradient-to-br from-violet-950/95 to-indigo-950/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-500">
            <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8">
                <div className="text-center mb-6">
                    <span className="text-4xl mb-2 block">🎭</span>
                    <h2 className="text-2xl font-bold text-slate-800">{t('adventure.cast_lobby') || 'Meet Your Cast'}</h2>
                    <p className="text-sm text-slate-600 mt-1">{t('adventure.cast_lobby_desc') || 'Click any name, role, or description to edit. Portraits generate automatically.'}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {characters.map((char, i) => (
                        <div key={i} className="bg-gradient-to-br from-slate-50 to-violet-50 rounded-2xl border border-violet-100 p-4 flex flex-col items-center text-center transition-all hover:shadow-lg hover:border-violet-300 relative group/card">
                            <button onClick={() => onRemoveCharacter(i)} className="absolute top-2 right-2 w-5 h-5 rounded-full bg-red-100 text-red-400 hover:bg-red-200 hover:text-red-600 text-xs font-bold opacity-0 group-hover/card:opacity-100 transition-opacity flex items-center justify-center" title={t('adventure.remove_character')}>✕</button>
                            <div className="w-24 h-24 rounded-full bg-violet-100 border-2 border-violet-200 flex items-center justify-center overflow-hidden mb-3 shadow-inner">
                                {char.isGenerating ? (
                                    <div className="animate-spin w-6 h-6 border-2 border-violet-400 border-t-transparent rounded-full"></div>
                                ) : char.portrait ? (
                                    <img src={char.portrait} alt={char.name} className="w-full h-full object-cover rounded-full"/>
                                ) : (
                                    <span className="text-3xl">🎭</span>
                                )}
                            </div>
                            {editingField?.idx === i && editingField?.field === 'name' ? (
                                <input type="text" value={editFieldValue} onChange={(e) => setEditFieldValue(e.target.value)} onBlur={saveFieldEdit} onKeyDown={(e) => { if (e.key === 'Enter') saveFieldEdit(); if (e.key === 'Escape') { setEditingField(null); setEditFieldValue(''); }}} autoFocus className="font-bold text-slate-800 text-sm text-center w-full px-2 py-0.5 border border-violet-300 rounded-lg focus:ring-2 focus:ring-violet-400 focus:outline-none bg-white"/>
                            ) : (
                                <h3 onClick={() => startFieldEdit(i, 'name')} className="font-bold text-slate-800 text-sm cursor-pointer hover:text-violet-600 hover:underline decoration-dashed underline-offset-2 transition-colors" title={t('adventure.edit_name')}>{char.name}</h3>
                            )}
                            {editingField?.idx === i && editingField?.field === 'role' ? (
                                <input type="text" value={editFieldValue} onChange={(e) => setEditFieldValue(e.target.value)} onBlur={saveFieldEdit} onKeyDown={(e) => { if (e.key === 'Enter') saveFieldEdit(); if (e.key === 'Escape') { setEditingField(null); setEditFieldValue(''); }}} autoFocus className="text-xs text-violet-600 font-medium text-center w-full px-2 py-0.5 border border-violet-300 rounded-lg focus:ring-2 focus:ring-violet-400 focus:outline-none bg-white mt-0.5"/>
                            ) : (
                                <p onClick={() => startFieldEdit(i, 'role')} className="text-xs text-violet-600 font-medium cursor-pointer hover:text-violet-800 hover:underline decoration-dashed underline-offset-2 transition-colors" title={t('adventure.edit_role')}>{char.role}</p>
                            )}
                            {editingField?.idx === i && editingField?.field === 'appearance' ? (
                                <textarea value={editFieldValue} onChange={(e) => setEditFieldValue(e.target.value)} onBlur={saveFieldEdit} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveFieldEdit(); } if (e.key === 'Escape') { setEditingField(null); setEditFieldValue(''); }}} autoFocus rows={3} className="text-[11px] text-slate-600 mt-1 leading-relaxed w-full px-2 py-1 border border-violet-300 rounded-lg focus:ring-2 focus:ring-violet-400 focus:outline-none bg-white resize-none"/>
                            ) : (
                                <p onClick={() => startFieldEdit(i, 'appearance')} className="text-[11px] text-slate-600 mt-1 leading-relaxed cursor-pointer hover:text-slate-700 hover:underline decoration-dashed underline-offset-2 transition-colors" title={t('adventure.edit_appearance')}>{char.appearance}</p>
                            )}
                            {char.portrait && !char.isGenerating && (
                                <div className="mt-2 flex flex-wrap gap-1.5 justify-center">
                                    {char.isUserUploaded && (
                                        <span className="text-[11px] px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-200 font-medium">📷 User Photo</span>
                                    )}
                                    <button onClick={() => onGeneratePortrait(i)} className="text-xs px-3 py-1 bg-violet-600 text-white rounded-full hover:bg-violet-700 transition-all font-bold" title={t('adventure.regen_portrait')}>
                                        🔄 {char.isUserUploaded ? 'AI Generate' : 'Regenerate'}
                                    </button>
                                    <input type="file" accept="image/*" ref={el => portraitFileRefs.current[i] = el} onChange={(e) => handlePortraitFileChange(i, e)} className="hidden" />
                                    <button onClick={() => portraitFileRefs.current[i]?.click()} className="text-xs px-3 py-1 bg-sky-50 text-sky-600 rounded-full hover:bg-sky-100 transition-all font-medium border border-sky-200" title={t('adventure.upload_portrait') || 'Upload your own portrait image'}>
                                        📷 Upload
                                    </button>
                                    {editIdx === i ? (
                                        <div className="w-full flex gap-1 mt-1">
                                            <input type="text" value={editPrompt} onChange={(e) => setEditPrompt(e.target.value)} placeholder="e.g. Add green glasses" className="flex-1 text-xs px-2 py-1 border border-violet-200 rounded-lg focus:ring-2 focus:ring-violet-400 focus:outline-none" onKeyDown={(e) => { if (e.key === 'Enter' && editPrompt.trim()) { onRefinePortrait(i, editPrompt.trim()); setEditIdx(null); setEditPrompt(''); }}}/>
                                            <button onClick={() => { if (editPrompt.trim()) { onRefinePortrait(i, editPrompt.trim()); setEditIdx(null); setEditPrompt(''); }}} className="text-xs px-2 py-1 bg-violet-500 text-white rounded-lg font-bold hover:bg-violet-600">✓</button>
                                            <button onClick={() => { setEditIdx(null); setEditPrompt(''); }} className="text-xs px-2 py-1 bg-slate-200 text-slate-600 rounded-lg font-bold hover:bg-slate-300">✗</button>
                                        </div>
                                    ) : (
                                        <>
                                            <button onClick={() => setEditIdx(i)} className="text-xs px-3 py-1 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200 transition-all font-medium border border-slate-200" title={t('adventure.edit_nanobanana')}>
                                                ✏️ Refine
                                            </button>
                                            <button onClick={() => {
                                                const link = document.createElement('a');
                                                link.href = char.portrait;
                                                link.download = `${(char.name || 'character').replace(/\s+/g, '_')}_portrait.png`;
                                                document.body.appendChild(link);
                                                link.click();
                                                document.body.removeChild(link);
                                            }} className="text-xs px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full hover:bg-emerald-100 transition-all font-medium border border-emerald-200">
                                                💾 Save
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                            {!char.portrait && !char.isGenerating && (
                                <div className="mt-2 flex flex-wrap gap-1.5 justify-center">
                                    <button onClick={() => onGeneratePortrait(i)} className="text-xs px-3 py-1 bg-violet-600 text-white rounded-full hover:bg-violet-700 transition-all font-bold">
                                        🎨 Generate Portrait
                                    </button>
                                    <input type="file" accept="image/*" ref={el => portraitFileRefs.current['new-' + i] = el} onChange={(e) => handlePortraitFileChange(i, e)} className="hidden" />
                                    <button onClick={() => portraitFileRefs.current['new-' + i]?.click()} className="text-xs px-3 py-1 bg-sky-50 text-sky-600 rounded-full hover:bg-sky-100 transition-all font-medium border border-sky-200" title={t('adventure.upload_portrait') || 'Upload your own portrait image'}>
                                        📷 Upload Photo
                                    </button>
                                </div>
                            )}
                            {char.isGenerating && (
                                <p className="mt-2 text-[11px] text-violet-400 animate-pulse font-medium">Generating...</p>
                            )}
                        </div>
                    ))}
                    {isAdding ? (
                        <div className="bg-gradient-to-br from-violet-50 to-indigo-50 rounded-2xl border-2 border-dashed border-violet-300 p-4 flex flex-col items-center text-center">
                            <span className="text-2xl mb-2">✨</span>
                            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={t('adventure.char_name_placeholder')} className="w-full text-sm px-3 py-1.5 mb-2 border border-violet-200 rounded-lg focus:ring-2 focus:ring-violet-400 focus:outline-none text-center font-bold"/>
                            <input type="text" value={newRole} onChange={(e) => setNewRole(e.target.value)} placeholder={t('adventure.role_placeholder')} className="w-full text-xs px-3 py-1.5 mb-2 border border-violet-200 rounded-lg focus:ring-2 focus:ring-violet-400 focus:outline-none text-center"/>
                            <input type="text" value={newAppearance} onChange={(e) => setNewAppearance(e.target.value)} placeholder="Appearance (e.g. tall, silver hair, blue robe)" className="w-full text-xs px-3 py-1.5 mb-2 border border-violet-200 rounded-lg focus:ring-2 focus:ring-violet-400 focus:outline-none text-center" onKeyDown={(e) => { if (e.key === 'Enter' && newName.trim()) { onAddCharacter({ name: newName.trim(), role: newRole.trim() || 'Character', appearance: newAppearance.trim() || newName.trim(), portrait: null, isGenerating: false }); setNewName(''); setNewRole(''); setNewAppearance(''); setIsAdding(false); }}}/>
                            <div className="flex gap-1.5 mt-1">
                                <button onClick={() => { if (newName.trim()) { onAddCharacter({ name: newName.trim(), role: newRole.trim() || 'Character', appearance: newAppearance.trim() || newName.trim(), portrait: null, isGenerating: false }); setNewName(''); setNewRole(''); setNewAppearance(''); setIsAdding(false); }}} className="text-xs px-3 py-1.5 bg-violet-600 text-white rounded-lg font-bold hover:bg-violet-700">Add</button>
                                <button onClick={() => { setIsAdding(false); setNewName(''); setNewRole(''); setNewAppearance(''); }} className="text-xs px-3 py-1.5 bg-slate-200 text-slate-600 rounded-lg font-bold hover:bg-slate-300">Cancel</button>
                            </div>
                        </div>
                    ) : (
                        <button onClick={() => setIsAdding(true)} className="bg-gradient-to-br from-slate-50 to-violet-50 rounded-2xl border-2 border-dashed border-violet-200 p-4 flex flex-col items-center justify-center text-center transition-all hover:shadow-lg hover:border-violet-400 hover:from-violet-50 hover:to-indigo-50 min-h-[180px] cursor-pointer group">
                            <span className="text-4xl mb-2 group-hover:scale-110 transition-transform">➕</span>
                            <span className="font-bold text-sm text-violet-600">{t('adventure.add_character')}</span>
                            <span className="text-[11px] text-slate-400 mt-0.5">{t('adventure.create_cast_member')}</span>
                        </button>
                    )}
                </div>
                <div className="flex justify-center gap-3">
                    <button onClick={() => { characters.forEach((_, i) => { if (!characters[i].portrait && !characters[i].isGenerating && !characters[i].isUserUploaded) { onGeneratePortrait(i); }}); }} className="px-5 py-2.5 bg-violet-100 text-violet-700 font-bold rounded-xl hover:bg-violet-200 transition-all text-sm border border-violet-200">
                        🎨 {t('adventure.generate_all') || 'Generate All Portraits'}
                    </button>
                    <button onClick={onConfirm} className="px-6 py-2.5 bg-violet-600 text-white font-bold rounded-xl hover:bg-violet-700 shadow-lg hover:shadow-xl transition-all text-sm hover:scale-105">
                        ⚔️ {t('adventure.begin_adventure') || 'Begin Adventure'}
                    </button>
                </div>
            </div>
        </div>
    );
});
