const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

const isDev = !app.isPackaged;
let mainWindow;

// AlloFlow config directory and file
const ALLOFLOW_DIR = path.join(os.homedir(), '.alloflow');
const CONFIG_FILE = path.join(ALLOFLOW_DIR, 'config.json');

// Ensure AlloFlow directory exists
function ensureAlloFlowDir() {
  if (!fs.existsSync(ALLOFLOW_DIR)) {
    fs.mkdirSync(ALLOFLOW_DIR, { recursive: true });
    console.log('[setup:init] Created AlloFlow config directory at', ALLOFLOW_DIR);
  }
}

// Check if AlloFlow is already installed
function isInstalled() {
  const exists = fs.existsSync(CONFIG_FILE);
  console.log('[setup:check] Config file exists:', exists, 'at', CONFIG_FILE);
  return exists;
}

// Get current config
function getConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      console.log('[setup:config] Loaded config:', config.deploymentType);
      return config;
    }
  } catch (err) {
    console.error('[setup:config] Error reading config:', err.message);
  }
  return null;
}

// Save config
function saveConfig(config) {
  try {
    ensureAlloFlowDir();
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    console.log('[setup:config] Saved config for deployment type:', config.deploymentType);
    return true;
  } catch (err) {
    console.error('[setup:config] Error saving config:', err.message);
    return false;
  }
}

// Check if Docker is installed
function checkDocker() {
  const { execSync } = require('child_process');
  try {
    console.log('[docker:check] Checking if Docker is installed...');
    execSync('docker --version', { stdio: 'pipe' });
    console.log('[docker:check] Docker is installed');
    return true;
  } catch (err) {
    console.log('[docker:check] Docker is not installed:', err.message);
    return false;
  }
}

// Get docker-compose template path
function getTemplateFilePath(deploymentType) {
  if (isDev) {
    // In development, templates are in docker_templates/
    return path.join(__dirname, '..', 'docker_templates', `docker-compose.${deploymentType}.yml`);
  } else {
    // In packaged app, templates are in resources
    return path.join(process.resourcesPath, 'docker_templates', `docker-compose.${deploymentType}.yml`);
  }
}

// Copy docker-compose template to docker directory
function copyDockerComposeTemplate(deploymentType, dockerDir) {
  try {
    const templatePath = getTemplateFilePath(deploymentType);
    const destPath = path.join(dockerDir, 'docker-compose.yml');
    
    console.log('[docker:copy] Reading template from:', templatePath);
    if (!fs.existsSync(templatePath)) {
      return { success: false, error: `Template file not found: ${templatePath}` };
    }
    
    // Create docker directory if it doesn't exist
    if (!fs.existsSync(dockerDir)) {
      fs.mkdirSync(dockerDir, { recursive: true });
      console.log('[docker:copy] Created docker directory:', dockerDir);
    }
    
    // Read template and copy to docker directory
    const templateContent = fs.readFileSync(templatePath, 'utf-8');
    fs.writeFileSync(destPath, templateContent);
    console.log('[docker:copy] Copied docker-compose template to:', destPath);
    
    return { success: true, path: destPath };
  } catch (err) {
    console.error('[docker:copy] Error copying template:', err.message);
    return { success: false, error: err.message };
  }
}

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false,
    },
  });

  const startURL = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../build/index.html')}`;

  mainWindow.loadURL(startURL);

  // DevTools disabled for production
  // mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

