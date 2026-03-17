import React, { useState, useEffect } from 'react';
import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import './App.css';

export default function App() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initApp = async () => {
      try {
        const appConfig = await window.clientAPI.getConfig();
        setConfig(appConfig);
        
        // Configure auto-update
        if (appConfig.serverUrl) {
          await window.clientAPI.configureUpdates({
            updateServer: `${appConfig.serverUrl}/updates`,
            channel: 'production'
          });
        }
      } catch (err) {
        console.error('Failed to initialize app:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    initApp();
  }, []);

  if (loading) {
    return (
      <div className="app-loading">
        <div className="spinner"></div>
        <p>Loading AlloFlow...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-error">
        <h2>Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="app-error">
        <h2>Configuration Error</h2>
        <p>Failed to load app configuration</p>
      </div>
    );
  }

  // Role-based rendering
  if (config.role === 'teacher') {
    return <TeacherDashboard config={config} />;
  }

  // Default to student
  return <StudentDashboard config={config} />;
}
