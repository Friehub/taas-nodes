# Friehub Protocol Nodes

Official client implementations for the Friehub Truth-as-a-Service (TaaS) decentralized network. This repository provides the necessary infrastructure to operate as a Sentinel or Challenger within the Friehub ecosystem.

## Repository Structure

- **truth-node/**: The primary Node.js implementation for data verification, consensus participation, and outcome proposals.
- **challenger-lite/**: A specialized client for monitoring network integrity and performing circuit-based audits.
- **chrome-extension/**: Browser-based verification utilities and wallet integration tools.

## Node Registration and Setup

The Friehub Protocol utilizes a "Keyless Node" architecture. Node operators do not need to manage individual data provider API keys; instead, authentication is proxied through the centralized Truth Gateway.

### 1. Registration
To register a new node, use the official Friehub User Dashboard.
- Navigate to the "Register Node" section.
- Generate a Provisioning Code.
- Download the generated `.env` configuration bundle.

### 2. Deployment

> [!IMPORTANT]
> **Zero-Build Standard**: We strongly recommend using our official Docker images. Cloning this repository and running `pnpm install` on your VPS is unnecessary and may lead to out-of-memory errors on smaller machines.

The standard execution method is via `docker-compose`:
1. Create your deployment folder (e.g., `mkdir taas-node && cd taas-node`).
2. Download our official [docker-compose.yml](https://raw.githubusercontent.com/Friehub/taas-nodes/main/truth-node/docker-compose.yml) and your `.env`.
3. Start the node: `docker-compose up -d`.
## Prerequisites
- Node.js (v20+)
- Linux/Amd64 environment (Recommended)
- Funded Helios wallet for on-chain identities

## Architecture

This repository is a core component of the Friehub ecosystem. it consumes protocol logic and contract interfaces from the `taas-core` library. Synchronization between repositories is automated via repository dispatch triggers.

## License

Copyright (c) 2026 Friehub Protocol. All rights reserved.
Licensed under the MIT License.
