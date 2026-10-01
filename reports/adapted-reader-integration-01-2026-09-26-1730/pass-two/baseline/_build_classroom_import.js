// Copy the actual import helper into the desktop web-app distribution. No network or credentials.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = __dirname;
const files = ['classroom-import.html', 'classroom_import_config.js', 'classroom_import_service.js', 'classroom_import_app.js', 'docs/google_classroom_import.md', 'docs/google_workspace_connections.md', 'docs/school_store_class_links.md', 'docs/school_store_typed_recognition.md', 'docs/school_store_voice_awards.md'];
for (const file of files) {
  const source = path.join(root, file);
  if (file.endsWith('.js')) new vm.Script(fs.readFileSync(source, 'utf8'), { filename: file });
  const destination = path.join(root, 'desktop/web-app/public', file);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}
console.log('Classroom import helper: syntax checked and desktop assets synchronized.');
