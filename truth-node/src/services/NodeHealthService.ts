import { Hex, encodeFunctionData, parseAbi } from 'viem';
import { getHeliosPublicClient, getHeliosWalletClient, getAccount } from '../config/viem';
import { config } from '../config/env';
import { logger } from '../config/logger';
import axios from 'axios';

/**
 * NodeHealthService
 * 
 * Handles Node Sovereignty:
 * 1. Auto-registration on-chain
 * 2. Background heartbeats (anti-jail)
 * 3. Stake monitoring
 * 4. Telemetry reporting to Sovereign Backend
 */
export class NodeHealthService {
    private static heartbeatInterval: NodeJS.Timeout;
    private static readonly HEARTBEAT_PERIOD_MS = 8 * 60 * 1000; // 8 minutes

    static async start() {
        logger.info('[NodeHealth] Starting Health Service...');

        // 1. Handshake with Backend (if token present)
        await this.checkAndClaim();

        // 2. Check and Register on-chain
        await this.checkAndRegister();

        // 3. Start Heartbeat Loop
        this.heartbeatInterval = setInterval(() => this.sendHeartbeat(), this.HEARTBEAT_PERIOD_MS);
        await this.sendHeartbeat(); // Initial heartbeat

        // 4. Initial Stake Check
        await this.validateStake();
    }

    private static async checkAndClaim() {
        if (!process.env.REGISTRATION_TOKEN) {
            logger.debug('[NodeHealth] No REGISTRATION_TOKEN found, skipping claim handshake.');
            return;
        }

        const account = getAccount();
        try {
            logger.info({ token: process.env.REGISTRATION_TOKEN }, '[NodeHealth] Attempting to claim registration token...');
            const res = await axios.post(`${config.INDEXER_API_URL}/provision/claim`, {
                tokenCode: process.env.REGISTRATION_TOKEN,
                operatorAddress: account.address
            });

            if (res.data.success) {
                logger.info({ owner: res.data.ownerAddress }, '[NodeHealth] Successfully linked to owner dashboard');
            }
        } catch (error: any) {
            logger.warn({ error: error.response?.data?.error || error.message }, '[NodeHealth] Token claim failed (it may already be used or invalid)');
        }
    }

    private static async checkAndRegister() {
        const publicClient = getHeliosPublicClient();
        const walletClient = getHeliosWalletClient();
        const account = getAccount();
        const nodeType = this.getNodeTypeInt();

        try {
            // NodeRegistry v2.1: nodeId = keccak256(operator)
            const nodeId = await publicClient.readContract({
                address: config.NODE_REGISTRY_ADDRESS as Hex,
                abi: parseAbi(['function getNodeId(address,uint8) view returns (bytes32)']),
                functionName: 'getNodeId',
                args: [account.address, nodeType]
            }) as Hex;

            // Check if registered
            const node = await publicClient.readContract({
                address: config.NODE_REGISTRY_ADDRESS as Hex,
                abi: parseAbi(['function nodes(bytes32) view returns (tuple(address,address,uint8,string,string,uint256,uint256,bool,uint256,uint256))']),
                functionName: 'nodes',
                args: [nodeId]
            }) as any;

            const owner = node[0];
            if (owner === '0x0000000000000000000000000000000000000000') {
                logger.warn('[NodeHealth] Node not registered on-chain. Remote auto-registration is limited for sovereign nodes. Please complete staking via dashboard.');
            } else {
                logger.info({ nodeId, owner }, '[NodeHealth] Node verified on-chain');
            }
        } catch (error: any) {
            logger.error({ error: error.message }, '[NodeHealth] On-chain check failed');
        }
    }

    static async sendHeartbeat() {
        const publicClient = getHeliosPublicClient();
        const walletClient = getHeliosWalletClient();
        const nodeType = this.getNodeTypeInt();

        try {
            const nodeId = await this.getLocalNodeId();
            logger.debug({ nodeId }, '[NodeHealth] Sending heartbeat to NodeRegistry...');

            const hash = await walletClient.writeContract({
                address: config.NODE_REGISTRY_ADDRESS as Hex,
                abi: parseAbi(['function heartbeat(bytes32)']),
                functionName: 'heartbeat',
                args: [nodeId]
            });
            logger.debug({ txHash: hash }, '[NodeHealth] Heartbeat sent');
        } catch (error: any) {
            logger.error({ error: error.message }, '[NodeHealth] Heartbeat failed');
        }
    }

    static async validateStake() {
        const publicClient = getHeliosPublicClient();
        const account = getAccount();
        const nodeType = this.getNodeTypeInt();

        try {
            const nodeId = await publicClient.readContract({
                address: config.NODE_REGISTRY_ADDRESS as Hex,
                abi: parseAbi(['function getNodeId(address,uint8) view returns (bytes32)']),
                functionName: 'getNodeId',
                args: [account.address, nodeType]
            }) as Hex;

            const node = await publicClient.readContract({
                address: config.NODE_REGISTRY_ADDRESS as Hex,
                abi: parseAbi(['function getNode(bytes32) view returns (tuple(address,uint8,string,string,uint256,uint256,bool,uint256,uint256))']),
                functionName: 'getNode',
                args: [nodeId]
            }) as any;

            const stakeAmount = node[7];
            const minStake = await publicClient.readContract({
                address: config.NODE_REGISTRY_ADDRESS as Hex,
                abi: parseAbi(['function minStakeAmount() view returns (uint256)']),
                functionName: 'minStakeAmount'
            }) as bigint;

            if (stakeAmount < minStake) {
                logger.error({ stakeAmount: stakeAmount.toString(), minStake: minStake.toString() }, '[NodeHealth] CRITICAL: Node Stake too low! Risk of being ignored or jailed.');
            } else {
                logger.info({ stakeAmount: stakeAmount.toString() }, '[NodeHealth] Stake validation successful');
            }
        } catch (error: any) {
            logger.error({ error: error.message }, '[NodeHealth] Stake validation failed');
        }
    }

    /**
     * Report telemetry to the Sovereign Backend
     */
    static async reportMetric(success: boolean) {
        if (!config.INDEXER_API_URL) return;

        try {
            await axios.post(`${config.INDEXER_API_URL}/nodes/metrics`, {
                nodeId: await this.getLocalNodeId(),
                success,
                timestamp: new Date().toISOString()
            });
        } catch (error: any) {
            // Silently fail telemetry to not block the main truth resolution flow
            logger.debug({ error: error.message }, '[NodeHealth] Telemetry report failed');
        }
    }

    private static getNodeTypeInt(): number {
        const mode = process.env.NODE_MODE?.toLowerCase() || 'sentinel';
        if (mode === 'challenger') return 1;
        if (mode === 'datasource') return 2;
        return 0; // default Sentinel
    }

    private static async getLocalNodeId(): Promise<Hex> {
        const account = getAccount();
        const publicClient = getHeliosPublicClient();
        return await publicClient.readContract({
            address: config.NODE_REGISTRY_ADDRESS as Hex,
            abi: parseAbi(['function getNodeId(address,uint8) view returns (bytes32)']),
            functionName: 'getNodeId',
            args: [account.address, this.getNodeTypeInt()]
        }) as Hex;
    }
}
