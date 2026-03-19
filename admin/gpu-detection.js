/**
 * GPU Detection & Configuration Utility
 * 
 * Automatically detects available GPU hardware and configures Docker accordingly.
 * Supports: NVIDIA (CUDA), AMD (ROCm), Apple Silicon (Metal)
 * 
 * Usage:
 *   const gpuConfig = require('./gpu-detection');
 *   console.log(gpuConfig.detectGPU());  // Returns: { type, driver, supported, details }
 */

const { execSync } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

class GPUDetector {
  constructor() {
    this.platform = os.platform();
    this.detectedGPU = null;
  }

  /**
   * Main detection method
   * Returns: { type, driver, supported, details, dockerConfig }
   */
  detectGPU() {
    if (this.detectedGPU) return this.detectedGPU;

    let gpu = {
      type: 'CPU',
      driver: 'none',
      supported: false,
      details: 'No GPU detected, will use CPU fallback',
      dockerConfig: this.getDockerConfigCPU(),
    };

    // Try platform-specific detection
    if (this.platform === 'darwin') {
      gpu = this.detectAppleSilicon() || this.detectMacNVIDIA() || gpu;
    } else if (this.platform === 'linux') {
      gpu = this.detectNVIDIA() || this.detectAMD() || gpu;
    } else if (this.platform === 'win32') {
      gpu = this.detectNVIDIA() || this.detectAMDWindows() || gpu;
    }

    this.detectedGPU = gpu;
    return gpu;
  }

  /**
   * Detect Apple Silicon (M1, M2, M3, etc.)
   * Only on macOS ARM64
   */
  detectAppleSilicon() {
    try {
      if (this.platform !== 'darwin') return null;
      if (os.arch() !== 'arm64') return null;

      return {
        type: 'Apple Silicon',
        driver: 'metal',
        model: this.getMacModelIdentifier(),
        supported: true,
        details: `Apple Silicon GPU detected (${os.arch()}). Using Metal Performance Shaders.`,
        dockerConfig: this.getDockerConfigAppleSilicon(),
      };
    } catch (e) {
      return null;
    }
  }

  /**
   * Detect NVIDIA GPU (works on macOS, Linux, Windows)
   * Checks for nvidia-smi command
   */
  detectNVIDIA() {
    try {
      const output = execSync('nvidia-smi --query-gpu=name,memory.total,compute_cap', {
        timeout: 5000,
        stdio: 'pipe',
      }).toString();

      const lines = output.trim().split('\n');
      const gpuInfo = lines[0]?.trim().split(',') || [];

      return {
        type: 'NVIDIA',
        driver: 'cuda',
        model: gpuInfo[0]?.trim() || 'Unknown NVIDIA GPU',
        vram: gpuInfo[1]?.trim() || 'Unknown',
        computeCapability: gpuInfo[2]?.trim() || 'Unknown',
        supported: true,
        details: `NVIDIA GPU detected: ${gpuInfo[0]?.trim() || 'Unknown'} (${gpuInfo[1]?.trim() || '?'} VRAM). Using NVIDIA Container Toolkit.`,
        dockerConfig: this.getDockerConfigNVIDIA(),
      };
    } catch (e) {
      return null;
    }
  }

  /**
   * Detect AMD GPU on Linux
   * Checks for rocm-smi command
   */
  detectAMD() {
    try {
      if (this.platform !== 'linux') return null;

      const output = execSync('rocm-smi --showid --showmeminfo', {
        timeout: 5000,
        stdio: 'pipe',
      }).toString();

      return {
        type: 'AMD',
        driver: 'rocm',
        supported: true,
        details: `AMD GPU detected. Using ROCm driver. Output: ${output.split('\n')[0]}`,
        dockerConfig: this.getDockerConfigAMD(),
      };
    } catch (e) {
      return null;
    }
  }

