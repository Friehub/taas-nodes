import { Hex, encodeAbiParameters, keccak256, parseAbiParameters, type TypedDataDomain } from 'viem';
import { getHeliosPublicClient, getHeliosWalletClient, getAccount } from '../config/viem';
import { logger } from '../config/logger';

export interface TruthCertificate {
    requestId: string;
    version: string;
    timestamp: number;
    recipeId: string;
    outcome: any;
    trace: any[];
    rationale: string;
    sources: string[];
    consensus: {
        method: string;
        outliers: string[];
    };
    signature?: Hex;
}

export class TruthCertificateService {
    // EIP-712 Domain for TaaS
    private static readonly DOMAIN: TypedDataDomain = {
        name: 'TaaS-TruthNode',
        version: '1.0.0',
        chainId: 42000, // Helios Testnet
        verifyingContract: '0x0000000000000000000000000000000000000000' // Updated dynamically if needed
    };

    // EIP-712 Types for TruthCertificate
    private static readonly TYPES = {
        TruthCertificate: [
            { name: 'requestId', type: 'bytes32' },
            { name: 'recipeId', type: 'string' },
            { name: 'outcome', type: 'uint256' },
            { name: 'rationale', type: 'string' },
            { name: 'timestamp', type: 'uint256' }
        ]
    };

    /**
     * Generate a structured Truth Certificate for a verification result
     */
    static async generate(
        requestId: string,
        recipeId: string,
        result: any
    ): Promise<TruthCertificate> {
        const certificate: TruthCertificate = {
            requestId,
            version: '1.0.0',
            timestamp: Math.floor(Date.now() / 1000),
            recipeId,
            outcome: result.winningOutcome,
            trace: result.trace || [],
            rationale: this.extractRationale(result),
            sources: this.extractSources(result),
            consensus: {
                method: result.consensus?.method || 'MAD (Outlier Detection)',
                outliers: result.consensus?.outliers || []
            }
        };

        // Sign the certificate using EIP-712
        certificate.signature = await this.signCertificate(certificate);

        return certificate;
    }

    private static extractRationale(result: any): string {
        // Find the 'reasoner' node in the trace and extract its judgment
        const nodes = result.trace?.nodes || result.trace || {};
        const nodesList = Array.isArray(nodes) ? nodes : Object.values(nodes);
        const reasonerNode = nodesList.find((step: any) => step.type === 'reasoner' || step.id?.includes('reasoner'));
        return reasonerNode?.result?.explanation || 'Automatic verification via configured data sources.';
    }

    private static extractSources(result: any): string[] {
        // Find all 'fetch' or 'distiller' nodes to list the data sources used
        const nodes = result.trace?.nodes || result.trace || {};
        const nodesList = Array.isArray(nodes) ? nodes : Object.values(nodes);
        const fetchNodes = nodesList.filter((step: any) =>
            ['fetch', 'distiller', 'standard-feed'].includes(step.type) ||
            ['fetch', 'distiller', 'standard-feed'].some(t => step.id?.includes(t))
        );
        return fetchNodes?.map((node: any) => node.params?.url || node.id || 'unknown') || [];
    }

    private static async signCertificate(cert: TruthCertificate): Promise<Hex> {
        logger.info({ requestId: cert.requestId }, '[AaaS] Signing Truth Certificate...');

        try {
            const wallet = getHeliosWalletClient();
            const account = getAccount();
            const signature = await wallet.signTypedData({
                account,
                domain: this.DOMAIN,
                types: this.TYPES,
                primaryType: 'TruthCertificate',
                message: {
                    requestId: cert.requestId as Hex,
                    recipeId: cert.recipeId,
                    outcome: BigInt(cert.outcome),
                    rationale: cert.rationale,
                    timestamp: BigInt(cert.timestamp)
                }
            });

            return signature;
        } catch (err: any) {
            logger.error({ requestId: cert.requestId, err: err.message }, '[AaaS] Failed to sign certificate');
            return '0x' as Hex; // Fallback
        }
    }

    /**
     * Mock IPFS upload (In production, this would use Pinata or Infura)
     */
    static async uploadToIPFS(certificate: TruthCertificate): Promise<string> {
        logger.info({ requestId: certificate.requestId }, '[AaaS] Uploading Truth Certificate to IPFS...');

        // Simulating CID generation
        const mockCID = `Qm${keccak256(Buffer.from(JSON.stringify(certificate))).slice(2, 48)}`;

        logger.info({ cid: mockCID }, '[AaaS] Certificate pinned');
        return mockCID;
    }
}
