                  <div className="space-y-6">
                      <div className="bg-rose-50 p-4 rounded-lg border border-rose-100 mb-6 flex justify-between items-center gap-4" data-help-key="scaffolds_goal_panel">
                        <p className="text-sm text-rose-800 flex-grow"><strong>UDL Goal:</strong> Providing options for Action & Expression. Scaffolding writing helps students organize their thoughts.</p>
                        <div className="flex items-center gap-3">
                            {studentWorkStatus !== 'idle' && (
                                <div className={`flex items-center gap-1.5 text-xs font-bold transition-all duration-500 ${studentWorkStatus === 'saving' ? 'text-rose-400' : 'text-green-600'}`}>
                                    {studentWorkStatus === 'saving' ? (
                                        <>
                                            <RefreshCw size={12} className="animate-spin"/> {t('status.saving')}
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 size={12}/> {t('status.saved')}
                                        </>
                                    )}
                                </div>
                            )}
                            {!isTeacherMode && (
                                <>
                                <button
                                    onClick={handleResetScaffolds}
                                    data-help-key="scaffolds_reset"
                                    className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-800 bg-white border border-rose-200 hover:bg-rose-50 px-3 py-1.5 rounded-full transition-colors shadow-sm"
                                    title={t('scaffolds.clear_all')}
                                    aria-label={t('scaffolds.clear_all')}
                                >
                                    <RefreshCw size={12} /> Reset
                                </button>
                                <button
                                    onClick={launchGradingSession}
                                    data-help-key="scaffolds_grading"
                                    className={`flex items-center gap-1 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 px-3 py-1.5 rounded-full transition-all shadow-sm ${isScaffoldComplete ? 'animate-pulse ring-4 ring-rose-300 shadow-lg scale-105' : 'opacity-90'}`}
                                    title={t('mastery.start_tooltip')}
                                    aria-label={t('mastery.start_tooltip')}
                                >
                                    <Sparkles size={12} /> {t('mastery.start_check')}
                                </button>
                                </>
                            )}
                            {isTeacherMode && (
                            <button
                                aria-label={t('common.toggle_edit_scaffolds')}
                                onClick={handleToggleIsEditingScaffolds}
                                data-help-key="scaffolds_edit_toggle"
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${isEditingScaffolds ? 'bg-rose-600 text-white hover:bg-rose-700' : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50'}`}
                            >
                                {isEditingScaffolds ? <CheckCircle2 size={14}/> : <Pencil size={14}/>}
                                {isEditingScaffolds ? t('common.done_editing') : t('scaffolds.edit')}
                            </button>
                            )}
                        </div>
                    </div>
                    {gradingSession.isOpen ? (<ErrorBoundary fallbackMessage="Draft feedback encountered an error. Please try again.">
                        <DraftFeedbackInterface
                            status={gradingSession.status}
                            draftText={gradingSession.draftText}
                            setDraftText={(val) => setGradingSession(prev => ({ ...prev, draftText: val }))}
                            previousDraft={gradingSession.previousDraft}
                            gradingDetails={gradingSession.feedback}
                            draftCount={gradingSession.draftCount}
                            onSubmit={submitGradingSession}
                            onCancel={() => setGradingSession(prev => ({ ...prev, isOpen: false }))}
                        />
                    </ErrorBoundary>
                    ) : generatedContent?.data.mode === 'list' ? (
                        <div className="grid grid-cols-1 gap-4">
                             {generatedContent?.data.items.map((item, idx) => (
                                 <div key={idx} className="bg-white p-4 rounded-xl border border-slate-400 shadow-sm hover:border-indigo-200 transition-colors" data-help-key="scaffolds_item">
                                     <div className="flex items-start gap-3">
                                         <div className="bg-rose-100 text-rose-600 font-bold px-2 py-1 rounded text-xs shrink-0 mt-1">{idx + 1}</div>
                                         <div className="w-full">
                                            {isEditingScaffolds ? (
                                                <>
                                                    <textarea
                                                        aria-label={t('scaffolds.edit_item') || `Edit scaffold item ${idx + 1}`}
                                                        value={item.text}
                                                        onChange={(e) => handleScaffoldChange(idx, 'text', e.target.value)}
                                                        className="w-full text-lg font-medium text-slate-800 bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 rounded px-2 py-1 outline-none resize-none transition-all font-serif"
                                                        rows={getRows(item.text)}
                                                    />
                                                    {(item.text_en || leveledTextLanguage !== 'English') && (
                                                        <textarea
                                                            aria-label={t('scaffolds.edit_item_translation') || `Edit scaffold item ${idx + 1} translation`}
                                                            value={item.text_en || ''}
                                                            onChange={(e) => handleScaffoldChange(idx, 'text_en', e.target.value, true)}
                                                            className="w-full text-sm text-slate-600 italic bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 rounded px-2 py-1 outline-none resize-none transition-all"
                                                            rows={getRows(item.text_en || '')}
                                                            placeholder={t('common.placeholder_translation')}
                                                        />
                                                    )}
                                                </>
                                            ) : (
                                                <>
                                                    <p className="text-lg font-medium text-slate-800 mb-1 font-serif px-2 py-1">{item.text}</p>
                                                    {leveledTextLanguage !== 'English' && item.text_en && <p className="text-sm text-slate-600 italic px-2">{item.text_en}</p>}
                                                    <textarea
                                                        aria-label={t('scaffolds.student_response') || `Student response for item ${idx + 1}`}
                                                        value={studentResponses[generatedContent.id]?.[idx] || ''}
                                                        onChange={(e) => handleStudentInput(generatedContent.id, idx, e.target.value)}
                                                        data-help-key="scaffolds_student_input"
                                                        className="w-full mt-2 p-3 border border-slate-400 rounded-lg text-sm focus:ring-2 focus:ring-rose-200 focus:border-rose-300 outline-none resize-y bg-slate-50 focus:bg-white transition-all font-sans"
                                                        rows={3}
                                                        placeholder={t('scaffolds.sentence_placeholder')}
                                                    />
                                                </>
                                            )}
                                            <div className="mt-3 border-b border-slate-100 border-dashed w-full"></div>
                                            <div className="mt-3 border-b border-slate-100 border-dashed w-full"></div>
                                         </div>
                                     </div>
                                 </div>
                              ))}
                        </div>
                    ) : (
                        <div className="bg-white p-8 rounded-xl border border-slate-400 shadow-sm" data-help-key="scaffolds_paragraph_frame">
                            <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-4">{t('scaffolds.paragraph_frame') || 'Paragraph Frame'}</h4>
                            {isEditingScaffolds ? (
                                <textarea
                                    aria-label={t('scaffolds.edit_paragraph_frame') || 'Edit paragraph frame text'}
                                    value={generatedContent?.data.text}
                                    onChange={(e) => handleScaffoldTextChange('text', e.target.value)}
                                    className="w-full text-lg leading-loose text-slate-800 font-serif bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 rounded px-2 py-1 outline-none resize-none transition-all"
                                    rows={getRows(generatedContent?.data.text)}
                                />
                            ) : (
                                <div className="text-lg leading-loose text-slate-800 font-serif px-2 py-1">
                                    {generatedContent?.data.text.split(/(\[.*?\])/).map((part, i) => (
                                        part.startsWith('[') ?
                                        <input aria-label={t('common.enter_student_responses')}
                                            key={i}
                                            type="text"
                                            value={studentResponses[generatedContent.id]?.[`paragraph-${i}`] || ''}
                                            onChange={(e) => handleStudentInput(generatedContent.id, `paragraph-${i}`, e.target.value)}
                                            className="inline-block border-b-2 border-slate-300 mx-1 text-center text-indigo-700 font-bold focus:border-indigo-500 focus:outline-none bg-transparent min-w-[100px] px-1 focus:bg-indigo-50 rounded transition-colors"
                                            placeholder={part.replace(/[\[\]]/g, '')}
                                        /> :
                                        <span key={i}>{part}</span>
                                    ))}
                                </div>
                            )}
                            {(leveledTextLanguage !== 'English' || generatedContent?.data.text_en) && (
                                <div className="mt-8 pt-6 border-t border-slate-100">
                                    <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">{t('common.english_translation')}</h4>
                                    {isEditingScaffolds ? (
                                        <textarea
                                            aria-label={t('scaffolds.edit_paragraph_translation') || 'Edit paragraph frame translation'}
                                            value={generatedContent?.data.text_en || ''}
                                            onChange={(e) => handleScaffoldTextChange('text_en', e.target.value)}
                                            className="w-full text-slate-600 italic leading-relaxed bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 rounded px-2 py-1 outline-none resize-none transition-all"
                                            rows={getRows(generatedContent?.data.text_en || '')}
                                            placeholder={t('common.placeholder_translation')}
                                        />
                                    ) : (
                                        generatedContent?.data.text_en && <p className="text-slate-600 italic leading-relaxed px-2 py-1">{generatedContent?.data.text_en}</p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                    {(isTeacherMode || generatedContent?.data.rubric) && (
                    <div className="mt-1 pt-4 border-t border-rose-100 animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex justify-between items-center mb-3">
                                <h4 className="font-bold text-rose-900 flex items-center gap-2">
                                <ClipboardList size={18} className="text-rose-500"/> {isIndependentMode ? "Self-Checklist" : "Grading Rubric"}
                                </h4>
                                <div className="flex items-center gap-2">
                                    {!isParentMode && (
                                        <button aria-label={t('common.generate_content')}
                                        onClick={handleGenerateRubric}
                                        disabled={isGeneratingRubric}
                                        className="text-xs bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-600 px-3 py-1.5 rounded-full font-bold transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                                        >
                                        {isGeneratingRubric ? <RefreshCw size={12} className="animate-spin"/> : <Sparkles size={12}/>}
                                        {generatedContent?.data.rubric
                                            ? "Regenerate Rubric"
                                            : (isIndependentMode ? "Generate Self-Checklist" : "Generate Rubric")}
                                        </button>
                                    )}
                                    {generatedContent?.data.rubric && (
                                        <>
                                            <button
                                                aria-label={t('common.maximize')}
                                                onClick={handleToggleRubricZoom}
                                                className={`text-xs flex items-center gap-1 px-2 py-1 rounded transition-colors border ${rubricZoom ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-white text-slate-600 hover:text-indigo-600 border-slate-200'}`}
                                                title={t('scaffolds.rubric_toggle_tooltip')}
                                            >
                                                {rubricZoom ? <Maximize size={12}/> : <Minimize size={12}/>}
                                                {rubricZoom ? t('scaffolds.rubric_normal') : t('scaffolds.rubric_fit')}
                                            </button>
                                            <button
                                                aria-label={t('common.copy')}
                                                onClick={() => copyToClipboard(generatedContent?.data.rubric)}
                                                className="text-xs flex items-center gap-1 bg-white text-slate-600 hover:text-indigo-600 border border-slate-400 hover:border-indigo-200 px-2 py-1 rounded transition-colors"
                                                title={t('scaffolds.rubric_copy_tooltip')}
                                            >
                                                <Copy size={12}/> {t('scaffolds.rubric_copy')}
                                            </button>
                                        </>
                                    )}
                                </div>
                        </div>
                        {generatedContent?.data.rubric && (
                            <div className={`bg-white p-4 rounded-xl border border-slate-400 relative shadow-sm transition-all ${rubricZoom ? 'text-[11px]' : ''}`}>
                                <style>{rubricZoom ? `
                                    .rubric-container table th, .rubric-container table td { padding: 4px !important; line-height: 1.2 !important; }
                                    .rubric-container h1, .rubric-container h2, .rubric-container h3 { font-size: 1em !important; margin: 0.5em 0 !important; }
                                    .rubric-container p { margin-bottom: 0.5em !important; }
                                ` : ''}</style>
                                {isEditingScaffolds ? (
                                    <textarea
                                        aria-label={t('scaffolds.edit_rubric') || 'Edit rubric'}
                                        value={generatedContent?.data.rubric}
                                        onChange={(e) => handleScaffoldTextChange('rubric', e.target.value)}
                                        className="w-full text-sm bg-transparent border border-slate-400 hover:border-indigo-300 focus:border-indigo-500 focus:bg-slate-50 rounded p-2 outline-none resize-y font-medium text-slate-700 transition-all font-mono"
                                        rows={getRows(generatedContent?.data.rubric)}
                                        placeholder={t('scaffolds.rubric_placeholder')}
                                    />
                                ) : (
                                    <div className="rubric-container prose prose-sm max-w-none text-slate-700 leading-relaxed overflow-x-auto">
                                        {renderFormattedText(generatedContent?.data.rubric)}
                                    </div>
                                )}
                            </div>
                        )}
                        {isTeacherMode && generatedContent?.data.rubric && (
                            <div className="mt-6 bg-indigo-50 border border-indigo-100 rounded-xl p-4 shadow-sm">
                                <h4 className="font-bold text-indigo-900 mb-3 flex items-center gap-2">
                                    <CheckCircle2 size={18} className="text-indigo-600"/> AI Auto-Grader
                                </h4>
                                {!gradingResult ? (
                                    <div className="space-y-3">
                                        <textarea
                                            aria-label={t('dashboard.grading.student_work_input') || 'Paste student work for grading'}
                                            value={studentWorkInput}
                                            onChange={(e) => setStudentWorkInput(e.target.value)}
                                            className="w-full p-3 text-sm border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none resize-y h-32 bg-white"
                                            placeholder={t('dashboard.grading.work_placeholder')}
                                        />
                                        <button aria-label={t('common.auto_grade')}
                                            onClick={handleAutoGrade}
                                            disabled={!studentWorkInput.trim() || isGrading}
                                            className="w-full bg-indigo-600 text-white font-bold py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        >
                                            {isGrading ? <RefreshCw size={16} className="animate-spin"/> : <Sparkles size={16} className="text-yellow-700 fill-current"/>}
                                            {isGrading ? t('dashboard.grading.grade_work_loading') : t('dashboard.grading.grade_work_btn')}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="animate-in fade-in slide-in-from-bottom-2">
                                        <div className="bg-white rounded-lg border border-indigo-100 p-4 mb-4">
                                            <div className="flex justify-between items-center mb-4 border-b border-indigo-50 pb-2">
                                                <span className="font-bold text-indigo-900 text-lg">{t('dashboard.grading.total_score')}</span>
                                                <span className="bg-indigo-100 text-indigo-800 font-black px-3 py-1 rounded-full">{gradingResult.totalScore}</span>
                                            </div>
                                            <div className="space-y-3 mb-4">
                                                {gradingResult.scores.map((s, i) => (
                                                    <div key={i} className="text-sm">
                                                        <div className="flex justify-between font-bold text-slate-700">
                                                            <span>{s.criteria}</span>
                                                            <span>{s.score}</span>
                                                        </div>
                                                        <p className="text-slate-600 text-xs italic">{s.comment}</p>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="grid grid-cols-1 gap-3 text-sm">
                                                <div className="bg-green-50 p-3 rounded border border-green-100">
                                                    <strong className="text-green-800 block mb-1 flex items-center gap-1"><Sparkles size={12}/> {t('dashboard.grading.glow_label')}</strong>
                                                    <p className="text-green-700">{gradingResult.feedback.glow}</p>
                                                </div>
                                                <div className="bg-orange-50 p-3 rounded border border-orange-100">
                                                    <strong className="text-orange-800 block mb-1 flex items-center gap-1"><ArrowUpRight size={12}/> {t('dashboard.grading.grow_label')}</strong>
                                                    <p className="text-orange-700">{gradingResult.feedback.grow}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleSetGradingResultToNull}
                                            className="text-xs text-indigo-500 hover:text-indigo-700 underline w-full text-center"
                                        >
                                            {t('dashboard.grading.grade_another')}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    )}
                  </div>