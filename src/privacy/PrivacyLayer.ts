/**
 * Privacy Layer
 * 
 * High-level API for generating and verifying zero-knowledge proofs
 * for confidential transactions. This layer abstracts the complexity
 * of Bulletproofs, equality proofs, and validity proofs.
 */

import { Bulletproof, BulletproofRangeProof } from '../crypto/zkproofs/bulletproof';
import { EqualityProof } from '../crypto/zkproofs/equalityProof';
import { ValidityProof, TransferValidityProof } from '../crypto/zkproofs/validityProof';
import { PedersenCommitment, CurvePoint, ScalarOps } from '../crypto/zkproofs/primitives';
import { CACHE_CONSTANTS, PROOF_CONSTANTS } from '../utils/constants';
import { createError, ErrorCode } from '../types';

/**
 * Configuration for the privacy layer
 */
export interface PrivacyConfig {
    /** Number of bits for range proofs (must be power of 2) */
    rangeBits: number;
    /** Enable proof caching for performance */
    enableCaching: boolean;
    /** Enable parallel proof generation */
    enableParallel: boolean;
}

/**
 * A confidential transfer with all necessary proofs
 */
export interface ConfidentialTransfer {
    /** Sender's balance before transfer (commitment) */
    senderBeforeCommitment: CurvePoint;
    /** Amount being transferred (commitment) */
    amountCommitment: CurvePoint;
    /** Sender's balance after transfer (commitment) */
    senderAfterCommitment: CurvePoint;
    /** Recipient's new balance (commitment) */
    recipientCommitment?: CurvePoint;
    /** Range proof for amount */
    amountRangeProof: BulletproofRangeProof;
    /** Range proof for sender's remaining balance */
    senderAfterRangeProof: BulletproofRangeProof;
    /** Validity proof showing balance equation holds */
    validityProof: TransferValidityProof;
}

/**
 * Result of proof generation (deprecated - use throws errors instead)
 * @deprecated Use try/catch with thrown errors instead
 */
export interface ProofGenerationResult {
    success: boolean;
    transfer?: ConfidentialTransfer;
    error?: string;
    generationTimeMs: number;
}

/**
 * Result of proof verification (deprecated - use throws errors instead)
 * @deprecated Use try/catch with thrown errors instead
 */
export interface ProofVerificationResult {
    valid: boolean;
    error?: string;
    verificationTimeMs: number;
}

/**
 * Cached proof entry
 */
interface CachedProof {
    proof: BulletproofRangeProof;
    timestamp: number;
}

/**
 * Privacy Layer - High-level API for ZK proofs
 */
export class PrivacyLayer {
    private config: PrivacyConfig;
    private proofCache: Map<string, CachedProof>;
    private readonly CACHE_TTL_MS = CACHE_CONSTANTS.PROOF_CACHE_TTL_MS;

    constructor(config?: Partial<PrivacyConfig>) {
        this.config = {
            rangeBits: config?.rangeBits ?? 64, // Default to 64-bit for lamport amounts
            enableCaching: config?.enableCaching ?? true,
            enableParallel: config?.enableParallel ?? true,
        };
        this.proofCache = new Map();
    }

    /**
     * Generate a confidential transfer with all necessary proofs
     * 
     * Standardized error handling: throws errors instead of returning result objects
     * 
     * @param senderBefore Sender's balance before transfer
     * @param amount Amount to transfer
     * @param senderAfter Sender's balance after transfer
     * @param blindings Blinding factors for commitments
     * @returns ConfidentialTransfer with all proofs
     * @throws UTXOError with appropriate ErrorCode on failure
     */
    async generateTransferProofs(
        senderBefore: bigint,
        amount: bigint,
        senderAfter: bigint,
        blindings: {
            senderBefore: bigint;
            amount: bigint;
            senderAfter: bigint;
        }
    ): Promise<ConfidentialTransfer> {
        // Validate inputs
        if (amount < 0n) {
            throw createError.invalidAmount('Amount cannot be negative');
        }

        if (senderBefore < amount) {
            throw createError.insufficientBalance(
                amount.toString(),
                senderBefore.toString()
            );
        }

        if (senderBefore - amount !== senderAfter) {
            throw createError.proofGenerationFailed('Balance equation does not hold');
        }

            // Generate commitments
            const senderBeforeCommitment = PedersenCommitment.commit(senderBefore, blindings.senderBefore);
            const amountCommitment = PedersenCommitment.commit(amount, blindings.amount);
            const senderAfterCommitment = PedersenCommitment.commit(senderAfter, blindings.senderAfter);

            // Generate proofs in parallel if enabled
            let amountRangeProof: BulletproofRangeProof;
            let senderAfterRangeProof: BulletproofRangeProof;

            if (this.config.enableParallel) {
                [amountRangeProof, senderAfterRangeProof] = await Promise.all([
                    this.generateRangeProof(amount, blindings.amount),
                    this.generateRangeProof(senderAfter, blindings.senderAfter),
                ]);
            } else {
                amountRangeProof = await this.generateRangeProof(amount, blindings.amount);
                senderAfterRangeProof = await this.generateRangeProof(senderAfter, blindings.senderAfter);
            }

            // Generate validity proof
            const validityProof = await ValidityProof.proveTransfer(
                senderBefore,
                amount,
                senderAfter,
                blindings,
                this.config.rangeBits
            );

        const transfer: ConfidentialTransfer = {
            senderBeforeCommitment,
            amountCommitment,
            senderAfterCommitment,
            amountRangeProof,
            senderAfterRangeProof,
            validityProof,
        };

        return transfer;
    }

