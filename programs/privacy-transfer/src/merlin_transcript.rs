/**
 * Merlin Transcript Implementation (Fiat-Shamir) - BPF Compatible
 * 
 * Implements a simplified Merlin transcript protocol for Fiat-Shamir transform
 * in zero-knowledge proof verification. BPF-compatible version.
 */

use sha3::{Keccak256, Digest};

pub struct MerlinTranscript {
    messages: Vec<u8>,
}

impl MerlinTranscript {
    /**
     * Create new transcript with domain separator
     */
    pub fn new(domain_separator: &[u8]) -> Self {
        let mut messages = Vec::new();
        messages.extend_from_slice(b"Merlin v1.0");
        messages.extend_from_slice(domain_separator);
        Self { messages }
    }

    /**
     * Append message to transcript
     */
    pub fn append_message(&mut self, label: &[u8], message: &[u8]) {
        self.messages.extend_from_slice(&(label.len() as u64).to_le_bytes());
        self.messages.extend_from_slice(label);
        self.messages.extend_from_slice(&(message.len() as u64).to_le_bytes());
        self.messages.extend_from_slice(message);
    }

    /**
     * Append point to transcript
     */
    pub fn append_point(&mut self, label: &[u8], point_bytes: &[u8; 64]) {
        self.append_message(label, point_bytes);
    }

    /**
     * Append scalar to transcript
     */
    #[allow(dead_code)]
    pub fn append_scalar(&mut self, label: &[u8], scalar_bytes: &[u8; 32]) {
        self.append_message(label, scalar_bytes);
    }

    /**
     * Get challenge scalar from transcript
     * Returns 32 bytes that can be interpreted as a scalar
     */
    pub fn challenge_scalar(&mut self, label: &[u8]) -> [u8; 32] {
        // Hash all messages so far
        let mut hasher = Keccak256::new();
        hasher.update(&self.messages);
        hasher.update(&(label.len() as u64).to_le_bytes());
        hasher.update(label);
        let hash = hasher.finalize();
        
        // Append hash to messages for next challenge
        self.messages.extend_from_slice(&hash);
        
        // Return first 32 bytes as scalar
        let mut hash_bytes = [0u8; 32];
        hash_bytes.copy_from_slice(&hash[..32]);
        hash_bytes
    }

    /**
     * Get challenge bytes from transcript
     */
    #[allow(dead_code)]
    pub fn challenge_bytes(&mut self, label: &[u8], len: usize) -> Vec<u8> {
        // Hash all messages so far
        let mut hasher = Keccak256::new();
        hasher.update(&self.messages);
        hasher.update(&(label.len() as u64).to_le_bytes());
        hasher.update(label);
        let hash = hasher.finalize();
        
        // Append hash to messages for next challenge
        self.messages.extend_from_slice(&hash);
        
        hash[..len].to_vec()
    }
}

/**
 * Domain separator for range proof
 */
pub fn rangeproof_domain_sep(n: u8, m: u8) -> Vec<u8> {
    let mut domain = b"rangeproof".to_vec();
    domain.push(n);
    domain.push(m);
    domain
}
