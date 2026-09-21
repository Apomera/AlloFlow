import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
export const load = () => readFileSync(resolve(process.cwd(), 'tests/discovery_fixture_1789959374503/fixture_source.js'), 'utf8');
