import React, { useState, useEffect } from 'react';
import { Plus, Trash2, MapPin, Copy, Check } from 'lucide-react';

export default function Cluster() {
  const clusterId = 'default-cluster'; // TODO: Get from environment or config
  
  const [nodes, setNodes] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newNodeName, setNewNodeName] = useState('');
  const [newNodeIp, setNewNodeIp] = useState('');
  const [newNodePort, setNewNodePort] = useState('8090');
  const [generatedToken, setGeneratedToken] = useState(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [strategy, setStrategy] = useState('round-robin');

  // Load cluster data on mount
  useEffect(() => {
    loadClusterData();
  }, []);

  const loadClusterData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load nodes
      const nodesResult = await window.alloAPI.getClusterNodes(clusterId);
      if (nodesResult.success) {
        setNodes(nodesResult.data);
      }
      
      // Load config
      const configResult = await window.alloAPI.getClusterConfig(clusterId);
      if (configResult.success) {
        setConfig(configResult.data);
        setStrategy(configResult.data.load_balancer_strategy || 'round-robin');
      }
    } catch (err) {
      console.error('Error loading cluster data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateToken = async () => {
    if (!newNodeName.trim()) {
      setError('Please enter a node name');
      return;
    }

    try {
      setError(null);
      const result = await window.alloAPI.generateClusterToken(clusterId, newNodeName, 'worker');
      if (result.success) {
        setGeneratedToken(result.data.token);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddNode = async () => {
    if (!generatedToken || !newNodeIp.trim() || !newNodePort) {
      setError('Please complete all fields and generate a token first');
      return;
    }

    try {
      setError(null);
      
      // Extract node ID from token for hardware info
      const hardwareInfo = {
        hostname: newNodeName,
        gpuType: 'unknown',
        gpuCount: 0,
        memoryGb: 0,
        cpuCores: 0
      };

      const result = await window.alloAPI.registerNode(
        generatedToken,
        newNodeIp,
        parseInt(newNodePort),
        hardwareInfo
      );

      if (result.success) {
        // Reset form and reload
        setGeneratedToken(null);
        setNewNodeName('');
        setNewNodeIp('');
        setNewNodePort('8090');
        await loadClusterData();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRemoveNode = async (nodeId) => {
    if (!window.confirm('Are you sure you want to remove this node?')) {
      return;
    }

    try {
      setError(null);
      const result = await window.alloAPI.removeNode(clusterId, nodeId);
      if (result.success) {
        await loadClusterData();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleStrategyChange = async (newStrategy) => {
    try {
      setStrategy(newStrategy);
      const result = await window.alloAPI.updateClusterConfig(clusterId, {
        loadBalancerStrategy: newStrategy
      });
      if (!result.success) {
        setError(result.error);
        setStrategy(config?.load_balancer_strategy || 'round-robin');
      }
    } catch (err) {
      setError(err.message);
      setStrategy(config?.load_balancer_strategy || 'round-robin');
    }
  };

  const handleDownloadNginxConfig = async () => {
    try {
      const result = await window.alloAPI.generateNginxConfig(clusterId);
      if (result.success) {
        const element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(result.data));
        element.setAttribute('download', 'nginx.conf');
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
          <h2>Multi-Building Cluster</h2>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <p>Loading cluster data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2>Multi-Building Cluster</h2>
        <p>Manage distributed AlloFlow nodes across your district</p>
      </div>

      {error && (
        <div style={{
          padding: '0.75rem 1rem',
          marginBottom: '1rem',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.5)',
          borderRadius: '6px',
          color: 'var(--color-error)',
          fontSize: '0.875rem'
        }}>
          {error}
        </div>
      )}

      {/* Token Generation */}
      <div className="card">
        <div className="card-header">
          <h3>Step 1: Generate Registration Token</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            Create a token to give to the node operator. Tokens expire in 24 hours.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
              Node Name
            </label>
            <input
              type="text"
              placeholder="e.g., Building A Computer Lab"
              value={newNodeName}
              onChange={(e) => setNewNodeName(e.target.value)}
              disabled={!!generatedToken}
            />
          </div>
          <button
            className="btn btn-primary"
            onClick={handleGenerateToken}
            disabled={!!generatedToken || !newNodeName.trim()}
          >
            <Plus size={16} /> Generate Token
          </button>
        </div>

        {generatedToken && (
          <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'var(--color-bg)', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
            <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--color-text-muted)' }}>
              Share this token with the node operator:
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <code style={{
                flex: 1,
                padding: '0.75rem',
                backgroundColor: 'var(--color-surface)',
                borderRadius: '4px',
                fontSize: '0.75rem',
                wordBreak: 'break-all',
                fontFamily: 'monospace'
              }}>
                {generatedToken}
              </code>
              <button
                className="btn btn-small"
                onClick={() => copyToClipboard(generatedToken)}
                title="Copy to clipboard"
              >
                {copiedToken ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Node */}
      {generatedToken && (
        <div className="card">
          <div className="card-header">
            <h3>Step 2: Add Node Details</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
              Enter the network address of the node (IP and port)
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '0.75rem', alignItems: 'flex-end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                Node IP Address
              </label>
              <input
                type="text"
                placeholder="10.0.1.10"
                value={newNodeIp}
                onChange={(e) => setNewNodeIp(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                Port
              </label>
              <input
                type="number"
                placeholder="8090"
                value={newNodePort}
                onChange={(e) => setNewNodePort(e.target.value)}
              />
            </div>
            <div></div>
            <button className="btn btn-primary" onClick={handleAddNode}>
              <Plus size={16} /> Register
            </button>
          </div>
        </div>
      )}

      {/* Nodes List */}
      <div className="card">
        <div className="card-header">
          <h3>Registered Nodes ({nodes.length})</h3>
        </div>
        {nodes.length === 0 ? (
          <p style={{ padding: '1rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
            No nodes registered yet. Generate a token and register your first node.
          </p>
        ) : (
          <div className="grid grid-2">
            {nodes.map(node => (
              <div key={node.id} style={{
                padding: '1rem',
                backgroundColor: 'var(--color-bg)',
                borderRadius: '6px',
                border: `1px solid var(--color-border)`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ flex: 1 }}>
                    <h4>{node.node_id || node.name}</h4>
                    <p style={{
                      fontSize: '0.875rem',
                      color: 'var(--color-text-muted)',
                      margin: '0.25rem 0'
                    }}>
                      <MapPin size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
                      {node.ip_address || '—'}:{node.port || '—'}
                    </p>
                    {node.gpu_type && node.gpu_type !== 'none' && (
                      <p style={{
                        fontSize: '0.75rem',
                        color: 'var(--color-text-muted)',
                        margin: '0.25rem 0'
                      }}>
                        GPU: {node.gpu_type} ({node.gpu_count}x)
                      </p>
                    )}
                  </div>
                  <button
                    className="btn btn-small btn-error"
                    onClick={() => handleRemoveNode(node.node_id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    backgroundColor: node.status === 'online' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(107, 114, 128, 0.1)',
                    color: node.status === 'online' ? 'var(--color-success)' : 'var(--color-text-muted)',
                  }}>
                    ● {node.status}
                  </span>
                  {node.models_deployed && (
                    <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                      {Array.isArray(node.models_deployed) ? node.models_deployed.length : 0} models
                    </span>
                  )}
                  <span style={{
                    fontSize: '0.75rem',
                    color: 'var(--color-text-muted)',
                    marginLeft: 'auto'
                  }}>
                    Last: {node.last_heartbeat ? new Date(node.last_heartbeat).toLocaleTimeString() : '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Load Balancing Settings */}
      <div className="card">
        <div className="card-header">
          <h3>Load Balancing Strategy</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            Choose how to distribute requests across nodes
          </p>
        </div>
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="radio"
                name="strategy"
                value="round-robin"
                checked={strategy === 'round-robin'}
                onChange={(e) => handleStrategyChange(e.target.value)}
              />
              <span><strong>Round-robin</strong> — Distribute evenly across all nodes</span>
            </label>
          </div>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="radio"
                name="strategy"
                value="least-connections"
                checked={strategy === 'least-connections'}
                onChange={(e) => handleStrategyChange(e.target.value)}
              />
              <span><strong>Least-connections</strong> — Route to node with fewest active requests</span>
            </label>
          </div>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="radio"
                name="strategy"
                value="ip-hash"
                checked={strategy === 'ip-hash'}
                onChange={(e) => handleStrategyChange(e.target.value)}
              />
              <span><strong>IP-hash</strong> — Sticky sessions (same user → same node)</span>
            </label>
          </div>
        </div>
      </div>

      {/* nginx Configuration */}
      <div className="card">
        <div className="card-header">
          <h3>Load Balancer Configuration</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            Download nginx configuration for your load balancer
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleDownloadNginxConfig}>
          Download nginx.conf
        </button>
      </div>
    </div>
  );
}
