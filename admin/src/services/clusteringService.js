/**
 * AlloFlow Clustering Service
 * Handles multi-node cluster management, registration, and load balancing
 * 
 * Implements:
 * - Cluster token generation (time-limited, cryptographically signed)
 * - Node registration with validation
 * - Heartbeat tracking (30s interval)
 * - Automatic node removal (90s timeout)
 * - nginx upstream configuration generation
 * - Load balancing strategy management
 */

const crypto = require('crypto');
const https = require('https');
const http = require('http');

class ClusteringService {
  constructor(pbUrl = 'http://localhost:8090', pbAdminToken = null) {
    this.pbUrl = pbUrl;
    this.pbAdminToken = pbAdminToken;
    this.secret = process.env.CLUSTER_SECRET || 'AlloFlow-Cluster-Secret-Change-In-Prod';
    this.tokenExpiry = 24 * 60 * 60 * 1000; // 24 hours
    this.heartbeatInterval = 30000; // 30 seconds
    this.nodeTimeout = 90000; // 90 seconds
  }

  /**
   * Generate a secure cluster token for a new node
   * Token format: base64(nodeId|clusterId|expiresAt|hmacSignature)
   */
  async generateClusterToken(clusterId, nodeName, role = 'worker') {
    try {
      const expiresAt = new Date(Date.now() + this.tokenExpiry).toISOString();
      const nodeId = this._generateNodeId();
      
      // Create HMAC signature
      const message = `${nodeId}|${clusterId}|${expiresAt}|${nodeName}`;
      const hmac = crypto.createHmac('sha256', this.secret);
      hmac.update(message);
      const signature = hmac.digest('hex');
      
      // Create token payload
      const tokenPayload = {
        nodeId,
        clusterId,
        nodeName,
        role,
        expiresAt,
        signature
      };
      
      const token = Buffer.from(JSON.stringify(tokenPayload)).toString('base64');
      
      // Store token in PocketBase
      const tokenRecord = {
        cluster_id: clusterId,
        token: token,
        node_name: nodeName,
        role: role,
        expires_at: expiresAt,
        used: false,
        metadata: { created_at: new Date().toISOString() }
      };
      
      await this._pbCreateRecord('cluster_tokens', tokenRecord);
      
      return {
        token,
        nodeId,
        expiresAt,
        expiresIn: this.tokenExpiry / 1000 // seconds
      };
    } catch (error) {
      console.error('Error generating cluster token:', error);
      throw error;
    }
  }

  /**
   * Register a new node in the cluster
   * Node provides token, IP, port, and hardware info
   */
  async registerNode(token, nodeIp, nodePort, hardwareInfo = {}) {
    try {
      // Validate token
      const tokenData = this._validateToken(token);
      if (!tokenData) {
        throw new Error('Invalid or expired cluster token');
      }

      const { nodeId, clusterId, nodeName, role, signature } = tokenData;
      
      // Verify signature
      const message = `${nodeId}|${clusterId}|${tokenData.expiresAt}|${nodeName}`;
      const hmac = crypto.createHmac('sha256', this.secret);
      hmac.update(message);
      const expectedSignature = hmac.digest('hex');
      
      if (signature !== expectedSignature) {
        throw new Error('Token signature verification failed');
      }

      // Create node record
      const nodeRecord = {
        node_id: nodeId,
        cluster_id: clusterId,
        ip_address: nodeIp,
        port: nodePort,
        role: role,
        status: 'online',
        gpu_type: hardwareInfo.gpuType || 'none',
        gpu_count: hardwareInfo.gpuCount || 0,
        vram_gb: hardwareInfo.vramGb || 0,
        cpu_cores: hardwareInfo.cpuCores || 0,
        memory_gb: hardwareInfo.memoryGb || 0,
        models_deployed: hardwareInfo.modelsDeployed || [],
        last_heartbeat: new Date().toISOString(),
        version: hardwareInfo.version || '1.0.0',
        metadata: {
          joined_at: new Date().toISOString(),
          hostname: hardwareInfo.hostname
        }
      };

      // Check if node already exists
      const existingNode = await this._pbQueryRecords(
        'cluster_nodes',
        `cluster_id='${clusterId}' && node_id='${nodeId}'`
      );

      let savedNode;
      if (existingNode.length > 0) {
        // Update existing node
        savedNode = await this._pbUpdateRecord('cluster_nodes', existingNode[0].id, nodeRecord);
      } else {
        // Create new node
        savedNode = await this._pbCreateRecord('cluster_nodes', nodeRecord);
      }

      // Mark token as used
      const tokenRecords = await this._pbQueryRecords('cluster_tokens', `token='${token}'`);
      if (tokenRecords.length > 0) {
        await this._pbUpdateRecord('cluster_tokens', tokenRecords[0].id, {
          used: true,
          used_at: new Date().toISOString(),
          used_by_ip: nodeIp
        });
      }

      // Regenerate nginx config
      await this._regenerateNginxConfig(clusterId);

      return {
        success: true,
        nodeId,
        message: `Node ${nodeName} registered successfully`,
        node: savedNode
      };
    } catch (error) {
      console.error('Error registering node:', error);
      throw error;
    }
  }

