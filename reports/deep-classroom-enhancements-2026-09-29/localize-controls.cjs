const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '../..');
const additions = { en: { progress_details: 'Details', all_family_members: 'Everyone' }, french: { progress_details: 'Détails', all_family_members: 'Tout le monde' }, spanish_latin_america: { progress_details: 'Detalles', all_family_members: 'Todos' }, arabic: { progress_details: 'التفاصيل', all_family_members: 'الجميع' } };
const strings = JSON.parse(fs.readFileSync(path.join(__dirname, 'localized-keys.json'), 'utf8'));
for (const [language, values] of Object.entries(additions)) {
  const files = language === 'en' ? ['ui_strings.js', 'desktop/web-app/public/ui_strings.js'] : ['lang/' + language + '.js', 'desktop/web-app/public/lang/' + language + '.js'];
  for (const file of files) {
    const target = path.join(root, file), before = fs.readFileSync(target, 'utf8'), document = JSON.parse(before);
    if (Object.keys(values).some(key => key in document.learner)) throw Error('Existing control strings in ' + file);
    const start = before.indexOf('  "learner": {'), end = before.indexOf('\n  }', start);
    if (start < 0 || end < start) throw Error('Missing learner namespace in ' + file);
    const after = before.slice(0, end) + ',\n' + Object.entries(values).map(([key, value]) => '    ' + JSON.stringify(key) + ': ' + JSON.stringify(value)).join(',\n') + before.slice(end);
    JSON.parse(after);
    if (fs.readFileSync(target, 'utf8') !== before) throw Error('Concurrent string edit');
    fs.writeFileSync(target, after);
  }
  Object.assign(strings[language], values);
}
fs.writeFileSync(path.join(__dirname, 'localized-keys.json'), JSON.stringify(strings, null, 2));
console.log('Localized progress details and family-wide selection labels.');
