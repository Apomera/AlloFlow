import React, { useState, useEffect } from 'react';
import { Download, Settings, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

export default function Deploy() {
  const [role, setRole] = useState('student');
  const [platform, setPlatform] = useState('win');
  const [kioskMode, setKioskMode] = useState(false);
  const [serverUrl, setServerUrl] = useState('http://localhost:8090');
  
  const [buildState, setBuildState] = useState('idle'); // idle, building, done, error
  const [buildProgress, setBuildProgress] = useState(0);
  const [buildMessage, setBuildMessage] = useState('');
  const [buildError, setError] = useState(null);
  
  const [availableBuilds, setAvailableBuilds] = useState({ student: [], teacher: [] });
  const [buildLog, setBuildLog] = useState([]);
  const [showBuildLog, setShowBuildLog] = useState(false);

  // Load available builds on mount
  useEffect(() => {
    loadAvailableBuilds();
  }, []);

  // Listen for build progress
  useEffect(() => {
    const unsubscribe = window.alloAPI.onBuildProgress((data) => {
      setBuildProgress(data.progress || 0);
      setBuildMessage(data.message || '');
    });
    return unsubscribe;
  }, []);

  const loadAvailableBuilds = async () => {
    try {
      const result = await window.alloAPI.getAvailableBuilds();
      if (result.success) {
        setAvailableBuilds(result.data);
      }
    } catch (err) {
      console.error('Failed to load builds:', err);
    }
  };

  const handleBuild = async () => {
    if (!serverUrl.trim()) {
      setError('Please enter a server URL');
      return;
    }

    setBuildState('building');
    setError(null);
    setBuildProgress(0);
    setBuildMessage('Initializing...');
    setBuildLog([]);

    try {
      const result = await window.alloAPI.buildPackage({
        role,
        platform,
        kioskMode,
        serverUrl: serverUrl.trim()
      });

      if (result.success) {
        setAvailableBuilds(result.data.availableBuilds || availableBuilds);
        setBuildState('done');
        setBuildProgress(100);
        setBuildMessage('Build complete!');
        
        // Reload available builds
        setTimeout(() => loadAvailableBuilds(), 500);
      } else {
        setBuildState('error');
        setError(result.error || 'Build failed');
      }
    } catch (err) {
      console.error('Build error:', err);
      setBuildState('error');
      setError(err.message || 'Unknown build error');
    }
  };

  const handleDownloadBuild = (buildPath, fileName) => {
    // In production, this would download the file
    // For now, show where the file is located
    alert(`Build ready at: ${buildPath}\n\nManually copy this file to distribute.`);
  };

  const handleDeleteBuild = async (role_name) => {
    if (!window.confirm('Delete all builds?')) return;
    
    try {
      const result = await window.alloAPI.cleanBuilds();
      if (result.success) {
        loadAvailableBuilds();
      }
    } catch (err) {
      console.error('Failed to delete builds:', err);
    }
  };

  const handleShowBuildLog = async () => {
    try {
      const log = await window.alloAPI.getBuildLog();
      setBuildLog(log);
      setShowBuildLog(!showBuildLog);
    } catch (err) {
      console.error('Failed to get build log:', err);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Client Package Builder</h2>
        <p>Create ready-to-deploy student and teacher applications</p>
      </div>

      {buildError && (
        <div style={{
          padding: '0.75rem 1rem',
          marginBottom: '1rem',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.5)',
          borderRadius: '6px',
          color: 'var(--color-error)',
          fontSize: '0.875rem'
        }}>
          {buildError}
        </div>
      )}

      {/* Build Configuration */}
      <div className="card">
        <div className="card-header">
          <h3>Build Configuration</h3>
        </div>
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {/* Role Selection */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Application Role
            </label>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="role" 
                  value="student"
                  checked={role === 'student'}
                  onChange={(e) => setRole(e.target.value)}
                  disabled={buildState === 'building'}
                />
                <span><strong>📚 Student App</strong> — Access lessons, quizzes, games</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="role" 
                  value="teacher"
                  checked={role === 'teacher'}
                  onChange={(e) => setRole(e.target.value)}
                  disabled={buildState === 'building'}
                />
                <span><strong>👨‍🏫 Teacher App</strong> — Create activities, manage classes</span>
              </label>
            </div>
          </div>

          {/* Platform Selection */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Platform
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="platform"
                  value="win"
                  checked={platform === 'win'}
                  onChange={(e) => setPlatform(e.target.value)}
                  disabled={buildState === 'building'}
                />
                <span>Windows (.exe)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="platform"
                  value="mac"
                  checked={platform === 'mac'}
                  onChange={(e) => setPlatform(e.target.value)}
                  disabled={buildState === 'building'}
                />
                <span>macOS (.dmg)</span>
              </label>
            </div>
          </div>

          {/* Server URL */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Server URL
            </label>
            <input
              type="text"
              placeholder="http://your-server.com"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              disabled={buildState === 'building'}
            />
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
              URL where app will connect (e.g., your domain or cluster IP)
            </p>
          </div>

          {/* Kiosk Mode */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input 
                type="checkbox"
                checked={kioskMode}
                onChange={(e) => setKioskMode(e.target.checked)}
                disabled={buildState === 'building'}
              />
              <span>
                <strong>Kiosk Mode</strong> — Full screen, no window chrome (for classroom tablets/displays)
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Build Progress */}
      <div className="card">
        <div className="card-header">
          <h3>Build Package</h3>
        </div>
        <div style={{ padding: '1rem' }}>
          {buildState === 'idle' && (
            <button 
              className="btn btn-primary"
              onClick={handleBuild}
              disabled={!serverUrl.trim()}
            >
              <Settings size={16} style={{ marginRight: '0.5rem' }} />
              Build {role.charAt(0).toUpperCase() + role.slice(1)} {platform === 'win' ? '.exe' : '.dmg'}
            </button>
          )}

          {buildState === 'building' && (
            <div>
              <div style={{
                width: '100%',
                height: '8px',
                backgroundColor: '#f0f0f0',
                borderRadius: '4px',
                overflow: 'hidden',
                marginBottom: '0.75rem'
              }}>
                <div style={{
                  height: '100%',
                  backgroundColor: '#667eea',
                  width: `${buildProgress}%`,
                  transition: 'width 0.3s ease'
                }}></div>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                {buildProgress}% — {buildMessage}
              </p>
            </div>
          )}

          {buildState === 'done' && (
            <div style={{
              padding: '1rem',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '6px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <span style={{ fontSize: '1.5rem', color: 'var(--color-success)' }}>✓</span>
                <div>
                  <h4 style={{ margin: 0 }}>Build Complete!</h4>
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', margin: 0 }}>
                    {buildMessage}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  className="btn btn-primary"
                  onClick={() => setBuildState('idle')}
                >
                  Build Another
                </button>
                <button 
                  className="btn"
                  onClick={handleShowBuildLog}
                >
                  {showBuildLog ? 'Hide Log' : 'Show Log'}
                </button>
              </div>
            </div>
          )}

          {buildState === 'error' && (
            <div style={{
              padding: '1rem',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '6px'
            }}>
              <p style={{ marginTop: 0, color: 'var(--color-error)' }}>
                {buildError}
              </p>
              <button 
                className="btn"
                onClick={() => setBuildState('idle')}
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Build Log */}
      {showBuildLog && buildLog.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3>Build Log</h3>
          </div>
          <div style={{
            padding: '1rem',
            backgroundColor: '#1e1e1e',
            color: '#00ff00',
            fontFamily: 'monospace',
            fontSize: '0.75rem',
            maxHeight: '300px',
            overflow: 'auto',
            borderRadius: '4px'
          }}>
            {buildLog.map((line, idx) => (
              <div key={idx} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {line}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available Builds */}
      {(availableBuilds.student.length > 0 || availableBuilds.teacher.length > 0) && (
        <div className="card">
          <div className="card-header">
            <h3>Available Builds</h3>
          </div>
          <div style={{ padding: '1rem' }}>
            {availableBuilds.student.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h4>📚 Student Builds</h4>
                <div style={{ display: 'grid', gap: '0.75rem', marginTop: '0.75rem' }}>
                  {availableBuilds.student.map((build, idx) => (
                    <div key={idx} style={{
                      padding: '0.75rem',
                      backgroundColor: 'var(--color-bg)',
                      borderRadius: '4px',
                      border: '1px solid var(--color-border)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div style={{ fontSize: '0.875rem' }}>
                        <p style={{ margin: 0, fontWeight: 600 }}>{build.name}</p>
                        <p style={{ margin: '0.25rem 0 0', color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                          {build.platform.toUpperCase()} • {build.size} KB • {new Date(build.created).toLocaleString()}
                        </p>
                      </div>
                      <button 
                        className="btn btn-small"
                        onClick={() => handleDownloadBuild(build.path, build.name)}
                      >
                        <Download size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {availableBuilds.teacher.length > 0 && (
              <div>
                <h4>👨‍🏫 Teacher Builds</h4>
                <div style={{ display: 'grid', gap: '0.75rem', marginTop: '0.75rem' }}>
                  {availableBuilds.teacher.map((build, idx) => (
                    <div key={idx} style={{
                      padding: '0.75rem',
                      backgroundColor: 'var(--color-bg)',
                      borderRadius: '4px',
                      border: '1px solid var(--color-border)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div style={{ fontSize: '0.875rem' }}>
                        <p style={{ margin: 0, fontWeight: 600 }}>{build.name}</p>
                        <p style={{ margin: '0.25rem 0 0', color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                          {build.platform.toUpperCase()} • {build.size} KB • {new Date(build.created).toLocaleString()}
                        </p>
                      </div>
                      <button 
                        className="btn btn-small"
                        onClick={() => handleDownloadBuild(build.path, build.name)}
                      >
                        <Download size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(availableBuilds.student.length > 0 || availableBuilds.teacher.length > 0) && (
              <button 
                className="btn btn-small"
                onClick={handleDeleteBuild}
                style={{ marginTop: '1rem' }}
              >
                <Trash2 size={14} style={{ marginRight: '0.5rem' }} />
                Delete All Builds
              </button>
            )}
          </div>
        </div>
      )}

      {/* Deployment Instructions */}
      <div className="card">
        <div className="card-header">
          <h3>Deployment Instructions</h3>
        </div>
        <div style={{ display: 'grid', gap: '1rem', padding: '1rem' }}>
          <div>
            <h4 style={{ marginBottom: '0.5rem' }}>1. Configure Server URL</h4>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', margin: 0 }}>
              Enter the URL where students will connect (your domain or cluster IP). This is baked into the installer.
            </p>
          </div>
          <div>
            <h4 style={{ marginBottom: '0.5rem' }}>2. Select Role & Platform</h4>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', margin: 0 }}>
              Choose student or teacher app, and Windows (.exe) or macOS (.dmg) platform.
            </p>
          </div>
          <div>
            <h4 style={{ marginBottom: '0.5rem' }}>3. Build Package</h4>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', margin: 0 }}>
              Click "Build" to create the installer (~85-95 MB). First build takes 1-2 minutes.
            </p>
          </div>
          <div>
            <h4 style={{ marginBottom: '0.5rem' }}>4. Deploy to Devices</h4>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', margin: 0 }}>
              Share installer via USB, file share, Intune, or MDM. Students run once to install.
            </p>
          </div>
          <div>
            <h4 style={{ marginBottom: '0.5rem' }}>5. Launch AlloFlow</h4>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', margin: 0 }}>
              Students click desktop shortcut or Start Menu. App auto-connects to your server.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
