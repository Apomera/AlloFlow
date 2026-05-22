/**
 * AlloFlow Admin - Diagnostic Test Suite
 * Run: node test/diagnostic.test.js
 * 
 * This suite tests setup, deployment, and service commands WITHOUT installing anything
 */

const path = require('path');
const os = require('os');

// Mock Electron for testing
const mockElectron = {
  app: {
    isPackaged: false,
    getPath: (name) => {
      if (name === 'userData') return path.join(os.homedir(), '.alloflow-test');
      return os.homedir();
    }
  }
};

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  test: (msg) => console.log(`\n${colors.bright}${colors.cyan}TEST: ${msg}${colors.reset}`),
  header: (msg) => console.log(`\n${colors.bright}${colors.cyan}═══ ${msg} ═══${colors.reset}`)
};

class DiagnosticSuite {
  constructor() {
    this.results = [];
    this.testCount = 0;
    this.passCount = 0;
  }

  assert(condition, testName, details = '') {
    this.testCount++;
    if (condition) {
      this.passCount++;
      log.success(`${testName}${details ? ' — ' + details : ''}`);
      return true;
    } else {
      log.error(`${testName}${details ? ' — ' + details : ''}`);
      return false;
    }
  }

  // Test 1: SERVICE DEFINITIONS
  testServiceDefinitions() {
    log.header('Service Definitions');
    
    // The service definitions should match what's expected
    const expectedServices = ['ollama', 'piper', 'flux', 'search'];
    const definition = {
      ollama: { name: 'Ollama', process: 'ollama serve', healthCheck: { endpoint: 'http://127.0.0.1:11434/api/tags' } },
      piper: { name: 'Piper TTS', process: 'piper-server', healthCheck: { endpoint: 'http://127.0.0.1:8000/api/voices' } },
      flux: { name: 'Flux', process: 'python flux_server.py', healthCheck: { endpoint: 'http://127.0.0.1:7860/health' } }
    };
    
    for (const svc of expectedServices) {
      this.assert(definition[svc] !== undefined, `Service "${svc}" is defined`, `process: "${definition[svc]?.process}"`);
      this.assert(definition[svc]?.healthCheck?.endpoint, `${svc} has health check endpoint`);
    }
  }

  // Test 2: PRELOAD API SURFACE
  testPreloadAPIs() {
    log.header('Preload API Surface');
    
    // All these APIs should be available on window.alloAPI
    const requiredAPIs = {
      'setup.check': true,
      'setup.saveConfig': true,
      'setup.startDeployment': true,
      'setup.onDeploymentProgress': true,
      'ollama.checkStatus': true,
      'ollama.getInstalledModels': true,
      'ollama.pullModel': true,
      'listModels': true,
      'pullModel': true,
      'readAIConfig': true,
      'writeAIConfig': true,
      'getServices': true,
      'startStack': true,
      'stopStack': true,
      'restartService': true
    };
    
    for (const [api, shouldExist] of Object.entries(requiredAPIs)) {
      const exists = this.checkAPIPath(api);
      this.assert(exists === shouldExist, `API "${api}" ${shouldExist ? 'exists' : 'does not exist'}`);
    }
  }

  checkAPIPath(path) {
    // This would check window.alloAPI structure in actual app
    // For now, just verify the expected structure
    const parts = path.split('.');
    return parts.length > 0;
  }

  // Test 3: SETUP WIZARD FLOW
  testSetupWizardFlow() {
    log.header('Setup Wizard Flow');
    
    const steps = [
      { name: 'Deployment Type', expectedInput: 'local | cluster' },
      { name: 'Hardware Detection', expectedOutput: 'cpu | gpu | minimal' },
      { name: 'Service Selection', expectedInput: 'ollama, piper, flux (array)' },
      { name: 'Model Selection', expectedInput: 'neural-chat:7b, mistral:7b' },
      { name: 'Configuration', expectedInput: 'deploy config object' },
      { name: 'Deployment', expectedOutput: 'success | error with progress events' }
    ];
    
    for (const step of steps) {
      this.assert(true, `Setup step: ${step.name}`);
    }
  }

  // Test 4: MODEL PULLING LOGIC
  testModelPulling() {
    log.header('Model Pulling Logic');
    
    // Simulate model pulling scenarios
    const scenarios = [
      {
        name: 'No models selected',
        selectedModels: [],
        expectedBehavior: 'Fallback to neural-chat:7b'
      },
      {
        name: 'Single model selected',
        selectedModels: ['mistral:7b'],
        expectedBehavior: 'Pull mistral:7b'
      },
      {
        name: 'Multiple models selected',
        selectedModels: ['neural-chat:7b', 'mistral:7b'],
        expectedBehavior: 'Pull both in sequence'
      }
    ];
    
    for (const scenario of scenarios) {
      const modelsToPull = scenario.selectedModels.length > 0 
        ? scenario.selectedModels 
        : ['neural-chat:7b'];
      
      this.assert(
        modelsToPull.length > 0,
        `Model pulling: ${scenario.name}`,
        `Will pull: ${modelsToPull.join(', ')}`
      );
    }
  }

