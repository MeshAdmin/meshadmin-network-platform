#!/usr/bin/env node
/**
 * Network Platform - Unified MPTCP Kernel Integration
 * ===================================================
 * 
 * This module provides comprehensive integration between the Network Platform
 * and the unified meshadmin-pathways MPTCP kernel, enabling:
 * 
 * - Real-time MPTCP topology visualization
 * - Network design capabilities for MPTCP networks
 * - Path discovery and mapping
 * - MPTCP connection topology analysis
 * - Integration with network design tools
 */

import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

// Types for MPTCP topology data
interface MPTCPNode {
  id: string;
  type: 'router' | 'switch' | 'endpoint' | 'gateway';
  name: string;
  ipAddress: string;
  mptcpCapable: boolean;
  interfaces: NetworkInterface[];
  position?: { x: number; y: number };
  metadata?: Record<string, any>;
}

interface NetworkInterface {
  id: string;
  name: string;
  ipAddress: string;
  macAddress?: string;
  mtu: number;
  status: 'up' | 'down' | 'unknown';
  bandwidth?: number;
  pathId?: string;
}

interface MPTCPPath {
  id: string;
  sourceInterface: string;
  targetInterface: string;
  sourceNode: string;
  targetNode: string;
  bandwidth: number;
  latency: number;
  packetLoss: number;
  utilization: number;
  priority: number;
  active: boolean;
  pathType: 'primary' | 'backup' | 'load_balance';
}

interface MPTCPConnection {
  id: string;
  localEndpoint: string;
  remoteEndpoint: string;
  state: 'connected' | 'connecting' | 'disconnected';
  paths: MPTCPPath[];
  totalThroughput: number;
  primaryPath: string;
  createdAt: number;
  application?: string;
}

interface NetworkTopology {
  nodes: MPTCPNode[];
  paths: MPTCPPath[];
  connections: MPTCPConnection[];
  timestamp: number;
  version: string;
}

interface TopologyEvent {
  type: 'node_added' | 'node_removed' | 'path_changed' | 'connection_update';
  timestamp: number;
  data: any;
}

export class NetworkPlatformPathwaysIntegration extends EventEmitter {
  private kernelPath: string;
  private bridgeProcess: ChildProcess | null = null;
  public connected = false;
  private topology: NetworkTopology;
  private discoveryInterval: NodeJS.Timeout | null = null;
  private config: any;

  constructor(config: any = {}) {
    super();
    this.config = {
      kernelPath: '../meshadmin-pathways/packages/mptcp-kernel',
      discoveryInterval: config.discoveryInterval || 30000, // 30 seconds
      enableAutoDiscovery: config.enableAutoDiscovery ?? true,
      enablePathOptimization: config.enablePathOptimization ?? true,
      visualizationMode: config.visualizationMode || 'hierarchical',
      ...config
    };

    this.kernelPath = path.resolve(__dirname, this.config.kernelPath);
    
    this.topology = {
      nodes: [],
      paths: [],
      connections: [],
      timestamp: Date.now(),
      version: '1.0.0'
    };

    this.setupErrorHandling();
  }

  /**
   * Connect to the unified MPTCP kernel
   */
  async connect(): Promise<boolean> {
    if (this.connected) return true;

    try {
      console.log('🔌 Network Platform: Connecting to unified MPTCP kernel...');
      
      // Test kernel connectivity
      const testResult = await this.executeKernelCommand('healthCheck');
      if (!testResult.success) {
        throw new Error(testResult.error || 'Kernel health check failed');
      }

      this.connected = true;

      // Start topology discovery
      if (this.config.enableAutoDiscovery) {
        this.startTopologyDiscovery();
      }

      this.emit('connected', { timestamp: Date.now() });
      console.log('✅ Network Platform: Connected to unified MPTCP kernel');
      
      return true;
    } catch (error) {
      console.error('❌ Network Platform: Failed to connect to kernel:', error);
      this.connected = false;
      return false;
    }
  }

  /**
   * Disconnect from the unified MPTCP kernel
   */
  async disconnect(): Promise<void> {
    if (!this.connected) return;

    try {
      if (this.discoveryInterval) {
        clearInterval(this.discoveryInterval);
        this.discoveryInterval = null;
      }

      if (this.bridgeProcess) {
        this.bridgeProcess.kill();
        this.bridgeProcess = null;
      }

      this.connected = false;
      this.emit('disconnected', { timestamp: Date.now() });
      console.log('✅ Network Platform: Disconnected from unified MPTCP kernel');
    } catch (error) {
      console.error('❌ Network Platform: Error during disconnect:', error);
    }
  }

