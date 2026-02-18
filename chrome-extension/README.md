# FTS Browser Verification Node (Chrome Extension)

**Run a lightweight FTS verifier directly in your browser.**

This extension allows users to participate in the FTS network as a light challenger node, verifying truth proposals in the background while browsing.

---

## Features

- **Lightweight Verification**: Verifies simple logic recipes without heavy infrastructure.
- **Privacy First**: Runs locally in your browser sandbox.
- **Network Stats**: View real-time FTS network statistics.
- **Wallet Integration**: Connect EVM wallet to stake on disputes.

---

## Development

### Build

```bash
# Install dependencies
npm install

# Build extension
npm run build
```

### Load in Chrome

1. Open `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `dist/` folder

---

## Architecture

The extension runs a stripped-down version of the execution engine, capable of verifying:
- API-based recipes (GET requests)
- Regex/JSON parsing
- Basic arithmetic

It communicates with the `TruthOracleV2` contract via a public RPC endpoint.

---

## License

MIT
