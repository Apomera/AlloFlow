import React, { useState, useEffect } from 'react';
import { Users, BookOpen, MessageSquare, RefreshCw, ChevronDown, ChevronRight, UserPlus, Trash2 } from 'lucide-react';

const BACKEND = 'http://localhost:3747';

export default function Teachers() {
  const [teachers, setTeachers]       = useState({});
  const [accounts, setAccounts]       = useState([]);
  const [selected, setSelected]       = useState(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [expanded, setExpanded]       = useState({});

  // Create account form
  const [showCreate, setShowCreate]   = useState(false);
  const [createName, setCreateName]   = useState('');
  const [createId, setCreateId]       = useState('');
  const [createRole, setCreateRole]   = useState('teacher');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');

  const loadAccounts = async () => {
    try {
      const resp = await fetch(`${BACKEND}/auth/accounts`);
      if (resp.ok) { const d = await resp.json(); setAccounts(d.accounts || []); }
    } catch { /* backend may not be running */ }
  };

  const load = async () => {
    setLoading(true); setError('');
    try {
      const resp = await fetch('http://localhost:3730/api/teachers');
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const { teachers: data } = await resp.json();
      setTeachers(data || {});
      if (selected && !data[selected]) setSelected(null);
    } catch (e) {
      setError('Could not reach the local app server. Make sure it is running.');
    }
    setLoading(false);
  };

  useEffect(() => { load(); loadAccounts(); }, []);

  const handleCreate = async () => {
    if (!createName.trim()) { setCreateError('Name is required.'); return; }
    if (!createId.trim())   { setCreateError('Login ID is required.'); return; }
    setCreateLoading(true); setCreateError(''); setCreateSuccess('');
    try {
      const resp = await fetch(`${BACKEND}/auth/create-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: createName.trim(), loginId: createId.trim(), role: createRole }),
      });
      const data = await resp.json();
      if (!resp.ok) { setCreateError(data.error || 'Failed to create account.'); }
      else {
        setCreateSuccess(`Account created! Login ID: ${data.user.loginId}`);
        setCreateName(''); setCreateId(''); setCreateRole('teacher');
        setShowCreate(false);
        loadAccounts();
      }
    } catch { setCreateError('Could not connect to backend (port 3747).'); }
    setCreateLoading(false);
  };

  const ids      = Object.keys(teachers);
  const teacher  = selected ? teachers[selected] : null;
  const lessons  = teacher?.lessons  || [];
  const chats    = teacher?.chats    || [];
  const history  = teacher?.history  || [];

  const toggle = (key) => setExpanded(e => ({ ...e, [key]: !e[key] }));

  const pill = (label, color) => (
    <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '999px', background: color + '22', color, letterSpacing: '0.02em' }}>
      {label}
    </span>
  );

  const rolePill = (role) => role === 'parent'
    ? pill('Parent', '#0891b2')
    : pill('Teacher', '#6366f1');

  const Section = ({ id, icon, label, items, renderItem }) => (
    <div style={{ marginBottom: '16px', border: '1.5px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
      <button
        onClick={() => toggle(id)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: '#f8fafc', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '14px', color: '#334155' }}
      >
        {icon}
        {label} {pill(items.length, '#6366f1')}
        <span style={{ marginLeft: 'auto' }}>{expanded[id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</span>
      </button>
      {expanded[id] && (
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {items.length === 0
            ? <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>Nothing saved yet.</p>
            : items.map((item, i) => <div key={i}>{renderItem(item, i)}</div>)
          }
        </div>
      )}
    </div>
  );

  const inputStyle = {
    padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0',
    fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box',
  };

  return (
    <div style={{ padding: '28px 32px', maxWidth: '960px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: '800', color: '#1e293b' }}>Accounts</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Manage teacher and parent accounts for the local app.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => { setShowCreate(true); setCreateError(''); setCreateSuccess(''); }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', borderRadius: '8px', border: 'none', background: '#6366f1', cursor: 'pointer', fontWeight: '600', fontSize: '13px', color: '#fff' }}
          >
            <UserPlus size={14} /> New Account
          </button>
          <button
            onClick={() => { load(); loadAccounts(); }}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: '600', fontSize: '13px', color: '#374151' }}
          >
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Create Account Panel */}
      {showCreate && (
        <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '14px', padding: '20px 24px', marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>Create New Account</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '12px', alignItems: 'end' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', display: 'block', marginBottom: '4px' }}>Full Name</label>
              <input style={inputStyle} placeholder="e.g. Ms. Johnson" value={createName} onChange={e => setCreateName(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', display: 'block', marginBottom: '4px' }}>Login ID</label>
              <input style={inputStyle} placeholder="e.g. ms-johnson" value={createId} onChange={e => setCreateId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', display: 'block', marginBottom: '4px' }}>Role</label>
              <select style={{ ...inputStyle, width: 'auto' }} value={createRole} onChange={e => setCreateRole(e.target.value)}>
                <option value="teacher">Teacher</option>
                <option value="parent">Parent</option>
              </select>
            </div>
          </div>
          {createError   && <p style={{ color: '#dc2626', fontSize: '13px', margin: '10px 0 0' }}>{createError}</p>}
          {createSuccess && <p style={{ color: '#16a34a', fontSize: '13px', margin: '10px 0 0', fontWeight: '600' }}>{createSuccess}</p>}
          <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
            <button
              onClick={handleCreate} disabled={createLoading}
              style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', background: '#6366f1', color: '#fff', fontWeight: '700', fontSize: '13px', cursor: createLoading ? 'not-allowed' : 'pointer', opacity: createLoading ? 0.7 : 1 }}
            >
              {createLoading ? 'Creating…' : 'Create Account'}
            </button>
            <button onClick={() => setShowCreate(false)} style={{ padding: '9px 16px', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Registered Accounts */}
      {accounts.length > 0 && (
        <div style={{ marginBottom: '28px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: '700', color: '#64748b', letterSpacing: '0.05em', margin: '0 0 10px', textTransform: 'uppercase' }}>Registered Accounts ({accounts.length})</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
            {accounts.map(acc => (
              <div key={acc.loginId} style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: '700', fontSize: '14px', color: '#1e293b' }}>{acc.displayName}</span>
                  {rolePill(acc.role)}
                </div>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>ID: {acc.loginId}</span>
                {acc.createdAt && <span style={{ fontSize: '11px', color: '#cbd5e1' }}>{new Date(acc.createdAt).toLocaleDateString()}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: '10px', padding: '12px 16px', color: '#dc2626', fontSize: '14px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {/* Synced Teacher Data */}
      <h2 style={{ fontSize: '14px', fontWeight: '700', color: '#64748b', letterSpacing: '0.05em', margin: '0 0 10px', textTransform: 'uppercase' }}>Synced Activity ({ids.length})</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '20px', alignItems: 'start' }}>
        {/* Sidebar: teacher list */}
        <div style={{ border: '1.5px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', background: '#fff' }}>
          {ids.length === 0 ? (
            <p style={{ padding: '16px', color: '#94a3b8', fontSize: '13px', margin: 0 }}>
              No synced activity yet.
            </p>
          ) : (
            ids.map(id => {
              const t = teachers[id];
              const isSelected = selected === id;
              return (
                <button
                  key={id}
                  onClick={() => setSelected(isSelected ? null : id)}
                  style={{
                    width: '100%', textAlign: 'left', padding: '12px 14px', border: 'none', borderBottom: '1px solid #f1f5f9',
                    background: isSelected ? '#eef2ff' : '#fff',
                    cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '2px',
                    borderLeft: isSelected ? '3px solid #6366f1' : '3px solid transparent',
                  }}
                >
                  <span style={{ fontWeight: '700', fontSize: '14px', color: isSelected ? '#4f46e5' : '#1e293b' }}>
                    {t.displayName || id}
                  </span>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>ID: {id}</span>
                  {t.syncedAt && <span style={{ fontSize: '11px', color: '#cbd5e1' }}>Synced {new Date(t.syncedAt).toLocaleDateString()}</span>}
                </button>
              );
            })
          )}
        </div>

        {/* Detail panel */}
        <div>
          {!selected ? (
            <div style={{ border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '40px 24px', textAlign: 'center', color: '#94a3b8', background: '#fafafa' }}>
              <Users size={32} style={{ marginBottom: '10px', opacity: 0.4 }} />
              <p style={{ margin: 0, fontSize: '14px' }}>Select an account to view their synced data.</p>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                  🎓
                </div>
                <div>
                  <h2 style={{ margin: '0 0 2px', fontSize: '18px', fontWeight: '800', color: '#1e293b' }}>{teacher?.displayName || selected}</h2>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>Login ID: {selected}</span>
                </div>
              </div>

              <Section id="lessons" icon={<BookOpen size={15} />} label="Saved Lessons" items={lessons}
                renderItem={(item, i) => (
                  <div key={i} style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: '8px', fontSize: '13px', color: '#334155' }}>
                    <div style={{ fontWeight: '600' }}>{item.title || `Lesson ${i + 1}`}</div>
                    {item.subject && <div style={{ color: '#64748b', marginTop: '2px' }}>Subject: {item.subject}</div>}
                    {item.createdAt && <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '2px' }}>{new Date(item.createdAt).toLocaleString()}</div>}
                  </div>
                )}
              />

              <Section id="chats" icon={<MessageSquare size={15} />} label="Chat History" items={chats}
                renderItem={(item, i) => (
                  <div key={i} style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: '8px', fontSize: '13px', color: '#334155' }}>
                    <div style={{ fontWeight: '600' }}>{item.title || `Chat ${i + 1}`}</div>
                    {item.preview && <div style={{ color: '#64748b', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.preview}</div>}
                    {item.createdAt && <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '2px' }}>{new Date(item.createdAt).toLocaleString()}</div>}
                  </div>
                )}
              />
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

