import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8').replace(/\r\n/g, '\n');

const source = read('view_info_modal_source.jsx');
const notices = read('THIRD_PARTY_LICENSES.md');
const bundledLicense = read('licenses/moon-rover-MIT.txt');

const UPSTREAM_COMMIT = '8a72604adf2ca465c8a8529effd12803129c3531';
const EXPECTED_LICENSE = `MIT License

Copyright (c) 2026 winch

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;

describe('moon-rover attribution and provenance', () => {
  it('credits the independently adapted techniques in the in-app Open Source section', () => {
    expect(source).toContain("name: 'moon-rover (REGOLITH — The Silence at Anaxagoras)'");
    expect(source).toContain('technical inspiration for selected lunar-rover simulation techniques independently adapted for Moon Mission and Solar System Drone Mode');
    expect(source).toContain("license: 'MIT', url: 'https://github.com/winchxyz/moon-rover'");
  });

  it('pins the audited source and states that no upstream source was copied', () => {
    expect(notices).toContain(UPSTREAM_COMMIT);
    expect(notices).toContain('[upstream notice bundled voluntarily for provenance](./licenses/moon-rover-MIT.txt)');
    expect(notices).toContain('independent implementation is modified and unaffiliated');
    expect(notices).toContain('no endorsement by the original author');
  });

  it('bundles the complete upstream MIT license notice verbatim', () => {
    expect(bundledLicense).toBe(EXPECTED_LICENSE);
  });
});
