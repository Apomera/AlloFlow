import React, { useState, useEffect } from 'react';
import { Activity, Server, HardDrive, Cpu, BarChart3 } from 'lucide-react';

export default function Dashboard({ onNavigateTab }) {
  const [health, setHealth] = useState('loading');
  const [services, setServices] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    const checkHealth = async () => {
      if (window.alloAPI) {
        const h = await window.alloAPI.getHealth();
        setHealth(h);
      }
    };

    const loadServices = async () => {
      if (window.alloAPI) {
        try {
          const result = await window.alloAPI.getServices();
          if (result.success) {
            setServices(result.containers || []);
          } else {
            setServices([]);
          }
        } catch (err) {
          setServices([]);
        }
      }
    };

    const loadMetrics = async () => {
      if (window.alloAPI) {
        try {
          const result = await window.alloAPI.getSystemMetrics();
          if (result.success) {
            setMetrics(result);
          }
        } catch (err) {
          console.error('Error loading metrics:', err);
        }
      }
    };

    checkHealth();
    loadServices();
    loadMetrics();

    const interval = setInterval(() => {
      checkHealth();
      loadServices();
      loadMetrics();
    }, 10000); // Refresh every 10s

    return () => clearInterval(interval);
  }, []);

  const handleRestartStack = async () => {
    if (!window.alloAPI) return;
    setActionLoading('restart');
    try {
      // Stop all services first, then start them
      await window.alloAPI.stopStack();
      const result = await window.alloAPI.startStack();
      if (result.success) {
        alert('Services restarted successfully');
        // Reload services after restart
        const svcResult = await window.alloAPI.getServices();
        if (svcResult.success) {
          setServices(svcResult.containers || []);
        }
      } else {
        alert(`Error restarting services: ${result.error}`);
      }
    } catch (err) {
      alert(`Failed to restart services: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewLogs = async () => {
    if (!window.alloAPI) return;
    setActionLoading('logs');
    try {
      const result = await window.alloAPI.getServiceLogs('llm-engine');
      if (result.success) {
        // Open logs in a modal or new window
        const logsWindow = window.open('', '', 'width=800,height=600');
        logsWindow.document.write('<pre style="font-family: monospace; white-space: pre-wrap; word-break: break-word; padding: 10px;">' + 
          (result.logs || 'No logs available').substring(0, 10000) + '</pre>');
      } else {
        alert(`Error retrieving logs: ${result.error}`);
      }
    } catch (err) {
      alert(`Failed to get logs: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSystemSettings = async () => {
    // Navigate to Settings tab
    if (onNavigateTab) {
      onNavigateTab('settings');
    }
  };

  const runningCount = services.filter(s => s.status === 'running').length;
  const healthColor =
    health === 'healthy' ? 'var(--color-success)' :
    health === 'offline' ? 'var(--color-error)' :
    'var(--color-warning)';

  const uptime = metrics?.uptime || 'Loading...';
  const cpuUsage = metrics?.cpuUsage || 0;
  const diskUsage = metrics?.diskUsage || 0;

  return (
    <div className="page">
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>System status and service overview</p>
      </div>

      {/* Top metrics */}
      <div className="grid grid-3">
        <div className="card">
          <div className="card-header">
            <h3>Overall Health</h3>
          </div>
          <div style={{ textAlign: 'center', padding: '1rem' }}>
            <div style={{
              fontSize: '3rem',
              fontWeight: 'bold',
              color: healthColor,
              marginBottom: '0.5rem'
            }}>
              {health === 'healthy' ? '✓' : health === 'offline' ? '✗' : '⚠'}
            </div>
            <div style={{
              fontSize: '1.25rem',
              textTransform: 'capitalize',
              color: 'var(--color-text-muted)'
            }}>
              {health}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Services</h3>
          </div>
          <div style={{ textAlign: 'center', padding: '1rem' }}>
            <div style={{
              fontSize: '3rem',
              fontWeight: 'bold',
              color: 'var(--color-primary)',
              marginBottom: '0.5rem'
            }}>
              {runningCount}/{services.length}
            </div>
            <div style={{ color: 'var(--color-text-muted)' }}>
              Running
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>System Uptime</h3>
          </div>
          <div style={{ textAlign: 'center', padding: '1rem' }}>
            <Activity size={32} style={{ color: 'var(--color-primary)', margin: '0 auto 0.5rem' }} />
            <div style={{
              fontSize: '1.125rem',
              fontWeight: 600
            }}>
              {uptime}
            </div>
          </div>
        </div>
      </div>

      {/* Service status cards */}
      <div className="card">
        <div className="card-header">
          <h3>Services Status</h3>
          <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            {services.length} services
          </span>
        </div>

        {services.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
            <Server size={32} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <p>No services detected. Check the Services tab.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' }}>
            {services.map(service => (
              <div
                key={service.name}
                style={{
                  padding: '1rem',
                  backgroundColor: 'var(--color-bg)',
                  borderRadius: '6px',
                  border: `1px solid var(--color-border)`,
                  textAlign: 'center'
                }}
              >
                <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  {service.name}
                </div>
                <div style={{
                  display: 'inline-block',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  backgroundColor: service.status === 'running' 
                    ? 'rgba(16, 185, 129, 0.1)' 
                    : 'rgba(239, 68, 68, 0.1)',
                  color: service.status === 'running' 
                    ? 'var(--color-success)' 
                    : 'var(--color-error)',
                  marginBottom: '0.5rem'
                }}>
                  {service.status === 'running' ? '●' : '○'} {service.status}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  Port {service.port}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* System resources - real metrics */}
      <div className="grid grid-2">
        <div className="card">
          <div className="card-header">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Cpu size={20} /> CPU Usage
            </h3>
          </div>
          <div style={{ textAlign: 'center', padding: '1rem' }}>
            <div style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              color: 'var(--color-primary)'
            }}>
              {cpuUsage}%
            </div>
            <div style={{
              marginTop: '1rem',
              height: '4px',
              backgroundColor: 'var(--color-bg)',
              borderRadius: '2px',
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                width: `${cpuUsage}%`,
                backgroundColor: cpuUsage > 80 ? 'var(--color-error)' : 'var(--color-primary)',
                transition: 'width 0.3s'
              }} />
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
              System-wide average
            </p>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <HardDrive size={20} /> Disk Usage
            </h3>
          </div>
          <div style={{ textAlign: 'center', padding: '1rem' }}>
            <div style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              color: 'var(--color-primary)'
            }}>
              {diskUsage}%
            </div>
            <div style={{
              marginTop: '1rem',
              height: '4px',
              backgroundColor: 'var(--color-bg)',
              borderRadius: '2px',
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                width: `${diskUsage}%`,
                backgroundColor: diskUsage > 90 ? 'var(--color-error)' : 'var(--color-primary)',
                transition: 'width 0.3s'
              }} />
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
              C: drive usage
            </p>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div className="card-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart3 size={20} /> Quick Actions
          </h3>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button 
            className="btn btn-primary"
            onClick={handleRestartStack}
            disabled={actionLoading === 'restart'}
          >
            {actionLoading === 'restart' ? '🔄 Restarting...' : '🔄 Restart Services'}
          </button>
          <button 
            className="btn btn-warning"
            onClick={handleViewLogs}
            disabled={actionLoading === 'logs'}
          >
            {actionLoading === 'logs' ? '📋 Loading...' : '📋 View Full Logs'}
          </button>
          <button 
            className="btn btn-primary"
            onClick={handleSystemSettings}
          >
            ⚙️ System Settings
          </button>
        </div>
      </div>
    </div>
  );
}
