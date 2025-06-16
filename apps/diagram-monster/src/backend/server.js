const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS
app.use(cors());

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, '../..', 'dist')));

// Explicitly serve static assets from the assets directory
app.use('/assets', express.static(path.join(__dirname, '../..', 'dist/assets')));

// Determine file type based on extension or content
function getFileType(filePath, content) {
  const extension = path.extname(filePath).toLowerCase();
  
  if (extension === '.xml') {
    return 'xml';
  } else if (extension === '.json') {
    return 'json';
  } else if (extension === '.txt' || extension === '.conf' || extension === '.cfg') {
    // Try to detect format based on content
    if (content.includes('<?xml')) {
      return 'xml';
    } else if (content.trim().startsWith('{') && content.trim().endsWith('}')) {
      return 'json';
    } else {
      return 'text';
    }
  }
  
  // Default to text-based parsing
  return 'text';
}

// Parse XML configuration (e.g., WatchGuard)
function parseXmlConfiguration(content) {
  const nodes = [];
  const edges = [];
  
  try {
    console.log('Parsing XML configuration...');
    console.log('Content preview:', content.substring(0, 200));
    
    if (!content || content.trim() === '') {
      console.error('Empty XML content received');
      throw new Error('Empty configuration file');
    }
    
    // Check if content is valid XML-like
    if (!content.includes('<') || !content.includes('>')) {
      console.error('Content does not appear to be XML format');
      throw new Error('Invalid XML format');
    }
    
    // Extract hostname with more flexible patterns
    const hostnamePatterns = [
      /<name>([\w\-\.]+)<\/name>/,
      /<hostname>([\w\-\.]+)<\/hostname>/,
      /<device-name>([\w\-\.]+)<\/device-name>/,
      /<system-name>([\w\-\.]+)<\/system-name>/,
      /<device[^>]*>\s*<name>([\w\-\.]+)<\/name>/
    ];
    
    let hostname = 'Unknown Device';
    let hostnameMatch = null;
    
    for (const pattern of hostnamePatterns) {
      hostnameMatch = content.match(pattern);
      if (hostnameMatch) {
        hostname = hostnameMatch[1];
        console.log(`Found hostname: ${hostname} using pattern: ${pattern}`);
        break;
      }
    }
    
    // Add device as node
    nodes.push({
      id: hostname,
      label: hostname,
      shape: 'box',
      title: `Device: ${hostname}`
    });
    
    // Extract interfaces with more flexible patterns and capture additional details
    const interfacePatterns = [
      /<interface[\s\S]*?<name>([\w\/\-\.]+)<\/name>[\s\S]*?(?:<type>([\w\-]+)<\/type>)?[\s\S]*?(?:<ip>([\d\.]+)<\/ip>)?[\s\S]*?(?:<vlan>(\d+)<\/vlan>)?[\s\S]*?<\/interface>/g,
      /<port[\s\S]*?<name>([\w\/\-\.]+)<\/name>[\s\S]*?(?:<type>([\w\-]+)<\/type>)?[\s\S]*?(?:<speed>([\w\-]+)<\/speed>)?[\s\S]*?<\/port>/g,
      /<ethernet[\s\S]*?<name>([\w\/\-\.]+)<\/name>[\s\S]*?(?:<type>([\w\-]+)<\/type>)?[\s\S]*?(?:<mode>([\w\-]+)<\/mode>)?[\s\S]*?<\/ethernet>/g,
      /<physical-interface[\s\S]*?<name>([\w\/\-\.]+)<\/name>[\s\S]*?(?:<type>([\w\-]+)<\/type>)?[\s\S]*?(?:<status>([\w\-]+)<\/status>)?[\s\S]*?<\/physical-interface>/g,
      /<intf[\s\S]*?<name>([\w\/\-\.]+)<\/name>[\s\S]*?(?:<type>([\w\-]+)<\/type>)?[\s\S]*?(?:<role>([\w\-]+)<\/role>)?[\s\S]*?<\/intf>/g
    ];

    // Helper function to determine interface type and color
    function getInterfaceProperties(name, type, extraInfo) {
      let interfaceType = 'unknown';
      let color = '#808080';
      let shape = 'dot';

      // Determine interface type based on name and type
      if (name.toLowerCase().includes('wan') || type?.toLowerCase().includes('wan')) {
        interfaceType = 'WAN';
        color = '#FF4500';
        shape = 'diamond';
      } else if (name.toLowerCase().includes('lan') || type?.toLowerCase().includes('lan')) {
        interfaceType = 'LAN';
        color = '#32CD32';
        shape = 'dot';
      } else if (name.toLowerCase().includes('dmz') || type?.toLowerCase().includes('dmz')) {
        interfaceType = 'DMZ';
        color = '#FFD700';
        shape = 'triangle';
      } else if (name.toLowerCase().includes('mgmt') || type?.toLowerCase().includes('management')) {
        interfaceType = 'Management';
        color = '#4169E1';
        shape = 'star';
      }

      return { interfaceType, color, shape };
    }
    
    let interfaceMatches = [];
    for (const pattern of interfacePatterns) {
      const matches = Array.from(content.matchAll(pattern)) || [];
      if (matches.length > 0) {
        console.log(`Found ${matches.length} interfaces using pattern: ${pattern}`);
      }
      interfaceMatches = interfaceMatches.concat(matches);
    }
    
    console.log(`Found ${interfaceMatches.length} total interfaces`);
    
    // If no interfaces found with standard patterns, try simpler pattern
    if (interfaceMatches.length === 0) {
      const simpleInterfacePattern = /<([\w\-]+)[^>]*>\s*<name>([\w\/\-\.]+)<\/name>/g;
      const simpleMatches = Array.from(content.matchAll(simpleInterfacePattern)) || [];
      
      console.log(`Trying simpler pattern, found ${simpleMatches.length} potential interfaces`);
      
      simpleMatches.forEach((match, index) => {
        const elementType = match[1];
        const interfaceName = match[2];
        
        // Only consider elements that might be interfaces
        if (elementType.includes('interface') || elementType.includes('port') || 
            elementType.includes('ethernet') || elementType.includes('intf')) {
          console.log(`Found interface with simple pattern: ${interfaceName} (${elementType})`);
          
          // Determine interface properties based on name and type
          const { interfaceType, color, shape } = getInterfaceProperties(interfaceName, elementType);
          
          nodes.push({
            id: `${interfaceName}_${index}`,
            label: interfaceName,
            shape: shape,
            color: color,
            title: `Interface: ${interfaceName} (${interfaceType})`
          });
          
          edges.push({
            from: hostname,
            to: `${interfaceName}_${index}`,
            arrows: 'to,from',
            physics: true,
            color: { color: color, opacity: 0.8 },
            smooth: { type: 'curvedCW', roundness: 0.2 }
          });
        }
      });
    } else {
      // Process interfaces found with standard patterns
      interfaceMatches.forEach((match, index) => {
        const interfaceName = match[1];
        const interfaceType = match[2] || '';
        const ipAddress = match[3] || '';
        const vlanId = match[4] || '';
        
        console.log(`Processing interface: ${interfaceName} (Type: ${interfaceType})`);
        
        // Determine interface properties based on name and type
        const { interfaceType: type, color, shape } = getInterfaceProperties(interfaceName, interfaceType);
        
        // Build a more informative tooltip
        let tooltip = `Interface: ${interfaceName} (${type})`;
        if (ipAddress) tooltip += `<br>IP: ${ipAddress}`;
        if (vlanId) tooltip += `<br>VLAN: ${vlanId}`;
        
        nodes.push({
          id: `${interfaceName}_${index}`,
          label: interfaceName,
          shape: shape,
          color: color,
          title: tooltip
        });
        
        edges.push({
          from: hostname,
          to: `${interfaceName}_${index}`,
          arrows: 'to,from',
          physics: true,
          color: { color: color, opacity: 0.8 },
          smooth: { type: 'curvedCW', roundness: 0.2 }
        });
      });
    }
    
    console.log(`Parsing complete. Found ${nodes.length} nodes and ${edges.length} edges`);
    
    // If we only have one node (the device itself), add a warning node
    if (nodes.length === 1) {
      console.warn('No interfaces found in the XML configuration');
      nodes.push({
        id: 'no_interfaces_found',
        label: 'No interfaces found',
        shape: 'text',
        color: '#FF0000'
      });
      
      edges.push({
        from: hostname,
        to: 'no_interfaces_found',
        dashes: true,
        color: '#FF0000'
      });
    }
  } catch (error) {
    console.error('Error parsing XML configuration:', error);
    throw new Error(`Failed to parse XML configuration: ${error.message}`);
  }
  
  return { nodes, edges };
}

