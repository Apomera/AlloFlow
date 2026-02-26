with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    text = f.read()

old_play_all = """<button
                    onClick={async () => {
                        try {
                            const opts = data.options || [];
                            for (let i = 0; i < opts.length; i++) {
                                setPlayingIndex(i);
                                await onPlayAudio(opts[i], true);
                                await new Promise(r => setTimeout(r, 600));
                            }
                            setPlayingIndex(null);
                        } catch (e) { warnLog("Unhandled error in anon_playAllOptions:", e); }
                    }}
                    className="mx-auto flex items-center gap-2 px-4 py-2 mb-2 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-full font-medium text-sm shadow-sm transition-colors"
                >"""

new_play_all = """<button
                    onClick={async () => {
                        if (playingIndex !== null || isAudioBusy) return;
                        try {
                            const opts = data.options || [];
                            for (let i = 0; i < opts.length; i++) {
                                setPlayingIndex(i);
                                await onPlayAudio(opts[i], true);
                                await new Promise(r => setTimeout(r, 600));
                            }
                            setPlayingIndex(null);
                        } catch (e) { warnLog("Unhandled error in anon_playAllOptions:", e); setPlayingIndex(null); }
                    }}
                    disabled={playingIndex !== null || isAudioBusy}
                    className={`mx-auto flex items-center gap-2 px-4 py-2 mb-2 rounded-full font-medium text-sm shadow-sm transition-colors ${playingIndex !== null || isAudioBusy ? 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-60' : 'bg-orange-100 hover:bg-orange-200 text-orange-700'}`}
                >"""

if old_play_all in text:
    text = text.replace(old_play_all, new_play_all)
    print("Successfully replaced Play All in Rhyme Time!")
else:
    print("Could not find the Play All string. Checking for partial matches...")
    if "Unhandled error in anon_playAllOptions" in text:
        print("Found partial match, need to tweak string replacement.")

with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.write(text)