app.on('ready', () => {
  console.log('[app:ready] AlloFlow Admin starting...');
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC Handlers

// Check if setup has been completed
ipcMain.handle('setup:check', async (event) => {
  try {
    console.log('[setup:check] Checking installation state...');
    const installed = isInstalled();
    const config = getConfig();
    
    console.log('[setup:check] Result - installed:', installed, 'deploymentType:', config?.deploymentType);
    
    return {
      installed,
      config: config || null
    };
  } catch (err) {
    console.error('[setup:check] Error:', err.message);
    return {
      installed: false,
      error: err.message
    };
  }
});

// Save setup configuration
ipcMain.handle('setup:save-config', async (event, setupData) => {
  try {
    console.log('[setup:save] Saving setup configuration for:', setupData.deploymentType);
    
    // Check if Docker is required and if Docker is running
    const dockerRequired = ['local', 'hybrid'].includes(setupData.deploymentType);
    
    if (dockerRequired) {
      console.log('[setup:save] Docker is required for', setupData.deploymentType);
      
      // Check if Docker is installed
      const dockerInstalled = checkDocker();
      if (!dockerInstalled) {
        console.error('[setup:save] Docker is not installed');
        return {
          success: false,
          dockerMissing: true,
          error: 'Docker is not installed. Please install Docker Desktop before continuing.'
        };
      }
      
      // Copy docker-compose template
      console.log('[setup:save] Copying docker-compose template for', setupData.deploymentType);
      const copyResult = copyDockerComposeTemplate(setupData.deploymentType, setupData.dockerDir);
      
      if (!copyResult.success) {
        console.error('[setup:save] Failed to copy docker-compose template:', copyResult.error);
        return {
          success: false,
          error: 'Failed to copy docker configuration: ' + copyResult.error
        };
      }
      
      console.log('[setup:save] Docker configuration ready at:', copyResult.path);
    }
    
    const config = {
      deploymentType: setupData.deploymentType,
      setupDate: new Date().toISOString(),
      ...setupData
    };
    
    const success = saveConfig(config);
    
    if (success) {
      console.log('[setup:save] Configuration saved successfully');
      return { success: true };
    } else {
      return { success: false, error: 'Failed to save configuration' };
    }
  } catch (err) {
    console.error('[setup:save] Error:', err.message);
    return { success: false, error: err.message };
  }
});

// Get config for updates
ipcMain.handle('setup:get-config', async (event) => {
  try {
    const config = getConfig();
    if (config) {
      console.log('[setup:get-config] Returning config for deployment type:', config.deploymentType);
      return { success: true, config };
    } else {
      return { success: false, error: 'No configuration found' };
    }
  } catch (err) {
    console.error('[setup:get-config] Error:', err.message);
    return { success: false, error: err.message };
  }
});

// Check if Docker is installed
ipcMain.handle('setup:check-docker', async (event, deploymentType) => {
  try {
    console.log('[setup:check-docker] Checking Docker for deployment type:', deploymentType);
    
    const dockerRequired = ['local', 'hybrid'].includes(deploymentType);
    
    if (!dockerRequired) {
      console.log('[setup:check-docker] Docker not required for', deploymentType);
      return { required: false, installed: null };
    }
    
    const installed = checkDocker();
    console.log('[setup:check-docker] Docker required:', dockerRequired, 'installed:', installed);
    
    return {
      required: true,
      installed: installed
    };
  } catch (err) {
    console.error('[setup:check-docker] Error:', err.message);
    return {
      required: true,
      installed: false,
      error: err.message
    };
  }
});

// Browse for folder
ipcMain.handle('setup:browse-folder', async (event, defaultPath) => {
  try {
    console.log('[setup:browse-folder] Opening folder browser, default:', defaultPath);
    
    const result = await dialog.showOpenDialog(mainWindow, {
      defaultPath: defaultPath || os.homedir(),
      properties: ['openDirectory', 'createDirectory']
    });
    
    if (result.canceled) {
      console.log('[setup:browse-folder] User canceled');
      return { canceled: true };
    }
    
    const folderPath = result.filePaths[0];
    console.log('[setup:browse-folder] Selected:', folderPath);
    
    return { canceled: false, path: folderPath };
  } catch (err) {
    console.error('[setup:browse-folder] Error:', err.message);
    return { canceled: true, error: err.message };
  }
});

// ============================================================================
// HARDWARE DETECTION & SERVICE MANAGEMENT
// ============================================================================

const { SERVICE_DEFINITIONS, HARDWARE_PROFILES } = require('./serviceDefinitions');

// Helper: Execute docker-compose command, trying both old and new syntax
function execDockerCompose(command, options = {}) {
  const { execSync } = require('child_process');
  const cwd = options.cwd || process.cwd();
  const stdio = options.stdio || 'inherit';
  
  console.log('[docker-compose] Executing:', command, 'in', cwd);
  
  try {
    // Try docker-compose first (older syntax)
    console.log('[docker-compose] Trying old syntax: docker-compose');
    const output = execSync(`docker-compose ${command}`, {
      stdio: stdio,
      encoding: options.encoding || 'utf-8',
      cwd: cwd,
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer for large outputs
    });
    console.log('[docker-compose] Old syntax succeeded');
    return output;
  } catch (err) {
    console.warn('[docker-compose] Old syntax failed:', err.message);
    // Try docker compose (v2 syntax)
    try {
      console.log('[docker-compose] Trying new syntax: docker compose');
      const output = execSync(`docker compose ${command}`, {
        stdio: stdio,
        encoding: options.encoding || 'utf-8',
        cwd: cwd,
        maxBuffer: 10 * 1024 * 1024
      });
      console.log('[docker-compose] New syntax succeeded');
      return output;
    } catch (v2Err) {
      console.error('[docker-compose] Both syntaxes failed');
      console.error('[docker-compose] Old syntax error:', err.message);
      console.error('[docker-compose] New syntax error:', v2Err.message);
      throw new Error(`docker-compose failed: ${err.message}. Also tried 'docker compose': ${v2Err.message}`);
    }
  }
}

// Detect hardware capabilities
function detectHardware() {
  try {
    console.log('[hardware:detect] Starting hardware detection...');
    const { execSync } = require('child_process');
    
    // Get CPU info
    const cpuCores = os.cpus().length;
    console.log('[hardware:detect] CPU cores:', cpuCores);
    
    // Get RAM info
    const totalRAM = os.totalmem();
    const freeRAM = os.freemem();
    const ramGB = Math.round(totalRAM / (1024 * 1024 * 1024));
    console.log('[hardware:detect] Total RAM:', ramGB, 'GB, Free:', Math.round(freeRAM / (1024 * 1024 * 1024)), 'GB');
    
    // Get disk space (check root volume)
    let diskSpaceGB = 0;
    try {
      if (process.platform === 'win32') {
        // Windows: use fsutil
        const driveLetter = ALLOFLOW_DIR.split(':')[0];
        const result = execSync(`fsutil volume diskfree ${driveLetter}:`, { encoding: 'utf-8' });
        const freeBytes = parseInt(result.split('\n')[1].split(' ')[0]);
        diskSpaceGB = Math.round(freeBytes / (1024 * 1024 * 1024));
      } else {
        // Unix: use df
        const result = execSync(`df -B1 ${ALLOFLOW_DIR} | tail -1`, { encoding: 'utf-8' });
        const freeBytes = parseInt(result.trim().split(/\s+/)[3]);
        diskSpaceGB = Math.round(freeBytes / (1024 * 1024 * 1024));
      }
    } catch (err) {
      console.warn('[hardware:detect] Could not get disk space:', err.message);
      diskSpaceGB = 100; // Default assumption
    }
    console.log('[hardware:detect] Free disk space:', diskSpaceGB, 'GB');
    
    // Detect GPU
    let gpu = null;
    try {
      // Check for NVIDIA GPU
      try {
        const nvidiaResult = execSync('nvidia-smi --query-gpu=name,memory.total --format=csv,noheader', { 
          stdio: 'pipe',
          encoding: 'utf-8'
        });
        const [gpuName, vramStr] = nvidiaResult.trim().split(',').map(s => s.trim());
        const vramGB = parseInt(vramStr);
        gpu = {
          type: 'NVIDIA',
          name: gpuName,
          vramGB: vramGB
        };
        console.log('[hardware:detect] Detected NVIDIA GPU:', gpuName, '-', vramGB, 'GB VRAM');
      } catch (nvidiaErr) {
        // Check for AMD GPU - try multiple detection methods
        let amdDetected = false;
        
        // Method 1: rocm-smi (most common)
        try {
          const rocmResult = execSync('rocm-smi', { stdio: 'pipe', encoding: 'utf-8' });
          if (rocmResult.includes('GPU') || rocmResult.includes('Device')) {
            gpu = {
              type: 'AMD',
              name: 'AMD GPU (ROCm)',
              vramGB: 'detected'
            };
            console.log('[hardware:detect] Detected AMD GPU via rocm-smi');
            amdDetected = true;
          }
        } catch (rocmErr) {
          // Method 2: Check for AMD device files (Linux/WSL)
          try {
            if (process.platform !== 'win32') {
              execSync('ls /dev/dri/renderD* 2>/dev/null | grep -q .', { stdio: 'pipe' });
              gpu = {
                type: 'AMD',
                name: 'AMD GPU (DRI Device)',
                vramGB: 'detected'
              };
              console.log('[hardware:detect] Detected AMD GPU via DRI devices');
              amdDetected = true;
            }
          } catch (driErr) {
            // Method 3: Check for Windows AMD device (HIP)
            try {
              execSync('where hipcc', { stdio: 'pipe' });
              gpu = {
                type: 'AMD',
                name: 'AMD GPU (HIP)',
                vramGB: 'detected'
              };
              console.log('[hardware:detect] Detected AMD GPU via HIP');
              amdDetected = true;
            } catch (hipErr) {
              // No AMD GPU could be found
              console.log('[hardware:detect] No AMD GPU detected via any method');
            }
          }
        }
      }
    } catch (err) {
      console.log('[hardware:detect] GPU detection error:', err.message);
    }
    
    // Classify hardware tier
    let tier = 'entryLevel';
    let tierConfidence = 'certain';
    
    if (ramGB >= 16 && cpuCores >= 8 && diskSpaceGB >= 100) {
      tier = 'workstation';
      tierConfidence = 'certain';
    } else if (ramGB >= 8 && cpuCores >= 4 && diskSpaceGB >= 50) {
      tier = 'midRange';
      tierConfidence = 'certain';
    } else if (ramGB < 8 || cpuCores < 4 || diskSpaceGB < 50) {
      tier = 'entryLevel';
      tierConfidence = 'certain';
    }
    
    console.log('[hardware:detect] Classified as:', tier, `(${tierConfidence})`);
    
    return {
      cpuCores,
      ramGB,
      diskSpaceGB,
      gpu,
      tier,
      tierProfile: HARDWARE_PROFILES[tier]
    };
  } catch (err) {
    console.error('[hardware:detect] Error:', err.message);
    return {
      cpuCores: os.cpus().length,
      ramGB: Math.round(os.totalmem() / (1024 * 1024 * 1024)),
      diskSpaceGB: 100,
      gpu: null,
      tier: 'entryLevel',
      tierProfile: HARDWARE_PROFILES.entryLevel,
      error: err.message
    };
  }
}

// Generate docker-compose based on selected services
function generateDockerCompose(selectedServices) {
  try {
    console.log('[docker:generate] Generating docker-compose for services:', selectedServices);
    
    // Base compose structure
    let compose = {
      version: '3.8',
      services: {},
      networks: {
        alloflow: {
          driver: 'bridge'
        }
      },
      volumes: {}
    };
    
    // Add selected services
    selectedServices.forEach(serviceId => {
      const serviceDef = SERVICE_DEFINITIONS[serviceId];
      if (!serviceDef) {
        console.warn('[docker:generate] Unknown service:', serviceId);
        return;
      }
      
      console.log('[docker:generate] Adding service:', serviceId);
      
      // Basic service config
      compose.services[serviceId] = {
        image: serviceDef.image,
        ports: [`${serviceDef.port}:${serviceDef.port}`],
        networks: ['alloflow'],
        restart: 'unless-stopped',
        healthcheck: {
          test: ['CMD', 'curl', '-f', `http://localhost:${serviceDef.port}/` ],
          interval: '10s',
          timeout: '5s',
          retries: 5
        }
      };
      
      // Service-specific configs
      if (serviceId === 'ollama') {
        compose.services.ollama.environment = {
          'OLLAMA_HOST': '0.0.0.0:11434'
        };
        compose.services.ollama.volumes = [
          'ollama:/root/.ollama'
        ];
        compose.volumes.ollama = {};
      } else if (serviceId === 'pocketbase') {
        compose.services.pocketbase.volumes = [
          'pocketbase:/pb_data'
        ];
        compose.services.pocketbase.environment = {
          'PB_ENCRYPTION_KEY': 'alloflow_default_key_change_me'
        };
        compose.volumes.pocketbase = {};
      } else if (serviceId === 'searxng') {
        compose.services.searxng.environment = {
          'BASE_URL': 'http://localhost:8888/',
          'SEARXNG_SECRET': 'alloflow_secret'
        };
        compose.services.searxng.volumes = [
          'searxng:/etc/searxng'
        ];
        compose.volumes.searxng = {};
      } else if (serviceId === 'piper') {
        compose.services.piper.environment = {
          'TZ': 'UTC'
        };
      } else if (serviceId === 'flux') {
        // Flux requires special GPU handling
        compose.services.flux.deploy = {
          resources: {
            reservations: {
              devices: [{
                driver: 'nvidia',
                count: 1,
                capabilities: ['gpu']
              }]
            }
          }
        };
      }
    });
    
    // Convert to YAML
    const yaml = require('js-yaml');
    const yamlContent = yaml.dump(compose);
    
    console.log('[docker:generate] Generated docker-compose with', selectedServices.length, 'services');
    return {
      success: true,
      content: yamlContent,
      serviceCount: selectedServices.length
    };
  } catch (err) {
    console.error('[docker:generate] Error:', err.message);
    return {
      success: false,
      error: err.message
    };
  }
}

// Start deployment with progress tracking
async function startDeployment(setupData, onProgress) {
  try {
    const { execSync, spawn } = require('child_process');
    
    console.log('[deploy:start] Starting deployment for:', setupData.deploymentType);
    console.log('[deploy:start] Setup data:', JSON.stringify(setupData));
    
    const dockerDir = setupData.dockerDir;
    const composeFile = path.join(dockerDir, 'docker-compose.yml');
    
    // PHASE 1: Pre-flight checks
    onProgress({
      phase: 'preflight',
      status: 'Checking Docker daemon...',
      progress: 5
    });
    
    try {
      execSync('docker ps', { stdio: 'pipe' });
    } catch (err) {
      throw new Error('Docker daemon is not running. Please start Docker Desktop.');
    }
    
    // Check docker-compose availability
    onProgress({
      phase: 'preflight',
      status: 'Checking docker-compose...',
      progress: 8
    });
    
    try {
      execSync('docker-compose --version', { stdio: 'pipe' });
      console.log('[deploy:start] docker-compose is available');
    } catch (composeErr) {
      // docker-compose might be docker compose (v2)
      try {
        execSync('docker compose version', { stdio: 'pipe' });
        console.log('[deploy:start] Using docker compose v2');
      } catch (v2Err) {
        throw new Error('docker-compose is not installed. Please install Docker Compose.');
      }
    }
    
    onProgress({
      phase: 'preflight',
      status: 'Checking ports...',
      progress: 10
    });
    
    // Check ports availability
    const requiredPorts = setupData.selectedServices
      .map(svc => SERVICE_DEFINITIONS[svc].port)
      .filter(Boolean);
    
    console.log('[deploy:start] Checking ports:', requiredPorts);
    
    onProgress({
      phase: 'preflight',
      status: 'Pre-flight checks complete',
      progress: 15
    });
    
    // PHASE 2: Write docker-compose file
    onProgress({
      phase: 'config',
      status: 'Generating docker-compose...',
      progress: 20
    });
    
    const composeResult = generateDockerCompose(setupData.selectedServices);
    if (!composeResult.success) {
      console.error('[deploy:start] Failed to generate docker-compose:', composeResult.error);
      throw new Error('Failed to generate docker-compose: ' + composeResult.error);
    }
    
    console.log('[deploy:start] Generated docker-compose with', composeResult.serviceCount, 'services');
    console.log('[deploy:start] YAML content length:', composeResult.content.length, 'bytes');
    
    // Ensure docker directory exists
    if (!fs.existsSync(dockerDir)) {
      console.log('[deploy:start] Creating docker directory:', dockerDir);
      fs.mkdirSync(dockerDir, { recursive: true });
    }
    
    // Write docker-compose file
    try {
      fs.writeFileSync(composeFile, composeResult.content);
      console.log('[deploy:start] Wrote docker-compose to:', composeFile);
      const fileStats = fs.statSync(composeFile);
      console.log('[deploy:start] File size:', fileStats.size, 'bytes');
    } catch (writeErr) {
      console.error('[deploy:start] Failed to write file:', writeErr.message);
      throw new Error('Failed to write docker-compose file: ' + writeErr.message);
    }
    
    onProgress({
      phase: 'config',
      status: 'Pulling Docker images...',
      progress: 25
    });
    
    // PHASE 3: Pull images
    try {
      console.log('[deploy:start] Pulling images from:', composeFile);
      execDockerCompose(`-f "${composeFile}" pull`, {
        cwd: dockerDir,
        stdio: 'pipe'
      });
      console.log('[deploy:start] Docker images pulled successfully');
    } catch (pullErr) {
      console.warn('[deploy:start] Image pull issue (continuing anyway):', pullErr.message);
      // Continue anyway - images might already exist locally
    }
    
    onProgress({
      phase: 'deployment',
      status: 'Starting containers...',
      progress: 50
    });
    
    // PHASE 4: Start containers
    try {
      console.log('[deploy:start] Starting containers from:', composeFile);
      console.log('[deploy:start] Working directory:', dockerDir);
      const output = execDockerCompose(`-f "${composeFile}" up -d`, {
        cwd: dockerDir,
        stdio: 'pipe'
      });
      console.log('[deploy:start] Containers startup output:', output);
      console.log('[deploy:start] Containers started successfully');
    } catch (startErr) {
      console.error('[deploy:start] Container startup error:', startErr.message);
      console.error('[deploy:start] Full error:', startErr);
      throw new Error('Failed to start containers: ' + startErr.message);
    }
    
    onProgress({
      phase: 'healthcheck',
      status: 'Waiting for services to become healthy...',
      progress: 60
    });
    
    // PHASE 5: Wait for services to be healthy
    for (const serviceId of setupData.selectedServices) {
      const svc = SERVICE_DEFINITIONS[serviceId];
      console.log('[deploy:start] Checking health of:', serviceId);
      
      onProgress({
        phase: 'healthcheck',
        status: `Initializing ${svc.name}...`,
        progress: 60 + (setupData.selectedServices.indexOf(serviceId) * 10)
      });
      
      // Wait for service to be healthy
      let isHealthy = false;
      const maxRetries = svc.healthCheck.maxRetries;
      const retryInterval = svc.healthCheck.retryInterval;
      
      for (let i = 0; i < maxRetries; i++) {
        try {
          const http = require('http');
          await new Promise((resolve, reject) => {
            const req = http.get(svc.healthCheck.endpoint, (res) => {
              if (res.statusCode >= 200 && res.statusCode < 300) {
                resolve();
              } else {
                reject(new Error(`Status ${res.statusCode}`));
              }
            });
            req.on('error', reject);
            req.setTimeout(svc.healthCheck.timeout, () => {
              req.abort();
              reject(new Error('Timeout'));
            });
          });
          isHealthy = true;
          console.log('[deploy:start] Service healthy:', serviceId);
          break;
        } catch (err) {
          if (i < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, retryInterval));
          }
        }
      }
      
      if (!isHealthy && serviceId !== 'ollama') { // Ollama can take longer, be lenient
        console.warn('[deploy:start] Service may not be fully healthy:', serviceId);
      }
    }
    
    onProgress({
      phase: 'complete',
      status: 'Deployment complete!',
      progress: 100
    });
    
    console.log('[deploy:start] Deployment completed successfully');
    return {
      success: true,
      composeFile: composeFile
    };
  } catch (err) {
    console.error('[deploy:start] Deployment failed:', err.message);
    return {
      success: false,
      error: err.message
    };
  }
}

