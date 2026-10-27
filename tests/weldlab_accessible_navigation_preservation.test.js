import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {expect,it} from 'vitest';
import {stripWeldlabNavigationFixes} from './helpers/weldlab_accessible_navigation_restore.js';
it('restores the exact turn-start source after reversing only the navigation and annotation repairs',()=>{
 const raw=readFileSync(resolve('stem_lab/stem_tool_weldlab.js'));
 expect(raw.equals(readFileSync(resolve('desktop/web-app/public/stem_lab/stem_tool_weldlab.js')))).toBe(true);
 expect([...raw.subarray(0,3)]).toEqual([239,187,191]);expect(raw.toString('utf8')).not.toContain('\r');
 const before=stripWeldlabNavigationFixes(raw.toString('utf8'));
 expect(createHash('sha256').update(before).digest('hex')).toBe('ef5f848a78ac3de6f49cda5ac3c16e84857b248b257385b812e2a6d832b5c7af');
 expect(stripWeldlabNavigationFixes(before)).toBe(before);
});
