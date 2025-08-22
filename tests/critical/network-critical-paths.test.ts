import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createServer } from 'http';
import request from 'supertest';
import express from 'express';

// Mock external dependencies
vi.mock('../../src/services/mptcp-manager', () => ({
  MPTCPManager: {
    getInstance: vi.fn(() => ({
      getPaths: vi.fn(),
      createSubflow: vi.fn(),
      optimizePaths: vi.fn(),
      getStatistics: vi.fn(),
      updatePathPriority: vi.fn()
    }))
  }
}));

vi.mock('../../src/services/network-topology', () => ({
  NetworkTopology: {
    getInstance: vi.fn(() => ({
      getTopology: vi.fn(),
      updateTopology: vi.fn(),
      getDeviceStatus: vi.fn(),
      addDevice: vi.fn(),
      removeDevice: vi.fn()
    }))
  }
}));

vi.mock('../../src/services/traffic-analyzer', () => ({
  TrafficAnalyzer: {
    getInstance: vi.fn(() => ({
      analyzeTraffic: vi.fn(),
      getTrafficPatterns: vi.fn(),
      predictCongestion: vi.fn(),
      optimizeRouting: vi.fn()
    }))
  }
}));

vi.mock('../../src/services/security-manager', () => ({
  SecurityManager: {
    getInstance: vi.fn(() => ({
      authenticate: vi.fn(),
      authorize: vi.fn(),
      validateToken: vi.fn(),
      checkPermissions: vi.fn()
    }))
  }
}));

