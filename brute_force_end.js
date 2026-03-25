const fs = require('fs');
const acorn = require('acorn');

const target = 'stem_lab/stem_lab_module.js';
const content = fs.readFileSync(target, 'utf8');

// The file currently has:
//         })()
//       ));
//     };
//   }
// })();
// Because of my replace_file_content in Step 653.

// Let's find `_pluginFallback` and replace everything after it.
const fallbackIdx = content.lastIndexOf('_pluginFallback');
const startCut = content.indexOf('})()', fallbackIdx);

const baseContent = content.substring(0, startCut);

const trials = [
    '})(),\n      )));\n    };\n  }\n})();',
    '})(),\n      ));\n    };\n  }\n})();',
    '})(),\n      );\n    };\n  }\n})();',
    '})(),\n      ;\n    };\n  }\n})();',
    '})()\n      )));\n    };\n  }\n})();',
    '})()\n      ));\n    };\n  }\n})();',
    '})()\n      );\n    };\n  }\n})();',
    '})()\n      ;\n    };\n  }\n})();',
];

let found = false;
for (const trial of trials) {
    const testContent = baseContent + trial;
    try {
        acorn.parse(testContent, { ecmaVersion: 2020 });
        console.log("SUCCESS WITH:\n" + trial);
        fs.writeFileSync(target, testContent, 'utf8');
        found = true;
        break;
    } catch (e) {
        console.log("Failed: " + trial.replace(/\n/g, '\\n') + " -> " + e.message);
    }
}

if (!found) {
    console.log("All combinations failed!");
}
