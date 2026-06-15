import React, { useState, useEffect, useRef } from 'react';

/**
 * RemediationSetup — streamlined one-screen AI provider picker for the focused
 * "AlloFlow Remediation" build. Lets the user connect LM Studio, Gemini, or
 * NVIDIA, then launches the remediation screen (local app, ?mode=remediation).
 *
 * Reuses existing IPC: writeAIConfig, lmstudioStatus, setup.saveConfig,
 * remediation.launch, openExternal.
 */
export default function RemediationSetup() {
  const [provider, setProvider] = useState(null); // 'llm-engine' | 'gemini' | 'nvidia'
  const [geminiKey, setGeminiKey] = useState('');
  const [nvidiaKey, setNvidiaKey] = useState('');
  const [lms, setLms] = useState(null); // { installed, running, models, ready }
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState('');
  const pollRef = useRef(null);

  // Poll LM Studio status while that provider is selected (the IPC also
  // auto-starts LM Studio's server when it's installed but not running).
  useEffect(() => {
    if (provider !== 'llm-engine') {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    let cancelled = false;
    const check = async () => {
      try {
        const s = await window.alloAPI.lmstudioStatus();
        if (!cancelled) setLms(s);
      } catch (e) { /* ignore transient */ }
    };
    check();
    pollRef.current = setInterval(check, 3000);
    return () => { cancelled = true; if (pollRef.current) clearInterval(pollRef.current); };
  }, [provider]);

  const canContinue =
    (provider === 'llm-engine' && lms?.ready) ||
    (provider === 'gemini' && geminiKey.trim().length > 10) ||
    (provider === 'nvidia' && nvidiaKey.trim().length > 10);

  const handleContinue = async () => {
    setError('');
    setLaunching(true);
    try {
      // 1. Persist the AI provider + key
      const aiCfg = { aiProvider: provider };
      if (provider === 'gemini') aiCfg.geminiApiKey = geminiKey.trim();
      if (provider === 'nvidia') {
        aiCfg.nvidiaApiKey = nvidiaKey.trim();
        aiCfg.nvidiaModel = 'meta/llama-3.3-70b-instruct';
      }
      await window.alloAPI.writeAIConfig(aiCfg);

      // 2. Persist a minimal local deployment config so services auto-start next launch
      const selectedServices = provider === 'llm-engine' ? ['llm-engine'] : [];
      await window.alloAPI.setup.saveConfig({
        deploymentType: 'local',
        aiProvider: provider,
        selectedServices,
      });

      // 3. Launch the focused remediation screen
      const res = await window.alloAPI.remediation.launch();
      if (!res?.success) throw new Error(res?.error || 'Could not open the remediation screen');
      // Window navigates away on success; nothing more to render here.
    } catch (e) {
      setError(e.message || 'Setup failed');
      setLaunching(false);
    }
  };

  const card = (id, emoji, title, subtitle) => (
    <button
      key={id}
      onClick={() => { setProvider(id); setError(''); }}
      style={{
        textAlign: 'left', padding: '16px 18px', borderRadius: '12px', cursor: 'pointer',
        border: `2px solid ${provider === id ? '#6366f1' : 'rgba(148,163,184,0.4)'}`,
        background: provider === id ? 'rgba(99,102,241,0.08)' : '#fff',
        transition: 'all 0.15s', width: '100%', display: 'flex', gap: '12px', alignItems: 'center',
      }}
    >
      <span style={{ fontSize: '26px' }}>{emoji}</span>
      <span>
        <div style={{ fontWeight: 700, fontSize: '15px', color: '#1e293b' }}>{title}</div>
        <div style={{ fontSize: '12.5px', color: '#64748b' }}>{subtitle}</div>
      </span>
    </button>
  );

  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: '8px', boxSizing: 'border-box',
    border: '1.5px solid #cbd5e1', fontSize: '14px', outline: 'none', marginTop: '10px',
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg,#f1f5f9 0%,#e2e8f0 100%)', fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <div style={{
        width: '100%', maxWidth: '520px', background: '#fff', borderRadius: '18px',
        boxShadow: '0 10px 40px rgba(15,23,42,0.12)', padding: '32px',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '6px', fontSize: '34px' }}>📄♿</div>
        <h1 style={{ textAlign: 'center', margin: '0 0 4px', fontSize: '22px', color: '#0f172a' }}>
          AlloFlow Remediation
        </h1>
        <p style={{ textAlign: 'center', margin: '0 0 22px', color: '#64748b', fontSize: '14px' }}>
          Choose an AI engine to power document accessibility remediation.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {card('llm-engine', '🖥️', 'LM Studio (local)', 'Runs models on this machine. Private, no API key.')}
          {card('gemini', '✨', 'Google Gemini', 'Cloud vision model. Paste an API key.')}
          {card('nvidia', '🟩', 'NVIDIA NIM', 'Cloud model. Paste an API key.')}
        </div>

        {/* Provider-specific detail */}
        {provider === 'llm-engine' && (
          <div style={{ marginTop: '16px', padding: '14px', borderRadius: '10px', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.25)', fontSize: '13px', color: '#334155' }}>
            <Step done={lms?.installed} label="LM Studio installed"
              detail={lms?.installed ? 'Found in Applications' : 'Download from lmstudio.ai, then drag to Applications'} />
            <Step done={lms?.running} label="Server running on port 1234"
              detail={lms?.running ? 'Responding' : 'Starting automatically once installed…'} />
            <Step done={lms?.ready} label="A model is loaded"
              detail={lms?.ready ? `Detected: ${lms.models[0]}` : 'Load a vision-capable model (e.g. Gemma 3, Qwen-VL, LLaVA) — remediation reads the PDF visually'} />
            {!lms?.installed && (
              <button onClick={() => window.alloAPI.openExternal('https://lmstudio.ai')}
                style={{ marginTop: '10px', padding: '8px 14px', borderRadius: '8px', border: 'none', background: '#6366f1', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                ⬇️ Download LM Studio
              </button>
            )}
          </div>
        )}

        {provider === 'gemini' && (
          <div style={{ marginTop: '16px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Gemini API key</label>
            <input type="password" value={geminiKey} onChange={(e) => setGeminiKey(e.target.value)}
              placeholder="AIza…" style={inputStyle} />
            <button onClick={() => window.alloAPI.openExternal('https://aistudio.google.com/apikey')}
              style={{ marginTop: '8px', background: 'none', border: 'none', color: '#6366f1', fontSize: '12.5px', cursor: 'pointer', padding: 0 }}>
              Get a key →
            </button>
          </div>
        )}

        {provider === 'nvidia' && (
          <div style={{ marginTop: '16px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>NVIDIA API key</label>
            <input type="password" value={nvidiaKey} onChange={(e) => setNvidiaKey(e.target.value)}
              placeholder="nvapi-…" style={inputStyle} />
            <button onClick={() => window.alloAPI.openExternal('https://build.nvidia.com')}
              style={{ marginTop: '8px', background: 'none', border: 'none', color: '#6366f1', fontSize: '12.5px', cursor: 'pointer', padding: 0 }}>
              Get a key →
            </button>
          </div>
        )}

        {error && (
          <div style={{ marginTop: '14px', padding: '10px 12px', borderRadius: '8px', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: '13px' }}>
            {error}
          </div>
        )}

        <button
          onClick={handleContinue}
          disabled={!canContinue || launching}
          style={{
            marginTop: '22px', width: '100%', padding: '13px', borderRadius: '10px', border: 'none',
            background: (!canContinue || launching) ? '#cbd5e1' : 'linear-gradient(90deg,#6366f1,#8b5cf6)',
            color: '#fff', fontWeight: 700, fontSize: '15px',
            cursor: (!canContinue || launching) ? 'not-allowed' : 'pointer',
          }}
        >
          {launching ? 'Opening…' : 'Continue to Remediation →'}
        </button>
      </div>
    </div>
  );
}

function Step({ done, label, detail }) {
  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '5px 0' }}>
      <span style={{ fontSize: '15px' }}>{done ? '✅' : '⏳'}</span>
      <span>
        <strong style={{ fontSize: '13px' }}>{label}</strong>
        {detail && <div style={{ fontSize: '12px', color: '#64748b' }}>{detail}</div>}
      </span>
    </div>
  );
}
