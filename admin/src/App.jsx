import React, { useState, useEffect } from 'react';
import SetupWizard from './pages/SetupWizard';
import './App.css';

const SERVICE_LABELS = {
  ollama: { name: 'Ollama', desc: 'AI models (LLM inference engine)' },
  pocketbase: { name: 'PocketBase', desc: 'Database & auth backend' },
  piper: { name: 'Piper TTS', desc: 'Text-to-speech engine' },
  flux: { name: 'Flux', desc: 'AI image generation' },
};

function UninstallPanel({ onComplete, onCancel }) {
  const [installedServices, setInstalledServices] = useState({});
  const [selectedForRemoval, setSelectedForRemoval] = useState({});
  const [removeConfig, setRemoveConfig] = useState(true);
  const [uninstalling, setUninstalling] = useState(false);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const result = await window.alloAPI.setup.getInstalledServices();
        if (result.success) {
          setInstalledServices(result.services);
          // Start with nothing selected — user must explicitly choose
        }
      } catch (err) {
        console.error('[Uninstall] Error loading services:', err);
      }
      setLoading(false);
    })();

    window.alloAPI.setup.onUninstallProgress((data) => {
      setProgress(data);
    });
  }, []);

  const handleUninstall = async () => {
    const serviceIds = Object.entries(selectedForRemoval)
      .filter(([, selected]) => selected)
      .map(([id]) => id);

    if (serviceIds.length === 0 && !removeConfig) {
      return;
    }

    setUninstalling(true);
    try {
      await window.alloAPI.setup.uninstallServices({
        serviceIds,
        removeConfig
      });
      if (onComplete) onComplete();
    } catch (err) {
      console.error('[Uninstall] Error:', err);
      setUninstalling(false);
    }
  };

  const anyInstalled = Object.values(installedServices).some(v => v);
  const anySelected = Object.values(selectedForRemoval).some(v => v);

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div className="spinner"></div>
        <p>Checking installed services...</p>
      </div>
    );
  }

  if (uninstalling) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div className="spinner"></div>
        <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>
          {progress?.status || 'Uninstalling...'}
        </p>
        {progress?.progress != null && (
          <div style={{ background: '#334155', borderRadius: '4px', height: '8px', margin: '10px 40px' }}>
            <div style={{
              background: '#ef4444', borderRadius: '4px', height: '8px',
              width: `${progress.progress}%`, transition: 'width 0.3s'
            }} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ marginBottom: '16px', color: '#f1f5f9' }}>Uninstall Services</h2>
      <p style={{ color: '#94a3b8', marginBottom: '16px' }}>
        Select which services to remove. Unchecked services will remain installed.
      </p>

      <div style={{ marginBottom: '20px' }}>
        {Object.entries(SERVICE_LABELS).map(([id, label]) => {
          const isInstalled = installedServices[id];
          return (
            <label key={id} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '10px 12px', marginBottom: '6px',
              background: isInstalled ? '#1e293b' : '#0f172a',
              borderRadius: '6px', cursor: isInstalled ? 'pointer' : 'default',
              opacity: isInstalled ? 1 : 0.5,
              border: selectedForRemoval[id] ? '1px solid #ef4444' : '1px solid #334155'
            }}>
              <input
                type="checkbox"
                checked={!!selectedForRemoval[id]}
                disabled={!isInstalled}
                onChange={(e) => setSelectedForRemoval(prev => ({
                  ...prev, [id]: e.target.checked
                }))}
                style={{ width: '18px', height: '18px', accentColor: '#ef4444' }}
              />
              <div>
                <div style={{ fontWeight: 'bold', color: '#f1f5f9' }}>
                  {label.name}
                  {!isInstalled && <span style={{ color: '#64748b', fontWeight: 'normal', marginLeft: '8px' }}>(not installed)</span>}
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>{label.desc}</div>
              </div>
            </label>
          );
        })}
      </div>

      <label style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '10px 12px', marginBottom: '20px',
        background: '#1e293b', borderRadius: '6px', cursor: 'pointer',
        border: removeConfig ? '1px solid #f59e0b' : '1px solid #334155'
      }}>
        <input
          type="checkbox"
          checked={removeConfig}
          onChange={(e) => setRemoveConfig(e.target.checked)}
          style={{ width: '18px', height: '18px', accentColor: '#f59e0b' }}
        />
        <div>
          <div style={{ fontWeight: 'bold', color: '#f1f5f9' }}>Reset configuration</div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            Remove config files and show setup wizard on next launch
          </div>
        </div>
      </label>

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={{
          padding: '8px 20px', borderRadius: '6px', border: '1px solid #475569',
          background: 'transparent', color: '#94a3b8', cursor: 'pointer'
        }}>
          Cancel
        </button>
        <button
          onClick={handleUninstall}
          disabled={!anySelected && !removeConfig}
          style={{
            padding: '8px 20px', borderRadius: '6px', border: 'none',
            background: (anySelected || removeConfig) ? '#ef4444' : '#475569',
            color: 'white', cursor: (anySelected || removeConfig) ? 'pointer' : 'not-allowed',
            fontWeight: 'bold'
          }}
        >
          {removeConfig && anySelected ? 'Uninstall & Reset' :
           removeConfig ? 'Reset Config' :
           anySelected ? 'Uninstall Selected' : 'Select items'}
        </button>
      </div>
    </div>
  );
}

