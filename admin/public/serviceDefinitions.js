/**
 * AlloFlow Service Definitions
 * Defines service configurations for native process management.
 * Services run as child processes spawned by the Electron app — no Docker required.
 */

const SERVICE_DEFINITIONS = {
  'llm-engine': {
    id: 'llm-engine',
    name: 'LM Studio (llama.cpp)',
    description: 'Local LLM inference engine with universal GPU support (CUDA, ROCm, Metal, CPU)',
    icon: '🦙',
    required: true,
    optional: false,
    defaultEnabled: true,
    native: true,
    port: 1234,
    healthCheck: {
      endpoint: 'http://127.0.0.1:1234/v1/models',
      method: 'GET',
      timeout: 15000,
      maxRetries: 30,
      retryInterval: 2000
    },
    resources: {
      minRAM: 2048,
      minCPU: 2,
      minDisk: 20000,
      recommendedRAM: 8192
    },
    hardwareTiers: {
      entryLevel: {
        enabled: true,
        gpuBackend: 'cpu',
        models: ['neural-chat:7b', 'tiny-llm:1.4b'],
        warning: 'Limited to smaller models (7B or less). Inference speed may be slow.'
      },
      midRange: {
        enabled: true,
        gpuBackend: 'auto', // auto-detects GPU
        models: ['mistral:latest', 'llama2:13b', 'neural-chat:7b'],
        warning: null
      },
      workstation: {
        enabled: true,
        gpuBackend: 'auto', // auto-detects GPU
        models: ['mistral:latest', 'llama2:13b', 'llama2:70b', 'code-llama:latest'],
        warning: null
      }
    },
    description_detailed: `
      **AI Chat Model Engine (Universal)**
      - Run LLMs completely offline, no API keys needed
      - OpenAI-compatible API on port 1234
      - Universal GPU support:
        - **NVIDIA**: CUDA backend for GeForce/RTX cards
        - **AMD**: ROCm backend for Radeon cards  
        - **Apple Silicon**: Metal backend for M1/M2/M3/M4
        - **CPU**: Fallback for all systems
      - Models from Hugging Face (Mistral, Llama2, Code Llama, etc.)
      
      *Automatically builds with the right GPU backend for your hardware*
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
    native: true,
    port: null, // CLI-based, no persistent server
    healthCheck: null, // No health endpoint — validated by binary existence
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
      - No API costs or internet dependency
      
      *Lightweight - works on all hardware tiers*
    `
  },

  search: {
    id: 'search',
    name: 'Web Search',
    description: 'Built-in web search via DuckDuckGo (runs inside the app, no external server needed)',
    icon: '🔍',
    required: true,
    optional: false,
    defaultEnabled: true,
    native: true,
    builtin: true, // Runs in-process, no binary needed
    port: 8888,
    healthCheck: {
      endpoint: 'http://127.0.0.1:8888/health',
      method: 'GET',
      timeout: 5000,
      maxRetries: 5,
      retryInterval: 500
    },
    resources: {
      minRAM: 0,
      minCPU: 0,
      minDisk: 0
    },
    description_detailed: `
      **Web Search (Built-in)**
      - Search the web via DuckDuckGo, no external server needed
      - Runs inside the app — zero additional resources
      - Provides real-time web results for AI-augmented responses
      
      *Always included — zero overhead*
    `
  },

  flux: {
    id: 'flux',
    name: 'Flux (Image Generation)',
    description: 'AI-powered image generation from text descriptions (requires GPU for reasonable speed)',
    icon: '🎨',
    required: false,
    optional: true,
    defaultEnabled: false,
    native: true,
    needsPython: true, // Requires Python + torch for execution
    port: 7860,
    healthCheck: {
      endpoint: 'http://127.0.0.1:7860/health',
      method: 'GET',
      timeout: 30000,
      maxRetries: 30,
      retryInterval: 3000
    },
    resources: {
      minRAM: 4096,
      minGPU_VRAM: 6000,
      minCPU: 2,
      minDisk: 10000,
      recommendedGPU_VRAM: 12000,
      cpuOnlyWarning: 'VERY slow on CPU (minutes per image). Enable only if you have 16GB+ RAM and patience.'
    },
    hardwareTiers: {
      entryLevel: {
        enabled: false,
        reason: 'Not recommended - requires too much memory'
      },
      midRange: {
        enabled: true,
        requirement: 'Requires GPU with 8GB+ VRAM',
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
      - GPU with 8GB+ VRAM (recommended 12GB+)
      - OR 16GB+ system RAM for CPU inference (VERY slow)
      
      *This is optional — you can run AlloFlow without it*
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
    servicesToInclude: ['llm-engine', 'piper', 'search'], // No Flux
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
    servicesToInclude: ['llm-engine', 'piper', 'search'],
    limitations: [
      'Up to 13B LLMs recommended',,
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
    servicesToInclude: ['llm-engine', 'piper', 'search', 'flux'],
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
