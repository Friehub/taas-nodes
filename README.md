# Friehub Protocol Nodes

Official client implementations for the Friehub Truth-as-a-Service (TaaS) decentralized network. This repository contains the software required to operate as a Sentinel or Challenger within the ecosystem.

## Repository Structure

- **truth-node/**: The primary Node.js client. It handles data verification, consensus participation, and rich outcome proposals.
- **challenger-lite/**: A lightweight monitoring client for dispute resolution and circuit-based auditing.
- **chrome-extension/**: Browser-based verification tools and wallet integration.

## Getting Started

### Prerequisites
- Node.js (v18+)
- pnpm (v8+)

### Installation
From the root of the repository:
```bash
pnpm install
```

### Running a Truth Node
1. Navigate to the truth-node directory: `cd truth-node`
2. Configure your environment: `cp .env.example .env`
3. Start the node in development mode: `pnpm run dev`

## Deployment

For production environments, it is recommended to use the bundled distribution or the official Docker images.

## Architecture

This repository is part of the Friehub decentralized ecosystem. It consumes core protocol logic and smart contract interfaces from the private `taas-core` through automated distribution pipelines.

## License

MIT
