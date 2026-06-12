// AlloFlow Section: TEACHER_GATE
// @section TEACHER_GATE — Teacher/parent login gate (login only; accounts created in admin)
const TeacherGate = React.memo((props) => {
    const Ext = window.AlloModules && window.AlloModules.TeacherGate;
    if (Ext) return <Ext {...props} />;
    if (!props.isOpen) return null;

    const [loginId, setLoginId] = React.useState('');
    const [error, setError]     = React.useState('');
    const [loading, setLoading] = React.useState(false);

    const handleLogin = async () => {
        if (!loginId.trim()) { setError('Please enter your Login ID.'); return; }
        setLoading(true); setError('');
        try {
            const res = await window.__alloAuth.login(loginId.trim());
            if (res && res.token) {
                props.onUnlock && props.onUnlock();
                props.onClose && props.onClose();
            } else {
                setError((res && res.error) || 'Login ID not found. Contact your administrator.');
            }
        } catch (e) {
            setError(e.message || 'Could not connect to local server.');
        }
        setLoading(false);
    };

    const handleContinueWithoutSignIn = () => {
        props.onUnlock && props.onUnlock();
        props.onClose && props.onClose();
    };

    const inputStyle = {
        width: '100%', padding: '10px 12px', borderRadius: '8px',
        border: '1.5px solid #cbd5e1', fontSize: '15px', outline: 'none',
        marginTop: '6px', boxSizing: 'border-box',
    };
    const btnPrimary = {
        width: '100%', padding: '11px', borderRadius: '8px', border: 'none',
        background: '#6366f1', color: '#fff', fontWeight: '700', fontSize: '15px',
        cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
        marginTop: '10px',
    };
    const btnSecondary = {
        width: '100%', padding: '11px', borderRadius: '8px',
        border: '1.5px solid #cbd5e1', background: '#fff', color: '#334155',
        fontWeight: '700', fontSize: '14px', cursor: 'pointer', marginTop: '8px',
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(15,23,42,0.55)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
        }}>
            <div style={{
                background: '#fff', borderRadius: '16px', padding: '32px 28px',
                width: '100%', maxWidth: '360px', boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
                display: 'flex', flexDirection: 'column', gap: '4px',
            }}>
                <div style={{ fontSize: '28px', textAlign: 'center', marginBottom: '4px' }}>🎓</div>
                <h2 style={{ margin: '0 0 4px', fontSize: '20px', fontWeight: '800', textAlign: 'center', color: '#1e293b' }}>
                    Educator Sign In
                </h2>
                <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#64748b', textAlign: 'center' }}>
                    Enter your Login ID to access educator tools.
                </p>
                <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                    Login ID
                    <input
                        style={inputStyle}
                        placeholder="e.g. ms-johnson"
                        value={loginId}
                        onChange={e => { setLoginId(e.target.value); setError(''); }}
                        onKeyDown={e => e.key === 'Enter' && handleLogin()}
                        autoFocus
                    />
                </label>
                {error && <p style={{ color: '#ef4444', fontSize: '13px', margin: '6px 0 0' }}>{error}</p>}
                <button style={btnPrimary} onClick={handleLogin} disabled={loading}>
                    {loading ? 'Signing in…' : 'Sign In'}
                </button>
                <button
                    style={btnSecondary}
                    onClick={handleContinueWithoutSignIn}
                    disabled={loading}
                >
                    Continue without sign in
                </button>
                <p style={{ color: '#94a3b8', fontSize: '12px', textAlign: 'center', margin: '10px 0 0', lineHeight: '1.5' }}>
                    Sign in enables account-specific access, but guest educator mode is available.
                </p>
                <button
                    onClick={props.onClose}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '13px', marginTop: '6px', padding: 0 }}
                >
                    Cancel
                </button>
            </div>
        </div>
    );
});
