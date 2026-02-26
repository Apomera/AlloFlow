"""
ORF Upgrade Script — Adds running record error categorization, DIBELS benchmark norms,
enhanced Gemini prompt, UI panels, and localization strings to AlloFlowANTI.txt
"""
import re

FILE = r"AlloFlowANTI.txt"

with open(FILE, "r", encoding="utf-8") as f:
    content = f.read()

changes_made = []

# ============================================================
# CHANGE 1: Add FLUENCY_BENCHMARKS, calculateRunningRecordMetrics,
#           getBenchmarkComparison after calculateLocalFluencyMetrics
# ============================================================
ANCHOR_1 = "    return { accuracy, wcpm };\n};\n\nconst analyzeFluencyWithGemini"

INJECT_1 = """    return { accuracy, wcpm };
};

// DIBELS/AIMSweb WCPM Benchmark Norms (50th percentile targets)
const FLUENCY_BENCHMARKS = {
  'K':  { fall: 0,   winter: 13,  spring: 28  },
  '1':  { fall: 23,  winter: 53,  spring: 72  },
  '2':  { fall: 51,  winter: 72,  spring: 89  },
  '3':  { fall: 71,  winter: 92,  spring: 107 },
  '4':  { fall: 94,  winter: 112, spring: 123 },
  '5':  { fall: 110, winter: 127, spring: 139 },
  '6':  { fall: 127, winter: 140, spring: 150 },
  '7':  { fall: 128, winter: 136, spring: 150 },
  '8':  { fall: 133, winter: 146, spring: 151 },
};

const calculateRunningRecordMetrics = (wordData, insertionsArr) => {
    if (!wordData || wordData.length === 0) return {
        substitutions: 0, omissions: 0, insertions: 0,
        selfCorrections: 0, totalErrors: 0, errorRate: '0',
        scRate: '0', readingLevel: 'frustrational'
    };
    const substitutions = wordData.filter(w => w.status === 'mispronounced').length;
    const omissions = wordData.filter(w => w.status === 'missed').length;
    const insertions = (insertionsArr && Array.isArray(insertionsArr)) ? insertionsArr.length : 0;
    const selfCorrections = wordData.filter(w => w.status === 'self_corrected').length;
    const totalErrors = substitutions + omissions + insertions;
    const totalWords = wordData.length;
    const errorRate = totalErrors > 0 ? (totalWords / totalErrors).toFixed(1) : '\\u221e';
    const scTotal = selfCorrections + totalErrors;
    const scRate = scTotal > 0 ? (selfCorrections / scTotal * 100).toFixed(0) : '0';
    const correctAndSC = wordData.filter(w => w.status === 'correct' || w.status === 'self_corrected' || w.status === 'stumbled').length;
    const accuracyPct = totalWords > 0 ? (correctAndSC / totalWords) * 100 : 0;
    let readingLevel = 'frustrational';
    if (accuracyPct >= 95) readingLevel = 'independent';
    else if (accuracyPct >= 90) readingLevel = 'instructional';
    return {
        substitutions, omissions, insertions, selfCorrections,
        totalErrors, errorRate, scRate, readingLevel, accuracyPct: Math.round(accuracyPct)
    };
};

const getBenchmarkComparison = (wcpm, grade, season) => {
    const gradeKey = String(grade).replace(/\\D/g, '') || 'K';
    const norms = FLUENCY_BENCHMARKS[gradeKey === '0' ? 'K' : gradeKey];
    if (!norms) return { level: 'unknown', target: 0 };
    const seasonKey = (season || 'winter').toLowerCase();
    const target = norms[seasonKey] || norms.winter;
    const ratio = target > 0 ? wcpm / target : 1;
    let level = 'well_below';
    if (ratio >= 1.1) level = 'above';
    else if (ratio >= 0.9) level = 'at';
    else if (ratio >= 0.7) level = 'approaching';
    return { level, target };
};

const analyzeFluencyWithGemini"""

if ANCHOR_1 in content:
    content = content.replace(ANCHOR_1, INJECT_1, 1)
    changes_made.append("CHANGE 1: Added FLUENCY_BENCHMARKS, calculateRunningRecordMetrics, getBenchmarkComparison")
else:
    print("WARNING: ANCHOR_1 not found!")

