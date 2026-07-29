const fs = require('node:fs');
const path = require('node:path');

const here = __dirname;
const ascii = (value) => value
  .replace(/[\u2018\u2019]/g, "'")
  .replace(/[\u201c\u201d]/g, '"')
  .replace(/[\u2013\u2014]/g, '-')
  .replace(/\u00d7/g, 'x')
  .normalize('NFKD')
  .replace(/[^\x09\x0a\x0d\x20-\x7e]/g, '')
  .replace(/\s+/g, ' ')
  .trim();
const map = (value) => {
  if (typeof value === 'string') return ascii(value);
  if (Array.isArray(value)) return value.map(map);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, map(child)]));
  }
  return value;
};

for (const domainId of [1, 2, 3, 4, 6, 7, 8]) {
  const filename = path.join(here, `domain_0${domainId}.json`);
  if (!fs.existsSync(filename)) continue;
  const normalized = map(JSON.parse(fs.readFileSync(filename, 'utf8')));
  fs.writeFileSync(filename, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
  console.log(`ASCII-normalized domain_0${domainId}.json`);
}
