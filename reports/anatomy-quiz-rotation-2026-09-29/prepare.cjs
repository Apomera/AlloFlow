const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const out = __dirname;
const translations = {
  french: 'Recommencer remet le score du quiz à zéro et actualise les priorités de révision. Tes notes et ton historique de révision restent enregistrés.',
  spanish_latin_america: 'Reiniciar restablece la puntuación del cuestionario y actualiza las prioridades de repaso. Tus notas y tu historial de repaso siguen guardados.',
  arabic: 'تعيد إعادة البدء نتيجة الاختبار إلى الصفر وتحدّث أولويات المراجعة. تبقى ملاحظاتك وسجلّ المراجعة محفوظين.'
};
fs.copyFileSync('stem_lab/stem_tool_anatomy.js', 'desktop/web-app/public/stem_lab/stem_tool_anatomy.js');
for (const [lang, value] of Object.entries(translations)) {
  const file = 'lang/' + lang + '.js';
  const text = fs.readFileSync(file, 'utf8');
  const next = text.replace(/("quiz_flow_restart_help":\s*)"(?:[^"\\]|\\.)*"/, (_, prefix) => prefix + JSON.stringify(value));
  if (next === text) throw new Error('Expected restart help update in ' + file);
  fs.writeFileSync(file, next);
  fs.copyFileSync(file, 'desktop/web-app/public/' + file);
}
for (const file of ['stem_lab/stem_tool_anatomy.js', 'desktop/web-app/public/stem_lab/stem_tool_anatomy.js']) cp.execFileSync(process.execPath, ['--check', file]);
console.log('Anatomy source and language mirrors synchronized; syntax checks passed.');