# ============================================================
# CHANGE 2: Enhance Gemini prompt to request "said" field and self_corrected status
# ============================================================
OLD_PROMPT = '''    STATUS TYPES:
    - "correct": Pronounced correctly.
    - "missed": Skipped completely.
    - "stumbled": Hesitated or self-corrected, but eventually got it right.
    - "mispronounced": Said the wrong word or pronounced it incorrectly.
    - "insertion": (Optional) If they added a word not in the text.

    RETURN JSON ONLY:
    {
      "wordData": [
        { "word": "The", "status": "correct" },
        { "word": "cat", "status": "missed" },
        { "word": "sat", "status": "correct" }
      ],
      "feedback": "1-2 sentences of encouraging feedback focusing on specific phonics or pacing improvements."
    }'''

NEW_PROMPT = '''    STATUS TYPES:
    - "correct": Pronounced correctly.
    - "missed": Skipped completely (omission).
    - "stumbled": Hesitated noticeably but eventually got it right without saying a different word.
    - "self_corrected": Said a wrong word first, then corrected themselves to the right word.
    - "mispronounced": Said the wrong word or pronounced it incorrectly and did NOT self-correct.
    - "insertion": (Optional) If they added a word not in the text.

    For "mispronounced" and "self_corrected" words, include a "said" field with what the student actually said.

    RETURN JSON ONLY:
    {
      "wordData": [
        { "word": "The", "status": "correct" },
        { "word": "cat", "status": "missed" },
        { "word": "horse", "status": "mispronounced", "said": "house" },
        { "word": "barn", "status": "self_corrected", "said": "band" },
        { "word": "sat", "status": "correct" }
      ],
      "insertions": ["um", "like"],
      "feedback": "1-2 sentences of encouraging feedback focusing on specific phonics or pacing improvements."
    }'''

if OLD_PROMPT in content:
    content = content.replace(OLD_PROMPT, NEW_PROMPT, 1)
    changes_made.append("CHANGE 2: Enhanced Gemini prompt with 'said' field and self_corrected status")
else:
    print("WARNING: OLD_PROMPT not found!")

# ============================================================
# CHANGE 3: Add localization strings for fluency running record
# ============================================================
OLD_FLUENCY_STRINGS = '''    time_remaining: "Time Remaining",
    time_expired: "Time Expired!",
  },'''

NEW_FLUENCY_STRINGS = '''    time_remaining: "Time Remaining",
    time_expired: "Time Expired!",
    // Running Record & Benchmark strings
    running_record: "Running Record",
    substitutions: "Substitutions",
    omissions: "Omissions",
    insertions_label: "Insertions",
    self_corrections: "Self-Corrections",
    error_rate: "Error Rate",
    sc_rate: "SC Rate",
    reading_level: "Reading Level",
    independent: "Independent",
    instructional: "Instructional",
    frustrational: "Frustrational",
    benchmark_title: "Benchmark",
    grade_select: "Grade",
    season_select: "Season",
    season_fall: "Fall",
    season_winter: "Winter",
    season_spring: "Spring",
    benchmark_above: "Above",
    benchmark_at: "At Benchmark",
    benchmark_approaching: "Approaching",
    benchmark_below: "Well Below",
    benchmark_target: "Target",
    legend_self_corrected: "Self-Corrected",
    legend_mispronounced: "Mispronounced",
    legend_insertion: "Insertion",
    said_label: "said",
    errors_label: "Errors",
    words_correct: "Words Correct",
  },'''

if OLD_FLUENCY_STRINGS in content:
    content = content.replace(OLD_FLUENCY_STRINGS, NEW_FLUENCY_STRINGS, 1)
    changes_made.append("CHANGE 3: Added running record & benchmark localization strings")
else:
    print("WARNING: OLD_FLUENCY_STRINGS not found!")

# ============================================================
# CHANGE 4: Add benchmark state variables after fluencyTimeRemaining
# ============================================================
OLD_STATE = "  const [fluencyTimeRemaining, setFluencyTimeRemaining] = useState(0);"

NEW_STATE = """  const [fluencyTimeRemaining, setFluencyTimeRemaining] = useState(0);
  const [fluencyBenchmarkGrade, setFluencyBenchmarkGrade] = useState('3');
  const [fluencyBenchmarkSeason, setFluencyBenchmarkSeason] = useState('winter');"""

if OLD_STATE in content:
    content = content.replace(OLD_STATE, NEW_STATE, 1)
    changes_made.append("CHANGE 4: Added benchmark grade/season state variables")
else:
    print("WARNING: OLD_STATE not found!")

