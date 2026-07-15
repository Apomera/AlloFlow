import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Cpu, Settings as SettingsIcon, Server, Wrench, Trash2, Users } from 'lucide-react';
import RemediationSetup from './pages/RemediationSetup';
import Dashboard from './pages/Dashboard';
import Models from './pages/Models';
import AIConfig from './pages/AIConfig';
import Services from './pages/Services';
import Teachers from './pages/Teachers';
import './App.css';

const SERVICE_LABELS = {
  'llm-engine': { name: 'LM Studio', desc: 'AI models (llama.cpp LLM engine)' },
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

const TAB_NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'models',    label: 'Models',    icon: Cpu },
  { id: 'aiconfig',  label: 'AI Config', icon: SettingsIcon },
  { id: 'services',  label: 'Services',  icon: Server },
  { id: 'teachers',  label: 'Teachers',  icon: Users },
];

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [edition, setEdition] = useState(null); // null = loading, 'full' | 'remediation'
  const [setupState, setSetupState] = useState({
    loading: true,
    installed: false,
    config: null,
    error: null
  });

  useEffect(() => {
    (async () => {
      try {
        const ed = await window.alloAPI.getEdition?.();
        setEdition(ed || 'full');
      } catch { setEdition('full'); }
    })();
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

  if (setupState.loading || edition === null) {
    return (
      <div className="app-container loading">
        <div className="spinner"></div>
        <p>Initializing AlloFlow...</p>
      </div>
    );
  }

  // Remediation edition: the admin window only loads here when no provider is
  // configured yet (main.js jumps straight to the remediation screen otherwise).
  // Show the streamlined provider picker, which launches the remediation screen.
  if (edition === 'remediation') {
    return <RemediationSetup />;
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

  // Full-edition setup is retired: local installs are now handled by the
  // standalone AlloFlow Desktop app (desktop/), which packages its own setup,
  // provider config, and services in the command center. This screen remains
  // only so an already-installed admin instance keeps managing its services;
  // fresh installs are pointed at AlloFlow Desktop instead of SetupWizard.
  // (The remediation edition above is unaffected — it has its own setup.)
  if (!setupState.installed) {
    return (
      <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif', background: 'linear-gradient(135deg,#f1f5f9 0%,#e2e8f0 100%)' }}>
        <div style={{ maxWidth: '540px', background: '#fff', borderRadius: '18px', boxShadow: '0 10px 40px rgba(15,23,42,0.12)', padding: '36px', textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '8px' }}>🖥️</div>
          <h1 style={{ margin: '0 0 10px', fontSize: '22px', color: '#0f172a' }}>Setup has moved to AlloFlow Desktop</h1>
          <p style={{ color: '#475569', fontSize: '14.5px', lineHeight: 1.7, margin: '0 0 18px' }}>
            Local installation, AI provider configuration, and service management now live in the
            standalone <strong>AlloFlow Desktop</strong> app, which bundles everything (including
            offline classroom tools) in one installer. This admin console no longer performs
            first-time setup.
          </p>
          <p style={{ color: '#64748b', fontSize: '12.5px' }}>
            Install <code>AlloFlow-Desktop-*-setup.exe</code> (built from <code>desktop/</code>), or run
            <code> npm run package:win</code> in the <code>desktop</code> directory to build it.
          </p>
        </div>
      </div>
    );
  }

  // If installed, show admin shell with sidebar navigation
  const navigateTab = (tabId) => {
    setActiveTab(tabId);
    setSetupState(prev => ({ ...prev, showUninstall: false }));
  };

  const renderContent = () => {
    if (setupState.showUninstall) {
      return (
        <UninstallPanel
          onComplete={() => {
            checkSetupStatus();
            setSetupState(prev => ({ ...prev, showUninstall: false }));
          }}
          onCancel={() => setSetupState(prev => ({ ...prev, showUninstall: false }))}
        />
      );
    }
    switch (activeTab) {
      case 'dashboard': return <Dashboard onNavigateTab={navigateTab} />;
      case 'models':    return <Models />;
      case 'aiconfig':  return <AIConfig />;
      case 'services':  return <Services />;
      case 'teachers':  return <Teachers />;
      default:          return <Dashboard onNavigateTab={navigateTab} />;
    }
  };

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="sidebar-logo">
          <span>AlloFlow</span>
          <span className="sidebar-logo-sub">Admin</span>
        </div>
        <nav className="sidebar-nav">
          {TAB_NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item${activeTab === id && !setupState.showUninstall ? ' active' : ''}`}
              onClick={() => navigateTab(id)}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="nav-item" onClick={() => setSetupState(prev => ({ ...prev, installed: false }))}>
            <Wrench size={18} />
            <span>Re-run Setup</span>
          </button>
          <button className="nav-item danger" onClick={() => setSetupState(prev => ({ ...prev, showUninstall: true }))}>
            <Trash2 size={18} />
            <span>Uninstall</span>
          </button>
        </div>
      </aside>
      <main className="admin-content">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;