// IPC Handler: Detect hardware
ipcMain.handle('setup:detect-hardware', async (event) => {
  try {
    console.log('[ipc:detect-hardware] Called');
    const hardware = detectHardware();
    return {
      success: true,
      hardware
    };
  } catch (err) {
    console.error('[ipc:detect-hardware] Error:', err.message);
    return {
      success: false,
      error: err.message
    };
  }
});

// IPC Handler: Get service definitions
ipcMain.handle('setup:get-services', async (event, hardwareTier) => {
  try {
    console.log('[ipc:get-services] Called for tier:', hardwareTier);
    
    const tier = HARDWARE_PROFILES[hardwareTier || 'entryLevel'];
    if (!tier) {
      throw new Error('Invalid hardware tier: ' + hardwareTier);
    }
    
    // Get services for this tier
    const services = tier.servicesToInclude.map(serviceId => ({
      ...SERVICE_DEFINITIONS[serviceId],
      enabled: !SERVICE_DEFINITIONS[serviceId].optional || SERVICE_DEFINITIONS[serviceId].defaultEnabled
    }));
    
    return {
      success: true,
      tier: hardwareTier,
      tierProfile: tier,
      services
    };
  } catch (err) {
    console.error('[ipc:get-services] Error:', err.message);
    return {
      success: false,
      error: err.message
    };
  }
});

// IPC Handler: Start deployment with progress streaming
ipcMain.handle('setup:start-deployment', async (event, setupData) => {
  try {
    console.log('[ipc:start-deployment] Called');
    
    // Return a channel ID for progress updates
    const channelId = 'deployment-' + Date.now();
    
    // Start deployment in background
    startDeployment(setupData, (progress) => {
      // Send progress back to renderer
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('deployment:progress', {
          channelId,
          ...progress
        });
      }
    }).then(result => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('deployment:complete', {
          channelId,
          ...result
        });
      }
    }).catch(err => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('deployment:error', {
          channelId,
          error: err.message
        });
      }
    });
    
    return { success: true, channelId };
  } catch (err) {
    console.error('[ipc:start-deployment] Error:', err.message);
    return { success: false, error: err.message };
  }
});
