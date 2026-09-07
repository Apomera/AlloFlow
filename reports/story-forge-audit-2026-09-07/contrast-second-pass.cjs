const fs=require('fs');const p='story_forge_source.jsx';let s=fs.readFileSync(p,'utf8');
s=s.replace('text-[11px] font-bold text-rose-500 uppercase tracking-widest','text-[11px] font-bold text-rose-700 uppercase tracking-widest');
s=s.replace('bg-blue-50 border-blue-200/50 text-blue-500 hover:bg-blue-100','bg-blue-50 border-blue-200/50 text-blue-700 hover:bg-blue-100');
s=s.replace('className="text-amber-500 hover:text-amber-700 text-[11px] font-bold','className="text-amber-700 hover:text-amber-700 text-[11px] font-bold');
s=s.replaceAll('pp.text.trim().length > 10',"(authoredSections[pi] || '').trim().length > 0");
fs.writeFileSync(p,s);
