#!/usr/bin/env python3
"""Fix Exit Ticket PPTX answer key + 4 ORF improvements.

1. Exit Ticket PPTX: Add answer key slide after questions
2. ORF: Add prosody scoring to existing Gemini prompt (no extra API call)
3. ORF: Word count mismatch guard in calculateLocalFluencyMetrics
4. ORF: Custom benchmark norms for non-English (manual entry)
5. Minor: Fix aggressive [#*_] strip in ORF passage display
"""
import sys

FILE = r"C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\prismflow-deploy\src\App.jsx"

with open(FILE, "r", encoding="utf-8") as f:
    content = f.read()

original = content
fixes = []

# ============================================================
# FIX 1: Exit Ticket PPTX — Add answer key slide after questions
# ============================================================
# Current code ends the quiz section at "slide.addNotes(...)" then closes
# We insert an answer key slide generator after the questions.forEach closes

OLD_QUIZ_END = '''                      slide.addNotes(`${t('export.ppt_correct_note')}: ${q.correctAnswer}\\n\\n${q.factCheck || ''}`);
                  });'''

NEW_QUIZ_END = '''                      slide.addNotes(`${t('export.ppt_correct_note')}: ${q.correctAnswer}\\n\\n${q.factCheck || ''}`);
                  });
                  // Answer Key slides
                  const ANSWERS_PER_SLIDE = 6;
                  for (let ak = 0; ak < questions.length; ak += ANSWERS_PER_SLIDE) {
                      const akChunk = questions.slice(ak, ak + ANSWERS_PER_SLIDE);
                      const akSlide = pptx.addSlide({ masterName: "MASTER_SLIDE" });
                      akSlide.addText(ak === 0 ? `${itemTitle} — ${t('export.answer_key_title') || 'Answer Key'}` : `${itemTitle} — ${t('export.answer_key_title') || 'Answer Key'} (${t('common.continued') || 'Cont.'})`, {
                          x: 0.5, y: 0.15, w: 9, h: 0.5,
                          fontSize: 20, bold: true, color: lightText
                      });
                      const akRichText = [];
                      akChunk.forEach((q, idx) => {
                          const qNum = ak + idx + 1;
                          const correctLetter = q.options ? String.fromCharCode(65 + q.options.indexOf(q.correctAnswer)) : '?';
                          akRichText.push({
                              text: `Q${qNum}: ${correctLetter}) ${q.correctAnswer || ''}`,
                              options: { fontSize: 13, bold: true, color: "16A34A", breakLine: true, bullet: false }
                          });
                          if (q.factCheck) {
                              akRichText.push({
                                  text: cleanTextForPptx(q.factCheck),
                                  options: { fontSize: 10, color: "64748B", breakLine: true, italic: true, bullet: false, paraSpaceAfter: 10 }
                              });
                          }
                      });
                      akSlide.addText(akRichText, { x: 0.5, y: 1.0, w: 9, h: 4.0, valign: 'top' });
                  }'''

if OLD_QUIZ_END in content:
    content = content.replace(OLD_QUIZ_END, NEW_QUIZ_END, 1)
    fixes.append("Fix 1: Added answer key slides to Exit Ticket PPTX export")
else:
    print("[WARN] Fix 1: Could not find quiz PPTX end pattern", file=sys.stderr)

# ============================================================
# FIX 2: ORF Prosody scoring in existing Gemini prompt
# ============================================================
# Add prosody fields to the analyzeFluencyWithGemini prompt

OLD_PROMPT_END = '''      "feedback": "1-2 sentences of encouraging feedback focusing on specific phonics or pacing improvements."
    }
  `;'''

NEW_PROMPT_END = '''      "feedback": "1-2 sentences of encouraging feedback focusing on specific phonics or pacing improvements.",
      "prosody": {
        "pacing": 3,
        "expression": 4,
        "phrasing": 3,
        "note": "Brief note on prosody (e.g. 'Read smoothly with good pausing at commas')"
      }
    }
    PROSODY RATING GUIDE (1-5 for pacing, expression, phrasing):
    - pacing: 1=very slow/labored, 2=slow with many pauses, 3=uneven pace, 4=mostly smooth, 5=natural conversational pace
    - expression: 1=monotone, 2=little variation, 3=some expression, 4=good variation, 5=expressive and natural
    - phrasing: 1=word-by-word, 2=two-word groups, 3=some phrase groups, 4=mostly meaningful phrases, 5=smooth phrase reading
  `;'''

if OLD_PROMPT_END in content:
    content = content.replace(OLD_PROMPT_END, NEW_PROMPT_END, 1)
    fixes.append("Fix 2: Added prosody scoring fields to Gemini fluency prompt")
