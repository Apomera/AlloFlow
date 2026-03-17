import React, { useState, useEffect } from 'react';
import './App.css';
import Dashboard from './pages/Dashboard';
import Services from './pages/Services';
import Models from './pages/Models';
import Cluster from './pages/Cluster';
import AIConfig from './pages/AIConfig';
import Security from './pages/Security';
import Deploy from './pages/Deploy';
import SetupWizard from './setup/SetupWizard';
import UpdateNotification from './components/UpdateNotification';

const TABS = [
  { id: 'dashboard', label: '📊 Dashboard', component: Dashboard },
  { id: 'services', label: '⚙ Services', component: Services },
  { id: 'models', label: '🤖 Models', component: Models },
  { id: 'cluster', label: '🌐 Cluster', component: Cluster },
  { id: 'ai', label: '🧠 AI Config', component: AIConfig },
  { id: 'security', label: '🔒 Security', component: Security },
  { id: 'deploy', label: '📦 Deploy', component: Deploy },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDark, setIsDark] = useState(true);
  const [setupComplete, setSetupComplete] = useState(null); // null = loading, true = done, false = needs setup

  useEffect(() => {
    // Check if setup is complete
    const checkSetup = async () => {
      try {
        // Check if .env has SERVER_IP configuration
        const env = await window.alloAPI.readEnv();
        const isSetupComplete = env?.success && env?.content && env.content.includes('SERVER_IP');
        console.log('[Setup Check]', { envSuccess: env?.success, hasServerIP: env?.content?.includes('SERVER_IP'), isSetupComplete });
        setSetupComplete(isSetupComplete);
      } catch (err) {
        console.error('[Setup Check Error]', err);
        // If there's an error, assume setup is not complete
        setSetupComplete(false);
      }
    };
    
    checkSetup();
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const handleSetupComplete = () => {
    setSetupComplete(true);
  };

  // Show loading state while checking
  if (setupComplete === null) {
    return (
      <div className="app">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <div className="loading-spinner">Loading...</div>
        </div>
      </div>
    );
  }

  // Show setup wizard if not complete
  if (setupComplete === false) {
    return <SetupWizard onComplete={handleSetupComplete} />;
  }

  // Show main admin center
  const ActiveComponent = TABS.find(t => t.id === activeTab)?.component || Dashboard;

  return (
    <div className="app">
      <UpdateNotification />
      
      <header className="header">
        <h1>⚡ AlloFlow Admin Center</h1>
        <button 
          className="theme-toggle"
          onClick={() => setIsDark(!isDark)}
          title={isDark ? 'Light mode' : 'Dark mode'}
        >
          {isDark ? '☀️' : '🌙'}
        </button>
      </header>

      <nav className="tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="content">
        <ActiveComponent />
      </main>

      <footer className="footer">
        <p>AlloFlow Admin | Version 0.2.0 | All services running locally (127.0.0.1)</p>
      </footer>
    </div>
  );
}