  /**
   * Detect AMD GPU on Windows
   * Uses multiple detection methods for robustness
   */
  detectAMDWindows() {
    try {
      if (this.platform !== 'win32') return null;

      // Method 1: PowerShell WMI query for comprehensive GPU info
      try {
        const psCmd = `Get-WmiObject Win32_PnPDevice -Filter "Name LIKE '%AMD%' OR Name LIKE '%Radeon%' OR Name LIKE '%9070%' OR Name LIKE '%9080%' OR Name LIKE '%7900%' OR Name LIKE '%RDNA%'" | Select-Object -First 1`;
        const output = execSync(`powershell.exe -Command "${psCmd}"`, {
          timeout: 5000,
          stdio: 'pipe',
        }).toString();

        if (output && output.length > 50) {
          console.log('AMD GPU detected via PowerShell PnP:', output.substring(0, 200));
          return {
            type: 'AMD',
            driver: 'rocm',
            supported: true,
            details: 'AMD GPU detected on Windows. Using ROCm driver.',
            dockerConfig: this.getDockerConfigAMD(),
          };
        }
      } catch (e) {
        console.log('PowerShell PnP detection failed:', e.message);
      }

      // Method 2: wmic video controller query with more fields
      try {
        const output = execSync('wmic path win32_videocontroller get name,description,status,deviceid /format:list', {
          timeout: 5000,
          stdio: 'pipe',
        }).toString().toUpperCase();

        const amdIndicators = ['AMD', 'RADEON', '9070', '9080', '7900', '7800', 'RDNA', 'NAVI'];
        if (amdIndicators.some(indicator => output.includes(indicator))) {
          console.log('AMD GPU detected via wmic (detailed):', output.substring(0, 300));
          return {
            type: 'AMD',
            driver: 'rocm',
            supported: true,
            details: 'AMD GPU detected on Windows. Using ROCm driver.',
            dockerConfig: this.getDockerConfigAMD(),
          };
        }
      } catch (e) {
        console.log('wmic detailed check failed:', e.message);
      }

      // Method 3: Device Manager registry (PCI\VEN_1002 is AMD vendor ID)
      try {
        const output = execSync('reg query "HKLM\\\\SYSTEM\\\\CurrentControlSet\\\\Enum\\\\PCI" /f "1002" /s', {
          timeout: 5000,
          stdio: 'pipe',
        }).toString();

        if (output && output.includes('1002')) {
          console.log('AMD GPU detected via registry (vendor ID 1002)');
          return {
            type: 'AMD',
            driver: 'rocm',
            supported: true,
            details: 'AMD GPU detected on Windows (PCI vendor ID 1002). Using ROCm driver.',
            dockerConfig: this.getDockerConfigAMD(),
          };
        }
      } catch (e) {
        console.log('PCI vendor ID registry check failed:', e.message);
      }

      // Method 4: AMD display driver registry
      try {
        const output = execSync('reg query "HKLM\\\\SYSTEM\\\\CurrentControlSet\\\\Services" /s /f "amd" /d', {
          timeout: 5000,
          stdio: 'pipe',
        }).toString();

        if (output && (output.includes('amdkmdap') || output.includes('amdvdd'))) {
          console.log('AMD GPU detected via driver registry');
          return {
            type: 'AMD',
            driver: 'rocm',
            supported: true,
            details: 'AMD GPU detected via driver registry. Using ROCm driver.',
            dockerConfig: this.getDockerConfigAMD(),
          };
        }
      } catch (e) {
        console.log('AMD driver registry check failed:', e.message);
      }

      // Method 5: Check for AMD driver files
      try {
        const driverPaths = [
          'C:\\\\Program Files\\\\AMD\\\\CNext',
          'C:\\\\Program Files (x86)\\\\AMD\\\\CNext',
          'C:\\\\Program Files\\\\NVIDIA\\\\NVIS',
          'C:\\\\Windows\\\\System32\\\\drivers\\\\amd*',
        ];

        for (const driverPath of driverPaths) {
          try {
            const output = execSync(`cmd /c dir "${driverPath}" 2>nul`, {
              timeout: 3000,
              stdio: 'pipe',
            }).toString();
            
            if (output && output.length > 20) {
              console.log(`AMD detected via driver path: ${driverPath}`);
              return {
                type: 'AMD',
                driver: 'rocm',
                supported: true,
                details: 'AMD GPU detected (AMD software found). Using ROCm driver.',
                dockerConfig: this.getDockerConfigAMD(),
              };
            }
          } catch (e) {
            // Continue to next path
          }
        }
      } catch (e) {
        console.log('Driver file detection failed:', e.message);
      }

      console.log('AMD GPU not detected via any method');
      return null;
    } catch (e) {
      console.log('AMD Windows detection error:', e.message);
      return null;
    }
  }

  /**
   * Detect NVIDIA on macOS (rare but possible with eGPU)
   */
  detectMacNVIDIA() {
    try {
      if (this.platform !== 'darwin') return null;

      const output = execSync('nvidia-smi --query-gpu=name', {
        timeout: 5000,
        stdio: 'pipe',
      }).toString();

      if (output) {
        return {
          type: 'NVIDIA',
          driver: 'cuda',
          model: output.trim(),
          supported: true,
          details: `NVIDIA GPU detected on macOS (likely eGPU): ${output.trim()}. Using NVIDIA Container Toolkit.`,
          dockerConfig: this.getDockerConfigNVIDIA(),
        };
      }
    } catch (e) {
      return null;
    }
  }

