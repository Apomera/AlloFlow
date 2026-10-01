import fs from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const forbidden = /[\u00c2\u00c3\u00e2\u00f0\ufffd]/u;
const collectStrings = (value, output = []) => {
  if (typeof value === 'string') output.push(value);
  else if (Array.isArray(value)) value.forEach((item) => collectStrings(item, output));
  else if (value && typeof value === 'object') Object.values(value).forEach((item) => collectStrings(item, output));
  return output;
};

describe('EPPP memory-aid Wave 08 completed-module encoding', () => {
  for (const domainId of [1, 2, 3, 4]) {
    it(`keeps every learner and provenance string in Domain ${domainId} free of mojibake markers`, () => {
      const module = JSON.parse(fs.readFileSync(
        resolve(process.cwd(), `dev-tools/eppp_memory_aid_wave08/domain_0${domainId}.json`),
        'utf8',
      ));
      for (const value of collectStrings(module)) {
        expect(value).not.toMatch(forbidden);
        expect(value).not.toMatch(/&(?:mdash|ndash|nbsp|ldquo|rdquo|rsquo);/i);
      }
    });
  }
});
