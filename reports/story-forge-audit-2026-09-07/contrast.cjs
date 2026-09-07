const fs=require('fs');let s=fs.readFileSync('story_forge_source.jsx','utf8');
s=s.replace('block text-[9px] uppercase tracking-widest opacity-75','block text-[9px] uppercase tracking-widest');
s=s.replace('text-[10px] font-black uppercase tracking-widest text-rose-600','sf-step-kicker text-[10px] font-black uppercase tracking-widest text-rose-700');
s=s.replace('.sf-step-guide .text-rose-600{display:none}', '.sf-step-guide .sf-step-kicker{display:none}');
s=s.replace('onClick={reviseStory} className="px-5 py-2.5 bg-amber-500 text-white rounded-full text-sm font-bold hover:bg-amber-600', 'onClick={reviseStory} className="px-5 py-2.5 bg-amber-700 text-white rounded-full text-sm font-bold hover:bg-amber-800');
s=s.replace('className="text-[11px] opacity-60">×{count}', 'className="text-[11px]">×{count}');
fs.writeFileSync('story_forge_source.jsx',s);
