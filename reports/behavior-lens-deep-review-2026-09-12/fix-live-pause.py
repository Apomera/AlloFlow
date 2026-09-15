from pathlib import Path
p=Path('behavior_lens_module.js')
s=p.read_text(encoding='utf-8')
start=s.index('    const LiveObsOverlay =')
end=s.index('    const OverviewPanel =',start)
b=s[start:end]
old='''            if (isRunning) {
                setIsRunning(false);
                if (timerRef.current) clearInterval(timerRef.current);
                if (intervalTimerRef.current) clearInterval(intervalTimerRef.current);
                if (method === 'duration' && durationStart) {
                    const dur = Math.max(0, Math.round((Date.now() - durationStart) / 1000));'''
new='''            if (isRunning) {
                const pausedAt = Date.now();
                setIsRunning(false);
                if (timerRef.current) clearInterval(timerRef.current);
                if (intervalTimerRef.current) clearInterval(intervalTimerRef.current);
                const partialInterval = currentIntervalRef.current;
                if (method === 'interval' && partialInterval) {
                    setIntervals(previous => [...previous, {
                        ...partialInterval, end: pausedAt,
                        durationSeconds: Math.max(0, (pausedAt - partialInterval.start) / 1000),
                        complete: false
                    }]);
                    currentIntervalRef.current = null;
                    setCurrentInterval(null);
                }
                if (method === 'duration' && durationStart) {
                    const dur = Math.max(0, Math.round((pausedAt - durationStart) / 1000));'''
assert b.count(old)==1
b=b.replace(old,new)
assert b.count('}, [isRunning, timer, method, intervalLength, latencyStart]);')==1
b=b.replace('}, [isRunning, timer, method, intervalLength, latencyStart]);','}, [isRunning, timer, method, intervalLength, latencyStart, durationStart]);')
assert b.count('complete: !activeInterval')==1
b=b.replace('complete: !activeInterval', 'complete: intervalsToSave.every(interval => interval.complete === true)')
s=s[:start]+b+s[end:]
p.write_text(s,encoding='utf-8',newline='\n')
