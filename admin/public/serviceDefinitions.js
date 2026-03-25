/**
 * AlloFlow Service Definitions
 * Defines service configurations, hardware requirements, and descriptions
 */

const SERVICE_DEFINITIONS = {
  // Always included services
  pocketbase: {
    id: 'pocketbase',
    name: 'PocketBase',
    description: 'NoSQL database and real-time API for storing student data, assessment results, and learning profiles',
    icon: '📦',
    required: true,
    optional: false,
    defaultEnabled: true,
    image: 'ghcr.io/muchobien/pocketbase:latest',
    port: 8090,
    internalPort: 8090,
    healthCheck: {
      endpoint: 'http://localhost:8090/api/health',
      method: 'GET',
      timeout: 10000,
      maxRetries: 30,
      retryInterval: 1000
    },
    resources: {
      minRAM: 512, // MB
      minCPU: 1,
      minDisk: 1000 // MB
    },
    description_detailed: `
      **Database & API Backend**
      - Stores all student data, assessments, and learning profiles
      - Real-time synchronization across devices
      - RESTful API for all AlloFlow features
      - Built-in admin panel for data management
      
      *Comes automatically with every setup*
    `
  },

  ollama: {
    id: 'ollama',
    name: 'Ollama',
    description: 'Local LLM inference engine for running chat models offline (llama2, mistral, neural-chat, etc.)',
    icon: '🧠',
    required: true,
    optional: false,
    defaultEnabled: true,
    image: 'ollama/ollama:latest',
    port: 11434,
    internalPort: 11434,
    healthCheck: {
      endpoint: 'http://localhost:11434/api/tags',
      method: 'GET',
      timeout: 15000,
      maxRetries: 30,
      retryInterval: 2000
    },
    resources: {
      minRAM: 2048, // MB
      minCPU: 2,
      minDisk: 20000, // MB (20GB for base + models)
      recommendedRAM: 8192
    },
    hardwareTiers: {
      entryLevel: {
        enabled: true,
        models: ['neural-chat:7b', 'tiny-llm:1.4b'],
        warning: 'Limited to smaller models (7B or less). Inference speed may be slow.'
      },
      midRange: {
        enabled: true,
        models: ['mistral:latest', 'llama2:13b', 'neural-chat:7b'],
        warning: null
      },
      workstation: {
        enabled: true,
        models: ['mistral:latest', 'llama2:13b', 'llama2:70b', 'code-llama:latest'],
        warning: null
      }
    },
    description_detailed: `
      **AI Chat Model Engine**
      - Run LLMs completely offline, no API keys needed
      - Models available: Mistral, Llama2, Neural Chat, Code Llama, and more
      - Perfectly suited for educational content generation
      - Speech-to-text integration for accessibility features
      - Pulls models from Ollama registry (automatic, on-demand)
      
      *Entry-level systems limited to 7B models for performance*
    `
  },

  piper: {
    id: 'piper',
    name: 'Piper (Text-to-Speech)',
    description: 'High-quality offline text-to-speech engine with 50+ voices in multiple languages',
    icon: '🎤',
    required: true,
    optional: false,
    defaultEnabled: true,
    image: 'rhasspy/wyoming-piper:latest',
    port: 10400,
    internalPort: 10400,
    healthCheck: {
      endpoint: 'http://localhost:10400/',
      method: 'GET',
      timeout: 10000,
      maxRetries: 20,
      retryInterval: 500
    },
    resources: {
      minRAM: 512,
      minCPU: 1,
      minDisk: 1000
    },
    description_detailed: `
      **Offline Text-to-Speech**
      - Generate audio from text completely offline
      - 50+ voices across multiple languages
      - Essential for accessibility in educational settings
      - Real-time audio streaming for fluent reading
      - No API costs or internet dependency
      - Supports phoneme-level control for literacy instruction
      
      *Lightweight - works on all hardware tiers*
    `
  },

  searxng: {
    id: 'searxng',
    name: 'SearXNG (Search)',
    description: 'Privacy-focused meta-search engine for research and knowledge integration',
    icon: '🔍',
    required: false,
    optional: false, // Always included but can be discussed
    defaultEnabled: true,
    image: 'searxng/searxng:latest',
    port: 8888,
    internalPort: 8080,
    healthCheck: {
      endpoint: 'http://localhost:8888/',
      method: 'GET',
      timeout: 10000,
      maxRetries: 20,
      retryInterval: 1000
    },
    resources: {
      minRAM: 256,
      minCPU: 1,
      minDisk: 500
    },
    description_detailed: `
      **Meta-Search Engine**
      - Search across multiple sources (Google, Bing, DuckDuckGo-compatible)
      - Privacy-respecting, no tracking
      - Useful for research and knowledge integration
      - Can augment AI responses with real-time information
      - Minimal resource overhead
      
      *Always included - very lightweight*
    `
  },

  flux: {
    id: 'flux',
    name: 'Flux (Image Generation)',
    description: 'AI-powered image generation from text descriptions (builds locally, requires GPU for reasonable speed)',
    icon: '🎨',
    required: false,
    optional: true,
    defaultEnabled: false,
    buildContext: 'flux-server', // Built from local Dockerfile, not pulled from registry
    image: 'alloflow-flux:latest', // Local image tag after build
    port: 7860,
    internalPort: 7860,
    healthCheck: {
      endpoint: 'http://localhost:7860/health',
      method: 'GET',
      timeout: 30000,
      maxRetries: 30,
      retryInterval: 3000
    },
    resources: {
      minRAM: 4096, // 4GB minimum
      minGPU_VRAM: 6000, // 6GB VRAM minimum
      minCPU: 2,
      minDisk: 10000,
      recommendedGPU_VRAM: 12000, // 12GB recommended
      cpuOnlyWarning: 'VERY slow on CPU (minutes per image). Enable only if you have 16GB+ RAM and patience.'
    },
    hardwareTiers: {
      entryLevel: {
        enabled: false,
        reason: 'Not recommended - requires too much memory'
      },
      midRange: {
        enabled: true,
        requirement: 'Requires NVIDIA GPU with 8GB+ VRAM',
        cpuWarning: 'CPU-only generation takes 10-40 minutes per image',
        warning: '⚠️  Only enable if you have a dedicated GPU'
      },
      workstation: {
        enabled: true,
        requirement: 'GPU with 12GB+ VRAM recommended',
        warning: null
      }
    },
    description_detailed: `
      **AI Image Generation (Optional)**
      - Generate educational illustrations and diagrams
      - Text-to-image synthesis for creative learning
      - Powered by Flux model (SOTA quality)
      - REQUIRES discrete GPU for reasonable speed
      
      ⚠️  **Hardware Requirements:**
      - NVIDIA GPU with 8GB+ VRAM (recommended 12GB+)
      - OR 16GB+ system RAM for CPU inference (VERY slow)
      
      *Image generation takes 2-5 seconds with GPU, 10-40 minutes on CPU*
      *This is optional - you can create powerful AlloFlow without it*
    `
  }
};

