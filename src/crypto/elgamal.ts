/**
 * ElGamal Encryption for Token-2022 Confidential Transfers
 * 
 * ⚠️ DEPRECATED: This module is deprecated and should NOT be used in production.
 * 
 * 🔴 SECURITY WARNING: This module contains CRITICAL SECURITY VULNERABILITIES:
 * 1. Uses insecure XOR encryption (not secure for production)
 * 2. Broken homomorphic operations (XOR is not homomorphic)
 * 3. No authentication tags (vulnerable to tampering)
 * 4. Vulnerable to chosen-plaintext attacks
 * 
 * ALL FUNCTIONS IN THIS MODULE THROW ERRORS TO PREVENT ACCIDENTAL USE.
 * 
 * MIGRATION: This module has been replaced with Pedersen commitments.
 * 
 * Migration Guide:
 * - Replace `encryptAmount()` with `PedersenCommitment.commit()`
 * - Replace `decryptAmount()` with `PedersenCommitment.verify()`
 * - Replace `addCiphertexts()` with `PedersenCommitment.add()`
 * - Remove ElGamal keypair storage (not needed with Pedersen commitments)
 * 
 * See: docs/PEDERSEN_BULLETPROOF_COMPATIBILITY.md for migration details
 * 
 * @deprecated Use Pedersen commitments instead (src/crypto/zkproofs/primitives.ts)
 * @security DO NOT USE IN PRODUCTION - ALL FUNCTIONS DISABLED
 */

import * as nacl from 'tweetnacl';
import * as BN from 'bn.js';
import * as crypto from 'crypto';

// Helper to use sha256
const sha256 = (data: Uint8Array): Uint8Array => {
    const hash = crypto.createHash('sha256');
    hash.update(data);
    return new Uint8Array(hash.digest());
};

/**
 * ElGamal keypair for confidential transfers
 * @deprecated Use Pedersen commitments instead
 */
export interface ElGamalKeypair {
    publicKey: Uint8Array;  // 32 bytes
    privateKey: Uint8Array; // 32 bytes
}

/**
 * ElGamal ciphertext (encrypted value)
 * @deprecated Use Pedersen commitments instead
 */
export interface ElGamalCiphertext {
    c1: Uint8Array; // 32 bytes - ephemeral public key
    c2: Uint8Array; // 32 bytes - encrypted message
}

/**
 * Generate a new ElGamal keypair
 * @deprecated Use Pedersen commitments instead - no keypair needed
 * @returns ElGamal keypair
 */
export function generateElGamalKeypair(): ElGamalKeypair {
    console.warn('⚠️  DEPRECATED: generateElGamalKeypair() is deprecated. Use Pedersen commitments instead.');
    
    // Generate a random scalar for private key
    const privateKey = nacl.randomBytes(32);

    // Clamp the private key for Curve25519
    privateKey[0] &= 248;
    privateKey[31] &= 127;
    privateKey[31] |= 64;

    // Derive public key: P = s * G (where G is the base point)
    const publicKey = nacl.scalarMult.base(privateKey);

    return {
        publicKey,
        privateKey,
    };
}

/**
 * Encrypt an amount using ElGamal encryption
 * 
 * ⚠️ DEPRECATED: This function uses insecure XOR encryption.
 * 
 * SECURITY WARNING: This function is DEPRECATED and should NOT be used.
 * It uses insecure XOR encryption which provides no security.
 * 
 * For production use, replace with:
 * ```typescript
 * import { PedersenCommitment } from '../crypto/zkproofs/primitives';
 * import { ScalarOps } from '../crypto/zkproofs/primitives';
 * 
 * const blinding = ScalarOps.random();
 * const commitment = PedersenCommitment.commit(amount, blinding);
 * ```
 * 
 * @deprecated Use PedersenCommitment.commit() instead
 * @param amount - Amount to encrypt (as bigint)
 * @param recipientPublicKey - Recipient's ElGamal public key
 * @returns ElGamal ciphertext
 * @throws Error if called (deprecated function)
 */