  /**
   * Get current network topology with MPTCP information
   */
  async getNetworkTopology(): Promise<NetworkTopology> {
    if (!this.connected) {
      return this.getMockTopology();
    }

    try {
      // Get topology data from unified kernel
      const [connectionsResult, topologyResult, statsResult] = await Promise.all([
        this.executeKernelCommand('listConnections'),
        this.executeKernelCommand('getTopology'),
        this.executeKernelCommand('getStats')
      ]);

      if (connectionsResult.success && topologyResult.success && statsResult.success) {
        const topology = this.buildTopologyFromKernelData(
          connectionsResult.data,
          topologyResult.data,
          statsResult.data
        );
        
        this.topology = topology;
        this.emit('topology_updated', topology);
        return topology;
      } else {
        console.warn('⚠️ Network Platform: Kernel data retrieval partial failure, using cached topology');
        return this.topology;
      }
    } catch (error) {
      console.error('❌ Network Platform: Error getting topology:', error);
      return this.topology;
    }
  }

  /**
   * Discover and map MPTCP-capable devices on the network
   */
  async discoverMPTCPTopology(): Promise<NetworkTopology> {
    try {
      console.log('🔍 Network Platform: Discovering MPTCP topology...');
      
      const topology = await this.getNetworkTopology();
      
      // Enhance topology with discovery data
      const enhancedTopology = await this.enhanceTopologyWithDiscovery(topology);
      
      this.topology = enhancedTopology;
      this.emit('discovery_complete', enhancedTopology);
      
      console.log(`✅ Network Platform: Discovered ${enhancedTopology.nodes.length} nodes, ${enhancedTopology.paths.length} paths`);
      return enhancedTopology;
    } catch (error) {
      console.error('❌ Network Platform: Discovery failed:', error);
      return this.topology;
    }
  }

  /**
   * Get real-time path metrics for visualization
   */
  async getPathMetrics(): Promise<MPTCPPath[]> {
    if (!this.connected) {
      return this.getMockPaths();
    }

    try {
      const statsResult = await this.executeKernelCommand('getPathStatistics');
      if (statsResult.success) {
        return this.parsePathMetrics(statsResult.data);
      }
      return this.topology.paths;
    } catch (error) {
      console.error('❌ Network Platform: Error getting path metrics:', error);
      return this.topology.paths;
    }
  }

  /**
   * Get active MPTCP connections for topology display
   */
  async getActiveConnections(): Promise<MPTCPConnection[]> {
    if (!this.connected) {
      return this.getMockConnections();
    }

    try {
      const connectionsResult = await this.executeKernelCommand('listConnections');
      if (connectionsResult.success) {
        return this.parseConnections(connectionsResult.data);
      }
      return this.topology.connections;
    } catch (error) {
      console.error('❌ Network Platform: Error getting connections:', error);
      return this.topology.connections;
    }
  }

