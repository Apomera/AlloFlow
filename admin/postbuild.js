#!/usr/bin/env node

/**
 * Post-build script: Embed admin manifest into Windows installer executable
 * This adds the requireAdministrator UAC level to the .exe
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Post-build: Embedding admin manifest into installer...\n');

const installerPath = path.join(__dirname, 'dist', 'AlloFlow Admin Setup 0.2.0.exe');
const manifestPath = path.join(__dirname, 'assets', 'installer.exe.manifest');

if (!fs.existsSync(installerPath)) {
  console.log('✓ Installer not yet ready (expected during early stages)');
  process.exit(0);
}

if (!fs.existsSync(manifestPath)) {
  console.log('✗ Manifest file not found:', manifestPath);
  process.exit(0);
}

try {
  // Use mt.exe (Manifest Tool) to embed the manifest into the .exe
  // This is the official Windows way to add UAC requirements
  const mtExePath = process.env.MT_PATH || 'mt.exe';
  
  console.log('Attempting to use Windows Manifest Tool (mt.exe)...');
  console.log('Target:', installerPath);
  console.log('Manifest:', manifestPath);
  
  try {
    // First try to extract existing manifest
    const extractCmd = `"${mtExePath}" -inputresource:"${installerPath}" -out:temp-manifest.xml`;
    console.log('Extracting existing manifest...');
    execSync(extractCmd, { stdio: 'pipe' });
  } catch (e) {
    console.log('No existing manifest found (normal for NSIS installers)');
  }
  
  // Embed the manifest
  const embedCmd = `"${mtExePath}" -manifest "${manifestPath}" -outputresource:"${installerPath}";1`;
  console.log('Embedding admin manifest...');
  execSync(embedCmd, { encoding: 'utf-8' });
  
  console.log('✓ Admin manifest successfully embedded into installer');
  console.log('✓ Installer will now request administrator privileges\n');
  
} catch (error) {
  console.log('⚠ Note: Manifest embedding requires Windows SDK Manifest Tool (mt.exe)');
  console.log('  The installer still has RequestExecutionLevel admin in NSIS configuration');
  console.log('  If UAC is not prompting, please install Windows SDK or run as administrator\n');
}

// Clean up
try {
  if (fs.existsSync('temp-manifest.xml')) {
    fs.unlinkSync('temp-manifest.xml');
  }
} catch (e) {}

process.exit(0);


