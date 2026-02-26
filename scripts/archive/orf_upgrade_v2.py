"""
ORF Upgrade Script — CRLF-aware version
All string matching and replacements use \r\n line endings to match the source file.
"""

FILE = r"AlloFlowANTI.txt"

with open(FILE, "r", encoding="utf-8") as f:
    content = f.read()

changes_made = []
warnings = []

def safe_replace(content, old, new, label):
    if old in content:
        content = content.replace(old, new, 1)
        changes_made.append(label)
    else:
        warnings.append(f"WARNING: {label} — anchor not found!")
    return content

# ============================================================
# CHANGE 1: Add benchmark functions after calculateLocalFluencyMetrics
# ============================================================
content = safe_replace(content,
    "    return { accuracy, wcpm };\r\n};\r\n\r\nconst analyzeFluencyWithGemini",
    "    return { accuracy, wcpm };\r\n};\r\n\r\n"
    "// DIBELS/AIMSweb WCPM Benchmark Norms (50th percentile targets)\r\n"
    "const FLUENCY_BENCHMARKS = {\r\n"
    "  'K':  { fall: 0,   winter: 13,  spring: 28  },\r\n"
    "  '1':  { fall: 23,  winter: 53,  spring: 72  },\r\n"
    "  '2':  { fall: 51,  winter: 72,  spring: 89  },\r\n"
    "  '3':  { fall: 71,  winter: 92,  spring: 107 },\r\n"
    "  '4':  { fall: 94,  winter: 112, spring: 123 },\r\n"
    "  '5':  { fall: 110, winter: 127, spring: 139 },\r\n"
    "  '6':  { fall: 127, winter: 140, spring: 150 },\r\n"
    "  '7':  { fall: 128, winter: 136, spring: 150 },\r\n"
    "  '8':  { fall: 133, winter: 146, spring: 151 },\r\n"
    "};\r\n\r\n"
    "const calculateRunningRecordMetrics = (wordData, insertionsArr) => {\r\n"
    "    if (!wordData || wordData.length === 0) return {\r\n"
    "        substitutions: 0, omissions: 0, insertions: 0,\r\n"
    "        selfCorrections: 0, totalErrors: 0, errorRate: '0',\r\n"
    "        scRate: '0', readingLevel: 'frustrational'\r\n"
    "    };\r\n"
    "    const substitutions = wordData.filter(w => w.status === 'mispronounced').length;\r\n"
    "    const omissions = wordData.filter(w => w.status === 'missed').length;\r\n"
    "    const insertions = (insertionsArr && Array.isArray(insertionsArr)) ? insertionsArr.length : 0;\r\n"
    "    const selfCorrections = wordData.filter(w => w.status === 'self_corrected').length;\r\n"
    "    const totalErrors = substitutions + omissions + insertions;\r\n"
    "    const totalWords = wordData.length;\r\n"
    "    const errorRate = totalErrors > 0 ? (totalWords / totalErrors).toFixed(1) : '\\u221e';\r\n"
    "    const scTotal = selfCorrections + totalErrors;\r\n"
    "    const scRate = scTotal > 0 ? (selfCorrections / scTotal * 100).toFixed(0) : '0';\r\n"
    "    const correctAndSC = wordData.filter(w => w.status === 'correct' || w.status === 'self_corrected' || w.status === 'stumbled').length;\r\n"
    "    const accuracyPct = totalWords > 0 ? (correctAndSC / totalWords) * 100 : 0;\r\n"
    "    let readingLevel = 'frustrational';\r\n"
    "    if (accuracyPct >= 95) readingLevel = 'independent';\r\n"
    "    else if (accuracyPct >= 90) readingLevel = 'instructional';\r\n"
    "    return {\r\n"
    "        substitutions, omissions, insertions, selfCorrections,\r\n"
    "        totalErrors, errorRate, scRate, readingLevel, accuracyPct: Math.round(accuracyPct)\r\n"
    "    };\r\n"
    "};\r\n\r\n"
    "const getBenchmarkComparison = (wcpm, grade, season) => {\r\n"
    "    const gradeKey = String(grade).replace(/\\\\D/g, '') || 'K';\r\n"
    "    const norms = FLUENCY_BENCHMARKS[gradeKey === '0' ? 'K' : gradeKey];\r\n"
    "    if (!norms) return { level: 'unknown', target: 0 };\r\n"
    "    const seasonKey = (season || 'winter').toLowerCase();\r\n"
    "    const target = norms[seasonKey] || norms.winter;\r\n"
    "    const ratio = target > 0 ? wcpm / target : 1;\r\n"
    "    let level = 'well_below';\r\n"
    "    if (ratio >= 1.1) level = 'above';\r\n"
    "    else if (ratio >= 0.9) level = 'at';\r\n"
    "    else if (ratio >= 0.7) level = 'approaching';\r\n"
    "    return { level, target };\r\n"
    "};\r\n\r\n"
    "const analyzeFluencyWithGemini",
    "CHANGE 1: Added FLUENCY_BENCHMARKS + calculateRunningRecordMetrics + getBenchmarkComparison"
)

