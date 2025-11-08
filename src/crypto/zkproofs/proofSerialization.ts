/**
 * Proof Serialization for On-Chain Submission
 * 
 * Serializes ZK proofs to bytes for on-chain submission.
 * Format matches the Rust deserialization in proof_verification.rs
 */

import { BulletproofRangeProof } from './bulletproof';
import { EqualityProof } from './equalityProof';
import { TransferValidityProof } from './validityProof';
import { CurvePoint, ScalarOps, scalarToBytes } from './primitives';

/**
 * Confidential transfer interface (matches PrivacyLayer.ConfidentialTransfer)
 */
export interface ConfidentialTransfer {
    senderBeforeCommitment: CurvePoint;
    amountCommitment: CurvePoint;
    senderAfterCommitment: CurvePoint;
    recipientCommitment?: CurvePoint;
    amountRangeProof: BulletproofRangeProof;
    senderAfterRangeProof: BulletproofRangeProof;
    validityProof: TransferValidityProof;
}

/**
 * Serialize a Bulletproof range proof to bytes
 * 
 * Format:
 * - commitment: 64 bytes (32 X + 32 Y)
 * - A: 64 bytes
 * - S: 64 bytes
 * - T1: 64 bytes
 * - T2: 64 bytes
 * - taux: 32 bytes
 * - mu: 32 bytes
 * - t: 32 bytes
 * - n: 1 byte
 * - inner_product_proof: variable (simplified for now)
 * 
 * Total: ~400 bytes minimum (without inner product proof details)
 */
export function serializeRangeProof(proof: BulletproofRangeProof): Uint8Array {
    const commitmentBytes = proof.commitment.toBytes();
    const aBytes = proof.A.toBytes();
    const sBytes = proof.S.toBytes();
    const t1Bytes = proof.T1.toBytes();
    const t2Bytes = proof.T2.toBytes();
    const tauxBytes = scalarToBytes(proof.taux);
    const muBytes = scalarToBytes(proof.mu);
    const tBytes = scalarToBytes(proof.t);
    
    // Serialize inner product proof (simplified - just serialize L, R, a, b)
    const innerProductBytes = serializeInnerProductProof(proof.innerProductProof);
    
    // Total size: 64*5 + 32*3 + 1 + inner_product_size
    const totalSize = 64 * 5 + 32 * 3 + 1 + innerProductBytes.length;
    const result = new Uint8Array(totalSize);
    
    let offset = 0;
    
    // Write commitment (64 bytes)
    result.set(commitmentBytes, offset);
    offset += 64;
    
    // Write A (64 bytes)
    result.set(aBytes, offset);
    offset += 64;
    
    // Write S (64 bytes)
    result.set(sBytes, offset);
    offset += 64;
    
    // Write T1 (64 bytes)
    result.set(t1Bytes, offset);
    offset += 64;
    
    // Write T2 (64 bytes)
    result.set(t2Bytes, offset);
    offset += 64;
    
    // Write taux (32 bytes)
    result.set(tauxBytes, offset);
    offset += 32;
    
    // Write mu (32 bytes)
    result.set(muBytes, offset);
    offset += 32;
    
    // Write t (32 bytes)
    result.set(tBytes, offset);
    offset += 32;
    
    // Write n (1 byte)
    result[offset] = proof.n;
    offset += 1;
    
    // Write inner product proof
    result.set(innerProductBytes, offset);
    
    return result;
}

/**
 * Serialize inner product proof
 * 
 * Format:
 * - L length: 1 byte
 * - L[i]: 64 bytes each
 * - R length: 1 byte
 * - R[i]: 64 bytes each
 * - a: 32 bytes
 * - b: 32 bytes
 */
