const fs = require('fs');
const path = require('path');

const targetFile = path.join(process.cwd(), 'AlloFlowANTI.txt');

// Optimized patterns for the specific audio banks we want to lazy-load
const BANKS_TO_LAZY_LOAD = [
    'PHONEME_AUDIO_BANK',
    'INSTRUCTION_AUDIO',
    'BLENDING_AUDIO_BANK',
    'SEGMENTATION_AUDIO_BANK',
    'ISOLATION_AUDIO'
];

function applyLazyLoading() {
    console.log(`Reading ${targetFile}...`);
    let content = fs.readFileSync(targetFile, 'utf8');
    let originalLength = content.length;

    BANKS_TO_LAZY_LOAD.forEach(bankName => {
        console.log(`Processing ${bankName}...`);

        // Regex to find "const BANK_NAME = { ... };"
        // We assume they start at the beginning of a line or after a newline, and end with "};" at the start of a line
        // using [\s\S]*? non-greedy match until the closing brace
        const regex = new RegExp(`const\\s+${bankName}\\s*=\\s*\\{([\\s\\S]*?)\\n\\};`, 'm');

        const match = content.match(regex);

        if (match) {
            console.log(`Found ${bankName}. Size: ${match[0].length} chars.`);

            const originalBody = match[1]; // The content inside the braces

            // Construct the lazy pattern
            // 1. Rename raw data to a function getter to delay parsing/allocation
            // 2. Create the Proxy

            const lazyImplementation = `
// LAZY LOAD REFACTOR FOR ${bankName}
let _CACHE_${bankName} = null;
function _LOAD_${bankName}_RAW() {
  return {${originalBody}
  };
}
const ${bankName} = new Proxy({}, {
  get: function(target, prop) {
    if (prop === 'raw_ref') return null; // Debug hook
    if (!_CACHE_${bankName}) {
      // console.log("Lazy loading ${bankName}...");
      _CACHE_${bankName} = _LOAD_${bankName}_RAW();
    }
    // Forward the access to the cached real object
    return _CACHE_${bankName}[prop];
  },
  // Essential for "if (key in BANK)" checks
  has: function(target, prop) {
    if (!_CACHE_${bankName}) _CACHE_${bankName} = _LOAD_${bankName}_RAW();
    return prop in _CACHE_${bankName};
  },
  // Essential for "Object.keys(BANK)" or loops
  ownKeys: function(target) {
    if (!_CACHE_${bankName}) _CACHE_${bankName} = _LOAD_${bankName}_RAW();
    return Reflect.ownKeys(_CACHE_${bankName});
  },
  getOwnPropertyDescriptor: function(target, prop) {
    if (!_CACHE_${bankName}) _CACHE_${bankName} = _LOAD_${bankName}_RAW();
    return Reflect.getOwnPropertyDescriptor(_CACHE_${bankName}, prop);
  }
});
`;
            // Replace the original definition with the lazy one
            content = content.replace(match[0], lazyImplementation.trim());
            console.log(`Replaced ${bankName} with lazy proxy.`);
        } else {
            console.warn(`WARNING: Could not find definition for ${bankName}`);
        }
    });

    if (content.length !== originalLength) {
        console.log(`Writing modified content to ${targetFile}...`);
        fs.writeFileSync(targetFile, content, 'utf8');
        console.log('Surgery complete.');
    } else {
        console.log('No changes made.');
    }
}

applyLazyLoading();
