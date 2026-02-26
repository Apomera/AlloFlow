const fs = require('fs');
const f = 'AlloFlowANTI.txt';
const lines = fs.readFileSync(f, 'utf8').split('\n');

// Find L27644-27646 area where the Research PDF button is missing </button>
// Look for: "📊 Research PDF" followed by empty line then ")}"
for (let i = 27630; i < 27660; i++) {
    if (lines[i] && lines[i].includes('Research PDF')) {
        console.log('Found at L' + (i + 1) + ': ' + lines[i].trim());
        // Check if next line is empty or just whitespace, followed by )}
        if (lines[i + 1] && lines[i + 1].trim() === '' && lines[i + 2] && lines[i + 2].trim().startsWith(')}')) {
            // Insert </button> after the Research PDF line
            const indent = lines[i].match(/^(\s*)/)[1];
            lines.splice(i + 1, 1, indent.substring(0, indent.length - 4) + '</button>');
            console.log('✅ Inserted </button> at L' + (i + 2));
        } else if (lines[i + 1] && lines[i + 1].trim() === '') {
            // The blank line needs to become </button>
            lines[i + 1] = '                    </button>';
            console.log('✅ Replaced blank line with </button> at L' + (i + 2));
        }
        break;
    }
}

fs.writeFileSync(f, lines.join('\n'), 'utf8');
console.log('Saved!');
