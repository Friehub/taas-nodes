# FTS Challenger Lite

**Verify truth proposals and earn rewards for catching errors**

FTS Challenger Lite nodes re-execute every proposal to verify correctness. When you find an incorrect proposal, submit a dispute and earn the proposer's bond (100 FTS profit).

---

## Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Start the challenger
npm run dev

# Production mode
npm start
```

---

## Configuration

### Environment Variables

Create a `.env` file:

```bash
# Required
PRIVATE_KEY=0x...                          # Your wallet private key
RPC_URL=https://testnet1.helioschainlabs.org
ORACLE_ADDRESS=0x97C80601A5fA9DC685580dDfcebe919eE6362c61

# Optional
NODE_ID=my-challenger                      # Unique identifier
DISPUTE_STAKE=10000000000000000000          # 10 HLS (in wei)
REDIS_URL=redis://localhost:6379           # For queue management
AUTO_DISPUTE=true                          # Auto-submit disputes
CONFIDENCE_THRESHOLD=0.95                  # Only dispute if >95% confident
LOG_LEVEL=info
```

### Wallet Setup

1. Create a new wallet
2. Fund with HLS (for dispute stakes)
3. **Keep private key secure**

**Minimum Balance**: 50 HLS recommended
- Dispute stake: 10 HLS per dispute
- Gas: ~0.1 HLS per transaction

---

## How It Works

1. **Monitor proposals**: Watch for `OutcomeProposed` events
2. **Re-execute recipe**: Run the same recipe with same inputs
3. **Compare outcomes**: Check if local outcome matches proposed
4. **Detect mismatch**: If different, potential error found
5. **Generate counter-proof**: Create IPFS certificate
6. **Submit dispute**: Stake 10 TAAS, submit challenge
7. **Wait for arbiter**: Resolution within 24h
8. **Win reward**: Get 110 TAAS (100 profit + 10 stake back)

---

## Economics

### Profit Model

**Per Successful Dispute**:
- Your stake: 10 TAAS
- Proposer's bond: 100 TAAS
- **You earn**: 110 TAAS (100 profit)
- **ROI**: 1000% per dispute

**Example (1 error/week)**:
- Disputes: 4/month
- Profit: 400 TAAS/month (~$400/month at $1/TAAS)
- Cost: Server (~$50/month)
- **Net**: ~$350/month passive income

### False Positive Risk

If you dispute incorrectly:
- You lose: 10 TAAS
- Proposer keeps bond
- **Mitigation**: Set high confidence threshold

---

## Security

### Strategy

**Conservative** (Recommended for beginners):
```bash
CONFIDENCE_THRESHOLD=0.99  # Only dispute if 99% sure
AUTO_DISPUTE=false         # Manual approval required
```

**Aggressive** (For experienced operators):
```bash
CONFIDENCE_THRESHOLD=0.90  # Dispute if 90% sure
AUTO_DISPUTE=true          # Fully automated
```

### Best Practices

1. **Start conservative**
   - Test with `AUTO_DISPUTE=false` first
   - Review detections manually
   - Increase automation gradually

2. **Monitor performance**
   - Track dispute success rate
   - Adjust confidence threshold
   - Watch for false positives

3. **Secure your keys**
   - Use hardware wallet
   - Limit wallet funds
   - Rotate keys regularly

---

## Monitoring

### Dashboard

```bash
# View live statistics
npm run stats

# Expected output:
#  Challenger Statistics
# Proposals verified: 1,234
# Discrepancies found: 5
# Disputes submitted: 3
# Disputes won: 3
# Disputes lost: 0
# Win rate: 100%
# Profit: 300 TAAS
```

### Logs

```bash
# Follow logs
tail -f challenger.log

# Watch for discrepancies
grep "DISCREPANCY FOUND" challenger.log

