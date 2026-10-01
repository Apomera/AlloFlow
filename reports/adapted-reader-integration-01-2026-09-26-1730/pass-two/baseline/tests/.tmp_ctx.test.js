import { it } from 'vitest';
import fs from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
it('ctx', () => {
  resetStemLab(); loadTool('stem_lab/stem_tool_molecule.js','molecule');
  const out=[];
  for (const [id,bad] of [['orbitals','undefined'],['reactions','NaN']]) {
    const d=document.createElement('div');
    d.innerHTML = renderTool('molecule',{ molecule:{ expSection:id } });
    const t=d.textContent;
    let i=-1;
    while((i=t.indexOf(bad,i+1))!==-1) out.push(`${id} @${i}: ...${t.slice(Math.max(0,i-90),i+40).replace(/\s+/g,' ')}...`);
  }
  fs.writeFileSync(process.env.O, out.join('\n'));
});
