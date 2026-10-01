import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
export const load = () => readFileSync(resolve(process.cwd(), 'tests/discovery_fixture_1790107852957/fixture_source.js'), 'utf8');
