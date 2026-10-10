import base from './deferred-jsdom-regression.vitest.config.mjs';
import {fileURLToPath} from 'node:url';
export default {...base,test:{...base.test,testTimeout:600000,
  outputFile:{json:fileURLToPath(new URL('./unit-final-regression-results.json',import.meta.url))}
}};
