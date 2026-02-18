# Friehub Browser Verification Node (Chrome Extension)

**Browser-based execution and verification client.**

The Friehub Chrome Extension enables lightweight participation in the FTS network as a verification client. It allows users to verify truth proposals in a browser-native environment, contributing to network decentralized integrity.

## Features

- **Integrated Verification**: Executes lightweight data recipes within the browser sandbox.
- **Protocol Observability**: Displays real-time FTS network statistics and proposal throughput.
- **Secure Integration**: Connects with standard browser wallets for EIP-712 signing and stake management.

## Development and Build

### Build Instructions
```bash
pnpm install
pnpm run build
```

### Installation
1. Open `chrome://extensions/` in a Chromium-based browser.
2. Enable "Developer mode".
3. Select "Load unpacked".
4. Navigate to the `dist/` directory of this sub-module.

## Technical Architecture

The extension implements a subset of the FTS execution engine, optimized for browser environments. It facilitates:
- API-based data ingestion (HTTPS).
- JSON/Regex transformation logic.
- Arithmetic verification.

Communication with the `TruthOracle` is maintained via authenticated RPC endpoints.

## License

Copyright (c) 2026 Friehub Protocol.
Licensed under the MIT License.
