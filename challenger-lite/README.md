# Friehub Challenger Lite

**Specialized integrity monitoring and dispute resolution client.**

Challenger Lite is an optimized client implementation focused on network auditing and dispute management. It provides a lightweight footprint for high-reputation network guardians to verify Truth Proposer outcomes.

## Technical Overview

The Challenger Lite client monitors all `OutcomeProposed` events on the Friehub Truth Oracle. Upon detection, it performs the following operations:

1. **Re-execution**: The original Data Recipe is executed within a local runtime.
2. **Discrepancy Detection**: The local result is compared against the on-chain proposal.
3. **Dispute Initiation**: If a discrepancy exceeds the confidence threshold, a formal on-chain challenge is issued.

## Configuration

Operational parameters are managed via environment variables.

### Required Parameters

| Parameter | Description |
| :--- | :--- |
| `PRIVATE_KEY` | Hex-encoded private key for dispute signatures. |
| `RPC_URL` | WebSocket-enabled Helios RPC endpoint. |
| `ORACLE_ADDRESS` | The target Truth Oracle contract address. |

### Operational Parameters

- `AUTO_DISPUTE`: (Boolean) Enable automated on-chain challenges.
- `CONFIDENCE_THRESHOLD`: (Float) Minimum certainty required before initiating a dispute.
- `LOG_LEVEL`: Logging verbosity (debug, info, warn, error).

## Economic Model

Challengers are incentivized through a commission on slashed proposer bonds.

- **Successful Challenge**: Proposer bond is slashed; Challenger receives a protocol-defined reward.
- **Incorrect Challenge**: Challenger bond (Dispute Stake) is forfeited.

Operational risk is mitigated through adjustable confidence thresholds and selective recipe monitoring.

## Deployment

### Prerequisites
- Node.js v20+
- Redis v7+

### Installation
```bash
pnpm install
pnpm build
```

### Execution
```bash
pnpm start
```

## Monitoring

Operational statistics are exposed via a lightweight management API.

- **Health Status**: Available at `/health`.
- **Statistics**: Current win-rate and verification throughput.

## Support

Technical documentation regarding the Friehub Protocol and audit circuits can be found in the primary documentation repository.

Copyright (c) 2026 Friehub Protocol.
