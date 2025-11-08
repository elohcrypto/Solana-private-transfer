import { PublicKey } from '@solana/web3.js';
// NOTE: ElGamalKeypair removed - using Pedersen commitments instead

/**
 * Privacy mode for transfers
 */
export enum PrivacyMode {
    /** Use Elusiv mixing protocol (WORKS NOW on mainnet) */
    ELUSIV = 'elusiv',
    /** Use native Solana ZK proofs (COMING SOON - when Solana enables) */
    NATIVE_ZK = 'native-zk',
    /** Regular transfer with no privacy (amounts visible) */
    REGULAR = 'regular'
}

/**
 * Wallet configuration interface
 */
export interface WalletConfig {
    rpcUrl: string;
    network: 'devnet' | 'testnet' | 'mainnet-beta';
    relayer?: {
        url?: string;
        pubkey?: string;
    };
    batch: {
        windowMs: number;
        maxSize: number;
    };
    keyStoragePath: string;
    /** Default privacy mode (defaults to ELUSIV for production-ready privacy) */
    defaultPrivacyMode?: PrivacyMode;
}

/**
 * Queued transfer waiting for batch processing
 */
export interface QueuedTransfer {
    id: string;
    recipient: PublicKey;
    amountSol: string;
    status: 'queued' | 'processing' | 'confirmed' | 'failed';
    queuedAt: number;
    processedAt?: number;
    signature?: string;
    error?: string;
}

/**
 * Transaction record for history tracking
 */
export interface TransactionRecord {
    id: string;
    type: 'deposit' | 'transfer' | 'withdraw';
    amount: string;
    recipient?: string;
    status: 'confirmed' | 'failed';
    signature?: string;
    timestamp: number;
    error?: string;
    metadata?: {
        privacyMode?: string;
        proofGenerationMs?: number;
        proofVerificationMs?: number;
        hasRangeProofs?: boolean;
        hasValidityProof?: boolean;
        [key: string]: any;
    };
}

/**
 * Result of batch processing operation
 */
export interface BatchResult {
    successful: number;
    failed: number;
    signatures: string[];
    errors: Array<{ transferId: string; error: string }>;
}

/**
 * Error codes for UTXO operations
 */
export enum ErrorCode {
    // Note: This is an error code constant, not a secret
    PASSWORD_INVALID = 'PASSWORD_INVALID',
    KEY_NOT_FOUND = 'KEY_NOT_FOUND',
    INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
    INVALID_AMOUNT = 'INVALID_AMOUNT',
    INVALID_RECIPIENT = 'INVALID_RECIPIENT',
    TRANSACTION_FAILED = 'TRANSACTION_FAILED',
    PROOF_GENERATION_FAILED = 'PROOF_GENERATION_FAILED',
    SYNC_FAILED = 'SYNC_FAILED',
    NETWORK_ERROR = 'NETWORK_ERROR',
    UTXO_NOT_FOUND = 'UTXO_NOT_FOUND',
    DOUBLE_SPEND_DETECTED = 'DOUBLE_SPEND_DETECTED',
    LIGHT_PROTOCOL_ERROR = 'LIGHT_PROTOCOL_ERROR',
    CONFIG_INVALID = 'CONFIG_INVALID',
    FILE_ERROR = 'FILE_ERROR',
}

/**
 * Custom error class for UTXO operations
 */
export class UTXOError extends Error {
    constructor(
        public code: ErrorCode,
        message: string,
        public details?: unknown
    ) {
        super(message);
        this.name = 'UTXOError';
        Object.setPrototypeOf(this, UTXOError.prototype);
    }
}

/**
 * Helper functions to create specific error types
 */
export const createError = {
    invalidPassword: () =>
        new UTXOError(ErrorCode.PASSWORD_INVALID, 'Invalid password provided'),
    keyNotFound: () =>
        new UTXOError(ErrorCode.KEY_NOT_FOUND, 'Wallet keys not found. Initialize wallet first.'),
    insufficientBalance: (required: string, available: string) =>
        new UTXOError(
            ErrorCode.INSUFFICIENT_BALANCE,
            `Insufficient balance. Required: ${required} SOL, Available: ${available} SOL`
        ),
    invalidAmount: (amount: string) =>
        new UTXOError(ErrorCode.INVALID_AMOUNT, `Invalid amount: ${amount}`),
    invalidRecipient: (address: string) =>
        new UTXOError(ErrorCode.INVALID_RECIPIENT, `Invalid recipient address: ${address}`),
    transactionFailed: (reason: string) =>
        new UTXOError(ErrorCode.TRANSACTION_FAILED, `Transaction failed: ${reason}`),
    proofGenerationFailed: (reason: string) =>
        new UTXOError(ErrorCode.PROOF_GENERATION_FAILED, `Proof generation failed: ${reason}`),
    syncFailed: (reason: string) =>
        new UTXOError(ErrorCode.SYNC_FAILED, `Sync failed: ${reason}`),
    networkError: (reason: string) =>
        new UTXOError(ErrorCode.NETWORK_ERROR, `Network error: ${reason}`),
    configInvalid: (reason: string) =>
        new UTXOError(ErrorCode.CONFIG_INVALID, `Invalid configuration: ${reason}`),
};
