const fs = require('fs');
const c = fs.readFileSync('AlloFlowANTI.txt', 'utf8');
const lines = c.split('\n');
let issues = [];

console.log('📋 Math Probe Deep Audit\n');

// Check all mn/qd state references
const mnTerms = ['mnProbeActive', 'mnProbeProblems', 'mnProbeIndex', 'mnProbeAnswer', 'mnProbeResults', 'mnProbeTimer', 'mnProbeTimerRef', 'mnProbeInputRef'];
const qdTerms = ['qdProbeActive', 'qdProbeProblems', 'qdProbeIndex', 'qdProbeResults', 'qdProbeTimer', 'qdProbeTimerRef'];

console.log('=== MN Probe State Usage ===');
for (const t of mnTerms) {
    let refs = [];
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(t)) refs.push(i + 1);
    }
    console.log(t + ': ' + refs.length + ' refs (' + refs.join(', ') + ')');
    if (refs.length <= 2) issues.push('STATE DEAD: ' + t + ' only has ' + refs.length + ' refs (declared but barely used)');
}

console.log('\n=== QD Probe State Usage ===');
for (const t of qdTerms) {
    let refs = [];
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(t)) refs.push(i + 1);
    }
    console.log(t + ': ' + refs.length + ' refs (' + refs.join(', ') + ')');
    if (refs.length <= 2) issues.push('STATE DEAD: ' + t + ' only has ' + refs.length + ' refs (declared but barely used)');
}

// Check for fluencyBlocks, assessmentBlocks - the actual math probe system
console.log('\n=== fluencyBlocks / assessmentBlocks ===');
const altTerms = ['fluencyBlocks', 'assessmentBlocks', 'fluencyScore', 'fluencyTimer', 'fluencyActive', 'fluencyProbe', 'setFluencyActive', 'fluencyMode'];
for (const t of altTerms) {
    let count = 0;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(t)) {
            if (count < 3) console.log('  ' + t + ' L' + (i + 1) + ': ' + lines[i].trim().substring(0, 110));
            count++;
        }
    }
    if (count > 3) console.log('  ... (' + count + ' total)');
    if (count === 0) console.log('  ' + t + ': NOT FOUND');
}

// Check for NWF Probe mechanism  
console.log('\n=== NWF (Nonsense Word Fluency) ===');
const nwfTerms = ['nwfProbe', 'NWF', 'nwf', 'nonsenseWord', 'nonsense_word'];
for (const t of nwfTerms) {
    let count = 0;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(t)) {
            if (count < 3) console.log('  ' + t + ' L' + (i + 1) + ': ' + lines[i].trim().substring(0, 110));
            count++;
        }
    }
    if (count > 3) console.log('  ... (' + count + ' total)');
    if (count === 0) console.log('  ' + t + ': NOT FOUND');
}

// Check for timer expiry handling (what happens when timer=0)
console.log('\n=== Timer expiry auto-finish ===');
// The MN timer at L13640-13644 counts down and stops at 0 but does it auto-submit?
const timerExpiryCheck = c.includes('mnProbeTimer') && c.includes('submit') || c.includes('finish');
// Check if timer=0 triggers result calculation
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('mnProbeTimer') && (lines[i].includes('=== 0') || lines[i].includes('=== 0') || lines[i].includes('<= 0') || lines[i].includes('== 0'))) {
        console.log('  MN timer check L' + (i + 1) + ': ' + lines[i].trim().substring(0, 120));
    }
    if (lines[i].includes('qdProbeTimer') && (lines[i].includes('=== 0') || lines[i].includes('<= 0') || lines[i].includes('== 0'))) {
        console.log('  QD timer check L' + (i + 1) + ': ' + lines[i].trim().substring(0, 120));
    }
}

// Check for STEM lab tab guard during probes
console.log('\n=== STEM Lab tab switching ===');
for (let i = 73800; i < 74100; i++) {
    if (lines[i] && lines[i].includes('setStemLabTab') && lines[i].includes('onClick')) {
        console.log('  L' + (i + 1) + ': ' + lines[i].trim().substring(0, 120));
    }
}

// Check for probe completion/result recording
console.log('\n=== Probe result recording ===');
for (let i = 0; i < lines.length; i++) {
    if ((lines[i].includes('mnProbeResult') || lines[i].includes('qdProbeResult')) && !lines[i].includes('setState')) {
        console.log('  L' + (i + 1) + ': ' + lines[i].trim().substring(0, 120));
    }
}

// Also look for the fluency blocks system
console.log('\n=== Assessment Blocks / Fluency Config ===');
for (let i = 73900; i < 74100; i++) {
    if (lines[i] && (lines[i].includes('fluency') || lines[i].includes('assessment')) && lines[i].includes('Block')) {
        console.log('  L' + (i + 1) + ': ' + lines[i].trim().substring(0, 120));
    }
}

console.log('\n' + '='.repeat(60));
console.log('⚠️  Issues: ' + issues.length);
issues.forEach((iss, i) => console.log((i + 1) + '. ' + iss));
