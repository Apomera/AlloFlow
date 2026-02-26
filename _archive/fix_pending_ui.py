filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Insert pendingChoice display before the loading spinner
old_loading_ui = """                            {adventureState.isLoading && (
                                <div className="flex justify-start animate-pulse">
                                    <div className="bg-white p-4 rounded-2xl rounded-bl-none border border-slate-200 flex items-center gap-2 text-slate-500 text-sm">
                                        <RefreshCw size={14} className="animate-spin"/> {t('adventure.status.loading_story')}
                                    </div>
                                </div>
                            )}"""

new_loading_ui = """                            {adventureState.pendingChoice && adventureState.isLoading && (
                                <div className="flex justify-start animate-in slide-in-from-bottom-2 duration-300">
                                    <div className="max-w-[85%] bg-amber-50 p-4 rounded-2xl rounded-bl-none border border-amber-200 shadow-sm">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <span className="text-amber-600 font-bold text-xs uppercase tracking-wider">⚔️ {t('adventure.your_choice') || 'Your Choice'}</span>
                                        </div>
                                        <p className="text-amber-800 text-sm font-medium italic leading-relaxed">"{adventureState.pendingChoice}"</p>
                                        <p className="text-amber-400 text-xs mt-2 animate-pulse">{t('adventure.story_unfolds') || '✨ The story unfolds...'}</p>
                                    </div>
                                </div>
                            )}
                            {adventureState.isLoading && (
                                <div className="flex justify-start animate-pulse">
                                    <div className="bg-white p-4 rounded-2xl rounded-bl-none border border-slate-200 flex items-center gap-2 text-slate-500 text-sm">
                                        <RefreshCw size={14} className="animate-spin"/> {t('adventure.status.loading_story')}
                                    </div>
                                </div>
                            )}"""

if old_loading_ui in content:
    content = content.replace(old_loading_ui, new_loading_ui, 1)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("SUCCESS: Added pendingChoice display before loading spinner")
else:
    print("FAIL: pattern not found")