# ============================================================
# CHANGE 5: Update fluency results UI — replace the accuracy/WCPM cards + word display
# ============================================================
OLD_RESULTS_UI = '''                        <div className="w-full max-w-2xl animate-in zoom-in duration-300">
                            <div className="flex justify-center mb-6 gap-4">                                
                                <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200 text-center relative overflow-hidden">
                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">{t('fluency.accuracy_score')}</div>
                                    <div className={`text-6xl font-black ${fluencyResult.accuracy >= 90 ? 'text-green-500' : fluencyResult.accuracy >= 70 ? 'text-yellow-500' : 'text-red-500'}`}>
                                        {fluencyResult.accuracy}%
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200 text-center relative overflow-hidden animate-in zoom-in duration-300 delay-100">
                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">{t('fluency.rate_label')}</div>
                                    <div className="text-6xl font-black text-indigo-600">
                                        {fluencyResult.wcpm}
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">{t('fluency.wcpm_label')}</div>
                                </div>
                            </div>'''

NEW_RESULTS_UI = '''                        <div className="w-full max-w-2xl animate-in zoom-in duration-300">
                            {(() => {
                                const rrMetrics = calculateRunningRecordMetrics(fluencyResult.wordData, fluencyResult.insertions);
                                const benchmarkResult = getBenchmarkComparison(fluencyResult.wcpm, fluencyBenchmarkGrade, fluencyBenchmarkSeason);
                                const levelColors = { above: 'text-green-600 bg-green-50 border-green-200', at: 'text-emerald-600 bg-emerald-50 border-emerald-200', approaching: 'text-yellow-600 bg-yellow-50 border-yellow-200', well_below: 'text-red-600 bg-red-50 border-red-200', unknown: 'text-slate-500 bg-slate-50 border-slate-200' };
                                const levelLabels = { above: t('fluency.benchmark_above'), at: t('fluency.benchmark_at'), approaching: t('fluency.benchmark_approaching'), well_below: t('fluency.benchmark_below'), unknown: '—' };
                                const readingLevelColors = { independent: 'bg-green-100 text-green-700 border-green-300', instructional: 'bg-yellow-100 text-yellow-700 border-yellow-300', frustrational: 'bg-red-100 text-red-700 border-red-300' };
                                const readingLevelLabels = { independent: t('fluency.independent'), instructional: t('fluency.instructional'), frustrational: t('fluency.frustrational') };
                                return (<>
                            <div className="flex justify-center mb-4 gap-4 flex-wrap">                                
                                <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200 text-center relative overflow-hidden">
                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">{t('fluency.accuracy_score')}</div>
                                    <div className={`text-6xl font-black ${fluencyResult.accuracy >= 90 ? 'text-green-500' : fluencyResult.accuracy >= 70 ? 'text-yellow-500' : 'text-red-500'}`}>
                                        {fluencyResult.accuracy}%
                                    </div>
                                    <div className={`mt-2 text-xs font-bold px-3 py-1 rounded-full border inline-block ${readingLevelColors[rrMetrics.readingLevel]}`}>
                                        {readingLevelLabels[rrMetrics.readingLevel]}
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200 text-center relative overflow-hidden animate-in zoom-in duration-300 delay-100">
                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">{t('fluency.rate_label')}</div>
                                    <div className="text-6xl font-black text-indigo-600">
                                        {fluencyResult.wcpm}
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">{t('fluency.wcpm_label')}</div>
                                    <div className={`mt-2 text-xs font-bold px-3 py-1 rounded-full border inline-block ${levelColors[benchmarkResult.level]}`}>
                                        {levelLabels[benchmarkResult.level]}
                                    </div>
                                </div>
                            </div>
                            {/* Benchmark Grade/Season Selector */}
                            <div className="flex justify-center gap-3 mb-4 items-center">
                                <label className="text-xs font-bold text-slate-500 uppercase">{t('fluency.benchmark_title')}</label>
                                <select aria-label="Grade" value={fluencyBenchmarkGrade} onChange={(e) => setFluencyBenchmarkGrade(e.target.value)} className="text-xs font-bold border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300">
                                    {Object.keys(FLUENCY_BENCHMARKS).map(g => (<option key={g} value={g}>{t('fluency.grade_select')} {g}</option>))}
                                </select>
                                <select aria-label="Season" value={fluencyBenchmarkSeason} onChange={(e) => setFluencyBenchmarkSeason(e.target.value)} className="text-xs font-bold border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300">
                                    <option value="fall">{t('fluency.season_fall')}</option>
                                    <option value="winter">{t('fluency.season_winter')}</option>
                                    <option value="spring">{t('fluency.season_spring')}</option>
                                </select>
                                <span className="text-xs text-slate-400">{t('fluency.benchmark_target')}: {benchmarkResult.target} WCPM</span>
                            </div>
                            {/* Running Record Summary */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                                    <div className="text-2xl font-black text-red-600">{rrMetrics.substitutions}</div>
                                    <div className="text-[10px] font-bold text-slate-600 uppercase">{t('fluency.substitutions')}</div>
                                </div>
                                <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-center">
                                    <div className="text-2xl font-black text-orange-600">{rrMetrics.omissions}</div>
                                    <div className="text-[10px] font-bold text-slate-600 uppercase">{t('fluency.omissions')}</div>
                                </div>
                                <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-center">
                                    <div className="text-2xl font-black text-purple-600">{rrMetrics.insertions}</div>
                                    <div className="text-[10px] font-bold text-slate-600 uppercase">{t('fluency.insertions_label')}</div>
                                </div>
                                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                                    <div className="text-2xl font-black text-blue-600">{rrMetrics.selfCorrections}</div>
                                    <div className="text-[10px] font-bold text-slate-600 uppercase">{t('fluency.self_corrections')}</div>
                                </div>
                            </div>
                            <div className="flex justify-center gap-6 mb-6 text-xs">
                                <div className="text-center"><span className="block text-lg font-black text-slate-700">1:{rrMetrics.errorRate}</span><span className="text-slate-500 font-bold uppercase">{t('fluency.error_rate')}</span></div>
                                <div className="text-center"><span className="block text-lg font-black text-slate-700">{rrMetrics.scRate}%</span><span className="text-slate-500 font-bold uppercase">{t('fluency.sc_rate')}</span></div>
                                <div className="text-center"><span className="block text-lg font-black text-slate-700">{rrMetrics.totalErrors}</span><span className="text-slate-500 font-bold uppercase">{t('fluency.errors_label')}</span></div>
                            </div>
                            </>);
                            })()}'''