// Parse JSON configuration
function parseJsonConfiguration(content) {
  const nodes = [];
  const edges = [];
  
  try {
    const config = JSON.parse(content);
    
    // Extract hostname
    const hostname = config.hostname || config.name || config.device || 'Unknown Device';
    
    // Add device as node
    nodes.push({
      id: hostname,
      label: hostname,
      shape: 'box',
      title: `Device: ${hostname}`
    });
    
    // Extract interfaces
    const interfaces = config.interfaces || config.ports || [];
    
    interfaces.forEach((int, index) => {
      const interfaceName = int.name || int.id || `Interface ${index}`;
      const interfaceType = int.type || int.interface_type || '';
      const ipAddress = int.ip || int.ipAddress || int.address || '';
      const vlanId = int.vlan || int.vlanId || '';
      
      // Determine interface properties based on name and type
      let interfaceCategory = 'unknown';
      let color = '#808080';
      let shape = 'dot';
      
      // Determine interface type based on name and type
      if (interfaceName.toLowerCase().includes('wan') || 
          interfaceType?.toLowerCase().includes('wan') || 
          int.role?.toLowerCase().includes('external')) {
        interfaceCategory = 'WAN';
        color = '#FF4500';
        shape = 'diamond';
      } else if (interfaceName.toLowerCase().includes('lan') || 
                interfaceType?.toLowerCase().includes('lan') || 
                int.role?.toLowerCase().includes('internal')) {
        interfaceCategory = 'LAN';
        color = '#32CD32';
        shape = 'dot';
      } else if (interfaceName.toLowerCase().includes('dmz') || 
                interfaceType?.toLowerCase().includes('dmz')) {
        interfaceCategory = 'DMZ';
        color = '#FFD700';
        shape = 'triangle';
      } else if (interfaceName.toLowerCase().includes('mgmt') || 
                interfaceType?.toLowerCase().includes('management') || 
                interfaceName.toLowerCase().includes('admin')) {
        interfaceCategory = 'Management';
        color = '#4169E1';
        shape = 'star';
      }
      
      // Build a more informative tooltip
      let tooltip = `Interface: ${interfaceName} (${interfaceCategory})`;
      if (ipAddress) tooltip += `<br>IP: ${ipAddress}`;
      if (vlanId) tooltip += `<br>VLAN: ${vlanId}`;
      if (int.description) tooltip += `<br>Description: ${int.description}`;
      if (int.status) tooltip += `<br>Status: ${int.status}`;
      
      nodes.push({
        id: `${interfaceName}_${index}`,
        label: interfaceName,
        shape: shape,
        color: color,
        group: interfaceCategory,
        title: tooltip
      });
      
      edges.push({
        from: hostname,
        to: `${interfaceName}_${index}`,
        arrows: 'to,from',
        physics: true,
        color: { color: color, opacity: 0.8 },
        smooth: { type: 'curvedCW', roundness: 0.2 },
        title: ipAddress ? `IP: ${ipAddress}` : interfaceName
      });
      
      // If this interface has connections to other devices, add them
      if (int.connections || int.peers) {
        const connections = int.connections || int.peers || [];
        connections.forEach((conn, connIndex) => {
          const peerName = conn.device || conn.hostname || conn.name || `Peer ${connIndex}`;
          const peerInterface = conn.interface || conn.port || '';
          
          // Add the peer device if it doesn't exist
          if (!nodes.some(n => n.id === peerName)) {
            nodes.push({
              id: peerName,
              label: peerName,
              shape: 'box',
              title: `Device: ${peerName}`
            });
          }
          
          // Add the connection between interfaces
          edges.push({
            from: `${interfaceName}_${index}`,
            to: peerName,
            arrows: 'to,from',
            physics: true,
            color: { color: color, opacity: 0.8 },
            smooth: { type: 'curvedCW', roundness: 0.2 },
            title: peerInterface ? `Connected to: ${peerInterface}` : 'Connected'
          });
        });
      }
    });
  } catch (error) {
    console.error('Error parsing JSON:', error);
  }
  
  return { nodes, edges };
}

