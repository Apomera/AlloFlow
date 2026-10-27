import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {expect,it} from 'vitest';
import {stripWeldlabRepairFixes} from './helpers/weldlab_accessible_repair_restore.js';
it('restores the exact turn-start source after reversing only the repair, reader and laser accessibility changes',()=>{
 const raw=readFileSync(resolve('stem_lab/stem_tool_weldlab.js'));
 expect(raw.equals(readFileSync(resolve('desktop/web-app/public/stem_lab/stem_tool_weldlab.js')))).toBe(true);
 expect([...raw.subarray(0,3)]).toEqual([239,187,191]);expect(raw.toString('utf8')).not.toContain('\r');
 const before=stripWeldlabRepairFixes(raw.toString('utf8'));
 expect(createHash('sha256').update(before).digest('hex')).toBe('7e57f9560470babc54a211697f790dea133124f25c455994f5aa3b504ea82cbe');
 expect(stripWeldlabRepairFixes(before)).toBe(before);
});
