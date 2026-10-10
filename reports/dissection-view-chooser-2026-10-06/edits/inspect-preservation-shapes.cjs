const fs = require('fs'), path = require('path');
const repo = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
for (const file of [
  'reports/dissection-study-chooser-2026-10-05/manifest.json',
  'reports/dissection-view-chooser-2026-10-06/edits/renderer-edits.json',
  'reports/dissection-view-chooser-2026-10-06/edits/print-fix.json',
  'reports/dissection-view-chooser-2026-10-06/edits/browser-fixture-edits.json',
]) {
  const data = JSON.parse(fs.readFileSync(path.join(repo, file), 'utf8'));
  const info = {file, keys: Object.keys(data)};
  if (Array.isArray(data)) {info.length = data.length; info.first = data[0];}
  else for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value)) info[key] = {length: value.length, firstKeys: value[0] && Object.keys(value[0]), ...(key === 'entries' ? {first: value[0]} : {})};
    else if (typeof value !== 'object') info[key] = typeof value === 'string' && value.length > 200 ? value.slice(0, 200) : value;
  }
  console.log(JSON.stringify(info));
}
