process.stdout.write('data:image/png;base64,'+require('fs').readFileSync(process.argv[2]).toString('base64'));
