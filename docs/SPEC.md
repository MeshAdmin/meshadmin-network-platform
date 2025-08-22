# Technical Specification

## System Overview
The system is a network visualization tool designed to parse and display network topologies from various configuration file formats (XML, JSON, text). The tool consists of a backend service for file parsing and a frontend application for visualizing the network topology. The backend handles file uploads, configuration parsing, and returns the parsed topology. The frontend initializes and displays the network visualization using the `vis-network` library.

### Main Components and Their Roles
- **Backend (`src/backend/server.js`)**: Handles file uploads, configuration parsing, and returns the parsed topology.
- **Frontend (`src/frontend/App.jsx`, `src/frontend/main.jsx`)**: Initializes and displays the network visualization.
- **Entry Point (`index.html`)**: Sets up the initial environment and loads the React application.

## Core Functionality
### Primary Exported Functions and Core Behavior

#### `parseConfiguration` Function
- **Importance Score: 90**
- **Description:** Core function for configuration parsing. Detects file type (XML, JSON, text) and delegates to specific parsers (`parseXmlConfiguration`, `parseJsonConfiguration`, `parseTextConfiguration`). Reads file content, identifies file type, and returns parsed topology.
- **Critical Logic:** File type detection and delegation to specific parsers.

#### `parseXmlConfiguration` Function
- **Importance Score: 85**
- **Description:** Parses XML configuration files. Extracts device hostnames and interfaces, determines interface types, and constructs nodes and edges for the topology. Uses regular expressions to match XML tags and attributes.
- **Critical Logic:** XML parsing using regular expressions, interface type determination, and node/edge creation.

#### `parseJsonConfiguration` Function
- **Importance Score: 85**
- **Description:** Parses JSON configuration files. Extracts device hostnames and interfaces, determines interface types, and constructs nodes and edges for the topology. Handles JSON parsing and interface connection details.
- **Critical Logic:** JSON parsing, interface type determination, and node/edge creation with connection details.

#### `parseTextConfiguration` Function
- **Importance Score: 85**
- **Description:** Parses text-based configuration files (e.g., Cisco). Extracts interface names, types, IP addresses, descriptions, and VLAN information. Constructs nodes and edges for the topology based on the extracted data.
- **Critical Logic:** Text parsing using regular expressions, interface type determination, and node/edge creation with inferred connections.

#### `/api/upload` Endpoint
- **Importance Score: 95**
- **Description:** Handles file uploads. Uses `multer` for file storage and `parseConfiguration` to process the uploaded file. Returns the parsed topology as a JSON response.
- **Critical Logic:** File upload handling, delegation to `parseConfiguration`, and response formatting.

#### Interface Type Determination
- **Importance Score: 80**
- **Description:** Determines interface types (WAN, LAN, DMZ, Management, etc.) across `parseXmlConfiguration`, `parseJsonConfiguration`, and `parseTextConfiguration`. Involves analyzing interface names, types, and additional attributes to categorize interfaces correctly.
- **Critical Logic:** Heuristic-based interface type categorization using string matching and regular expressions.

#### Nodes and Edges Data Model
- **Importance Score: 90**
- **Description:** Core data model consisting of nodes and edges, representing devices and connections in the network topology. Nodes have properties like `id`, `label`, `shape`, `color`, and `title`. Edges have properties like `from`, `to`, `arrows`, `physics`, `color`, and `smooth`.
- **Critical Logic:** Construction of nodes and edges with appropriate properties based on parsed configuration data.

### Frontend Core Functionality

#### `App` Component (`src/frontend/App.jsx`)
- **Importance Score: 90**
- **Description:** Defines the main application component handling core functionality of the network visualization tool.
- **Primary Exported Function: `App`**
  - **Network Visualization Initialization:**
    - **Function:** `useEffect` hook
    - **Description:** Initializes the network visualization using the `vis-network` library. Checks for valid container dimensions, destroys any existing network instance, and creates a new one with the provided data. Handles network stabilization and resizing.
    - **Importance Score:** 85
  - **File Upload Handling:**
    - **Function:** `handleFileUpload`
    - **Description:** Manages the file upload process, including resetting the network data, uploading the file to the server, and updating the network data with the response. Handles error and loading states.
    - **Importance Score:** 80

