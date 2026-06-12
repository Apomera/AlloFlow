import React, { useState, useEffect } from 'react';
import { Copy, Eye, EyeOff } from 'lucide-react';

export default function Security() {
  const [showKey, setShowKey] = useState(false);
  const [corsOrigins, setCorsOrigins] = useState([]);
  const [newOrigin, setNewOrigin] = useState('');
  const [apiKeyFingerprint, setApiKeyFingerprint] = useState('Loading...');
  const [certStatus, setCertStatus] = useState('Loading...');
  const [certGeneratedAt, setCertGeneratedAt] = useState('');
  const [apiKeyRotatedAt, setApiKeyRotatedAt] = useState('');
  const [loading, setLoading] = useState({});
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  // Load security config on mount
  useEffect(() => {
    const loadSecurityConfig = async () => {
      if (window.alloAPI) {
        try {
          const result = await window.alloAPI.getSecurityConfig();
          if (result.success && result.config) {
            setCorsOrigins(result.config.corsOrigins || []);
            setApiKeyFingerprint(result.config.apiKeyFingerprint || '***');
            setCertStatus(result.config.certificateStatus || 'Self-signed');
            setCertGeneratedAt(result.config.certificateGeneratedAt 
              ? new Date(result.config.certificateGeneratedAt).toLocaleString() 
              : 'Unknown');
            setApiKeyRotatedAt(result.config.apiKeyRotatedAt
              ? new Date(result.config.apiKeyRotatedAt).toLocaleString()
              : 'Unknown');
          }
        } catch (err) {
          console.error('Error loading security config:', err);
        }
      }
    };

    loadSecurityConfig();
  }, []);

  const handleAddOrigin = () => {
    if (newOrigin && !corsOrigins.includes(newOrigin)) {
      setCorsOrigins([...corsOrigins, newOrigin]);
      setNewOrigin('');
      setUnsavedChanges(true);
    }
  };

  const handleRemoveOrigin = (origin) => {
    setCorsOrigins(corsOrigins.filter(o => o !== origin));
    setUnsavedChanges(true);
  };

  const handleSaveCORSConfig = async () => {
    if (!window.alloAPI) return;
    setLoading(prev => ({ ...prev, cors: true }));
    try {
      const result = await window.alloAPI.saveCORSConfig(corsOrigins);
      if (result.success) {
        alert('CORS configuration saved successfully');
        setUnsavedChanges(false);
      } else {
        alert(`Error saving CORS config: ${result.error}`);
      }
    } catch (err) {
      alert(`Failed to save CORS config: ${err.message}`);
    } finally {
      setLoading(prev => ({ ...prev, cors: false }));
    }
  };

  const handleRegenerateCertificate = async () => {
    if (!window.alloAPI) return;
    setLoading(prev => ({ ...prev, cert: true }));
    try {
      const result = await window.alloAPI.regenerateCertificate();
      if (result.success) {
        setCertStatus(result.status || 'Self-signed (regenerated)');
        setCertGeneratedAt(result.generatedAt || 'Just now');
        alert('Certificate regenerated successfully');
      } else {
        alert(`Error regenerating certificate: ${result.error}`);
      }
    } catch (err) {
      alert(`Failed to regenerate certificate: ${err.message}`);
    } finally {
      setLoading(prev => ({ ...prev, cert: false }));
    }
  };

  const handleRotateAPIKey = async () => {
    if (!window.alloAPI) return;
    setLoading(prev => ({ ...prev, key: true }));
    try {
      const result = await window.alloAPI.rotateAPIKey();
      if (result.success) {
        setApiKeyFingerprint(result.fingerprint || '***');
        setApiKeyRotatedAt(result.rotatedAt || 'Just now');
        alert('API key rotated successfully. Update any registered nodes with the new key.');
      } else {
        alert(`Error rotating API key: ${result.error}`);
      }
    } catch (err) {
      alert(`Failed to rotate API key: ${err.message}`);
    } finally {
      setLoading(prev => ({ ...prev, key: false }));
    }
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(apiKeyFingerprint);
    alert('API key fingerprint copied!');
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Security & Configuration</h2>
        <p>Manage SSL certificates, API keys, and CORS settings</p>
      </div>

      {/* SSL/TLS Certificate */}
      <div className="card">
        <div className="card-header">
          <h3>SSL/TLS Certificate</h3>
        </div>
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div>
            <h4 style={{ marginBottom: '0.5rem' }}>Certificate Status</h4>
            <div style={{
              padding: '1rem',
              backgroundColor: 'var(--color-bg)',
              borderRadius: '6px',
              border: '1px dashed var(--color-border)',
              textAlign: 'center'
            }}>
              <div style={{ color: 'var(--color-warning)', fontWeight: 600, marginBottom: '0.5rem' }}>
                ⚠ {certStatus}
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                Generated: {certGeneratedAt}
              </p>
            </div>
          </div>
          <div>
            <button 
              className="btn btn-primary"
              onClick={handleRegenerateCertificate}
              disabled={loading.cert}
            >
              {loading.cert ? '⏳ Regenerating...' : '🔄 Regenerate Certificate'}
            </button>
          </div>
        </div>
      </div>

      {/* API Key Management */}
      <div className="card">
        <div className="card-header">
          <h3>API Key for Cluster Communication</h3>
        </div>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center',
            padding: '0.75rem',
            backgroundColor: 'var(--color-bg)',
            borderRadius: '6px',
            border: '1px solid var(--color-border)',
            fontFamily: 'monospace',
            fontSize: '0.85rem'
          }}>
            <span style={{ flex: 1, userSelect: 'none' }}>
              {showKey ? apiKeyFingerprint : '••••••••••••••••••••••••••••••••'}
            </span>
            <button 
              className="btn btn-small"
              onClick={() => setShowKey(!showKey)}
              title={showKey ? 'Hide' : 'Show'}
            >
              {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
            <button 
              className="btn btn-small"
              onClick={handleCopyKey}
              title="Copy"
            >
              <Copy size={14} />
            </button>
          </div>
          <button 
            className="btn btn-warning"
            onClick={handleRotateAPIKey}
            disabled={loading.key}
          >
            {loading.key ? '⏳ Rotating...' : '🔄 Rotate Key'}
          </button>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            Last rotated: {apiKeyRotatedAt} · Use this key when registering new nodes to the cluster
          </p>
        </div>
      </div>

      {/* CORS Configuration */}
      <div className="card">
        <div className="card-header">
          <h3>CORS Origins (Allowed Domains)</h3>
          {unsavedChanges && <span style={{ color: 'var(--color-warning)', fontSize: '0.875rem' }}>⚠ Unsaved changes</span>}
        </div>
        <div>
          <div style={{ marginBottom: '1rem' }}>
            <h4 style={{ marginBottom: '0.5rem' }}>Add New Origin</h4>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder="https://example.school.edu"
                value={newOrigin}
                onChange={(e) => setNewOrigin(e.target.value)}
              />
              <button className="btn btn-primary" onClick={handleAddOrigin}>
                Add
              </button>
            </div>
          </div>

          <div>
            <h4 style={{ marginBottom: '0.5rem' }}>Allowed Origins</h4>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {corsOrigins.map(origin => (
                <div key={origin} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem',
                  backgroundColor: 'var(--color-bg)',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border)',
                  fontFamily: 'monospace',
                  fontSize: '0.875rem'
                }}>
                  <span>{origin}</span>
                  <button 
                    className="btn btn-small btn-error"
                    onClick={() => handleRemoveOrigin(origin)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <button 
              className="btn btn-success"
              onClick={handleSaveCORSConfig}
              disabled={!unsavedChanges || loading.cors}
            >
              {loading.cors ? '💾 Saving...' : '💾 Save CORS Configuration'}
            </button>
            {unsavedChanges && (
              <button 
                className="btn btn-secondary"
                onClick={async () => {
                  const result = await window.alloAPI.getSecurityConfig();
                  if (result.success && result.config) {
                    setCorsOrigins(result.config.corsOrigins || []);
                  }
                  setUnsavedChanges(false);
                }}
              >
                ↶ Discard Changes
              </button>
            )}
          </div>
          <p style={{
            fontSize: '0.875rem',
            color: 'var(--color-text-muted)',
            marginTop: '0.75rem'
          }}>
            These domains can access the API. Localhost is always allowed.
          </p>
        </div>
      </div>

      {/* PocketBase Admin */}
      <div className="card">
        <div className="card-header">
          <h3>PocketBase Admin</h3>
        </div>
        <div>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
            Access the PocketBase admin console at: <code>http://localhost:8090/_/</code>
          </p>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
              Admin Email
            </label>
            <input type="email" defaultValue="admin@alloflow.local" readOnly />
          </div>
          <div style={{ marginTop: '0.75rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
              Admin Password
            </label>
            <input type="password" defaultValue="••••••••" readOnly />
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: '0.75rem' }}>
            Note: Reset functionality is available through the PocketBase admin panel at the URL above.
          </p>
        </div>
      </div>
    </div>
  );
}
