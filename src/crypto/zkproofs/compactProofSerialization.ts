/**
 * Compact Proof Serialization for On-Chain Verification
 * 
 * This module provides a compact proof format that includes only the essential
 * components needed for on-chain verification while staying within Solana's
 * transaction size limits (~700 bytes for proof data).
 * 
 * Strategy:
 * 1. Send essential proof components (commitments, key scalars)
 * 2. Include proof hash for off-chain full verification
 * 3. On-chain verifies commitments and structure
 * 4. Full cryptographic verification done off-chain
 */

import { type BulletproofRangeProof } from './bulletproof';
import { type TransferValidityProof } from './validityProof';
import { type ConfidentialTransfer } from './proofSerialization';
import { CurvePoint, ScalarOps, scalarToBytes } from './primitives';
import { createHash } from 'crypto';

/**
 * Ultra-compact proof format for on-chain submission
 * 
 * Format (minimal components for on-chain verification):
 * - Commitment V: 32 bytes (compressed point) - REQUIRED for verification
 * - A: 32 bytes (compressed point) - REQUIRED for structure validation
 * - S: 32 bytes (compressed point) - REQUIRED for structure validation
 * - T1: 32 bytes (compressed point) - REQUIRED for T commitment check
 * - T2: 32 bytes (compressed point) - REQUIRED for T commitment check
 * - taux: 32 bytes - REQUIRED for T commitment check
 * - mu: 32 bytes - REQUIRED for structure validation
 * - t: 32 bytes - REQUIRED for T commitment check
 * - n: 1 byte - REQUIRED for range validation
 * - Proof hash: 16 bytes (truncated SHA-256 for off-chain verification)
 * 
 * Total per range proof: ~273 bytes (reduced from 289)
 * Two range proofs: ~546 bytes
 * Validity proof (ultra-compact): ~96 bytes
 * Total: ~642 bytes (fits within 700 byte limit)
 */
export interface CompactRangeProof {
    commitment: Uint8Array; // 32 bytes (compressed)
    A: Uint8Array; // 32 bytes (compressed)
    S: Uint8Array; // 32 bytes (compressed)
    T1: Uint8Array; // 32 bytes (compressed)
    T2: Uint8Array; // 32 bytes (compressed)
    taux: Uint8Array; // 32 bytes
    mu: Uint8Array; // 32 bytes
    t: Uint8Array; // 32 bytes
    n: number; // 1 byte
    proofHash: Uint8Array; // 16 bytes (truncated SHA-256 for off-chain verification)
}

/**
 * Ultra-compact validity proof format
 */
export interface CompactValidityProof {
    senderEqualityR: Uint8Array; // 32 bytes (compressed)
    senderEqualityS: Uint8Array; // 32 bytes
    recipientEqualityR: Uint8Array; // 32 bytes (compressed) - optional, can be zero if not used
    recipientEqualityS: Uint8Array; // 32 bytes - optional, can be zero if not used
    proofHash: Uint8Array; // 16 bytes (truncated SHA-256 for off-chain verification)
}

/**
 * Compact transfer proof format
 */
export interface CompactTransferProof {
    amountRangeProof: CompactRangeProof;
    senderAfterRangeProof: CompactRangeProof;
    validityProof: CompactValidityProof;
}

/**
 * Compress a curve point to 32 bytes (using compressed format)
 * Note: Ristretto255 points are 32 bytes when compressed
 */
function compressPoint(point: CurvePoint): Uint8Array {
    const bytes = point.toBytes();
    // Ristretto255 points are already 32 bytes when serialized
    if (bytes.length === 32) {
        return bytes;
    }
    // If larger, take first 32 bytes (compressed format)
    return bytes.slice(0, 32);
}

/**
 * Compute SHA-256 hash of full proof for off-chain verification
 */
function computeProofHash(proof: BulletproofRangeProof): Uint8Array {
    const hash = createHash('sha256');
    
    // Hash all proof components
    hash.update(proof.commitment.toBytes());
    hash.update(proof.A.toBytes());
    hash.update(proof.S.toBytes());
    hash.update(proof.T1.toBytes());
    hash.update(proof.T2.toBytes());
    hash.update(scalarToBytes(proof.taux));
    hash.update(scalarToBytes(proof.mu));
    hash.update(scalarToBytes(proof.t));
    hash.update(Buffer.from([proof.n]));
    
    // Hash inner product proof
    for (const L of proof.innerProductProof.L) {
        hash.update(L.toBytes());
    }
    for (const R of proof.innerProductProof.R) {
        hash.update(R.toBytes());
    }
    hash.update(scalarToBytes(proof.innerProductProof.a));
    hash.update(scalarToBytes(proof.innerProductProof.b));
    
    return hash.digest();
}

/**
 * Convert full range proof to compact format
 */
export function compactRangeProof(proof: BulletproofRangeProof): CompactRangeProof {
    // Use truncated hash (16 bytes instead of 32) to save space
    const fullHash = computeProofHash(proof);
    const truncatedHash = fullHash.slice(0, 16); // First 16 bytes of SHA-256
    
    return {
        commitment: compressPoint(proof.commitment),
        A: compressPoint(proof.A),
        S: compressPoint(proof.S),
        T1: compressPoint(proof.T1),
        T2: compressPoint(proof.T2),
        taux: scalarToBytes(proof.taux),
        mu: scalarToBytes(proof.mu),
        t: scalarToBytes(proof.t),
        n: proof.n,
        proofHash: truncatedHash, // 16 bytes instead of 32
    };
}

/**
 * Convert full validity proof to compact format
 */
