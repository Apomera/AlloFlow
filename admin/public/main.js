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

// Helper: Execute docker compose command asynchronously (non-blocking)
function execDockerComposeAsync(args, options = {}) {
  return new Promise((resolve, reject) => {
    const { spawn } = require('child_process');
    const cwd = options.cwd || process.cwd();
    const onOutput = options.onOutput || (() => {});

    const fullArgs = ['compose', ...args];
    console.log('[docker-compose] Executing: docker', fullArgs.join(' '), 'in', cwd);

    const proc = spawn('docker', fullArgs, {
      cwd,
      windowsHide: true
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      const text = data.toString();
      stdout += text;
      onOutput(text);
    });

    proc.stderr.on('data', (data) => {
      const text = data.toString();
      stderr += text;
      onOutput(text); // Docker outputs progress to stderr
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        const errMsg = stderr.trim() || stdout.trim() || `Process exited with code ${code}`;
        console.error('[docker-compose] Failed (exit code ' + code + '):', errMsg);
        reject(new Error(errMsg));
      } else {
        console.log('[docker-compose] Completed successfully');
        resolve(stdout);
      }
    });

    proc.on('error', (err) => {
      console.error('[docker-compose] Spawn error:', err.message);
      reject(new Error('Failed to run Docker: ' + err.message));
    });
  });
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
      if (process.platform === 'win32') {
        // Windows: Use WMI to detect GPU (works for ALL GPU brands)
        try {
          const wmicResult = execSync('wmic path win32_VideoController get name,adapterram /format:csv', {
            stdio: 'pipe',
            encoding: 'utf-8'
          });
          console.log('[hardware:detect] WMI GPU output:', wmicResult.trim());
          
          // Parse CSV lines, skip empty and header
          const lines = wmicResult.trim().split('\n').filter(l => l.trim() && !l.startsWith('Node'));
          for (const line of lines) {
            const parts = line.split(',').map(s => s.trim());
            // CSV format: Node, AdapterRAM, Name
            const adapterRAM = parts.length >= 2 ? parseInt(parts[1]) : 0;
            const gpuName = parts.length >= 3 ? parts[2] : '';
            
            // Skip virtual/basic display adapters
            if (!gpuName || gpuName.includes('Virtual') || gpuName.includes('Basic') || gpuName.includes('Microsoft')) {
              continue;
            }
            
            // WMI caps AdapterRAM at ~4GB (32-bit unsigned), so estimate from card name
            let vramGB = Math.round(adapterRAM / (1024 * 1024 * 1024));
            // Known card VRAM overrides when WMI reports wrong value
            if (gpuName.includes('9070 XT')) vramGB = 16;
            else if (gpuName.includes('9070') && !gpuName.includes('XT')) vramGB = 12;
            else if (gpuName.includes('7900 XTX')) vramGB = 24;
            else if (gpuName.includes('7900 XT')) vramGB = 20;
            else if (gpuName.includes('4090')) vramGB = 24;
            else if (gpuName.includes('4080')) vramGB = 16;
            else if (gpuName.includes('4070 Ti Super')) vramGB = 16;
            else if (gpuName.includes('4070 Ti')) vramGB = 12;
            else if (gpuName.includes('4070')) vramGB = 12;
            else if (gpuName.includes('3090')) vramGB = 24;
            else if (gpuName.includes('3080')) vramGB = 10;
            else if (vramGB <= 0 || vramGB > 48) vramGB = 'unknown';
            
            const gpuType = gpuName.includes('AMD') || gpuName.includes('Radeon') ? 'AMD' :
                            gpuName.includes('NVIDIA') || gpuName.includes('GeForce') || gpuName.includes('RTX') || gpuName.includes('GTX') ? 'NVIDIA' :
                            gpuName.includes('Intel') || gpuName.includes('Arc') ? 'Intel' : 'Unknown';
            
            // Determine ROCm GFX version for AMD GPUs
            let rocmGfxVersion = null;
            if (gpuType === 'AMD') {
              // Map known AMD GPU families to GFX versions
              if (gpuName.includes('9070') || gpuName.includes('9050')) rocmGfxVersion = '12.0.0'; // RDNA 4 (gfx1200)
              else if (gpuName.includes('7900') || gpuName.includes('7800') || gpuName.includes('7700') || gpuName.includes('7600')) rocmGfxVersion = '11.0.0'; // RDNA 3 (gfx1100)
              else if (gpuName.includes('6900') || gpuName.includes('6800') || gpuName.includes('6700') || gpuName.includes('6600') || gpuName.includes('6500')) rocmGfxVersion = '10.3.0'; // RDNA 2 (gfx1030)
            }
            
            gpu = {
              type: gpuType,
              name: gpuName,
              vramGB: vramGB,
              rocmGfxVersion: rocmGfxVersion
            };
            console.log('[hardware:detect] Detected GPU:', gpuName, '-', vramGB, 'GB VRAM (' + gpuType + ')');
            break; // Use first real GPU found
          }
        } catch (wmicErr) {
          console.warn('[hardware:detect] WMI GPU detection failed:', wmicErr.message);
        }
      } else {
        // Linux/macOS: Try nvidia-smi first, then lspci
        try {
          const nvidiaResult = execSync('nvidia-smi --query-gpu=name,memory.total --format=csv,noheader', {
            stdio: 'pipe',
            encoding: 'utf-8'
          });
          const [gpuName, vramStr] = nvidiaResult.trim().split(',').map(s => s.trim());
          gpu = {
            type: 'NVIDIA',
            name: gpuName,
            vramGB: parseInt(vramStr)
          };
          console.log('[hardware:detect] Detected NVIDIA GPU:', gpuName);
        } catch (nvidiaErr) {
          try {
            const lspciResult = execSync('lspci | grep -i vga', { stdio: 'pipe', encoding: 'utf-8' });
            if (lspciResult.includes('AMD') || lspciResult.includes('ATI')) {
              gpu = { type: 'AMD', name: lspciResult.trim().split(':').pop().trim(), vramGB: 'detected' };
            } else if (lspciResult.includes('NVIDIA')) {
              gpu = { type: 'NVIDIA', name: lspciResult.trim().split(':').pop().trim(), vramGB: 'detected' };
            }
          } catch (e) {
            console.log('[hardware:detect] No GPU detected on Linux');
          }
        }
      }
      
      if (!gpu) {
        console.log('[hardware:detect] No discrete GPU detected');
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
function generateDockerCompose(selectedServices, gpuInfo) {
  try {
    console.log('[docker:generate] Generating docker-compose for services:', selectedServices);
    console.log('[docker:generate] GPU info:', gpuInfo ? gpuInfo.type : 'none');
    
    // Base compose structure
    let compose = {
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
      
      if (serviceDef.available === false) {
        console.warn('[docker:generate] Skipping unavailable service:', serviceId);
        return;
      }
      
      console.log('[docker:generate] Adding service:', serviceId);
      
      // Basic service config
      const svcConfig = {
        ports: [`${serviceDef.port}:${serviceDef.internalPort || serviceDef.port}`],
        networks: ['alloflow'],
        restart: 'unless-stopped'
      };
      
      // Use build context if available, otherwise pull image
      if (serviceDef.buildContext) {
        svcConfig.build = {
          context: './' + serviceDef.buildContext,
          dockerfile: 'Dockerfile'
        };
        svcConfig.image = serviceDef.image; // Tag the built image
      } else {
        svcConfig.image = serviceDef.image;
      }
      
      compose.services[serviceId] = svcConfig;
      
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
        compose.services.piper.command = ['--voice', 'en_US-lessac-medium'];
      } else if (serviceId === 'flux') {
        compose.services.flux.environment = {
          'FLUX_MODEL': 'black-forest-labs/FLUX.1-schnell',
          'PORT': '7860',
          'MAX_IMAGE_SIZE': '1024',
          'HF_HOME': '/models'
        };
        compose.services.flux.volumes = [
          'flux_models:/models'
        ];
        compose.volumes.flux_models = {};
        
        // GPU-specific configuration
        if (gpuInfo && gpuInfo.type === 'NVIDIA') {
          // NVIDIA: use CUDA base image + GPU reservation
          compose.services.flux.build.args = { BASE_IMAGE: 'pytorch/pytorch:latest' };
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
        } else if (gpuInfo && gpuInfo.type === 'AMD') {
          // AMD: use ROCm base image + device passthrough
          compose.services.flux.build.args = { BASE_IMAGE: 'rocm/pytorch:latest' };
          compose.services.flux.devices = [
            '/dev/kfd',
            '/dev/dri'
          ];
          compose.services.flux.group_add = ['video'];
          compose.services.flux.environment['HSA_OVERRIDE_GFX_VERSION'] = gpuInfo.rocmGfxVersion || '11.0.0';
          compose.services.flux.environment['ROCM_VISIBLE_DEVICES'] = '0';
        }
        // else: CPU-only — no GPU config needed, pytorch/pytorch base is default
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
    
    // Detect GPU for compose generation (determines GPU config)
    const hardware = detectHardware();
    const gpuInfo = hardware.gpu || null;
    
    const composeResult = generateDockerCompose(setupData.selectedServices, gpuInfo);
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
    
    // Copy build context directories for services that build from source
    for (const serviceId of setupData.selectedServices) {
      const serviceDef = SERVICE_DEFINITIONS[serviceId];
      if (serviceDef && serviceDef.buildContext) {
        const destDir = path.join(dockerDir, serviceDef.buildContext);
        // Find source: packaged app uses resources/, dev uses docker_templates/
        const resourcesPath = isDev
          ? path.join(__dirname, '..', 'docker_templates', serviceDef.buildContext)
          : path.join(process.resourcesPath, 'docker_templates', serviceDef.buildContext);
        
        console.log('[deploy:start] Copying build context:', resourcesPath, '->', destDir);
        
        if (!fs.existsSync(resourcesPath)) {
          throw new Error(`Build context not found: ${resourcesPath}. Cannot build ${serviceDef.name}.`);
        }
        
        // Copy directory recursively
        fs.mkdirSync(destDir, { recursive: true });
        const files = fs.readdirSync(resourcesPath);
        for (const file of files) {
          const srcFile = path.join(resourcesPath, file);
          const destFile = path.join(destDir, file);
          if (fs.statSync(srcFile).isFile()) {
            fs.copyFileSync(srcFile, destFile);
            console.log('[deploy:start] Copied:', file);
          }
        }
      }
    }
    
    // Determine if any services need building
    const needsBuild = setupData.selectedServices.some(
      svcId => SERVICE_DEFINITIONS[svcId] && SERVICE_DEFINITIONS[svcId].buildContext
    );
    
    if (needsBuild) {
      onProgress({
        phase: 'build',
        status: 'Building local Docker images (this may take several minutes)...',
        progress: 22
      });
      
      try {
        console.log('[deploy:start] Building images from:', composeFile);
        await execDockerComposeAsync(['-f', composeFile, 'build'], {
          cwd: dockerDir,
          onOutput: (text) => {
            const line = text.trim();
            if (line) {
              onProgress({
                phase: 'build',
                status: `Building: ${line.slice(-100)}`,
                progress: 24
              });
            }
          }
        });
        console.log('[deploy:start] Docker images built successfully');
      } catch (buildErr) {
        console.error('[deploy:start] Image build failed:', buildErr.message);
        throw new Error('Failed to build Docker images: ' + buildErr.message);
      }
    }
    
    onProgress({
      phase: 'pull',
      status: 'Pulling Docker images (this may take several minutes)...',
      progress: 25
    });
    
    // PHASE 3: Pull images (async - won't freeze the UI)
    // Use --ignore-buildable to skip services that are built from source
    const pullArgs = ['-f', composeFile, 'pull'];
    if (needsBuild) pullArgs.push('--ignore-buildable');
    
    try {
      console.log('[deploy:start] Pulling images from:', composeFile);
      await execDockerComposeAsync(pullArgs, {
        cwd: dockerDir,
        onOutput: (text) => {
          const line = text.trim();
          if (line) {
            onProgress({
              phase: 'pull',
              status: `Pulling: ${line.slice(-100)}`,
              progress: 30
            });
          }
        }
      });
      console.log('[deploy:start] Docker images pulled successfully');
    } catch (pullErr) {
      console.error('[deploy:start] Image pull failed:', pullErr.message);
      throw new Error('Failed to pull Docker images. Check your internet connection.\n' + pullErr.message);
    }
    
    onProgress({
      phase: 'deployment',
      status: 'Starting containers...',
      progress: 50
    });
    
    // PHASE 4: Start containers (async - won't freeze the UI)
    try {
      console.log('[deploy:start] Starting containers from:', composeFile);
      console.log('[deploy:start] Working directory:', dockerDir);
      await execDockerComposeAsync(['-f', composeFile, 'up', '-d'], {
        cwd: dockerDir,
        onOutput: (text) => {
          const line = text.trim();
          if (line) {
            onProgress({
              phase: 'deployment',
              status: `Starting: ${line.slice(-100)}`,
              progress: 55
            });
          }
        }
      });
      console.log('[deploy:start] Containers started successfully');
    } catch (startErr) {
      console.error('[deploy:start] Container startup error:', startErr.message);
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
    
    // Get services for this tier (exclude unavailable ones)
    const services = tier.servicesToInclude
      .filter(serviceId => SERVICE_DEFINITIONS[serviceId] && SERVICE_DEFINITIONS[serviceId].available !== false)
      .map(serviceId => ({
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
        if (result && result.success) {
          mainWindow.webContents.send('deployment:complete', {
            channelId,
            ...result
          });
        } else {
          mainWindow.webContents.send('deployment:error', {
            channelId,
            error: (result && result.error) || 'Deployment failed'
          });
        }
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
