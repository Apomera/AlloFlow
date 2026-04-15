import React, { useState } from 'react';

const DEPLOYMENT_TYPES = [
  {
    id: 'local',
    label: 'New Installation',
    description: 'Full local setup — AI services run natively on your machine',
    icon: '🏠',
    requires: [],
    needsLocal: true
  },
  {
    id: 'cluster',
    label: 'Join Existing Cluster',
    description: 'Connect to existing AlloFlow instance in your network',
    icon: '🌐',
    requires: ['clusterIP', 'clusterPort', 'clusterToken'],
    needsLocal: false
  }
];

const AI_PROVIDER_SERVICES = ['llm-engine', 'gemini', 'copilot'];
const IMAGE_PROVIDER_SERVICES = ['flux', 'gemini', 'copilot'];

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
  const [geminiAuthDone, setGeminiAuthDone] = useState(false);
  const [geminiEmail, setGeminiEmail] = useState('');
  const [geminiClientId, setGeminiClientId] = useState(process.env.REACT_APP_GEMINI_CLIENT_ID || '');
  const [geminiClientSecret, setGeminiClientSecret] = useState(process.env.REACT_APP_GEMINI_CLIENT_SECRET || '');
  const [geminiConnecting, setGeminiConnecting] = useState(false);
  const [copilotAuthDone, setCopilotAuthDone] = useState(false);
  const [copilotEmail, setCopilotEmail] = useState('');
  const [copilotClientId, setCopilotClientId] = useState('');
  const [copilotTenantId, setCopilotTenantId] = useState('');
  const [copilotEndpoint, setCopilotEndpoint] = useState('');
  const [copilotConnecting, setCopilotConnecting] = useState(false);
  const [selectedAiProvider, setSelectedAiProvider] = useState('llm-engine');

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

  // Select AI provider — radio behavior, mutually exclusive
  const selectAiProvider = (providerId) => {
    console.log('[SetupWizard] Selected AI provider:', providerId);
    setSelectedAiProvider(providerId);
    // Remove all AI provider services, then add the selected one
    let updated = selectedServices.filter(s => !AI_PROVIDER_SERVICES.includes(s));
    updated.push(providerId);
    // When switching to a cloud provider, clear image provider selection (images bundled)
    if (providerId !== 'llm-engine') {
      updated = updated.filter(s => !IMAGE_PROVIDER_SERVICES.includes(s) || s === providerId);
    }
    setSelectedServices(updated);
  };

  // Toggle image provider — radio behavior (only when Local AI engine)
  const selectImageProvider = (serviceId) => {
    console.log('[SetupWizard] Selected image provider:', serviceId);
    if (selectedServices.includes(serviceId)) {
      // Deselect — no image provider
      setSelectedServices(selectedServices.filter(s => !IMAGE_PROVIDER_SERVICES.includes(s)));
    } else {
      setSelectedServices([
        ...selectedServices.filter(s => !IMAGE_PROVIDER_SERVICES.includes(s)),
        serviceId
      ]);
    }
  };

  // Toggle add-on service (checkbox behavior)
  const toggleService = (serviceId) => {
    console.log('[SetupWizard] Toggling service:', serviceId);
    if (selectedServices.includes(serviceId)) {
      setSelectedServices(selectedServices.filter(s => s !== serviceId));
    } else {
      setSelectedServices([...selectedServices, serviceId]);
    }
  };

  //Handle services confirmation
  const handleConfirmServices = async () => {
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
      if (selectedType === 'local') {
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
      // For cluster, just save config
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
    const addOnServices = services.filter(s => !AI_PROVIDER_SERVICES.includes(s.id) && !IMAGE_PROVIDER_SERVICES.includes(s.id));

    return (
      <div className="setup-wizard">
        <div className="setup-container">
          <button className="back-button" onClick={() => setStep('hardware')}>← Back</button>
          
          <h1>Select Services</h1>
          <p className="setup-subtitle">Choose your AI engine and services</p>

          {/* Section 1: AI Engine (radio, mutually exclusive) */}
          <div style={{marginBottom: '20px'}}>
            <p style={{margin: '0 0 8px 0', fontSize: '0.85rem', color: '#666', fontWeight: 600}}>🧠 AI Engine — choose one</p>
            <div className="services-grid">
              {[
                { id: 'llm-engine', name: 'Local AI (LM Studio)', icon: '🦙', description: 'Run LLMs locally on your machine using llama.cpp. No internet needed after setup.' },
                { id: 'gemini', name: 'Google Gemini', icon: '✨', description: 'Cloud AI via Google Gemini — text + image generation. Requires Google sign-in.' },
                { id: 'copilot', name: 'Microsoft Copilot', icon: '🤖', description: 'Cloud AI via Azure OpenAI — text + DALL-E images. Requires Microsoft Entra ID sign-in.' },
              ].map(provider => {
                const isSelected = selectedAiProvider === provider.id;
                return (
                  <div
                    key={provider.id}
                    className={`service-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => selectAiProvider(provider.id)}
                  >
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                      <span className="service-icon">{provider.icon}</span>
                      <input type="radio" name="aiProvider" checked={isSelected} onChange={() => {}} style={{cursor: 'pointer'}} />
                    </div>
                    <h3>{provider.name}</h3>
                    <p className="service-description">{provider.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Image Generation (radio, only when Local AI engine) */}
          {selectedAiProvider === 'llm-engine' && services.some(s => IMAGE_PROVIDER_SERVICES.includes(s.id)) && (
            <div style={{marginBottom: '20px'}}>
              <div style={{borderTop: '1px solid #ddd', paddingTop: '12px', marginTop: '4px'}}>
                <p style={{margin: '0 0 8px 0', fontSize: '0.85rem', color: '#666', fontWeight: 600}}>🎨 Image Generation — choose one (optional)</p>
              </div>
              <div className="services-grid">
                {[
                  { id: 'flux', name: 'Local Flux', icon: '🎨', description: 'AI image generation on your GPU. Requires dedicated GPU with 8GB+ VRAM.' },
                  { id: 'gemini', name: 'Google Gemini', icon: '✨', description: 'Cloud image generation via Google AI. Free tier: ~15 images/day.' },
                  { id: 'copilot', name: 'Microsoft Copilot (DALL-E)', icon: '🤖', description: 'Cloud image generation via Azure OpenAI DALL-E 3.' },
                ].filter(p => services.some(s => s.id === p.id || (p.id !== 'llm-engine'))).map(provider => {
                  const isSelected = selectedServices.includes(provider.id) && selectedAiProvider !== provider.id;
                  return (
                    <div
                      key={provider.id}
                      className={`service-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => selectImageProvider(provider.id)}
                    >
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                        <span className="service-icon">{provider.icon}</span>
                        <input type="radio" name="imageProvider" checked={isSelected} onChange={() => {}} style={{cursor: 'pointer'}} />
                      </div>
                      <h3>{provider.name}</h3>
                      <p className="service-description">{provider.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 3: Add-on Services (checkboxes) */}
          {addOnServices.length > 0 && (
            <div style={{marginBottom: '20px'}}>
              <div style={{borderTop: '1px solid #ddd', paddingTop: '12px', marginTop: '4px'}}>
                <p style={{margin: '0 0 8px 0', fontSize: '0.85rem', color: '#666', fontWeight: 600}}>📦 Additional Services</p>
              </div>
              <div className="services-grid">
                {addOnServices.map(service => {
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
                          <input type="checkbox" checked={isSelected} onChange={() => {}} style={{cursor: 'pointer'}} />
                        )}
                        {isDisabled && (
                          <span style={{fontSize: '0.8rem', color: '#999'}}>Required</span>
                        )}
                      </div>
                      <h3>{service.name}</h3>
                      <p className="service-description">{service.description}</p>
                      {service.resources && service.resources.minRAM > 0 && (
                        <p className="service-resources">
                          Requires: {service.resources.minRAM}MB RAM, {service.resources.minDisk}MB disk
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="setup-buttons">
            <button
              className="btn-primary"
              onClick={handleConfirmServices}
              disabled={loading}
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
          <button className="back-button" onClick={() => {
            if (hardware) {
              setStep('services');
            } else {
              setStep('deployment');
            }
          }}>← Back</button>
          
          <h1>Configure {deployment.label}</h1>
          <p className="setup-subtitle">{deployment.description}</p>

          <form className="setup-form">
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

                {/* LM Studio — model download + server setup guidance */}
                {selectedAiProvider === 'llm-engine' && (
                  <div className="info-box" style={{borderColor: '#7c3aed', backgroundColor: 'rgba(124,58,237,0.05)', marginTop: '16px'}}>
                    <strong>🦙 LM Studio — you must download a model after setup</strong>
                    <p style={{fontSize: '0.9rem', marginTop: '6px', marginBottom: '10px'}}>
                      AlloFlow will install and launch LM Studio, but <strong>AI features won't work until you download a model and start the local server.</strong> This takes about 5 minutes.
                    </p>
                    <div style={{display: 'grid', gap: '10px'}}>
                      <div style={{padding: '8px 10px', background: 'rgba(124,58,237,0.06)', borderRadius: '6px', border: '1px solid rgba(124,58,237,0.2)'}}>
                        <strong>Steps to complete after setup finishes:</strong>
                        <ol style={{margin: '6px 0 0 0', paddingLeft: '18px', lineHeight: 1.8}}>
                          <li>Open <strong>LM Studio</strong> (it will appear in your taskbar after setup)</li>
                          <li>Click the <strong>Discover</strong> tab (🔍 icon in the left sidebar)</li>
                          <li>Search for one of the recommended models below and click <strong>Download</strong></li>
                          <li>Wait for the download to complete (model files are 4–8 GB)</li>
                          <li>Click the <strong>Local Server</strong> tab (⇄ icon in the left sidebar)</li>
                          <li>In the model dropdown at the top, select your downloaded model</li>
                          <li>Click <strong>"Start Server"</strong> — the status indicator should turn green</li>
                          <li>Confirm it shows <strong>port 1234</strong> — AlloFlow connects here</li>
                        </ol>
                      </div>
                      <div style={{padding: '8px 10px', background: 'rgba(124,58,237,0.06)', borderRadius: '6px', border: '1px solid rgba(124,58,237,0.2)'}}>
                        <strong>Recommended models{hardware ? ` for ${hardware.tierProfile?.label || 'your system'}` : ''}:</strong>
                        <ul style={{margin: '6px 0 0 0', paddingLeft: '18px', lineHeight: 1.8}}>
                          {hardware?.tier === 'entryLevel' && <>
                            <li><strong>Phi-3.5-mini-instruct (Q4_K_M)</strong> — Best for low-RAM systems, fast ✓ Recommended</li>
                            <li><strong>Llama-3.2-1B-Instruct (Q8)</strong> — Smallest/fastest, minimal RAM needed</li>
                          </>}
                          {hardware?.tier === 'midRange' && <>
                            <li><strong>Mistral-7B-Instruct-v0.3 (Q4_K_M)</strong> — Best overall balance ✓ Recommended</li>
                            <li><strong>Llama-3.1-8B-Instruct (Q4_K_M)</strong> — Excellent instruction following</li>
                          </>}
                          {(hardware?.tier === 'workstation') && <>
                            <li><strong>Mistral-7B-Instruct-v0.3 (Q4_K_M)</strong> — Best overall balance ✓ Recommended</li>
                            <li><strong>Meta-Llama-3.1-8B-Instruct (Q8_0)</strong> — High quality full precision</li>
                            <li><strong>Llama-3.3-70B-Instruct (Q4_K_M)</strong> — Best quality, requires 48GB+ RAM</li>
                          </>}
                          {!hardware?.tier && <>
                            <li><strong>Mistral-7B-Instruct-v0.3 (Q4_K_M)</strong> — Best overall balance ✓ Recommended</li>
                            <li><strong>Phi-3.5-mini-instruct (Q4_K_M)</strong> — Faster, lower RAM requirement</li>
                          </>}
                        </ul>
                      </div>
                      <div style={{padding: '8px 10px', background: 'rgba(245,158,11,0.08)', borderRadius: '6px', border: '1px solid rgba(245,158,11,0.3)'}}>
                        <strong>⚠ The LM Studio Local Server must be running on port 1234 each time you use AlloFlow.</strong>
                        <p style={{margin: '4px 0 0 0', fontSize: '0.85rem'}}>
                          Tip: In LM Studio → Settings, enable <strong>"Start server on app launch"</strong> so it starts automatically.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Flux — model download info */}
                {config.selectedServices?.includes('flux') && (
                  <div className="info-box" style={{borderColor: '#db2777', backgroundColor: 'rgba(219,39,119,0.05)', marginTop: '16px'}}>
                    <strong>🎨 Flux Image Generation — what gets downloaded</strong>
                    <p style={{fontSize: '0.9rem', marginTop: '6px', marginBottom: '10px'}}>
                      AlloFlow will automatically download the Flux model during deployment. No manual steps needed — but here's what to expect:
                    </p>
                    <div style={{display: 'grid', gap: '10px'}}>
                      <div style={{padding: '8px 10px', background: 'rgba(219,39,119,0.06)', borderRadius: '6px', border: '1px solid rgba(219,39,119,0.2)'}}>
                        <strong>Model downloaded automatically:</strong>
                        <ul style={{margin: '6px 0 0 0', paddingLeft: '18px', lineHeight: 1.8}}>
                          <li><strong>FLUX.1-schnell (GGUF Q5_K_S)</strong> — ~3.8 GB download, fast 4-step generation</li>
                          <li>Saved to <code>~/.alloflow/models/flux/</code></li>
                          <li>GPU: ~5 sec per image &nbsp;|&nbsp; CPU fallback: ~2 min per image</li>
                        </ul>
                      </div>
                      <div style={{padding: '8px 10px', background: 'rgba(219,39,119,0.06)', borderRadius: '6px', border: '1px solid rgba(219,39,119,0.2)'}}>
                        <strong>GPU requirements for real-time generation:</strong>
                        <ul style={{margin: '6px 0 0 0', paddingLeft: '18px', lineHeight: 1.8}}>
                          <li>NVIDIA: 8 GB+ VRAM (GTX 1080 Ti / RTX series)</li>
                          <li>AMD: 8 GB+ VRAM with ROCm (RX 6800 or newer)</li>
                          <li>Apple Silicon: 16 GB+ unified memory (M1 Pro or better)</li>
                          <li>CPU fallback: Works but ~2 min per image</li>
                        </ul>
                      </div>
                      <p style={{margin: 0, fontSize: '0.85rem', color: '#666'}}>
                        The download happens during the <strong>Deploying Services</strong> step and may take several minutes. Progress is shown on screen.
                      </p>
                    </div>
                  </div>
                )}

                {/* Gemini OAuth — show when Gemini is selected as AI provider or image provider */}
                {(selectedAiProvider === 'gemini' || (selectedAiProvider === 'llm-engine' && config.selectedServices?.includes('gemini'))) && (
                  <div className="info-box" style={{borderColor: '#4285f4', backgroundColor: 'rgba(66,133,244,0.05)'}}>
                    <strong>✨ Google Gemini — Sign in (optional)</strong>
                    <p style={{fontSize: '0.9rem', marginTop: '6px', marginBottom: '10px'}}>
                      Sign in now so AI features work immediately after setup. You can also authenticate later via Settings → AI Config.
                    </p>
                    {geminiAuthDone ? (
                      <p style={{color: '#28a745', fontWeight: 600, margin: 0}}>
                        ✓ Signed in{geminiEmail ? ` as ${geminiEmail}` : ''}
                      </p>
                    ) : (
                      <>
                        <div style={{display: 'grid', gap: '8px', marginBottom: '10px'}}>
                          <input
                            type="text"
                            value={geminiClientId}
                            onChange={e => setGeminiClientId(e.target.value)}
                            placeholder="Google OAuth Client ID"
                            style={{width: '100%', fontFamily: 'monospace', fontSize: '0.85rem'}}
                          />
                          <input
                            type="password"
                            value={geminiClientSecret}
                            onChange={e => setGeminiClientSecret(e.target.value)}
                            placeholder="Client Secret"
                            style={{width: '100%', fontFamily: 'monospace', fontSize: '0.85rem'}}
                          />
                        </div>
                        <button
                          type="button"
                          className="btn-primary"
                          disabled={!geminiClientId || geminiConnecting}
                          onClick={async () => {
                            setGeminiConnecting(true);
                            try {
                              await window.alloAPI.writeAIConfig({ aiProvider: selectedAiProvider === 'gemini' ? 'gemini' : undefined, imageProvider: 'gemini', googleClientId: geminiClientId.trim(), googleClientSecret: geminiClientSecret.trim() });
                              const result = await window.alloAPI?.geminiOAuth?.start?.();
                              if (result?.success) {
                                setGeminiAuthDone(true);
                                setGeminiEmail(result.email || '');
                              } else {
                                alert('Sign-in failed: ' + (result?.error || 'Unknown error'));
                              }
                            } finally {
                              setGeminiConnecting(false);
                            }
                          }}
                        >
                          {geminiConnecting ? 'Opening browser...' : 'Sign in with Google'}
                        </button>
                        <details style={{marginTop: '10px'}} open={!geminiClientId}>
                          <summary style={{fontSize: '0.8rem', color: '#888', cursor: 'pointer', fontWeight: 600}}>
                            {geminiClientId ? '⚙ Credentials saved — click to review steps' : '⚙ How to get your credentials (4 steps)'}
                          </summary>
                          <div style={{fontSize: '0.8rem', color: '#555', marginTop: '10px', display: 'grid', gap: '10px'}}>

                            <div style={{padding: '8px 10px', background: 'rgba(66,133,244,0.06)', borderRadius: '6px', border: '1px solid rgba(66,133,244,0.2)'}}>
                              <strong>Step 1 — Create a Google Cloud project</strong>
                              <ol style={{margin: '6px 0 8px 0', paddingLeft: '18px', lineHeight: 1.7}}>
                                <li>Click <strong>Open Console</strong> below and sign in with your Google account</li>
                                <li>Click the project dropdown at the top → <strong>New Project</strong></li>
                                <li>Name it anything (e.g. <em>AlloFlow</em>) → <strong>Create</strong></li>
                                <li>Make sure the new project is selected in the top bar</li>
                              </ol>
                              <button type="button" style={{fontSize: '0.75rem', padding: '3px 10px', cursor: 'pointer'}}
                                onClick={() => window.alloAPI?.openExternal('https://console.cloud.google.com/projectcreate')}>
                                Open Console ↗
                              </button>
                            </div>

                            <div style={{padding: '8px 10px', background: 'rgba(66,133,244,0.06)', borderRadius: '6px', border: '1px solid rgba(66,133,244,0.2)'}}>
                              <strong>Step 2 — Enable the Generative Language API</strong>
                              <ol style={{margin: '6px 0 8px 0', paddingLeft: '18px', lineHeight: 1.7}}>
                                <li>Click <strong>Open API Library</strong> below</li>
                                <li>Confirm your new project is selected at the top</li>
                                <li>Click the blue <strong>Enable</strong> button</li>
                              </ol>
                              <button type="button" style={{fontSize: '0.75rem', padding: '3px 10px', cursor: 'pointer'}}
                                onClick={() => window.alloAPI?.openExternal('https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com')}>
                                Open API Library ↗
                              </button>
                            </div>

                            <div style={{padding: '8px 10px', background: 'rgba(66,133,244,0.06)', borderRadius: '6px', border: '1px solid rgba(66,133,244,0.2)'}}>
                              <strong>Step 3 — Configure the OAuth consent screen (IMPORTANT)</strong>
                              <ol style={{margin: '6px 0 8px 0', paddingLeft: '18px', lineHeight: 1.7}}>
                                <li>Click <strong>Open Consent Screen</strong> below</li>
                                <li>Choose <strong>External</strong> → <strong>Create</strong></li>
                                <li>Fill in <strong>App name</strong> (e.g. <em>AlloFlow</em>) and your email → <strong>Save and Continue</strong></li>
                                <li>Skip the Scopes page → <strong>Save and Continue</strong></li>
                                <li><strong style={{color: '#d32f2f'}}>MUST DO:</strong> Click <strong>Open Test Users</strong> below → click <strong>+ Add users</strong> and add your own Gmail address (the one you'll use to sign in to AlloFlow) → <strong>Save and Continue</strong></li>
                                <li>Go back to Dashboard</li>
                              </ol>
                              <div style={{display: 'grid', gap: '6px', gridTemplateColumns: '1fr 1fr'}}>
                                <button type="button" style={{fontSize: '0.75rem', padding: '3px 10px', cursor: 'pointer'}}
                                  onClick={() => window.alloAPI?.openExternal('https://console.cloud.google.com/apis/credentials/consent')}>
                                  Open Consent Screen ↗
                                </button>
                                <button type="button" style={{fontSize: '0.75rem', padding: '3px 10px', cursor: 'pointer', background: '#d32f2f', color: 'white', border: 'none', borderRadius: '4px'}}
                                  onClick={() => window.alloAPI?.openExternal('https://console.cloud.google.com/auth/audience')}>
                                  Open Test Users ↗
                                </button>
                              </div>
                            </div>

                            <div style={{padding: '8px 10px', background: 'rgba(66,133,244,0.06)', borderRadius: '6px', border: '1px solid rgba(66,133,244,0.2)'}}>
                              <strong>Step 4 — Create OAuth credentials</strong>
                              <ol style={{margin: '6px 0 8px 0', paddingLeft: '18px', lineHeight: 1.7}}>
                                <li>Click <strong>Open Credentials</strong> below</li>
                                <li>Click <strong>+ Create Credentials</strong> → <strong>OAuth client ID</strong></li>
                                <li>Application type: <strong>Desktop app</strong> → <strong>Create</strong></li>
                                <li>A popup shows your <strong>Client ID</strong> and <strong>Client secret</strong> — paste them in the fields above</li>
                              </ol>
                              <button type="button" style={{fontSize: '0.75rem', padding: '3px 10px', cursor: 'pointer'}}
                                onClick={() => window.alloAPI?.openExternal('https://console.cloud.google.com/apis/credentials')}>
                                Open Credentials ↗
                              </button>
                            </div>

                            <div style={{padding: '8px 10px', background: 'rgba(245,158,11,0.08)', borderRadius: '6px', border: '1px solid rgba(245,158,11,0.3)'}}>
                              <strong>⚠ School Google Workspace account?</strong><br/>
                              Your IT admin needs to approve the app once: <strong>admin.google.com</strong> → Security → Access and data control → API controls → Manage third-party app access → Add app → search by Client ID → set to <strong>Trusted</strong>.
                            </div>

                            <div style={{padding: '10px', background: 'rgba(211,47,47,0.08)', borderRadius: '6px', border: '1px solid rgba(211,47,47,0.3)'}}>
                              <strong style={{color: '#d32f2f'}}>⚠ Getting "Error 403: access_denied"?</strong><br/>
                              <span style={{fontSize: '0.85rem', color: '#555'}}>You did not add yourself as a Test User in Step 3. Go back and complete Step 3, item 5 (click <strong>+ Add users</strong> and add your email), then try signing in again.</span>
                            </div>
                          </div>
                        </details>
                      </>
                    )}
                  </div>
                )}

                {/* Copilot OAuth — show when Copilot is selected as AI provider or image provider */}
                {(selectedAiProvider === 'copilot' || (selectedAiProvider === 'llm-engine' && config.selectedServices?.includes('copilot'))) && (
                  <div className="info-box" style={{borderColor: '#0078d4', backgroundColor: 'rgba(0,120,212,0.05)'}}>
                    <strong>🤖 Microsoft Copilot — Sign in (optional)</strong>
                    <p style={{fontSize: '0.9rem', marginTop: '6px', marginBottom: '10px'}}>
                      Sign in with your Microsoft organization account. You can also authenticate later via Settings → AI Config.
                    </p>
                    {copilotAuthDone ? (
                      <p style={{color: '#28a745', fontWeight: 600, margin: 0}}>
                        ✓ Signed in{copilotEmail ? ` as ${copilotEmail}` : ''}
                      </p>
                    ) : (
                      <>
                        <div style={{display: 'grid', gap: '8px', marginBottom: '10px'}}>
                          <input
                            type="text"
                            value={copilotClientId}
                            onChange={e => setCopilotClientId(e.target.value)}
                            placeholder="Entra App (Client) ID"
                            style={{width: '100%', fontFamily: 'monospace', fontSize: '0.85rem'}}
                          />
                          <input
                            type="text"
                            value={copilotTenantId}
                            onChange={e => setCopilotTenantId(e.target.value)}
                            placeholder="Directory (Tenant) ID"
                            style={{width: '100%', fontFamily: 'monospace', fontSize: '0.85rem'}}
                          />
                          <input
                            type="text"
                            value={copilotEndpoint}
                            onChange={e => setCopilotEndpoint(e.target.value)}
                            placeholder="Azure OpenAI Endpoint (https://YOUR-RESOURCE.openai.azure.com)"
                            style={{width: '100%', fontFamily: 'monospace', fontSize: '0.85rem'}}
                          />
                        </div>
                        <button
                          type="button"
                          className="btn-primary"
                          disabled={!copilotClientId || !copilotTenantId || !copilotEndpoint || copilotConnecting}
                          onClick={async () => {
                            setCopilotConnecting(true);
                            try {
                              await window.alloAPI.writeAIConfig({
                                copilot: { clientId: copilotClientId.trim(), tenantId: copilotTenantId.trim(), endpoint: copilotEndpoint.trim() }
                              });
                              const result = await window.alloAPI?.copilotOAuth?.start?.();
                              if (result?.success) {
                                setCopilotAuthDone(true);
                                setCopilotEmail(result.email || '');
                              } else {
                                alert('Sign-in failed: ' + (result?.error || 'Unknown error'));
                              }
                            } finally {
                              setCopilotConnecting(false);
                            }
                          }}
                        >
                          {copilotConnecting ? 'Opening browser...' : 'Sign in with Microsoft'}
                        </button>
                        <details style={{marginTop: '10px'}}>
                          <summary style={{fontSize: '0.8rem', color: '#888', cursor: 'pointer'}}>Setup instructions (IT Admin + Teacher)</summary>
                          <div style={{fontSize: '0.8rem', color: '#888', marginTop: '8px'}}>
                            <p style={{margin: '0 0 8px 0'}}><strong>IT Admin (one-time setup):</strong></p>
                            <ol style={{margin: '0 0 12px 0', paddingLeft: '20px'}}>
                              <li>Go to <strong>portal.azure.com</strong> → create an Azure OpenAI resource</li>
                              <li>Deploy <strong>gpt-4o</strong> and <strong>dall-e-3</strong> models</li>
                              <li>Go to <strong>entra.microsoft.com</strong> → App registrations → New registration</li>
                              <li>Set redirect URI: <code>http://127.0.0.1</code> (type: Mobile/Desktop)</li>
                              <li>API permissions → Add <strong>Azure Cognitive Services → user_impersonation</strong> → Grant admin consent</li>
                              <li>On the Azure OpenAI resource → IAM → Add <strong>Cognitive Services OpenAI User</strong> role for teachers</li>
                            </ol>
                            <p style={{margin: '0 0 4px 0'}}><strong>Teacher:</strong></p>
                            <p style={{margin: 0}}>Enter the App Client ID, Tenant ID, and Azure OpenAI Endpoint from your IT admin, then click "Sign in with Microsoft".</p>
                          </div>
                        </details>
                      </>
                    )}
                  </div>
                )}
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
              {loading ? 'Preparing...' : selectedType === 'local' ? 'Start Deployment' : 'Complete Setup'}
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
              <p className="progress-status" style={{whiteSpace: 'pre-line'}}>{deploymentProgress.status}</p>
              <p className="progress-phase">{deploymentProgress.phase}</p>
            </div>
          )}

          {deploymentProgress && deploymentProgress.phase === 'models' && (
            <div className="info-box" style={{marginTop: '12px'}}>
              {config.selectedModels && config.selectedModels.length > 0 && (
                <>
                  <strong>LLM models queued:</strong>
                  <ul style={{margin: '8px 0 0 0', paddingLeft: '20px'}}>
                    {config.selectedModels.map(m => (
                      <li key={m} style={{marginBottom: '4px'}}>
                        {deploymentProgress.status && deploymentProgress.status.includes(m) ? '⬇️' : '⏳'} {m}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {config.fluxModel && (
                <>
                  {config.selectedModels && config.selectedModels.length > 0 && <div style={{marginTop: '12px'}} />}
                  <strong>Flux variant:</strong>
                  <p style={{margin: '4px 0 0 0'}}>{config.fluxModel}</p>
                </>
              )}
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

          {selectedType === 'local' && (
            <div className="info-box">
              <p>Services are running natively on your machine.</p>
              <p style={{marginTop: '10px'}}>Data stored in <code>~/.alloflow/</code></p>
            </div>
          )}

          {selectedType === 'local' && selectedAiProvider === 'llm-engine' && (
            <div className="info-box" style={{borderColor: '#7c3aed', background: 'rgba(124,58,237,0.05)', marginTop: '16px'}}>
              <strong>🦙 Required next step: load a model in LM Studio</strong>
              <p style={{fontSize: '0.9rem', marginTop: '6px', marginBottom: '8px'}}>
                AlloFlow AI features are offline until you complete these steps:
              </p>
              <ol style={{margin: '0', paddingLeft: '20px', lineHeight: 1.8, fontSize: '0.9rem'}}>
                <li>Open <strong>LM Studio</strong> (check your taskbar — it launched during setup)</li>
                <li><strong>Discover</strong> tab → search <em>"Mistral 7B Instruct"</em> → click <strong>Download</strong></li>
                <li>Wait for the download to complete (4–8 GB)</li>
                <li><strong>Local Server</strong> tab → select your model → click <strong>"Start Server"</strong></li>
                <li>Confirm green status on <strong>port 1234</strong> — AlloFlow will connect automatically</li>
              </ol>
              <p style={{margin: '10px 0 0 0', fontSize: '0.85rem', color: '#555'}}>
                💡 In LM Studio Settings, enable <strong>"Start server on app launch"</strong> to avoid repeating this step every reboot.
              </p>
            </div>
          )}

          {selectedType === 'local' && selectedServices.includes('flux') && (
            <div className="info-box" style={{borderColor: '#db2777', background: 'rgba(219,39,119,0.05)', marginTop: '16px'}}>
              <strong>🎨 Flux image generation is ready</strong>
              <p style={{fontSize: '0.9rem', marginTop: '6px'}}>
                The FLUX.1-schnell model was downloaded to <code>~/.alloflow/models/flux/</code>.
                Image generation works automatically — no extra steps needed.
              </p>
              {(!gpuStatus || gpuStatus.gpu_accelerated === false) && (
                <p style={{margin: '8px 0 0 0', fontSize: '0.85rem', color: '#856404'}}>
                  ⚠ Running on <strong>CPU fallback</strong> — each image takes ~2 minutes.
                  For GPU acceleration, ensure your GPU drivers support CUDA, ROCm, or Metal.
                </p>
              )}
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

          {selectedServices.includes('gemini') && (
            <div style={{
              background: geminiAuthDone ? '#d4edda' : '#fff3cd',
              border: `1px solid ${geminiAuthDone ? '#28a745' : '#ffc107'}`,
              borderRadius: '8px', padding: '16px', margin: '16px 0',
              color: geminiAuthDone ? '#155724' : '#856404'
            }}>
              {geminiAuthDone ? (
                <>
                  <p style={{fontWeight: 'bold', margin: '0 0 4px 0'}}>✨ Google Gemini connected</p>
                  {geminiEmail && <p style={{margin: 0, fontSize: '0.9em'}}>{geminiEmail}</p>}
                </>
              ) : (
                <p style={{margin: 0}}>
                  ⚠️ Gemini selected but not authenticated. Sign in via <strong>Settings → AI Config</strong> to activate it.
                </p>
              )}
            </div>
          )}

          {selectedServices.includes('copilot') && (
            <div style={{
              background: copilotAuthDone ? '#d4edda' : '#fff3cd',
              border: `1px solid ${copilotAuthDone ? '#28a745' : '#ffc107'}`,
              borderRadius: '8px', padding: '16px', margin: '16px 0',
              color: copilotAuthDone ? '#155724' : '#856404'
            }}>
              {copilotAuthDone ? (
                <>
                  <p style={{fontWeight: 'bold', margin: '0 0 4px 0'}}>🤖 Microsoft Copilot connected</p>
                  {copilotEmail && <p style={{margin: 0, fontSize: '0.9em'}}>{copilotEmail}</p>}
                </>
              ) : (
                <p style={{margin: 0}}>
                  ⚠️ Copilot selected but not authenticated. Sign in via <strong>Settings → AI Config</strong> to activate it.
                </p>
              )}
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
