# Changelog

All notable changes to the "Truth Node" (Sentinel/Challenger) will be documented in this file.

## [1.0.5] - 2026-02-19

### Added
- **Thick Node Architecture**: The Node now executes recipes locally using the embedded `@friehub/execution-engine`.
- **Blinded Proxy Mode**: Nodes can now fetch data via the Friehub Gateway without requiring their own API keys (`TAAS_USE_PROXY=true`).
- **ZK Integration (Stub)**: Added `ZKProverService` to generate ZK-compatible inputs from local execution traces.
    - *Note*: Actual proof generation is currently disabled (ZK stub mode) pending circuit binary distribution.
- **Connectivity Test**: Added `dist/scripts/test-connection.js` to verify Gateway connectivity.

### Changed
- **Execution**: Logic execution moved from Backend Gateway to Local Node.
- **Configuration**: Added support for `TAAS_PROXY_URL` configuration in `.env`.

### Security
- **IP Protection**: Core logic is now obfuscated (if enabled) and distributed strictly via Docker container.
