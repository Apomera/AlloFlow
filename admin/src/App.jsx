import React, { useState, useEffect } from 'react';
import SetupWizard from './pages/SetupWizard';
import './App.css';

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
      
      <div className="dashboard-content">
        <h2>Installation Complete</h2>
        <p>AlloFlow has been configured with deployment type: <strong>{setupState.config?.deploymentType}</strong></p>
        <p>Setup date: {new Date(setupState.config?.setupDate).toLocaleString()}</p>
        
        <hr />
        
        <h3>Setup Details</h3>
        <pre>{JSON.stringify(setupState.config, null, 2)}</pre>
        
        <button className="btn-primary" onClick={() => {
          console.log('[App] Re-running setup wizard');
          setSetupState({ ...setupState, installed: false });
        }}>
          Re-run Setup Wizard
        </button>
      </div>
    </div>
  );
}

export default App;
