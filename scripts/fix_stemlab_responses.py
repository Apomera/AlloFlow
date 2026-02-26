from pathlib import Path

SRC = Path(r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt')
content = SRC.read_text(encoding='utf-8')
changes = 0

# 1. Update Freeform Builder prompt
old_prompt_1 = '''                      "realWorld": "Why this matters..."
                    }
                  ],
                  "graphData": null
                }'''
new_prompt_1 = '''                      "realWorld": "Why this matters...",
                      "manipulativeSupport": null,
                      "manipulativeResponse": null
                    }
                  ],
                  "graphData": null
                }'''
if old_prompt_1 in content:
    content = content.replace(old_prompt_1, new_prompt_1, 1)
    changes += 1
    print('✅ Updated Freeform Builder prompt')

# 2. Update Problem Set Generator prompt
old_prompt_2 = '''                      "steps": [{ "explanation": "First...", "latex": "x=..." }],
                      "realWorld": "Connection...",
                    }
                  ],
                  "graphData": null
                }'''
new_prompt_2 = '''                      "steps": [{ "explanation": "First...", "latex": "x=..." }],
                      "realWorld": "Connection...",
                      "manipulativeSupport": null,
                      "manipulativeResponse": null
                    }
                  ],
                  "graphData": null
                }'''
if old_prompt_2 in content:
    content = content.replace(old_prompt_2, new_prompt_2, 1)
    changes += 1
    print('✅ Updated Problem Set Generator prompt')

# 3. Update normalizedContent parse
old_norm = '''            let normalizedContent = {
                title: rawContent.title || 'Math & STEM Solver',
                problems: [],
                graphData: rawContent.graphData || null
            };
            if (rawContent.problems && Array.isArray(rawContent.problems)) {
                normalizedContent.problems = rawContent.problems.map(p => ({
                    question: p.question || '',
                    expression: p.expression || null,
                    answer: p.answer || '',
                    steps: p.steps || [],
                    type: p.type || 'computation',
                    realWorld: p.realWorld || ''
                }));'''
new_norm = '''            let normalizedContent = {
                title: rawContent.title || 'Math & STEM Solver',
                problems: [],
                graphData: rawContent.graphData || null
            };
            if (rawContent.problems && Array.isArray(rawContent.problems)) {
                normalizedContent.problems = rawContent.problems.map(p => ({
                    question: p.question || '',
                    expression: p.expression || null,
                    answer: p.answer || '',
                    steps: p.steps || [],
                    type: p.type || 'computation',
                    realWorld: p.realWorld || '',
                    manipulativeSupport: p.manipulativeSupport || null,
                    manipulativeResponse: p.manipulativeResponse || null
                }));'''
if old_norm in content:
    content = content.replace(old_norm, new_norm, 1)
    changes += 1
    print('✅ Updated normalizedContent parsing')

# 4. Insert manipulative buttons into JSX
# Let's find the student input area
old_jsx = '''                                        <div className="ml-4 sm:ml-12 mt-4 mb-4">
                                            <div className="relative">
                                                <div className="absolute top-3 left-3 text-slate-500">
                                                    <Pencil size={16} />
                                                </div>
                                                <textarea
                                                    className="w-full p-3 pl-10 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 outline-none resize-y bg-slate-50/50 focus:bg-white transition-all font-serif text-lg leading-relaxed text-slate-700 placeholder:text-slate-500 min-h-[120px]"
                                                    placeholder={t('math.display.placeholder_work')}
                                                    value={studentResponses[generatedContent.id]?.[pIdx] || ''}
                                                    onChange={(e) => handleStudentInput(generatedContent.id, pIdx, e.target.value)}
                                                    data-help-key="math_student_work"
                                                />
                                            </div>
                                        </div>'''

new_jsx = '''                                        <div className="ml-4 sm:ml-12 mt-4 mb-4 space-y-3">
                                            {problem.manipulativeSupport && (
                                               <button onClick={() => {
                                                  setStemLabTool(problem.manipulativeSupport.tool);
                                                  if (problem.manipulativeSupport.tool === 'coordinate' && problem.manipulativeSupport.state?.points) {
                                                     setGridPoints(problem.manipulativeSupport.state.points);
                                                  } else if (problem.manipulativeSupport.tool === 'base10' && problem.manipulativeSupport.state) {
                                                     setBase10Value(problem.manipulativeSupport.state);
                                                  }
                                                  setShowStemLab(true);
                                                  setStemLabTab('explore');
                                               }} className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 font-bold rounded-lg border border-blue-200 hover:bg-blue-100 transition-all text-sm mb-2">
                                                   <span className="text-lg">📂</span> Open Visual Support ({problem.manipulativeSupport.tool})
                                               </button>
                                            )}
                                            {problem.manipulativeResponse ? (
                                                <div className="bg-emerald-50 bg-opacity-50 p-4 rounded-xl border border-emerald-200">
                                                    <p className="text-sm text-emerald-800 font-bold mb-3 flex items-center gap-2">🧩 Solve this problem using the {problem.manipulativeResponse.tool} manipulative instead of typing.</p>
                                                    <div className="flex gap-2">
                                                        <button onClick={() => { setStemLabTool(problem.manipulativeResponse.tool); setShowStemLab(true); setStemLabTab('explore'); }} className="px-4 py-2 bg-white text-emerald-700 font-bold rounded-lg border border-emerald-300 hover:bg-emerald-100 transition-all text-sm shadow-sm flex items-center gap-2">
                                                           Open {problem.manipulativeResponse.tool}
                                                        </button>
                                                        <button onClick={() => {
                                                           let isCorrect = false;
                                                           if (problem.manipulativeResponse.tool === 'coordinate') {
                                                               isCorrect = gridPoints.length === (problem.manipulativeResponse.state?.points?.length || 0);
                                                           } else if (problem.manipulativeResponse.tool === 'base10') {
                                                               isCorrect = base10Value.hundreds === (problem.manipulativeResponse.state?.hundreds || 0) &&
                                                                           base10Value.tens === (problem.manipulativeResponse.state?.tens || 0) &&
                                                                           base10Value.ones === (problem.manipulativeResponse.state?.ones || 0);
                                                           }
                                                           handleStudentInput(generatedContent.id, pIdx, isCorrect ? '(Manipulative: CORRECT ✅)' : '(Manipulative: INCORRECT ❌)');
                                                           addToast(isCorrect ? 'Manipulative match correct! 🎉' : 'Manipulative geometry incorrect. Keep trying!', isCorrect ? 'success' : 'error');
                                                        }} className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-all text-sm shadow-sm">
                                                           Check My Manipulative
                                                        </button>
                                                    </div>
                                                    {studentResponses[generatedContent.id]?.[pIdx] && (
                                                        <div className={`mt-3 text-sm font-bold ${studentResponses[generatedContent.id]?.[pIdx].includes('CORRECT') ? 'text-green-600' : 'text-red-600'}`}>
                                                            {studentResponses[generatedContent.id]?.[pIdx]}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="relative">
                                                    <div className="absolute top-3 left-3 text-slate-500">
                                                        <Pencil size={16} />
                                                    </div>
                                                    <textarea
                                                        className="w-full p-3 pl-10 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 outline-none resize-y bg-slate-50/50 focus:bg-white transition-all font-serif text-lg leading-relaxed text-slate-700 placeholder:text-slate-500 min-h-[120px]"
                                                        placeholder={t('math.display.placeholder_work')}
                                                        value={studentResponses[generatedContent.id]?.[pIdx] || ''}
                                                        onChange={(e) => handleStudentInput(generatedContent.id, pIdx, e.target.value)}
                                                        data-help-key="math_student_work"
                                                    />
                                                </div>
                                            )}
                                        </div>'''
if old_jsx in content:
    content = content.replace(old_jsx, new_jsx, 1)
    changes += 1
    print('✅ Updated student JSX rendering')
else:
    print('❌ Failed to find student JSX')

# 5. Fix prompt 3 logic "Expert Math & Science Tutor"
old_prompt_3 = '''                  "steps": [{ "explanation": "Step explanation", "latex": "Step math in Latex" }],
                  "graphData": "SVG string or null",
                  "realWorld": "Connection string explanation"
                }'''
new_prompt_3 = '''                  "steps": [{ "explanation": "Step explanation", "latex": "Step math in Latex" }],
                  "graphData": "SVG string or null",
                  "realWorld": "Connection string explanation",
                  "manipulativeSupport": null,
                  "manipulativeResponse": null
                }'''
if old_prompt_3 in content:
    content = content.replace(old_prompt_3, new_prompt_3, 1)
    changes += 1
    print('✅ Updated Tutor prompt')

old_norm3 = '''                realWorld: rawContent.realWorld || ''
            }];'''
new_norm3 = '''                realWorld: rawContent.realWorld || '',
                manipulativeSupport: rawContent.manipulativeSupport || null,
                manipulativeResponse: rawContent.manipulativeResponse || null
            }];'''
if old_norm3 in content:
    content = content.replace(old_norm3, new_norm3, 1)
    changes += 1
    print('✅ Updated Tutor normalized parse')

# 6. Make sure to pass additional context cleanly to Gemini
old_context = '''                The teacher has described exactly what they want in natural language. Create the requested mix of problems.'''
new_context = '''                The teacher has described exactly what they want in natural language. Create the requested mix of problems.
                Optionally, you can enable STEM Lab manipulatives by returning objects in "manipulativeSupport" (to pre-load scaffolding) or "manipulativeResponse" (to grade the student's physical configuration instead of typed text). Supported tools are "coordinate" and "base10". Example state for base10: {"hundreds":1, "tens":5, "ones":0}.'''
if old_context in content:
    content = content.replace(old_context, new_context, 1)
    changes += 1
    print('✅ Updated manipulative AI instruction')
else:
    print('❌ Failed to find manipulative AI Instruction context')

if changes > 0:
    SRC.write_text(content, encoding='utf-8')
    print(f'Done! {changes} replacements made.')
