const fs = require('node:fs');
const path = require('node:path');
const file = 'behavior_lens_module.js';
let source = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
function replace(oldText, next) { if (!source.includes(oldText)) throw new Error('Missing anchor: ' + oldText.slice(0, 100)); source = source.replace(oldText, next); }
const start = source.indexOf('    const OperationalDefinitionBuilder =');
const end = source.indexOf('    // ─── CantDoWontDo', start);
if(start < 0 || end < 0) throw new Error('Definition component boundaries');
source = source.slice(0, start) + fs.readFileSync(path.join(__dirname, 'definition-component.js'), 'utf8') + '\n\n' + source.slice(end);
replace("        const [searchQuery, setSearchQuery] = useState('');\n        // Derive parent mode", "        const [searchQuery, setSearchQuery] = useState('');\n        const [hubView, setHubView] = useState('today');\n        const [showStudentSetup, setShowStudentSetup] = useState(false);\n        // Derive parent mode");
const handlerStart = source.indexOf('                    const handleToolOpen = (toolId) => {');
const handlerEnd = source.indexOf('                    const toggleFav', handlerStart);
const handler = source.slice(handlerStart, handlerEnd).replace('const handleToolOpen', 'const launchHubTool');
source = source.slice(0, handlerStart) + '                    const handleToolOpen = launchHubTool;\n\n' + source.slice(handlerEnd);
replace('        const renderHub = () => {', handler + '\n        const renderHub = () => {');
const returnStart = source.indexOf("            return h('div', { className: 'max-w-4xl mx-auto' },", source.indexOf('        const renderHub ='));
const setupStart = source.indexOf("                h('div', { className: 'mb-6 bg-white", returnStart);
const setupEnd = source.indexOf('                // ── Student Roster Quick-Switch', setupStart);
let setup = source.slice(setupStart, setupEnd).trim();
if(!setup.endsWith(',')) throw new Error('Setup boundary');
setup = setup.slice(0, -1);
const today = fs.readFileSync(path.join(__dirname, 'today-view.js'), 'utf8');
source = source.slice(0, returnStart) + '            const studentSetup = ' + setup + ';\n' + today +
    "\n            return h('div', { className: 'max-w-4xl mx-auto' },\n                hubNavigation,\n                h('details', { className: 'mb-4', open: !selectedStudent }, h('summary', { className: 'min-h-11 py-3 text-sm font-bold text-slate-700' }, 'Student and role settings'), studentSetup),\n" + source.slice(setupEnd);
// Keep practice controls available, but out of the default setup flow.
replace("h('div', { className: 'mt-4 pt-4 border-t border-indigo-100' },\n                                h('div', { className: 'flex items-center gap-1.5 mb-2' },", "h('details', { className: 'mt-4 pt-4 border-t border-indigo-100' },\n                                h('summary', { className: 'min-h-11 py-2 text-sm font-bold text-indigo-900' }, 'Practice with sample data'),\n                                h('div', { className: 'flex items-center gap-1.5 mb-2' },");
replace('h(\'button\', { "aria-label": "Toggle user role",', "h('button', { 'aria-label': role === 'bcba' ? 'Use specialist view' : role === 'parent' ? 'Use family view' : 'Use teacher view', 'aria-pressed': userRole === role,");
replace('onClick: () => setIsParentMode(p => !p),', "onClick: () => setUserRole(isParentMode ? 'teacher' : 'parent'),");
// The library is a browse destination, not a second onboarding flow.
const welcomeStart = source.indexOf("                        h('nav', { 'aria-label': 'BehaviorLens getting started'");
const welcomeEnd = source.indexOf('                        // ── Search Bar', welcomeStart);
if(welcomeStart < 0 || welcomeEnd < 0) throw new Error('Welcome boundaries');
source = source.slice(0, welcomeStart) + source.slice(welcomeEnd);
replace("!isParentMode && h('div', { className: 'bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-600", "userRole === 'bcba' && h('div', { className: 'bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-600");
// Remove duplicate recommendation UI; Today supplies a single task hierarchy.
const recommenderStart=source.indexOf('                        // ── Next Step Recommender');
const recommenderEnd=source.indexOf('                        // ── Mini Heatmap',recommenderStart);
source=source.slice(0,recommenderStart)+source.slice(recommenderEnd);
const recStart=source.indexOf('                        // ── Smart Recommendations');
const recEnd=source.indexOf('                        // ── Categorized Tool Grid',recStart);
source=source.slice(0,recStart)+source.slice(recEnd);
const rulesStart=source.indexOf('                    // Smart recommendations',source.indexOf('const renderHub'));
const rulesEnd=source.indexOf('                    const renderCard',rulesStart);
source=source.slice(0,rulesStart)+source.slice(rulesEnd);
replace("activePanel === 'opdef' && h(OperationalDefinitionBuilder, {\n                    studentName: selectedStudent,", "activePanel === 'opdef' && h(OperationalDefinitionBuilder, {\n                    key: activeStudentId || selectedStudent,\n                    targetBehaviors, setTargetBehaviors,\n                    onRecord: () => openPanel('abc'),\n                    studentName: selectedStudent,");
// A missing intensity rating must not become a measured midpoint.
replace("abcEntries.length > 0 ? (abcEntries.reduce((s, e) => s + (e.intensity || 3), 0) / abcEntries.length).toFixed(1) : '—'", "getBehaviorLensWorkspaceRuntime().summarizeIntensity(abcEntries).mean == null ? 'Not rated' : getBehaviorLensWorkspaceRuntime().summarizeIntensity(abcEntries).mean.toFixed(1)");
new Function(source);
fs.writeFileSync(file, source);
fs.writeFileSync('desktop/web-app/public/behavior_lens_module.js', source);
console.log('Updated workspace entry, definition editor, and deploy mirror.');