export function compactValidityProof(proof: TransferValidityProof): CompactValidityProof {
    const hash = createHash('sha256');
    
    // Hash full validity proof components
    hash.update(proof.senderBefore.toBytes());
    hash.update(proof.amount.toBytes());
    hash.update(proof.senderAfter.toBytes());
    
    if (proof.equalityProof) {
        hash.update(proof.equalityProof.R.toBytes());
        hash.update(scalarToBytes(proof.equalityProof.s));
    }
    
    if (proof.recipientEqualityProof) {
        hash.update(proof.recipientEqualityProof.R.toBytes());
        hash.update(scalarToBytes(proof.recipientEqualityProof.s));
    }
    
    // Use truncated hash (16 bytes instead of 32) to save space
    const fullHash = hash.digest();
    const truncatedHash = fullHash.slice(0, 16); // First 16 bytes of SHA-256
    
    return {
        senderEqualityR: proof.equalityProof 
            ? compressPoint(proof.equalityProof.R)
            : new Uint8Array(32),
        senderEqualityS: proof.equalityProof
            ? scalarToBytes(proof.equalityProof.s)
            : new Uint8Array(32),
        recipientEqualityR: proof.recipientEqualityProof
            ? compressPoint(proof.recipientEqualityProof.R)
            : new Uint8Array(32),
        recipientEqualityS: proof.recipientEqualityProof
            ? scalarToBytes(proof.recipientEqualityProof.s)
            : new Uint8Array(32),
        proofHash: truncatedHash, // 16 bytes instead of 32
    };
}

/**
 * Serialize ultra-compact range proof to bytes
 * 
 * Format:
 * - commitment: 32 bytes
 * - A: 32 bytes
 * - S: 32 bytes
 * - T1: 32 bytes
 * - T2: 32 bytes
 * - taux: 32 bytes
 * - mu: 32 bytes
 * - t: 32 bytes
 * - n: 1 byte
 * - proofHash: 16 bytes (truncated)
 * 
 * Total: 273 bytes (reduced from 289)
 */
export function serializeCompactRangeProof(proof: CompactRangeProof): Uint8Array {
    const result = new Uint8Array(273);
    let offset = 0;
    
    result.set(proof.commitment, offset);
    offset += 32;
    
    result.set(proof.A, offset);
    offset += 32;
    
    result.set(proof.S, offset);
    offset += 32;
    
    result.set(proof.T1, offset);
    offset += 32;
    
    result.set(proof.T2, offset);
    offset += 32;
    
    result.set(proof.taux, offset);
    offset += 32;
    
    result.set(proof.mu, offset);
    offset += 32;
    
    result.set(proof.t, offset);
    offset += 32;
    
    result[offset] = proof.n;
    offset += 1;
    
    // Set truncated hash (16 bytes)
    result.set(proof.proofHash, offset);
    offset += 16;
    
    return result;
}

/**
 * Serialize ultra-compact validity proof to bytes
 * 
 * Format:
 * - senderEqualityR: 32 bytes
 * - senderEqualityS: 32 bytes
 * - recipientEqualityR: 32 bytes (optional, can be zero)
 * - recipientEqualityS: 32 bytes (optional, can be zero)
 * - proofHash: 16 bytes (truncated)
 * 
 * Total: 144 bytes (reduced from 160)
 */
export function serializeCompactValidityProof(proof: CompactValidityProof): Uint8Array {
    const result = new Uint8Array(144);
    let offset = 0;
    
    result.set(proof.senderEqualityR, offset);
    offset += 32;
    
    result.set(proof.senderEqualityS, offset);
    offset += 32;
    
    result.set(proof.recipientEqualityR, offset);
    offset += 32;
    
    result.set(proof.recipientEqualityS, offset);
    offset += 32;
    
    // Set truncated hash (16 bytes)
    result.set(proof.proofHash, offset);
    offset += 16;
    
    return result;
}

/**
 * Serialize ultra-compact transfer proof to bytes
 * 
 * Format:
 * [amount_range_proof][sender_after_range_proof][validity_proof]
 * 
 * Total: 273 + 273 + 144 = 690 bytes
 * 
 * Note: This fits within the 700-byte limit with room for transaction overhead
 */
export function serializeCompactTransferProof(transfer: ConfidentialTransfer): Uint8Array {
    const amountCompact = compactRangeProof(transfer.amountRangeProof);
    const senderAfterCompact = compactRangeProof(transfer.senderAfterRangeProof);
    const validityCompact = compactValidityProof(transfer.validityProof);
    
    const amountBytes = serializeCompactRangeProof(amountCompact);
    const senderAfterBytes = serializeCompactRangeProof(senderAfterCompact);
    const validityBytes = serializeCompactValidityProof(validityCompact);
    
    const totalSize = amountBytes.length + senderAfterBytes.length + validityBytes.length;
    const result = new Uint8Array(totalSize);
    
    let offset = 0;
    result.set(amountBytes, offset);
    offset += amountBytes.length;
    
    result.set(senderAfterBytes, offset);
    offset += senderAfterBytes.length;
    
    result.set(validityBytes, offset);
    
    return result;
}

/**
 * Verify proof hash matches (for off-chain verification)
 * 
 * Note: Uses truncated hash (16 bytes) for space efficiency
 * Full hash verification can be done off-chain with full proof
 */
export function verifyProofHash(
    compactProof: CompactRangeProof,
    fullProof: BulletproofRangeProof
): boolean {
    const computedHash = computeProofHash(fullProof);
    const truncatedComputedHash = computedHash.slice(0, 16); // First 16 bytes
    return truncatedComputedHash.length === compactProof.proofHash.length &&
           truncatedComputedHash.every((byte, i) => byte === compactProof.proofHash[i]);
}