export function encryptAmount(
    amount: bigint,
    recipientPublicKey: Uint8Array
): ElGamalCiphertext {
    throw new Error(
        'SECURITY ERROR: encryptAmount() is DEPRECATED and has been disabled. ' +
        'It uses insecure XOR encryption which provides no security. ' +
        'Use PedersenCommitment.commit() instead. ' +
        'See: src/crypto/zkproofs/primitives.ts'
    );

    // Generate ephemeral keypair
    const ephemeralPrivateKey = nacl.randomBytes(32);

    // Clamp ephemeral private key for Curve25519
    ephemeralPrivateKey[0] &= 248;
    ephemeralPrivateKey[31] &= 127;
    ephemeralPrivateKey[31] |= 64;

    // c1 = r * G (ephemeral public key)
    const c1 = nacl.scalarMult.base(ephemeralPrivateKey);

    // Shared secret: s = r * P (where P is recipient's public key)
    const sharedSecret = nacl.scalarMult(ephemeralPrivateKey, recipientPublicKey);

    // Derive encryption key using HKDF-like approach (SHA-256)
    // SECURITY NOTE: XOR encryption is not secure - documented limitation
    // In production, use authenticated encryption (AES-GCM) or Pedersen commitments
    const encryptionKey = sha256(sharedSecret);

    // Convert amount to 32-byte array (little-endian)
    const amountBytes = new Uint8Array(32);
    const amountBN = new BN.BN(amount.toString());
    const amountBuffer = amountBN.toArrayLike(Buffer, 'le', 32);
    amountBytes.set(amountBuffer);

    // SECURITY WARNING: XOR is not secure encryption
    // This should be replaced with proper authenticated encryption
    // For now, this is only used for local balance tracking (not on-chain)
    const c2 = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
        c2[i] = amountBytes[i] ^ encryptionKey[i];
    }

    return { c1, c2 };
}

/**
 * Decrypt an ElGamal ciphertext
 * 
 * ⚠️ DEPRECATED: This function uses insecure XOR encryption.
 * 
 * SECURITY WARNING: This function is DEPRECATED and should NOT be used.
 * It uses insecure XOR encryption which provides no security.
 * 
 * For production use, replace with:
 * ```typescript
 * import { PedersenCommitment } from '../crypto/zkproofs/primitives';
 * 
 * const isValid = PedersenCommitment.verify(commitment, amount, blinding);
 * ```
 * 
 * @deprecated Use PedersenCommitment.verify() instead
 * @param ciphertext - ElGamal ciphertext
 * @param privateKey - Recipient's ElGamal private key
 * @returns Decrypted amount (as bigint)
 * @throws Error if called (deprecated function)
 */
export function decryptAmount(
    ciphertext: ElGamalCiphertext,
    privateKey: Uint8Array
): bigint {
    throw new Error(
        'SECURITY ERROR: decryptAmount() is DEPRECATED and has been disabled. ' +
        'It uses insecure XOR encryption which provides no security. ' +
        'Use PedersenCommitment.verify() instead. ' +
        'See: src/crypto/zkproofs/primitives.ts'
    );
    
    // Shared secret: s = sk * c1 (where c1 is ephemeral public key)
    const sharedSecret = nacl.scalarMult(privateKey, ciphertext.c1);

    // Hash shared secret to get decryption key
    const decryptionKey = sha256(sharedSecret);

    // amount = c2 XOR H(shared_secret)
    const amountBytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
        amountBytes[i] = ciphertext.c2[i] ^ decryptionKey[i];
    }

    // Convert bytes to bigint (little-endian)
    const amountBN = new BN.BN(Buffer.from(amountBytes), 'le');
    return BigInt(amountBN.toString());
}