#### Core Data Models:
- **State Variables:**
  - `networkData`: Stores the nodes and edges data for the network visualization.
  - `error`: Stores any error messages encountered during the process.
  - `loading`: Indicates whether the file is currently being processed.
  - `fileName`: Stores the name of the uploaded file.
  - `processingStatus`: Stores the current processing status message.
  - **Importance Score:** 70

#### Main Connection Points with Other System Parts:
- **API Interaction:**
  - The `handleFileUpload` function sends a POST request to `/api/upload` to upload the configuration file and retrieve the network topology data.
  - **Importance Score:** 80

#### Complex Business Logic or Algorithms:
- **Network Initialization and Stabilization:**
  - The `useEffect` hook contains complex logic to initialize and stabilize the network visualization, including handling container dimensions, destroying and creating network instances, and managing stabilization events.
  - **Importance Score:** 85

#### `main.jsx` (`src/frontend/main.jsx`)
- **Importance Score: 70**
- **Description:** Bootstraps the React application and renders the `App` component.
- **Core Behavior:**
  - **ReactDOM Rendering:**
    - **Description:** Uses `ReactDOM.createRoot` to render the `App` component inside the `#root` element. Wraps the `App` component with `React.StrictMode` for additional checks and warnings.
    - **Importance Score:** 70

#### Main Connection Points with Other System Parts:
- **Rendering the App Component:**
  - Renders the `App` component, which is the entry point for the network visualization functionality.
  - **Importance Score:** 60

#### `index.html`
- **Importance Score: 80**
- **Description:** Serves as the entry point for the web application, defining the structure and initial setup required to load and run the application.
- **Key Technical Details:**
  - **Document Structure and Metadata:**
    - **DOCTYPE Declaration:** Ensures the document is parsed as HTML5.
    - **Language Attribute:** Sets the language of the document to English (`lang="en"`).
    - **Meta Tags:**
      - `charset="UTF-8"`: Specifies the character encoding for the HTML document.
      - `viewport` settings: Ensures the page is responsive and scales correctly on different devices.
  - **Title Tag:** Sets the title of the web page to "Network Diagram Monster".
  - **Styles:**
    - `body { margin: 0; }`: Removes default margin from the body to allow full-viewport usage.
    - `font-family`: Defines a fallback list of system fonts for consistent text rendering across different platforms.
  - **Root Element:**
    - **Div with ID `root`:**
      - `#root { height: 100vh; }`: Ensures the root div takes up the full viewport height, providing a canvas for the React application to render into.
  - **Script Inclusion:**
    - **Module Script:**
      - `<script type="module" src="/src/frontend/main.jsx"></script>`:
        - Imports the main JavaScript module (`main.jsx`), which is the entry point for the React application.
        - The `type="module"` attribute indicates that this script is an ES6 module, enabling the use of modern JavaScript features and imports.

## Architecture
### Data Flow Overview
1. **File Upload:**
   - User uploads a configuration file via the `/api/upload` endpoint.
   - The backend service processes the file using `parseConfiguration`.
2. **Configuration Parsing:**
   - `parseConfiguration` detects the file type and delegates to `parseXmlConfiguration`, `parseJsonConfiguration`, or `parseTextConfiguration`.
   - Each parser extracts relevant data, determines interface types, and constructs nodes and edges.
3. **Response Formatting:**
   - The parsed topology is formatted as a JSON response and sent back to the frontend.
4. **Network Visualization:**
   - The frontend receives the JSON response and initializes the network visualization using the `vis-network` library.
   - The `App` component handles the visualization initialization, file upload process, and state management.