else:
    print("[WARN] Fix 2: Could not find Gemini prompt end pattern", file=sys.stderr)

# ============================================================
# FIX 3: Word count mismatch guard
# ============================================================

OLD_METRICS = '''const calculateLocalFluencyMetrics = (wordData, durationSeconds, totalReferenceWordCount) => {
    if (!wordData || wordData.length === 0) return { accuracy: 0, wcpm: 0 };
    const correctCount = wordData.filter(w => w.status === 'correct' || w.status === 'stumbled').length;
    const denominator = (totalReferenceWordCount && totalReferenceWordCount > 0) 
        ? totalReferenceWordCount 
        : wordData.length;
    const accuracy = denominator > 0 ? Math.round((correctCount / denominator) * 100) : 0;
    const validDuration = Math.max(1, durationSeconds); 
    const minutes = validDuration / 60;
    const wcpm = Math.round(correctCount / minutes);
    return { accuracy, wcpm };
};'''

NEW_METRICS = '''const calculateLocalFluencyMetrics = (wordData, durationSeconds, totalReferenceWordCount) => {
    if (!wordData || wordData.length === 0) return { accuracy: 0, wcpm: 0 };
    const correctCount = wordData.filter(w => w.status === 'correct' || w.status === 'stumbled').length;
    // Word count mismatch guard: if Gemini's word count differs from reference by >20%, 
    // trust Gemini's analysis (it's the source of truth for what was evaluated)
    let denominator = (totalReferenceWordCount && totalReferenceWordCount > 0) 
        ? totalReferenceWordCount 
        : wordData.length;
    if (totalReferenceWordCount > 0 && wordData.length > 0) {
        const ratio = wordData.length / totalReferenceWordCount;
        if (ratio < 0.8 || ratio > 1.2) {
            console.warn(`[Fluency] Word count mismatch: Gemini returned ${wordData.length} words vs ${totalReferenceWordCount} reference words (ratio: ${ratio.toFixed(2)}). Using Gemini count.`);
            denominator = wordData.length;
        }
    }
    const accuracy = Math.min(100, denominator > 0 ? Math.round((correctCount / denominator) * 100) : 0);
    const validDuration = Math.max(1, durationSeconds); 
    const minutes = validDuration / 60;
    const wcpm = Math.round(correctCount / minutes);
    return { accuracy, wcpm };
};'''

if OLD_METRICS in content:
    content = content.replace(OLD_METRICS, NEW_METRICS, 1)
    fixes.append("Fix 3: Added word count mismatch guard to calculateLocalFluencyMetrics")
else:
    print("[WARN] Fix 3: Could not find calculateLocalFluencyMetrics pattern", file=sys.stderr)

# ============================================================
# FIX 4: Custom benchmark norms — extend FLUENCY_BENCHMARKS + UI
# ============================================================
# 4a: Modify getBenchmarkComparison to accept custom norms

OLD_BENCHMARK_FN = '''const getBenchmarkComparison = (wcpm, grade, season) => {
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
};'''

NEW_BENCHMARK_FN = '''const getBenchmarkComparison = (wcpm, grade, season, customNorms) => {
    if (grade === 'custom' && customNorms) {
        const seasonKey = (season || 'winter').toLowerCase();
        const target = customNorms[seasonKey] || customNorms.winter || 0;
        if (target <= 0) return { level: 'unknown', target: 0 };
        const ratio = wcpm / target;
        let level = 'well_below';
        if (ratio >= 1.1) level = 'above';
        else if (ratio >= 0.9) level = 'at';
        else if (ratio >= 0.7) level = 'approaching';
        return { level, target };
    }
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
};'''

if OLD_BENCHMARK_FN in content:
    content = content.replace(OLD_BENCHMARK_FN, NEW_BENCHMARK_FN, 1)
    fixes.append("Fix 4a: Extended getBenchmarkComparison to support custom norms")
else:
    print("[WARN] Fix 4a: Could not find getBenchmarkComparison pattern", file=sys.stderr)

# 4b: Update the call site to pass customNorms
OLD_BENCHMARK_CALL = "const benchmarkResult = getBenchmarkComparison(fluencyResult.wcpm, fluencyBenchmarkGrade, fluencyBenchmarkSeason);"

NEW_BENCHMARK_CALL = "const benchmarkResult = getBenchmarkComparison(fluencyResult.wcpm, fluencyBenchmarkGrade, fluencyBenchmarkSeason, fluencyCustomNorms);"

if OLD_BENCHMARK_CALL in content:
    content = content.replace(OLD_BENCHMARK_CALL, NEW_BENCHMARK_CALL)
    fixes.append("Fix 4b: Updated getBenchmarkComparison call sites with customNorms")
