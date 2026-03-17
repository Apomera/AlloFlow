# AlloFlow Clustering Backend - Implementation Guide

## Overview

The AlloFlow clustering backend enables multi-node deployments for distributed learning environments. The admin center manages cluster registration, load balancing, and node health monitoring.

**Implemented in Phase 2 (Weeks 6-7)**
- 3 new PocketBase collections (cluster_nodes, cluster_tokens, cluster_config)
- ClusteringService class for cluster management
- 9 IPC handlers for admin center integration
- Full Cluster.jsx UI with token generation, node management, and load balancer config

---

## Architecture

### Data Flow
```
Admin Center UI
    ↓
Electron IPC Handler (cluster:*)
    ↓
ClusteringService (src/services/clusteringService.js)
    ↓
PocketBase API (localhost:8090)
    ↓
PocketBase Collections (cluster_nodes, cluster_tokens, cluster_config)
```

### Collections

#### `cluster_tokens`
Temporary tokens for node joining (24-hour expiration).
```json
{
  "_id": "...",
  "cluster_id": "default-cluster",
  "token": "base64(nodeid|clusterId|expiresAt|signature)",
  "node_name": "Building A",
  "role": "worker",
  "expires_at": "2026-03-18T10:30:00Z",
  "used": false,
  "used_at": null,
  "used_by_ip": null,
  "metadata": { "created_at": "2026-03-17T10:30:00Z" }
}
```

#### `cluster_nodes`
Active nodes in the cluster.
```json
{
  "_id": "...",
  "node_id": "node-a1b2c3d4",
  "cluster_id": "default-cluster",
  "ip_address": "10.0.1.20",
  "port": 8090,
  "role": "worker",
  "status": "online",
  "gpu_type": "nvidia",
  "gpu_count": 2,
  "vram_gb": 24,
  "cpu_cores": 16,
  "memory_gb": 64,
  "models_deployed": ["llama2", "mistral", "neural-voice"],
  "last_heartbeat": "2026-03-17T10:35:45Z",
  "version": "0.2.0",
  "metadata": {
    "joined_at": "2026-03-17T09:00:00Z",
    "hostname": "building-a-server"
  }
}
```

#### `cluster_config`
Cluster-wide configuration (one record per cluster).
```json
{
  "_id": "...",
  "cluster_id": "default-cluster",
  "primary_ip": "10.0.1.10",
  "primary_port": 8090,
  "load_balancer_strategy": "round-robin",
  "heartbeat_interval_seconds": 30,
  "node_timeout_seconds": 90,
  "max_retry_attempts": 3,
  "enable_auto_failover": true,
  "enable_auto_scaling": false,
  "min_nodes": null,
  "max_nodes": null,
  "nginx_config": "upstream alloflow_cluster { ... }",
  "metadata": { "updated_at": "2026-03-17T10:00:00Z" }
}
```

---

## API Reference

### ClusteringService Class

#### `generateClusterToken(clusterId, nodeName, role = 'worker')`
Generate a secure registration token.

**Parameters:**
- `clusterId` (string): Cluster identifier (e.g., "default-cluster")
- `nodeName` (string): Human-readable node name (e.g., "Building A Computer Lab")
- `role` (string, optional): Node role (default: "worker")

**Returns:**
```json
{
  "token": "base64EncodedToken",
  "nodeId": "node-a1b2c3d4",
  "expiresAt": "2026-03-18T10:30:00Z",
  "expiresIn": 86400
}
```

**Example:**
```javascript
const clustering = new ClusteringService('http://localhost:8090');
const result = await clustering.generateClusterToken('default-cluster', 'Building A', 'worker');
console.log(result.token); // Share with node operator
```

---

#### `registerNode(token, nodeIp, nodePort, hardwareInfo = {})`
Register a new node with the cluster.

**Parameters:**
- `token` (string): Token from generateClusterToken()
- `nodeIp` (string): Node's IP address
- `nodePort` (number): Node's port
- `hardwareInfo` (object, optional):
  - `gpuType`: "nvidia" | "amd" | "none"
  - `gpuCount`: number
  - `vramGb`: number
  - `cpuCores`: number
  - `memoryGb`: number
  - `modelsDeployed`: string[]
  - `hostname`: string

**Returns:**
```json
{
  "success": true,
  "nodeId": "node-a1b2c3d4",
  "message": "Node Building A registered successfully",
  "node": { ...node_record }
}
```

**Admin Center Usage:**
```javascript
const result = await window.alloAPI.registerNode(token, '10.0.1.20', 8090, {
  gpuType: 'nvidia',
  gpuCount: 2,
  memoryGb: 64,
  hostname: 'building-a-server'
});
```