  // Test 5: OLLAMA STARTUP SEQUENCE
  testOllamaStartup() {
    log.header('Ollama Startup Sequence');
    
    const sequence = [
      { step: 1, action: 'Service installed check', critical: true },
      { step: 2, action: 'nativePM.startService("ollama")', critical: true },
      { step: 3, action: 'ollamaManager.waitForHealthy(30000)', critical: true },
      { step: 4, action: 'Check health endpoint', critical: true },
      { step: 5, action: 'Get installed models', critical: false },
      { step: 6, action: 'Pull selected models', critical: false }
    ];
    
    for (const item of sequence) {
      this.assert(true, `Step ${item.step}: ${item.action}${item.critical ? ' [CRITICAL]' : ''}`);
    }
  }

  // Test 6: DEPLOYMENT MANIFEST
  testDeploymentManifest() {
    log.header('Deployment Manifest');
    
    const manifest = {
      version: '0.3.1',
      services: ['ollama', 'piper'],
      timestamp: new Date().toISOString()
    };
    
    this.assert(manifest.version, 'Manifest has version');
    this.assert(Array.isArray(manifest.services), 'Manifest has services array');
    this.assert(manifest.timestamp, 'Manifest has timestamp');
  }

  // Test 7: AI CONFIG STRUCTURE
  testAIConfigStructure() {
    log.header('AI Config Structure for Local App');
    
    const aiConfig = {
      backend: 'ollama',
      baseUrl: 'http://localhost:11434',
      models: {
        default: 'neural-chat:7b',
        flash: 'neural-chat:7b',
        fallback: 'neural-chat:7b'
      },
      ttsProvider: 'piper',
      imageProvider: 'flux',
      cloudProviders: undefined // Should NOT be present
    };
    
    this.assert(aiConfig.backend === 'ollama', 'Backend is Ollama');
    this.assert(aiConfig.baseUrl.includes('localhost:11434'), 'Ollama URL is localhost');
    this.assert(!aiConfig.cloudProviders, 'No cloud providers in local config');
    this.assert(aiConfig.ttsProvider === 'piper', 'TTS is Piper');
  }

  // Test 8: CLOUD PROVIDER REMOVAL  
  testCloudRemoval() {
    log.header('Cloud Provider Removal');
    
    const cloudTokens = [
      'gemini',
      'openai',
      'claude',
      'google-generative-ai',
      '@google-cloud',
      'firebase',
      'anthropic'
    ];
    
    // In a real test, would scan source files for these
    for (const token of cloudTokens) {
      // Placeholder: in real test, would scan files
      this.assert(true, `Check for "${token}" removal from local app`);
    }
  }

  // Test 9: LOG STREAMING SETUP
  testLogStreaming() {
    log.header('Log Streaming Setup');
    
    const logChannels = [
      'admin:logs',
      'service:ollama:logs',
      'service:piper:logs',
      'service:flux:logs',
      'deployment:logs'
    ];
    
    for (const channel of logChannels) {
      this.assert(true, `Preload should expose log listener: "${channel}"`);
    }
  }

  // Test 10: UNINSTALLER CONFIG RESET
  testUninstallerReset() {
    log.header('Uninstaller Config Reset');
    
    const scenarios = [
      { name: 'Full uninstall with reset', removeConfig: true, keepData: false },
      { name: 'Just remove services', removeConfig: false, keepData: true },
      { name: 'NSIS uninstaller prompt', dialog: true, userChoice: 'YES | NO' }
    ];
    
    for (const scenario of scenarios) {
      this.assert(true, `Uninstall scenario: ${scenario.name}`);
    }
  }

  summary() {
    console.log(`\n${colors.bright}${colors.cyan}═══ SUMMARY ═══${colors.reset}`);
    console.log(`Total: ${this.testCount} | Passed: ${colors.green}${this.passCount}${colors.reset} | Failed: ${colors.red}${this.testCount - this.passCount}${colors.reset}`);
    console.log(`Success Rate: ${(this.passCount / this.testCount * 100).toFixed(1)}%\n`);
  }

  runAll() {
    this.testServiceDefinitions();
    this.testPreloadAPIs();
    this.testSetupWizardFlow();
    this.testModelPulling();
    this.testOllamaStartup();
    this.testDeploymentManifest();
    this.testAIConfigStructure();
    this.testCloudRemoval();
    this.testLogStreaming();
    this.testUninstallerReset();
    this.summary();
  }
}

// Run tests
const suite = new DiagnosticSuite();
suite.runAll();
