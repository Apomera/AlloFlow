const fs=require('fs');process.stdout.write('data:image/jpeg;base64,'+fs.readFileSync(process.argv[2]).toString('base64'));
