import base from './deferred-jsdom.vitest.config.mjs';
import {fileURLToPath} from 'node:url';
export default {...base,test:{...base.test,
  testNamePattern:/keeps the committed|rejects superseded/,
  outputFile:{json:fileURLToPath(new URL('./unit-commit-regressions-results.json',import.meta.url))}
}};
