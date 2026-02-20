# Friehub Truth Service Node

**The official execution and verification client for the Friehub Truth Service (FTS) Protocol.**

The FTS Node is a high-performance execution client designed to secure the localized truth consensus network. It operates in two primary modes—Sentinel and Challenger—ensuring the integrity, availability, and accuracy of data feeds powered by the FTS Protocol.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Observability](#observability)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Overview

The FTS Node serves as the interface between off-chain data sources and the on-chain Truth Oracle. It is responsible for data aggregation, cryptographic attestation, and maintaining network consensus.

### Core Capabilities

- **Keyless Data Fetching**: Utilizes a centralized Truth Gateway to access authenticated data sources without requiring local API keys.
- **Cryptographic Proofs**: Signatures adhere to the EIP-712 standard for robust on-chain validation.
- **Deterministic Execution**: Implements "Data Recipes" within a secure runtime environment.
- **Economic Security**: Integrates with the NodeRegistry to manage stakes and operational identities.

## Architecture

The node behavior is defined by its operational mode.

### 1. Sentinel Mode (Proposer)
Sentinels are primary service providers. They listen for data requests, execute corresponding recipes, and submit verified outcomes to the blockchain to earn protocol fees.

### 2. Challenger Mode (Verifier)
Challengers act as network guardians. They monitor incoming proposals in real-time, re-executing data recipes to verify correctness and initiating disputes against malicious or incorrect proposals.

## Prerequisites

- **Node.js**: v20.0.0 or higher
- **Redis**: v7.0+ (Utilized for operational state and job queues)
- **RPC Endpoint**: A reliable connection to the Helios blockchain (WebSockets required for Challengers)
- **Identity**: An EVM-compatible private key with sufficient balance for transaction fees.

## Installation

> [!IMPORTANT]
> **Registry-First Distribution**: Friehub strictly recommends using pre-built Docker containers. Node operators should **NOT** clone this repository or execute `pnpm build` locally, as this introduces environment fragility and potential build failures on constrainted hardware.

### 1. The Zero-Build Setup
Create a new directory on your server and download the official provisioning files:

```bash
mkdir taas-sentinel && cd taas-sentinel
wget https://raw.githubusercontent.com/Friehub/taas-nodes/main/truth-node/docker-compose.yml
```

### 2. Configuration
The FTS Node is designed for "Keyless" operation. Most data provider keys are managed by the centralized Truth Gateway. Create a `.env` file in the same directory:

```bash
touch .env
```

### Environment Setup

Configuration is managed via environment variables.

| Variable | Description |
| :--- | :--- |
| `NODE_MODE` | `sentinel`, `challenger`, or `both` |
| `PRIVATE_KEY` | EIP-712 identification key |
| `RPC_URL` | Helios RPC connection URL |
| `ORACLE_ADDRESS` | Address of the TruthOracle contract |
| `INDEXER_API_URL` | URL of the Truth Gateway / Indexer service |

## Usage

### Production Execution
Start the node and its Redis dependency in the background:
```bash
docker-compose up -d
```

View the operational logs:
```bash
docker-compose logs -f truth-node
```

### Advanced: Source Code Development
If you are contributing to the core protocol, you can run the node via source:
```bash
pnpm install && pnpm run dev
```
*(Not recommended for production Node Operators)*

## Observability

### Metrics
JSON-structured logs are emitted to `stdout`. Prometheus metrics are available at `/metrics` (Default port: 3001).

- `truth_requests_total`: Throughput of ingestion.
- `truth_proposals_total`: Total on-chain submissions.
- `truth_disputes_total`: Successful integrity challenges.

## Troubleshooting

### Connection Refused
Ensure the Redis service is active and accessible via the configured `REDIS_HOST`.

### Insufficient Funds
The operational wallet must maintain a minimum balance to cover gas fees for outcome proposals and dispute bonds.

## License

Copyright (c) 2026 Friehub Protocol.
Licensed under the MIT License.