else:
    print("[WARN] Fix 4b: Could not find getBenchmarkComparison call site", file=sys.stderr)

# 4c: Add custom norms state — find fluencyBenchmarkGrade state declaration
OLD_BENCHMARK_STATE = "const [fluencyBenchmarkGrade, setFluencyBenchmarkGrade] = useState("
# We need both lines
import re
# Find the state declarations
state_pattern = r"(const \[fluencyBenchmarkGrade, setFluencyBenchmarkGrade\] = useState\([^)]*\);)\s*\n\s*(const \[fluencyBenchmarkSeason, setFluencyBenchmarkSeason\] = useState\([^)]*\);)"
state_match = re.search(state_pattern, content)
if state_match:
    old_state = state_match.group(0)
    new_state = old_state + "\n  const [fluencyCustomNorms, setFluencyCustomNorms] = useState({ fall: 0, winter: 0, spring: 0 });"
    content = content.replace(old_state, new_state, 1)
    fixes.append("Fix 4c: Added fluencyCustomNorms state")
else:
    print("[WARN] Fix 4c: Could not find fluencyBenchmarkGrade/Season state declarations", file=sys.stderr)

# 4d: Add "Custom" option to grade dropdown and custom norms inputs
OLD_GRADE_SELECTOR = '''{Object.keys(FLUENCY_BENCHMARKS).map(g => (<option key={g} value={g}>{t('fluency.grade_select')} {g}</option>))}
                                </select>'''

NEW_GRADE_SELECTOR = '''{Object.keys(FLUENCY_BENCHMARKS).map(g => (<option key={g} value={g}>{t('fluency.grade_select')} {g}</option>))}
                                    <option value="custom">{t('fluency.custom_norms') || 'Custom (Manual)'}</option>
                                </select>'''

if OLD_GRADE_SELECTOR in content:
    content = content.replace(OLD_GRADE_SELECTOR, NEW_GRADE_SELECTOR, 1)
    fixes.append("Fix 4d: Added 'Custom (Manual)' option to grade dropdown")
else:
    print("[WARN] Fix 4d: Could not find grade dropdown pattern", file=sys.stderr)

# 4e: Add custom norms input row after benchmark selector -- insert after the benchmark target display
OLD_BENCHMARK_TARGET = '''<span className="text-xs text-slate-400">{t('fluency.benchmark_target')}: {benchmarkResult.target} WCPM</span>
                            </div>'''

NEW_BENCHMARK_TARGET = '''<span className="text-xs text-slate-400">{t('fluency.benchmark_target')}: {benchmarkResult.target} WCPM</span>
                            </div>
                            {fluencyBenchmarkGrade === 'custom' && (
                                <div className="flex justify-center gap-3 mb-4 items-center animate-in slide-in-from-top duration-200">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">{t('fluency.custom_wcpm') || 'Target WCPM'}:</label>
                                    {['fall', 'winter', 'spring'].map(s => (
                                        <div key={s} className="flex flex-col items-center gap-0.5">
                                            <input
                                                type="number"
                                                min="0"
                                                max="300"
                                                value={fluencyCustomNorms[s] || ''}
                                                onChange={(e) => setFluencyCustomNorms(prev => ({ ...prev, [s]: parseInt(e.target.value) || 0 }))}
                                                className="w-16 text-center text-xs font-bold border border-slate-200 rounded-lg px-1 py-1 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                                placeholder="0"
                                                aria-label={`${s} target WCPM`}
                                            />
                                            <span className="text-[9px] text-slate-400 font-bold uppercase">{t(`fluency.season_${s}`) || s}</span>
                                        </div>
                                    ))}
                                </div>
                            )}'''

if OLD_BENCHMARK_TARGET in content:
    content = content.replace(OLD_BENCHMARK_TARGET, NEW_BENCHMARK_TARGET, 1)
    fixes.append("Fix 4e: Added custom norms input UI for non-English benchmarks")
else:
    print("[WARN] Fix 4e: Could not find benchmark target display pattern", file=sys.stderr)

# ============================================================
# FIX 2b: Show prosody scores in results view
# ============================================================
# Insert prosody gauges after running record error/SC/total row (L75571)
# Before the closing fragment </> at L75572

OLD_RR_END = '''                            <div className="flex justify-center gap-6 mb-6 text-xs">
                                <div className="text-center"><span className="block text-lg font-black text-slate-700">1:{rrMetrics.errorRate}</span><span className="text-slate-500 font-bold uppercase">{t('fluency.error_rate')}</span></div>
                                <div className="text-center"><span className="block text-lg font-black text-slate-700">{rrMetrics.scRate}%</span><span className="text-slate-500 font-bold uppercase">{t('fluency.sc_rate')}</span></div>
                                <div className="text-center"><span className="block text-lg font-black text-slate-700">{rrMetrics.totalErrors}</span><span className="text-slate-500 font-bold uppercase">{t('fluency.errors_label')}</span></div>
                            </div>
                            </>);'''