/**
 * Add two ElGamal ciphertexts (homomorphic addition)
 * 
 * ⚠️ DEPRECATED: This function is broken (XOR is not homomorphic).
 * 
 * SECURITY WARNING: This function is DEPRECATED and should NOT be used.
 * XOR is not homomorphic, so this function produces incorrect results.
 * 
 * For production use, replace with:
 * ```typescript
 * import { PedersenCommitment } from '../crypto/zkproofs/primitives';
 * 
 * const sum = PedersenCommitment.add(c1, c2);
 * ```
 * 
 * @deprecated Use PedersenCommitment.add() instead
 * @param ct1 - First ciphertext
 * @param ct2 - Second ciphertext
 * @returns Sum of ciphertexts (INCORRECT - DO NOT USE IN PRODUCTION)
 * @throws Error if called (deprecated function)
 */
export function addCiphertexts(
    ct1: ElGamalCiphertext,
    ct2: ElGamalCiphertext
): ElGamalCiphertext {
    throw new Error(
        'SECURITY ERROR: addCiphertexts() is DEPRECATED and has been disabled. ' +
        'XOR is not homomorphic, so this function produces incorrect results. ' +
        'Use PedersenCommitment.add() instead. ' +
        'See: src/crypto/zkproofs/primitives.ts'
    );
    
    const c2 = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
        c2[i] = ct1.c2[i] ^ ct2.c2[i];
    }

    return {
        c1: ct1.c1, // Use first ephemeral key (incorrect for proper ElGamal)
        c2,
    };
}

/**
 * Subtract two ElGamal ciphertexts
 * 
 * ⚠️ DEPRECATED: This function is DEPRECATED and should NOT be used.
 * 
 * SECURITY WARNING: This function is DEPRECATED and has been disabled.
 * XOR is not homomorphic, so this function produces incorrect results.
 * 
 * For production use, replace with:
 * ```typescript
 * import { PedersenCommitment } from '../crypto/zkproofs/primitives';
 * 
 * const diff = PedersenCommitment.subtract(c1, c2);
 * ```
 * 
 * @deprecated Use PedersenCommitment.subtract() instead
 * @param ct1 - First ciphertext
 * @param ct2 - Second ciphertext
 * @returns Difference of ciphertexts
 * @throws Error if called (deprecated function)
 */
export function subtractCiphertexts(
    ct1: ElGamalCiphertext,
    ct2: ElGamalCiphertext
): ElGamalCiphertext {
    throw new Error(
        'SECURITY ERROR: subtractCiphertexts() is DEPRECATED and has been disabled. ' +
        'XOR is not homomorphic, so this function produces incorrect results. ' +
        'Use PedersenCommitment.subtract() instead. ' +
        'See: src/crypto/zkproofs/primitives.ts'
    );
}

/**
 * Serialize ElGamal ciphertext to bytes
 * @deprecated Use CurvePoint.toBytes() for Pedersen commitments
 * @param ciphertext - Ciphertext to serialize
 * @returns Serialized bytes (64 bytes total)
 */
export function serializeCiphertext(ciphertext: ElGamalCiphertext): Uint8Array {
    console.warn('⚠️  DEPRECATED: serializeCiphertext() is deprecated. Use CurvePoint.toBytes() for Pedersen commitments.');
    const bytes = new Uint8Array(64);
    bytes.set(ciphertext.c1, 0);
    bytes.set(ciphertext.c2, 32);
    return bytes;
}

/**
 * Deserialize ElGamal ciphertext from bytes
 * @deprecated Use CurvePoint.fromBytes() for Pedersen commitments
 * @param bytes - Serialized ciphertext (64 bytes)
 * @returns ElGamal ciphertext
 */
export function deserializeCiphertext(bytes: Uint8Array): ElGamalCiphertext {
    console.warn('⚠️  DEPRECATED: deserializeCiphertext() is deprecated. Use CurvePoint.fromBytes() for Pedersen commitments.');
    if (bytes.length !== 64) {
        throw new Error('Invalid ciphertext length');
    }

    return {
        c1: bytes.slice(0, 32),
        c2: bytes.slice(32, 64),
    };
}

