import React, { useState, useEffect } from 'react';
import { RotateCw, Terminal } from 'lucide-react';

export default function Services() {
  const [services, setServices] = useState([]);
  const [logs, setLogs] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [error, setError] = useState(null);
  const [controlling, setControlling] = useState(false);

  useEffect(() => {
    const loadServices = async () => {
      if (window.alloAPI) {
        try {
          const result = await window.alloAPI.getServices();
          if (result.success) {
            setServices(result.containers || []);
            setError(null);
          } else {
            setError(result.error || 'Failed to load services');
            setServices([]);
          }
        } catch (err) {
          setError(err.message);
          setServices([]);
        }
      }
    };
    loadServices();
  }, []);

  const handleStartAll = async () => {
    if (window.alloAPI) {
      try {
        setControlling(true);
        const result = await window.alloAPI.startStack();
        if (result.success) {
          alert(`✓ ${result.message}`);
          // Wait a moment and reload
          setTimeout(async () => {
            const updated = await window.alloAPI.getServices();
            if (updated.success) {
              setServices(updated.containers || []);
            }
            setControlling(false);
          }, 2000);
        } else {
          alert(`✗ Failed: ${result.error}`);
          setControlling(false);
        }
      } catch (err) {
        alert(`✗ Error: ${err.message}`);
        setControlling(false);
      }
    }
  };

  const handleStopAll = async () => {
    if (window.alloAPI) {
      try {
        setControlling(true);
        const result = await window.alloAPI.stopStack();
        if (result.success) {
          alert(`✓ ${result.message}`);
          // Reload services
          const updated = await window.alloAPI.getServices();
          if (updated.success) {
            setServices(updated.containers || []);
          }
          setControlling(false);
        } else {
          alert(`✗ Failed: ${result.error}`);
          setControlling(false);
        }
      } catch (err) {
        alert(`✗ Error: ${err.message}`);
        setControlling(false);
      }
    }
  };

  const handleRestartAll = async () => {
    if (window.alloAPI) {
      try {
        setControlling(true);
        // Stop then start
        await window.alloAPI.stopStack();
        setTimeout(async () => {
          const result = await window.alloAPI.startStack();
          if (result.success) {
            alert('✓ Stack restarted');
            // Reload services
            setTimeout(async () => {
              const updated = await window.alloAPI.getServices();
              if (updated.success) {
                setServices(updated.containers || []);
              }
              setControlling(false);
            }, 2000);
          }
        }, 500);
      } catch (err) {
        alert(`✗ Error: ${err.message}`);
        setControlling(false);
      }
    }
  };

  const handleRestart = async (service) => {
    if (window.alloAPI) {
      try {
        const result = await window.alloAPI.restartService(service);
        if (result.success) {
          alert(`✓ ${result.message}`);
          // Reload services after restart
          const updated = await window.alloAPI.getServices();
          if (updated.success) {
            setServices(updated.containers || []);
          }
        } else {
          alert(`✗ Failed to restart: ${result.error}`);
        }
      } catch (err) {
        alert(`✗ Error: ${err.message}`);
      }
    }
  };

  const handleViewLogs = async (service) => {
    if (window.alloAPI) {
      try {
        const result = await window.alloAPI.getServiceLogs(service);
        if (result.success) {
          setLogs(result.logs || 'No logs available');
          setSelectedService(service);
        } else {
          alert(`Failed to get logs: ${result.error}`);
        }
      } catch (err) {
        alert(`Error getting logs: ${err.message}`);
      }
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Docker Services</h2>
        <p>Manage AlloFlow microservices</p>
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

      {/* Service controls */}
      <div className="card">
        <div className="card-header">
          <h3>Stack Controls</h3>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button 
            className="btn btn-success"
            onClick={handleStartAll}
            disabled={controlling}
          >
            <span style={{ marginRight: '0.5rem' }}>⬆</span> {controlling ? 'Starting...' : 'Start All'}
          </button>
          <button 
            className="btn btn-error"
            onClick={handleStopAll}
            disabled={controlling}
          >
            <span style={{ marginRight: '0.5rem' }}>⬇</span> {controlling ? 'Stopping...' : 'Stop All'}
          </button>
          <button 
            className="btn btn-primary"
            onClick={handleRestartAll}
            disabled={controlling}
          >
            <span style={{ marginRight: '0.5rem' }}>🔄</span> {controlling ? 'Restarting...' : 'Restart All'}
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
