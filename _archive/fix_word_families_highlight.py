import re

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix Block 7: Inject activeIndex state and modify play loop for WordFamiliesView
old_block_7 = """    const WordFamiliesView = React.useMemo(() => ({ data, onPlayAudio, onCheckAnswer, isEditing, onUpdateOption, showLetterHints, soundOnlyMode }) => {
        const [foundWords, setFoundWords] = React.useState([]);
        const [shakenWord, setShakenWord] = React.useState(null);
        const [wrongFeedback, setWrongFeedback] = React.useState(null);
        const [isComplete, setIsComplete] = React.useState(false);
        const [wordBank, setWordBank] = React.useState([]);
        const lastOptionsKey = React.useRef('');
        React.useEffect(() => {
            if (data.options && data.distractors) {
                const newKey = JSON.stringify([...data.options].sort()) + '|' + JSON.stringify([...data.distractors].sort());
                if (newKey !== lastOptionsKey.current) {
                    lastOptionsKey.current = newKey;
                    const mixed = [
                        ...(data.options || []).map(w => ({ text: w, isFamily: true })),
                        ...(data.distractors || []).map(w => ({ text: w, isFamily: false }))
                    ];
                    const mixed_shuffled = fisherYatesShuffle(mixed);
                    setWordBank(mixed_shuffled);
                    setFoundWords([]);
                    setIsComplete(false);
                    const playAllOptions = async () => {
                        await new Promise(r => setTimeout(r, 500));
                        for (const item of mixed_shuffled) {
                            if (!isMountedRef.current) break;
                            try { await onPlayAudio(item.text); } catch(e) {}
                            await new Promise(r => setTimeout(r, 300));
                        }
                    };
                    playAllOptions();
                }
            }
        }, [data.options, data.distractors]);"""

new_block_7 = """    const WordFamiliesView = React.useMemo(() => ({ data, onPlayAudio, onCheckAnswer, isEditing, onUpdateOption, showLetterHints, soundOnlyMode }) => {
        const [foundWords, setFoundWords] = React.useState([]);
        const [shakenWord, setShakenWord] = React.useState(null);
        const [wrongFeedback, setWrongFeedback] = React.useState(null);
        const [isComplete, setIsComplete] = React.useState(false);
        const [wordBank, setWordBank] = React.useState([]);
        const [activeIndex, setActiveIndex] = React.useState(null);
        const lastOptionsKey = React.useRef('');
        React.useEffect(() => {
            if (data.options && data.distractors) {
                const newKey = JSON.stringify([...data.options].sort()) + '|' + JSON.stringify([...data.distractors].sort());
                if (newKey !== lastOptionsKey.current) {
                    lastOptionsKey.current = newKey;
                    const mixed = [
                        ...(data.options || []).map(w => ({ text: w, isFamily: true })),
                        ...(data.distractors || []).map(w => ({ text: w, isFamily: false }))
                    ];
                    const mixed_shuffled = fisherYatesShuffle(mixed);
                    setWordBank(mixed_shuffled);
                    setFoundWords([]);
                    setIsComplete(false);
                    const playAllOptions = async () => {
                        await new Promise(r => setTimeout(r, 500));
                        for (let i = 0; i < mixed_shuffled.length; i++) {
                            if (!isMountedRef.current) break;
                            setActiveIndex(i);
                            try { await onPlayAudio(mixed_shuffled[i].text); } catch(e) {}
                            setActiveIndex(null);
                            await new Promise(r => setTimeout(r, 300));
                        }
                    };
                    playAllOptions();
                }
            }
        }, [data.options, data.distractors]);"""

if old_block_7 in text:
    text = text.replace(old_block_7, new_block_7)
    print("Patched Word Families activeIndex state injection")
else:
    print("Could not find Word Families state injection block.")


# Fix Block 8: Update the manual "Hear All Words" button to also use activeIndex
old_block_8 = """                        <button
                            onClick={async () => {
                                for (const item of wordBank) {
                                    if (foundWords.includes(item.text)) continue;
                                    try { await onPlayAudio(item.text); } catch(e) {}
                                    await new Promise(r => setTimeout(r, 350));
                                }
                            }}"""

new_block_8 = """                        <button
                            onClick={async () => {
                                for (let i = 0; i < wordBank.length; i++) {
                                    const item = wordBank[i];
                                    if (foundWords.includes(item.text)) continue;
                                    setActiveIndex(i);
                                    try { await onPlayAudio(item.text); } catch(e) {}
                                    setActiveIndex(null);
                                    await new Promise(r => setTimeout(r, 350));
                                }
                            }}"""

if old_block_8 in text:
    text = text.replace(old_block_8, new_block_8)
    print("Patched Word Families Hear All button logic")
else:
    print("Could not find Word Families Hear All button block.")


# Fix Block 9: Update CSS rendering block to utilize activeIndex
old_block_9 = """                                <button
                                    onClick={() => handleWordClick(item)}
                                    className={`px-5 py-3 rounded-xl text-lg font-bold shadow-sm border-b-4 transition-all hover:scale-105 active:scale-95 ${
                                        isShaking
                                            ? 'bg-red-100 border-red-300 text-red-600 animate-shake'
                                            : 'bg-white border-slate-200 text-slate-700 hover:border-violet-300 hover:text-violet-600'
                                    }`}
                                >
                                    {soundOnlyMode ? '🔊' : item.text}
                                </button>"""

new_block_9 = """                                <button
                                    onClick={() => handleWordClick(item)}
                                    className={`px-5 py-3 rounded-xl text-lg font-bold shadow-sm border-b-4 transition-all hover:scale-105 active:scale-95 ${
                                        isShaking
                                            ? 'bg-red-100 border-red-300 text-red-600 animate-shake'
                                            : activeIndex === idx
                                                ? 'bg-violet-200 border-violet-500 text-violet-800 scale-[1.05] ring-4 ring-violet-300 z-10'
                                                : 'bg-white border-slate-200 text-slate-700 hover:border-violet-300 hover:text-violet-600'
                                    }`}
                                >
                                    {soundOnlyMode ? '🔊' : item.text}
                                </button>"""

if old_block_9 in text:
    text = text.replace(old_block_9, new_block_9)
    print("Patched Word Families CSS highlight rendering")
else:
    print("Could not find Word Families CSS rendering block.")

with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.write(text)
