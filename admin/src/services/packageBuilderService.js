/**
 * AlloFlow Client Package Builder Service
 * Builds custom AlloFlow client packages for students and teachers
 * 
 * Features:
 * - Role-based builds (student vs teacher)
 * - Custom server URL embedding
 * - Kiosk mode support
 * - Progress tracking
 * - Windows (.exe) and macOS (.dmg) builds
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

class ClientPackageBuilder {
  constructor(clientDir = './client', adminDir = './admin') {
    this.clientDir = clientDir;
    this.adminDir = adminDir;
    this.buildInProgress = false;
    this.lastBuildLog = [];
  }

  /**
   * Build a client package with custom configuration
   */
  async buildClientPackage(options = {}) {
    if (this.buildInProgress) {
      throw new Error('Build already in progress');
    }

    const {
      role = 'student', // 'student' or 'teacher'
      serverUrl = 'http://localhost:8090',
      kioskMode = false,
      platform = process.platform === 'win32' ? 'win' : 'mac', // 'win' or 'mac'
      onProgress = null,
    } = options;

    this.buildInProgress = true;
    this.lastBuildLog = [];

    try {
      this._log(`Starting build: role=${role}, platform=${platform}, kiosk=${kioskMode}`);

      // Validate inputs
      if (!['student', 'teacher'].includes(role)) {
        throw new Error('Invalid role. Must be "student" or "teacher"');
      }

      if (!['win', 'mac'].includes(platform)) {
        throw new Error('Invalid platform. Must be "win" or "mac"');
      }

      // Step 1: Prepare environment
      this._log('Step 1: Preparing environment...');
      this._prepareEnvironment(role, serverUrl, kioskMode);
      this._progress(20, onProgress, 'Environment prepared');

      // Step 2: Install dependencies
      this._log('Step 2: Installing dependencies...');
      this._installDependencies();
      this._progress(40, onProgress, 'Dependencies installed');

      // Step 3: Build React app
      this._log('Step 3: Building React application...');
      this._buildReactApp();
      this._progress(60, onProgress, 'React app built');

      // Step 4: Build Electron package
      this._log(`Step 4: Building ${platform.toUpperCase()} installer...`);
      const packagePath = this._buildElectronPackage(role, platform);
      this._progress(90, onProgress, 'Electron package built');

      this._log(`Build completed successfully: ${packagePath}`);
      this._progress(100, onProgress, 'Build complete');

      return {
        success: true,
        packagePath,
        role,
        platform,
        kioskMode,
        serverUrl,
        fileName: path.basename(packagePath),
        size: this._getFileSizeKB(packagePath),
        buildLog: this.lastBuildLog
      };
    } catch (error) {
      this._log(`Build failed: ${error.message}`);
      throw error;
    } finally {
      this.buildInProgress = false;
    }
  }

  /**
   * Calculate build progress
   */
  _progress(percent, callback, message) {
    if (callback) {
      callback({ progress: percent, message });
    }
  }

  /**
   * Prepare environment with configuration
   */
  _prepareEnvironment(role, serverUrl, kioskMode) {
    // Create .env file in client directory
    const envContent = `
REACT_APP_ROLE=${role}
REACT_APP_SERVER_URL=${serverUrl}
REACT_APP_KIOSK_MODE=${kioskMode}
PUBLIC_URL=./
`.trim();

    const envPath = path.join(this.clientDir, '.env');
    fs.writeFileSync(envPath, envContent);
    this._log(`Created .env file: ${envPath}`);

    // Update electron-builder.yml with role
    const builderYmlPath = path.join(this.clientDir, 'electron-builder.yml');
    let builderYml = fs.readFileSync(builderYmlPath, 'utf8');
    builderYml = builderYml.replace(
      /role: \$\{ROLE:-student\}/,
      `role: ${role}`
    );
    fs.writeFileSync(builderYmlPath, builderYml);
    this._log('Updated electron-builder.yml');
  }

  /**
   * Install npm dependencies
   */
  _installDependencies() {
    try {
      this._executeCommand(
        'npm install --omit=dev',
        this.clientDir,
        'npm dependencies installed'
      );
    } catch (error) {
      if (error.message.includes('already satisfied')) {
        this._log('npm dependencies already up to date');
      } else {
        throw error;
      }
    }
  }

  /**
   * Build React app for production
   */
  _buildReactApp() {
    this._executeCommand(
      'npm run react-build',
      this.clientDir,
      'React app built successfully'
    );

    // Verify build output
    const buildDir = path.join(this.clientDir, 'build');
    if (!fs.existsSync(buildDir)) {
      throw new Error('React build output not found');
    }
    this._log(`Build directory verified: ${buildDir}`);
  }

  /**
   * Build Electron package
   */
  _buildElectronPackage(role, platform) {
    const command = platform === 'win' ? 'npm run build:win' : 'npm run build:mac';
    
    this._executeCommand(
      command,
      this.clientDir,
      `${platform.toUpperCase()} package built`
    );

    // Find built package
    const distDir = path.join(this.clientDir, 'dist');
    let packageFile = null;

    if (platform === 'win') {
      // Look for .exe file
      const files = fs.readdirSync(distDir);
      packageFile = files.find(f => f.endsWith('.exe'));
    } else {
      // Look for .dmg file
      const files = fs.readdirSync(distDir);
      packageFile = files.find(f => f.endsWith('.dmg'));
    }

    if (!packageFile) {
      throw new Error(`Could not find ${platform.toUpperCase()} package after build`);
    }

    return path.join(distDir, packageFile);
  }

  /**
   * Execute command with logging
   */
  _executeCommand(command, cwd, successMessage) {
    this._log(`Executing: ${command}`);
    try {
      const output = execSync(command, {
        cwd,
        stdio: 'pipe',
        encoding: 'utf8'
      });
      this._log(output);
      this._log(successMessage);
      return output;
    } catch (error) {
      this._log(`Command error: ${error.message}`);
      this._log(error.stdout || '');
      this._log(error.stderr || '');
      throw new Error(`Build failed: ${error.message}`);
    }
  }

  /**
   * Log message
   */
  _log(message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    console.log(logEntry);
    this.lastBuildLog.push(logEntry);
  }

  /**
   * Get file size in KB
   */
  _getFileSizeKB(filePath) {
    try {
      const stats = fs.statSync(filePath);
      return Math.round(stats.size / 1024);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get list of available builds
   */
  getAvailableBuilds() {
    const distDir = path.join(this.clientDir, 'dist');
    
    if (!fs.existsSync(distDir)) {
      return { student: [], teacher: [] };
    }

    const files = fs.readdirSync(distDir);
    const builds = {
      student: [],
      teacher: []
    };

    files.forEach(file => {
      if (file.endsWith('.exe') || file.endsWith('.dmg')) {
        const filePath = path.join(distDir, file);
        const stats = fs.statSync(filePath);
        
        // Guess role from filename (may need to be more robust)
        const role = file.includes('Student') ? 'student' : 'teacher';
        
        builds[role].push({
          name: file,
          path: filePath,
          size: Math.round(stats.size / 1024),
          created: new Date(stats.mtimeMs),
          platform: file.endsWith('.exe') ? 'win' : 'mac'
        });
      }
    });

    return builds;
  }

  /**
   * Clean build artifacts
   */
  cleanBuilds() {
    try {
      const distDir = path.join(this.clientDir, 'dist');
      if (fs.existsSync(distDir)) {
        fs.rmSync(distDir, { recursive: true, force: true });
        this._log('Cleaned dist directory');
      }

      const buildDir = path.join(this.clientDir, 'build');
      if (fs.existsSync(buildDir)) {
        fs.rmSync(buildDir, { recursive: true, force: true });
        this._log('Cleaned build directory');
      }

      return { success: true };
    } catch (error) {
      this._log(`Clean failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get build progress (for polling)
   */
  isBuildInProgress() {
    return this.buildInProgress;
  }

  /**
   * Get last build log
   */
  getBuildLog() {
    return this.lastBuildLog;
  }
}

module.exports = ClientPackageBuilder;