// Parse text-based configuration (e.g., Cisco)
function parseTextConfiguration(content) {
  const nodes = [];
  const edges = [];
  
  // Enhanced parsing logic for text-based configs
  const interfaces = content.match(/interface ([\w\/\-\.]+)/g) || [];
  const hostnames = content.match(/hostname ([\w\-\.]+)/g) || [];
  
  // Extract IP addresses and descriptions for interfaces
  const ipAddresses = {};
  const descriptions = {};
  const interfaceTypes = {};
  const vlanInfo = {};
  
  // Match IP addresses for interfaces
  const ipMatches = content.matchAll(/interface ([\w\/\-\.]+)[\s\S]*?ip address ([\d\.]+)/g);
  for (const match of ipMatches) {
    ipAddresses[match[1]] = match[2];
  }
  
  // Match descriptions for interfaces
  const descMatches = content.matchAll(/interface ([\w\/\-\.]+)[\s\S]*?description ([^\n]+)/g);
  for (const match of descMatches) {
    descriptions[match[1]] = match[2].trim();
  }
  
  // Match VLAN information
  const vlanMatches = content.matchAll(/interface ([\w\/\-\.]+)[\s\S]*?(?:switchport access vlan|vlan-id) (\d+)/g);
  for (const match of vlanMatches) {
    vlanInfo[match[1]] = match[2];
  }
  
  // Determine interface types based on naming conventions and configuration
  for (const int of interfaces) {
    const name = int.split(' ')[1];
    
    if (name.match(/^(Gi|GigabitEthernet|Te|TenGigabitEthernet|Eth|Ethernet)/i)) {
      if (content.match(new RegExp(`interface ${name}[\s\S]*?switchport mode trunk`, 'i'))) {
        interfaceTypes[name] = 'trunk';
      } else if (content.match(new RegExp(`interface ${name}[\s\S]*?ip address`, 'i'))) {
        interfaceTypes[name] = 'routed';
      } else {
        interfaceTypes[name] = 'access';
      }
    } else if (name.match(/^(Fa|FastEthernet)/i)) {
      interfaceTypes[name] = 'LAN';
    } else if (name.match(/^(Se|Serial|WAN|Cellular)/i)) {
      interfaceTypes[name] = 'WAN';
    } else if (name.match(/^(Lo|Loopback)/i)) {
      interfaceTypes[name] = 'virtual';
    } else if (name.match(/^(Vl|VLAN)/i)) {
      interfaceTypes[name] = 'VLAN';
    } else if (name.match(/^(Tu|Tunnel)/i)) {
      interfaceTypes[name] = 'tunnel';
    } else if (name.match(/^(Po|Port-channel)/i)) {
      interfaceTypes[name] = 'aggregated';
    } else if (name.match(/^(Mgmt|Management)/i)) {
      interfaceTypes[name] = 'Management';
    }
  }
  
  // Add device as node
  let hostname = 'Unknown Device';
  if (hostnames.length > 0) {
    hostname = hostnames[0].split(' ')[1];
    nodes.push({
      id: hostname,
      label: hostname,
      shape: 'box',
      title: `Device: ${hostname}`
    });
  }
  
  // Add interfaces as nodes and create connections with improved visualization
  interfaces.forEach((int, index) => {
    const interfaceName = int.split(' ')[1];
    const interfaceType = interfaceTypes[interfaceName] || '';
    const ipAddress = ipAddresses[interfaceName] || '';
    const description = descriptions[interfaceName] || '';
    const vlan = vlanInfo[interfaceName] || '';
    
    // Determine interface properties based on name and type
    let interfaceCategory = 'unknown';
    let color = '#808080';
    let shape = 'dot';
    
    // Determine interface category based on name and type
    if (interfaceName.toLowerCase().includes('wan') || 
        interfaceType.toLowerCase().includes('wan') || 
        interfaceName.match(/^(Se|Serial|Cellular)/i)) {
      interfaceCategory = 'WAN';
      color = '#FF4500';
      shape = 'diamond';
    } else if (interfaceName.toLowerCase().includes('lan') || 
              interfaceType.toLowerCase().includes('lan') || 
              interfaceName.match(/^(Fa|FastEthernet|Gi|GigabitEthernet)/i) && !interfaceName.toLowerCase().includes('wan')) {
      interfaceCategory = 'LAN';
      color = '#32CD32';
      shape = 'dot';
    } else if (interfaceName.toLowerCase().includes('dmz')) {
      interfaceCategory = 'DMZ';
      color = '#FFD700';
      shape = 'triangle';
    } else if (interfaceName.toLowerCase().includes('mgmt') || 
              interfaceType.toLowerCase().includes('management') || 
              interfaceName.match(/^(Mgmt|Management)/i)) {
      interfaceCategory = 'Management';
      color = '#4169E1';
      shape = 'star';
    } else if (interfaceName.match(/^(Vl|VLAN)/i)) {
      interfaceCategory = 'VLAN';
      color = '#9370DB'; // Medium purple
      shape = 'hexagon';
    } else if (interfaceName.match(/^(Lo|Loopback)/i)) {
      interfaceCategory = 'Loopback';
      color = '#20B2AA'; // Light sea green
      shape = 'dot';
    } else if (interfaceName.match(/^(Tu|Tunnel)/i)) {
      interfaceCategory = 'Tunnel';
      color = '#FF8C00'; // Dark orange
      shape = 'diamond';
    }
    
    // Build a more informative tooltip
    let tooltip = `Interface: ${interfaceName} (${interfaceCategory})`;
    if (ipAddress) tooltip += `<br>IP: ${ipAddress}`;
    if (vlan) tooltip += `<br>VLAN: ${vlan}`;
    if (description) tooltip += `<br>Description: ${description}`;
    if (interfaceType) tooltip += `<br>Type: ${interfaceType}`;
    
    nodes.push({
      id: `${interfaceName}_${index}`,
      label: interfaceName,
      shape: shape,
      color: color,
      group: interfaceCategory,
      title: tooltip
    });
    
    if (hostname !== 'Unknown Device') {
      edges.push({
        from: hostname,
        to: `${interfaceName}_${index}`,
        arrows: 'to,from',
        physics: true,
        color: { color: color, opacity: 0.8 },
        smooth: { type: 'curvedCW', roundness: 0.2 },
        title: ipAddress ? `IP: ${ipAddress}` : interfaceName
      });
    }
    
    // Try to identify connections between interfaces based on descriptions
    if (description && description.match(/to\s+([\w\-\.]+)/i)) {
      const connectedDevice = description.match(/to\s+([\w\-\.]+)/i)[1];
      
      // Add the connected device if it doesn't exist and is not the current device
      if (connectedDevice !== hostname && !nodes.some(n => n.id === connectedDevice)) {
        nodes.push({
          id: connectedDevice,
          label: connectedDevice,
          shape: 'box',
          title: `Device: ${connectedDevice} (inferred from description)`
        });
        
        // Add connection to the remote device
        edges.push({
          from: `${interfaceName}_${index}`,
          to: connectedDevice,
          arrows: 'to,from',
          physics: true,
          color: { color: color, opacity: 0.8 },
          smooth: { type: 'curvedCW', roundness: 0.2 },
          title: `Connection inferred from description`
        });
      }
    }
  });
  
  return { nodes, edges };
}

// Parse configuration file and extract topology
function parseConfiguration(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const fileType = getFileType(filePath, content);
  
  console.log(`Detected file type: ${fileType} for file: ${path.basename(filePath)}`);
  
  switch (fileType) {
    case 'xml':
      return parseXmlConfiguration(content);
    case 'json':
      return parseJsonConfiguration(content);
    case 'text':
    default:
      return parseTextConfiguration(content);
  }
}

// Upload endpoint
app.post('/api/upload', upload.single('config'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const topology = parseConfiguration(req.file.path);
    
    console.log(`Sending topology with ${topology.nodes.length} nodes and ${topology.edges.length} edges to frontend`);
    
    // Keep the uploaded file for debugging purposes
    // fs.unlinkSync(req.file.path);
    
    res.json(topology);
  } catch (error) {
    console.error('Error processing file:', error);
    res.status(500).json({ error: 'Error processing configuration file: ' + error.message });
  }
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../..', 'dist', 'index.html'));
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});