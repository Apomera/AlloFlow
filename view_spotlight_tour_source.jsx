        <>
            <div
                data-help-ignore="true" className="fixed inset-0 z-[10998] pointer-events-none bg-black/5"
                onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (spotlightOpenTimeRef.current && (Date.now() - spotlightOpenTimeRef.current < 500)) return;
                    debugLog("Backdrop Dismiss");
                    setIsSpotlightMode(false);
                }}
            />
            <div
                 className="fixed z-[11000] animate-in fade-in zoom-in-95 duration-200"
                 style={{
                     top: Math.max(20, Math.min(window.innerHeight - 400, tourRect.top)),
                     left: tourRect.left > window.innerWidth / 2 ? 'auto' : (tourRect.right + 24) + 'px',
                     right: tourRect.left > window.innerWidth / 2 ? (window.innerWidth - tourRect.left + 24) + 'px' : 'auto',
                     width: '380px',
                 }}
            >
                <div id="spotlight-message-panel" className="bg-slate-900/95 backdrop-blur-2xl p-6 rounded-2xl shadow-[0_0_40px_rgba(139,92,246,0.3)] border border-white/10 ring-1 ring-white/20 relative overflow-hidden group transition-all duration-300 hover:shadow-[0_0_60px_rgba(139,92,246,0.5)]">
                     <div className="absolute -top-20 -right-20 w-40 h-40 bg-violet-600/30 rounded-full blur-[80px] pointer-events-none animate-pulse"></div>
                     <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-indigo-600/30 rounded-full blur-[80px] pointer-events-none animate-pulse" style={{animationDelay: '1s'}}></div>
                     <div className="flex items-start justify-between mb-4 relative z-10">
                         <h3 className="font-bold text-white flex items-center gap-3 text-lg tracking-tight">
                            <div className="p-2 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-lg shadow-lg shadow-violet-500/20">
                                 <Sparkles size={18} className="text-white fill-white/20"/>
                            </div>
                            {spotlightMessage.title || 'Help'}
                         </h3>
                         <button
                             aria-label={t('common.close')}
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsSpotlightMode(false);
                            }}
                            data-help-ignore="true" className="text-white/40 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors"
                         >
                            <X size={20} />
                         </button>
                     </div>
                     <div className="text-slate-600 text-sm leading-relaxed space-y-3 relative z-10 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar-dark">
                          {(spotlightMessage.text || '').split(/\r?\n/).map((line, i) => {
                                    const cleanLine = line.trim();
                                    if (!cleanLine) return <div key={i} className="h-2" />;
                                    const formatText = (text) => {
                                        if (!text) return null;
                                        return text.split('**').map((part, bIdx) => {
                                            if (bIdx % 2 === 1) {
                                                return <strong key={`b-${bIdx}`} className="font-bold text-white bg-violet-700/20 px-1.5 py-0.5 rounded border border-violet-500/30 box-decoration-clone shadow-[0_0_10px_rgba(139,92,246,0.2)]">{part}</strong>;
                                            }
                                            return part.split('*').map((sub, iIdx) => {
                                                if (iIdx % 2 === 1) {
                                                     return <em key={`i-${bIdx}-${iIdx}`} className="italic text-indigo-200 font-serif">{sub}</em>;
                                                }
                                                return sub;
                                            });
                                        });
                                    };
                                    if (cleanLine.startsWith('###')) {
                                        const headerText = cleanLine.replace(/^###\s*/, '').trim();
                                        return (
                                            <h5 key={i} className="text-violet-700 font-bold uppercase text-xs mt-4 mb-2 tracking-widest flex items-center gap-2 border-b border-white/10 pb-1">
                                                {formatText(headerText)}
                                            </h5>
                                        );
                                    }
                                    const isBullet = cleanLine.startsWith('•') || cleanLine.startsWith('-') || cleanLine.startsWith('* ');
                                    if (isBullet) {
                                        const bulletMarker = cleanLine.startsWith('* ') ? '* ' : cleanLine.charAt(0);
                                        const bulletText = cleanLine.substring(bulletMarker.length).trim();
                                        return (
                                            <div key={i} className="grid grid-cols-[16px_1fr] gap-2 mb-1.5 items-start">
                                                <div className="mt-2 h-1.5 w-1.5 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.6)] mx-auto shrink-0" />
                                                <span className="text-slate-600 text-sm font-medium">{formatText(bulletText)}</span>
                                            </div>
                                        );
                                    }
                                    return (
                                        <p key={i} className="text-slate-600 text-sm leading-relaxed">
                                            {formatText(cleanLine)}
                                        </p>
                                    );
                                })}
                     </div>
                     <svg className="absolute w-8 h-8 pointer-events-none text-slate-900/95 filter drop-shadow opacity-95" aria-hidden="true"
                          style={{
                              top: '24px',
                              [tourRect.left > window.innerWidth / 2 ? 'right' : 'left']: '-24px',
                              transform: tourRect.left > window.innerWidth / 2 ? 'rotate(-90deg)' : 'rotate(90deg)',
                          }}
                          viewBox="0 0 24 24"
                          fill="currentColor"
                     >
                          <path d="M12 21l-12-18h24z" />
                     </svg>
                </div>
                 <div className="fixed pointer-events-none z-[10999]"
                      style={{
                          top: tourRect.top - 6,
                          left: tourRect.left - 6,
                          width: tourRect.width + 12,
                          height: tourRect.height + 12,
                          borderRadius: '12px',
                          animation: 'spotlightGlowRing 2s ease-in-out infinite',
                          boxShadow: '0 0 0 2px rgba(139, 92, 246, 0.6), 0 0 30px rgba(139, 92, 246, 0.4), inset 0 0 20px rgba(139, 92, 246, 0.1)',
                      }}
                 ></div>
            </div>
        </>