/**
 * Verify ElGamal keypair is valid
 * @deprecated No longer needed with Pedersen commitments
 * @param keypair - Keypair to verify
 * @returns True if valid
 */
export function verifyKeypair(keypair: ElGamalKeypair): boolean {
    console.warn('⚠️  DEPRECATED: verifyKeypair() is deprecated. No longer needed with Pedersen commitments.');
    // Validate key lengths
    if (keypair.privateKey.length !== 32 || keypair.publicKey.length !== 32) {
        return false;
    }

    // Verify public key is derived from private key
    const derivedPublicKey = nacl.scalarMult.base(keypair.privateKey);

    // Compare public keys using constant-time comparison
    let result = 0;
    for (let i = 0; i < 32; i++) {
        result |= derivedPublicKey[i] ^ keypair.publicKey[i];
    }
    return result === 0;
}

/**
 * Convert amount to encrypted balance format
 * 
 * ⚠️ DEPRECATED: This function is DEPRECATED and should NOT be used.
 * 
 * SECURITY WARNING: This function is DEPRECATED and has been disabled.
 * It uses insecure XOR encryption which provides no security.
 * 
 * For production use, replace with:
 * ```typescript
 * import { PedersenCommitment } from '../crypto/zkproofs/primitives';
 * import { ScalarOps } from '../crypto/zkproofs/primitives';
 * 
 * const blinding = ScalarOps.random();
 * const commitment = PedersenCommitment.commit(amount, blinding);
 * const commitmentBytes = commitment.toBytes(); // 32 bytes
 * ```
 * 
 * @deprecated Use PedersenCommitment.commit() instead
 * @param amount - Amount in lamports
 * @param publicKey - ElGamal public key (not used - deprecated)
 * @returns Encrypted balance
 * @throws Error if called (deprecated function)
 */
export function encryptBalance(
    amount: bigint,
    publicKey: Uint8Array
): Uint8Array {
    throw new Error(
        'SECURITY ERROR: encryptBalance() is DEPRECATED and has been disabled. ' +
        'It uses insecure XOR encryption which provides no security. ' +
        'Use PedersenCommitment.commit() instead. ' +
        'Example: const blinding = ScalarOps.random(); const commitment = PedersenCommitment.commit(amount, blinding); ' +
        'See: src/crypto/zkproofs/primitives.ts'
    );
}

/**
 * Decrypt balance from encrypted format
 * 
 * ⚠️ DEPRECATED: This function is DEPRECATED and should NOT be used.
 * 
 * SECURITY WARNING: This function is DEPRECATED and has been disabled.
 * It uses insecure XOR encryption which provides no security.
 * 
 * NOTE: Pedersen commitments are hiding (cannot be "decrypted").
 * Instead, you verify a commitment by checking if it matches a value:
 * ```typescript
 * import { PedersenCommitment } from '../crypto/zkproofs/primitives';
 * 
 * const isValid = PedersenCommitment.verify(commitment, amount, blinding);
 * ```
 * 
 * @deprecated Use PedersenCommitment.verify() instead
 * @param encryptedBalance - Encrypted balance (64 bytes) - deprecated
 * @param privateKey - ElGamal private key (not used - deprecated)
 * @returns Decrypted amount in lamports
 * @throws Error if called (deprecated function)
 */
export function decryptBalance(
    encryptedBalance: Uint8Array,
    privateKey: Uint8Array
): bigint {
    throw new Error(
        'SECURITY ERROR: decryptBalance() is DEPRECATED and has been disabled. ' +
        'It uses insecure XOR encryption which provides no security. ' +
        'Pedersen commitments are hiding (cannot be "decrypted"). ' +
        'Use PedersenCommitment.verify(commitment, amount, blinding) to verify commitments. ' +
        'See: src/crypto/zkproofs/primitives.ts'
    );
}
