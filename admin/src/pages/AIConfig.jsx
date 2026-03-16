import React, { useState, useEffect } from 'react';
import { Cloud, HardDrive, Zap, Eye, EyeOff, Save, DollarSign } from 'lucide-react';

export default function AIConfig() {
  const [backend, setBackend] = useState('local'); // 'local' | 'cloud' | 'hybrid'
  const [cloudProvider, setCloudProvider] = useState('gemini'); // 'gemini' | 'openai' | 'claude'
  const [apiKeys, setApiKeys] = useState({
    gemini: '',
    openai: '',
    claude: ''
  });
  const [showKeys, setShowKeys] = useState({
    gemini: false,
    openai: false,
    claude: false
  });
  const [models, setModels] = useState({
    default: 'gemini-2.5-flash',
    image: 'flux-schnell',
    tts: 'edge-tts'
  });
  const [smartRouting, setSmartRouting] = useState({
    enabled: true,
    responseTimeThreshold: 5, // seconds
    queueThreshold: 10, // pending requests
    healthCheckInterval: 30, // seconds
    retryAttempts: 2
  });
  const [saved, setSaved] = useState(false);

  // Load config on mount
  useEffect(() => {
    const loadConfig = async () => {
      if (window.alloAPI) {
        const config = await window.alloAPI.readAIConfig();
        if (config) {
          setBackend(config.backend || 'local');
          setCloudProvider(config.cloudProvider || 'gemini');
          setApiKeys(config.apiKeys || { gemini: '', openai: '', claude: '' });
          setModels(config.models || { default: 'gemini-2.5-flash', image: 'flux-schnell', tts: 'edge-tts' });
          setSmartRouting(config.smartRouting || {
            enabled: true,
            responseTimeThreshold: 5,
            queueThreshold: 10,
            healthCheckInterval: 30,
            retryAttempts: 2
          });
        }
      }
    };
    loadConfig();
  }, []);

  const handleSave = async () => {
    if (window.alloAPI) {
      const config = {
        backend,
        cloudProvider,
        apiKeys,
        models,
        smartRouting
      };
      const result = await window.alloAPI.writeAIConfig(config);
      if (result.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    }
  };

  const toggleShowKey = (provider) => {
    setShowKeys({ ...showKeys, [provider]: !showKeys[provider] });
  };

  const estimateMonthlyCost = () => {
    if (backend === 'local') return { amount: 0, note: 'Free (hardware costs only)' };
    if (backend === 'cloud') {
      switch (cloudProvider) {
        case 'gemini': return { amount: 25, note: 'Est. 10K requests/mo @ $0.0025/1K' };
        case 'openai': return { amount: 75, note: 'Est. GPT-4o mini usage' };
        case 'claude': return { amount: 50, note: 'Est. Claude Sonnet usage' };
        default: return { amount: 0, note: '' };
      }
    }
    if (backend === 'hybrid') return { amount: 15, note: 'Est. 3K cloud requests/mo' };
    return { amount: 0, note: '' };
  };

  const cost = estimateMonthlyCost();

  return (
    <div className="page">
      <div className="page-header">
        <h2>AI Backend Configuration</h2>
        <p>Choose between local AI (Ollama), cloud AI (Gemini/OpenAI/Claude), or hybrid mode</p>
      </div>

      {/* Backend Selection */}
      <div className="card">
        <div className="card-header">
          <h3>Primary AI Backend</h3>
        </div>
        <div style={{ display: 'grid', gap: '1rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', backgroundColor: backend === 'local' ? 'rgba(59, 130, 246, 0.1)' : 'var(--color-bg)', borderRadius: '8px', border: `2px solid ${backend === 'local' ? 'var(--color-primary)' : 'var(--color-border)'}`, cursor: 'pointer' }}>
            <input
              type="radio"
              name="backend"
              value="local"
              checked={backend === 'local'}
              onChange={(e) => setBackend(e.target.value)}
              style={{ width: '18px', height: '18px' }}
            />
            <HardDrive size={24} style={{ color: backend === 'local' ? 'var(--color-primary)' : 'var(--color-text-muted)' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>💻 Local AI (Ollama)</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                Run all AI models locally via Docker. Fully offline, no API keys required.
              </div>
            </div>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', backgroundColor: backend === 'cloud' ? 'rgba(59, 130, 246, 0.1)' : 'var(--color-bg)', borderRadius: '8px', border: `2px solid ${backend === 'cloud' ? 'var(--color-primary)' : 'var(--color-border)'}`, cursor: 'pointer' }}>
            <input
              type="radio"
              name="backend"
              value="cloud"
              checked={backend === 'cloud'}
              onChange={(e) => setBackend(e.target.value)}
              style={{ width: '18px', height: '18px' }}
            />
            <Cloud size={24} style={{ color: backend === 'cloud' ? 'var(--color-primary)' : 'var(--color-text-muted)' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>☁️ Cloud AI (Gemini/OpenAI/Claude)</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                Use cloud AI APIs. Requires API keys and internet connection.
              </div>
            </div>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', backgroundColor: backend === 'hybrid' ? 'rgba(59, 130, 246, 0.1)' : 'var(--color-bg)', borderRadius: '8px', border: `2px solid ${backend === 'hybrid' ? 'var(--color-primary)' : 'var(--color-border)'}`, cursor: 'pointer' }}>
            <input
              type="radio"
              name="backend"
              value="hybrid"
              checked={backend === 'hybrid'}
              onChange={(e) => setBackend(e.target.value)}
              style={{ width: '18px', height: '18px' }}
            />
            <Zap size={24} style={{ color: backend === 'hybrid' ? 'var(--color-primary)' : 'var(--color-text-muted)' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>🔀 Hybrid Mode</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                Use local AI for privacy-sensitive tasks, cloud AI for advanced features.
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Cloud Provider Selection (if cloud or hybrid) */}
      {(backend === 'cloud' || backend === 'hybrid') && (
        <>
          <div className="card">
            <div className="card-header">
              <h3>Cloud Provider</h3>
            </div>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', backgroundColor: cloudProvider === 'gemini' ? 'rgba(59, 130, 246, 0.1)' : 'var(--color-bg)', borderRadius: '6px', border: `1px solid ${cloudProvider === 'gemini' ? 'var(--color-primary)' : 'var(--color-border)'}`, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="cloudProvider"
                  value="gemini"
                  checked={cloudProvider === 'gemini'}
                  onChange={(e) => setCloudProvider(e.target.value)}
                />
                <span style={{ fontWeight: 600 }}>Google Gemini 2.5</span>
                <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginLeft: 'auto' }}>~$0.0025/1K tokens</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', backgroundColor: cloudProvider === 'openai' ? 'rgba(59, 130, 246, 0.1)' : 'var(--color-bg)', borderRadius: '6px', border: `1px solid ${cloudProvider === 'openai' ? 'var(--color-primary)' : 'var(--color-border)'}`, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="cloudProvider"
                  value="openai"
                  checked={cloudProvider === 'openai'}
                  onChange={(e) => setCloudProvider(e.target.value)}
                />
                <span style={{ fontWeight: 600 }}>OpenAI GPT-4o Mini</span>
                <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginLeft: 'auto' }}>~$0.015/1K tokens</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', backgroundColor: cloudProvider === 'claude' ? 'rgba(59, 130, 246, 0.1)' : 'var(--color-bg)', borderRadius: '6px', border: `1px solid ${cloudProvider === 'claude' ? 'var(--color-primary)' : 'var(--color-border)'}`, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="cloudProvider"
                  value="claude"
                  checked={cloudProvider === 'claude'}
                  onChange={(e) => setCloudProvider(e.target.value)}
                />
                <span style={{ fontWeight: 600 }}>Anthropic Claude Sonnet</span>
                <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginLeft: 'auto' }}>~$0.003/1K tokens</span>
              </label>
            </div>
          </div>

          {/* API Keys */}
          <div className="card">
            <div className="card-header">
              <h3>API Keys</h3>
            </div>
            <div style={{ display: 'grid', gap: '1rem' }}>
              {/* Gemini API Key */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  Google Gemini API Key
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type={showKeys.gemini ? 'text' : 'password'}
                    value={apiKeys.gemini}
                    onChange={(e) => setApiKeys({ ...apiKeys, gemini: e.target.value })}
                    placeholder="AIzaSy..."
                    style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.875rem' }}
                  />
                  <button className="btn btn-small" onClick={() => toggleShowKey('gemini')}>
                    {showKeys.gemini ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                  Get your key at: <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)' }}>aistudio.google.com/apikey</a>
                </p>
              </div>

              {/* OpenAI API Key */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  OpenAI API Key
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type={showKeys.openai ? 'text' : 'password'}
                    value={apiKeys.openai}
                    onChange={(e) => setApiKeys({ ...apiKeys, openai: e.target.value })}
                    placeholder="sk-proj-..."
                    style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.875rem' }}
                  />
                  <button className="btn btn-small" onClick={() => toggleShowKey('openai')}>
                    {showKeys.openai ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                  Get your key at: <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)' }}>platform.openai.com/api-keys</a>
                </p>
              </div>

              {/* Claude API Key */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  Anthropic Claude API Key
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type={showKeys.claude ? 'text' : 'password'}
                    value={apiKeys.claude}
                    onChange={(e) => setApiKeys({ ...apiKeys, claude: e.target.value })}
                    placeholder="sk-ant-..."
                    style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.875rem' }}
                  />
                  <button className="btn btn-small" onClick={() => toggleShowKey('claude')}>
                    {showKeys.claude ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                  Get your key at: <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)' }}>console.anthropic.com/settings/keys</a>
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Model Selection */}
      <div className="card">
        <div className="card-header">
          <h3>Model Assignments</h3>
        </div>
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Default Text Model
            </label>
            <select
              value={models.default}
              onChange={(e) => setModels({ ...models, default: e.target.value })}
            >
              {(backend === 'local' || backend === 'hybrid') && (
                <optgroup label="Local Models">
                  <option value="deepseek-r1:1.5b">DeepSeek R1 1.5B (local)</option>
                  <option value="phi3.5">Phi 3.5 (local)</option>
                  <option value="qwen:3b">Qwen 2.5 3B (local)</option>
                </optgroup>
              )}
              {(backend === 'cloud' || backend === 'hybrid') && (
                <optgroup label="Cloud Models">
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                  <option value="gpt-4o-mini">GPT-4o Mini</option>
                  <option value="claude-3.5-sonnet">Claude 3.5 Sonnet</option>
                </optgroup>
              )}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Image Generation Model
            </label>
            <select
              value={models.image}
              onChange={(e) => setModels({ ...models, image: e.target.value })}
            >
              {(backend === 'local' || backend === 'hybrid') && (
                <optgroup label="Local Models">
                  <option value="flux-schnell">Flux Schnell (local)</option>
                  <option value="flux-dev">Flux Dev (local, slower)</option>
                </optgroup>
              )}
              {(backend === 'cloud' || backend === 'hybrid') && (
                <optgroup label="Cloud Models">
                  <option value="imagen-4.0">Google Imagen 4.0</option>
                  <option value="dall-e-3">DALL-E 3</option>
                </optgroup>
              )}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Text-to-Speech Model
            </label>
            <select
              value={models.tts}
              onChange={(e) => setModels({ ...models, tts: e.target.value })}
            >
              <optgroup label="Local Models">
                <option value="edge-tts">Edge TTS (local, free)</option>
                <option value="piper">Piper TTS (local, offline)</option>
              </optgroup>
              {(backend === 'cloud' || backend === 'hybrid') && (
                <optgroup label="Cloud Models">
                  <option value="gemini-tts">Gemini TTS</option>
                </optgroup>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Smart Routing (Hybrid Mode Only) */}
      {backend === 'hybrid' && (
        <div className="card">
          <div className="card-header">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Zap size={20} /> Smart Routing
            </h3>
          </div>
          <div>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
              Automatically route requests to cloud AI when local servers are overloaded.
            </p>
            
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', backgroundColor: smartRouting.enabled ? 'rgba(16, 185, 129, 0.1)' : 'var(--color-bg)', borderRadius: '8px', border: `2px solid ${smartRouting.enabled ? 'var(--color-success)' : 'var(--color-border)'}`, cursor: 'pointer', marginBottom: '1rem' }}>
              <input
                type="checkbox"
                checked={smartRouting.enabled}
                onChange={(e) => setSmartRouting({ ...smartRouting, enabled: e.target.checked })}
                style={{ width: '18px', height: '18px' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                  {smartRouting.enabled ? '✓ Enabled' : 'Disabled'}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                  {smartRouting.enabled 
                    ? 'Requests will automatically failover to cloud when local is slow or overloaded'
                    : 'Always use local AI first, no automatic cloud fallback'}
                </div>
              </div>
            </label>

            {smartRouting.enabled && (
              <div style={{ display: 'grid', gap: '1rem', padding: '1rem', backgroundColor: 'var(--color-bg)', borderRadius: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                    Response Time Threshold (seconds)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={smartRouting.responseTimeThreshold}
                    onChange={(e) => setSmartRouting({ ...smartRouting, responseTimeThreshold: parseInt(e.target.value) })}
                    style={{ width: '100%' }}
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                    If local AI takes longer than this, route to cloud instead
                  </p>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                    Queue Threshold (pending requests)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={smartRouting.queueThreshold}
                    onChange={(e) => setSmartRouting({ ...smartRouting, queueThreshold: parseInt(e.target.value) })}
                    style={{ width: '100%' }}
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                    If local server has more than this many queued requests, use cloud
                  </p>
                </div>

                <div className="grid grid-2">
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                      Health Check Interval (sec)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="300"
                      value={smartRouting.healthCheckInterval}
                      onChange={(e) => setSmartRouting({ ...smartRouting, healthCheckInterval: parseInt(e.target.value) })}
                      style={{ width: '100%' }}
                    />
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                      How often to check local server health
                    </p>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                      Retry Attempts
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="5"
                      value={smartRouting.retryAttempts}
                      onChange={(e) => setSmartRouting({ ...smartRouting, retryAttempts: parseInt(e.target.value) })}
                      style={{ width: '100%' }}
                    />
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                      Times to retry local before using cloud
                    </p>
                  </div>
                </div>

                <div style={{ padding: '0.75rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '6px', fontSize: '0.875rem' }}>
                  <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-primary)' }}>
                    💡 Current Configuration
                  </div>
                  <ul style={{ paddingLeft: '1.25rem', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                    <li>Failover if local response takes &gt; {smartRouting.responseTimeThreshold}s</li>
                    <li>Failover if local queue has &gt; {smartRouting.queueThreshold} requests</li>
                    <li>Check local health every {smartRouting.healthCheckInterval}s</li>
                    <li>Retry local {smartRouting.retryAttempts}x before cloud fallback</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cost Estimator */}
      <div className="card">
        <div className="card-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <DollarSign size={20} /> Estimated Monthly Cost
          </h3>
        </div>
        <div style={{ textAlign: 'center', padding: '1.5rem' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: cost.amount === 0 ? 'var(--color-success)' : 'var(--color-warning)', marginBottom: '0.5rem' }}>
            ${cost.amount}
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            {cost.note}
          </div>
          {backend === 'local' && (
            <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '6px', fontSize: '0.875rem', color: 'var(--color-success)' }}>
              ✓ No recurring API costs. Hardware requirements: 8GB RAM, 20GB disk space.
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
        <button
          className={saved ? 'btn btn-success' : 'btn btn-primary'}
          onClick={handleSave}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '150px', justifyContent: 'center' }}
        >
          <Save size={16} />
          {saved ? '✓ Saved!' : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
}
