"""Fix Proxy invariant violation by adding set traps to all 3 Proxies."""
FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

fixes = 0

# Fix PHONEME_AUDIO_BANK Proxy - add set trap before closing });
old_phoneme = """  getOwnPropertyDescriptor: function(target, prop) {
    if (!_CACHE_PHONEME_AUDIO_BANK) _CACHE_PHONEME_AUDIO_BANK = _LOAD_PHONEME_AUDIO_BANK_RAW();
    const desc = Reflect.getOwnPropertyDescriptor(_CACHE_PHONEME_AUDIO_BANK, prop); if (desc) { desc.configurable = true; desc.writable = true; } return desc;
  }
});"""

new_phoneme = """  getOwnPropertyDescriptor: function(target, prop) {
    if (!_CACHE_PHONEME_AUDIO_BANK) _CACHE_PHONEME_AUDIO_BANK = _LOAD_PHONEME_AUDIO_BANK_RAW();
    const desc = Reflect.getOwnPropertyDescriptor(_CACHE_PHONEME_AUDIO_BANK, prop); if (desc) { desc.configurable = true; desc.writable = true; } return desc;
  },
  set: function(target, prop, value) {
    if (!_CACHE_PHONEME_AUDIO_BANK) _CACHE_PHONEME_AUDIO_BANK = _LOAD_PHONEME_AUDIO_BANK_RAW();
    _CACHE_PHONEME_AUDIO_BANK[prop] = value;
    return true;
  },
  defineProperty: function(target, prop, descriptor) {
    if (!_CACHE_PHONEME_AUDIO_BANK) _CACHE_PHONEME_AUDIO_BANK = _LOAD_PHONEME_AUDIO_BANK_RAW();
    Object.defineProperty(_CACHE_PHONEME_AUDIO_BANK, prop, descriptor);
    return true;
  }
});"""

if old_phoneme in content:
    content = content.replace(old_phoneme, new_phoneme, 1)
    fixes += 1
    print("1. Fixed PHONEME_AUDIO_BANK Proxy")
else:
    print("WARNING: PHONEME_AUDIO_BANK pattern not found")

# Fix INSTRUCTION_AUDIO Proxy
old_instr = """  getOwnPropertyDescriptor: function(target, prop) {
    if (!_CACHE_INSTRUCTION_AUDIO) _CACHE_INSTRUCTION_AUDIO = _LOAD_INSTRUCTION_AUDIO_RAW();
    const desc = Reflect.getOwnPropertyDescriptor(_CACHE_INSTRUCTION_AUDIO, prop); if (desc) { desc.configurable = true; desc.writable = true; } return desc;
  }
});"""

new_instr = """  getOwnPropertyDescriptor: function(target, prop) {
    if (!_CACHE_INSTRUCTION_AUDIO) _CACHE_INSTRUCTION_AUDIO = _LOAD_INSTRUCTION_AUDIO_RAW();
    const desc = Reflect.getOwnPropertyDescriptor(_CACHE_INSTRUCTION_AUDIO, prop); if (desc) { desc.configurable = true; desc.writable = true; } return desc;
  },
  set: function(target, prop, value) {
    if (!_CACHE_INSTRUCTION_AUDIO) _CACHE_INSTRUCTION_AUDIO = _LOAD_INSTRUCTION_AUDIO_RAW();
    _CACHE_INSTRUCTION_AUDIO[prop] = value;
    return true;
  },
  defineProperty: function(target, prop, descriptor) {
    if (!_CACHE_INSTRUCTION_AUDIO) _CACHE_INSTRUCTION_AUDIO = _LOAD_INSTRUCTION_AUDIO_RAW();
    Object.defineProperty(_CACHE_INSTRUCTION_AUDIO, prop, descriptor);
    return true;
  }
});"""

if old_instr in content:
    content = content.replace(old_instr, new_instr, 1)
    fixes += 1
    print("2. Fixed INSTRUCTION_AUDIO Proxy")
else:
    print("WARNING: INSTRUCTION_AUDIO pattern not found")

# Fix ISOLATION_AUDIO Proxy
old_isol = """  getOwnPropertyDescriptor: function(target, prop) {
    if (!_CACHE_ISOLATION_AUDIO) _CACHE_ISOLATION_AUDIO = _LOAD_ISOLATION_AUDIO_RAW();
    const desc = Reflect.getOwnPropertyDescriptor(_CACHE_ISOLATION_AUDIO, prop); if (desc) { desc.configurable = true; desc.writable = true; } return desc;
  }
});"""

new_isol = """  getOwnPropertyDescriptor: function(target, prop) {
    if (!_CACHE_ISOLATION_AUDIO) _CACHE_ISOLATION_AUDIO = _LOAD_ISOLATION_AUDIO_RAW();
    const desc = Reflect.getOwnPropertyDescriptor(_CACHE_ISOLATION_AUDIO, prop); if (desc) { desc.configurable = true; desc.writable = true; } return desc;
  },
  set: function(target, prop, value) {
    if (!_CACHE_ISOLATION_AUDIO) _CACHE_ISOLATION_AUDIO = _LOAD_ISOLATION_AUDIO_RAW();
    _CACHE_ISOLATION_AUDIO[prop] = value;
    return true;
  },
  defineProperty: function(target, prop, descriptor) {
    if (!_CACHE_ISOLATION_AUDIO) _CACHE_ISOLATION_AUDIO = _LOAD_ISOLATION_AUDIO_RAW();
    Object.defineProperty(_CACHE_ISOLATION_AUDIO, prop, descriptor);
    return true;
  }
});"""

if old_isol in content:
    content = content.replace(old_isol, new_isol, 1)
    fixes += 1
    print("3. Fixed ISOLATION_AUDIO Proxy")
else:
    print("WARNING: ISOLATION_AUDIO pattern not found")

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nDone! {fixes}/3 Proxies fixed with set+defineProperty traps")