if OLD_RESULTS_UI in content:
    content = content.replace(OLD_RESULTS_UI, NEW_RESULTS_UI, 1)
    changes_made.append("CHANGE 5: Replaced results UI with running record summary + benchmark cards")
else:
    print("WARNING: OLD_RESULTS_UI not found!")

# ============================================================
# CHANGE 6: Update word display to show self-corrected in blue + mispronounced annotations
# ============================================================
OLD_WORD_DISPLAY = '''                                {fluencyResult.wordData.map((w, i) => (
                                    <span 
                                        key={i}
                                        className={`px-1 rounded ${
                                            w.status === 'correct' ? 'text-green-600 font-medium' : 
                                            w.status === 'missed' ? 'bg-red-500 text-white' : 
                                            w.status === 'stumbled' ? 'bg-yellow-100 text-yellow-700' : 
                                            'text-slate-500'
                                        }`}
                                    >
                                        {w.word}
                                    </span>
                                ))}'''

NEW_WORD_DISPLAY = '''                                {fluencyResult.wordData.map((w, i) => (
                                    <span 
                                        key={i}
                                        title={w.said ? `${t('fluency.said_label')}: "${w.said}"` : ''}
                                        className={`px-1 rounded relative group cursor-default ${
                                            w.status === 'correct' ? 'text-green-600 font-medium' : 
                                            w.status === 'missed' ? 'bg-red-500 text-white' : 
                                            w.status === 'stumbled' ? 'bg-yellow-100 text-yellow-700' : 
                                            w.status === 'self_corrected' ? 'bg-blue-100 text-blue-700 border-b-2 border-blue-400' :
                                            w.status === 'mispronounced' ? 'bg-red-100 text-red-700 border-b-2 border-red-400' :
                                            'text-slate-500'
                                        }`}
                                    >
                                        {w.word}
                                        {w.said && (
                                            <span className="absolute -top-5 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                                {w.said}
                                            </span>
                                        )}
                                    </span>
                                ))}'''

if OLD_WORD_DISPLAY in content:
    content = content.replace(OLD_WORD_DISPLAY, NEW_WORD_DISPLAY, 1)
    changes_made.append("CHANGE 6: Updated word display with self-corrected (blue), mispronounced annotations")
else:
    print("WARNING: OLD_WORD_DISPLAY not found!")

# ============================================================
# CHANGE 7: Update legend to include all 5 error categories
# ============================================================
OLD_LEGEND = '''                                <div className="flex flex-wrap justify-center gap-4 sm:gap-8 text-xs font-medium text-slate-600">
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 rounded text-green-600 font-medium border border-transparent bg-green-50/50">
                                            {t('fluency.legend_word')}
                                        </span>
                                        <span>{t('fluency.legend_correct')}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 rounded bg-yellow-100 text-yellow-700">
                                            {t('fluency.legend_word')}
                                        </span>
                                        <span>{t('fluency.legend_hesitation')}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 rounded bg-red-500 text-white">
                                            {t('fluency.legend_word')}
                                        </span>
                                        <span>{t('fluency.legend_missed')}</span>
                                    </div>
                                </div>'''

