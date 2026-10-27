import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {expect,it} from 'vitest';
import {stripWeldlabMacroFixes} from './helpers/weldlab_accessible_macro_restore.js';
it('restores the exact turn-start source after reversing only the macro and selection repairs',()=>{
 const raw=readFileSync(resolve('stem_lab/stem_tool_weldlab.js'));
 expect(raw.equals(readFileSync(resolve('desktop/web-app/public/stem_lab/stem_tool_weldlab.js')))).toBe(true);
 expect([...raw.subarray(0,3)]).toEqual([239,187,191]);expect(raw.toString('utf8')).not.toContain('\r');
 const before=stripWeldlabMacroFixes(raw.toString('utf8'));
 expect(createHash('sha256').update(before).digest('hex')).toBe('7a06863cf4ea11ff398205f9fc1ddaf184181f55d2850bb642dff229953e0a2a');
 expect(stripWeldlabMacroFixes(before)).toBe(before);
});
