const fs = require('fs');
try {
  const code = fs.readFileSync('stem_lab/stem_lab_module.js', 'utf8');
  new require('vm').Script(code);
  console.log('No syntax errors found');
} catch (e) {
  console.log(e.stack);
}