  /**
   * Get macOS model identifier (M1, M2, M3, etc.)
   */
  getMacModelIdentifier() {
    try {
      const output = execSync('sysctl -n machdep.cpu.brand_string', {
        timeout: 5000,
        stdio: 'pipe',
      }).toString();
      return output.trim();
    } catch (e) {
      return 'Apple Silicon';
    }
  }

  /**
   * Docker config: CPU-only fallback
   */
  getDockerConfigCPU() {
    return {
      gpuSupport: false,
      driver: 'none',
      environment: {
        DOCKER_GPU_SUPPORT: 'false',
      },
      compose: {
        ollama: {
          // No GPU config needed
        },
        flux: null, // Not available
      },
      setupCommand: 'docker compose up -d',
      warning: 'No GPU detected. Using CPU-only mode. AI responses will be slow. Consider GPU upgrade or cloud fallback.',
    };
  }

  /**
   * Docker config: NVIDIA CUDA
   */
  getDockerConfigNVIDIA() {
    return {
      gpuSupport: true,
      driver: 'nvidia',
      environment: {
        DOCKER_GPU_SUPPORT: 'true',
        GPU_DRIVER: 'nvidia',
      },
      compose: {
        ollama: {
          deploy: {
            resources: {
              reservations: {
                devices: [
                  {
                    driver: 'nvidia',
                    count: 'all',
                    capabilities: ['gpu'],
                  },
                ],
              },
            },
          },
        },
        flux: {
          deploy: {
            resources: {
              reservations: {
                devices: [
                  {
                    driver: 'nvidia',
                    count: 1,
                    capabilities: ['gpu'],
                  },
                ],
              },
            },
          },
        },
      },
      setupCommand: 'docker compose up -d',
      requirements: [
        'NVIDIA Container Toolkit must be installed',
        'Test with: docker run --rm --gpus all ubuntu nvidia-smi',
      ],
      docs: 'https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html',
    };
  }

  /**
   * Docker config: AMD ROCm
   */
  getDockerConfigAMD() {
    return {
      gpuSupport: true,
      driver: 'amd',
      environment: {
        DOCKER_GPU_SUPPORT: 'true',
        GPU_DRIVER: 'amd',
        ROCM_VERSION: '6.0',  // Latest stable
      },
      compose: {
        ollama: {
          environment: {
            // Ollama auto-detects ROCm
            OLLAMA_ROCM_SUPPORTED: 'true',
          },
          deploy: {
            resources: {
              reservations: {
                devices: [
                  {
                    driver: 'rocm',
                    count: 'all',
                    capabilities: ['gpu'],
                  },
                ],
              },
            },
          },
        },
        flux: {
          environment: {
            OLLAMA_ROCM_SUPPORTED: 'true',
          },
          deploy: {
            resources: {
              reservations: {
                devices: [
                  {
                    driver: 'rocm',
                    count: 1,
                    capabilities: ['gpu'],
                  },
                ],
              },
            },
          },
        },
      },
      setupCommand: 'docker compose up -d',
      requirements: [
        'AMD ROCm must be installed',
        'Docker must have rocm support enabled',
        'For HIP (Heterogeneous-compute Interface for Portability)',
      ],
      docs: 'https://rocmdocs.amd.com/en/docs-5.0.0/deploy/docker/',
    };
  }

  /**
   * Docker config: Apple Silicon (Metal)
   * Note: Ollama auto-detects Metal on arm64 macOS
   * Flux requires special build for Metal
   */
  getDockerConfigAppleSilicon() {
    return {
      gpuSupport: true,
      driver: 'metal',
      environment: {
        DOCKER_GPU_SUPPORT: 'true',
        GPU_DRIVER: 'metal',
      },
      compose: {
        ollama: {
          // Ollama auto-uses Metal on arm64
          environment: {
            OLLAMA_GPU: '1',
          },
        },
        flux: {
          // Flux on Metal: slower, but works
          // Use CPU-fallback optimized image
          image: 'flux-metal:latest',  // Special arm64 build
          environment: {
            TORCH_DEVICE: 'mps',  // Metal Performance Shaders
          },
        },
      },
      setupCommand: 'docker compose up -d',
      requirements: [
        'Docker Desktop for Mac with arm64 support',
        'Ollama works natively on Metal',
        'Flux may be slower on Metal vs CUDA/ROCm',
      ],
      fallback: 'Image generation can fall back to cloud API if Metal too slow',
    };
  }