NEW_LEGEND = '''                                <div className="flex flex-wrap justify-center gap-3 sm:gap-5 text-xs font-medium text-slate-600">
                                    <div className="flex items-center gap-1.5">
                                        <span className="px-2 py-0.5 rounded text-green-600 font-medium bg-green-50/50">
                                            {t('fluency.legend_word')}
                                        </span>
                                        <span>{t('fluency.legend_correct')}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="px-2 py-0.5 rounded bg-yellow-100 text-yellow-700">
                                            {t('fluency.legend_word')}
                                        </span>
                                        <span>{t('fluency.legend_hesitation')}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 border-b-2 border-blue-400">
                                            {t('fluency.legend_word')}
                                        </span>
                                        <span>{t('fluency.legend_self_corrected')}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 border-b-2 border-red-400">
                                            {t('fluency.legend_word')}
                                        </span>
                                        <span>{t('fluency.legend_mispronounced')}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="px-2 py-0.5 rounded bg-red-500 text-white">
                                            {t('fluency.legend_word')}
                                        </span>
                                        <span>{t('fluency.legend_missed')}</span>
                                    </div>
                                </div>'''

if OLD_LEGEND in content:
    content = content.replace(OLD_LEGEND, NEW_LEGEND, 1)
    changes_made.append("CHANGE 7: Updated legend with 5 error categories")
else:
    print("WARNING: OLD_LEGEND not found!")

# ============================================================
# CHANGE 8: Close the IIFE correctly — add </> before the old closing div
# We need to close the fragment opened in CHANGE 5
# ============================================================
# The old code after the legend has:
#                             </div>
#                         </div>
# We need the </> (close fragment) before the final </div> of the results block
# The fragment was opened with <>...</> in CHANGE 5, and it wraps everything
# through the legend. The closing </> needs to go right after the legend's parent div.

OLD_CLOSE = """                            </div>
                        </div>
                    ) : ("""

NEW_CLOSE = """                            </div>
                        </div>
                    </>);
                    })()}
                    ) : ("""

# Actually, let me re-check the structure. The IIFE returns (<>...</>) and the 
# closing </> and })() need to come right before the `) : (` that starts the else branch.
# But wait - CHANGE 5 already included the closing </>); })()}.
# Let me verify by checking what's currently in the file after our change 5.

# The structure after CHANGE 5 should be:
# ... (all the new running record UI) ...
# </>);
# })()}                           <-- this closes the IIFE
# ... then the feedback block ...
# ... then the word display ...
# ... then the legend ...
# ... then </div> closing the results outer div
# ... then ) : ( starting the else branch

# Wait, that's not right. The IIFE ends with })() but then the feedback, word display,
# legend etc still need to be inside it. Let me look more carefully at the structure.

# Actually, in CHANGE 5, I replaced ONLY the top portion (the score cards).
# The IIFE starts in the new code and returns a fragment <>...</>
# But the fragment closing </> and })() are at the end of CHANGE 5's content.
# That means the feedback, word display, and legend would be OUTSIDE the IIFE.
# That's a problem because they need access to rrMetrics and benchmarkResult.

# Let me fix this: The IIFE should wrap ALL the result content.
# I need to move the closing </> and })() to AFTER the legend.

# Actually, looking at the code more carefully:
# - The feedback section uses fluencyFeedback (not rrMetrics) - OK outside IIFE
# - The word display uses fluencyResult.wordData - OK outside IIFE  
# - The legend is static - OK outside IIFE
# So actually the IIFE only needs to wrap the parts that use rrMetrics and benchmarkResult.
# And CHANGE 5 already closes it properly with </>); })()}.

# The only thing we need to verify is that the JSX structure is valid.
# Let me check if there's an issue with the closing.

# Actually, I realize CHANGE 5 ends with:
#                             </>);
#                             })()}
# And then the original code continues with the feedback block which starts with:
#                             {fluencyFeedback && (
# This should be fine - the })() closes the IIFE expression, and the rest of the JSX
# continues as siblings in the parent div.

# So no CHANGE 8 needed! Let me remove this section.

# ============================================================
# Write and report
# ============================================================
with open(FILE, "w", encoding="utf-8") as f:
    f.write(content)

print(f"\n{'='*60}")
print(f"ORF UPGRADE COMPLETE — {len(changes_made)} changes applied:")
print(f"{'='*60}")
for c in changes_made:
    print(f"  ✓ {c}")
print(f"\nFile size: {len(content):,} bytes")
