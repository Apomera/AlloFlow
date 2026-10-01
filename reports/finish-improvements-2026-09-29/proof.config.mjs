import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
export default { test: { include: ['tests/**/*.test.js'], environment: 'jsdom', setupFiles: [path.join(dir, 'proof-setup.mjs'), path.join(process.cwd(), 'tests/setup.js')], sequence: { setupFiles: 'list' }, pool: 'forks', maxWorkers: 1, testTimeout: 30000 } };
