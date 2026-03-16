import React, { useState, useEffect } from 'react';
import { Activity, Server, HardDrive, Cpu, BarChart3 } from 'lucide-react';

export default function Dashboard() {
  const [health, setHealth] = useState('loading');
  const [services, setServices] = useState([]);
  const uptime = '12h 34m'; // Real uptime would come from Docker API

  useEffect(() => {
    const checkHealth = async () => {
      if (window.alloAPI) {
        const h = await window.alloAPI.getHealth();
        setHealth(h);
      }
    };

    const loadServices = async () => {
      if (window.alloAPI) {
        const svcs = await window.alloAPI.getServices();
        setServices(svcs || []);
      }
    };

    checkHealth();
    loadServices();

    const interval = setInterval(() => {
      checkHealth();
      loadServices();
    }, 10000); // Refresh every 10s

    return () => clearInterval(interval);
  }, []);

  const runningCount = services.filter(s => s.status === 'running').length;
  const healthColor =
    health === 'healthy' ? 'var(--color-success)' :
    health === 'offline' ? 'var(--color-error)' :
    'var(--color-warning)';

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
            <p>No services detected. Is Docker running?</p>
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

      {/* System resources (placeholder for real metrics) */}
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
              45%
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
                width: '45%',
                backgroundColor: 'var(--color-primary)',
                transition: 'width 0.3s'
              }} />
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
              4 cores
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
              28%
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
                width: '28%',
                backgroundColor: 'var(--color-primary)',
                transition: 'width 0.3s'
              }} />
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
              ~280 GB of 1 TB
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
          <button className="btn btn-primary">Restart Docker Stack</button>
          <button className="btn btn-warning">View Full Logs</button>
          <button className="btn btn-primary">System Settings</button>
        </div>
      </div>
    </div>
  );
}
