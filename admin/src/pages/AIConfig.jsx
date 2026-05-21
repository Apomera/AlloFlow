import React, { useState, useEffect } from 'react';
import { HardDrive, Mic, Database, Save, RefreshCw, Image, LogIn, LogOut } from 'lucide-react';

export default function AIConfig() {
  const [llmUrl, setLlmUrl] = useState('http://localhost:1234');
  const [defaultModel, setDefaultModel] = useState('');
  const [piperEnabled, setPiperEnabled] = useState(true);
  const [installedModels, setInstalledModels] = useState([]);
  const [llmStatus, setLlmStatus] = useState('checking'); // 'ok' | 'error' | 'checking'
  const [sqliteStatus, setSqliteStatus] = useState('checking');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // AI provider
  const [aiProvider, setAiProvider] = useState('local');

  // Image generation
  const [imageProvider, setImageProvider] = useState('flux');
  const [googleClientId, setGoogleClientId] = useState(process.env.REACT_APP_GOOGLE_CLIENT_ID || '');
  const [googleClientSecret, setGoogleClientSecret] = useState(process.env.REACT_APP_GOOGLE_CLIENT_SECRET || '');
  const [geminiApiKey, setGeminiApiKey] = useState(process.env.REACT_APP_GEMINI_API_KEY || '');
  const [showGeminiKey, setShowGeminiKey] = useState(false);

  // Gemini model selector
  const [geminiModel, setGeminiModel] = useState('gemini-2.0-flash');
  const [availableModels, setAvailableModels] = useState([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelFilter, setModelFilter] = useState('all'); // 'all' | 'free' | 'paid'

  // Copilot / Azure OpenAI
  const [copilotClientId, setCopilotClientId] = useState('');
  const [copilotTenantId, setCopilotTenantId] = useState('');
  const [copilotEndpoint, setCopilotEndpoint] = useState('');
  const [copilotStatus, setCopilotStatus] = useState(null);
  const [copilotConnecting, setCopilotConnecting] = useState(false);

  // NVIDIA NIM
  const [nvidiaApiKey, setNvidiaApiKey] = useState(process.env.REACT_APP_NVIDIA_API_KEY || '');
  const [showNvidiaKey, setShowNvidiaKey] = useState(false);
  const [nvidiaModel, setNvidiaModel] = useState('nvidia/nemotron-3-nano-omni-30b-a3b-reasoning');
  const [nvidiaTextModel, setNvidiaTextModel] = useState('meta/llama-3.3-70b-instruct');
  const [nvidiaOmniModel, setNvidiaOmniModel] = useState('nvidia/nemotron-3-nano-omni-30b-a3b-reasoning');
  const [nvidiaReasoningMode, setNvidiaReasoningMode] = useState(true);

  useEffect(() => {
    loadConfig();
    checkStatuses();
    checkCopilotStatus();
  }, []);

  const fetchGeminiModels = async () => {
    setModelsLoading(true);
    try {
      const res = await fetch('http://localhost:3730/api/gemini/models');
      if (res.ok) {
        const data = await res.json();
        setAvailableModels(data.models || []);
        if (data.currentModel) setGeminiModel(data.currentModel);
      }
    } catch (err) {
      console.error('[AIConfig] Failed to fetch Gemini models:', err.message);
    } finally {
      setModelsLoading(false);
    }
  };

  const checkCopilotStatus = async () => {
    const result = await window.alloAPI?.copilotOAuth?.status?.();
    setCopilotStatus(result || { connected: false });
  };

  const loadConfig = async () => {
    try {
      if (window.alloAPI?.localApp) {
        const cfg = await window.alloAPI.localApp.readConfig();
        if (cfg) {
          setLlmUrl(cfg.llmEngineUrl || cfg.ollamaUrl || 'http://localhost:1234');
          setDefaultModel(cfg.defaultModel || '');
          setPiperEnabled(cfg.piperEnabled !== false);
        }
      }
      // Load AI config (aiProvider, image provider + OAuth creds)
      const aiCfg = await window.alloAPI?.readAIConfig?.();
      if (aiCfg) {
        setAiProvider(aiCfg.aiProvider || 'local');
        setImageProvider(aiCfg.imageProvider || 'flux');
        setGoogleClientId(aiCfg.googleClientId || '');
        setGoogleClientSecret(aiCfg.googleClientSecret || '');
        setGeminiApiKey(aiCfg.geminiApiKey || process.env.REACT_APP_GEMINI_API_KEY || '');
        setGeminiModel(aiCfg.geminiModel || 'gemini-2.0-flash');
        setCopilotClientId(aiCfg.copilot?.clientId || '');
        setCopilotTenantId(aiCfg.copilot?.tenantId || '');
        setCopilotEndpoint(aiCfg.copilot?.endpoint || '');
        setNvidiaApiKey(aiCfg.nvidiaApiKey || process.env.REACT_APP_NVIDIA_API_KEY || '');
        setNvidiaModel(aiCfg.nvidiaModel || 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning');
        setNvidiaTextModel(aiCfg.nvidiaTextModel || 'meta/llama-3.3-70b-instruct');
        setNvidiaOmniModel(aiCfg.nvidiaOmniModel || aiCfg.nvidiaModel || 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning');
        setNvidiaReasoningMode(aiCfg.nvidiaReasoningMode !== false);
      }
    } catch (err) {
      console.error('[AIConfig] Error loading config:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkStatuses = async () => {
    // Check LM Studio
    try {
      const result = await window.alloAPI?.listModels?.();
      const running = result?.success;
      setLlmStatus(running ? 'ok' : 'error');
      if (running && result.models) {
        setInstalledModels(result.models || []);
      }
    } catch {
      setLlmStatus('error');
    }

    // Check SQLite backend
    try {
      const status = await window.alloAPI?.localApp?.backendStatus?.();
      setSqliteStatus(status?.running ? 'ok' : 'error');
    } catch {
      setSqliteStatus('error');
    }
  };

  const handleSave = async () => {
    try {
      if (window.alloAPI?.localApp) {
        await window.alloAPI.localApp.writeConfig({ llmEngineUrl: llmUrl, defaultModel, piperEnabled });
      }
      // Save AI config
      if (window.alloAPI?.writeAIConfig) {
        await window.alloAPI.writeAIConfig({
          aiProvider,
          imageProvider,
          geminiApiKey:       geminiApiKey.trim() || undefined,
          geminiModel:        geminiModel || 'gemini-2.0-flash',
          googleClientId:     googleClientId.trim() || undefined,
          googleClientSecret: googleClientSecret.trim() || undefined,
          copilot: (copilotClientId.trim() || copilotTenantId.trim() || copilotEndpoint.trim()) ? {
            clientId: copilotClientId.trim(),
            tenantId: copilotTenantId.trim(),
            endpoint: copilotEndpoint.trim(),
          } : undefined,
          nvidiaApiKey:       nvidiaApiKey.trim() || undefined,
          nvidiaModel:        nvidiaModel || 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
          nvidiaTextModel:    nvidiaTextModel || 'meta/llama-3.3-70b-instruct',
          nvidiaOmniModel:    nvidiaOmniModel || 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
          nvidiaReasoningMode: nvidiaReasoningMode,
        });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('[AIConfig] Error saving config:', err);
    }
  };

  const handleCopilotConnect = async () => {
    setCopilotConnecting(true);
    try {
      const result = await window.alloAPI?.copilotOAuth?.start?.();
      if (result?.success) {
        await checkCopilotStatus();
        window.alloAPI?.localApp?.reload?.();
      } else {
        alert('Microsoft sign-in failed: ' + (result?.error || 'Unknown error'));
      }
    } finally {
      setCopilotConnecting(false);
    }
  };

  const handleCopilotDisconnect = async () => {
    await window.alloAPI?.copilotOAuth?.revoke?.();
    setCopilotStatus({ connected: false });
  };

  const statusDot = (status) => {
    const color = status === 'ok' ? 'var(--color-success)' : status === 'error' ? '#ef4444' : '#94a3b8';
    return (
      <span style={{
        display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
        backgroundColor: color, marginRight: '0.5rem', flexShrink: 0
      }} />
    );
  };

  if (loading) {
    return <div className="page"><p style={{ color: 'var(--color-text-muted)' }}>Loading configuration...</p></div>;
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2>AI Configuration</h2>
        <p>Configure local AI services — LM Studio and Piper TTS</p>
      </div>

      {/* Service Status */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Service Status</h3>
          <button className="btn btn-small" onClick={checkStatuses} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '0.75rem', backgroundColor: 'var(--color-bg)', borderRadius: '6px' }}>
            {statusDot(llmStatus)}
            <div>
              <div style={{ fontWeight: 600 }}>🧠 LM Studio (llama.cpp)</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                {llmStatus === 'ok' ? `Running — ${installedModels.length} model(s) loaded` : llmStatus === 'error' ? 'Not running — start via Services tab' : 'Checking...'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', padding: '0.75rem', backgroundColor: 'var(--color-bg)', borderRadius: '6px' }}>
            {statusDot(sqliteStatus)}
            <div>
              <div style={{ fontWeight: 600 }}>🗄️ SQLite Backend</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                {sqliteStatus === 'ok' ? 'Running — local data backend healthy' : sqliteStatus === 'error' ? 'Not running' : 'Checking...'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* LM Studio Settings */}
      <div className="card">
        <div className="card-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <HardDrive size={18} /> LM Studio Settings
          </h3>
        </div>
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              LM Studio API URL
            </label>
            <input
              type="text"
              value={llmUrl}
              onChange={(e) => setLlmUrl(e.target.value)}
              placeholder="http://localhost:1234"
              style={{ width: '100%', fontFamily: 'monospace' }}
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
              Default: http://localhost:1234 — OpenAI-compatible API provided by LM Studio
            </p>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Default Model
            </label>
            {installedModels.length > 0 ? (
              <select value={defaultModel} onChange={(e) => setDefaultModel(e.target.value)} style={{ width: '100%' }}>
                <option value="">— Auto-select first available —</option>
                {installedModels.map(m => {
                  const name = typeof m === 'string' ? m : m.name || m.model || '';
                  return <option key={name} value={name}>{name}</option>;
                })}
              </select>
            ) : (
              <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-bg)', borderRadius: '6px', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                No models installed. Go to the <strong>Models</strong> tab to pull a model.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Piper TTS */}
      <div className="card">
        <div className="card-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Mic size={18} /> Text-to-Speech (Piper)
          </h3>
        </div>
        <label style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem',
          backgroundColor: piperEnabled ? 'rgba(16, 185, 129, 0.1)' : 'var(--color-bg)',
          borderRadius: '8px', border: `2px solid ${piperEnabled ? 'var(--color-success)' : 'var(--color-border)'}`,
          cursor: 'pointer'
        }}>
          <input type="checkbox" checked={piperEnabled} onChange={(e) => setPiperEnabled(e.target.checked)} style={{ width: '18px', height: '18px' }} />
          <div>
            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
              {piperEnabled ? '✓ Piper TTS Enabled' : 'Piper TTS Disabled'}
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
              Offline text-to-speech. When disabled, falls back to browser speech synthesis.
            </div>
          </div>
        </label>
      </div>

      {/* Data Storage */}
      <div className="card">
        <div className="card-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Database size={18} /> Data Storage
          </h3>
        </div>
        <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-bg)', borderRadius: '6px', fontSize: '0.875rem' }}>
          <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>All data stored locally:</div>
          <ul style={{ paddingLeft: '1.25rem', color: 'var(--color-text-muted)', lineHeight: 1.8 }}>
            <li>SQLite database: <code>~/.alloflow/local.db</code></li>
            <li>Config: <code>~/.alloflow/local_config.json</code></li>
            <li>LM Studio models: <code>~/.cache/lm-studio/models/</code></li>
            <li>Piper voices: <code>~/.alloflow/data/piper/</code></li>
          </ul>
          <p style={{ marginTop: '0.75rem', color: 'var(--color-success)', fontWeight: 500 }}>
            ✓ No cloud services. No API keys. No internet required after setup.
          </p>
        </div>
      </div>

      {/* AI Provider */}
      <div className="card">
        <div className="card-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Image size={18} /> AI Provider
          </h3>
        </div>
        <div style={{ display: 'grid', gap: '1rem' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', margin: 0 }}>
            Choose the AI engine for text generation and images. Cloud providers handle both; Local lets you pick a separate image source.
          </p>

          {/* AI Provider radio */}
          {[
            { value: 'local',   label: '🦙 Local AI (LM Studio)',   desc: 'Run LLMs locally via llama.cpp. No internet needed.' },
            { value: 'gemini',  label: '✨ Google Gemini',           desc: 'Cloud AI via Google — text + image generation. Requires a Gemini API key.' },
            { value: 'copilot', label: '🤖 Microsoft Copilot',      desc: 'Cloud AI via Azure OpenAI — text + DALL-E images. Requires Entra ID sign-in.' },
            { value: 'nvidia',  label: '⚡ NVIDIA NIM',             desc: 'Multimodal AI (text/image/audio/video) via NVIDIA. Free API key at build.nvidia.com.' },
          ].map(opt => (
            <label key={opt.value} style={{
              display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.875rem',
              backgroundColor: aiProvider === opt.value ? 'rgba(26,115,232,0.08)' : 'var(--color-bg)',
              borderRadius: '8px',
              border: `2px solid ${aiProvider === opt.value ? '#1a73e8' : 'var(--color-border)'}`,
              cursor: 'pointer'
            }}>
              <input
                type="radio" name="aiProvider" value={opt.value}
                checked={aiProvider === opt.value}
                onChange={() => setAiProvider(opt.value)}
                style={{ marginTop: '2px', accentColor: '#1a73e8' }}
              />
              <div>
                <div style={{ fontWeight: 600 }}>{opt.label}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{opt.desc}</div>
              </div>
            </label>
          ))}

          {/* Image Provider — only when Local AI */}
          {aiProvider === 'local' && (
            <div style={{ padding: '1rem', backgroundColor: 'var(--color-bg)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
              <div style={{ fontWeight: 600, marginBottom: '0.75rem' }}>🎨 Image Generation (with Local AI)</div>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '0 0 0.75rem 0' }}>
                When using Local AI, choose where images come from:
              </p>
              {[
                { value: 'flux',    label: '🖥️ Local Flux (default)',       desc: 'Runs on your GPU via the local Flux server at port 7860.' },
                { value: 'gemini',  label: '✨ Google Gemini Imagen',       desc: 'Cloud image generation via Google AI. Requires Google sign-in.' },
                { value: 'copilot', label: '🤖 Microsoft Copilot (DALL-E)', desc: 'Cloud image generation via Azure OpenAI DALL-E 3.' },
              ].map(opt => (
                <label key={opt.value} style={{
                  display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem', marginBottom: '0.5rem',
                  backgroundColor: imageProvider === opt.value ? 'rgba(26,115,232,0.06)' : 'transparent',
                  borderRadius: '6px',
                  border: `1px solid ${imageProvider === opt.value ? '#1a73e8' : 'var(--color-border)'}`,
                  cursor: 'pointer'
                }}>
                  <input
                    type="radio" name="imageProvider" value={opt.value}
                    checked={imageProvider === opt.value}
                    onChange={() => setImageProvider(opt.value)}
                    style={{ marginTop: '2px', accentColor: '#1a73e8' }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{opt.label}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          )}

          {/* Gemini API Key + Model section — show when Gemini selected as AI provider or image provider */}
          {(aiProvider === 'gemini' || (aiProvider === 'local' && imageProvider === 'gemini')) && (
            <div style={{ padding: '1rem', backgroundColor: 'var(--color-bg)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
              <div style={{ fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                ✨ Google Gemini Setup
              </div>

              {/* Status indicator */}
              {geminiApiKey ? (
                <div style={{ marginBottom: '0.75rem', padding: '0.5rem 0.75rem', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--color-success)', fontWeight: 600 }}>
                  ✓ API key configured — active model: <strong>{geminiModel}</strong>
                </div>
              ) : (
                <div style={{ marginBottom: '0.75rem', padding: '0.5rem 0.75rem', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '6px', fontSize: '0.8rem', color: '#f59e0b' }}>
                  ⚠ No API key — Gemini features will not work until you add one below
                </div>
              )}

              {/* Setup instructions */}
              <div style={{ padding: '0.75rem', background: 'rgba(66,133,244,0.06)', borderRadius: '6px', border: '1px solid rgba(66,133,244,0.2)', marginBottom: '0.75rem' }}>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem' }}>How to get a free API key (takes 1 minute)</div>
                <ol style={{ margin: '0 0 0.6rem 0', paddingLeft: '1.25rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: 1.7 }}>
                  <li>Click <strong>Open Google AI Studio</strong> below — sign in with your Google account</li>
                  <li>Click <strong>Get API key</strong> → <strong>Create API key</strong></li>
                  <li>Copy the key and paste it in the field below, then click <strong>Save Configuration</strong></li>
                </ol>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button className="btn btn-small" onClick={() => window.alloAPI?.openExternal('https://aistudio.google.com/apikey')}
                    style={{ fontSize: '0.8rem' }}>
                    Open Google AI Studio ↗
                  </button>
                  <button className="btn btn-small" onClick={() => window.alloAPI?.openExternal('https://aistudio.google.com/usage')}
                    style={{ fontSize: '0.8rem' }}>
                    View Rate Usage ↗
                  </button>
                </div>
              </div>

              {/* API key input */}
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>API Key</label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                <input
                  type={showGeminiKey ? 'text' : 'password'}
                  value={geminiApiKey}
                  onChange={e => setGeminiApiKey(e.target.value)}
                  placeholder="Paste your Gemini API key..."
                  style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.8rem' }}
                />
                <button className="btn btn-small" onClick={() => setShowGeminiKey(v => !v)} style={{ flexShrink: 0 }}>
                  {showGeminiKey ? 'Hide' : 'Show'}
                </button>
              </div>

              {/* Model selector */}
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>AI Model</label>
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    {['all', 'free', 'paid'].map(f => (
                      <button key={f} className="btn btn-small"
                        onClick={() => setModelFilter(f)}
                        style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem',
                          background: modelFilter === f ? 'var(--color-primary)' : undefined,
                          color: modelFilter === f ? '#fff' : undefined,
                          borderColor: modelFilter === f ? 'var(--color-primary)' : undefined }}>
                        {f === 'all' ? 'All' : f === 'free' ? '🆓 Free' : '💳 Paid'}
                      </button>
                    ))}
                    <button className="btn btn-small" onClick={fetchGeminiModels} disabled={!geminiApiKey || modelsLoading}
                      style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}>
                      {modelsLoading ? '...' : '⟳ Refresh'}
                    </button>
                  </div>
                </div>

                {availableModels.length > 0 ? (
                  <select value={geminiModel} onChange={e => setGeminiModel(e.target.value)}
                    style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    {availableModels
                      .filter(m => modelFilter === 'all' || m.tier === modelFilter)
                      .map(m => (
                        <option key={m.id} value={m.id}>
                          {m.tier === 'paid' ? '💳' : '🆓'} {m.displayName} ({m.id})
                        </option>
                      ))}
                  </select>
                ) : (
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input type="text" value={geminiModel} onChange={e => setGeminiModel(e.target.value)}
                      placeholder="gemini-2.0-flash"
                      style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.8rem' }} />
                    {geminiApiKey && (
                      <button className="btn btn-small" onClick={fetchGeminiModels} disabled={modelsLoading}
                        style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        {modelsLoading ? 'Loading...' : 'Load models'}
                      </button>
                    )}
                  </div>
                )}

                <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', margin: '0.3rem 0 0 0' }}>
                  🆓 Free models have a no-cost quota (rate limits apply). 💳 Paid models require billing enabled.
                </p>

                {/* Paid model billing instructions */}
                {availableModels.find(m => m.id === geminiModel)?.tier === 'paid' && (
                  <div style={{ marginTop: '0.5rem', padding: '0.6rem 0.75rem', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '6px', fontSize: '0.75rem' }}>
                    <div style={{ fontWeight: 600, color: '#f59e0b', marginBottom: '0.35rem' }}>💳 Paid model selected — billing required</div>
                    <ol style={{ margin: 0, paddingLeft: '1.1rem', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                      <li>Go to <strong>Google Cloud Console</strong> → Billing → Link a billing account to your project</li>
                      <li>Enable the <strong>Generative Language API</strong> in APIs &amp; Services</li>
                      <li>Your API key (same one) will automatically unlock paid quota once billing is enabled</li>
                    </ol>
                    <button className="btn btn-small" style={{ marginTop: '0.4rem', fontSize: '0.7rem' }}
                      onClick={() => window.alloAPI?.openExternal('https://console.cloud.google.com/billing')}>
                      Open Billing Console ↗
                    </button>
                  </div>
                )}
              </div>

              <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', margin: '0.5rem 0 0 0' }}>
                API key + model saved to <code>~/.alloflow/ai_config.json</code> — local only, never uploaded.
              </p>
            </div>
          )}

          {/* Copilot OAuth section — show when Copilot selected as AI provider or image provider */}
          {(aiProvider === 'copilot' || (aiProvider === 'local' && imageProvider === 'copilot')) && (
            <div style={{ padding: '1rem', backgroundColor: 'var(--color-bg)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
              <div style={{ fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                🤖 Microsoft Account (Entra ID)
              </div>

              {copilotStatus?.connected ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>✓ Connected</span>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginLeft: '0.5rem' }}>
                      {copilotStatus.email}
                    </span>
                  </div>
                  <button className="btn btn-small" onClick={handleCopilotDisconnect}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#ef4444', borderColor: '#ef4444' }}>
                    <LogOut size={13} /> Disconnect
                  </button>
                </div>
              ) : (
                <div>
                  <button
                    className="btn btn-primary"
                    onClick={handleCopilotConnect}
                    disabled={copilotConnecting || !copilotClientId || !copilotTenantId || !copilotEndpoint}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    <LogIn size={15} />
                    {copilotConnecting ? 'Opening browser...' : 'Sign in with Microsoft'}
                  </button>
                  {(!copilotClientId || !copilotTenantId || !copilotEndpoint) && (
                    <p style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: '0.5rem' }}>
                      ⚠ Enter Client ID, Tenant ID, and Endpoint below to enable sign-in.
                    </p>
                  )}
                </div>
              )}

              {/* Copilot credentials (collapsible) */}
              <details style={{ marginTop: '0.875rem' }}>
                <summary style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
                  Azure OpenAI credentials (required once)
                </summary>
                <div style={{ marginTop: '0.75rem', display: 'grid', gap: '0.5rem' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0 }}>
                    <strong>IT Admin (one-time setup):</strong><br/>
                    1. Create an Azure OpenAI resource at <strong>portal.azure.com</strong><br/>
                    2. Deploy <strong>gpt-4o</strong> and <strong>dall-e-3</strong> models<br/>
                    3. Register app at <strong>entra.microsoft.com</strong> (redirect: <code>http://127.0.0.1</code>)<br/>
                    4. Add API permission: Azure Cognitive Services → user_impersonation → Grant admin consent<br/>
                    5. Add <strong>Cognitive Services OpenAI User</strong> IAM role for teachers<br/>
                    <br/>
                    <strong>Teacher:</strong> Get the values below from your IT admin.
                  </p>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>App (Client) ID</label>
                    <input
                      type="text" value={copilotClientId}
                      onChange={e => setCopilotClientId(e.target.value)}
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                      style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.8rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Directory (Tenant) ID</label>
                    <input
                      type="text" value={copilotTenantId}
                      onChange={e => setCopilotTenantId(e.target.value)}
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                      style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.8rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Azure OpenAI Endpoint</label>
                    <input
                      type="text" value={copilotEndpoint}
                      onChange={e => setCopilotEndpoint(e.target.value)}
                      placeholder="https://YOUR-RESOURCE.openai.azure.com"
                      style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.8rem' }}
                    />
                  </div>
                  <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', margin: 0 }}>
                    Saved to <code>~/.alloflow/ai_config.json</code> (local only, never uploaded).
                  </p>
                </div>
              </details>
            </div>
          )}
        </div>
      </div>

      {/* NVIDIA NIM config section */}
      {aiProvider === 'nvidia' && (
        <div className="card">
          <div className="card-header">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              ⚡ NVIDIA NIM Setup
            </h3>
          </div>
          <div style={{ display: 'grid', gap: '1rem' }}>

            {/* Status badge */}
            {nvidiaApiKey ? (
              <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--color-success)', fontWeight: 600 }}>
                ✓ API key configured · text: <strong>{nvidiaTextModel}</strong> · omni: <strong>{nvidiaOmniModel}</strong>
              </div>
            ) : (
              <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '6px', fontSize: '0.8rem', color: '#f59e0b' }}>
                ⚠ No API key — NVIDIA features will not work until you add one below
              </div>
            )}

            {/* How to get API key */}
            <div style={{ padding: '0.75rem', background: 'rgba(118,185,0,0.06)', borderRadius: '6px', border: '1px solid rgba(118,185,0,0.25)' }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem' }}>How to get a free NVIDIA API key</div>
              <ol style={{ margin: '0 0 0.6rem 0', paddingLeft: '1.25rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: 1.7 }}>
                <li>Visit <strong>build.nvidia.com</strong> and sign in (free account)</li>
                <li>Click your avatar → <strong>Get API Key</strong></li>
                <li>Copy the key and paste it below, then click <strong>Save Configuration</strong></li>
              </ol>
              <button className="btn btn-small" onClick={() => window.alloAPI?.openExternal('https://build.nvidia.com')}
                style={{ fontSize: '0.8rem' }}>
                Open NVIDIA Build ↗
              </button>
            </div>

            {/* API key field */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>API Key</label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type={showNvidiaKey ? 'text' : 'password'}
                  value={nvidiaApiKey}
                  onChange={e => setNvidiaApiKey(e.target.value)}
                  placeholder="nvapi-..."
                  style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.8rem' }}
                />
                <button className="btn btn-small" onClick={() => setShowNvidiaKey(v => !v)} style={{ flexShrink: 0 }}>
                  {showNvidiaKey ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {/* Text Generation Model */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>
                🧠 Text Generation Model
              </label>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '0 0 0.35rem 0' }}>
                Used for content engine, outlines, and all text-only AI calls. Choose a fast instruct model.
              </p>
              <select value={nvidiaTextModel} onChange={e => setNvidiaTextModel(e.target.value)} style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                <option value="meta/llama-3.3-70b-instruct">meta/llama-3.3-70b-instruct (recommended — fast, high quality)</option>
                <option value="meta/llama-3.1-70b-instruct">meta/llama-3.1-70b-instruct</option>
                <option value="nvidia/llama-3.1-nemotron-70b-instruct-hf">nvidia/llama-3.1-nemotron-70b-instruct-hf (NVIDIA-optimized)</option>
                <option value="mistralai/mixtral-8x7b-instruct-v0.1">mistralai/mixtral-8x7b-instruct-v0.1 (Mixtral MoE)</option>
                <option value="nvidia/nemotron-3-nano-omni-30b-a3b-reasoning">nvidia/nemotron-3-nano-omni-30b-a3b-reasoning (Omni reasoning — slower)</option>
              </select>
            </div>

            {/* Multimodal / Omni Model */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>
                🎤 Multimodal Model (audio / video / image)
              </label>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '0 0 0.35rem 0' }}>
                Used for student voice input, fluency recordings, video transcription, and file upload. Must support audio/video.
              </p>
              <select value={nvidiaOmniModel} onChange={e => setNvidiaOmniModel(e.target.value)} style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                <option value="nvidia/nemotron-3-nano-omni-30b-a3b-reasoning">nvidia/nemotron-3-nano-omni-30b-a3b-reasoning (Omni — text/image/audio/video)</option>
                <option value="nvidia/nemotron-nano-12b-v2-vl">nvidia/nemotron-nano-12b-v2-vl (Vision-Language, image only)</option>
                <option value="nvidia/llama-3.1-nemotron-nano-vl-8b-v1">nvidia/llama-3.1-nemotron-nano-vl-8b-v1 (Llama VL, image only)</option>
                <option value="meta/llama-3.2-90b-vision-instruct">meta/llama-3.2-90b-vision-instruct (Llama vision, image only)</option>
              </select>
            </div>

            <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', margin: 0 }}>
              API key saved to <code>~/.alloflow/ai_config.json</code> — local only, never uploaded. See <strong>NVIDIA_SETUP.md</strong> for full setup guide.
            </p>
          </div>
        </div>
      )}

      {/* Save */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          className={saved ? 'btn btn-success' : 'btn btn-primary'}
          onClick={handleSave}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '160px', justifyContent: 'center' }}
        >
          <Save size={16} />
          {saved ? '✓ Saved!' : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
}

