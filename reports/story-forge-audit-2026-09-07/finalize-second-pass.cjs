const fs=require('fs');
const p='story_forge_source.jsx';let s=fs.readFileSync(p,'utf8');
s=s.replace('className="bg-gradient-to-r from-rose-600 to-pink-600 p-3 sm:p-4 text-white flex justify-between items-center gap-2 shadow-lg shrink-0"','className="sf-project-header bg-gradient-to-r from-rose-600 to-pink-600 p-3 sm:p-4 text-white flex justify-between items-center gap-2 shadow-lg shrink-0"');
s=s.replace('.sf-project-menu-panel{','.sf-project-header{position:relative;z-index:60}.sf-project-menu-panel{z-index:260;');
s=s.replace('if (previous) setProjectActionUndo(previous);','setProjectActionUndo(previous);');
fs.writeFileSync(p,s);
const t='reports/story-forge-audit-2026-09-07/verify-second-pass.cjs';s=fs.readFileSync(t,'utf8').replace("String(t[0]).includes('checkpoint')","String(t[0]).toLowerCase().includes('checkpoint')");fs.writeFileSync(t,s);
