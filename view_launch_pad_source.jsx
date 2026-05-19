        <div role="region" aria-label="Choose how to use AlloFlow" style={{
          position: 'fixed', inset: 0, zIndex: 99998,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 30%, #312e81 60%, #1e3a5f 100%)',
          animation: 'fadeIn 0.6s ease-out',
        }}>
          <style>{`
            @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
            @keyframes float { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
            @keyframes cardPop { from { opacity: 0; transform: scale(0.85) translateY(30px); } to { opacity: 1; transform: scale(1) translateY(0); } }
            .lp-card { backdrop-filter: blur(20px); background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); border-radius: 24px; padding: 32px 28px; cursor: pointer; transition: all 0.35s cubic-bezier(0.4,0,0.2,1); position: relative; overflow: hidden; animation: cardPop 0.5s ease-out both; }
            .lp-card:hover { transform: translateY(-6px) scale(1.03); background: rgba(255,255,255,0.14); border-color: rgba(255,255,255,0.3); box-shadow: 0 20px 60px rgba(99,102,241,0.3); }
            @media (max-width: 600px) { .lp-grid { grid-template-columns: 1fr !important; } }
            .lp-card::before { content: ''; position: absolute; inset: 0; border-radius: 24px; padding: 1px; background: linear-gradient(135deg, rgba(255,255,255,0.2), transparent, rgba(99,102,241,0.3)); -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0); -webkit-mask-composite: xor; mask-composite: exclude; pointer-events: none; }
            .lp-badge { display: inline-flex; align-items: center; gap: 4px; background: linear-gradient(135deg, #818cf8, #6366f1); color: white; font-size: 9px; font-weight: 700; padding: 4px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 1.5px; animation: shimmer 3s infinite linear; background-size: 200% auto; }
            .lp-lang-item:hover:not([disabled]) { background: rgba(99,102,241,0.2) !important; }
          `}</style>
          {/* ── Compact Language Switcher (top-right) ── */}
          <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 100000 }}>
            <button
              type="button"
              onClick={() => setLangMenuOpen(!langMenuOpen)}
              aria-label={(t('launch_pad.change_language') || 'Change language') + '. ' + (t('launch_pad.current_language') || 'Current') + ': ' + currentUiLanguage}
              aria-expanded={langMenuOpen}
              aria-haspopup="listbox"
              disabled={isTranslating}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '8px 12px', borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(255,255,255,0.08)',
                backdropFilter: 'blur(20px)',
                color: '#e0e7ff', fontSize: '12px', fontWeight: 600,
                cursor: isTranslating ? 'wait' : 'pointer', transition: 'all 0.2s',
                opacity: isTranslating ? 0.6 : 1,
              }}
              onMouseOver={(e) => { if (!isTranslating) { e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; } }}
              onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
            >
              <span aria-hidden="true" style={{ fontSize: '14px' }}>🌐</span>
              <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentUiLanguage}</span>
              <span aria-hidden="true" style={{ fontSize: '9px', opacity: 0.7 }}>{langMenuOpen ? '▲' : '▼'}</span>
            </button>
            {langMenuOpen && (
              <>
                <div onClick={() => setLangMenuOpen(false)} aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 99999 }} />
                <ul role="listbox" aria-label={t('launch_pad.available_languages') || 'Available languages'} style={{
                  position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                  background: 'rgba(15,23,42,0.96)', backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px',
                  padding: '6px', minWidth: '220px', margin: 0, listStyle: 'none',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                  maxHeight: '60vh', overflowY: 'auto', zIndex: 100001,
                }}>
                  {LAUNCH_PAD_LANGS.map((langName) => {
                    var selected = langName === currentUiLanguage;
                    return (
                      <li key={langName} role="option" aria-selected={selected} style={{ margin: 0 }}>
                        <button
                          type="button"
                          className="lp-lang-item"
                          disabled={isTranslating}
                          onClick={() => { setLangMenuOpen(false); if (!selected) setUiLanguage(langName); }}
                          style={{
                            display: 'block', width: '100%', textAlign: 'start',
                            padding: '9px 12px', borderRadius: '8px', border: 'none',
                            background: selected ? 'rgba(99,102,241,0.3)' : 'transparent',
                            color: 'white', fontSize: '13px', fontWeight: selected ? 700 : 500,
                            cursor: isTranslating ? 'wait' : 'pointer',
                            transition: 'background 0.15s',
                          }}
                        >
                          {selected ? '✓ ' : '  '}{langName}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>
          <div style={{ textAlign: 'center', marginBottom: '48px', animation: 'fadeIn 0.6s ease-out' }}>
            <img src="https://raw.githubusercontent.com/Apomera/AlloFlow/main/rainbow-book.jpg" alt="AlloFlow" style={{ width: '80px', height: '80px', margin: '0 auto 16px', display: 'block', filter: 'drop-shadow(0 0 24px rgba(99,102,241,0.5))', borderRadius: '16px', objectFit: 'cover', animation: 'float 3s ease-in-out infinite' }} />
            <h1 style={{ fontSize: '32px', fontWeight: 900, color: 'white', margin: '0 0 8px', letterSpacing: '-0.5px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>AlloFlow</h1>
            <p style={{ fontSize: '12px', color: 'rgba(165,180,252,0.7)', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', margin: 0 }}>{t('launch_pad.subtitle')}</p>
          </div>
          {/* ── Mic Permission Banner ── */}
          {!micBannerDismissed && (
            <div style={{
              maxWidth: '620px', width: '100%', padding: '0 24px', marginBottom: '24px',
              animation: 'fadeIn 0.5s ease-out',
            }}>
              <div style={{
                backdropFilter: 'blur(20px)',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(129,140,248,0.3)',
                borderRadius: '20px',
                padding: '20px 24px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '24px' }}>🎤</span>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 700, color: 'white', margin: '0 0 2px' }}>
                      {t('launch_pad.mic_title') || 'Microphone Setup'}
                    </p>
                    <p style={{ fontSize: '11px', color: 'rgba(165,180,252,0.7)', margin: 0, lineHeight: '1.5' }}>
                      {t('launch_pad.mic_desc') || 'Some tools use your microphone for dictation, recording, and voice input.'}
                    </p>
                  </div>
                </div>
                {_isCanvasEnv && (
                  <p style={{ fontSize: '10px', color: '#fbbf24', margin: 0, textAlign: 'center', lineHeight: '1.5', fontWeight: 600 }}>
                    ⚠️ {t('launch_pad.mic_canvas_warning') || 'In this environment, enabling the microphone will briefly reload the app. It\'s best to do it now before you start working.'}
                  </p>
                )}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <button
                    onClick={requestMicPermission}
                    disabled={micPermissionStatus === 'requesting'}
                    aria-label="Enable microphone access"
                    style={{
                      padding: '10px 24px', borderRadius: '14px', border: 'none', cursor: 'pointer',
                      background: 'linear-gradient(135deg, #818cf8, #6366f1)',
                      color: 'white', fontSize: '13px', fontWeight: 700,
                      opacity: micPermissionStatus === 'requesting' ? 0.6 : 1,
                      transition: 'all 0.2s',
                      boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
                    }}
                  >
                    {micPermissionStatus === 'requesting' ? '⏳ Requesting...' : '🎤 Enable Microphone'}
                  </button>
                  <button
                    onClick={() => setMicBannerDismissed(true)}
                    aria-label="Skip microphone setup"
                    style={{
                      padding: '10px 24px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.2)',
                      cursor: 'pointer', background: 'rgba(255,255,255,0.06)',
                      color: 'rgba(165,180,252,0.8)', fontSize: '13px', fontWeight: 600,
                      transition: 'all 0.2s',
                    }}
                  >
                    Skip for Now
                  </button>
                </div>
                {micPermissionStatus === 'granted' && (
                  <p style={{ fontSize: '11px', color: '#34d399', margin: 0, fontWeight: 700 }}>✅ Microphone enabled!</p>
                )}
                {micPermissionStatus === 'denied' && (
                  <p style={{ fontSize: '11px', color: '#f87171', margin: 0, fontWeight: 600 }}>Microphone was denied. You can enable it later in browser settings.</p>
                )}
              </div>
            </div>
          )}
          <div className="lp-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px', maxWidth: '620px', width: '100%', padding: '0 24px' }}>
            <div className="lp-card" style={{ animationDelay: '0.1s' }} role="button" tabIndex={0} aria-label={t('launch_pad.full_title') + '. ' + t('launch_pad.full_desc')} onClick={() => { setHasSelectedMode(true); }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }}>
              <div style={{ fontSize: '40px', marginBottom: '16px', animation: 'float 3s ease-in-out infinite' }} aria-hidden="true">🚀</div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'white', margin: '0 0 8px' }}>{t('launch_pad.full_title')}</h2>
              <p style={{ fontSize: '12px', color: 'rgba(165,180,252,0.7)', lineHeight: '1.6', margin: 0 }}>{t('launch_pad.full_desc')}</p>
            </div>
            <div className="lp-card" style={{ animationDelay: '0.2s' }} role="button" tabIndex={0} aria-label={(t('launch_pad.guided_title') || 'Guided Mode') + ' (recommended). ' + t('launch_pad.guided_desc')} onClick={() => { setHasSelectedMode(true); setGuidedMode(true); }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }}>
              <div style={{ position: 'absolute', top: '12px', right: '12px' }}><span className="lp-badge">{t('launch_pad.badge_recommended')}</span></div>
              <div style={{ fontSize: '40px', marginBottom: '16px', animation: 'float 3s ease-in-out infinite', animationDelay: '0.5s' }} aria-hidden="true">🧭</div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'white', margin: '0 0 8px' }}>{t('launch_pad.guided_title') || 'Guided Mode'}</h2>
              <p style={{ fontSize: '12px', color: 'rgba(165,180,252,0.7)', lineHeight: '1.6', margin: 0 }}>{t('launch_pad.guided_desc')}</p>
            </div>
            <div className="lp-card" style={{ animationDelay: '0.3s' }} role="button" tabIndex={0} aria-label={(t('launch_pad.learning_tools_title') || 'Learning Tools') + '. ' + (t('launch_pad.learning_tools_desc') || 'STEM Lab, StoryForge & SEL Hub')} onClick={() => { setShowLearningHub(true); setIsTeacherMode(false); setShowWizard(false); setHasSelectedRole(true); setHasSelectedMode(true); }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }}>
              <div style={{ position: 'absolute', top: '12px', right: '12px' }}><span className="lp-badge" style={{ background: 'linear-gradient(135deg, #34d399, #059669)' }}>{t('launch_pad.badge_3_tools') || '3 Tools'}</span></div>
              <div style={{ fontSize: '40px', marginBottom: '16px', animation: 'float 3s ease-in-out infinite', animationDelay: '1s' }} aria-hidden="true">{'\uD83E\uDDE9'}</div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'white', margin: '0 0 8px' }}>{t('launch_pad.learning_tools_title') || 'Learning Tools'}</h2>
              <p style={{ fontSize: '12px', color: 'rgba(165,180,252,0.7)', lineHeight: '1.6', margin: 0 }}>{t('launch_pad.learning_tools_desc') || 'STEM Lab, StoryForge & SEL Hub \u2014 explore, create, and grow'}</p>
            </div>
            <div className="lp-card" style={{ animationDelay: '0.4s' }} role="button" tabIndex={0} aria-label={(t('launch_pad.educator_tools_title') || 'Educator Tools') + '. ' + (t('launch_pad.educator_tools_desc') || 'BehaviorLens, Report Writer') + (APP_CONFIG._cfg_validation_key ? ' (password protected)' : '')} onClick={() => { setHasSelectedMode(true); setHasSelectedRole(true); setShowWizard(false); if (APP_CONFIG._cfg_validation_key) { setPendingRole('educator_hub'); setIsGateOpen(true); } else { setIsTeacherMode(true); setShowEducatorHub(true); } }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }}>
              <div style={{ position: 'absolute', top: '12px', right: '12px' }}><span className="lp-badge" style={{ background: 'linear-gradient(135deg, #a78bfa, #7c3aed)' }}>{APP_CONFIG._cfg_validation_key ? (t('launch_pad.badge_educator') || '🔒 Educator') : (t('launch_pad.badge_educator_open') || '🛠️ Educator')}</span></div>
              <div style={{ fontSize: '40px', marginBottom: '16px', animation: 'float 3s ease-in-out infinite', animationDelay: '1.5s' }} aria-hidden="true">🛠️</div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'white', margin: '0 0 8px' }}>{t('launch_pad.educator_tools_title') || 'Educator Tools'}</h2>
              <p style={{ fontSize: '12px', color: 'rgba(165,180,252,0.7)', lineHeight: '1.6', margin: 0 }}>{t('launch_pad.educator_tools_desc') || 'BehaviorLens, Report Writer, and professional clinical tools — password protected'}</p>
            </div>
          </div>
          <p style={{ marginTop: '48px', fontSize: '11px', color: 'rgba(165,180,252,0.4)', fontWeight: 500 }}>{t('launch_pad.switch_hint')}</p>
          {!_isCanvasEnv && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowAIBackendModal(true); }}
              style={{ marginTop: '16px', display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#312e81', border: '1px solid rgba(165,180,252,0.4)', borderRadius: '16px', padding: '10px 20px', color: '#e0e7ff', fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.3s', backdropFilter: 'blur(10px)' }}
              onMouseOver={(e) => { e.currentTarget.style.background = '#4338ca'; e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.borderColor = 'rgba(165,180,252,0.7)'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = '#312e81'; e.currentTarget.style.color = '#e0e7ff'; e.currentTarget.style.borderColor = 'rgba(165,180,252,0.4)'; }}
              aria-label="AI Backend Settings"
              title="AI Backend Settings"
            >
              <Unplug size={16} aria-hidden="true" />
              <span>AI Backend Settings</span>
            </button>
          )}
        </div>