// --- WORD SOUNDS SUB-COMPONENTS (VIEWS) ---

const PhonologyView = ({
    activity,
    data,
    showLetterHints,
    onPlayAudio,
    onCheckAnswer,
    feedback
}) => {
    // Shared render logic for Isolation, Blending, Segmentation
    // This extracts the "Phonemes" and "Sound Chips" UI
    // Logic adapted from original renderActivityContent

    if (activity === 'isolation') {
        return (
            <div className="flex flex-col items-center justify-center gap-8 animate-in zoom-in-50 duration-500">
                <div className="text-center space-y-4">
                    <button
                        onClick={() => onPlayAudio(data.word)}
                        className="w-32 h-32 rounded-full bg-violet-100 hover:bg-violet-200 text-violet-600 flex items-center justify-center transition-all shadow-lg hover:scale-105 active:scale-95 group relative mb-4 mx-auto"
                    >
                        <Volume2 size={64} className="group-hover:animate-pulse" />
                        {!showLetterHints && <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10 rounded-full"><span className="text-xs font-bold bg-white px-2 py-1 rounded-full">Listen</span></div>}
                    </button>

                    <h3 className="text-2xl font-bold text-slate-700">
                        {data.position === 'first' ? "What's the FIRST sound?" : "What's the LAST sound?"}
                    </h3>

                    {/* Visual Word Hint (Only in Visual Mode) */}
                    {showLetterHints && (
                        <div className="text-4xl font-black tracking-widest text-slate-300">
                            {data.word.split('').map((char, i) => (
                                <span key={i} className={(data.position === 'first' && i === 0) || (data.position === 'last' && i === data.word.length - 1) ? "text-violet-400" : ""}>
                                    {char === ' ' ? '\u00A0' : '_'}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* 6-Grid Options Layout */}
                <div className="grid grid-cols-3 gap-4 w-full max-w-2xl">
                    {data.options.map((opt, idx) => (
                        <button
                            key={idx}
                            onClick={() => onCheckAnswer(opt)}
                            className="h-24 rounded-2xl bg-white border-b-4 border-slate-200 text-slate-700 font-bold text-3xl flex items-center justify-center shadow-sm hover:shadow-md hover:scale-105 hover:bg-violet-50 hover:border-violet-300 hover:text-violet-700 transition-all active:scale-95"
                        >
                            {showLetterHints ? opt : <Volume2 size={24} />}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    // Blending & Segmentation UI
    return (
        <div className="flex flex-col items-center gap-12 py-8">
            <div className="flex gap-2">
                {data.chips?.map((chip, i) => (
                    <div
                        key={i}
                        className={`w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold shadow-md transition-all ${chip.isRevealed
                            ? 'bg-white border-b-4 border-violet-200 text-violet-700'
                            : 'bg-slate-100 border-dashed border-2 border-slate-300 text-slate-300'
                            }`}
                    >
                        {chip.isRevealed ? (showLetterHints ? chip.phoneme : <Volume2 size={24} />) : '?'}
                    </div>
                ))}
            </div>

            {/* Controls for Blending/Seg would go here - simplified for this extraction */}
            <div className="text-slate-400 italic">Intermediate Refactor Placeholder</div>
        </div>
    );
};

const RhymeView = ({ data, showLetterHints, onPlayAudio, onCheckAnswer }) => {
    return (
        <div className="flex flex-col items-center gap-8 animate-in slide-in-from-right duration-500">
            <div className="bg-orange-100 p-6 rounded-3xl flex items-center gap-6 shadow-sm border-2 border-orange-200">
                <div
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); onPlayAudio(data.word); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onPlayAudio(data.word); } }}
                    className="w-20 h-20 rounded-2xl bg-white text-orange-500 flex items-center justify-center shadow-lg hover:scale-105 transition-transform cursor-pointer"
                >
                    <Volume2 size={32} />
                </div>
                <div>
                    <span className="text-sm font-bold text-orange-600 uppercase tracking-wider">Target Word</span>
                    <h3 className="text-4xl font-black text-slate-800">{showLetterHints ? data.word : "???"}</h3>
                </div>
            </div>

            <h3 className="text-xl font-bold text-slate-600">Which word rhymes?</h3>

            <div className="grid grid-cols-2 gap-4 w-full max-w-lg">
                {data.options.map((opt, i) => (
                    <div
                        key={i}
                        role="button"
                        tabIndex={0}
                        onClick={(e) => { e.stopPropagation(); onCheckAnswer(opt); }}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onCheckAnswer(opt); } }}
                        className="p-6 rounded-2xl bg-white border-2 border-slate-100 hover:border-orange-400 hover:bg-orange-50 transition-all group text-left cursor-pointer"
                    >
                        <div className="flex items-center justify-between pointer-events-none">
                            <span className={`text-xl font-bold text-slate-700 ${!showLetterHints && 'blur-sm'}`}>{opt}</span>
                            <Volume2 size={20} className="text-slate-300 group-hover:text-orange-500" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const OrthographyView = ({ data, onPlayAudio, onCheckAnswer }) => {
    // New Sight & Spell View
    return (
        <div className="flex flex-col items-center gap-10 animate-in fade-in duration-700">
            <button
                onClick={() => onPlayAudio(data.word)}
                className="w-40 h-40 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex flex-col items-center justify-center shadow-xl hover:scale-105 hover:shadow-2xl transition-all active:scale-95 ring-4 ring-indigo-100"
            >
                <Volume2 size={48} className="mb-2" />
                <span className="font-bold text-sm opacity-80">Tap to Listen</span>
            </button>

            <div className="text-center">
                <h3 className="text-lg font-bold text-slate-500 uppercase tracking-widest mb-6">Select the correct spelling</h3>
                <div className="flex flex-wrap justify-center gap-4">
                    {data.options.map((opt, i) => (
                        <button
                            key={i}
                            onClick={() => onCheckAnswer(opt)}
                            className="px-8 py-4 rounded-xl bg-white border-b-4 border-slate-200 text-2xl font-bold text-slate-700 hover:-translate-y-1 hover:border-indigo-400 hover:text-indigo-700 shadow-sm transition-all min-w-[120px]"
                        >
                            {opt}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