const HARDWARE_PROFILES = {
  entryLevel: {
    id: 'entryLevel',
    label: 'Entry-level (Budget)',
    icon: '💻',
    description: 'Laptop or older workstation',
    requirements: {
      cpu: 'Dual-core or better',
      ram: '2-4 GB',
      disk: '20-50 GB free',
      gpu: 'Not required'
    },
    specs: {
      minCPU: 2,
      minRAM: 2048, // MB
      minDisk: 20000, // MB
      maxRAM: 4096
    },
    servicesToInclude: ['pocketbase', 'ollama', 'piper', 'searxng'], // No Flux
    limitations: [
      'Smaller LLMs only (7B models)',
      'No image generation',
      'Slower inference speeds',
      'Models load on-demand'
    ],
    recommendations: [
      'Start with neural-chat:7b (smallest model)',
      'Add RAM if possible - even 4GB helps',
      'Close other apps during inference'
    ]
  },

  midRange: {
    id: 'midRange',
    label: 'Mid-range (Standard)',
    icon: '🖥️',
    description: 'Modern laptop or desktop',
    requirements: {
      cpu: 'Quad-core or better',
      ram: '8-16 GB',
      disk: '50-100 GB free',
      gpu: 'Optional - any NVIDIA/AMD'
    },
    specs: {
      minCPU: 4,
      minRAM: 8192,
      minDisk: 50000,
      maxRAM: 16384,
      optionalGPU_VRAM: 4000
    },
    servicesToInclude: ['pocketbase', 'ollama', 'piper', 'searxng'], // Flux optional
    limitations: [
      'Up to 13B LLMs recommended',
      'Image generation optional (GPU-dependent)',
      'Reasonable inference speeds'
    ],
    recommendations: [
      'Use mistral:7b or neural-chat:7b for balance',
      'GPU enables image generation (optional)',
      'System runs smoothly with other apps open'
    ]
  },

  workstation: {
    id: 'workstation',
    label: 'Workstation (Full-Featured)',
    icon: '⚙️',
    description: 'High-end workstation or server',
    requirements: {
      cpu: 'Quad-core or better (preferably 8+)',
      ram: '16-32 GB',
      disk: '100+ GB free',
      gpu: 'RECOMMENDED - 12GB+ VRAM'
    },
    specs: {
      minCPU: 8,
      minRAM: 16384,
      minDisk: 100000,
      recommendedRAM: 32768,
      recommendedGPU_VRAM: 12000
    },
    servicesToInclude: ['pocketbase', 'ollama', 'piper', 'searxng', 'flux'],
    limitations: [],
    recommendations: [
      'Run large models (13B, 70B) for better quality',
      'Image generation fully enabled',
      'Can handle multiple concurrent requests',
      'Consider using GPU for 10x+ speedup'
    ]
  }
};

module.exports = { SERVICE_DEFINITIONS, HARDWARE_PROFILES };
