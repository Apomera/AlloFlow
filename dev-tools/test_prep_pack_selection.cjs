'use strict';

function selectPackStems(args, availableStems, allowedFlags = []) {
  const selected = new Set();
  const available = new Set(availableStems);
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (allowedFlags.includes(arg)) continue;
    let stem;
    if (arg === '--pack') stem = args[++index];
    else if (arg.startsWith('--pack=')) stem = arg.slice('--pack='.length);
    else throw new Error('Unknown option: ' + arg);
    if (!stem || !/^[a-z0-9_]+$/.test(stem)) {
      throw new Error('--pack requires a simple registered pack stem');
    }
    if (!available.has(stem)) throw new Error('Unknown pack: ' + stem);
    if (selected.has(stem)) throw new Error('Duplicate pack selection: ' + stem);
    selected.add(stem);
  }
  return availableStems.filter(stem => !selected.size || selected.has(stem));
}

module.exports = { selectPackStems };
