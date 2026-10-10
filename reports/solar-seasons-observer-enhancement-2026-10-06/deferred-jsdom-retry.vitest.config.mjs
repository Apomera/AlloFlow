import base from './deferred-jsdom.vitest.config.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
const initial=JSON.parse(fs.readFileSync(new URL('./unit-regression-results.json',import.meta.url),'utf8'));
const suites=initial.testResults.filter(suite=>suite.assertionResults.some(test=>test.status==='failed'));
const failures=suites.flatMap(suite=>suite.assertionResults.filter(test=>test.status==='failed'));
if(!failures.length)throw new Error('No failed regressions require a retry.');
const escape=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
export default {...base,test:{...base.test,
  include:suites.map(suite=>path.relative(root,suite.name).replaceAll('\\','/')),
  testNamePattern:new RegExp(failures.map(test=>escape(test.fullName)).join('|')),
  testTimeout:600000,
  outputFile:{json:fileURLToPath(new URL('./unit-retry-results.json',import.meta.url))}
}};
