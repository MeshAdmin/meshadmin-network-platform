import React, { useEffect, useRef, useState } from 'react';
import { Network } from 'vis-network';
import 'vis-network/styles/vis-network.css';

function App() {
  const networkRef = useRef(null);
  const containerRef = useRef(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState(null);
  const [networkData, setNetworkData] = useState({ nodes: [], edges: [] });
  const [networkReady, setNetworkReady] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');

  // Initialize network visualization with proper dimensions and cleanup
  useEffect(() => {
    console.log('Network visualization initialization started');
    
    // Only initialize if we have data
    if (networkData.nodes.length === 0 && networkData.edges.length === 0) {
      console.log('No network data available yet, skipping initialization');
      return;
    }

    // Ensure we clean up any existing network instance
    if (networkRef.current) {
      console.log('Cleaning up existing network instance');
      try {
        networkRef.current.destroy();
      } catch (err) {
        console.error('Error destroying network:', err);
      }
      networkRef.current = null;
    }

    // Function to check container dimensions and initialize network
    const initializeNetwork = () => {
      console.log('Attempting to initialize network...');
      setProcessingStatus('Initializing network visualization...');
      
      if (!containerRef.current) {
        console.error('Network container reference is not available');
        setError('Network container is not ready');
        return false;
      }

      // Check if container has valid dimensions
      const width = containerRef.current.offsetWidth;
      const height = containerRef.current.offsetHeight;
      
      console.log(`Container dimensions: ${width}x${height}`);
      
      if (width <= 0 || height <= 0) {
        console.warn('Container has invalid dimensions:', width, 'x', height);
        // Force container dimensions if they're invalid
        containerRef.current.style.width = '100%';
        containerRef.current.style.height = '600px';
        containerRef.current.style.display = 'block';
        containerRef.current.style.visibility = 'visible';
        // Try again after forcing dimensions
        setTimeout(() => initializeNetwork(), 300);
        return false;
      }

      try {
        console.log('Creating new network instance with data...');
        console.log(`Network data: ${networkData.nodes.length} nodes, ${networkData.edges.length} edges`);
        setProcessingStatus(`Creating network with ${networkData.nodes.length} nodes and ${networkData.edges.length} edges...`);
        
        // Create a new network instance with the topology data
        const data = {
          nodes: networkData.nodes,
          edges: networkData.edges
        };
        
        // Ensure the container is visible and has proper dimensions before creating the network
        containerRef.current.style.display = 'block';
        containerRef.current.style.visibility = 'visible';
        
        // Create the network instance with improved options
        const options = {
          physics: {
            enabled: true,
            solver: 'forceAtlas2Based',
            forceAtlas2Based: {
              gravitationalConstant: -50,
              centralGravity: 0.01,
              springLength: 100,
              springConstant: 0.08,
              damping: 0.4,
              avoidOverlap: 0.8
            },
            stabilization: {
              enabled: true,
              iterations: 1000,
              updateInterval: 50
            }
          },
          nodes: {
            font: {
              size: 16,
              face: 'arial'
            },
            borderWidth: 2,
            shadow: true
          },
          edges: {
            width: 2,
            shadow: true,
            smooth: {
              type: 'dynamic',
              forceDirection: 'none'
            }
          },
          groups: {
            WAN: {color: '#FF4500', shape: 'diamond'},
            LAN: {color: '#32CD32', shape: 'dot'},
            DMZ: {color: '#FFD700', shape: 'triangle'},
            Management: {color: '#4169E1', shape: 'star'}
          },
          interaction: {
            hover: true,
            tooltipDelay: 200,
            navigationButtons: true,
            keyboard: true
          },
          autoResize: true,
          height: '100%',
          width: '100%'
        };
        
        // Create the network instance
        networkRef.current = new Network(containerRef.current, data, options);
        
        // Add event listeners for network events
        networkRef.current.on('stabilizationProgress', function(params) {
          console.log('Stabilization progress:', params.iterations, '/', params.total);
          setProcessingStatus(`Stabilizing network: ${Math.round((params.iterations/params.total) * 100)}%`);
        });
        
        networkRef.current.on('stabilizationIterationsDone', function() {
          console.log('Network stabilization finished');
          setProcessingStatus('Network stabilization complete, rendering final view...');
          // Force a redraw and fit after stabilization
          if (networkRef.current) {
            setTimeout(() => {
              if (networkRef.current) {
                networkRef.current.redraw();
                networkRef.current.fit();
                setProcessingStatus('');
              }
            }, 500); // Small delay to ensure DOM updates are complete
          }
        });
        
        networkRef.current.on('stabilized', function(params) {
          console.log('Network stabilized after', params.iterations, 'iterations');
          setProcessingStatus('');
        });

        // Force a redraw and fit the network
        networkRef.current.redraw();
        networkRef.current.fit();
        setNetworkReady(true);
        console.log('Network initialized successfully');
        return true;
      } catch (err) {
        console.error('Error initializing network:', err);
        setError(`Failed to initialize network visualization: ${err.message}`);
        return false;
      }
    };

    // Try to initialize with increased delay
    let initialized = false;
    
    // Add a larger delay before first initialization attempt to ensure DOM is ready
    const initialTimer = setTimeout(() => {
      initialized = initializeNetwork();
      
      // If not successful, try again after a delay to ensure DOM is ready
      if (!initialized) {
        const timer = setTimeout(() => {
          initialized = initializeNetwork();
          
          // If still not initialized, try one more time with a longer delay
          if (!initialized) {
            const finalTimer = setTimeout(() => {
              initializeNetwork();
            }, 1500);
            return () => clearTimeout(finalTimer);
          }
        }, 800);
        
        return () => clearTimeout(timer);
      }
    }, 500);
    
    // Add resize event listener to handle window resizing
    const handleResize = () => {
      if (networkRef.current) {
        networkRef.current.redraw();
        networkRef.current.fit();
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      // Clean up timers
      clearTimeout(initialTimer);
      
      // Clean up event listener
      window.removeEventListener('resize', handleResize);
      
      // Clean up network instance
      if (networkRef.current) {
        console.log('Cleaning up network instance on unmount');
        try {
          networkRef.current.destroy();
        } catch (err) {
          console.error('Error destroying network on cleanup:', err);
        }
        networkRef.current = null;
      }
    };
  }, [networkData]); // Re-initialize when networkData changes

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    setFileName(file.name);
    setError(null);
    setNetworkData({ nodes: [], edges: [] }); // Reset network data before loading new data
    setNetworkReady(false);
    setProcessingStatus('Preparing to process file...');
    
    // Ensure network is properly cleaned up before processing new data
    if (networkRef.current) {
      console.log('Destroying existing network instance before processing new data');
      try {
        networkRef.current.destroy();
      } catch (err) {
        console.error('Error destroying network:', err);
      }
      networkRef.current = null;
    }
    
    // Clear the container to ensure no remnants of previous visualization
    if (containerRef.current) {
      // Keep the container but remove any vis-network specific elements
      const visElements = containerRef.current.querySelectorAll('.vis-network, canvas');
      visElements.forEach(el => el.remove());
      
      // Ensure container is visible and has proper dimensions
      containerRef.current.style.display = 'block';
      containerRef.current.style.visibility = 'visible';
      containerRef.current.style.width = '100%';
      containerRef.current.style.height = '600px';
    }
    
    const formData = new FormData();
    formData.append('config', file);

    try {
      console.log(`Uploading file: ${file.name}, size: ${file.size} bytes`);
      setProcessingStatus(`Uploading file: ${file.name}...`);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload configuration file');
      }
      
      setProcessingStatus('Processing network configuration...');
      const responseData = await response.json();
      
      if (!responseData.nodes || !responseData.edges) {
        throw new Error('Invalid topology data received from server');
      }
      
      console.log(`Received topology with ${responseData.nodes.length} nodes and ${responseData.edges.length} edges`);
      console.log('Topology data:', JSON.stringify(responseData));
      setProcessingStatus(`Received network topology with ${responseData.nodes.length} nodes and ${responseData.edges.length} edges`);
      
      // Add a small delay to ensure DOM is ready before updating network data
      setTimeout(() => {
        setNetworkData(responseData);
      }, 500); // Increased delay to ensure DOM is fully ready
    } catch (err) {
      setError(err.message);
      setProcessingStatus('');
      console.error('Error uploading file:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <div className="header">
        <h1>Network Diagram Monster</h1>
        <input
          type="file"
          accept=".txt,.conf,.xml,.json,.cfg"
          onChange={handleFileUpload}
          className="file-input"
        />
      </div>
      {error && <div className="error">Error: {error}</div>}
      {loading && <div className="loading">Processing {fileName}...</div>}
      {processingStatus && <div className="processing-status">{processingStatus}</div>}
      <div ref={containerRef} className="network-container" />
      {!loading && networkData.nodes.length === 0 && 
        <div className="empty-state">Upload a network configuration file to visualize it</div>}
      <style jsx>{`
        .app {
          height: 100vh;
          display: flex;
          flex-direction: column;
          padding: 20px;
          box-sizing: border-box;
        }
        .header {
          margin-bottom: 20px;
        }
        .network-container {
          flex: 1;
          border: 1px solid #ccc;
          border-radius: 4px;
          background: #f5f5f5;
          position: relative;
          min-height: 600px;
          height: calc(100vh - 150px);
          width: 100%;
          overflow: hidden;
          box-sizing: border-box;
          margin: 10px 0;
          display: flex;
          justify-content: center;
          align-items: center;
          flex-direction: column;
          visibility: visible !important;
          opacity: 1 !important;
        }
        .file-input {
          margin: 10px 0;
        }
        .error {
          color: red;
          margin-bottom: 10px;
          padding: 10px;
          background-color: #ffeeee;
          border-radius: 4px;
          border: 1px solid #ffcccc;
        }
        .loading, .processing-status {
          color: #3366cc;
          margin-bottom: 10px;
          padding: 10px;
          background-color: #eeeeff;
          border-radius: 4px;
          border: 1px solid #ccccff;
        }
        .empty-state {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: #999;
          font-size: 18px;
          text-align: center;
          z-index: 1;
          width: 80%;
          max-width: 400px;
        }
      `}</style>
    </div>
  );
}

export default App;