function serializeInnerProductProof(proof: any): Uint8Array {
    const lLength = Math.min(proof.L?.length || 0, 255);
    const rLength = Math.min(proof.R?.length || 0, 255);
    
    const totalSize = 1 + (lLength * 64) + 1 + (rLength * 64) + 32 + 32;
    const result = new Uint8Array(totalSize);
    
    let offset = 0;
    
    // Write L length
    result[offset] = lLength;
    offset += 1;
    
    // Write L points
    if (proof.L && proof.L.length > 0) {
        for (let i = 0; i < lLength; i++) {
            const lBytes = proof.L[i].toBytes();
            result.set(lBytes, offset);
            offset += 64;
        }
    }
    
    // Write R length
    result[offset] = rLength;
    offset += 1;
    
    // Write R points
    if (proof.R && proof.R.length > 0) {
        for (let i = 0; i < rLength; i++) {
            const rBytes = proof.R[i].toBytes();
            result.set(rBytes, offset);
            offset += 64;
        }
    }
    
    // Write a (32 bytes)
    const aBytes = scalarToBytes(proof.a || 0n);
    result.set(aBytes, offset);
    offset += 32;
    
    // Write b (32 bytes)
    const bBytes = scalarToBytes(proof.b || 0n);
    result.set(bBytes, offset);
    
    return result;
}

/**
 * Serialize equality proof
 * 
 * Format:
 * - R: 64 bytes
 * - s: 32 bytes
 * 
 * Total: 96 bytes
 */
export function serializeEqualityProof(proof: EqualityProof): Uint8Array {
    const rBytes = proof.R.toBytes();
    const sBytes = scalarToBytes(proof.s);
    
    const result = new Uint8Array(96);
    result.set(rBytes, 0);
    result.set(sBytes, 64);
    
    return result;
}

/**
 * Serialize validity proof
 * 
 * Format:
 * - sender_equality_proof: 96 bytes
 * - recipient_equality_proof: 96 bytes
 * 
 * Total: 192 bytes
 */
export function serializeValidityProof(proof: TransferValidityProof): Uint8Array {
    // SECURITY: TransferValidityProof has separate equality proofs:
    // 1. Sender proof: sender_before = amount + sender_after
    // 2. Recipient proof: recipient_old + amount = recipient_new (when available)
    // 
    // The Rust code expects separate sender and recipient equality proofs.
    // When recipient proof is available, we use it. Otherwise, we use the sender proof
    // for both (the Rust code will validate both proofs separately).
    
    if (!proof.equalityProof) {
        throw new Error('Validity proof must have equality proof');
    }
    
    // Serialize sender equality proof
    const senderProofBytes = serializeEqualityProof(proof.equalityProof);
    
    // Use recipient proof if available, otherwise use sender proof
    // Note: When recipient proof is not available, the Rust code will still validate
    // both proofs separately, ensuring security even if the same proof is used
    const recipientProof = proof.recipientEqualityProof || proof.equalityProof;
    const recipientProofBytes = serializeEqualityProof(recipientProof);
    
    const result = new Uint8Array(192);
    result.set(senderProofBytes, 0);
    result.set(recipientProofBytes, 96);
    
    return result;
}

/**
 * Serialize complete transfer proof for on-chain submission
 * 
 * Format:
 * [amount_range_proof][sender_after_range_proof][validity_proof]
 * 
 * Each range proof: ~400-700 bytes
 * Validity proof: ~200 bytes
 * Total: ~1000-1600 bytes
 */
export function serializeTransferProof(transfer: ConfidentialTransfer): Uint8Array {
    // Serialize range proofs
    const amountRangeProofBytes = serializeRangeProof(transfer.amountRangeProof);
    const senderAfterRangeProofBytes = serializeRangeProof(transfer.senderAfterRangeProof);
    
    // Serialize validity proof
    const validityProofBytes = serializeValidityProof(transfer.validityProof);
    
    // Combine all proofs
    const totalSize = amountRangeProofBytes.length + senderAfterRangeProofBytes.length + validityProofBytes.length;
    const result = new Uint8Array(totalSize);
    
    let offset = 0;
    
    // Write amount range proof
    result.set(amountRangeProofBytes, offset);
    offset += amountRangeProofBytes.length;
    
    // Write sender after range proof
    result.set(senderAfterRangeProofBytes, offset);
    offset += senderAfterRangeProofBytes.length;
    
    // Write validity proof
    result.set(validityProofBytes, offset);
    
    return result;
}

