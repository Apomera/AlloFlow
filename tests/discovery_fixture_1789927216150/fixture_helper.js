import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
export const load = () => readFileSync(resolve(process.cwd(), 'tests/discovery_fixture_1789927216150/fixture_source.js'), 'utf8');