# ============================================================
# CHANGE 2: Enhance Gemini prompt
# ============================================================
content = safe_replace(content,
    '    - "stumbled": Hesitated or self-corrected, but eventually got it right.\r\n'
    '    - "mispronounced": Said the wrong word or pronounced it incorrectly.\r\n'
    '    - "insertion": (Optional) If they added a word not in the text.\r\n'
    '\r\n'
    '    RETURN JSON ONLY:\r\n'
    '    {\r\n'
    '      "wordData": [\r\n'
    '        { "word": "The", "status": "correct" },\r\n'
    '        { "word": "cat", "status": "missed" },\r\n'
    '        { "word": "sat", "status": "correct" }\r\n'
    '      ],\r\n'
    '      "feedback": "1-2 sentences of encouraging feedback focusing on specific phonics or pacing improvements."\r\n'
    '    }',

    '    - "stumbled": Hesitated noticeably but eventually got it right without saying a different word.\r\n'
    '    - "self_corrected": Said a wrong word first, then corrected themselves to the right word.\r\n'
    '    - "mispronounced": Said the wrong word or pronounced it incorrectly and did NOT self-correct.\r\n'
    '    - "insertion": (Optional) If they added a word not in the text.\r\n'
    '\r\n'
    '    For "mispronounced" and "self_corrected" words, include a "said" field with what the student actually said.\r\n'
    '\r\n'
    '    RETURN JSON ONLY:\r\n'
    '    {\r\n'
    '      "wordData": [\r\n'
    '        { "word": "The", "status": "correct" },\r\n'
    '        { "word": "cat", "status": "missed" },\r\n'
    '        { "word": "horse", "status": "mispronounced", "said": "house" },\r\n'
    '        { "word": "barn", "status": "self_corrected", "said": "band" },\r\n'
    '        { "word": "sat", "status": "correct" }\r\n'
    '      ],\r\n'
    '      "insertions": ["um", "like"],\r\n'
    '      "feedback": "1-2 sentences of encouraging feedback focusing on specific phonics or pacing improvements."\r\n'
    '    }',
    "CHANGE 2: Enhanced Gemini prompt with said field + self_corrected"
)

# ============================================================
# CHANGE 3: Add localization strings
# ============================================================
content = safe_replace(content,
    '    time_remaining: "Time Remaining",\r\n'
    '    time_expired: "Time Expired!",\r\n'
    '  },',

    '    time_remaining: "Time Remaining",\r\n'
    '    time_expired: "Time Expired!",\r\n'
    '    running_record: "Running Record",\r\n'
    '    substitutions: "Substitutions",\r\n'
    '    omissions: "Omissions",\r\n'
    '    insertions_label: "Insertions",\r\n'
    '    self_corrections: "Self-Corrections",\r\n'
    '    error_rate: "Error Rate",\r\n'
    '    sc_rate: "SC Rate",\r\n'
    '    reading_level: "Reading Level",\r\n'
    '    independent: "Independent",\r\n'
    '    instructional: "Instructional",\r\n'
    '    frustrational: "Frustrational",\r\n'
    '    benchmark_title: "Benchmark",\r\n'
    '    grade_select: "Grade",\r\n'
    '    season_select: "Season",\r\n'
    '    season_fall: "Fall",\r\n'
    '    season_winter: "Winter",\r\n'
    '    season_spring: "Spring",\r\n'
    '    benchmark_above: "Above",\r\n'
    '    benchmark_at: "At Benchmark",\r\n'
    '    benchmark_approaching: "Approaching",\r\n'
    '    benchmark_below: "Well Below",\r\n'
    '    benchmark_target: "Target",\r\n'
    '    legend_self_corrected: "Self-Corrected",\r\n'
    '    legend_mispronounced: "Mispronounced",\r\n'
    '    legend_insertion: "Insertion",\r\n'
    '    said_label: "said",\r\n'
    '    errors_label: "Errors",\r\n'
    '    words_correct: "Words Correct",\r\n'
    '  },',
    "CHANGE 3: Added running record localization strings"
)

