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
  const [geminiStatus, setGeminiStatus] = useState(null); // null | { connected, email, expiry }
  const [geminiConnecting, setGeminiConnecting] = useState(false);

  // Copilot / Azure OpenAI
  const [copilotClientId, setCopilotClientId] = useState('');
  const [copilotTenantId, setCopilotTenantId] = useState('');
  const [copilotEndpoint, setCopilotEndpoint] = useState('');
  const [copilotStatus, setCopilotStatus] = useState(null);
  const [copilotConnecting, setCopilotConnecting] = useState(false);

  useEffect(() => {
    loadConfig();
    checkStatuses();
    checkGeminiStatus();
    checkCopilotStatus();
  }, []);

  const checkGeminiStatus = async () => {
    const result = await window.alloAPI?.geminiOAuth?.status?.();
    setGeminiStatus(result || { connected: false });
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
        setCopilotClientId(aiCfg.copilot?.clientId || '');
        setCopilotTenantId(aiCfg.copilot?.tenantId || '');
        setCopilotEndpoint(aiCfg.copilot?.endpoint || '');
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
          googleClientId:     googleClientId.trim() || undefined,
          googleClientSecret: googleClientSecret.trim() || undefined,
          copilot: (copilotClientId.trim() || copilotTenantId.trim() || copilotEndpoint.trim()) ? {
            clientId: copilotClientId.trim(),
            tenantId: copilotTenantId.trim(),
            endpoint: copilotEndpoint.trim(),
          } : undefined,
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
            { value: 'gemini',  label: '✨ Google Gemini',           desc: 'Cloud AI via Google — text + image generation. Requires Google sign-in.' },
            { value: 'copilot', label: '🤖 Microsoft Copilot',      desc: 'Cloud AI via Azure OpenAI — text + DALL-E images. Requires Entra ID sign-in.' },
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

          {/* Gemini OAuth section — show when Gemini selected as AI provider or image provider */}
          {(aiProvider === 'gemini' || (aiProvider === 'local' && imageProvider === 'gemini')) && (
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

              {/* OAuth credentials */}
              <details style={{ marginTop: '0.875rem' }} open={!googleClientId}>
                <summary style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', cursor: 'pointer', fontWeight: 600 }}>
                  {googleClientId ? '⚙ OAuth credentials (saved)' : '⚙ Setup required — get your OAuth credentials'}
                </summary>
                <div style={{ marginTop: '0.875rem', display: 'grid', gap: '1rem' }}>

                  {/* Step 1 */}
                  <div style={{ padding: '0.75rem', background: 'rgba(66,133,244,0.06)', borderRadius: '6px', border: '1px solid rgba(66,133,244,0.2)' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem' }}>Step 1 — Create a Google Cloud project</div>
                    <ol style={{ margin: '0 0 0.6rem 0', paddingLeft: '1.25rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: 1.7 }}>
                      <li>Click <strong>Open Google Cloud Console</strong> below — sign in with your Google account</li>
                      <li>In the top bar, click the project dropdown (it says <strong>"Select a project"</strong>)</li>
                      <li>Click <strong>New Project</strong> in the top-right of the popup</li>
                      <li>Name it anything (e.g. <em>AlloFlow</em>) and click <strong>Create</strong></li>
                      <li>Make sure the new project is selected in the top bar before continuing</li>
                    </ol>
                    <button className="btn btn-small" onClick={() => window.alloAPI?.openExternal('https://console.cloud.google.com/projectcreate')}
                      style={{ fontSize: '0.8rem' }}>
                      Open Google Cloud Console ↗
                    </button>
                  </div>

                  {/* Step 2 */}
                  <div style={{ padding: '0.75rem', background: 'rgba(66,133,244,0.06)', borderRadius: '6px', border: '1px solid rgba(66,133,244,0.2)' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem' }}>Step 2 — Enable the Generative Language API</div>
                    <ol style={{ margin: '0 0 0.6rem 0', paddingLeft: '1.25rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: 1.7 }}>
                      <li>Click <strong>Open API Library</strong> below</li>
                      <li>Make sure your new project is still selected at the top</li>
                      <li>Click the big blue <strong>Enable</strong> button</li>
                      <li>Wait for it to turn green — done</li>
                    </ol>
                    <button className="btn btn-small" onClick={() => window.alloAPI?.openExternal('https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com')}
                      style={{ fontSize: '0.8rem' }}>
                      Open API Library ↗
                    </button>
                  </div>

                  {/* Step 3 */}
                  <div style={{ padding: '0.75rem', background: 'rgba(66,133,244,0.06)', borderRadius: '6px', border: '1px solid rgba(66,133,244,0.2)' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem', color: '#d32f2f' }}>Step 3 — Configure OAuth consent (MUST ADD YOURSELF AS TEST USER)</div>
                    <ol style={{ margin: '0 0 0.6rem 0', paddingLeft: '1.25rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: 1.7 }}>
                      <li>Click <strong>Open Consent Screen</strong> below</li>
                      <li>Choose <strong>External</strong> (or Internal if you have Google Workspace) → click <strong>Create</strong></li>
                      <li>Fill in <strong>App name</strong> (e.g. <em>AlloFlow</em>) and your email in the support email field</li>
                      <li>Scroll to the bottom and click <strong>Save and Continue</strong></li>
                      <li>On the <strong>Scopes</strong> page, scroll down and click <strong>Save and Continue</strong> (no changes needed)</li>
                      <li><strong style={{ color: '#d32f2f' }}>⚠ CRITICAL:</strong> Click <strong>Open Test Users</strong> below → click <strong>+ Add users</strong> button and enter your own Gmail address (the email you'll use to sign in to AlloFlow), then click <strong>Save and Continue</strong></li>
                      <li>Click <strong>Back to Dashboard</strong></li>
                    </ol>
                    <div style={{ display: 'grid', gap: '0.5rem', gridTemplateColumns: '1fr 1fr' }}>
                      <button className="btn btn-small" onClick={() => window.alloAPI?.openExternal('https://console.cloud.google.com/apis/credentials/consent')}
                        style={{ fontSize: '0.8rem' }}>
                        Open Consent Screen ↗
                      </button>
                      <button className="btn btn-small" onClick={() => window.alloAPI?.openExternal('https://console.cloud.google.com/auth/audience')}
                        style={{ fontSize: '0.8rem', background: '#d32f2f', color: 'white', border: 'none' }}>
                        Open Test Users ↗
                      </button>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div style={{ padding: '0.75rem', background: 'rgba(66,133,244,0.06)', borderRadius: '6px', border: '1px solid rgba(66,133,244,0.2)' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem' }}>Step 4 — Create OAuth credentials</div>
                    <ol style={{ margin: '0 0 0.6rem 0', paddingLeft: '1.25rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: 1.7 }}>
                      <li>Click <strong>Open Credentials</strong> below</li>
                      <li>Click <strong>+ Create Credentials</strong> at the top → choose <strong>OAuth client ID</strong></li>
                      <li>For <strong>Application type</strong>, select <strong>Desktop app</strong></li>
                      <li>Name it anything (e.g. <em>AlloFlow Desktop</em>) → click <strong>Create</strong></li>
                      <li>A popup shows your <strong>Client ID</strong> and <strong>Client secret</strong></li>
                      <li>Copy them into the fields below, then click Save Configuration at the bottom of this page</li>
                    </ol>
                    <button className="btn btn-small" onClick={() => window.alloAPI?.openExternal('https://console.cloud.google.com/apis/credentials')}
                      style={{ fontSize: '0.8rem' }}>
                      Open Credentials ↗
                    </button>
                  </div>

                  {/* School accounts note */}
                  <div style={{ padding: '0.75rem', background: 'rgba(245,158,11,0.08)', borderRadius: '6px', border: '1px solid rgba(245,158,11,0.3)', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    <strong>⚠ Using a school Google Workspace account?</strong><br/>
                    Your IT admin needs to approve the app once. They go to: <strong>admin.google.com</strong> →
                    Security → Access and data control → API controls → Manage third-party app access →
                    Add app → search by OAuth Client ID → set access to <strong>Trusted</strong>.<br/>
                    <button className="btn btn-small" onClick={() => window.alloAPI?.openExternal('https://admin.google.com/ac/owl/list?tab=apps')}
                      style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
                      Open Admin Console (for IT admin) ↗
                    </button>
                  </div>

                  {/* Error 403 troubleshooting */}
                  <div style={{ padding: '0.75rem', background: 'rgba(211,47,47,0.08)', borderRadius: '6px', border: '1px solid rgba(211,47,47,0.3)', fontSize: '0.8rem', color: '#d32f2f' }}>
                    <strong>⚠ Getting "Error 403: access_denied"?</strong><br/>
                    <span style={{ color: 'var(--color-text-muted)' }}>You did not add yourself as a Test User in Step 3. Review the setup steps above, complete Step 3 item 6 (click <strong>+ Add users</strong> and enter your email), then restart AlloFlow and sign in again.</span>
                  </div>

                  {/* Credential inputs */}
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
                    Saved to <code>~/.alloflow/ai_config.json</code> — local only, never uploaded.
                  </p>
                </div>
              </details>
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

