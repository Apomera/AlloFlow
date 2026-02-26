{/* 💡 Hint System */ }
{
    !checkResult?.checked && (() => {
        const hintKey = `${generatedContent.id}_${pIdx}`;
        const hintInfo = mathHintData[hintKey] || { hints: [], loading: false, count: 0 };
        return (
            <div className="space-y-2">
                {hintInfo.hints.map((hint, hIdx) => (
                    <div key={hIdx} className="flex gap-2 items-start p-3 rounded-xl bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 animate-in fade-in slide-in-from-top-1 duration-200">
                        <span className="text-lg flex-shrink-0">{hIdx === 0 ? '💡' : hIdx === 1 ? '🔦' : '🔍'}</span>
                        <div className="flex-1">
                            <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Hint {hIdx + 1} of 3</span>
                            <p className="text-sm text-amber-900 font-medium leading-relaxed mt-0.5">{hint}</p>
                        </div>
                    </div>
                ))}
                {hintInfo.count < 3 && (
                    <button
                        onClick={() => handleGetMathHint(generatedContent.id, pIdx, problem.question || problem.problem, problem.answer, problem.steps)}
                        disabled={hintInfo.loading}
                        className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl font-bold text-xs transition-all border-2 border-dashed border-amber-300 text-amber-700 hover:bg-amber-50 hover:border-amber-400 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
                    >
                        {hintInfo.loading ? (
                            <><RefreshCw size={14} className="animate-spin" /> Thinking...</>
                        ) : (
                            <><Lightbulb size={14} /> {hintInfo.count === 0 ? 'Give me a hint (-25% XP)' : hintInfo.count === 1 ? 'Another hint (-50% XP)' : 'Final hint (-75% XP)'}</>
                        )}
                    </button>
                )}
            </div>
        );
    })()
}