---

#### `getClusterNodes(clusterId)`
Get all nodes in a cluster.

**Returns:** Array of node records

**Admin Center Usage:**
```javascript
const nodes = await window.alloAPI.getClusterNodes('default-cluster');
console.log(nodes); // Array of { node_id, ip_address, status, ... }
```

---

#### `getClusterConfig(clusterId)`
Get cluster configuration.

**Returns:** Configuration record

**Admin Center Usage:**
```javascript
const config = await window.alloAPI.getClusterConfig('default-cluster');
console.log(config.load_balancer_strategy); // "round-robin"
```

---

#### `updateClusterConfig(clusterId, configUpdate)`
Update cluster configuration.

**Parameters:**
- `clusterId` (string)
- `configUpdate` (object):
  - `loadBalancerStrategy`: "round-robin" | "least-connections" | "ip-hash"
  - `enableAutoFailover`: boolean
  - `enableAutoScaling`: boolean
  - etc.

**Admin Center Usage:**
```javascript
const updated = await window.alloAPI.updateClusterConfig('default-cluster', {
  loadBalancerStrategy: 'ip-hash',
  enableAutoFailover: true
});
```

---

#### `recordHeartbeat(nodeId, clusterId, status = 'online', metrics = {})`
Keep a node alive with heartbeat ping.

**Parameters:**
- `nodeId` (string): Node's unique ID
- `clusterId` (string): Cluster ID
- `status` (string, optional): "online" | "busy" | etc.
- `metrics` (object, optional): Current node metrics

**Returns:** Updated node record

**Example (Node-side heartbeat loop):**
```javascript
setInterval(async () => {
  await window.alloAPI.recordHeartbeat('node-a1b2c3d4', 'default-cluster', 'online', {
    gpuCount: 2,
    modelsDeployed: ['llama2', 'mistral']
  });
}, 30000); // Every 30 seconds
```

---

#### `cleanupDeadNodes(clusterId)`
Remove nodes that haven't sent heartbeat in 90 seconds.

**Returns:**
```json
{
  "removed": ["node-a1b2c3d4", "node-x9y8z7w6"],
  "message": "Cleaned up 2 dead nodes"
}
```

**Usage:** Run periodically (e.g., every 60 seconds) on primary node
```javascript
setInterval(async () => {
  const result = await window.alloAPI.cleanupDeadNodes('default-cluster');
  console.log(`Cleaned up ${result.removed.length} nodes`);
}, 60000);
```

---

#### `generateNginxConfig(clusterId)`
Generate upstream configuration for nginx load balancer.

**Returns:** nginx config string

**Admin Center Usage:**
```javascript
const nginxConfig = await window.alloAPI.generateNginxConfig('default-cluster');
// Downloads file with generated config based on registered nodes
```

**Generated Example:**
```nginx
# AlloFlow Cluster - Auto-generated on 2026-03-17T10:30:00Z
upstream alloflow_cluster {
    keepalive 32;
    server 10.0.1.20:8090 weight=1;
    server 10.0.1.21:8090 weight=1;
    server 10.0.1.22:8090 weight=1;
}

server {
    listen 80;
    server_name _;
    client_max_body_size 1G;
    proxy_connect_timeout 60s;

    location / {
        proxy_pass http://alloflow_cluster;
        proxy_http_version 1.1;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /health {
        return 200 "OK\n";
    }
}
```

---

#### `removeNode(clusterId, nodeId)`
Manually remove a node from the cluster.

**Parameters:**
- `clusterId` (string)
- `nodeId` (string): Node to remove

**Returns:** Confirmation

**Admin Center Usage:**
```javascript
await window.alloAPI.removeNode('default-cluster', 'node-a1b2c3d4');
// Node automatically removed and nginx config regenerated
```

---

## Admin Center Integration

### Cluster.jsx Features

#### 1. **Token Generation (Step 1)**
- User enters node name
- Admin center generates 24-hour expiration token
- Token displayed for sharing with node operator
- Copy-to-clipboard button

#### 2. **Node Registration (Step 2)**
- Node operator enters IP and port
- Uses generated token to register
- Node immediately joins cluster
- Nginx config auto-regenerated

#### 3. **Node List**
- Shows all registered nodes
- Displays status (online/offline)
- GPU info, models deployed
- Last heartbeat time
- Delete button for manual removal

#### 4. **Load Balancing Strategy**
- Three strategy options (radio buttons)
- Changes applied immediately
- Nginx config auto-regenerated

#### 5. **Nginx Config Download**
- One-click download of generated upstream config
- File: `nginx.conf`
- Ready to use in nginx server block

---

