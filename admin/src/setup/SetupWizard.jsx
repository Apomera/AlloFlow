import React, { useState, useEffect } from 'react';
import { Check, AlertCircle, Server, Users, Download, Eye, EyeOff } from 'lucide-react';

export default function SetupWizard({ onComplete }) {
  const [step, setStep] = useState(1);
  const [showApiKey, setShowApiKey] = useState({});
  const [config, setConfig] = useState({
    deploymentMode: 'new', // 'new' | 'join-cluster'
    clusterPrimaryIp: '',
    clusterToken: '',
    dockerInstalled: false,
    dockerInstalling: false,
    aiBackend: 'local', // 'local' | 'cloud' | 'hybrid'
    cloudProvider: 'gemini', // 'gemini' | 'openai' | 'claude'
    apiKeys: { 
      gemini: '', 
      openai: '', 
      claude: '',
      wolfram: ''
    },
    serverIp: '',
    domain: '',
    enableSSL: false,
    gpuType: null, // 'nvidia' | 'amd' | 'none'
    gpuDetecting: false,
    models: {
      text: ['deepseek-r1:1.5b', 'phi3.5'],
      image: false,
      tts: true
    },
    adminEmail: '',
    adminPassword: '',
    installing: false,
    installProgress: 0,
    installStep: ''
  });

  useEffect(() => {
    // Log the current state for debugging
    console.log('SetupWizard step changed to:', step);
    console.log('Current config:', {
      deploymentMode: config.deploymentMode,
      aiBackend: config.aiBackend,
      serverIp: config.serverIp,
      gpuType: config.gpuType
    });
  }, [step, config.deploymentMode, config.aiBackend]);

  useEffect(() => {
    // Check Docker on mount (only for local/hybrid mode)
    if (config.aiBackend !== 'cloud') {
      checkDocker();
    }
    // Auto-fill server IP
    if (window.alloAPI) {
      window.alloAPI.getServerIP().then(ip => {
        if (ip) {
          console.log('Set server IP:', ip);
          setConfig(prev => ({ ...prev, serverIp: ip }));
        }
      }).catch(err => {
        console.error('Failed to get server IP:', err);
      });
      
      // Listen for setup progress updates
      window.alloAPI.onSetupProgress(({ step: installStep, progress }) => {
        setConfig(prev => ({ 
          ...prev, 
          installStep, 
          installProgress: progress 
        }));
      });
      
      window.alloAPI.onSetupError(({ error }) => {
        alert(`Setup error: ${error}`);
        setConfig(prev => ({ ...prev, installing: false }));
      });
    }
  }, []);

  useEffect(() => {
    // Auto-detect GPU when reaching step 3 (only for local/hybrid)
    if (step === 3 && config.aiBackend !== 'cloud' && !config.gpuType && !config.gpuDetecting) {
      detectGPU();
    }
  }, [step]);

  const checkDocker = async () => {
    if (window.alloAPI) {
      const installed = await window.alloAPI.checkDocker();
      setConfig(prev => ({ ...prev, dockerInstalled: installed }));
    }
  };

  const detectGPU = async () => {
    setConfig(prev => ({ ...prev, gpuDetecting: true }));
    if (window.alloAPI) {
      const gpu = await window.alloAPI.detectGPU();
      setConfig(prev => ({ ...prev, gpuType: gpu, gpuDetecting: false }));
    }
  };

  const installDocker = async () => {
    setConfig(prev => ({ ...prev, dockerInstalling: true }));
    if (window.alloAPI) {
      const result = await window.alloAPI.installDocker();
      if (result.success) {
        setConfig(prev => ({ ...prev, dockerInstalled: true, dockerInstalling: false }));
        await checkDocker();
      } else {
        alert(`Docker installation failed: ${result.error}`);
        setConfig(prev => ({ ...prev, dockerInstalling: false }));
      }
    }
  };

  const validateClusterJoin = async () => {
    if (window.alloAPI) {
      const result = await window.alloAPI.validateClusterToken(config.clusterPrimaryIp, config.clusterToken);
      if (result.valid) {
        setStep(8); // Skip to final installation
      } else {
        alert(`Cannot connect to cluster: ${result.error}`);
      }
    }
  };

  const getNextStep = () => {
    // Determine next step based on current step and AI backend choice
    if (step === 4) {
      // After AI Mode selection
      if (config.aiBackend === 'cloud') {
        return 5; // Go directly to API keys
      } else if (config.aiBackend === 'local') {
        return 2; // Go to Docker check (skip API keys)
      } else {
        return 5; // Hybrid: go to API keys
      }
    }
    return step + 1;
  };

  const getPreviousStep = () => {
    if (step === 2 && config.aiBackend === 'cloud') {
      return 4; // From API keys back to AI mode
    }
    if (step === 3 && config.aiBackend === 'cloud') {
      return 2; // From GPU (not shown for cloud) back to API keys
    }
    return step - 1;
  };

  const startInstallation = async () => {
    setConfig(prev => ({ ...prev, installing: true, installProgress: 0 }));
    
    if (window.alloAPI) {
      // Pass all config to main process
      const result = await window.alloAPI.runSetup(config);
      
      if (result.success) {
        onComplete(config);
      } else {
        alert(`Setup failed: ${result.error}`);
        setConfig(prev => ({ ...prev, installing: false }));
      }
    }
  };

  const renderStep = () => {
    switch(step) {
      case 1: return renderDeploymentMode();
      case 2: 
        if (config.deploymentMode === 'join-cluster') {
          return renderClusterJoin();
        } else if (config.aiBackend === 'cloud') {
          return renderAPIKeys();
        } else {
          return renderDockerCheck();
        }
      case 3: return config.aiBackend === 'cloud' ? renderNetworkConfig() : renderGPUDetection();
      case 4: return renderAIMode();
      case 5: return renderAPIKeys();
      case 6: return renderNetworkConfig();
      case 7: return renderModelSelection();
      case 8: return renderAdminAccount();
      case 9: return renderInstallation();
      default: return null;
    }
  };

  const renderDeploymentMode = () => (
    <div className="setup-step">
      <h2>Welcome to AlloFlow Admin Setup</h2>
      <p style={{ marginBottom: '2rem', color: 'var(--color-text-muted)' }}>
        Let's get your AlloFlow server configured in just a few steps.
      </p>

      <div style={{ display: 'grid', gap: '1rem' }}>
        <label
          style={{
            display: 'flex',
            alignItems: 'start',
            gap: '1rem',
            padding: '1.5rem',
            backgroundColor: config.deploymentMode === 'new' ? 'rgba(59, 130, 246, 0.1)' : 'var(--color-bg)',
            borderRadius: '8px',
            border: `2px solid ${config.deploymentMode === 'new' ? 'var(--color-primary)' : 'var(--color-border)'}`,
            cursor: 'pointer'
          }}
        >
          <input
            type="radio"
            name="deploymentMode"
            value="new"
            checked={config.deploymentMode === 'new'}
            onChange={(e) => setConfig({ ...config, deploymentMode: e.target.value })}
            style={{ marginTop: '0.25rem', width: '18px', height: '18px' }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Server size={24} style={{ color: 'var(--color-primary)' }} />
              <h3 style={{ margin: 0 }}>New Deployment</h3>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', margin: 0 }}>
              Set up a new primary AlloFlow server. This will be the main node that manages your AI stack and can have additional buildings added to it later.
            </p>
          </div>
        </label>

        <label
          style={{
            display: 'flex',
            alignItems: 'start',
            gap: '1rem',
            padding: '1.5rem',
            backgroundColor: config.deploymentMode === 'join-cluster' ? 'rgba(59, 130, 246, 0.1)' : 'var(--color-bg)',
            borderRadius: '8px',
            border: `2px solid ${config.deploymentMode === 'join-cluster' ? 'var(--color-primary)' : 'var(--color-border)'}`,
            cursor: 'pointer'
          }}
        >
          <input
            type="radio"
            name="deploymentMode"
            value="join-cluster"
            checked={config.deploymentMode === 'join-cluster'}
            onChange={(e) => setConfig({ ...config, deploymentMode: e.target.value })}
            style={{ marginTop: '0.25rem', width: '18px', height: '18px' }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Users size={24} style={{ color: 'var(--color-success)' }} />
              <h3 style={{ margin: 0 }}>Join Existing Cluster</h3>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', margin: 0 }}>
              Connect this server to an existing AlloFlow cluster as an additional node. You'll need the primary node's IP address and cluster authentication token.
            </p>
          </div>
        </label>
      </div>

      <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" onClick={() => setStep(4)}>
          Continue →
        </button>
      </div>
    </div>
  );

  const renderClusterJoin = () => (
    <div className="setup-step">
      <h2>Join Existing Cluster</h2>
      <p style={{ marginBottom: '2rem', color: 'var(--color-text-muted)' }}>
        Enter the details of your primary AlloFlow node.
      </p>

      <div style={{ display: 'grid', gap: '1.5rem' }}>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>
            Primary Node IP Address
          </label>
          <input
            type="text"
            placeholder="192.168.1.100"
            value={config.clusterPrimaryIp}
            onChange={(e) => setConfig({ ...config, clusterPrimaryIp: e.target.value })}
            style={{ width: '100%' }}
          />
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
            The IP address or domain where your primary AlloFlow server is running
          </p>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>
            Cluster Authentication Token
          </label>
          <input
            type="password"
            placeholder="sk-cluster-..."
            value={config.clusterToken}
            onChange={(e) => setConfig({ ...config, clusterToken: e.target.value })}
            style={{ width: '100%', fontFamily: 'monospace' }}
          />
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
            Found in the primary node's admin dashboard under Cluster → Authentication
          </p>
        </div>

        <div style={{
          padding: '1rem',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderRadius: '6px',
          fontSize: '0.875rem'
        }}>
          <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-primary)' }}>
            💡 How to get your cluster token:
          </div>
          <ol style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--color-text-muted)' }}>
            <li>Open admin dashboard on your primary node</li>
            <li>Go to Cluster tab</li>
            <li>Click "Generate Node Token" or copy existing token</li>
            <li>Paste it here</li>
          </ol>
        </div>
      </div>

      <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
        <button className="btn" onClick={() => setStep(1)}>
          ← Back
        </button>
        <button
          className="btn btn-primary"
          onClick={validateClusterJoin}
          disabled={!config.clusterPrimaryIp || !config.clusterToken}
        >
          Validate & Continue →
        </button>
      </div>
    </div>
  );

  const renderDockerCheck = () => (
    <div className="setup-step">
      <h2>Docker Engine Check</h2>
      <p style={{ marginBottom: '2rem', color: 'var(--color-text-muted)' }}>
        AlloFlow uses Docker to run the local AI stack.
      </p>

      <div style={{
        padding: '2rem',
        backgroundColor: 'var(--color-bg)',
        borderRadius: '8px',
        border: `2px solid ${config.dockerInstalled ? 'var(--color-success)' : 'var(--color-warning)'}`,
        textAlign: 'center'
      }}>
        {config.dockerInstalled ? (
          <>
            <Check size={48} style={{ color: 'var(--color-success)', marginBottom: '1rem' }} />
            <h3 style={{ color: 'var(--color-success)', marginBottom: '0.5rem' }}>Docker is installed!</h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
              Ready to proceed with AI stack setup
            </p>
          </>
        ) : (
          <>
            <AlertCircle size={48} style={{ color: 'var(--color-warning)', marginBottom: '1rem' }} />
            <h3 style={{ color: 'var(--color-warning)', marginBottom: '0.5rem' }}>Docker not detected</h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              AlloFlow can automatically install Docker Engine for you
            </p>
            
            {config.dockerInstalling ? (
              <div>
                <Download className="spin" size={24} style={{ margin: '0 auto 0.5rem' }} />
                <p style={{ fontSize: '0.875rem' }}>Installing Docker Engine...</p>
              </div>
            ) : (
              <button
                className="btn btn-primary"
                onClick={installDocker}
                style={{ minWidth: '200px' }}
              >
                Install Docker Engine
              </button>
            )}
          </>
        )}
      </div>

      {!config.dockerInstalled && (
        <div style={{
          marginTop: '1.5rem',
          padding: '1rem',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          borderRadius: '6px',
          fontSize: '0.875rem'
        }}>
          <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-error)' }}>
            ⚠️ Note: Admin privileges required
          </div>
          <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>
            Docker installation requires administrator/root permissions. You may need to enter your system password.
          </p>
        </div>
      )}

      <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
        <button className="btn" onClick={() => setStep(getPreviousStep())}>
          ← Back
        </button>
        <button
          className="btn btn-primary"
          onClick={() => setStep(3)}
          disabled={!config.dockerInstalled}
        >
          Continue →
        </button>
      </div>
    </div>
  );

  const renderGPUDetection = () => (
    <div className="setup-step">
      <h2>GPU Detection</h2>
      <p style={{ marginBottom: '2rem', color: 'var(--color-text-muted)' }}>
        Detecting graphics card for accelerated image generation...
      </p>

      <div style={{
        padding: '2rem',
        backgroundColor: 'var(--color-bg)',
        borderRadius: '8px',
        border: '1px solid var(--color-border)',
        textAlign: 'center'
      }}>
        {config.gpuDetecting ? (
          <>
            <Download className="spin" size={48} style={{ margin: '0 auto 1rem' }} />
            <p style={{ fontSize: '0.875rem' }}>Scanning for NVIDIA and AMD GPUs...</p>
          </>
        ) : config.gpuType ? (
          <>
            <Check size={48} style={{ color: 'var(--color-success)', marginBottom: '1rem' }} />
            <h3 style={{ color: 'var(--color-success)', marginBottom: '0.5rem' }}>
              {config.gpuType === 'nvidia' ? 'NVIDIA GPU Detected' : 'AMD GPU Detected'}
            </h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
              {config.gpuType === 'nvidia' 
                ? 'Using CUDA for accelerated image generation with Flux'
                : 'Using ROCm for accelerated image generation with Flux'}
            </p>
          </>
        ) : (
          <>
            <AlertCircle size={48} style={{ color: 'var(--color-warning)', marginBottom: '1rem' }} />
            <h3 style={{ color: 'var(--color-warning)', marginBottom: '0.5rem' }}>No GPU detected</h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
              Image generation will use CPU (slower, ~30s per 512x512 image)
            </p>
            <button className="btn btn-primary" onClick={detectGPU}>
              Re-scan for GPU
            </button>
          </>
        )}
      </div>

      {config.gpuType && (
        <div style={{
          marginTop: '1.5rem',
          padding: '1rem',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderRadius: '6px',
          fontSize: '0.875rem'
        }}>
          <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-success)' }}>
            ✓ GPU-Accelerated Features Enabled
          </div>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--color-text-muted)' }}>
            <li>Flux Schnell image generation (512x512 in ~2s)</li>
            <li>Flux Dev image generation (1024x1024 in ~8s)</li>
            <li>Image editing and inpainting</li>
          </ul>
        </div>
      )}

      <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
        <button className="btn" onClick={() => setStep(getPreviousStep())}>
          ← Back
        </button>
        <button className="btn btn-primary" onClick={() => setStep(6)}>
          Continue →
        </button>
      </div>
    </div>
  );

  const renderAIMode = () => (
    <div className="setup-step">
      <h2>AI Backend Configuration</h2>
      <p style={{ marginBottom: '2rem', color: 'var(--color-text-muted)' }}>
        Choose how you want to run AI models. You can change this later.
      </p>

      <div style={{ display: 'grid', gap: '1rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', backgroundColor: config.aiBackend === 'local' ? 'rgba(59, 130, 246, 0.1)' : 'var(--color-bg)', borderRadius: '8px', border: `2px solid ${config.aiBackend === 'local' ? 'var(--color-primary)' : 'var(--color-border)'}`, cursor: 'pointer' }}>
          <input
            type="radio"
            name="aiBackend"
            value="local"
            checked={config.aiBackend === 'local'}
            onChange={(e) => setConfig({ ...config, aiBackend: e.target.value })}
            style={{ width: '18px', height: '18px' }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>💻 Local AI Only</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
              Fully offline, no API keys required. Best for privacy and data security. Requires Docker and model downloads.
            </div>
          </div>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', backgroundColor: config.aiBackend === 'cloud' ? 'rgba(59, 130, 246, 0.1)' : 'var(--color-bg)', borderRadius: '8px', border: `2px solid ${config.aiBackend === 'cloud' ? 'var(--color-primary)' : 'var(--color-border)'}`, cursor: 'pointer' }}>
          <input
            type="radio"
            name="aiBackend"
            value="cloud"
            checked={config.aiBackend === 'cloud'}
            onChange={(e) => setConfig({ ...config, aiBackend: e.target.value })}
            style={{ width: '18px', height: '18px' }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>☁️ Cloud AI Only</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
              Use Gemini/OpenAI/Claude APIs. No local setup required. Requires API keys and internet connection.
            </div>
          </div>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', backgroundColor: config.aiBackend === 'hybrid' ? 'rgba(59, 130, 246, 0.1)' : 'var(--color-bg)', borderRadius: '8px', border: `2px solid ${config.aiBackend === 'hybrid' ? 'var(--color-primary)' : 'var(--color-border)'}`, cursor: 'pointer' }}>
          <input
            type="radio"
            name="aiBackend"
            value="hybrid"
            checked={config.aiBackend === 'hybrid'}
            onChange={(e) => setConfig({ ...config, aiBackend: e.target.value })}
            style={{ width: '18px', height: '18px' }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>🔀 Hybrid Mode</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
              Local first, cloud fallback. Uses local models when available, falls back to cloud APIs when needed. Requires both Docker and API keys.
            </div>
          </div>
        </label>
      </div>

      <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
        <button className="btn" onClick={() => setStep(1)}>
          ← Back
        </button>
        <button className="btn btn-primary" onClick={() => setStep(getNextStep())}>
          Continue →
        </button>
      </div>
    </div>
  );

  const renderAPIKeys = () => (
    <div className="setup-step">
      <h2>Cloud AI API Keys</h2>
      <p style={{ marginBottom: '2rem', color: 'var(--color-text-muted)' }}>
        {config.aiBackend === 'hybrid' 
          ? 'Configure API keys for cloud fallback when local models are overloaded.'
          : 'Configure API keys for cloud-based AI features.'}
      </p>

      <div style={{ display: 'grid', gap: '1.5rem' }}>
        <div style={{
          padding: '1rem',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderRadius: '6px',
          fontSize: '0.875rem'
        }}>
          <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>💡 Get free API keys:</div>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--color-text-muted)' }}>
            <li><strong>Gemini:</strong> Free tier at http://aistudio.google.com</li>
            <li><strong>OpenAI:</strong> Free trial at http://platform.openai.com</li>
            <li><strong>Claude:</strong> Free tier at http://console.anthropic.com</li>
          </ul>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>
            Google Gemini API Key
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type={showApiKey.gemini ? 'text' : 'password'}
              placeholder="AIzaSy..."
              value={config.apiKeys.gemini}
              onChange={(e) => setConfig({ ...config, apiKeys: { ...config.apiKeys, gemini: e.target.value } })}
              style={{ flex: 1, fontFamily: 'monospace' }}
            />
            <button
              className="btn"
              onClick={() => setShowApiKey(prev => ({ ...prev, gemini: !prev.gemini }))}
              style={{ minWidth: 'auto' }}
            >
              {showApiKey.gemini ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
            Optional for quiz generation and content analysis
          </p>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>
            OpenAI API Key
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type={showApiKey.openai ? 'text' : 'password'}
              placeholder="sk-..."
              value={config.apiKeys.openai}
              onChange={(e) => setConfig({ ...config, apiKeys: { ...config.apiKeys, openai: e.target.value } })}
              style={{ flex: 1, fontFamily: 'monospace' }}
            />
            <button
              className="btn"
              onClick={() => setShowApiKey(prev => ({ ...prev, openai: !prev.openai }))}
              style={{ minWidth: 'auto' }}
            >
              {showApiKey.openai ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
            Optional for GPT-based lessons and tutoring
          </p>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>
            Anthropic Claude API Key
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type={showApiKey.claude ? 'text' : 'password'}
              placeholder="sk-ant-..."
              value={config.apiKeys.claude}
              onChange={(e) => setConfig({ ...config, apiKeys: { ...config.apiKeys, claude: e.target.value } })}
              style={{ flex: 1, fontFamily: 'monospace' }}
            />
            <button
              className="btn"
              onClick={() => setShowApiKey(prev => ({ ...prev, claude: !prev.claude }))}
              style={{ minWidth: 'auto' }}
            >
              {showApiKey.claude ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
            Optional for advanced reasoning and analysis
          </p>
        </div>
      </div>

      <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '6px', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
        ℹ️ You can add more API keys later in the AI Config tab. At least one is recommended for image generation and advanced features.
      </div>

      <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
        <button className="btn" onClick={() => setStep(getPreviousStep())}>
          ← Back
        </button>
        <button
          className="btn btn-primary"
          onClick={() => {
            if (config.aiBackend === 'cloud') {
              setStep(6); // Skip Docker for cloud-only
            } else {
              setStep(2); // Go to Docker check for hybrid
            }
          }}
        >
          Continue →
        </button>
      </div>
    </div>
  );

  const renderNetworkConfig = () => (
    <div className="setup-step">
      <h2>Network Configuration</h2>
      <p style={{ marginBottom: '2rem', color: 'var(--color-text-muted)' }}>
        Configure how students and teachers will access AlloFlow on your network.
      </p>

      <div style={{ display: 'grid', gap: '1.5rem' }}>
        <div style={{
          padding: '1.5rem',
          backgroundColor: 'rgba(16, 185, 129, 0.05)',
          borderRadius: '8px',
          border: '2px solid rgba(16, 185, 129, 0.3)'
        }}>
          <h4 style={{ marginTop: 0, marginBottom: '0.75rem', color: 'var(--color-success)' }}>📍 Local Network IP</h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <code style={{ 
              flex: 1, 
              padding: '0.5rem', 
              backgroundColor: 'var(--color-bg)',
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              userSelect: 'all'
            }}>
              http://{config.serverIp}:8000
            </code>
            <button 
              className="btn" 
              onClick={() => {
                navigator.clipboard.writeText(`http://${config.serverIp}:8000`);
              }}
              style={{ minWidth: 'auto' }}
            >
              Copy
            </button>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0 }}>
            ✓ This is your server's local network address. Share this URL with students/teachers on your network.
          </p>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>
            Custom Domain or Hostname (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g., alloflow.school.local or alloflow.home"
            value={config.domain}
            onChange={(e) => setConfig({ ...config, domain: e.target.value })}
            style={{ width: '100%' }}
          />
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
            Set up a custom domain later through Settings → Network → NGINX. Requires DNS or local host file entries.
          </p>
        </div>

        <div style={{
          padding: '1rem',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderRadius: '6px',
          fontSize: '0.875rem'
        }}>
          <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-primary)' }}>
            🔓 Network Access & Firewall
          </div>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--color-text-muted)' }}>
            <li><strong>Firewall:</strong> Port 8000 will be opened automatically during setup (Windows firewall rules configured)</li>
            <li><strong>Access:</strong> Any device on your network can reach http://{config.serverIp || '[ip]'}:8000</li>
            <li><strong>Data:</strong> All traffic stays within your local network unless HTTPS is configured</li>
            <li><strong>Domain:</strong> Add a custom domain later in Settings → Network</li>
          </ul>
        </div>

        <div style={{
          padding: '1rem',
          backgroundColor: 'var(--color-bg)',
          borderRadius: '8px',
          border: '1px solid var(--color-border)'
        }}>
          <h4 style={{ marginTop: 0, marginBottom: '1rem' }}>Access Methods</h4>
          <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.875rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Check size={16} style={{ color: 'var(--color-success)' }} />
              <span><strong>Admin Center:</strong> Opens in this Electron window</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Check size={16} style={{ color: 'var(--color-success)' }} />
              <span><strong>Students/Teachers:</strong> Browse to http://{config.serverIp || '[ip]'}:8000</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Check size={16} style={{ color: 'var(--color-success)' }} />
              <span><strong>Or deploy:</strong> Package student/teacher apps (Deploy tab later)</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
        <button className="btn" onClick={() => setStep(getPreviousStep())}>
          ← Back
        </button>
        <button className="btn btn-primary" onClick={() => setStep(7)}>
          Continue →
        </button>
      </div>
    </div>
  );

  const renderModelSelection = () => (
    <div className="setup-step">
      <h2>Model Configuration</h2>
      <p style={{ marginBottom: '2rem', color: 'var(--color-text-muted)' }}>
        {config.aiBackend === 'cloud' 
          ? 'Configure which cloud AI providers to use for different functions.'
          : 'Select which AI models to install locally. These will be downloaded and run on your server.'}
      </p>

      <div style={{ display: 'grid', gap: '1rem' }}>
        {config.aiBackend !== 'cloud' && (
          <>
            <div style={{ padding: '1rem', backgroundColor: 'var(--color-bg)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
              <h4 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Text Generation Models (required)</h4>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
                Used for lessons, quizzes, and AI conversations
              </p>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input type="checkbox" checked readOnly />
                <span>DeepSeek R1 1.5B (2GB) - Fast for inference</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" checked readOnly />
                <span>Phi 3.5 (2.5GB) - Accurate for reasoning</span>
              </label>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.75rem', margin: 0 }}>
                💾 Total: 4.5GB • ⏱️ Installation: 5-10 minutes
              </p>
            </div>

            <div style={{ padding: '1rem', backgroundColor: 'var(--color-bg)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
              <h4 style={{ marginTop: 0, marginBottom: '0.5rem' }}>
                Image Generation {config.gpuType ? `(${config.gpuType.toUpperCase()} Accelerated)` : '(CPU)'}
              </h4>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
                Used for illustrations, diagrams, and visual learning
              </p>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={config.models.image}
                  onChange={(e) => setConfig({
                    ...config,
                    models: { ...config.models, image: e.target.checked }
                  })}
                />
                <span>
                  Flux Schnell (5GB)
                  {config.gpuType 
                    ? ` - GPU: ~2s per image` 
                    : ` - CPU: ~30s per image (slow)`}
                </span>
              </label>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.5rem', margin: 0 }}>
                💾 {config.models.image ? '5GB additional' : 'Skipped'} • {config.gpuType ? '⚡ GPU-accelerated' : '⏱️ Slower on CPU'}
              </p>
            </div>

            <div style={{ padding: '1rem', backgroundColor: 'var(--color-bg)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
              <h4 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Text-to-Speech</h4>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
                Used for reading passages aloud and phonics practice
              </p>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" checked readOnly />
                <span>Edge TTS (built-in, free, 50+ languages)</span>
              </label>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.5rem', margin: 0 }}>
                💾 Included • Multiple voices and accents
              </p>
            </div>

            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              borderRadius: '6px',
              fontSize: '0.875rem'
            }}>
              <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-primary)' }}>
                📥 Total download estimate: {config.models.image ? '~9.5GB' : '~4.5GB'}
              </div>
              <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>
                ⏱️ Installation time: {config.models.image ? '10-20 minutes' : '5-10 minutes'} (depends on internet speed)
              </p>
            </div>
          </>
        )}

        {config.aiBackend === 'cloud' && (
          <div style={{
            padding: '1.5rem',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            borderRadius: '8px',
            border: '1px solid var(--color-success)',
            fontSize: '0.875rem'
          }}>
            <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-success)' }}>
              ✓ Cloud-Only Mode Active
            </div>
            <p style={{ color: 'var(--color-text-muted)', margin: 0, marginBottom: '0.5rem' }}>
              No local models needed. All AI requests will use cloud APIs. You can customize your API provider preferences in the AI Config tab after setup.
            </p>
            <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
              Internet connection required for all features.
            </p>
          </div>
        )}

        {config.aiBackend === 'hybrid' && (
          <div style={{
            padding: '1.5rem',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            borderRadius: '8px',
            border: '1px solid var(--color-warning)',
            fontSize: '0.875rem'
          }}>
            <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-warning)' }}>
              🔀 Hybrid Mode Active
            </div>
            <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
              Local models will be installed for faster offline responses. Cloud APIs provide fallback when local is busy or for advanced features.
            </p>
          </div>
        )}
      </div>

      <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
        <button className="btn" onClick={() => setStep(getPreviousStep())}>
          ← Back
        </button>
        <button className="btn btn-primary" onClick={() => setStep(8)}>
          Continue →
        </button>
      </div>
    </div>
  );

  const renderAdminAccount = () => (
    <div className="setup-step">
      <h2>Create Admin Account</h2>
      <p style={{ marginBottom: '2rem', color: 'var(--color-text-muted)' }}>
        This account will manage the admin center and cluster.
      </p>

      <div style={{ display: 'grid', gap: '1.5rem' }}>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>
            Email Address
          </label>
          <input
            type="email"
            placeholder="admin@yourschool.edu"
            value={config.adminEmail}
            onChange={(e) => setConfig({ ...config, adminEmail: e.target.value })}
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>
            Password
          </label>
          <input
            type="password"
            placeholder="Minimum 8 characters"
            value={config.adminPassword}
            onChange={(e) => setConfig({ ...config, adminPassword: e.target.value })}
            style={{ width: '100%' }}
          />
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
            Use a strong password. Store it securely.
          </p>
        </div>
      </div>

      <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
        <button className="btn" onClick={() => setStep(getPreviousStep())}>
          ← Back
        </button>
        <button
          className="btn btn-primary"
          onClick={() => setStep(9)}
          disabled={!config.adminEmail || !config.adminPassword || config.adminPassword.length < 8}
        >
          Continue →
        </button>
      </div>
    </div>
  );

  const renderInstallation = () => (
    <div className="setup-step">
      <h2>{config.installing ? 'Installing AlloFlow...' : 'Ready to Install'}</h2>
      
      {!config.installing ? (
        <>
          <div style={{
            padding: '2rem',
            backgroundColor: 'var(--color-bg)',
            borderRadius: '8px',
            border: '1px solid var(--color-border)',
            marginBottom: '2rem'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Installation Summary</h3>
            <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Deployment Mode:</span>
                <strong>{config.deploymentMode === 'new' ? 'New Primary Server' : 'Join Cluster'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>AI Backend:</span>
                <strong>{config.aiBackend === 'local' ? 'Local Only' : config.aiBackend === 'cloud' ? 'Cloud Only' : 'Hybrid'}</strong>
              </div>
              {config.aiBackend !== 'cloud' && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>GPU:</span>
                  <strong>{config.gpuType ? config.gpuType.toUpperCase() : 'None (CPU)'}</strong>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Server IP:</span>
                <strong>{config.serverIp}</strong>
              </div>
              {config.aiBackend !== 'local' && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>API Keys:</span>
                  <strong>{Object.values(config.apiKeys).filter(k => k).length} configured</strong>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn" onClick={() => setStep(getPreviousStep())}>
              ← Back
            </button>
            <button
              className="btn btn-primary"
              onClick={startInstallation}
              style={{ minWidth: '150px' }}
            >
              Start Installation
            </button>
          </div>
        </>
      ) : (
        <>
          <div style={{
            padding: '2rem',
            backgroundColor: 'var(--color-bg)',
            borderRadius: '8px',
            border: '1px solid var(--color-border)',
            marginBottom: '2rem',
            textAlign: 'center'
          }}>
            <Download className="spin" size={48} style={{ margin: '0 auto 1rem', color: 'var(--color-primary)' }} />
            
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ height: '8px', backgroundColor: 'var(--color-border)', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                <div
                  style={{
                    height: '100%',
                    backgroundColor: 'var(--color-primary)',
                    width: config.installProgress + '%',
                    transition: 'width 0.3s'
                  }}
                />
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                {config.installProgress}% complete
              </p>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--color-text)' }}>
              {config.installStep || 'Initializing...'}
            </p>
          </div>

          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
            This may take 10-25 minutes depending on your selection. Please don't close this window.
          </p>
        </>
      )}
    </div>
  );

  return (
    <div className="setup-wizard">
      <div className="setup-progress">
        <div className="setup-steps">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(s => {
            const isVisible = config.deploymentMode === 'join-cluster' 
              ? s <= 2 
              : config.aiBackend === 'cloud'
                ? s <= 8 && s !== 3 && s !== 7 && s !== 5 // Skip GPU, skip full models step, but keep API keys
                : true;
            
            if (!isVisible) return null;

            return (
              <div
                key={s}
                className={`setup-step-indicator ${s < step ? 'completed' : s === step ? 'active' : ''}`}
                title={['Mode', 'Docker/API/Cluster', 'GPU/Network', 'AI Backend', 'API Keys', 'Network', 'Models', 'Account', 'Install'][s-1]}
              >
                {s < step ? <Check size={16} /> : s}
              </div>
            );
          })}
        </div>
      </div>

      <div className="setup-content">
        {(() => {
          const content = renderStep();
          console.log('SetupWizard: Rendering step', step, 'config:', config);
          if (!content) {
            return (
              <div className="setup-step" style={{ textAlign: 'center', color: 'var(--color-error)' }}>
                <h2>⚠️ Error</h2>
                <p>Step {step} not found. Config: {JSON.stringify({deploymentMode: config.deploymentMode, aiBackend: config.aiBackend})}</p>
                <button className="btn" onClick={() => setStep(1)}>← Return to Start</button>
              </div>
            );
          }
          return content;
        })()}
      </div>

      <style>{`
        .setup-wizard {
          height: 100vh;
          display: flex;
          flex-direction: column;
        }
        .setup-progress {
          padding: 2rem 4rem;
          background: var(--color-surface);
          border-bottom: 1px solid var(--color-border);
        }
        .setup-steps {
          display: flex;
          gap: 0.5rem;
          max-width: 100%;
          margin: 0 auto;
          justify-content: center;
          flex-wrap: wrap;
        }
        .setup-step-indicator {
          flex: 1;
          min-width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          font-weight: 600;
          font-size: 0.75rem;
          background: var(--color-bg);
          color: var(--color-text-muted);
        }
        .setup-step-indicator.active {
          background: var(--color-primary);
          color: white;
        }
        .setup-step-indicator.completed {
          background: var(--color-success);
          color: white;
        }
        .setup-content {
          flex: 1;
          overflow-y: auto;
          padding: 2rem 4rem;
          max-width: 800px;
          margin: 0 auto;
          width: 100%;
          box-sizing: border-box;
        }
        .setup-step {
          animation: slideIn 0.3s ease-out;
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media (max-width: 768px) {
          .setup-progress {
            padding: 1rem 2rem;
          }
          .setup-content {
            padding: 1rem 2rem;
          }
        }
      `}</style>
    </div>
  );
}
