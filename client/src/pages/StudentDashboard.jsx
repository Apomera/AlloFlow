import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BookOpen, BarChart3, Settings } from 'lucide-react';

export default function StudentDashboard({ config }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);

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

  return (
    <div className="dashboard student-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <h1>AlloFlow Student</h1>
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

        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading sessions...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="empty-state">
            <BookOpen size={48} />
            <h2>No Sessions Available</h2>
            <p>Ask your teacher for a session code to join a lesson</p>
          </div>
        ) : (
          <div className="sessions-grid">
            {sessions.map(session => (
              <div key={session.id} className="session-card">
                <div className="card-header">
                  <h3>{session.code}</h3>
                  <span className="badge">{session.mode || 'Learning'}</span>
                </div>
                <div className="card-body">
                  <p className="session-info">
                    <BookOpen size={16} />
                    {session.content?.title || 'Unnamed Lesson'}
                  </p>
                  {session.roster && (
                    <p className="session-info">
                      Students: {session.roster.length || 0}
                    </p>
                  )}
                </div>
                <div className="card-footer">
                  <button
                    className="btn btn-primary"
                    onClick={() => setSelectedSession(session)}
                  >
                    Join Lesson
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal for lesson */}
      {selectedSession && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{selectedSession.code}</h2>
              <button
                className="btn-close"
                onClick={() => setSelectedSession(null)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>Opening lesson: {selectedSession.content?.title}</p>
              <p style={{ marginTop: '1rem', color: '#666' }}>
                This is a minimal student interface. Full lesson content will load here.
              </p>
            </div>
            <div className="modal-footer">
              <button
                className="btn"
                onClick={() => setSelectedSession(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .dashboard {
          display: flex;
          flex-direction: column;
          height: 100vh;
          background-color: #f5f5f5;
        }

        .dashboard-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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

        .loading,
        .empty-state {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          height: 400px;
          color: #999;
        }

        .empty-state h2 {
          margin: 1rem 0;
          color: #666;
        }

        .sessions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }

        .session-card {
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .session-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        .card-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .card-header h3 {
          margin: 0;
          font-size: 18px;
        }

        .badge {
          background: rgba(255,255,255,0.3);
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }

        .card-body {
          padding: 1rem;
        }

        .session-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 0.5rem 0;
          color: #666;
          font-size: 14px;
        }

        .card-footer {
          padding: 1rem;
          border-top: 1px solid #eee;
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
        }

        .btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          width: 100%;
        }

        .btn-primary:hover {
          opacity: 0.9;
        }

        .btn-small {
          background-color: rgba(255,255,255,0.2);
          color: white;
          padding: 0.5rem 1rem;
          font-size: 12px;
        }

        .btn {
          background-color: #ddd;
          color: #333;
        }

        .btn:hover {
          background-color: #bbb;
        }

        .modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 8px;
          width: 90%;
          max-width: 500px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        }

        .modal-header {
          padding: 1.5rem;
          border-bottom: 1px solid #eee;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-header h2 {
          margin: 0;
        }

        .btn-close {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #999;
        }

        .modal-body {
          padding: 1.5rem;
        }

        .modal-footer {
          padding: 1rem 1.5rem;
          border-top: 1px solid #eee;
          text-align: right;
        }

        .spinner {
          border: 3px solid #f0f0f0;
          border-top: 3px solid #667eea;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
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

          .sessions-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
