import React, { useState } from 'react';
import { Download, Settings } from 'lucide-react';

export default function Deploy() {
  const [buildState, setBuildState] = useState('idle'); // idle, building, done
  const [role, setRole] = useState('student');
  const [schoolName, setSchoolName] = useState('');

  const handleBuild = () => {
    setBuildState('building');
    setTimeout(() => {
      setBuildState('done');
      setTimeout(() => setBuildState('idle'), 3000);
    }, 2000);
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Package Builder</h2>
        <p>Create ready-to-deploy student and teacher applications</p>
      </div>

      {/* Build settings */}
      <div className="card">
        <div className="card-header">
          <h3>Build Configuration</h3>
        </div>
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              School Name
            </label>
            <input
              type="text"
              placeholder="e.g., Lincoln Elementary"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
            />
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
              Shown in app title bar
            </p>
          </div>

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
                />
                <span><strong>👨‍🏫 Teacher App</strong> — Create activities, manage classes</span>
              </label>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Server URL
            </label>
            <input
              type="text"
              placeholder="http://localhost:3000"
              defaultValue="http://localhost:3000"
              disabled
            />
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
              Auto-filled from admin server (use your domain in production)
            </p>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Platform
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="radio" name="platform" defaultChecked />
                <span>Windows (.exe)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="radio" name="platform" />
                <span>macOS (.dmg)</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Build section */}
      <div className="card">
        <div className="card-header">
          <h3>Build Package</h3>
        </div>
        <div>
          {buildState === 'idle' && (
            <div>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                Click below to build the {role} app for {schoolName || 'your school'}
              </p>
              <button 
                className="btn btn-primary"
                onClick={handleBuild}
                disabled={!schoolName}
              >
                <Settings size={16} style={{ marginRight: '0.5rem' }} />
                Build {role.charAt(0).toUpperCase() + role.slice(1)} App
              </button>
            </div>
          )}

          {buildState === 'building' && (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem', animation: 'spin 1s linear infinite' }}>
                ⚙️
              </div>
              <p>Building package...</p>
            </div>
          )}

          {buildState === 'done' && (
            <div style={{ textAlign: 'center', padding: '2rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '6px' }}>
              <div style={{ fontSize: '2rem', marginBottom: '1rem', color: 'var(--color-success)' }}>✓</div>
              <h4 style={{ marginBottom: '0.5rem' }}>Build Complete!</h4>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                AlloFlow-{role}-Setup.exe (125 MB)
              </p>
              <button className="btn btn-success">
                <Download size={16} style={{ marginRight: '0.5rem' }} />
                Download Now
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Deployment instructions */}
      <div className="card">
        <div className="card-header">
          <h3>Deployment Instructions</h3>
        </div>
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div>
            <h4 style={{ marginBottom: '0.5rem' }}>1. Download the Package</h4>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
              Build the app above and download the .exe installer
            </p>
          </div>
          <div>
            <h4 style={{ marginBottom: '0.5rem' }}>2. Deploy to Student Devices</h4>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
              Share the installer via USB drive, file share, or Intune/MDM. Students run once to install.
            </p>
          </div>
          <div>
            <h4 style={{ marginBottom: '0.5rem' }}>3. Launch AlloFlow</h4>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
              Students click the shortcut. App auto-connects to your admin server.
            </p>
          </div>
        </div>
      </div>

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}
