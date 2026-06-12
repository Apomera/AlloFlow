// AlloFlow Section: STARTUP_LOGIN
// @section STARTUP_LOGIN — App startup screen: Guest / Parent / Teacher login
const StartupLoginScreen = React.memo(({ onDone }) => {
    const [view, setView]       = React.useState('choose'); // 'choose' | 'login'
    const [roleLabel, setRoleLabel] = React.useState('');
    const [loginId, setLoginId] = React.useState('');
    const [error, setError]     = React.useState('');
    const [loading, setLoading] = React.useState(false);

    const openLogin = (label) => { setRoleLabel(label); setView('login'); setError(''); setLoginId(''); };

    const handleLogin = async () => {
        if (!loginId.trim()) { setError('Please enter your Login ID.'); return; }
        setLoading(true); setError('');
        try {
            const res = await window.__alloAuth.login(loginId.trim());
            if (res && res.token) {
                onDone(res.user);
            } else {
                setError((res && res.error) || 'Login ID not found. Contact your administrator.');
            }
        } catch (e) {
            setError('Could not connect to the local server.');
        }
        setLoading(false);
    };

    const overlay = {
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Inter, system-ui, sans-serif',
    };
    const card = {
        background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.1)',
        borderRadius: '20px', padding: '32px 28px', cursor: 'pointer',
        flex: '1', minWidth: '160px', maxWidth: '200px', textAlign: 'center',
        transition: 'background 0.18s, transform 0.18s',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
    };
    const inputStyle = {
        width: '100%', padding: '11px 14px', borderRadius: '10px',
        border: '1.5px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.07)',
        color: '#f1f5f9', fontSize: '15px', outline: 'none', boxSizing: 'border-box',
        marginTop: '6px',
    };
    const btnPrimary = {
        width: '100%', padding: '12px', borderRadius: '10px', border: 'none',
        background: '#6366f1', color: '#fff', fontWeight: '700', fontSize: '15px',
        cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: '12px',
    };

    return (
        <div style={overlay}>
            <div style={{ width: '100%', maxWidth: '580px', padding: '0 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px' }}>
                {/* Branding */}
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '52px', marginBottom: '10px' }}>🌊</div>
                    <h1 style={{ color: '#f1f5f9', fontSize: '32px', fontWeight: '800', margin: '0 0 6px' }}>AlloFlow</h1>
                    <p style={{ color: '#94a3b8', fontSize: '15px', margin: 0 }}>How would you like to use AlloFlow today?</p>
                </div>

                {view === 'choose' ? (
                    <div style={{ display: 'flex', gap: '14px', width: '100%', justifyContent: 'center' }}>
                        {/* Guest */}
                        <div
                            role="button" tabIndex={0}
                            style={card}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.transform = ''; }}
                            onClick={() => onDone(null)}
                            onKeyDown={e => e.key === 'Enter' && onDone(null)}
                        >
                            <span style={{ fontSize: '36px' }}>🙋</span>
                            <span style={{ color: '#f1f5f9', fontWeight: '700', fontSize: '16px' }}>Guest</span>
                            <span style={{ color: '#94a3b8', fontSize: '12px', lineHeight: '1.5' }}>Explore without an account. Session data will not be saved.</span>
                        </div>

                        {/* Parent */}
                        <div
                            role="button" tabIndex={0}
                            style={card}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.transform = ''; }}
                            onClick={() => openLogin('Parent')}
                            onKeyDown={e => e.key === 'Enter' && openLogin('Parent')}
                        >
                            <span style={{ fontSize: '36px' }}>👨‍👩‍👧</span>
                            <span style={{ color: '#f1f5f9', fontWeight: '700', fontSize: '16px' }}>Parent</span>
                            <span style={{ color: '#94a3b8', fontSize: '12px', lineHeight: '1.5' }}>Log in with your parent account to access saved content.</span>
                        </div>

                        {/* Teacher */}
                        <div
                            role="button" tabIndex={0}
                            style={card}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.transform = ''; }}
                            onClick={() => openLogin('Teacher')}
                            onKeyDown={e => e.key === 'Enter' && openLogin('Teacher')}
                        >
                            <span style={{ fontSize: '36px' }}>🎓</span>
                            <span style={{ color: '#f1f5f9', fontWeight: '700', fontSize: '16px' }}>Teacher</span>
                            <span style={{ color: '#94a3b8', fontSize: '12px', lineHeight: '1.5' }}>Log in with your educator account to manage lessons.</span>
                        </div>
                    </div>
                ) : (
                    <div style={{ background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.12)', borderRadius: '20px', padding: '32px 28px', width: '100%', maxWidth: '360px' }}>
                        <button
                            onClick={() => setView('choose')}
                            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '13px', marginBottom: '16px', padding: 0, display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                            ← Back
                        </button>
                        <div style={{ fontSize: '32px', textAlign: 'center', marginBottom: '8px' }}>{roleLabel === 'Teacher' ? '🎓' : '👨‍👩‍👧'}</div>
                        <h2 style={{ color: '#f1f5f9', fontSize: '20px', fontWeight: '800', textAlign: 'center', margin: '0 0 6px' }}>{roleLabel} Sign In</h2>
                        <p style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', margin: '0 0 20px' }}>
                            Enter the Login ID created for your account.
                        </p>
                        <label style={{ color: '#cbd5e1', fontSize: '13px', fontWeight: '600' }}>
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
                        {error && <p style={{ color: '#f87171', fontSize: '13px', margin: '8px 0 0' }}>{error}</p>}
                        <button style={btnPrimary} onClick={handleLogin} disabled={loading}>
                            {loading ? 'Signing in…' : `Sign In as ${roleLabel}`}
                        </button>
                        <p style={{ color: '#64748b', fontSize: '12px', textAlign: 'center', marginTop: '14px', lineHeight: '1.5' }}>
                            Don't have an account? Ask your administrator to create one.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
});
