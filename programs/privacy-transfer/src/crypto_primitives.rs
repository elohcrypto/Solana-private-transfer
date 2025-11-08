/**
 * Cryptographic Primitives for ZK Proof Verification (BPF-Compatible)
 * 
 * This module provides BPF-compatible cryptographic operations for Solana.
 * Note: Full elliptic curve operations are not feasible on-chain due to
 * Solana's 4KB stack limit. This implementation provides basic validation
 * and structure for proof verification.
 * 
 * IMPORTANT: Full cryptographic verification should be performed off-chain
 * or using a compute-efficient approach. This on-chain implementation
 * performs basic validation and structure checks.
 */

use sha2::{Sha512, Digest};

/// Ristretto255 curve order (prime order of the curve)
/// L = 2^252 + 27742317777372353535851937790883648493
#[allow(dead_code)]
pub const CURVE_ORDER: &str = "7237005577332262213973186563042994240857116359379907606001950938285454250989";

/**
 * Hash to scalar (SHA-512) - BPF compatible
 * Returns 32 bytes that can be interpreted as a scalar
 */
#[allow(dead_code)] // Reserved for future use in full implementation
pub fn hash_to_scalar(input: &[u8]) -> [u8; 32] {
    let mut hasher = Sha512::new();
    hasher.update(input);
    let hash = hasher.finalize();
    let mut hash_bytes = [0u8; 32];
    hash_bytes.copy_from_slice(&hash[..32]);
    hash_bytes
}

/**
 * Verify point is not all zeros (basic validation)
 */
pub fn is_nonzero_point(bytes: &[u8; 64]) -> bool {
    bytes != &[0u8; 64]
}

/**
 * Verify commitment format (64 bytes, non-zero)
 */
pub fn is_valid_commitment_format(bytes: &[u8; 64]) -> bool {
    is_nonzero_point(bytes)
}

/**
 * Constant-time comparison for scalars
 */
pub fn constant_time_eq(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        return false;
    }
    let mut result = 0u8;
    for (ai, bi) in a.iter().zip(b.iter()) {
        result |= ai ^ bi;
    }
    result == 0
}
