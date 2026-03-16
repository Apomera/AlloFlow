import React, { useState } from 'react';
import { Copy, Eye, EyeOff } from 'lucide-react';

export default function Security() {
  const [showKey, setShowKey] = useState(false);
  const [corsOrigins, setCorsOrigins] = useState(['http://localhost', 'https://localhost']);
  const [newOrigin, setNewOrigin] = useState('');

  const handleAddOrigin = () => {
    if (newOrigin && !corsOrigins.includes(newOrigin)) {
      setCorsOrigins([...corsOrigins, newOrigin]);
      setNewOrigin('');
    }
  };

  const handleRemoveOrigin = (origin) => {
    setCorsOrigins(corsOrigins.filter(o => o !== origin));
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText('sk-1234567890abcdef1234567890abcdef');
    alert('API key copied!');
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
                ⚠ Self-signed (for LAN use)
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                Expires: Never (dev cert)
              </p>
            </div>
          </div>
          <div>
            <button className="btn btn-primary">🔄 Regenerate Certificate</button>
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
              {showKey ? 'sk-1234567890abcdef1234567890abcdef' : '••••••••••••••••••••••••••••••••'}
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
          <button className="btn btn-warning">🔄 Rotate Key</button>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            Use this key when registering new nodes to the cluster
          </p>
        </div>
      </div>

      {/* CORS Configuration */}
      <div className="card">
        <div className="card-header">
          <h3>CORS Origins (Allowed Domains)</h3>
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
            <input type="email" defaultValue="admin@alloflow.local" />
          </div>
          <div style={{ marginTop: '0.75rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
              Admin Password
            </label>
            <input type="password" defaultValue="••••••••" />
          </div>
          <button className="btn btn-warning" style={{ marginTop: '1rem' }}>
            🔄 Reset Admin Password
          </button>
        </div>
      </div>
    </div>
  );
}
