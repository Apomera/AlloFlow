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

  // Image generation
  const [imageProvider, setImageProvider] = useState('flux');
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleClientSecret, setGoogleClientSecret] = useState('');
  const [geminiStatus, setGeminiStatus] = useState(null); // null | { connected, email, expiry }
  const [geminiConnecting, setGeminiConnecting] = useState(false);

  useEffect(() => {
    loadConfig();
    checkStatuses();
    checkGeminiStatus();
  }, []);

  const checkGeminiStatus = async () => {
    const result = await window.alloAPI?.geminiOAuth?.status?.();
    setGeminiStatus(result || { connected: false });
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
      // Load AI config (image provider + OAuth creds)
      const aiCfg = await window.alloAPI?.readAIConfig?.();
      if (aiCfg) {
        setImageProvider(aiCfg.imageProvider || 'flux');
        setGoogleClientId(aiCfg.googleClientId || '');
        setGoogleClientSecret(aiCfg.googleClientSecret || '');
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
          imageProvider,
          googleClientId:     googleClientId.trim() || undefined,
          googleClientSecret: googleClientSecret.trim() || undefined,
        });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('[AIConfig] Error saving config:', err);
    }
  };

  const handleGeminiConnect = async () => {
    setGeminiConnecting(true);
    try {
      const result = await window.alloAPI?.geminiOAuth?.start?.();
      if (result?.success) {
        await checkGeminiStatus();
        // Re-open local app so it picks up the new access token on page load
        window.alloAPI?.localApp?.reload?.();
      } else {
        alert('Google sign-in failed: ' + (result?.error || 'Unknown error'));
      }
    } finally {
      setGeminiConnecting(false);
    }
  };

  const handleGeminiDisconnect = async () => {
    await window.alloAPI?.geminiOAuth?.revoke?.();
    setGeminiStatus({ connected: false });
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

      {/* Image Generation */}
      <div className="card">
        <div className="card-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Image size={18} /> Image Generation
          </h3>
        </div>
        <div style={{ display: 'grid', gap: '1rem' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', margin: 0 }}>
            Choose where AI-generated images come from. Local Flux requires the Flux server running.
            Google Gemini uses your Google account — no extra cost on the free tier (15 images/day).
          </p>

          {/* Provider radio */}
          {[
            { value: 'flux',   label: '🖥️ Local Flux (default)',   desc: 'Runs on your GPU via the local Flux server at port 7860.' },
            { value: 'gemini', label: '✨ Google Gemini Imagen',    desc: 'Cloud image generation via Google AI. Requires Google sign-in.' },
          ].map(opt => (
            <label key={opt.value} style={{
              display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.875rem',
              backgroundColor: imageProvider === opt.value ? 'rgba(26,115,232,0.08)' : 'var(--color-bg)',
              borderRadius: '8px',
              border: `2px solid ${imageProvider === opt.value ? '#1a73e8' : 'var(--color-border)'}`,
              cursor: 'pointer'
            }}>
              <input
                type="radio" name="imageProvider" value={opt.value}
                checked={imageProvider === opt.value}
                onChange={() => setImageProvider(opt.value)}
                style={{ marginTop: '2px', accentColor: '#1a73e8' }}
              />
              <div>
                <div style={{ fontWeight: 600 }}>{opt.label}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{opt.desc}</div>
              </div>
            </label>
          ))}

          {/* Gemini OAuth section */}
          {imageProvider === 'gemini' && (
            <div style={{ padding: '1rem', backgroundColor: 'var(--color-bg)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
              <div style={{ fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" width={16} height={16} onError={e => e.target.style.display='none'} />
                Google Account
              </div>

              {geminiStatus?.connected ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>✓ Connected</span>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginLeft: '0.5rem' }}>
                      {geminiStatus.email}
                    </span>
                  </div>
                  <button className="btn btn-small" onClick={handleGeminiDisconnect}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#ef4444', borderColor: '#ef4444' }}>
                    <LogOut size={13} /> Disconnect
                  </button>
                </div>
              ) : (
                <div>
                  <button
                    className="btn btn-primary"
                    onClick={handleGeminiConnect}
                    disabled={geminiConnecting || !googleClientId}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    <LogIn size={15} />
                    {geminiConnecting ? 'Opening browser...' : 'Sign in with Google'}
                  </button>
                  {!googleClientId && (
                    <p style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: '0.5rem' }}>
                      ⚠ Enter your Google OAuth Client ID below to enable sign-in.
                    </p>
                  )}
                </div>
              )}

              {/* OAuth credentials (collapsible) */}
              <details style={{ marginTop: '0.875rem' }}>
                <summary style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
                  OAuth credentials (required once)
                </summary>
                <div style={{ marginTop: '0.75rem', display: 'grid', gap: '0.5rem' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0 }}>
                    1. Go to <strong>console.cloud.google.com</strong> → APIs &amp; Services → Credentials<br/>
                    2. Create project → Enable "Generative Language API"<br/>
                    3. Create OAuth 2.0 Client ID → type: <strong>Desktop app</strong><br/>
                    4. Copy Client ID and Client Secret below
                  </p>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Client ID</label>
                    <input
                      type="text" value={googleClientId}
                      onChange={e => setGoogleClientId(e.target.value)}
                      placeholder="123456789-xxxx.apps.googleusercontent.com"
                      style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.8rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Client Secret</label>
                    <input
                      type="password" value={googleClientSecret}
                      onChange={e => setGoogleClientSecret(e.target.value)}
                      placeholder="GOCSPX-..."
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

