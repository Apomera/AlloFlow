import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {expect,it} from 'vitest';
import {stripWeldlabNotebookFixes} from './helpers/weldlab_accessible_notebook_restore.js';
it('restores the exact turn-start source after reversing only the notebook and shoulder repairs',()=>{
 const raw=readFileSync(resolve('stem_lab/stem_tool_weldlab.js'));
 expect(raw.equals(readFileSync(resolve('desktop/web-app/public/stem_lab/stem_tool_weldlab.js')))).toBe(true);
 expect([...raw.subarray(0,3)]).toEqual([239,187,191]);expect(raw.toString('utf8')).not.toContain('\r');
 const before=stripWeldlabNotebookFixes(raw.toString('utf8'));
 expect(createHash('sha256').update(before).digest('hex')).toBe('685387fc07bfe1d74e11d105870851df22b07ab50f1f7bd5f37160a3f567e1b3');
 expect(stripWeldlabNotebookFixes(before)).toBe(before);
});