function App() {
  const [setupState, setSetupState] = useState({
    loading: true,
    installed: false,
    config: null,
    error: null
  });

  useEffect(() => {
    checkSetupStatus();
  }, []);

  const checkSetupStatus = async () => {
    try {
      console.log('[App] Checking setup status...');
      const result = await window.alloAPI.setup.check();
      console.log('[App] Setup check result:', result);
      
      setSetupState({
        loading: false,
        installed: result.installed,
        config: result.config,
        error: result.error || null
      });
    } catch (err) {
      console.error('[App] Error checking setup:', err);
      setSetupState({
        loading: false,
        installed: false,
        config: null,
        error: err.message
      });
    }
  };

  const handleSetupComplete = (config) => {
    console.log('[App] Setup complete, saving config:', config.deploymentType);
    setSetupState({
      loading: false,
      installed: true,
      config: config,
      error: null
    });
  };

  if (setupState.loading) {
    return (
      <div className="app-container loading">
        <div className="spinner"></div>
        <p>Initializing AlloFlow...</p>
      </div>
    );
  }

  if (setupState.error) {
    return (
      <div className="app-container error">
        <h1>Error</h1>
        <p>{setupState.error}</p>
        <button onClick={checkSetupStatus}>Retry</button>
      </div>
    );
  }

  // Show setup wizard if not installed
  if (!setupState.installed) {
    return <SetupWizard onComplete={handleSetupComplete} />;
  }

  // If installed, show dashboard or update screen
  return (
    <div className="app-container dashboard">
      <div className="dashboard-header">
        <h1>AlloFlow Admin</h1>
        <p>Deployment: {setupState.config?.deploymentType}</p>
      </div>
      
      {setupState.showUninstall ? (
        <UninstallPanel
          onComplete={() => {
            // App will reload from main process if config was removed
            // If only services were removed, refresh state
            checkSetupStatus();
            setSetupState(prev => ({ ...prev, showUninstall: false }));
          }}
          onCancel={() => setSetupState(prev => ({ ...prev, showUninstall: false }))}
        />
      ) : (
        <div className="dashboard-content">
          <h2>Installation Complete</h2>
          <p>AlloFlow has been configured with deployment type: <strong>{setupState.config?.deploymentType}</strong></p>
          <p>Setup date: {new Date(setupState.config?.setupDate).toLocaleString()}</p>
          
          {setupState.config?.selectedServices && (
            <p>Services: {setupState.config.selectedServices.join(', ')}</p>
          )}
          
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button className="btn-primary" onClick={() => {
              console.log('[App] Re-running setup wizard');
              setSetupState({ ...setupState, installed: false });
            }}>
              Re-run Setup Wizard
            </button>
            
            <button style={{
              padding: '8px 20px', borderRadius: '6px', border: '1px solid #ef4444',
              background: 'transparent', color: '#ef4444', cursor: 'pointer',
              fontWeight: 'bold'
            }} onClick={() => {
              console.log('[App] Opening uninstall panel');
              setSetupState(prev => ({ ...prev, showUninstall: true }));
            }}>
              Uninstall Services
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