# ============================================================
# CHANGE 4: Add benchmark state variables
# ============================================================
content = safe_replace(content,
    '  const [fluencyTimeRemaining, setFluencyTimeRemaining] = useState(0);',
    '  const [fluencyTimeRemaining, setFluencyTimeRemaining] = useState(0);\r\n'
    "  const [fluencyBenchmarkGrade, setFluencyBenchmarkGrade] = useState('3');\r\n"
    "  const [fluencyBenchmarkSeason, setFluencyBenchmarkSeason] = useState('winter');",
    "CHANGE 4: Added benchmark grade/season state variables"
)

# ============================================================
# CHANGE 5: Replace results UI with running record + benchmark cards
# ============================================================
# Build the old/new with explicit \r\n
old_results = (
    '                        <div className="w-full max-w-2xl animate-in zoom-in duration-300">\r\n'
    '                            <div className="flex justify-center mb-6 gap-4">                                \r\n'
    '                                <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200 text-center relative overflow-hidden">\r\n'
    '                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">{t(\'fluency.accuracy_score\')}</div>\r\n'
    '                                    <div className={`text-6xl font-black ${fluencyResult.accuracy >= 90 ? \'text-green-500\' : fluencyResult.accuracy >= 70 ? \'text-yellow-500\' : \'text-red-500\'}`}>\r\n'
    '                                        {fluencyResult.accuracy}%\r\n'
    '                                    </div>\r\n'
    '                                </div>\r\n'
    '                                <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200 text-center relative overflow-hidden animate-in zoom-in duration-300 delay-100">\r\n'
    '                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">{t(\'fluency.rate_label\')}</div>\r\n'
    '                                    <div className="text-6xl font-black text-indigo-600">\r\n'
    '                                        {fluencyResult.wcpm}\r\n'
    '                                    </div>\r\n'
    '                                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">{t(\'fluency.wcpm_label\')}</div>\r\n'
    '                                </div>\r\n'
    '                            </div>'
)

