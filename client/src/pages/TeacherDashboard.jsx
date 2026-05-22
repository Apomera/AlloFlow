import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, Users, Settings } from 'lucide-react';

export default function TeacherDashboard({ config }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newSessionCode, setNewSessionCode] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${config.serverUrl}/api/collections/sessions/records`);
      setSessions(response.data.items || []);
    } catch (err) {
      console.error('Failed to load sessions:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateSessionCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleCreateSession = async () => {
    const code = newSessionCode || generateSessionCode();

    try {
      const response = await axios.post(
        `${config.serverUrl}/api/collections/sessions/records`,
        {
          app_id: 'alloflow-client',
          code: code,
          mode: 'teacher-led',
          content: { title: `Session ${code}`, created_by: 'teacher' },
          roster: [],
          metadata: { created_at: new Date().toISOString() }
        }
      );
      
      setSessions([...sessions, response.data]);
      setNewSessionCode('');
      setShowCreateForm(false);
    } catch (err) {
      console.error('Failed to create session:', err);
      setError(err.message);
    }
  };

  const handleDeleteSession = async (id) => {
    if (!window.confirm('Delete this session?')) return;

    try {
      await axios.delete(
        `${config.serverUrl}/api/collections/sessions/records/${id}`
      );
      setSessions(sessions.filter(s => s.id !== id));
    } catch (err) {
      console.error('Failed to delete session:', err);
      setError(err.message);
    }
  };

  return (
    <div className="dashboard teacher-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <h1>AlloFlow Teacher</h1>
          <div className="server-info">
            <span>Server: {config.serverUrl}</span>
            <button className="btn-small" onClick={() => loadSessions()}>
              Refresh
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-main">
        {error && (
          <div className="error-banner">
            <p>{error}</p>
          </div>
        )}

        {/* Create Session */}
        <div className="card">
          <div className="card-header">
            <h3>Create Lesson Session</h3>
          </div>
          {!showCreateForm ? (
            <div style={{ padding: '1rem' }}>
              <button
                className="btn btn-primary"
                onClick={() => setShowCreateForm(true)}
              >
                <Plus size={16} style={{ marginRight: '0.5rem' }} />
                New Session
              </button>
            </div>
          ) : (
            <div style={{ padding: '1rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                  Session Code (optional)
                </label>
                <input
                  type="text"
                  placeholder="Leave empty to auto-generate"
                  value={newSessionCode}
                  onChange={(e) => setNewSessionCode(e.target.value.toUpperCase())}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                  maxLength={6}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-primary" onClick={handleCreateSession}>
                  Create
                </button>
                <button
                  className="btn"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sessions List */}
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <div className="card-header">
            <h3>Active Sessions ({sessions.length})</h3>
          </div>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <div className="spinner"></div>
              <p>Loading sessions...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div style={{
              padding: '2rem',
              textAlign: 'center',
              color: '#999'
            }}>
              <Users size={48} style={{ margin: '0 auto', marginBottom: '1rem', opacity: 0.3 }} />
              <p>No active sessions</p>
            </div>
          ) : (
            <div style={{ padding: '1rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #eee' }}>
                    <th style={{ textAlign: 'left', padding: '0.75rem', fontWeight: 600 }}>Code</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem', fontWeight: 600 }}>Title</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem', fontWeight: 600 }}>Students</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem', fontWeight: 600 }}>Mode</th>
                    <th style={{ textAlign: 'right', padding: '0.75rem', fontWeight: 600 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map(session => (
                    <tr key={session.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontWeight: 600 }}>
                        {session.code}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        {session.content?.title || 'Untitled'}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        {Array.isArray(session.roster) ? session.roster.length : 0}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '4px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          backgroundColor: 'rgba(102, 126, 234, 0.1)',
                          color: '#667eea'
                        }}>
                          {session.mode || 'learning'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        <button
                          className="btn btn-small"
                          onClick={() => handleDeleteSession(session.id)}
                          title="Delete session"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <style>{`
        .dashboard {
          display: flex;
          flex-direction: column;
          height: 100vh;
          background-color: #f5f5f5;
        }

        .dashboard-header {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          color: white;
          padding: 2rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .dashboard-header h1 {
          font-size: 32px;
          margin: 0;
        }

        .server-info {
          display: flex;
          gap: 1rem;
          align-items: center;
          font-size: 14px;
          opacity: 0.9;
        }

        .dashboard-main {
          flex: 1;
          overflow-y: auto;
          padding: 2rem;
        }

        .error-banner {
          background-color: #fee;
          border: 1px solid #fcc;
          color: #c33;
          padding: 1rem;
          border-radius: 6px;
          margin-bottom: 1rem;
        }

        .card {
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          overflow: hidden;
        }

        .card-header {
          background-color: #f9f9f9;
          padding: 1rem;
          border-bottom: 1px solid #eee;
        }

        .card-header h3 {
          margin: 0;
          font-size: 18px;
          color: #333;
        }

        input {
          font-family: inherit;
          font-size: inherit;
        }

        .btn,
        .btn-small,
        .btn-primary {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: background-color 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }

        .btn-primary {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          color: white;
          width: 100%;
          justify-content: center;
        }

        .btn-primary:hover {
          opacity: 0.9;
        }

        .btn-small {
          background-color: rgba(255,255,255,0.2);
          color: white;
          padding: 0.5rem 1rem;
          font-size: 12px;
          width: auto;
        }

        .btn {
          background-color: #ddd;
          color: #333;
          width: auto;
        }

        .btn:hover {
          background-color: #bbb;
        }

        .spinner {
          border: 3px solid #f0f0f0;
          border-top: 3px solid #f5576c;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin: 0 auto 1rem;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .dashboard-header {
            padding: 1rem;
          }

          .dashboard-header h1 {
            font-size: 24px;
          }

          .header-content {
            flex-direction: column;
            gap: 1rem;
          }

          table {
            font-size: 13px;
          }

          th, td {
            padding: 0.5rem !important;
          }
        }
      `}</style>
    </div>
  );
}
