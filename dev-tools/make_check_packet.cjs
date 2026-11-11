#!/usr/bin/env node
'use strict';

// Make a check packet from the command line: one self-contained HTML file, no AI, no network.
//   node dev-tools/make_check_packet.cjs --measure math_computation --grade 3 --form A --code 2468 --out check.html
//   node dev-tools/make_check_packet.cjs --measure quantity_discrimination --grade K --form A --out qd.html
//   node dev-tools/make_check_packet.cjs --problems "7+8,12-5,6x4" --time 120 --title "Facts to 20" --out facts.html
// --measure quantity_discrimination | missing_number | math_computation, with --grade and --form (A, B or C).
// --problems "7+8,12-5,6x4" makes a check from your own list instead (also "3 + 4 + 5 = 12").
// Other flags: --code 1234 (teacher code, 4 or more characters)  --title "..."  --time 120 (seconds; custom lists only)
//   --untimed  --no-skip  --allow-remainders  --no-practice
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
// JSON files may start with a byte order mark.
const readJson = file => { const raw = read(file); return JSON.parse(raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw); };

function loadParts() {
  const g = { crypto: require('node:crypto').webcrypto };
  g.window = g;
  new Function('window', read('word_sounds_take_home_loader.js')).call(g, g);
  const loader = g.AlloWordSoundsTakeHome;
  if (!loader || !loader.CHECK_ADAPTERS) throw new Error('The take-home loader did not register (or has no check mode)');
  return { loader, builder: require(path.join(ROOT, 'packet_check_builder.js')) };
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const name = argv[i];
    if (!/^--[a-z-]+$/.test(name)) throw new Error('Unexpected argument: ' + name);
    const key = name.slice(2);
    if (['untimed', 'no-skip', 'allow-remainders', 'no-practice', 'help'].includes(key)) args[key] = true;
    else { if (i + 1 >= argv.length) throw new Error('Missing value for ' + name); args[key] = argv[++i]; }
  }
  return args;
}

function main(argv) {
  const args = parseArgs(argv);
  if (args.help || (!args.measure && !args.problems)) {
    console.log(read('dev-tools/make_check_packet.cjs').split('\n').slice(3, 11).map(line => line.replace(/^\/\/ ?/, '')).join('\n'));
    return args.help ? 0 : 1;
  }
  if (!args.out) throw new Error('Say where to write the file: --out file.html');
  const { loader, builder } = loadParts();
  let lesson;
  if (args.problems) {
    lesson = builder.lessonFromMathProblems({ title: args.title, problems: builder.parseProblems(args.problems), timeLimitS: args.untimed ? null : Number(args.time || 120),
      allowSkip: !args['no-skip'], allowRemainders: !!args['allow-remainders'] });
  } else {
    if (args.grade == null) throw new Error('A fixed form needs --grade (for example --grade 1 or --grade K)');
    lesson = builder.lessonFromMathForm({ bank: readJson('psychometric_math_probes.json'), measure: args.measure, grade: args.grade, form: args.form || 'A',
      practice: args['no-practice'] ? false : undefined });
  }
  const built = builder.buildCheckPacket({ lesson, title: args.problems ? undefined : args.title, teacherCode: args.code, loader });
  const out = path.resolve(args.out);
  fs.writeFileSync(out, built.html);
  const m = built.manifest;
  console.log([
    'Wrote ' + out + ' (' + Buffer.byteLength(built.html, 'utf8') + ' bytes)',
    'Packet ' + m.packet.id + ' ' + m.packet.version + ', form "' + m.packet.form + '", mode ' + m.packet.mode,
    'Measure ' + m.check.measure + ', score in ' + m.check.scoreUnit + ', ' + m.check.items + ' items' + (m.check.practiceItems ? ' + ' + m.check.practiceItems + ' practice' : '')
      + ', time limit ' + (m.check.timeLimitS ? m.check.timeLimitS + ' s' : 'none'),
    'Teacher code: ' + m.check.teacherCode,
    'Network: ' + JSON.stringify(m.network),
    'SHA-256 of the file: ' + built.sha256,
  ].join('\n'));
  return 0;
}

try { process.exitCode = main(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 1; }