  /**
   * Record heartbeat for a node (keeps it alive)
   */
  async recordHeartbeat(nodeId, clusterId, status = 'online', metrics = {}) {
    try {
      const nodeRecords = await this._pbQueryRecords(
        'cluster_nodes',
        `cluster_id='${clusterId}' && node_id='${nodeId}'`
      );

      if (nodeRecords.length === 0) {
        throw new Error(`Node ${nodeId} not found in cluster ${clusterId}`);
      }

      const updatedRecord = {
        last_heartbeat: new Date().toISOString(),
        status: status,
        gpu_count: metrics.gpuCount || nodeRecords[0].gpu_count,
        models_deployed: metrics.modelsDeployed || nodeRecords[0].models_deployed,
        metadata: {
          ...nodeRecords[0].metadata,
          last_heartbeat_metrics: metrics
        }
      };

      const updated = await this._pbUpdateRecord('cluster_nodes', nodeRecords[0].id, updatedRecord);
      return { success: true, node: updated };
    } catch (error) {
      console.error('Error recording heartbeat:', error);
      throw error;
    }
  }

  /**
   * Check for dead nodes and remove them
   * Runs periodically to clean up unresponsive nodes
   */
  async cleanupDeadNodes(clusterId) {
    try {
      const nodes = await this._pbQueryRecords('cluster_nodes', `cluster_id='${clusterId}'`);
      const now = Date.now();
      let removed = [];

      for (const node of nodes) {
        const lastHeartbeat = new Date(node.last_heartbeat).getTime();
        if (now - lastHeartbeat > this.nodeTimeout) {
          await this._pbDeleteRecord('cluster_nodes', node.id);
          removed.push(node.node_id);
        }
      }

      if (removed.length > 0) {
        // Regenerate nginx config
        await this._regenerateNginxConfig(clusterId);
      }

      return { removed, message: `Cleaned up ${removed.length} dead nodes` };
    } catch (error) {
      console.error('Error cleaning up dead nodes:', error);
      throw error;
    }
  }

  /**
   * Get all nodes in a cluster
   */
  async getClusterNodes(clusterId) {
    try {
      return await this._pbQueryRecords('cluster_nodes', `cluster_id='${clusterId}'`);
    } catch (error) {
      console.error('Error fetching cluster nodes:', error);
      throw error;
    }
  }

  /**
   * Get cluster configuration
   */
  async getClusterConfig(clusterId) {
    try {
      const configs = await this._pbQueryRecords('cluster_config', `cluster_id='${clusterId}'`);
      if (configs.length === 0) {
        // Return default config
        return this._getDefaultClusterConfig(clusterId);
      }
      return configs[0];
    } catch (error) {
      console.error('Error fetching cluster config:', error);
      throw error;
    }
  }

  /**
   * Update cluster configuration
   */
  async updateClusterConfig(clusterId, configUpdate) {
    try {
      const configs = await this._pbQueryRecords('cluster_config', `cluster_id='${clusterId}'`);
      
      const configData = {
        cluster_id: clusterId,
        ...configUpdate,
        load_balancer_strategy: configUpdate.loadBalancerStrategy || 'round-robin',
        heartbeat_interval_seconds: configUpdate.heartbeatInterval || 30,
        node_timeout_seconds: configUpdate.nodeTimeout || 90,
        max_retry_attempts: configUpdate.maxRetries || 3,
        enable_auto_failover: configUpdate.enableAutoFailover || true,
        enable_auto_scaling: configUpdate.enableAutoScaling || false,
        metadata: { updated_at: new Date().toISOString() }
      };

      let savedConfig;
      if (configs.length > 0) {
        savedConfig = await this._pbUpdateRecord('cluster_config', configs[0].id, configData);
      } else {
        savedConfig = await this._pbCreateRecord('cluster_config', configData);
      }

      // Regenerate nginx config
      await this._regenerateNginxConfig(clusterId);

      return savedConfig;
    } catch (error) {
      console.error('Error updating cluster config:', error);
      throw error;
    }
  }