  /**
   * Check if Docker Compose v2 is installed
   */
  checkDocker() {
    try {
      const version = execSync('docker compose version', {
        timeout: 5000,
        stdio: 'pipe',
      }).toString();
      return { installed: true, version: version.trim() };
    } catch (e) {
      return { installed: false, version: null };
    }
  }

  /**
   * Generate environment file (.env) for docker-compose
   */
  generateEnvFile(outputPath = './.env.gpu') {
    const gpu = this.detectGPU();
    const content = `# Auto-generated GPU configuration
# Generated: ${new Date().toISOString()}
# Detected GPU: ${gpu.type}

DOCKER_GPU_SUPPORT=${gpu.dockerConfig.environment?.DOCKER_GPU_SUPPORT || 'false'}
GPU_DRIVER=${gpu.dockerConfig.environment?.GPU_DRIVER || 'none'}
${gpu.dockerConfig.environment?.ROCM_VERSION ? `ROCM_VERSION=${gpu.dockerConfig.environment.ROCM_VERSION}` : ''}
${gpu.dockerConfig.environment?.OLLAMA_GPU ? `OLLAMA_GPU=${gpu.dockerConfig.environment.OLLAMA_GPU}` : ''}

# GPU Details
GPU_TYPE=${gpu.type}
GPU_DETECTED_AT=${new Date().toISOString()}
${gpu.model ? `GPU_MODEL=${gpu.model}` : ''}
${gpu.vram ? `GPU_VRAM=${gpu.vram}` : ''}
`;

    fs.writeFileSync(outputPath, content);
    return outputPath;
  }

  /**
   * Get setup script for this system
   */
  getSetupScript() {
    const gpu = this.detectGPU();
    const docker = this.checkDocker();

    let script = `#!/bin/bash
# AlloFlow GPU Auto-Setup for ${gpu.type}
# Generated: ${new Date().toISOString()}

echo "🔍 AlloFlow GPU Configuration"
echo "Detected GPU: ${gpu.type}"
echo "Platform: ${this.platform}"
echo ""

`;

    if (!docker.installed) {
      script += `echo "❌ Docker not found. Installing..."
# Instructions for installing Docker Desktop
echo "Please install Docker Desktop: https://www.docker.com/products/docker-desktop"
exit 1
`;
    } else {
      script += `echo "✅ Docker found: ${docker.version}"
echo ""
`;
    }

    // NVIDIA setup
    if (gpu.driver === 'cuda') {
      script += `echo "⚙️  Configuring NVIDIA CUDA support..."
echo "Checking NVIDIA Container Toolkit..."
if ! command -v nvidia-smi &> /dev/null; then
  echo "❌ NVIDIA Container Toolkit not found"
  echo "Install from: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html"
  exit 1
fi
echo "✅ NVIDIA Container Toolkit found"
nvidia-smi
`;
    }
    // AMD setup
    else if (gpu.driver === 'rocm') {
      script += `echo "⚙️  Configuring AMD ROCm support..."
echo "Checking ROCm installation..."
if ! command -v rocm-smi &> /dev/null; then
  echo "❌ ROCm not found"
  echo "Install from: https://rocmdocs.amd.com/"
  exit 1
fi
echo "✅ ROCm found"
rocm-smi
`;
    }
    // Apple Silicon
    else if (gpu.driver === 'metal') {
      script += `echo "⚙️  Configuring Apple Silicon (Metal) support..."
echo "✅ Metal is built-in to Apple Silicon"
echo "Ollama will auto-detect and use Metal Performance Shaders"
`;
    }

    script += `
echo ""
echo "✅ GPU configuration ready!"
echo "Run: docker compose up -d
`;

    return script;
  }
}

/**
 * Export for use in Electron main process
 */
module.exports = {
  GPUDetector,
  detectGPU: () => new GPUDetector().detectGPU(),
  checkDocker: () => new GPUDetector().checkDocker(),
  generateEnvFile: (path) => new GPUDetector().generateEnvFile(path),
  getSetupScript: () => new GPUDetector().getSetupScript(),
};

/**
 * CLI Usage (for testing):
 *   node gpu-detection.js
 */
if (require.main === module) {
  const detector = new GPUDetector();
  console.log('🔍 GPU Detection Result:');
  console.log(JSON.stringify(detector.detectGPU(), null, 2));
  console.log('\n📋 Docker Status:');
  console.log(JSON.stringify(detector.checkDocker(), null, 2));
}