  /**
   * Optimize network paths for better MPTCP performance
   */
  async optimizeNetworkPaths(criteria: any = {}): Promise<any> {
    if (!this.connected) {
      return { success: false, error: 'Not connected to kernel' };
    }

    try {
      const optimizationResult = await this.executeKernelCommand('optimizePaths', [criteria]);
      
      if (optimizationResult.success) {
        // Refresh topology after optimization
        await this.getNetworkTopology();
        
        this.emit('paths_optimized', optimizationResult.data);
        return optimizationResult.data;
      }
      
      return { success: false, error: optimizationResult.error };
    } catch (error) {
      console.error('❌ Network Platform: Path optimization failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Export topology data for network design tools
   */
  exportTopologyData(format: 'json' | 'graphml' | 'dot' = 'json'): string {
    try {
      switch (format) {
        case 'json':
          return JSON.stringify(this.topology, null, 2);
        
        case 'graphml':
          return this.exportToGraphML(this.topology);
        
        case 'dot':
          return this.exportToDot(this.topology);
        
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      console.error('❌ Network Platform: Export failed:', error);
      return '';
    }
  }

  /**
   * Generate network design recommendations based on MPTCP topology
   */
  async generateDesignRecommendations(): Promise<any[]> {
    try {
      const topology = await this.getNetworkTopology();
      const recommendations = [];

      // Analyze topology for optimization opportunities
      const pathAnalysis = this.analyzePathDistribution(topology);
      const connectivityAnalysis = this.analyzeConnectivity(topology);
      const performanceAnalysis = this.analyzePerformance(topology);

      // Generate recommendations based on analysis
      if (pathAnalysis.hasBottlenecks) {
        recommendations.push({
          type: 'path_optimization',
          priority: 'high',
          title: 'Path Bottlenecks Detected',
          description: 'Multiple MPTCP paths are experiencing high utilization',
          action: 'Consider adding additional network paths or load balancing',
          details: pathAnalysis.bottlenecks
        });
      }

      if (connectivityAnalysis.hasRedundancyIssues) {
        recommendations.push({
          type: 'redundancy',
          priority: 'medium',
          title: 'Network Redundancy Opportunities',
          description: 'Some network segments lack sufficient path redundancy',
          action: 'Add backup paths for critical network segments',
          details: connectivityAnalysis.redundancyIssues
        });
      }

      if (performanceAnalysis.hasLatencyIssues) {
        recommendations.push({
          type: 'performance',
          priority: 'medium',
          title: 'Latency Optimization Opportunities',
          description: 'Some paths have higher than optimal latency',
          action: 'Consider path reordering or route optimization',
          details: performanceAnalysis.latencyIssues
        });
      }

      return recommendations;
    } catch (error) {
      console.error('❌ Network Platform: Recommendation generation failed:', error);
      return [];
    }
  }

  // =========================================================================
  // Private Methods
  // =========================================================================

  private setupErrorHandling(): void {
    this.on('error', (error) => {
      console.error('🔥 Network Platform: Error event:', error);
    });

    process.on('SIGINT', () => {
      console.log('📡 Network Platform: Received SIGINT, cleaning up...');
      this.disconnect();
    });

    process.on('SIGTERM', () => {
      console.log('📡 Network Platform: Received SIGTERM, cleaning up...');
      this.disconnect();
    });
  }

  private async executeKernelCommand(command: string, args: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      const bridgeScript = this.createKernelBridge();
      const process = spawn('node', [bridgeScript, command, ...args.map(arg => JSON.stringify(arg))]);

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            resolve(result);
          } catch (error) {
            reject(new Error(`Invalid JSON response: ${stdout}`));
          }
        } else {
          reject(new Error(`Bridge process failed: ${stderr}`));
        }
      });

      process.on('error', (error) => {
        reject(error);
      });
    });
  }

  private createKernelBridge(): string {
    const bridgeScript = `
const { MptcpKernel } = require('${this.kernelPath}/src/index.js');

class NetworkPlatformBridge {
    constructor() {
        this.kernel = new MptcpKernel({
            endpoint: 'localhost',
            port: 9090,
            secure: false
        });
    }

    async execute(command, args = []) {
        try {
            await this.kernel.connect();
            
            let result;
            switch (command) {
                case 'healthCheck':
                    result = await this.kernel.healthCheck();
                    break;
                case 'listConnections':
                    result = await this.kernel.listConnections();
                    break;
                case 'getTopology':
                    result = await this.kernel.getTopology();
                    break;
                case 'getStats':
                    result = await this.kernel.getStats();
                    break;
                case 'getPathStatistics':
                    result = await this.kernel.getPathStatistics();
                    break;
                case 'optimizePaths':
                    result = await this.kernel.optimizePaths(args[0] || {});
                    break;
                default:
                    throw new Error(\`Unknown command: \${command}\`);
            }
            
            return { success: true, data: result };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

if (require.main === module) {
    const bridge = new NetworkPlatformBridge();
    const command = process.argv[2];
    const args = process.argv.slice(3).map(arg => {
        try { return JSON.parse(arg); } catch { return arg; }
    });
    
    bridge.execute(command, args).then(result => {
        console.log(JSON.stringify(result));
        process.exit(0);
    }).catch(error => {
        console.log(JSON.stringify({ success: false, error: error.message }));
        process.exit(1);
    });
}
`;

    const bridgePath = path.join(__dirname, 'network_platform_bridge.js');
    fs.writeFileSync(bridgePath, bridgeScript);
    return bridgePath;
  }

  private startTopologyDiscovery(): void {
    this.discoveryInterval = setInterval(async () => {
      try {
        await this.discoverMPTCPTopology();
      } catch (error) {
        console.error('❌ Network Platform: Discovery error:', error);
      }
    }, this.config.discoveryInterval);

    console.log(`🔍 Network Platform: Topology discovery started (interval: ${this.config.discoveryInterval}ms)`);
  }

  private buildTopologyFromKernelData(connections: any, topology: any, stats: any): NetworkTopology {
    const nodes: MPTCPNode[] = [];
    const paths: MPTCPPath[] = [];
    const mpTcpConnections: MPTCPConnection[] = [];

    // Process connections data
    if (connections.connections) {
      for (const conn of connections.connections) {
        // Create nodes from connection endpoints
        const localNode = this.createNodeFromEndpoint(conn.localEndpoint, 'endpoint');
        const remoteNode = this.createNodeFromEndpoint(conn.remoteEndpoint, 'endpoint');
        
        nodes.push(localNode, remoteNode);

        // Create paths from subflows
        if (conn.subflows) {
          for (const subflow of conn.subflows) {
            const path: MPTCPPath = {
              id: `path_${subflow.id || Math.random().toString(36).substr(2, 9)}`,
              sourceInterface: subflow.localInterface || 'unknown',
              targetInterface: subflow.remoteInterface || 'unknown',
              sourceNode: localNode.id,
              targetNode: remoteNode.id,
              bandwidth: subflow.bandwidth || 100,
              latency: subflow.rttMs || 10,
              packetLoss: subflow.packetLoss || 0,
              utilization: subflow.utilization || 0.5,
              priority: subflow.priority || 1,
              active: subflow.state === 'active',
              pathType: subflow.priority === 1 ? 'primary' : 'backup'
            };
            paths.push(path);
          }
        }

        // Create MPTCP connection
        const mptcpConn: MPTCPConnection = {
          id: conn.id,
          localEndpoint: conn.localEndpoint,
          remoteEndpoint: conn.remoteEndpoint,
          state: conn.state === 'CONNECTED' ? 'connected' : 'disconnected',
          paths: paths.filter(p => p.sourceNode === localNode.id && p.targetNode === remoteNode.id),
          totalThroughput: conn.throughput || 0,
          primaryPath: paths.find(p => p.pathType === 'primary')?.id || '',
          createdAt: Date.now(),
          application: conn.metadata?.application || 'unknown'
        };
        mpTcpConnections.push(mptcpConn);
      }
    }

    return {
      nodes: this.deduplicateNodes(nodes),
      paths,
      connections: mpTcpConnections,
      timestamp: Date.now(),
      version: '1.0.0'
    };
  }

  private createNodeFromEndpoint(endpoint: string, type: 'router' | 'switch' | 'endpoint' | 'gateway' = 'endpoint'): MPTCPNode {
    const [ip, port] = endpoint.split(':');
    
    return {
      id: `node_${ip.replace(/\./g, '_')}`,
      type,
      name: `Node ${ip}`,
      ipAddress: ip,
      mptcpCapable: true,
      interfaces: [{
        id: `if_${ip.replace(/\./g, '_')}_0`,
        name: 'eth0',
        ipAddress: ip,
        mtu: 1500,
        status: 'up'
      }],
      position: this.generateNodePosition(),
      metadata: { port }
    };
  }

  private generateNodePosition(): { x: number; y: number } {
    return {
      x: Math.random() * 800 + 100,
      y: Math.random() * 600 + 100
    };
  }

  private deduplicateNodes(nodes: MPTCPNode[]): MPTCPNode[] {
    const nodeMap = new Map<string, MPTCPNode>();
    
    for (const node of nodes) {
      if (!nodeMap.has(node.id)) {
        nodeMap.set(node.id, node);
      }
    }
    
    return Array.from(nodeMap.values());
  }

  private async enhanceTopologyWithDiscovery(topology: NetworkTopology): Promise<NetworkTopology> {
    // Add discovery-based enhancements
    // This could include SNMP discovery, ping sweeps, etc.
    
    // For now, return enhanced version with additional metadata
    return {
      ...topology,
      nodes: topology.nodes.map(node => ({
        ...node,
        metadata: {
          ...node.metadata,
          discoveredAt: Date.now(),
          discoveryMethod: 'mptcp_kernel'
        }
      }))
    };
  }

  private parsePathMetrics(data: any): MPTCPPath[] {
    // Parse path statistics from kernel data
    if (!data.paths) return [];
    
    return data.paths.map((path: any, index: number) => ({
      id: path.id || `path_${index}`,
      sourceInterface: path.source || 'unknown',
      targetInterface: path.target || 'unknown',
      sourceNode: path.sourceNode || 'unknown',
      targetNode: path.targetNode || 'unknown',
      bandwidth: path.bandwidth || 100,
      latency: path.latency || 10,
      packetLoss: path.packetLoss || 0,
      utilization: path.utilization || 0.5,
      priority: path.priority || 1,
      active: path.active !== false,
      pathType: path.priority === 1 ? 'primary' : 'backup'
    }));
  }

  private parseConnections(data: any): MPTCPConnection[] {
    if (!data.connections) return [];
    
    return data.connections.map((conn: any) => ({
      id: conn.id,
      localEndpoint: conn.localEndpoint,
      remoteEndpoint: conn.remoteEndpoint,
      state: conn.state === 'CONNECTED' ? 'connected' : 'disconnected',
      paths: [],
      totalThroughput: conn.throughput || 0,
      primaryPath: '',
      createdAt: conn.createdAt || Date.now(),
      application: conn.metadata?.application || 'unknown'
    }));
  }

  private analyzePathDistribution(topology: NetworkTopology): any {
    const utilizationThreshold = 0.8;
    const bottlenecks = topology.paths.filter(path => path.utilization > utilizationThreshold);
    
    return {
      hasBottlenecks: bottlenecks.length > 0,
      bottlenecks: bottlenecks.map(path => ({
        pathId: path.id,
        utilization: path.utilization,
        recommendation: 'Consider load balancing or adding parallel paths'
      }))
    };
  }

  private analyzeConnectivity(topology: NetworkTopology): any {
    // Simple redundancy analysis
    const nodeConnections = new Map<string, number>();
    
    for (const path of topology.paths) {
      nodeConnections.set(path.sourceNode, (nodeConnections.get(path.sourceNode) || 0) + 1);
      nodeConnections.set(path.targetNode, (nodeConnections.get(path.targetNode) || 0) + 1);
    }
    
    const lowConnectivityNodes = Array.from(nodeConnections.entries())
      .filter(([_, count]) => count < 2)
      .map(([nodeId, _]) => nodeId);
    
    return {
      hasRedundancyIssues: lowConnectivityNodes.length > 0,
      redundancyIssues: lowConnectivityNodes.map(nodeId => ({
        nodeId,
        recommendation: 'Add additional network paths for redundancy'
      }))
    };
  }

  private analyzePerformance(topology: NetworkTopology): any {
    const latencyThreshold = 50; // 50ms
    const highLatencyPaths = topology.paths.filter(path => path.latency > latencyThreshold);
    
    return {
      hasLatencyIssues: highLatencyPaths.length > 0,
      latencyIssues: highLatencyPaths.map(path => ({
        pathId: path.id,
        latency: path.latency,
        recommendation: 'Consider route optimization or QoS policies'
      }))
    };
  }

  private exportToGraphML(topology: NetworkTopology): string {
    // GraphML export implementation
    let graphml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    graphml += '<graphml xmlns="http://graphml.graphdrawing.org/xmlns">\n';
    graphml += '  <graph id="mptcp_topology" edgedefault="undirected">\n';
    
    // Add nodes
    for (const node of topology.nodes) {
      graphml += `    <node id="${node.id}">\n`;
      graphml += `      <data key="name">${node.name}</data>\n`;
      graphml += `      <data key="type">${node.type}</data>\n`;
      graphml += `    </node>\n`;
    }
    
    // Add edges (paths)
    for (const path of topology.paths) {
      graphml += `    <edge source="${path.sourceNode}" target="${path.targetNode}">\n`;
      graphml += `      <data key="bandwidth">${path.bandwidth}</data>\n`;
      graphml += `      <data key="latency">${path.latency}</data>\n`;
      graphml += `    </edge>\n`;
    }
    
    graphml += '  </graph>\n';
    graphml += '</graphml>';
    
    return graphml;
  }

  private exportToDot(topology: NetworkTopology): string {
    // DOT format export for Graphviz
    let dot = 'graph mptcp_topology {\n';
    
    // Add nodes
    for (const node of topology.nodes) {
      dot += `  "${node.id}" [label="${node.name}" shape="${node.type === 'router' ? 'box' : 'ellipse'}"];\n`;
    }
    
    // Add edges
    for (const path of topology.paths) {
      dot += `  "${path.sourceNode}" -- "${path.targetNode}" [label="${path.bandwidth}Mbps"];\n`;
    }
    
    dot += '}\n';
    
    return dot;
  }

  private getMockTopology(): NetworkTopology {
    return {
      nodes: [
        {
          id: 'node_192_168_1_1',
          type: 'router',
          name: 'Gateway Router',
          ipAddress: '192.168.1.1',
          mptcpCapable: true,
          interfaces: [
            { id: 'if_gw_eth0', name: 'eth0', ipAddress: '192.168.1.1', mtu: 1500, status: 'up' },
            { id: 'if_gw_eth1', name: 'eth1', ipAddress: '10.0.0.1', mtu: 1500, status: 'up' }
          ],
          position: { x: 400, y: 100 }
        },
        {
          id: 'node_192_168_1_10',
          type: 'endpoint',
          name: 'Client A',
          ipAddress: '192.168.1.10',
          mptcpCapable: true,
          interfaces: [
            { id: 'if_ca_eth0', name: 'eth0', ipAddress: '192.168.1.10', mtu: 1500, status: 'up' }
          ],
          position: { x: 200, y: 300 }
        }
      ],
      paths: [
        {
          id: 'path_1',
          sourceInterface: 'if_ca_eth0',
          targetInterface: 'if_gw_eth0',
          sourceNode: 'node_192_168_1_10',
          targetNode: 'node_192_168_1_1',
          bandwidth: 100,
          latency: 5,
          packetLoss: 0.01,
          utilization: 0.3,
          priority: 1,
          active: true,
          pathType: 'primary'
        }
      ],
      connections: [],
      timestamp: Date.now(),
      version: '1.0.0'
    };
  }

  private getMockPaths(): MPTCPPath[] {
    return this.getMockTopology().paths;
  }

  private getMockConnections(): MPTCPConnection[] {
    return [
      {
        id: 'conn_mock_1',
        localEndpoint: '192.168.1.10:8080',
        remoteEndpoint: '192.168.1.1:80',
        state: 'connected',
        paths: this.getMockPaths(),
        totalThroughput: 50.5,
        primaryPath: 'path_1',
        createdAt: Date.now() - 30000,
        application: 'mock_application'
      }
    ];
  }
}

