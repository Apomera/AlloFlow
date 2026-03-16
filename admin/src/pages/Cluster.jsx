import React, { useState } from 'react';
import { Plus, Trash2, MapPin } from 'lucide-react';

export default function Cluster() {
  const [nodes] = useState([
    { id: 1, name: 'Building A', ip: '10.0.1.10', status: 'online', models: 3 },
    { id: 2, name: 'Building B', ip: '10.0.1.20', status: 'online', models: 3 },
  ]);

  return (
    <div className="page">
      <div className="page-header">
        <h2>Multi-Building Cluster</h2>
        <p>Manage distributed AlloFlow nodes across your district</p>
      </div>

      {/* Add node */}
      <div className="card">
        <div className="card-header">
          <h3>Register New Node</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '0.75rem', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
              Node Name
            </label>
            <input type="text" placeholder="e.g., Building A" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
              IP Address
            </label>
            <input type="text" placeholder="10.0.1.10" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
              Port
            </label>
            <input type="number" placeholder="11434" defaultValue="11434" />
          </div>
          <button className="btn btn-primary">
            <Plus size={16} /> Add
          </button>
        </div>
      </div>

      {/* Nodes list */}
      <div className="card">
        <div className="card-header">
          <h3>Registered Nodes ({nodes.length})</h3>
        </div>
        <div className="grid grid-2">
          {nodes.map(node => (
            <div key={node.id} style={{
              padding: '1rem',
              backgroundColor: 'var(--color-bg)',
              borderRadius: '6px',
              border: `1px solid var(--color-border)`
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <h4>{node.name}</h4>
                  <p style={{
                    fontSize: '0.875rem',
                    color: 'var(--color-text-muted)',
                    margin: '0.25rem 0'
                  }}>
                    <MapPin size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
                    {node.ip}:11434
                  </p>
                </div>
                <button className="btn btn-small btn-error">
                  <Trash2 size={14} />
                </button>
              </div>
              <div style={{ marginTop: '0.75rem' }}>
                <span style={{
                  display: 'inline-block',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  color: 'var(--color-success)',
                  marginRight: '0.5rem'
                }}>
                  ● {node.status}
                </span>
                <span style={{
                  fontSize: '0.875rem',
                  color: 'var(--color-text-muted)'
                }}>
                  {node.models} models
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Load balancing settings */}
      <div className="card">
        <div className="card-header">
          <h3>Load Balancing</h3>
        </div>
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input type="radio" name="strategy" defaultChecked />
              <span><strong>Round-robin</strong> — Distribute evenly across all nodes</span>
            </label>
          </div>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input type="radio" name="strategy" />
              <span><strong>Least-connections</strong> — Route to node with fewest active requests</span>
            </label>
          </div>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input type="radio" name="strategy" />
              <span><strong>IP-hash</strong> — Sticky sessions (same user → same node)</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
