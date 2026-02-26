const fs = require('fs');
const f = 'c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt';
const content = fs.readFileSync(f, 'utf8');
const lines = content.split('\n');

// 1. Find the student table header (before the <tbody>) - for filter pills
console.log('=== TD Table Area ===');
for (let i = 27890; i < 27920; i++) {
    if (lines[i] && (lines[i].includes('header_nickname') || lines[i].includes('<thead') || lines[i].includes('grid-cols-1 md:grid-cols-3'))) {
        console.log('L' + (i + 1) + ': ' + lines[i].trim().substring(0, 100));
    }
}

// 2. Find AssessmentCenter component to check if t is available
console.log('\n=== AssessmentCenter ===');
const acIdx = content.indexOf('const AssessmentCenter');
if (acIdx > -1) {
    const l = content.substring(0, acIdx).split('\n').length;
    console.log('AssessmentCenter at L' + l);
    for (let i = l - 1; i < l + 5; i++) {
        console.log('L' + (i + 1) + ': ' + lines[i].substring(0, 120));
    }
}

// 3. Find Volume Explorer challenge generation
console.log('\n=== Volume Explorer Challenge ===');
for (let i = 74000; i < 74120; i++) {
    if (lines[i] && (lines[i].includes('cubeChallenge') || lines[i].includes('setCubeChallenge'))) {
        console.log('L' + (i + 1) + ': ' + lines[i].trim().substring(0, 120));
    }
}

// 4. Check if TD already has a filter state
const filterState = content.indexOf('studentFilter');
if (filterState > -1) {
    console.log('\n=== Existing filter state ===');
    const l = content.substring(0, filterState).split('\n').length;
    console.log('studentFilter at L' + l + ': ' + lines[l - 1].trim());
}

// 5. Find the stats cards area (to insert filter pills after)
console.log('\n=== Stats Cards ===');
for (let i = 27890; i < 27910; i++) {
    console.log('L' + (i + 1) + ': ' + lines[i].trim().substring(0, 100));
}
