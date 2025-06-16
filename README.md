# MeshAdmin Network Platform

Comprehensive network topology design, mapping, and visualization suite with advanced diagramming capabilities.

## Overview

The MeshAdmin Network Platform consolidates multiple network topology and design tools into a unified, extensible platform. This mono-repository contains all the components needed for advanced network planning, visualization, and documentation.

## Architecture

This platform consists of the following integrated components:

### Core Components

1. **Network Design Studio** (`apps/network-design-studio/`)
   - Advanced network design and planning interface
   - Interactive topology builder
   - Component library and templates

2. **Network Topology Mapper** (`apps/topology-mapper/`)
   - Real-time network discovery and mapping
   - Automated topology generation
   - Integration with network monitoring tools

3. **Network Topology Master** (`apps/topology-master/`)
   - Master topology management and coordination
   - Multi-site network correlation
   - Centralized configuration management

4. **Network Diagram Monster** (`apps/diagram-monster/`)
   - Advanced diagramming engine
   - Export capabilities (SVG, PNG, PDF)
   - Custom styling and theming

### Shared Libraries

- **Core Library** (`packages/core/`) - Shared types, utilities, and base components
- **Topology Engine** (`packages/topology-engine/`) - Graph algorithms and topology processing
- **Visualization Library** (`packages/visualization/`) - Reusable visualization components
- **Export Engine** (`packages/export/`) - Document and diagram export functionality

## Getting Started

### Prerequisites

- Node.js 20 LTS or later
- pnpm 8.x or later
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Installation

```bash
# Clone the repository
git clone https://github.com/MeshAdmin/meshadmin-network-platform.git
cd meshadmin-network-platform

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Start development servers
pnpm dev
```

### Development

This is a pnpm workspace-based mono-repository. Each application and package can be developed independently:

```bash
# Work on specific app
pnpm --filter network-design-studio dev

# Run tests for all packages
pnpm test

# Lint all code
pnpm lint

# Build for production
pnpm build
```

## Project Structure

```
meshadmin-network-platform/
├── apps/
│   ├── network-design-studio/     # Network Design Studio application
│   ├── topology-mapper/           # Network Topology Mapper
│   ├── topology-master/           # Network Topology Master
│   └── diagram-monster/           # Network Diagram Monster
├── packages/
│   ├── core/                      # Shared core library
│   ├── topology-engine/           # Topology processing engine
│   ├── visualization/             # Visualization components
│   └── export/                    # Export functionality
├── docs/                          # Documentation
├── tools/                         # Build tools and utilities
└── examples/                      # Example configurations and demos
```

## Features

### Network Design Studio
- Drag-and-drop network design interface
- Component library with routers, switches, firewalls, etc.
- Template-based network designs
- Real-time collaboration features
- Integration with network vendors' APIs

### Topology Mapping
- Automated network discovery
- SNMP-based device detection
- Layer 2/3 topology mapping
- Real-time status monitoring
- Historical topology changes

### Advanced Diagramming
- Professional network diagrams
- Customizable styling and themes
- Multiple export formats
- Interactive elements
- Annotation and labeling tools

### Integration Capabilities
- REST API for all functionality
- Webhook support for real-time updates
- Integration with monitoring tools (Nagios, Zabbix, etc.)
- Export to documentation systems
- CI/CD pipeline integration

## API Documentation

Comprehensive API documentation is available at `/docs/api/` after running the development server.

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on:

- Code style and standards
- Pull request process
- Issue reporting
- Development setup

## License

This project is licensed under the AGPL-3.0 License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions:

- 📧 Email: info@meshadmin.com
- 🌐 Website: https://meshadmin.com
- 📚 Documentation: https://docs.meshadmin.com

## Roadmap

- [ ] AI-powered network optimization suggestions
- [ ] 3D network visualization
- [ ] Mobile application for field engineers
- [ ] Integration with major cloud providers
- [ ] Advanced network simulation capabilities

---

**MeshAdmin Network Platform** - Creating Software for Awesomeness