## Implementation Details

### Token Security

Tokens use HMAC-SHA256 signing to prevent tampering:

```javascript
// Token structure (base64 encoded)
{
  "nodeId": "node-a1b2c3d4",
  "clusterId": "default-cluster",
  "nodeName": "Building A",
  "role": "worker",
  "expiresAt": "2026-03-18T10:30:00Z",
  "signature": "a1b2c3d4e5f6..." // HMAC of metadata
}
```

Signature verified on registration to prevent token forgery.

---

### Heartbeat System

- Nodes send heartbeat every 30 seconds (configurable)
- Updates `last_heartbeat` timestamp
- Nodes offline for 90+ seconds auto-removed
- Optional metrics: GPU usage, models deployed

---

### nginx Load Balancing Strategies

1. **round-robin** (default)
   - Distributes evenly across all nodes
   - Best for uniform hardware
   - No session persistence

2. **least-connections**
   - Routes to node with fewest active connections
   - Good for variable request duration
   - Requires nginx `upstream` module

3. **ip-hash**
   - Same client IP → same node (sticky sessions)
   - Good for stateful applications
   - Requires session affinity

---

## Environment Variables

Set these for custom configuration:

```bash
POCKETBASE_URL=http://localhost:8090  # PocketBase server (default)
CLUSTER_SECRET=YourSecretKey          # HMAC signing key (default: AlloFlow-Cluster-Secret-Change-In-Prod)
PRIMARY_NODE_IP=10.0.1.10             # Primary node IP for default config
```

---

## Deployment Workflow

### For Primary Node (Admin Center)

1. Start AlloFlow with admin center
2. Go to Cluster tab
3. Click "Generate Token" (Step 1)
4. Copy token
5. Share with node operator
6. Node operator installs AlloFlow on secondary machine
7. During setup wizard, node operator:
   - Selects "Join Cluster"
   - Enters primary node IP
   - Pastes shared token
   - Selects GPU/AI backend options
8. Node registers and joins cluster
9. Admin center shows node in Cluster tab
10. Download nginx config and deploy to load balancer

### For Secondary Node (Joining Cluster)

1. Run AlloFlow setup wizard
2. Select "Join Cluster" mode
3. Enter primary node IP (10.0.1.10)
4. Enter cluster token (provided by admin)
5. Automated setup handles:
   - Docker installation
   - GPU detection
   - Model downloading
   - Service startup
   - Heartbeat registration

---

## Monitoring & Maintenance

### Check Cluster Health

```javascript
// From admin center
const nodes = await window.alloAPI.getClusterNodes('default-cluster');
const online = nodes.filter(n => n.status === 'online').length;
console.log(`${online}/${nodes.length} nodes online`);
```

### Cleanup Dead Nodes

```javascript
// Automatic: runs every 60 seconds on primary
// Manual:
const result = await window.alloAPI.cleanupDeadNodes('default-cluster');
console.log(result.message);
```

### Update Load Balancing Strategy

```javascript
await window.alloAPI.updateClusterConfig('default-cluster', {
  loadBalancerStrategy: 'ip-hash'
});
// Nginx config auto-regenerated
```

---

## Troubleshooting

### Token Validation Fails
- Check token hasn't expired (24 hours)
- Verify CLUSTER_SECRET matches between admin and node
- Check node has network access to PocketBase

### Node Shows "offline"
- Verify node IP and port are correct
- Check node's heartbeat is being sent
- May auto-recover if node comes back online within 90 seconds

### Nginx Config Not Updating
- Verify nodes are registered in cluster_nodes
- Check nginx.conf download shows all nodes
- May need to manually reload nginx config:
  ```bash
  nginx -s reload
  ```

### Unable to Join Cluster from Node
- Verify primary node IP is correct
- Ensure token hasn't expired
- Check firewall allows port 8090 (PocketBase)
- Review setup wizard logs

---

## Future Enhancements

- [ ] Auto-scaling based on node metrics
- [ ] Health checks with automatic failover
- [ ] Node resource monitoring (CPU, RAM, GPU)
- [ ] Model distribution across nodes
- [ ] Load shedding (queue requests when overloaded)
- [ ] Cluster encryption and mutual TLS
- [ ] Admin dashboard with cluster metrics
- [ ] Multi-cluster federation

---

## Files Changed

- `docker/pocketbase/pb_schema.json` — Added 3 collections
- `admin/src/services/clusteringService.js` — New ClusteringService class
- `admin/main.js` — Added 9 IPC handlers
- `admin/preload.js` — Exposed clustering API
- `admin/src/pages/Cluster.jsx` — Full functioning UI

**Total:** ~1600 lines of clustering code added
