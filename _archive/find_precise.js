const fs = require('fs');
const f = 'c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt';
const content = fs.readFileSync(f, 'utf8');
const lines = content.split('\n');

// Find TD stats cards closing (grid-cols-1 md:grid-cols-3)
const gridIdx = content.indexOf("grid-cols-1 md:grid-cols-3", content.indexOf("const TeacherDashboard"));
if (gridIdx > -1) {
    const l = content.substring(0, gridIdx).split('\n').length;
    console.log('Stats grid at L' + l);
    // Find closing </div> of stats grid
    const closeGrid = content.indexOf('</div>', content.indexOf('</div>', content.indexOf('</div>', gridIdx + 100) + 1) + 1);
    const cl = content.substring(0, closeGrid).split('\n').length;
    console.log('Stats grid closing area L' + cl);
    for (let i = cl - 2; i < cl + 5; i++) {
        console.log('L' + (i + 1) + ': ' + lines[i].trim().substring(0, 100));
    }
}

// Find table header
const thead = content.indexOf('header_nickname', content.indexOf("const TeacherDashboard"));
if (thead > -1) {
    const l = content.substring(0, thead).split('\n').length;
    console.log('\nTable header at L' + l);
}

// Find AssessmentCenter 
const acSearch = content.indexOf('AssessmentCenter');
if (acSearch > -1) {
    const l = content.substring(0, acSearch).split('\n').length;
    console.log('\nFirst AssessmentCenter ref at L' + l + ': ' + lines[l - 1].trim().substring(0, 80));
    // Find the component definition
    const acDef = content.indexOf('const AssessmentCenter');
    if (acDef > -1) {
        const l2 = content.substring(0, acDef).split('\n').length;
        console.log('AC definition at L' + l2 + ': ' + lines[l2 - 1].trim().substring(0, 100));
    }
}

// Find where AC is rendered with its props
const acRender = content.indexOf('<AssessmentCenter');
if (acRender > -1) {
    const l = content.substring(0, acRender).split('\n').length;
    console.log('\nAC rendered at L' + l);
    for (let i = l - 1; i < l + 5; i++) {
        console.log('L' + (i + 1) + ': ' + lines[i].trim().substring(0, 120));
    }
}

// Volume cube challenge generation
console.log('\n=== Volume Cube Challenge ===');
const cubeGen = content.indexOf('setCubeChallenge({');
if (cubeGen > -1) {
    const l = content.substring(0, cubeGen).split('\n').length;
    console.log('setCubeChallenge at L' + l);
    for (let i = l - 3; i < l + 10; i++) {
        console.log('L' + (i + 1) + ': ' + lines[i].trim().substring(0, 120));
    }
}
