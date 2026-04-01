import React, { useState } from 'react';

const DEPLOYMENT_TYPES = [
  {
    id: 'cloud',
    label: 'Cloud',
    description: 'Use cloud AI resources (OpenAI, Anthropic, etc.) via API keys',
    icon: '☁️',
    requires: ['apiKey', 'provider'],
    needsLocal: false
  },
  {
    id: 'hybrid',
    label: 'Hybrid',
    description: 'Local AI services + cloud API fallback',
    icon: '🔗',
    requires: ['apiKey'],
    needsLocal: true
  },
  {
    id: 'local',
    label: 'Local',
    description: 'Full local setup — AI services run natively on your machine',
    icon: '🏠',
    requires: [],
    needsLocal: true
  },
  {
    id: 'cluster',
    label: 'Join Cluster',
    description: 'Connect to existing AlloFlow instance in your network',
    icon: '🌐',
    requires: ['clusterIP', 'clusterPort', 'clusterToken'],
    needsLocal: false
  }
];

export default function SetupWizard({ onComplete }) {
  // Step progression: deployment → hardware → services → config → deploying → success
  const [step, setStep] = useState('deployment');
  const [selectedType, setSelectedType] = useState(null);
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Hardware & Services
  const [hardware, setHardware] = useState(null);
  const [services, setServices] = useState(null);
  const [selectedServices, setSelectedServices] = useState([]);
  const [deploymentProgress, setDeploymentProgress] = useState(null);
  const [gpuStatus, setGpuStatus] = useState(null); // { strategy, label, warning } or { gpu_accelerated, device, fallback_reason }
  const [webAppUrl, setWebAppUrl] = useState(null);

  // Handle deployment type selection
  const handleSelectDeployment = async (typeId) => {
    console.log('[SetupWizard] Selected deployment type:', typeId);
    setSelectedType(typeId);
    setError(null);
    
    const deployment = DEPLOYMENT_TYPES.find(d => d.id === typeId);
    
    // For cloud/cluster deployments, skip hardware/services checks
    if (!deployment.needsLocal) {
      console.log('[SetupWizard] No local services needed, skipping hardware check');
      setStep('config');
    } else {
      // Go straight to hardware detection
      detectHardware();
    }
  };

  // Detect hardware
  const detectHardware = async () => {
    try {
      setLoading(true);
      console.log('[SetupWizard] Detecting hardware...');
      const result = await window.alloAPI.setup.detectHardware();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to detect hardware');
      }
      
      console.log('[SetupWizard] Hardware detected:', result.hardware);
      setHardware(result.hardware);
      setStep('hardware');
    } catch (err) {
      console.error('[SetupWizard] Error detecting hardware:', err);
      setError('Failed to detect hardware: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Load services for hardware tier
  const loadServices = async (tier) => {
    try {
      setLoading(true);
      console.log('[SetupWizard] Loading services for tier:', tier);
      const result = await window.alloAPI.setup.getServices(tier);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to load services');
      }
      
      console.log('[SetupWizard] Services loaded:', result.services.length);
      setServices(result.services);
      
      // Pre-select enabled services
      const enabled = result.services
        .filter(s => s.enabled)
        .map(s => s.id);
      setSelectedServices(enabled);
      
      setStep('services');
    } catch (err) {
      console.error('[SetupWizard] Error loading services:', err);
      setError('Failed to load services: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle hardware tier confirmation
  const handleConfirmHardware = (tier) => {
    console.log('[SetupWizard] Confirmed hardware tier:', tier);
    setConfig({ ...config, hardwareTier: tier });
    loadServices(tier);
  };

  // Toggle service selection
  const toggleService = (serviceId) => {
    console.log('[SetupWizard] Toggling service:', serviceId);
    if (selectedServices.includes(serviceId)) {
      setSelectedServices(selectedServices.filter(s => s !== serviceId));
    } else {
      setSelectedServices([...selectedServices, serviceId]);
    }
  };

  //Handle services confirmation
  const handleConfirmServices = () => {
    console.log('[SetupWizard] Confirmed services:', selectedServices);
    setConfig({ ...config, selectedServices });
    setStep('config');
  };

  // Handle config changes
  const handleConfigChange = (field, value) => {
    console.log('[SetupWizard] Config change:', field, '=', value);
    setConfig({ ...config, [field]: value });
  };

  // Start deployment
  const handleStartDeployment = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('[SetupWizard] Starting deployment...');

      const deployment = DEPLOYMENT_TYPES.find(d => d.id === selectedType);
      
      // Validate required fields
      const missing = deployment.requires.filter(field => !config[field]);
      if (missing.length > 0) {
        setError(`Missing required fields: ${missing.join(', ')}`);
        setLoading(false);
        return;
      }

      // For local/hybrid, actually start deployment
      if (selectedType === 'local' || selectedType === 'hybrid') {
        setStep('deploying');
        
        const setupData = {
          deploymentType: selectedType,
          ...config
        };

        // Start listening for progress
        window.alloAPI.setup.onDeploymentProgress((event) => {
          console.log('[SetupWizard] Deployment progress:', event);
          if (event.type === 'progress') {
            setDeploymentProgress(event);
            // Capture GPU strategy info from Flux install progress
            if (event.gpuStrategy) {
              setGpuStatus(event.gpuStrategy);
            }
            // Capture Flux GPU status from completion progress
            if (event.fluxGpuStatus) {
              setGpuStatus(prev => ({ ...prev, ...event.fluxGpuStatus }));
            }
          } else if (event.type === 'complete') {
            if (event.success === false) {
              setError('Deployment failed: ' + (event.error || 'Unknown error'));
              setLoading(false);
            } else {
              console.log('[SetupWizard] Deployment complete');
              // Capture final Flux GPU status from deployment result
              if (event.fluxGpuStatus) {
                setGpuStatus(prev => ({ ...prev, ...event.fluxGpuStatus }));
              }
              if (event.webAppUrl) {
                setWebAppUrl(event.webAppUrl);
              }
              handleDeploymentComplete(setupData);
            }
          } else if (event.type === 'error') {
            setError('Deployment failed: ' + event.error);
            setLoading(false);
          }
        });

        // Start deployment
        const result = await window.alloAPI.setup.startDeployment(setupData);
        if (!result.success) {
          throw new Error(result.error || 'Failed to start deployment');
        }
      } else {
        // For cloud/cluster, just save config
        const result = await window.alloAPI.setup.saveConfig({
          deploymentType: selectedType,
          ...config
        });

        if (result.success) {
          handleDeploymentComplete(config);
        } else {
          setError(result.error || 'Failed to save configuration');
          setLoading(false);
        }
      }
    } catch (err) {
      console.error('[SetupWizard] Error:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  // Handle deployment completion
  const handleDeploymentComplete = (finalConfig) => {
    console.log('[SetupWizard] Deployment completed');
    setStep('success');
    setLoading(false);
    
    setTimeout(() => {
      onComplete({
        deploymentType: selectedType,
        ...finalConfig,
        setupDate: new Date().toISOString()
      });
    }, 2000);
  };

  // STEP 1: Select Deployment Type
  if (step === 'deployment') {
    return (
      <div className="setup-wizard">
        <div className="setup-container">
          <h1>AlloFlow Setup</h1>
          <p className="setup-subtitle">Choose your deployment method</p>

          <div className="deployment-grid">
            {DEPLOYMENT_TYPES.map(type => (
              <div
                key={type.id}
                className="deployment-card"
                onClick={() => handleSelectDeployment(type.id)}
              >
                <div className="deployment-icon">{type.icon}</div>
                <h3>{type.label}</h3>
                <p>{type.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // STEP 2: Hardware Check
  if (step === 'hardware' && hardware) {
    const tier = hardware.tier;
    const profile = hardware.tierProfile;

    return (
      <div className="setup-wizard">
        <div className="setup-container">
          <button className="back-button" onClick={() => setStep('deployment')}>← Back</button>
          
          <h1>System Capabilities</h1>
          <p className="setup-subtitle">AlloFlow detected your hardware</p>

          {/* Hardware Details */}
          <div className="hardware-info">
            <div className="hardware-spec">
              <strong>Processor</strong>
              <p>{hardware.cpuCores} cores</p>
            </div>
            <div className="hardware-spec">
              <strong>Memory (RAM)</strong>
              <p>{hardware.ramGB} GB</p>
            </div>
            <div className="hardware-spec">
              <strong>Storage</strong>
              <p>{hardware.diskSpaceGB} GB free</p>
            </div>
            {hardware.gpu ? (
              <div className="hardware-spec">
                <strong>GPU</strong>
                <p>{hardware.gpu.type}: {hardware.gpu.name}</p>
                {hardware.gpu.vramGB && <p className="small">{hardware.gpu.vramGB} GB VRAM</p>}
              </div>
            ) : (
              <div className="hardware-spec">
                <strong>GPU</strong>
                <p>Not detected</p>
              </div>
            )}
          </div>

          {/* Recommended Tier */}
          <div className="info-box success">
            <strong>✓ Recommended: {profile.label}</strong>
            <p>{profile.description}</p>
            <p style={{marginTop: '10px', fontSize: '0.9rem'}}>{profile.recommendations.join(' • ')}</p>
          </div>

          {/* Limitations */}
          {profile.limitations.length > 0 && (
            <div className="info-box">
              <strong>⚠️  Limitations for this hardware:</strong>
              <ul>
                {profile.limitations.map((limitation, i) => (
                  <li key={i}>{limitation}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Override Option */}
          <div className="tier-selector">
            <p><strong>Select different tier if needed:</strong></p>
            <div style={{display: 'flex', gap: '10px', marginTop: '10px'}}>
              {['entryLevel', 'midRange', 'workstation'].map(t => (
                <button
                  key={t}
                  className={`tier-button ${tier === t ? 'active' : ''}`}
                  onClick={() => handleConfirmHardware(t)}
                >
                  {{
                    entryLevel: '💻 Entry',
                    midRange: '🖥️ Mid',
                    workstation: '⚙️ Workstation'
                  }[t]}
                </button>
              ))}
            </div>
          </div>

          <div className="setup-buttons">
            <button
              className="btn-primary"
              onClick={() => handleConfirmHardware(tier)}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Continue with ' + profile.label}
            </button>
          </div>

          {error && <div className="error-message">{error}</div>}
        </div>
      </div>
    );
  }

  // STEP 3: Service Selection
  if (step === 'services' && services) {
    return (
      <div className="setup-wizard">
        <div className="setup-container">
          <button className="back-button" onClick={() => setStep('hardware')}>← Back</button>
          
          <h1>Select Services</h1>
          <p className="setup-subtitle">Choose which AI services to install</p>

          <div className="services-grid">
            {services.map(service => {
              const isSelected = selectedServices.includes(service.id);
              const isDisabled = service.required && !service.optional;
              
              return (
                <div
                  key={service.id}
                  className={`service-card ${isSelected ? 'selected' : ''} ${isDisabled ? 'required' : ''}`}
                  onClick={() => !isDisabled && toggleService(service.id)}
                >
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                    <span className="service-icon">{service.icon}</span>
                    {!isDisabled && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        style={{cursor: 'pointer'}}
                      />
                    )}
                    {isDisabled && (
                      <span style={{fontSize: '0.8rem', color: '#999'}}>Required</span>
                    )}
                  </div>
                  
                  <h3>{service.name}</h3>
                  <p className="service-description">{service.description}</p>
                  
                  {service.resources && (
                    <p className="service-resources">
                      Requires: {service.resources.minRAM}MB RAM, {service.resources.minDisk}MB disk
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {selectedServices.length === 0 && (
            <div className="info-box error">
              <strong>⚠️ Select at least one service</strong>
            </div>
          )}

          <div className="setup-buttons">
            <button
              className="btn-primary"
              onClick={handleConfirmServices}
              disabled={selectedServices.length === 0 || loading}
            >
              {loading ? 'Loading...' : 'Continue'}
            </button>
          </div>

          {error && <div className="error-message">{error}</div>}
        </div>
      </div>
    );
  }

  // STEP 4: Configure Deployment
  if (step === 'config' && selectedType) {
    const deployment = DEPLOYMENT_TYPES.find(d => d.id === selectedType);

    return (
      <div className="setup-wizard">
        <div className="setup-container">
          <button className="back-button" onClick={() => setStep(hardware ? 'services' : 'deployment')}>← Back</button>
          
          <h1>Configure {deployment.label}</h1>
          <p className="setup-subtitle">{deployment.description}</p>

          <form className="setup-form">
            {selectedType === 'cloud' && (
              <>
                <div className="form-group">
                  <label>AI Provider</label>
                  <select
                    value={config.provider || ''}
                    onChange={(e) => handleConfigChange('provider', e.target.value)}
                  >
                    <option value="">Select provider...</option>
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic (Claude)</option>
                    <option value="huggingface">Hugging Face</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>API Key</label>
                  <input
                    type="password"
                    value={config.apiKey || ''}
                    onChange={(e) => handleConfigChange('apiKey', e.target.value)}
                    placeholder="Enter your API key"
                  />
                </div>
              </>
            )}

            {selectedType === 'hybrid' && (
              <>
                <div className="form-group">
                  <label>Cloud API Provider</label>
                  <select
                    value={config.provider || ''}
                    onChange={(e) => handleConfigChange('provider', e.target.value)}
                  >
                    <option value="">Select provider...</option>
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic (Claude)</option>
                    <option value="huggingface">Hugging Face</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Fallback API Key</label>
                  <input
                    type="password"
                    value={config.apiKey || ''}
                    onChange={(e) => handleConfigChange('apiKey', e.target.value)}
                    placeholder="Enter your API key for cloud fallback"
                  />
                </div>

                <div className="info-box">
                  <strong>Your Services:</strong>
                  <ul>
                    {config.selectedServices && config.selectedServices.map(svc => {
                      const svcDef = services && services.find(s => s.id === svc);
                      return svcDef ? <li key={svc}>{svcDef.icon} {svcDef.name}</li> : null;
                    })}
                  </ul>
                </div>
              </>
            )}

            {selectedType === 'local' && (
              <>
                <div className="info-box">
                  <strong>Your Services:</strong>
                  <ul>
                    {config.selectedServices && config.selectedServices.map(svc => {
                      const svcDef = services && services.find(s => s.id === svc);
                      return svcDef ? <li key={svc}>{svcDef.icon} {svcDef.name}</li> : null;
                    })}
                  </ul>
                  <p style={{marginTop: '10px', fontSize: '0.9rem'}}>
                    Services will be downloaded and run natively on your machine.
                    Data stored in <code>~/.alloflow/</code>
                  </p>
                </div>
              </>
            )}

            {selectedType === 'cluster' && (
              <>
                <div className="form-group">
                  <label>Cluster IP Address</label>
                  <input
                    type="text"
                    value={config.clusterIP || ''}
                    onChange={(e) => handleConfigChange('clusterIP', e.target.value)}
                    placeholder="e.g., 192.168.1.100"
                  />
                </div>

                <div className="form-group">
                  <label>Cluster Port</label>
                  <input
                    type="number"
                    value={config.clusterPort || ''}
                    onChange={(e) => handleConfigChange('clusterPort', e.target.value)}
                    placeholder="Usually 3000 or 8080"
                  />
                </div>

                <div className="form-group">
                  <label>Cluster Token</label>
                  <input
                    type="password"
                    value={config.clusterToken || ''}
                    onChange={(e) => handleConfigChange('clusterToken', e.target.value)}
                    placeholder="Authentication token from cluster admin"
                  />
                </div>
              </>
            )}
          </form>

          {error && <div className="error-message">{error}</div>}

          <div className="setup-buttons">
            <button
              className="btn-primary"
              onClick={handleStartDeployment}
              disabled={loading}
            >
              {loading ? 'Preparing...' : (selectedType === 'local' || selectedType === 'hybrid') ? 'Start Deployment' : 'Complete Setup'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // STEP 5: Deployment Progress
  if (step === 'deploying') {
    return (
      <div className="setup-wizard">
        <div className="setup-container">
          <h1>Deploying Services</h1>
          <p className="setup-subtitle">Setting up your AlloFlow environment</p>

          {deploymentProgress && (
            <div className="deployment-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{width: deploymentProgress.progress + '%'}}
                />
              </div>
              <p className="progress-status">{deploymentProgress.status}</p>
              <p className="progress-phase">{deploymentProgress.phase}</p>
            </div>
          )}

          {gpuStatus && gpuStatus.warning && (
            <div className="warning-box" style={{
              background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px',
              padding: '16px', margin: '16px 0', color: '#856404'
            }}>
              <p style={{fontWeight: 'bold', margin: '0 0 8px 0'}}>⚠️ GPU Warning</p>
              <p style={{margin: 0}}>{gpuStatus.warning}</p>
            </div>
          )}

          <div className="info-box">
            <p>⏳ This may take several minutes on first run as services are downloaded and initialized.</p>
            <p style={{marginTop: '10px'}}>Please don't close this window during setup.</p>
          </div>

          {error && <div className="error-message">{error}</div>}
        </div>
      </div>
    );
  }

  // STEP 6: Success
  if (step === 'success') {
    const deployment = DEPLOYMENT_TYPES.find(d => d.id === selectedType);
    const fluxSelected = selectedServices.includes('flux');
    const gpuAccelerated = gpuStatus && gpuStatus.gpu_accelerated;
    const cpuFallback = fluxSelected && gpuStatus && gpuStatus.gpu_accelerated === false;

    return (
      <div className="setup-wizard">
        <div className="setup-container success">
          <div className="success-icon">✓</div>
          <h1>Setup Complete!</h1>
          <p className="setup-subtitle">AlloFlow is configured with {deployment.label} deployment</p>

          <div className="success-details">
            <p>Your configuration has been saved to:</p>
            <code>~/.alloflow/config.json</code>
          </div>

          {(selectedType === 'local' || selectedType === 'hybrid') && (
            <div className="info-box">
              <p>Services are running natively on your machine.</p>
              <p style={{marginTop: '10px'}}>Data stored in <code>~/.alloflow/</code></p>
            </div>
          )}

          {fluxSelected && gpuAccelerated && (
            <div style={{
              background: '#d4edda', border: '1px solid #28a745', borderRadius: '8px',
              padding: '16px', margin: '16px 0', color: '#155724'
            }}>
              <p style={{fontWeight: 'bold', margin: '0 0 8px 0'}}>🟢 Flux is using GPU acceleration</p>
              <p style={{margin: 0}}>
                Device: {gpuStatus.device || 'GPU'}{gpuStatus.gpu_name ? ` (${gpuStatus.gpu_name})` : ''}
              </p>
            </div>
          )}

          {cpuFallback && (
            <div style={{
              background: '#f8d7da', border: '1px solid #dc3545', borderRadius: '8px',
              padding: '16px', margin: '16px 0', color: '#721c24'
            }}>
              <p style={{fontWeight: 'bold', margin: '0 0 8px 0'}}>🔴 Flux is running on CPU only</p>
              <p style={{margin: '0 0 8px 0'}}>
                Image generation will be very slow without GPU acceleration.
              </p>
              {gpuStatus.fallback_reason && (
                <p style={{margin: '0 0 8px 0', fontSize: '0.9em'}}>
                  Reason: {gpuStatus.fallback_reason}
                </p>
              )}
              {gpuStatus.warning && (
                <p style={{margin: 0, fontSize: '0.9em'}}>
                  {gpuStatus.warning}
                </p>
              )}
            </div>
          )}

          {fluxSelected && gpuStatus && gpuStatus.warning && !cpuFallback && (
            <div style={{
              background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px',
              padding: '16px', margin: '16px 0', color: '#856404'
            }}>
              <p style={{fontWeight: 'bold', margin: '0 0 8px 0'}}>⚠️ GPU Note</p>
              <p style={{margin: 0}}>{gpuStatus.warning}</p>
            </div>
          )}

          <div className="info-box">
            <p>Launching dashboard...</p>
          </div>

          {webAppUrl && (
            <div style={{
              background: '#e8f4fd', border: '1px solid #0ea5e9', borderRadius: '8px',
              padding: '16px', margin: '16px 0', color: '#0c4a6e', textAlign: 'center'
            }}>
              <p style={{fontWeight: 'bold', margin: '0 0 8px 0'}}>🌐 AlloFlow is running locally</p>
              <p style={{margin: '0 0 8px 0'}}>
                Open <a href={webAppUrl} target="_blank" rel="noopener noreferrer"
                  style={{color: '#0ea5e9', fontWeight: 'bold'}}>{webAppUrl}</a> in your browser
              </p>
              <p style={{margin: 0, fontSize: '0.85em', color: '#64748b'}}>
                The app is auto-configured to use your local AI services
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