NEW_RR_END = '''                            <div className="flex justify-center gap-6 mb-6 text-xs">
                                <div className="text-center"><span className="block text-lg font-black text-slate-700">1:{rrMetrics.errorRate}</span><span className="text-slate-500 font-bold uppercase">{t('fluency.error_rate')}</span></div>
                                <div className="text-center"><span className="block text-lg font-black text-slate-700">{rrMetrics.scRate}%</span><span className="text-slate-500 font-bold uppercase">{t('fluency.sc_rate')}</span></div>
                                <div className="text-center"><span className="block text-lg font-black text-slate-700">{rrMetrics.totalErrors}</span><span className="text-slate-500 font-bold uppercase">{t('fluency.errors_label')}</span></div>
                            </div>
                            {/* Prosody Scores */}
                            {fluencyResult.prosody && (
                                <div className="grid grid-cols-3 gap-3 mb-4 animate-in fade-in duration-300">
                                    {[
                                        { key: 'pacing', label: t('fluency.prosody_pacing') || 'Pacing', color: 'indigo' },
                                        { key: 'expression', label: t('fluency.prosody_expression') || 'Expression', color: 'violet' },
                                        { key: 'phrasing', label: t('fluency.prosody_phrasing') || 'Phrasing', color: 'fuchsia' },
                                    ].map(({ key, label, color }) => {
                                        const val = fluencyResult.prosody[key] || 0;
                                        const pct = (val / 5) * 100;
                                        return (
                                            <div key={key} className={`bg-${color}-50 border border-${color}-200 rounded-xl p-3 text-center`}>
                                                <div className={`text-2xl font-black text-${color}-600`}>{val}<span className="text-sm font-bold text-slate-400">/5</span></div>
                                                <div className="text-[10px] font-bold text-slate-600 uppercase mb-1.5">{label}</div>
                                                <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                                    <div className={`h-full bg-${color}-500 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }}></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {fluencyResult.prosody.note && (
                                        <div className="col-span-3 text-xs text-slate-500 italic text-center mt-1">{fluencyResult.prosody.note}</div>
                                    )}
                                </div>
                            )}
                            </>);'''

if OLD_RR_END in content:
    content = content.replace(OLD_RR_END, NEW_RR_END, 1)
    fixes.append("Fix 2b: Added prosody score gauges to ORF results view")
else:
    print("[WARN] Fix 2b: Could not find running record end pattern", file=sys.stderr)

# ============================================================
# FIX 5: Fix aggressive [#*_] in ORF passage display
# ============================================================
# The passage display line at ~L75670 uses .replace(/[#*_]/g, '')
# Replace with targeted markdown stripping that preserves underscores within words

OLD_PASSAGE_STRIP = ".replace(/[#*_]/g, '') // Strip markdown formatting"

NEW_PASSAGE_STRIP = ".replace(/^#{1,6}\\s/gm, '') // Strip markdown headers\n                                        .replace(/\\*{1,3}/g, '') // Strip bold/italic asterisks"

if OLD_PASSAGE_STRIP in content:
    content = content.replace(OLD_PASSAGE_STRIP, NEW_PASSAGE_STRIP, 1)
    fixes.append("Fix 5: Replaced aggressive [#*_] strip with targeted markdown removal in passage display")
else:
    print("[WARN] Fix 5: Could not find passage strip pattern", file=sys.stderr)

# Also fix the same aggressive strip in the scoring engine's source text cleaning
OLD_SCORING_STRIP = "sourceText = sourceText.replace(/[#*_`~]/g, '');"
NEW_SCORING_STRIP = "sourceText = sourceText.replace(/^#{1,6}\\s/gm, '').replace(/\\*{1,3}/g, '').replace(/[`~]/g, '');"

if OLD_SCORING_STRIP in content:
    content = content.replace(OLD_SCORING_STRIP, NEW_SCORING_STRIP, 1)
    fixes.append("Fix 5b: Fixed aggressive strip in scoring engine source text cleaning")
else:
    print("[WARN] Fix 5b: Could not find scoring engine strip pattern", file=sys.stderr)

# ============================================================
# Write out
# ============================================================
if content == original:
    print("ERROR: No changes were made!", file=sys.stderr)
    sys.exit(1)

with open(FILE, "w", encoding="utf-8") as f:
    f.write(content)

print(f"\nDone! {len(fixes)} fixes applied:")
for f_msg in fixes:
    print(f"  [OK] {f_msg}")
