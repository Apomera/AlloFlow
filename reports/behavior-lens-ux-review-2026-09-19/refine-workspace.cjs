const fs = require('node:fs');
function edit(file, callback) { const old = fs.readFileSync(file, 'utf8'); const next = callback(old.replace(/\r\n/g, '\n')); if(next === old) throw new Error('No changes: '+file); fs.writeFileSync(file,next); }
edit('behavior_lens_module.js', source => {
 source=source.replace("Object.assign({}, emptyDraft, previous, patch)","Object.assign({}, emptyDraft, previous, patch, { savedAt: null })");
 source=source.replace("{ targetId: id, label, definition }", "{ targetId: id, label, definition, savedAt: now }");
 source=source.replace("!!(definitionDraft && (definitionDraft.label", "!!(definitionDraft && !definitionDraft.savedAt && (definitionDraft.label");
 source=source.replace("h('p', { className: 'text-sm text-slate-600' }, isParentMode ? 'Family workspace'", "h('p', { className: 'text-sm text-slate-700' }, isParentMode ? 'Family workspace'");
 source=source.replace("h('button', { type: 'button', onClick: handleClearPractice, className: actionClass }", "h('button', { type: 'button', 'aria-label': 'Clear Practice Data', onClick: handleClearPractice, className: actionClass }");
 source=source.replace("id: 'bl-definition-examples', value:", "id: 'bl-definition-examples', 'aria-label': 'Examples of the target behavior', value:");
 source=source.replace("id: 'bl-definition-nonexamples', value:", "id: 'bl-definition-nonexamples', 'aria-label': 'Non-examples of the target behavior', value:");
 const start=source.indexOf('const handleAiAnalyze =');
 const end=source.indexOf('setAnalyzing(true);',start);
 if(start<0||end<0)throw new Error('AI state anchor');
 source=source.slice(0,end)+source.slice(end).replace('setAnalyzing(true);', "setAnalyzing(true);\n            setHubView('tools');\n            setActivePanel('hub');");
 new Function(source);return source;
});
fs.copyFileSync('behavior_lens_module.js','desktop/web-app/public/behavior_lens_module.js');
edit('tests/behavior_lens_workspace_ux.test.js', s => s.replace("expect(host.textContent).toContain('Canonical target behaviors');", "await click('Definitions (1)');\n    expect(host.textContent).toContain('Canonical target behaviors');"));
// These tests exercise library tools rather than the daily entry screen.
edit('tests/behavior_lens_ai_identity.test.js', s => s.replace("  await tick(350);\n  return { callGemini", "  await tick(350);\n  await click(button('All tools'));\n  return { callGemini"));
edit('tests/behavior_lens_safe_selection.test.js', s => s.replace('async function loadPractice() {', "async function loadPractice() {\n  await click(button('All tools'));").replaceAll("await click(button('Open Batch Import'));", "await click(button('All tools'));\n    await click(button('Open Batch Import'));"));
edit('tests/behavior_lens_workspace_lifecycle.test.js', s => s.replace('  return root;\n}', "  await React.act(async () => {\n    Array.from(host.querySelectorAll('button')).find(button => button.textContent.trim() === 'All tools').click();\n  });\n  return root;\n}"));
edit('tests/behavior_lens_allosheet_handoff.test.js', s => s.replace("      const exportCard = host.querySelector", "      await React.act(async () => {\n        Array.from(host.querySelectorAll('button')).find(button => button.textContent.trim() === 'All tools').click();\n      });\n      const exportCard = host.querySelector"));
edit('tests/behavior_lens_app_shell_visualizations_a11y.test.js', s => s.replace('expect(source).toContain("\'aria-label\': d.label");', 'expect(source).toContain("htmlFor: \'bl-definition-measure\'");\n    expect(source).toContain("id: \'bl-definition-measure\'");'));
console.log('Refined workspace and adapted library test navigation.');
