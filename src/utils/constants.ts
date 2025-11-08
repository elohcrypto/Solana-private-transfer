/**
 * Application Constants
 * 
 * Centralized constants to avoid magic numbers throughout the codebase
 */

import { LAMPORTS_PER_SOL } from '@solana/web3.js';

/**
 * Solana constants (re-exported for convenience)
 */
export const SOL_LAMPORTS_PER_SOL = LAMPORTS_PER_SOL;

/**
 * Proof generation constants
 */
export const PROOF_CONSTANTS = {
    /** Minimum proof data size in bytes */
    MIN_PROOF_SIZE: 64,
    /** Maximum proof data size in bytes (DoS protection) */
    MAX_PROOF_SIZE: 10000,
    /** Default range bits for proofs */
    DEFAULT_RANGE_BITS: 64,
} as const;

/**
 * Transfer constants
 */
export const TRANSFER_CONSTANTS = {
    /** Maximum transfer amount (prevent overflow) */
    MAX_AMOUNT: 1e15,
    /** Minimum transfer amount */
    MIN_AMOUNT: 0.000000001, // 1 lamport
} as const;

/**
 * Cache constants
 */
export const CACHE_CONSTANTS = {
    /** Proof cache TTL in milliseconds */
    PROOF_CACHE_TTL_MS: 60000, // 1 minute
} as const;

/**
 * Key storage constants
 */
export const KEY_STORAGE_CONSTANTS = {
    /** Argon2 memory cost (in KB) - 64 MB */
    ARGON2_MEMORY_COST: 65536,
    /** Argon2 time cost (iterations) */
    ARGON2_TIME_COST: 3,
    /** Argon2 parallelism (threads) */
    ARGON2_PARALLELISM: 4,
    /** Salt length in bytes */
    SALT_LENGTH: 16,
    /** IV length in bytes for AES-GCM */
    IV_LENGTH: 16,
    /** Key length in bytes */
    KEY_LENGTH: 32,
    /** File permissions for key files (read/write for owner only) */
    FILE_PERMISSIONS: 0o600,
    /** Directory permissions for wallet directories (read/write/execute for owner only) */
    DIR_PERMISSIONS: 0o700,
} as const;

/**
 * Batch processing constants
 */
export const BATCH_CONSTANTS = {
    /** Default concurrency for batch processing */
    DEFAULT_CONCURRENCY: 5,
} as const;

/**
 * Retry constants
 */
export const RETRY_CONSTANTS = {
    /** Default maximum retry attempts */
    DEFAULT_MAX_ATTEMPTS: 5,
    /** Default initial delay in milliseconds */
    DEFAULT_INITIAL_DELAY_MS: 1000,
    /** Default maximum delay in milliseconds */
    DEFAULT_MAX_DELAY_MS: 30000,
    /** Default backoff multiplier */
    DEFAULT_BACKOFF_MULTIPLIER: 2,
} as const;