// Export singleton instance
let globalIntegration: NetworkPlatformPathwaysIntegration | null = null;

export function getNetworkPlatformIntegration(config?: any): NetworkPlatformPathwaysIntegration {
  if (!globalIntegration) {
    globalIntegration = new NetworkPlatformPathwaysIntegration(config);
  }
  return globalIntegration;
}

export function startNetworkPlatformIntegration(config?: any): Promise<boolean> {
  const integration = getNetworkPlatformIntegration(config);
  return integration.connect();
}

export function stopNetworkPlatformIntegration(): Promise<void> {
  if (globalIntegration) {
    return globalIntegration.disconnect();
  }
  return Promise.resolve();
}

// CLI interface for testing
if (require.main === module) {
  console.log('🧪 Testing Network Platform Pathways Integration...');
  
  const integration = new NetworkPlatformPathwaysIntegration({
    discoveryInterval: 5000,
    enableAutoDiscovery: true
  });

  integration.connect().then(success => {
    if (success) {
      console.log('✅ Integration test successful');
      
      // Test topology discovery
      integration.getNetworkTopology().then(topology => {
        console.log(`📊 Topology: ${topology.nodes.length} nodes, ${topology.paths.length} paths`);
        
        // Test design recommendations
        integration.generateDesignRecommendations().then(recommendations => {
          console.log(`💡 Generated ${recommendations.length} design recommendations`);
          
          // Stop after testing
          setTimeout(() => {
            integration.disconnect();
          }, 2000);
        });
      });
    } else {
      console.log('❌ Integration test failed');
    }
  });
} 