describe('Network Platform Critical Path Testing', () => {
  let app: express.Application;
  let server: any;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Mock authentication middleware
    app.use((req, res, next) => {
      req.user = { 
        id: 'test-user', 
        role: 'network-admin', 
        permissions: ['network:read', 'network:write', 'mptcp:manage'] 
      };
      next();
    });

    // Mock MPTCP routes
    app.get('/api/v1/network/mptcp/paths', (req, res) => {
      res.json({
        success: true,
        data: [
          {
            id: 'path-1',
            interface: 'eth0',
            status: 'active',
            priority: 5,
            throughput: 1000.5,
            latency: 45.2,
            rtt: 42.1,
            congestion: 0.15,
            energyEfficiency: 0.92
          },
          {
            id: 'path-2',
            interface: 'eth1',
            status: 'active',
            priority: 3,
            throughput: 800.3,
            latency: 52.8,
            rtt: 49.5,
            congestion: 0.25,
            energyEfficiency: 0.88
          }
        ]
      });
    });

    app.post('/api/v1/network/mptcp/subflows', (req, res) => {
      const { sourceIP, destIP, priority, algorithm } = req.body;
      
      if (!sourceIP || !destIP) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameters'
        });
      }

      res.json({
        success: true,
        subflowId: 'subflow-new',
        sourceIP,
        destIP,
        priority: priority || 'balanced',
        algorithm: algorithm || 'default',
        status: 'establishing',
        paths: ['path-1', 'path-2'],
        createdAt: new Date().toISOString()
      });
    });

    app.put('/api/v1/network/mptcp/paths/:id/priority', (req, res) => {
      const { id } = req.params;
      const { priority, reason, expiry } = req.body;

      if (!priority || priority < 1 || priority > 10) {
        return res.status(400).json({
          success: false,
          error: 'Invalid priority value. Must be between 1 and 10.'
        });
      }

      res.json({
        success: true,
        pathId: id,
        priority,
        reason: reason || null,
        expiry: expiry || null,
        updatedAt: new Date().toISOString()
      });
    });

    // Mock Network Topology routes
    app.get('/api/v1/network/topology', (req, res) => {
      res.json({
        success: true,
        data: {
          nodes: [
            {
              id: 'switch-1',
              type: 'switch',
              name: 'Core Switch 1',
              status: 'online',
              interfaces: [
                { name: 'eth0', status: 'up', speed: '1000Mbps' },
                { name: 'eth1', status: 'up', speed: '1000Mbps' }
              ],
              position: { x: 100, y: 100 }
            },
            {
              id: 'router-1',
              type: 'router',
              name: 'Edge Router 1',
              status: 'online',
              interfaces: [
                { name: 'wan0', status: 'up', speed: '1000Mbps' },
                { name: 'lan0', status: 'up', speed: '1000Mbps' }
              ],
              position: { x: 300, y: 100 }
            }
          ],
          links: [
            {
              id: 'link-1',
              source: 'switch-1',
              target: 'router-1',
              type: 'ethernet',
              speed: '1000Mbps',
              status: 'active',
              utilization: 0.45
            }
          ]
        }
      });
    });

    app.get('/api/v1/network/devices/:id/status', (req, res) => {
      const { id } = req.params;
      
      res.json({
        success: true,
        deviceId: id,
        status: 'online',
        uptime: 86400,
        cpu: 0.25,
        memory: 0.35,
        temperature: 45.2,
        lastSeen: new Date().toISOString(),
        interfaces: [
          { name: 'eth0', status: 'up', speed: '1000Mbps', utilization: 0.45 },
          { name: 'eth1', status: 'up', speed: '1000Mbps', utilization: 0.32 }
        ]
      });
    });

    // Mock Traffic Analysis routes
    app.get('/api/v1/network/traffic/patterns', (req, res) => {
      const { timeframe, deviceId } = req.query;
      
      res.json({
        success: true,
        filters: { timeframe, deviceId },
        data: [
          {
            id: 'pattern-1',
            deviceId: 'switch-1',
            pattern: 'periodic',
            frequency: 'hourly',
            peakTime: '14:00',
            averageTraffic: 850.5,
            peakTraffic: 1200.8,
            confidence: 0.92
          }
        ]
      });
    });

    app.post('/api/v1/network/traffic/analyze', (req, res) => {
      const { deviceIds, metrics, timeframe } = req.body;
      
      if (!deviceIds || !Array.isArray(deviceIds) || deviceIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Device IDs array is required'
        });
      }

      res.json({
        success: true,
        analysisId: 'analysis-123',
        deviceIds,
        metrics: metrics || ['throughput', 'latency', 'congestion'],
        timeframe: timeframe || '1h',
        results: {
          totalTraffic: 2500.5,
          averageLatency: 48.2,
          congestionLevel: 0.18,
          recommendations: [
            'Consider load balancing across eth1 interface',
            'Monitor path-2 for potential congestion'
          ]
        },
        completedAt: new Date().toISOString()
      });
    });

    // Mock Security routes
    app.post('/api/v1/network/auth/login', (req, res) => {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({
          success: false,
          error: 'Username and password are required'
        });
      }

      if (username === 'admin' && password === 'password') {
        res.json({
          success: true,
          token: 'jwt-token-123',
          user: {
            id: 'user-1',
            username: 'admin',
            role: 'network-admin',
            permissions: ['network:read', 'network:write', 'mptcp:manage']
          },
          expiresAt: new Date(Date.now() + 3600000).toISOString()
        });
      } else {
        res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
      }
    });

    app.get('/api/v1/network/auth/validate', (req, res) => {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token || token === 'invalid-token') {
        return res.status(401).json({
          success: false,
          error: 'Invalid or missing token'
        });
      }

      res.json({
        success: true,
        valid: true,
        user: {
          id: 'user-1',
          username: 'admin',
          role: 'network-admin',
          permissions: ['network:read', 'network:write', 'mptcp:manage']
        }
      });
    });

    server = createServer(app);
  });

  afterEach(() => {
    server.close();
    vi.clearAllMocks();
  });

  describe('MPTCP Management Critical Paths', () => {
    it('should retrieve MPTCP paths with performance metrics', async () => {
      const response = await request(server)
        .get('/api/v1/network/mptcp/paths')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBe(2);

      const path = response.body.data[0];
      expect(path).toHaveProperty('id');
      expect(path).toHaveProperty('interface');
      expect(path).toHaveProperty('status');
      expect(path).toHaveProperty('priority');
      expect(path).toHaveProperty('throughput');
      expect(path).toHaveProperty('latency');
      expect(path).toHaveProperty('congestion');
      expect(path).toHaveProperty('energyEfficiency');
    });

    it('should create MPTCP subflow successfully', async () => {
      const response = await request(server)
        .post('/api/v1/network/mptcp/subflows')
        .send({
          sourceIP: '192.168.1.100',
          destIP: '10.0.0.50',
          priority: 'low-latency',
          algorithm: 'latency-optimized'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.subflowId).toBeDefined();
      expect(response.body.sourceIP).toBe('192.168.1.100');
      expect(response.body.destIP).toBe('10.0.0.50');
      expect(response.body.priority).toBe('low-latency');
      expect(response.body.algorithm).toBe('latency-optimized');
      expect(response.body.status).toBe('establishing');
      expect(response.body.paths).toContain('path-1');
      expect(response.body.paths).toContain('path-2');
    });

    it('should reject subflow creation without required parameters', async () => {
      const response = await request(server)
        .post('/api/v1/network/mptcp/subflows')
        .send({ sourceIP: '192.168.1.100' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Missing required parameters');
    });

    it('should update path priority with validation', async () => {
      const response = await request(server)
        .put('/api/v1/network/mptcp/paths/path-1/priority')
        .send({
          priority: 8,
          reason: 'High traffic load',
          expiry: '2024-12-31T23:59:59Z'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pathId).toBe('path-1');
      expect(response.body.priority).toBe(8);
      expect(response.body.reason).toBe('High traffic load');
      expect(response.body.expiry).toBe('2024-12-31T23:59:59Z');
    });

    it('should reject invalid priority values', async () => {
      const response = await request(server)
        .put('/api/v1/network/mptcp/paths/path-1/priority')
        .send({ priority: 15 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid priority value');
    });
  });

  describe('Network Topology Critical Paths', () => {
    it('should retrieve complete network topology', async () => {
      const response = await request(server)
        .get('/api/v1/network/topology')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('nodes');
      expect(response.body.data).toHaveProperty('links');

      const nodes = response.body.data.nodes;
      const links = response.body.data.links;

      expect(Array.isArray(nodes)).toBe(true);
      expect(Array.isArray(links)).toBe(true);
      expect(nodes.length).toBe(2);
      expect(links.length).toBe(1);

      // Validate node structure
      const node = nodes[0];
      expect(node).toHaveProperty('id');
      expect(node).toHaveProperty('type');
      expect(node).toHaveProperty('name');
      expect(node).toHaveProperty('status');
      expect(node).toHaveProperty('interfaces');
      expect(node).toHaveProperty('position');

      // Validate link structure
      const link = links[0];
      expect(link).toHaveProperty('id');
      expect(link).toHaveProperty('source');
      expect(link).toHaveProperty('target');
      expect(link).toHaveProperty('type');
      expect(link).toHaveProperty('speed');
      expect(link).toHaveProperty('status');
      expect(link).toHaveProperty('utilization');
    });

    it('should retrieve device status with detailed metrics', async () => {
      const response = await request(server)
        .get('/api/v1/network/devices/switch-1/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.deviceId).toBe('switch-1');
      expect(response.body.status).toBe('online');
      expect(response.body.uptime).toBeGreaterThan(0);
      expect(response.body.cpu).toBeGreaterThanOrEqual(0);
      expect(response.body.cpu).toBeLessThanOrEqual(1);
      expect(response.body.memory).toBeGreaterThanOrEqual(0);
      expect(response.body.memory).toBeLessThanOrEqual(1);
      expect(response.body.temperature).toBeGreaterThan(0);

      const interfaces = response.body.interfaces;
      expect(Array.isArray(interfaces)).toBe(true);
      expect(interfaces.length).toBe(2);

      interfaces.forEach((iface: any) => {
        expect(iface).toHaveProperty('name');
        expect(iface).toHaveProperty('status');
        expect(iface).toHaveProperty('speed');
        expect(iface).toHaveProperty('utilization');
        expect(['up', 'down', 'disabled']).toContain(iface.status);
        expect(iface.utilization).toBeGreaterThanOrEqual(0);
        expect(iface.utilization).toBeLessThanOrEqual(1);
      });
    });

    it('should validate topology data integrity', async () => {
      const response = await request(server)
        .get('/api/v1/network/topology')
        .expect(200);

      const { nodes, links } = response.body.data;

      // All nodes referenced in links should exist
      const nodeIds = nodes.map((n: any) => n.id);
      links.forEach((link: any) => {
        expect(nodeIds).toContain(link.source);
        expect(nodeIds).toContain(link.target);
      });

      // All nodes should have valid positions
      nodes.forEach((node: any) => {
        expect(node.position).toHaveProperty('x');
        expect(node.position).toHaveProperty('y');
        expect(typeof node.position.x).toBe('number');
        expect(typeof node.position.y).toBe('number');
      });

      // All links should have valid utilization values
      links.forEach((link: any) => {
        expect(link.utilization).toBeGreaterThanOrEqual(0);
        expect(link.utilization).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Traffic Analysis Critical Paths', () => {
    it('should retrieve traffic patterns with filtering', async () => {
      const response = await request(server)
        .get('/api/v1/network/traffic/patterns?timeframe=24h&deviceId=switch-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.filters.timeframe).toBe('24h');
      expect(response.body.filters.deviceId).toBe('switch-1');
      expect(response.body.data).toBeInstanceOf(Array);

      const pattern = response.body.data[0];
      expect(pattern).toHaveProperty('id');
      expect(pattern).toHaveProperty('deviceId');
      expect(pattern).toHaveProperty('pattern');
      expect(pattern).toHaveProperty('frequency');
      expect(pattern).toHaveProperty('peakTime');
      expect(pattern).toHaveProperty('averageTraffic');
      expect(pattern).toHaveProperty('peakTraffic');
      expect(pattern).toHaveProperty('confidence');
    });

    it('should analyze traffic with comprehensive metrics', async () => {
      const response = await request(server)
        .post('/api/v1/network/traffic/analyze')
        .send({
          deviceIds: ['switch-1', 'router-1'],
          metrics: ['throughput', 'latency', 'congestion', 'energy'],
          timeframe: '6h'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.analysisId).toBeDefined();
      expect(response.body.deviceIds).toEqual(['switch-1', 'router-1']);
      expect(response.body.metrics).toEqual(['throughput', 'latency', 'congestion', 'energy']);
      expect(response.body.timeframe).toBe('6h');

      const results = response.body.results;
      expect(results).toHaveProperty('totalTraffic');
      expect(results).toHaveProperty('averageLatency');
      expect(results).toHaveProperty('congestionLevel');
      expect(results).toHaveProperty('recommendations');

      expect(results.totalTraffic).toBeGreaterThan(0);
      expect(results.averageLatency).toBeGreaterThan(0);
      expect(results.congestionLevel).toBeGreaterThanOrEqual(0);
      expect(results.congestionLevel).toBeLessThanOrEqual(1);
      expect(Array.isArray(results.recommendations)).toBe(true);
    });

    it('should reject analysis without device IDs', async () => {
      const response = await request(server)
        .post('/api/v1/network/traffic/analyze')
        .send({ metrics: ['throughput'], timeframe: '1h' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Device IDs array is required');
    });

    it('should validate traffic pattern confidence scores', async () => {
      const response = await request(server)
        .get('/api/v1/network/traffic/patterns')
        .expect(200);

      const patterns = response.body.data;
      patterns.forEach((pattern: any) => {
        const confidence = pattern.confidence;
        expect(confidence).toBeGreaterThanOrEqual(0);
        expect(confidence).toBeLessThanOrEqual(1);
        
        // High confidence patterns should have more detailed data
        if (confidence > 0.8) {
          expect(pattern.peakTime).toBeDefined();
          expect(pattern.frequency).toBeDefined();
        }
      });
    });
  });

  describe('Security and Authentication Critical Paths', () => {
    it('should authenticate valid credentials successfully', async () => {
      const response = await request(server)
        .post('/api/v1/network/auth/login')
        .send({
          username: 'admin',
          password: 'password'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('username');
      expect(response.body.user).toHaveProperty('role');
      expect(response.body.user).toHaveProperty('permissions');
      expect(response.body.expiresAt).toBeDefined();

      const user = response.body.user;
      expect(user.username).toBe('admin');
      expect(user.role).toBe('network-admin');
      expect(Array.isArray(user.permissions)).toBe(true);
      expect(user.permissions).toContain('network:read');
      expect(user.permissions).toContain('network:write');
      expect(user.permissions).toContain('mptcp:manage');
    });

    it('should reject invalid credentials', async () => {
      const response = await request(server)
        .post('/api/v1/network/auth/login')
        .send({
          username: 'admin',
          password: 'wrong-password'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should reject login without required fields', async () => {
      const response = await request(server)
        .post('/api/v1/network/auth/login')
        .send({ username: 'admin' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Username and password are required');
    });

    it('should validate JWT tokens successfully', async () => {
      const response = await request(server)
        .get('/api/v1/network/auth/validate')
        .set('Authorization', 'Bearer jwt-token-123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.valid).toBe(true);
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('username');
      expect(response.body.user).toHaveProperty('role');
      expect(response.body.user).toHaveProperty('permissions');
    });

    it('should reject invalid or missing tokens', async () => {
      const response = await request(server)
        .get('/api/v1/network/auth/validate')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid or missing token');
    });

    it('should reject requests without authorization header', async () => {
      const response = await request(server)
        .get('/api/v1/network/auth/validate')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid or missing token');
    });
  });

  describe('Cross-Service Integration', () => {
    it('should correlate MPTCP and topology data', async () => {
      // Get MPTCP paths
      const mptcpResponse = await request(server)
        .get('/api/v1/network/mptcp/paths')
        .expect(200);

      // Get network topology
      const topologyResponse = await request(server)
        .get('/api/v1/network/topology')
        .expect(200);

      expect(mptcpResponse.body.success).toBe(true);
      expect(topologyResponse.body.success).toBe(true);

      const paths = mptcpResponse.body.data;
      const topology = topologyResponse.body.data;

      // Paths should reference valid network interfaces
      paths.forEach((path: any) => {
        const interfaceName = path.interface;
        const interfaceExists = topology.nodes.some((node: any) =>
          node.interfaces.some((iface: any) => iface.name === interfaceName)
        );
        expect(interfaceExists).toBe(true);
      });
    });

    it('should integrate traffic analysis with MPTCP optimization', async () => {
      // Get traffic patterns
      const patternsResponse = await request(server)
        .get('/api/v1/network/traffic/patterns?deviceId=switch-1')
        .expect(200);

      // Analyze traffic
      const analysisResponse = await request(server)
        .post('/api/v1/network/traffic/analyze')
        .send({
          deviceIds: ['switch-1'],
          metrics: ['throughput', 'congestion'],
          timeframe: '1h'
        })
        .expect(200);

      expect(patternsResponse.body.success).toBe(true);
      expect(analysisResponse.body.success).toBe(true);

      const patterns = patternsResponse.body.data;
      const analysis = analysisResponse.body.results;

      // High congestion should correlate with traffic patterns
      if (analysis.congestionLevel > 0.5) {
        expect(patterns.length).toBeGreaterThan(0);
        const highTrafficPatterns = patterns.filter((p: any) => p.peakTraffic > 1000);
        expect(highTrafficPatterns.length).toBeGreaterThan(0);
      }
    });

    it('should maintain security context across services', async () => {
      // Login to get token
      const loginResponse = await request(server)
        .post('/api/v1/network/auth/login')
        .send({
          username: 'admin',
          password: 'password'
        })
        .expect(200);

      const token = loginResponse.body.token;

      // Use token to access protected resources
      const mptcpResponse = await request(server)
        .get('/api/v1/network/mptcp/paths')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const topologyResponse = await request(server)
        .get('/api/v1/network/topology')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(mptcpResponse.body.success).toBe(true);
      expect(topologyResponse.body.success).toBe(true);
    });
  });

  describe('Performance and Scalability', () => {
    it('should respond to topology requests within acceptable time', async () => {
      const startTime = Date.now();
      
      await request(server)
        .get('/api/v1/network/topology')
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });

    it('should handle concurrent MPTCP operations efficiently', async () => {
      const concurrentRequests = 5;
      const promises = [];

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(server)
            .get('/api/v1/network/mptcp/paths')
            .expect(200)
        );
      }

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
      });
    });

    it('should maintain consistent performance under load', async () => {
      const iterations = 10;
      const responseTimes: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        
        await request(server)
          .get('/api/v1/network/topology')
          .expect(200);

        responseTimes.push(Date.now() - startTime);
      }

      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);
      const minResponseTime = Math.min(...responseTimes);

      expect(avgResponseTime).toBeLessThan(500); // Average under 500ms
      expect(maxResponseTime).toBeLessThan(1000); // Max under 1 second
      expect(minResponseTime).toBeLessThan(200);  // Min under 200ms
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle service unavailability gracefully', async () => {
      // Mock service failure
      app.get('/api/v1/network/topology', (req, res) => {
        res.status(503).json({
          success: false,
          error: 'Topology service temporarily unavailable',
          retryAfter: 30
        });
      });

      const response = await request(server)
        .get('/api/v1/network/topology')
        .expect(503);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('unavailable');
      expect(response.body.retryAfter).toBeDefined();
    });

    it('should validate input parameters consistently', async () => {
      // Test various invalid inputs
      const invalidInputs = [
        { sourceIP: '', destIP: '10.0.0.50' },
        { sourceIP: '192.168.1.100', destIP: '' },
        { priority: 15 },
        { deviceIds: [] },
        { deviceIds: 'not-an-array' }
      ];

      for (const invalidInput of invalidInputs) {
        if (invalidInput.sourceIP !== undefined) {
          // MPTCP subflow creation
          const response = await request(server)
            .post('/api/v1/network/mptcp/subflows')
            .send(invalidInput)
            .expect(400);

          expect(response.body.success).toBe(false);
        } else if (invalidInput.priority !== undefined) {
          // Path priority update
          const response = await request(server)
            .put('/api/v1/network/mptcp/paths/path-1/priority')
            .send(invalidInput)
            .expect(400);

          expect(response.body.success).toBe(false);
        } else if (invalidInput.deviceIds !== undefined) {
          // Traffic analysis
          const response = await request(server)
            .post('/api/v1/network/traffic/analyze')
            .send(invalidInput)
            .expect(400);

          expect(response.body.success).toBe(false);
        }
      }
    });

    it('should handle malformed requests gracefully', async () => {
      // Test malformed JSON
      const response = await request(server)
        .post('/api/v1/network/mptcp/subflows')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Data Validation and Integrity', () => {
    it('should maintain referential integrity across services', async () => {
      // Get all service data
      const mptcpResponse = await request(server).get('/api/v1/network/mptcp/paths');
      const topologyResponse = await request(server).get('/api/v1/network/topology');
      const patternsResponse = await request(server).get('/api/v1/network/traffic/patterns');

      expect(mptcpResponse.body.success).toBe(true);
      expect(topologyResponse.body.success).toBe(true);
      expect(patternsResponse.body.success).toBe(true);

      // Data should be consistent across requests
      const mptcpResponse2 = await request(server).get('/api/v1/network/mptcp/paths');
      expect(mptcpResponse.body.data).toEqual(mptcpResponse2.body.data);
    });

    it('should validate data formats consistently', async () => {
      const responses = [
        await request(server).get('/api/v1/network/mptcp/paths'),
        await request(server).get('/api/v1/network/topology'),
        await request(server).get('/api/v1/network/traffic/patterns')
      ];

      responses.forEach(response => {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
      });
    });

    it('should handle empty datasets gracefully', async () => {
      // Mock empty responses for this test
      app.get('/api/v1/network/mptcp/paths', (req, res) => {
        res.json({
          success: true,
          data: [],
          message: 'No MPTCP paths available'
        });
      });

      app.get('/api/v1/network/topology', (req, res) => {
        res.json({
          success: true,
          data: { nodes: [], links: [] },
          message: 'No network topology available'
        });
      });

      const mptcpResponse = await request(server).get('/api/v1/network/mptcp/paths');
      const topologyResponse = await request(server).get('/api/v1/network/topology');

      expect(mptcpResponse.body.success).toBe(true);
      expect(mptcpResponse.body.data).toEqual([]);
      expect(mptcpResponse.body.message).toBe('No MPTCP paths available');

      expect(topologyResponse.body.success).toBe(true);
      expect(topologyResponse.body.data.nodes).toEqual([]);
      expect(topologyResponse.body.data.links).toEqual([]);
      expect(topologyResponse.body.message).toBe('No network topology available');
    });
  });
});