    /**
     * Verify a confidential transfer
     * 
     * Standardized error handling: throws errors instead of returning result objects
     * 
     * @param transfer The confidential transfer to verify
     * @throws UTXOError with appropriate ErrorCode on verification failure
     */
    async verifyTransfer(transfer: ConfidentialTransfer): Promise<void> {
        // Verify range proofs
        const amountRangeValid = await Bulletproof.verify(transfer.amountRangeProof);
        if (!amountRangeValid) {
            throw createError.proofGenerationFailed('Amount range proof verification failed');
        }

        const senderAfterRangeValid = await Bulletproof.verify(transfer.senderAfterRangeProof);
        if (!senderAfterRangeValid) {
            throw createError.proofGenerationFailed('Sender after range proof verification failed');
        }

        // Verify validity proof
        const validityValid = await ValidityProof.verifyTransfer(transfer.validityProof);
        if (!validityValid) {
            throw createError.proofGenerationFailed('Validity proof verification failed');
        }

        // Verify commitments match
        if (!transfer.amountRangeProof.commitment.equals(transfer.amountCommitment)) {
            throw createError.proofGenerationFailed('Amount commitment mismatch');
        }

        if (!transfer.senderAfterRangeProof.commitment.equals(transfer.senderAfterCommitment)) {
            throw createError.proofGenerationFailed('Sender after commitment mismatch');
        }
    }

    /**
     * Generate a range proof with optional caching
     */
    private async generateRangeProof(value: bigint, blinding: bigint): Promise<BulletproofRangeProof> {
        if (this.config.enableCaching) {
            const cacheKey = `${value}-${blinding}`;
            const cached = this.proofCache.get(cacheKey);

            if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
                return cached.proof;
            }

            const proof = await Bulletproof.prove(value, blinding, this.config.rangeBits);
            this.proofCache.set(cacheKey, { proof, timestamp: Date.now() });

            // Clean up old cache entries
            this.cleanCache();

            return proof;
        }

        return Bulletproof.prove(value, blinding, this.config.rangeBits);
    }

    /**
     * Clean up expired cache entries
     */
    private cleanCache(): void {
        const now = Date.now();
        for (const [key, entry] of this.proofCache.entries()) {
            if (now - entry.timestamp > this.CACHE_TTL_MS) {
                this.proofCache.delete(key);
            }
        }
    }

    /**
     * Generate proofs for a batch of transfers in parallel
     * 
     * Standardized error handling: throws errors instead of returning result objects
     * 
     * @param transfers Array of transfer parameters
     * @returns Array of ConfidentialTransfer
     * @throws UTXOError with appropriate ErrorCode on failure
     */
    async generateBatchTransferProofs(
        transfers: Array<{
            senderBefore: bigint;
            amount: bigint;
            senderAfter: bigint;
            blindings: {
                senderBefore: bigint;
                amount: bigint;
                senderAfter: bigint;
            };
        }>
    ): Promise<ConfidentialTransfer[]> {
        if (this.config.enableParallel) {
            return Promise.all(
                transfers.map((t) =>
                    this.generateTransferProofs(t.senderBefore, t.amount, t.senderAfter, t.blindings)
                )
            );
        }

        const results: ConfidentialTransfer[] = [];
        for (const t of transfers) {
            const result = await this.generateTransferProofs(
                t.senderBefore,
                t.amount,
                t.senderAfter,
                t.blindings
            );
            results.push(result);
        }
        return results;
    }

    /**
     * Verify a batch of transfers
     * 
     * Standardized error handling: throws errors instead of returning result objects
     * 
     * @param transfers Array of confidential transfers
     * @throws UTXOError with appropriate ErrorCode on verification failure
     */
    async verifyBatchTransfers(transfers: ConfidentialTransfer[]): Promise<void> {
        if (this.config.enableParallel) {
            await Promise.all(transfers.map((t) => this.verifyTransfer(t)));
        } else {
            for (const t of transfers) {
                await this.verifyTransfer(t);
            }
        }
    }

    /**
     * Clear the proof cache
     */
    clearCache(): void {
        this.proofCache.clear();
    }

    /**
     * Get cache statistics
     */
    getCacheStats(): { size: number; ttlMs: number } {
        return {
            size: this.proofCache.size,
            ttlMs: this.CACHE_TTL_MS,
        };
    }

    /**
     * Update configuration
     */
    updateConfig(config: Partial<PrivacyConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Get current configuration
     */
    getConfig(): PrivacyConfig {
        return { ...this.config };
    }
}
