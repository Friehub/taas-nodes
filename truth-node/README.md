# Friehub Truth Service Node

**The official execution and verification client for the Friehub Truth Service (FTS) Protocol.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

The FTS Node is a critical component of the localized truth consensus network. It is designed to operate in two distinct modes—**Sentinel** and **Challenger**—ensuring the integrity, availability, and accuracy of data feeds powered by the FTS Protocol.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
  - [Sentinel Mode](#sentinel-mode)
  - [Challenger Mode](#challenger-mode)
- [Observability](#observability)
- [API Reference](#api-reference)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## Overview

The FTS Node acts as the bridge between off-chain data and the on-chain Truth Oracle. It is responsible for fetching real-world data, generating cryptographic proofs, and securing the network against malicious actors.

### Core Capabilities

- **Resilient Data Fetching**: Utilizes the `@friehub/data-feeds` package to aggregate data from 50+ sources with automatic failover.
- **Cryptographic Attestation**: Signs data payloads using EIP-712 standard for on-chain verification.
- **Deterministic Execution**: Runs "Recipes" (standardized data fetching scripts) in a sandboxed environment.
- **Economic Security**: Stakes FTS tokens to back the truthfulness of proposed outcomes.

---

## Architecture

The node executes logic based on its configured `NODE_MODE`.

### 1. Sentinel Mode (Proposer)
*   **Role**: Service Provider.
*   **Function**: Listens for `RecipeRequested` events from the Truth Oracle, executes the corresponding recipe, and submits the result (Outcome) to the blockchain.
*   **Incentive**: Earns a fee (in HLS) for every finalized proposal.

### 2. Challenger Mode (Verifier)
*   **Role**: Network Guardian.
*   **Function**: Monitors all incoming proposals from other nodes. It re-executes the recipe locally to verify the result. If a discrepancy is found, it issues a **Dispute**.
*   **Incentive**: Earns the slashed bond of the malicious Sentinel.

---

## Prerequisites

Before running the node, ensure your environment meets the following requirements:

*   **Node.js**: v18.0.0 or higher
*   **Redis**: v6.0+ (Required for job queue management)
*   **Helios RPC Endpoint**: A reliable connection to the Helios Testnet (WebSocket recommended for Challengers).
*   **Wallet**: An EVM-compatible wallet funded with HLS tokens.

---

## Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/friehub/taas-core.git
cd taas-core/nodes/truth-node
npm install
```

Build the project:

```bash
npm run build
```

---

## Configuration

The node is configured via environment variables. Copy the example file to get started:

```bash
cp .env.example .env
```

### Required Configuration

| Variable | Description | Example |
| :--- | :--- | :--- |
| `NODE_ENV` | Operational environment | `production` |
| `NODE_MODE` | Operational mode of the node | `sentinel`, `challenger`, or `both` |
| `PRIVATE_KEY` | EVM Wallet Private Key (Hex) | `0xabc...` |
| `RPC_URL` | Helios Blockchain RPC Endpoint | `https://testnet1.helioschainlabs.org` |
| `ORACLE_ADDRESS`| Address of TruthOracleV2 Contract | `0x383E...` |
| `ORACLE_ADDRESS`| Address of TAASToken Contract | `0x7e6a...` |

### Optional Configuration

| Variable | Description | Default |
| :--- | :--- | :--- |
| `NODE_ID` | Human-readable identifier for logs | `truth-node` |
| `REDIS_URL` | Connection string for Redis | `redis://localhost:6379` |
| `LOG_LEVEL` | Logging verbosity | `info` |
| `PORT` | HTTP Server Port | `3001` |
| `MINIMUM_BOND` | Min. stake required to propose (Wei) | `10 ETH` |

---

## Usage

### Sentinel Mode

Run the node to actively propose outcomes:

```bash
NODE_MODE=sentinel npm start
```

### Challenger Mode

Run the node to purely verify the network:

```bash
NODE_MODE=challenger npm start
```

### Development

For local development with hot-reloading:

```bash
npm run dev
```

---

## Observability

### Logging

The node uses `pino` for structured JSON logging. Logs are output to `stdout` and can be piped to any log aggregator (Datadog, CloudWatch, etc.).

```json
{"level":30,"time":167823,"msg":"[TruthNode] Information Sentinel running","port":3001}
```

### Metrics (Prometheus)

Prometheus-compatible metrics are exposed at `http://localhost:3001/metrics`.

*   `truth_requests_total`: Total data requests received.
*   `truth_proposals_total`: Outcomes proposed to the chain.
*   `truth_disputes_total`: Disputes initiated (Challenger mode).
*   `truth_bond_locked`: Current asset value locked in bonds.

---

## API Reference

The node exposes a lightweight REST API for health checks and local management.

#### `GET /health`
Returns the operational status of the node.
```json
{ "status": "ok", "mode": "sentinel", "uptime": 120 }
```

#### `GET /api/admin/stats`
Returns current performance statistics (used by the TaaS Dashboard).

---

## Troubleshooting

**Issue: Node fails to start with "Invalid Private Key"**
> Ensure your `PRIVATE_KEY` in `.env` starts with `0x` and is exactly 64 hex characters.

**Issue: "Insufficient Funds" error**
> The wallet must hold enough HLS to pay for transaction fees and the required proposal bond (default 10 HLS).

**Issue: Redis Connection Refused**
> Ensure a local Redis instance is running (`redis-server`) or update `REDIS_URL` to point to your managed Redis instance.

---

## License

This project is licensed under the MIT License - see the [LICENSE](../../LICENSE) file for details.

---

**Copyright (c) 2026 FrieHub Protocol.**
