import React, { useState, useEffect } from 'react';
import { RotateCw, Terminal } from 'lucide-react';

export default function Services() {
  const [services, setServices] = useState([]);
  const [logs, setLogs] = useState(null);
  const [selectedService, setSelectedService] = useState(null);

  useEffect(() => {
    const loadServices = async () => {
      if (window.alloAPI) {
        const svcs = await window.alloAPI.getServices();
        setServices(svcs || []);
      }
    };
    loadServices();
  }, []);

  const handleRestart = async (service) => {
    if (window.alloAPI) {
      const result = await window.alloAPI.restartService(service);
      alert(result.message);
    }
  };

  const handleViewLogs = async (service) => {
    if (window.alloAPI) {
      const serviceLogs = await window.alloAPI.getServiceLogs(service);
      setLogs(serviceLogs);
      setSelectedService(service);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Docker Services</h2>
        <p>Manage AlloFlow microservices</p>
      </div>

      {/* Service controls */}
      <div className="card">
        <div className="card-header">
          <h3>Stack Controls</h3>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-success">
            <span style={{ marginRight: '0.5rem' }}>⬆</span> Start All
          </button>
          <button className="btn btn-error">
            <span style={{ marginRight: '0.5rem' }}>⬇</span> Stop All
          </button>
          <button className="btn btn-primary">
            <span style={{ marginRight: '0.5rem' }}>🔄</span> Restart All
          </button>
        </div>
      </div>

      {/* Service list */}
      <div className="card">
        <div className="card-header">
          <h3>Services ({services.length})</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.95rem'
          }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600 }}>Service</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600 }}>Port</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {services.map((service, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '0.75rem' }}>{service.name}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '4px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      backgroundColor: service.status === 'running' 
                        ? 'rgba(16, 185, 129, 0.1)' 
                        : 'rgba(239, 68, 68, 0.1)',
                      color: service.status === 'running' 
                        ? 'var(--color-success)' 
                        : 'var(--color-error)',
                    }}>
                      {service.status === 'running' ? '● Running' : '○ Stopped'}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem' }}>{service.port}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        className="btn btn-small btn-primary"
                        onClick={() => handleRestart(service.name)}
                        title="Restart service"
                      >
                        <RotateCw size={14} />
                      </button>
                      <button 
                        className="btn btn-small btn-primary"
                        onClick={() => handleViewLogs(service.name)}
                        title="View logs"
                      >
                        <Terminal size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Logs viewer */}
      {logs && (
        <div className="card">
          <div className="card-header">
            <h3>Logs: {selectedService}</h3>
          </div>
          <pre style={{
            backgroundColor: 'var(--color-bg)',
            padding: '1rem',
            borderRadius: '4px',
            fontSize: '0.85rem',
            overflow: 'auto',
            maxHeight: '400px',
            lineHeight: '1.4'
          }}>
            {logs}
          </pre>
        </div>
      )}
    </div>
  );
}
