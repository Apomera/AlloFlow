const fs = require('fs'), path = require('path'), crypto = require('crypto');
const root = path.resolve(__dirname, '../..'), hash = s => crypto.createHash('sha256').update(s).digest('hex');
const strings = {
  en: {
    device_activity_notice: 'Activity totals show work saved on this device. Choose a family member to view their saved sessions.',
    progress_intro: 'Track your learning growth over time', family_members: 'Family members',
    no_saved_sessions: 'No saved sessions for this family member yet.', resources_opened: 'Resources opened',
    device_activity: 'Activity on this device', saved_responses: 'Responses', download_device_progress_report: 'Download device progress report'
  },
  french: {
    device_activity_notice: 'Les totaux correspondent au travail enregistré sur cet appareil. Choisissez un membre de la famille pour consulter ses séances enregistrées.',
    progress_intro: 'Suivez vos progrès au fil du temps', family_members: 'Membres de la famille',
    no_saved_sessions: 'Aucune séance enregistrée pour ce membre de la famille.', resources_opened: 'Ressources ouvertes',
    device_activity: 'Activité sur cet appareil', saved_responses: 'Réponses', download_device_progress_report: 'Télécharger le rapport de progression de cet appareil'
  },
  spanish_latin_america: {
    device_activity_notice: 'Los totales muestran el trabajo guardado en este dispositivo. Elige un miembro de la familia para ver sus sesiones guardadas.',
    progress_intro: 'Sigue tu progreso a lo largo del tiempo', family_members: 'Miembros de la familia',
    no_saved_sessions: 'Este miembro de la familia aún no tiene sesiones guardadas.', resources_opened: 'Recursos abiertos',
    device_activity: 'Actividad en este dispositivo', saved_responses: 'Respuestas', download_device_progress_report: 'Descargar el informe de progreso de este dispositivo'
  },
  arabic: {
    device_activity_notice: 'تعرض الإجماليات العمل المحفوظ على هذا الجهاز. اختر أحد أفراد الأسرة لعرض جلساته المحفوظة.',
    progress_intro: 'تابع تقدمك في التعلم بمرور الوقت', family_members: 'أفراد الأسرة',
    no_saved_sessions: 'لا توجد جلسات محفوظة لهذا الفرد من الأسرة حتى الآن.', resources_opened: 'الموارد المفتوحة',
    device_activity: 'النشاط على هذا الجهاز', saved_responses: 'الإجابات', download_device_progress_report: 'تنزيل تقرير التقدم لهذا الجهاز'
  }
};
const targets = Object.entries(strings).flatMap(([language, values]) => (language === 'en'
  ? ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']
  : ['lang/' + language + '.js', 'desktop/web-app/public/lang/' + language + '.js']).map(file => ({ file, values, before: fs.readFileSync(path.join(root, file), 'utf8') })));
for (const item of targets) {
  const ns = JSON.parse(item.before).learner;
  if (!ns || Object.keys(item.values).some(key => key in ns)) throw Error('Inspect existing learner keys in ' + item.file);
  const start = item.before.indexOf('  "learner": {'), end = item.before.indexOf('\n  }', start);
  if (start < 0 || end < start) throw Error('Namespace boundary missing in ' + item.file);
  item.after = item.before.slice(0, end) + ',\n' + Object.entries(item.values).map(([key, value]) => '    ' + JSON.stringify(key) + ': ' + JSON.stringify(value)).join(',\n') + item.before.slice(end);
  const parsed = JSON.parse(item.after);
  if (Object.keys(item.values).some(key => parsed.learner[key] !== item.values[key])) throw Error('Readback namespace failure');
}
const before = JSON.parse(fs.readFileSync(path.join(__dirname, 'before.json'), 'utf8'));
for (const item of targets) {
  if (fs.readFileSync(path.join(root, item.file), 'utf8') !== item.before) throw Error('Concurrent string edit: ' + item.file);
  const backup = path.join(__dirname, 'before', item.file.replaceAll('/', '__'));
  if (fs.existsSync(backup)) throw Error('Backup already exists: ' + item.file);
  fs.writeFileSync(backup, item.before); before[item.file] = hash(item.before);
  fs.writeFileSync(path.join(root, item.file), item.after);
  if (fs.readFileSync(path.join(root, item.file), 'utf8') !== item.after) throw Error('Write verification failure: ' + item.file);
}
fs.writeFileSync(path.join(__dirname, 'before.json'), JSON.stringify(before, null, 2));
fs.writeFileSync(path.join(__dirname, 'localized-keys.json'), JSON.stringify(strings, null, 2));
console.log('Added eight progress labels to English, French, Latin American Spanish and Arabic, preserving every existing namespace.');
