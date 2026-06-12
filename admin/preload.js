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
  
  // Models
  listModels: () => ipcRenderer.invoke('models:list'),
  pullModel: (modelName) => ipcRenderer.invoke('models:pull', modelName),
  
  // System Metrics
  getSystemMetrics: () => ipcRenderer.invoke('system:get-metrics'),
  
  // System Configuration
  getSystemConfig: () => ipcRenderer.invoke('system:read-config'),
  saveSystemConfig: (config) => ipcRenderer.invoke('system:write-config', config),
  
  // Security Configuration
  getSecurityConfig: () => ipcRenderer.invoke('security:read-config'),
  saveCORSConfig: (corsOrigins) => ipcRenderer.invoke('security:save-cors-config', corsOrigins),
  rotateAPIKey: () => ipcRenderer.invoke('security:rotate-api-key'),
  regenerateCertificate: () => ipcRenderer.invoke('security:regenerate-certificate'),
  writeEnv: (content) => ipcRenderer.invoke('system:write-env', content),
  
  // AI Configuration
  readAIConfig: () => ipcRenderer.invoke('ai:read-config'),
  writeAIConfig: (config) => ipcRenderer.invoke('ai:write-config', config),
  
  // Setup Wizard
  checkDocker: () => ipcRenderer.invoke('setup:check-docker'),
  checkAdmin: () => ipcRenderer.invoke('setup:check-admin'),
  checkSetupComplete: () => ipcRenderer.invoke('setup:check-complete'),
  installDocker: () => ipcRenderer.invoke('setup:install-docker'),
  detectGPU: () => ipcRenderer.invoke('setup:detect-gpu'),
  getServerIP: () => ipcRenderer.invoke('setup:get-server-ip'),
  validateClusterToken: (primaryIp, token) => ipcRenderer.invoke('setup:validate-cluster-token', primaryIp, token),
  configureFirewall: (port) => ipcRenderer.invoke('setup:configure-firewall', port),
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

  // Clustering API
  generateClusterToken: (clusterId, nodeName, role) => 
    ipcRenderer.invoke('cluster:generate-token', clusterId, nodeName, role),
  registerNode: (token, nodeIp, nodePort, hardwareInfo) =>
    ipcRenderer.invoke('cluster:register-node', token, nodeIp, nodePort, hardwareInfo),
  getClusterNodes: (clusterId) =>
    ipcRenderer.invoke('cluster:get-nodes', clusterId),
  getClusterConfig: (clusterId) =>
    ipcRenderer.invoke('cluster:get-config', clusterId),
  updateClusterConfig: (clusterId, configUpdate) =>
    ipcRenderer.invoke('cluster:update-config', clusterId, configUpdate),
  generateNginxConfig: (clusterId) =>
    ipcRenderer.invoke('cluster:generate-nginx-config', clusterId),
  recordHeartbeat: (nodeId, clusterId, status, metrics) =>
    ipcRenderer.invoke('cluster:record-heartbeat', nodeId, clusterId, status, metrics),
  cleanupDeadNodes: (clusterId) =>
    ipcRenderer.invoke('cluster:cleanup-dead-nodes', clusterId),
  removeNode: (clusterId, nodeId) =>
    ipcRenderer.invoke('cluster:remove-node', clusterId, nodeId),

  // Package Builder API
  buildPackage: (options) =>
    ipcRenderer.invoke('builder:build-package', options),
  isBuilding: () =>
    ipcRenderer.invoke('builder:is-building'),
  getAvailableBuilds: () =>
    ipcRenderer.invoke('builder:get-available-builds'),
  cleanBuilds: () =>
    ipcRenderer.invoke('builder:clean-builds'),
  getBuildLog: () =>
    ipcRenderer.invoke('builder:get-build-log'),

  // Builder progress events
  onBuildProgress: (callback) =>
    ipcRenderer.on('builder:progress', (event, data) => callback(data)),

  // GPU Detection & Docker Setup API
  detectGPU: () =>
    ipcRenderer.invoke('setup:detect-gpu'),
  setupDocker: () =>
    ipcRenderer.invoke('docker-setup:run'),
  startServices: () =>
    ipcRenderer.invoke('docker:start-services'),
  stopServices: () =>
    ipcRenderer.invoke('docker:stop-services'),
  
  // GPU events
  onGPUDetected: (callback) =>
    ipcRenderer.on('docker:gpu-detected', (event, data) => callback(data)),
  onDockerSetupComplete: (callback) =>
    ipcRenderer.on('docker:setup-complete', (event, data) => callback(data)),
  onServicesStarted: (callback) =>
    ipcRenderer.on('docker:services-started', (event, data) => callback(data)),
  onServicesStopped: (callback) =>
    ipcRenderer.on('docker:services-stopped', (event, data) => callback(data)),

  // LLM Model Management API (LM Studio / llama.cpp)
  listModels: () => ipcRenderer.invoke('llm:get-models'),
  pullModel: (modelId) => ipcRenderer.invoke('llm:pull-model', { modelId }),
});
