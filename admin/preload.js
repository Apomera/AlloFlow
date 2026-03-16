const { contextBridge, ipcRenderer } = require('electron');

// Expose safe IPC methods to the renderer process
contextBridge.exposeInMainWorld('alloAPI', {
  // Docker health & status
  getHealth: () => ipcRenderer.invoke('docker:health'),
  getServices: () => ipcRenderer.invoke('docker:services'),
  getServiceLogs: (service) => ipcRenderer.invoke('docker:logs', service),
  
  // Docker control
  restartService: (service) => ipcRenderer.invoke('docker:restart', service),
  startStack: () => ipcRenderer.invoke('docker:compose-up'),
  stopStack: () => ipcRenderer.invoke('docker:compose-down'),
  
  // Configuration
  readEnv: () => ipcRenderer.invoke('system:read-env'),
  writeEnv: (content) => ipcRenderer.invoke('system:write-env', content),
  
  // AI Configuration
  readAIConfig: () => ipcRenderer.invoke('ai:read-config'),
  writeAIConfig: (config) => ipcRenderer.invoke('ai:write-config', config),
  
  // Setup Wizard
  checkDocker: () => ipcRenderer.invoke('setup:check-docker'),
  installDocker: () => ipcRenderer.invoke('setup:install-docker'),
  detectGPU: () => ipcRenderer.invoke('setup:detect-gpu'),
  getServerIP: () => ipcRenderer.invoke('setup:get-server-ip'),
  validateClusterToken: (primaryIp, token) => ipcRenderer.invoke('setup:validate-cluster-token', primaryIp, token),
  runSetup: (config) => ipcRenderer.invoke('setup:run', config),
  
  // Setup progress events
  onSetupProgress: (callback) => ipcRenderer.on('setup:progress', (event, data) => callback(data)),
  onSetupError: (callback) => ipcRenderer.on('setup:error', (event, data) => callback(data)),
  
  // Auto-update system
  checkForUpdates: () => ipcRenderer.invoke('update:check'),
  downloadUpdate: () => ipcRenderer.invoke('update:download'),
  installUpdate: () => ipcRenderer.invoke('update:install'),
  getVersion: () => ipcRenderer.invoke('update:get-version'),
  configureUpdates: (config) => ipcRenderer.invoke('update:configure', config),
  
  // Update events
  onUpdateChecking: (callback) => ipcRenderer.on('update:checking', () => callback()),
  onUpdateAvailable: (callback) => ipcRenderer.on('update:available', (event, data) => callback(data)),
  onUpdateNotAvailable: (callback) => ipcRenderer.on('update:not-available', (event, data) => callback(data)),
  onUpdateDownloadProgress: (callback) => ipcRenderer.on('update:download-progress', (event, data) => callback(data)),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update:downloaded', (event, data) => callback(data)),
  onUpdateError: (callback) => ipcRenderer.on('update:error', (event, data) => callback(data)),
});
