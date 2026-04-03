import React, { useState, useEffect } from 'react';
import { HardDrive, Mic, Database, Save, RefreshCw } from 'lucide-react';

export default function AIConfig() {
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [defaultModel, setDefaultModel] = useState('');
  const [piperEnabled, setPiperEnabled] = useState(true);
  const [installedModels, setInstalledModels] = useState([]);
  const [ollamaStatus, setOllamaStatus] = useState('checking'); // 'ok' | 'error' | 'checking'
  const [sqliteStatus, setSqliteStatus] = useState('checking');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfig();
    checkStatuses();
  }, []);

  const loadConfig = async () => {
    try {
      if (window.alloAPI?.localApp) {
        const cfg = await window.alloAPI.localApp.readConfig();
        if (cfg) {
          setOllamaUrl(cfg.ollamaUrl || 'http://localhost:11434');
          setDefaultModel(cfg.defaultModel || '');
          setPiperEnabled(cfg.piperEnabled !== false);
        }
      }
    } catch (err) {
      console.error('[AIConfig] Error loading config:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkStatuses = async () => {
    // Check Ollama
    try {
      const result = await window.alloAPI?.ollama?.checkStatus?.();
      setOllamaStatus(result?.running ? 'ok' : 'error');
      if (result?.running) {
        const models = await window.alloAPI.ollama.getInstalledModels();
        setInstalledModels(models || []);
      }
    } catch {
      setOllamaStatus('error');
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
        await window.alloAPI.localApp.writeConfig({ ollamaUrl, defaultModel, piperEnabled });
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error('[AIConfig] Error saving config:', err);
    }
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
        <p>Configure local AI services — Ollama and Piper TTS</p>
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
            {statusDot(ollamaStatus)}
            <div>
              <div style={{ fontWeight: 600 }}>🧠 Ollama (LLM Engine)</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                {ollamaStatus === 'ok' ? `Running — ${installedModels.length} model(s) installed` : ollamaStatus === 'error' ? 'Not running — start via Services tab' : 'Checking...'}
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

      {/* Ollama Settings */}
      <div className="card">
        <div className="card-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <HardDrive size={18} /> Ollama Settings
          </h3>
        </div>
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Ollama Server URL
            </label>
            <input
              type="text"
              value={ollamaUrl}
              onChange={(e) => setOllamaUrl(e.target.value)}
              placeholder="http://localhost:11434"
              style={{ width: '100%', fontFamily: 'monospace' }}
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
              Default: http://localhost:11434 — only change if Ollama is on a different port
            </p>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Default Model
            </label>
            {installedModels.length > 0 ? (
              <select value={defaultModel} onChange={(e) => setDefaultModel(e.target.value)} style={{ width: '100%' }}>
                <option value="">— Auto-select first available —</option>
                {installedModels.map(m => (
                  <option key={m.name || m} value={m.name || m}>{m.name || m}</option>
                ))}
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
            <li>Ollama models: <code>~/.alloflow/data/ollama/models/</code></li>
            <li>Piper voices: <code>~/.alloflow/data/piper/</code></li>
          </ul>
          <p style={{ marginTop: '0.75rem', color: 'var(--color-success)', fontWeight: 500 }}>
            ✓ No cloud services. No API keys. No internet required after setup.
          </p>
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