  /**
   * Generate nginx upstream configuration
   */
  async generateNginxConfig(clusterId) {
    try {
      const config = await this.getClusterConfig(clusterId);
      const nodes = await this.getClusterNodes(clusterId);
      
      const upstreamServers = nodes
        .filter(n => n.status === 'online')
        .map(n => `    server ${n.ip_address}:${n.port} weight=1;`)
        .join('\n');

      const nginxConfig = `
# AlloFlow Cluster - Auto-generated on ${new Date().toISOString()}
upstream alloflow_cluster {
    ${config.load_balancer_strategy === 'ip-hash' ? 'ip_hash;' : ''}
    keepalive 32;
${upstreamServers}
}

server {
    listen 80;
    server_name _;

    client_max_body_size 1G;
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;

    location / {
        proxy_pass http://alloflow_cluster;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /health {
        access_log off;
        return 200 "OK\\n";
        add_header Content-Type text/plain;
    }
}
`;

      return nginxConfig;
    } catch (error) {
      console.error('Error generating nginx config:', error);
      throw error;
    }
  }

  /**
   * Remove a node from cluster
   */
  async removeNode(clusterId, nodeId) {
    try {
      const nodeRecords = await this._pbQueryRecords(
        'cluster_nodes',
        `cluster_id='${clusterId}' && node_id='${nodeId}'`
      );

      if (nodeRecords.length === 0) {
        throw new Error(`Node not found: ${nodeId}`);
      }

      await this._pbDeleteRecord('cluster_nodes', nodeRecords[0].id);
      
      // Regenerate nginx config
      await this._regenerateNginxConfig(clusterId);

      return { success: true, removed: nodeId };
    } catch (error) {
      console.error('Error removing node:', error);
      throw error;
    }
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Validate and parse cluster token
   */
  _validateToken(token) {
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf8');
      const data = JSON.parse(decoded);
      
      // Check expiration
      if (new Date(data.expiresAt) < new Date()) {
        return null; // Token expired
      }
      
      return data;
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate unique node ID
   */
  _generateNodeId() {
    return `node-${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Get default cluster configuration
   */
  _getDefaultClusterConfig(clusterId) {
    return {
      cluster_id: clusterId,
      primary_ip: process.env.PRIMARY_NODE_IP || 'localhost',
      primary_port: 8090,
      load_balancer_strategy: 'round-robin',
      heartbeat_interval_seconds: 30,
      node_timeout_seconds: 90,
      max_retry_attempts: 3,
      enable_auto_failover: true,
      enable_auto_scaling: false,
      nginx_config: '',
      metadata: {}
    };
  }

  /**
   * Regenerate and save nginx config
   */
  async _regenerateNginxConfig(clusterId) {
    try {
      const nginxConfig = await this.generateNginxConfig(clusterId);
      const configs = await this._pbQueryRecords('cluster_config', `cluster_id='${clusterId}'`);
      
      if (configs.length > 0) {
        await this._pbUpdateRecord('cluster_config', configs[0].id, { nginx_config: nginxConfig });
      }
    } catch (error) {
      console.error('Error regenerating nginx config:', error);
    }
  }

  // ==================== POCKETBASE API WRAPPERS ====================

  /**
   * Query records from PocketBase collection
   */
  async _pbQueryRecords(collection, filter = '') {
    try {
      const url = new URL(`${this.pbUrl}/api/collections/${collection}/records`);
      if (filter) {
        url.searchParams.append('filter', filter);
      }

      const response = await this._pbFetch(url.toString(), 'GET');
      return response.items || [];
    } catch (error) {
      console.error(`Error querying ${collection}:`, error);
      return [];
    }
  }

  /**
   * Create record in PocketBase
   */
  async _pbCreateRecord(collection, data) {
    try {
      const response = await this._pbFetch(
        `${this.pbUrl}/api/collections/${collection}/records`,
        'POST',
        data
      );
      return response;
    } catch (error) {
      console.error(`Error creating record in ${collection}:`, error);
      throw error;
    }
  }

  /**
   * Update record in PocketBase
   */
  async _pbUpdateRecord(collection, recordId, data) {
    try {
      const response = await this._pbFetch(
        `${this.pbUrl}/api/collections/${collection}/records/${recordId}`,
        'PATCH',
        data
      );
      return response;
    } catch (error) {
      console.error(`Error updating record in ${collection}:`, error);
      throw error;
    }
  }

  /**
   * Delete record from PocketBase
   */
  async _pbDeleteRecord(collection, recordId) {
    try {
      await this._pbFetch(
        `${this.pbUrl}/api/collections/${collection}/records/${recordId}`,
        'DELETE'
      );
      return { success: true };
    } catch (error) {
      console.error(`Error deleting record in ${collection}:`, error);
      throw error;
    }
  }

  /**
   * Generic PocketBase API request handler
   */
  async _pbFetch(url, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
      const isHttps = url.startsWith('https');
      const httpModule = isHttps ? https : http;
      
      const urlObj = new URL(url);
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.pbAdminToken || ''
        }
      };

      const req = httpModule.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data || '{}');
            if (res.statusCode >= 400) {
              reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(parsed)}`));
            } else {
              resolve(parsed);
            }
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', reject);

      if (body) {
        req.write(JSON.stringify(body));
      }

      req.end();
    });
  }
}

module.exports = ClusteringService;