new_results = (
    '                        <div className="w-full max-w-2xl animate-in zoom-in duration-300">\r\n'
    '                            {(() => {\r\n'
    '                                const rrMetrics = calculateRunningRecordMetrics(fluencyResult.wordData, fluencyResult.insertions);\r\n'
    '                                const benchmarkResult = getBenchmarkComparison(fluencyResult.wcpm, fluencyBenchmarkGrade, fluencyBenchmarkSeason);\r\n'
    "                                const levelColors = { above: 'text-green-600 bg-green-50 border-green-200', at: 'text-emerald-600 bg-emerald-50 border-emerald-200', approaching: 'text-yellow-600 bg-yellow-50 border-yellow-200', well_below: 'text-red-600 bg-red-50 border-red-200', unknown: 'text-slate-500 bg-slate-50 border-slate-200' };\r\n"
    "                                const levelLabels = { above: t('fluency.benchmark_above'), at: t('fluency.benchmark_at'), approaching: t('fluency.benchmark_approaching'), well_below: t('fluency.benchmark_below'), unknown: '\\u2014' };\r\n"
    "                                const readingLevelColors = { independent: 'bg-green-100 text-green-700 border-green-300', instructional: 'bg-yellow-100 text-yellow-700 border-yellow-300', frustrational: 'bg-red-100 text-red-700 border-red-300' };\r\n"
    "                                const readingLevelLabels = { independent: t('fluency.independent'), instructional: t('fluency.instructional'), frustrational: t('fluency.frustrational') };\r\n"
    '                                return (<>\r\n'
    '                            <div className="flex justify-center mb-4 gap-4 flex-wrap">\r\n'
    '                                <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200 text-center relative overflow-hidden">\r\n'
    "                                    <div className=\"text-xs font-bold text-slate-500 uppercase tracking-widest mb-2\">{t('fluency.accuracy_score')}</div>\r\n"
    "                                    <div className={`text-6xl font-black ${fluencyResult.accuracy >= 90 ? 'text-green-500' : fluencyResult.accuracy >= 70 ? 'text-yellow-500' : 'text-red-500'}`}>\r\n"
    '                                        {fluencyResult.accuracy}%\r\n'
    '                                    </div>\r\n'
    '                                    <div className={`mt-2 text-xs font-bold px-3 py-1 rounded-full border inline-block ${readingLevelColors[rrMetrics.readingLevel]}`}>\r\n'
    '                                        {readingLevelLabels[rrMetrics.readingLevel]}\r\n'
    '                                    </div>\r\n'
    '                                </div>\r\n'
    '                                <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200 text-center relative overflow-hidden animate-in zoom-in duration-300 delay-100">\r\n'
    "                                    <div className=\"text-xs font-bold text-slate-500 uppercase tracking-widest mb-2\">{t('fluency.rate_label')}</div>\r\n"
    '                                    <div className="text-6xl font-black text-indigo-600">\r\n'
    '                                        {fluencyResult.wcpm}\r\n'
    '                                    </div>\r\n'
    "                                    <div className=\"text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1\">{t('fluency.wcpm_label')}</div>\r\n"
    '                                    <div className={`mt-2 text-xs font-bold px-3 py-1 rounded-full border inline-block ${levelColors[benchmarkResult.level]}`}>\r\n'
    '                                        {levelLabels[benchmarkResult.level]}\r\n'
    '                                    </div>\r\n'
    '                                </div>\r\n'
    '                            </div>\r\n'
    '                            {/* Benchmark Grade/Season Selector */}\r\n'
    '                            <div className="flex justify-center gap-3 mb-4 items-center">\r\n'
    "                                <label className=\"text-xs font-bold text-slate-500 uppercase\">{t('fluency.benchmark_title')}</label>\r\n"
    '                                <select aria-label="Grade" value={fluencyBenchmarkGrade} onChange={(e) => setFluencyBenchmarkGrade(e.target.value)} className="text-xs font-bold border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300">\r\n'
    "                                    {Object.keys(FLUENCY_BENCHMARKS).map(g => (<option key={g} value={g}>{t('fluency.grade_select')} {g}</option>))}\r\n"
    '                                </select>\r\n'
    '                                <select aria-label="Season" value={fluencyBenchmarkSeason} onChange={(e) => setFluencyBenchmarkSeason(e.target.value)} className="text-xs font-bold border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300">\r\n'
    "                                    <option value=\"fall\">{t('fluency.season_fall')}</option>\r\n"
    "                                    <option value=\"winter\">{t('fluency.season_winter')}</option>\r\n"
    "                                    <option value=\"spring\">{t('fluency.season_spring')}</option>\r\n"
    '                                </select>\r\n'
    "                                <span className=\"text-xs text-slate-400\">{t('fluency.benchmark_target')}: {benchmarkResult.target} WCPM</span>\r\n"
    '                            </div>\r\n'
    '                            {/* Running Record Summary */}\r\n'
    '                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">\r\n'
    '                                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">\r\n'
    '                                    <div className="text-2xl font-black text-red-600">{rrMetrics.substitutions}</div>\r\n'
    "                                    <div className=\"text-[10px] font-bold text-slate-600 uppercase\">{t('fluency.substitutions')}</div>\r\n"
    '                                </div>\r\n'
    '                                <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-center">\r\n'
    '                                    <div className="text-2xl font-black text-orange-600">{rrMetrics.omissions}</div>\r\n'
    "                                    <div className=\"text-[10px] font-bold text-slate-600 uppercase\">{t('fluency.omissions')}</div>\r\n"
    '                                </div>\r\n'
    '                                <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-center">\r\n'
    '                                    <div className="text-2xl font-black text-purple-600">{rrMetrics.insertions}</div>\r\n'
    "                                    <div className=\"text-[10px] font-bold text-slate-600 uppercase\">{t('fluency.insertions_label')}</div>\r\n"
    '                                </div>\r\n'
    '                                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">\r\n'
    '                                    <div className="text-2xl font-black text-blue-600">{rrMetrics.selfCorrections}</div>\r\n'
    "                                    <div className=\"text-[10px] font-bold text-slate-600 uppercase\">{t('fluency.self_corrections')}</div>\r\n"
    '                                </div>\r\n'
    '                            </div>\r\n'
    '                            <div className="flex justify-center gap-6 mb-6 text-xs">\r\n'
    "                                <div className=\"text-center\"><span className=\"block text-lg font-black text-slate-700\">1:{rrMetrics.errorRate}</span><span className=\"text-slate-500 font-bold uppercase\">{t('fluency.error_rate')}</span></div>\r\n"
    "                                <div className=\"text-center\"><span className=\"block text-lg font-black text-slate-700\">{rrMetrics.scRate}%</span><span className=\"text-slate-500 font-bold uppercase\">{t('fluency.sc_rate')}</span></div>\r\n"
    "                                <div className=\"text-center\"><span className=\"block text-lg font-black text-slate-700\">{rrMetrics.totalErrors}</span><span className=\"text-slate-500 font-bold uppercase\">{t('fluency.errors_label')}</span></div>\r\n"
    '                            </div>\r\n'
    '                            </>);\r\n'
    '                            })()}'
)

content = safe_replace(content, old_results, new_results,
    "CHANGE 5: Replaced results UI with running record + benchmark cards")

# ============================================================
# Write and report
# ============================================================
with open(FILE, "w", encoding="utf-8") as f:
    f.write(content)

print(f"\n{'='*60}")
print(f"ORF UPGRADE — {len(changes_made)} changes applied:")
print(f"{'='*60}")
for c in changes_made:
    print(f"  OK  {c}")
for w in warnings:
    print(f"  !!  {w}")
print(f"\nFile size: {len(content):,} bytes")
