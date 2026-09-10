'use strict';
const fs = require('node:fs');
const checker = 'dev-tools/document_export_at_acceptance.cjs';
let source = fs.readFileSync(checker, 'utf8');
source = source.replace('          const urls = /url', `          // Function-looking text inside a CSS string (for example content)
          // is literal text, not a resource reference.
          const strings = [];
          for (let index = 0; index < value.length; index++) {
            if (value[index] !== '"' && value[index] !== "'") continue;
            const start = index, quote = value[index++];
            while (index < value.length && value[index] !== quote) {
              if (value[index] === '\\\\') index++;
              index++;
            }
            strings.push([start, index]);
          }
          const quoted = index => strings.some(([start, end]) => start <= index && index <= end);
          const urls = /url`);
source = source.replace('for (const match of value.matchAll(urls)) addCssReference', 'for (const match of value.matchAll(urls)) if (!quoted(match.index)) addCssReference');
source = source.replace(')) addCssReference(match[1] ?? match[2]);', ')) if (!quoted(match.index)) addCssReference(match[1] ?? match[2]);');
fs.writeFileSync(checker, source);
const test = 'tests/e2e/document_export_review_fixes.spec.ts';
source = fs.readFileSync(test, 'utf8');
source = source.replace("test('embedded CSS images, local filters, and URL comments remain self-contained'", "test('embedded CSS images, local filters, and literal URL text remain self-contained'");
source = source.replace("filter:url(#local); }</style>'", "filter:url(#local); } p::before { content:\\'url(required.png) image-set(ignored.png)\\'; }</style>'");
fs.writeFileSync(test, source);