# Check dispute outcomes
grep "DISPUTE" challenger.log
```

### Alerts

Set up notifications for:
- Discrepancy detected
- Dispute submitted
- Dispute resolved
- Low balance warning

---

## Troubleshooting

### No proposals being verified

```bash
# Check connection to oracle
curl -X POST $RPC_URL \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_getLogs","params":[{"address":"0x97C80601A5fA9DC685580dDfcebe919eE6362c61","fromBlock":"latest"}],"id":1}'
```

### Recipe execution fails

```bash
# Check dependencies
npm install

# Verify recipe exists
ls -la recipes/

# Test recipe locally
npm run test:recipe <recipe-id>
```

### Insufficient funds for dispute

```bash
# Check balance
npx hardhat console --network helios
> const balance = await ethers.provider.getBalance("YOUR_ADDRESS")
> ethers.formatEther(balance)

# Fund wallet if needed
```

---

## Advanced

### Custom Dispute Logic

Override default dispute logic in `src/services/ChallengerBot.ts`:

```typescript
async shouldDispute(discrepancy: Discrepancy): Promise<boolean> {
  // Custom logic
  if (discrepancy.confidence < 0.99) return false;
  if (discrepancy.stakeAmount > 100) return false; // Skip high-stake
  
  return true;
}
```

### Selective Recipe Monitoring

Only verify specific recipes:

```typescript
// src/config/challenger.ts
export const MONITORED_RECIPES = [
  'btc-price-aggregator',
  'eth-price-aggregator'
  // Add recipe IDs to monitor
];
```

### Multi-Node Setup

Run multiple Challenger Lite nodes for redundancy:

```bash
# Node 1
NODE_ID=challenger-1 PORT=3001 npm start

# Node 2
NODE_ID=challenger-2 PORT=3002 npm start

# Node 3
NODE_ID=challenger-3 PORT=3003 npm start
```

---

## Performance Tuning

### Hardware Requirements

**Minimum** (Basic operation):
- 2 CPU cores
- 4 GB RAM
- 50 GB SSD
- Cost: ~$20/month (Hetzner, OVH)

**Recommended** (Production):
- 4 CPU cores
- 8 GB RAM
- 100 GB SSD
- Cost: ~$50/month (Digital Ocean, AWS)

### Optimization

1. **Parallel verification**
   ```bash
   MAX_CONCURRENT_VERIFICATIONS=5  # Default: 3
   ```

2. **Fast RPC endpoint**
   ```bash
   RPC_URL=https://premium-rpc-endpoint.com
   ```

3. **Local recipe cache**
   ```bash
   CACHE_RECIPES=true
   CACHE_TTL=3600  # 1 hour
   ```

---

## Profitability Calculator

```
Assumptions:
- Server cost: $50/month
- Error rate: 0.1% (1 in 1,000 proposals)
- Total proposals: 10,000/month
- Dispute stake: 10 TAAS
- Proposer bond: 100 TAAS

Expected disputes: 10,000 * 0.001 = 10/month
Profit per dispute: 100 TAAS
Total profit: 1,000 TAAS/month
Value (at $1/TAAS): $1,000/month

Net profit: $1,000 - $50 = $950/month
ROI: 1900%
```

**Note**: Actual profitability depends on network activity and error rate.

---

## Network Info

**Helios Testnet**:
- RPC: `https://testnet1.helioschainlabs.org`
- Chain ID: 42000
- Oracle: `0x97C80601A5fA9DC685580dDfcebe919eE6362c61`

---

## Support

- **Issues**: Check `challenger.log`
- **Discord**: [Coming soon]
- **GitHub**: [Repository URL]

---

## Status Check

```bash
# Health check
npm run health

# Expected output:
#  RPC connected
#  Oracle contract loaded
#  Wallet funded (75 HLS)
#  Redis connected
#  Monitoring proposals
#  Auto-dispute: ENABLED
#   Recent verifications: 0 (last 5 min)
```

---

**TaaS Challenger Lite v1.0**
