const fs=require('fs');
function edit(file,a,b){const s=fs.readFileSync(file,'utf8');if(!s.includes(a))throw Error('Missing '+file+': '+a.slice(0,90));fs.writeFileSync(file,s.replace(a,b));}
edit('tests/memory_aid_refinement_20260919.test.js','No recall question is saved','No recall question was saved');
edit('tests/memory_aid_audit_fixes.test.js',`expect(a).toContain("'note-taking', 'anchor-chart', 'memory-aid', 'applied-challenge',\\n          'dbq', 'faq', 'outline', 'image',");`,`expect(src('host_handlers_source.jsx')).toContain("'note-taking', 'anchor-chart', 'memory-aid', 'applied-challenge',\\n          'dbq', 'faq', 'outline', 'image',");`);
edit('tests/memory_aid_export_lockstep.test.js',"expect(source).toContain('const handlePrintResourceSheet = (item, options = {}) => {');", "expect(source).toContain('const handlePrintResourceSheet = (...__a) => _alloHostHandlers().handlePrintResourceSheet(...__a);');\n    expect(readFileSync(resolve(process.cwd(), 'host_handlers_source.jsx'), 'utf8')).toContain('const handlePrintResourceSheet = (item, options = {}) => {');");
edit('reports/memory-aid-ux-review-2026-09-12/sync-strings.cjs',"['memory_aid_source.jsx','generate_dispatcher_source.jsx']", "['memory_aid_source.jsx','generate_dispatcher_source.jsx','doc_pipeline_source.jsx']");
edit('reports/memory-aid-ux-review-2026-09-12/sync-strings.cjs','(?:tr|T)\\(', '(?:tr|T|_maT)\\(');
// Avoid repeating a tab-only notification for every keystroke. The scope
// warning remains visible and still updates whenever storage changes.
edit('memory_aid_source.jsx', 'const followUpWriteRef = React.useRef(Object.create(null));', "const followUpWriteRef = React.useRef(Object.create(null));\n  const followUpScopeRef = React.useRef('');");
edit('memory_aid_source.jsx',"if (result.ok) { setPrivatePracticeState({ ownerIdentity: owner, cards: result.cards }); reportPracticeStorageScope(result.scope); }", "if (result.ok) { setPrivatePracticeState({ ownerIdentity: owner, cards: result.cards }); const scopeKey = owner + '|' + result.scope; if (followUpScopeRef.current !== scopeKey) { followUpScopeRef.current = scopeKey; reportPracticeStorageScope(result.scope); } }");
console.log('Updated localization and assertions for current host handler wiring.');
