import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, AlertCircle } from 'lucide-react';

export default function Settings() {
  const [settings, setSettings] = useState({
    serverUrl: 'http://localhost:3000',
    serverPort: 3000,
    adminEmail: '',
    dockerDir: '',
    autoStartEnabled: false,
    debugMode: false,
  });

  const [originalSettings, setOriginalSettings] = useState(settings);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  // Track if there are unsaved changes
  useEffect(() => {
    const changed = JSON.stringify(settings) !== JSON.stringify(originalSettings);
    setHasChanges(changed);
  }, [settings, originalSettings]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const result = await window.alloAPI?.getSystemConfig?.();
      if (result?.success) {
        const loaded = {
          serverUrl: result.config?.serverUrl || 'http://localhost:3000',
          serverPort: result.config?.serverPort || 3000,
          adminEmail: result.config?.adminEmail || '',
          dockerDir: result.config?.dockerDir || '',
          autoStartEnabled: result.config?.autoStartEnabled || false,
          debugMode: result.config?.debugMode || false,
        };
        setSettings(loaded);
        setOriginalSettings(loaded);
        setMessage(null);
      } else {
        setMessage({ type: 'error', text: result?.error || 'Failed to load settings' });
      }
    } catch (err) {
      console.error('Error loading settings:', err);
      setMessage({ type: 'error', text: `Error: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await window.alloAPI?.saveSystemConfig?.(settings);
      if (result?.success) {
        setOriginalSettings(settings);
        setMessage({ type: 'success', text: 'Settings saved successfully' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: result?.error || 'Failed to save settings' });
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      setMessage({ type: 'error', text: `Error: ${err.message}` });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(originalSettings);
    setMessage(null);
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>System Settings</h2>
        <p>Configure AlloFlow Admin Center</p>
      </div>

      {message && (
        <div className={`message-box message-${message.type}`} style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{message.text}</span>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <RefreshCw style={{ animation: 'spin 1s linear infinite', marginBottom: '1rem' }} />
          <p>Loading settings...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-2" style={{ marginBottom: '2rem' }}>
            {/* Server Configuration */}
            <div className="card">
              <h3 style={{ marginBottom: '1.5rem' }}>Server Configuration</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <label htmlFor="serverUrl" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                    Server URL
                  </label>
                  <input
                    id="serverUrl"
                    type="text"
                    value={settings.serverUrl}
                    onChange={(e) => handleChange('serverUrl', e.target.value)}
                    placeholder="e.g., http://localhost:3000"
                    style={{ width: '100%' }}
                  />
                  <small style={{ color: 'var(--color-text-muted)', display: 'block', marginTop: '0.5rem' }}>
                    The URL where AlloFlow services are accessible
                  </small>
                </div>

                <div>
                  <label htmlFor="serverPort" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                    Server Port
                  </label>
                  <input
                    id="serverPort"
                    type="number"
                    value={settings.serverPort}
                    onChange={(e) => handleChange('serverPort', parseInt(e.target.value) || 3000)}
                    placeholder="3000"
                    style={{ width: '100%' }}
                  />
                  <small style={{ color: 'var(--color-text-muted)', display: 'block', marginTop: '0.5rem' }}>
                    Main server port for AlloFlow services
                  </small>
                </div>
              </div>
            </div>

            {/* Admin Settings */}
            <div className="card">
              <h3 style={{ marginBottom: '1.5rem' }}>Administration</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <label htmlFor="adminEmail" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                    Admin Email
                  </label>
                  <input
                    id="adminEmail"
                    type="email"
                    value={settings.adminEmail}
                    onChange={(e) => handleChange('adminEmail', e.target.value)}
                    placeholder="admin@example.com"
                    style={{ width: '100%' }}
                  />
                  <small style={{ color: 'var(--color-text-muted)', display: 'block', marginTop: '0.5rem' }}>
                    Email address for admin notifications and alerts
                  </small>
                </div>

                <div>
                  <label htmlFor="dockerDir" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                    Docker Directory
                  </label>
                  <input
                    id="dockerDir"
                    type="text"
                    value={settings.dockerDir}
                    onChange={(e) => handleChange('dockerDir', e.target.value)}
                    placeholder="Usually auto-detected"
                    disabled
                    style={{ width: '100%', opacity: 0.6 }}
                  />
                  <small style={{ color: 'var(--color-text-muted)', display: 'block', marginTop: '0.5rem' }}>
                    Docker configuration directory (read-only - configured during setup)
                  </small>
                </div>
              </div>
            </div>
          </div>

          {/* System Options */}
          <div className="card" style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>System Options</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.autoStartEnabled}
                  onChange={(e) => handleChange('autoStartEnabled', e.target.checked)}
                  style={{ width: 'auto' }}
                />
                <span style={{ fontWeight: 500 }}>Auto-start Stack on Boot</span>
              </label>
              <small style={{ color: 'var(--color-text-muted)', marginLeft: '1.75rem', marginTop: '-1rem' }}>
                Automatically start Docker containers when the system starts
              </small>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', marginTop: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={settings.debugMode}
                  onChange={(e) => handleChange('debugMode', e.target.checked)}
                  style={{ width: 'auto' }}
                />
                <span style={{ fontWeight: 500 }}>Debug Mode</span>
              </label>
              <small style={{ color: 'var(--color-text-muted)', marginLeft: '1.75rem', marginTop: '-1rem' }}>
                Enable detailed logging for troubleshooting (may impact performance)
              </small>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Save size={16} />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={handleReset}
              disabled={!hasChanges || saving}
              className="btn"
              style={{ 
                backgroundColor: 'var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <RefreshCw size={16} />
              Discard Changes
            </button>
          </div>

          {hasChanges && (
            <div style={{
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid var(--color-warning)',
              borderRadius: '4px',
              padding: '1rem',
              color: 'var(--color-warning)',
              fontSize: '0.9rem'
            }}>
              You have unsaved changes. Remember to save them before leaving this page.
            </div>
          )}
        </>
      )}
    </div>
  );
}
