/**
 * Cryptographic Primitives for ZK Proofs
 * 
 * This module provides the foundational cryptographic operations
 * needed for zero-knowledge proofs, including:
 * - Elliptic curve operations (Curve25519)
 * - Scalar arithmetic
 * - Point operations
 * - Hash functions
 */

import { ristretto255 } from '@noble/curves/ed25519.js';
import { sha256 as sha256Hash, sha512 as sha512Hash } from '@noble/hashes/sha2.js';
import { randomBytes as nodeRandomBytes } from 'crypto';

// Use Ristretto255 (prime-order group) instead of Ed25519 (cofactor 8)
// Ristretto255 provides a prime-order group on Curve25519, eliminating the cofactor
const RistrettoPoint = ristretto255.Point;

// Type aliases for clarity
export type Scalar = bigint;
// Don't export Point type directly to avoid private member issues
// Use any to avoid TypeScript strict checking of private properties
type Point = any;

/**
 * Ristretto255 parameters (uses Ed25519 curve order)
 * Ed25519 curve order (prime order of the curve)
 * Note: This is a public constant, not a secret - the curve order is public knowledge
 */
export const CURVE_ORDER = BigInt('0x1000000000000000000000000000000014def9dea2f79cd65812631a5cf5d3ed');
// Don't export BASE_POINT directly - use CurvePoint.base() instead
const BASE_POINT = RistrettoPoint.BASE;

/**
 * Generate cryptographically secure random bytes
 * Works in both Node.js and browser environments
 * 
 * Uses:
 * - crypto.randomBytes() in Node.js (cryptographically secure)
 * - crypto.getRandomValues() in browsers (Web Crypto API)
 * 
 * @param length - Number of bytes to generate
 * @returns Secure random bytes
 */
export function secureRandomBytes(length: number): Uint8Array {
    // Node.js environment - use crypto.randomBytes()
    try {
        // Check if we're in Node.js by trying to use the imported function
        // This will work in Node.js where 'crypto' module is available
        return nodeRandomBytes(length);
    } catch (error) {
        // If crypto.randomBytes() is not available, try browser crypto API
    }
    
    // Browser environment - use crypto.getRandomValues (Web Crypto API)
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const bytes = new Uint8Array(length);
        crypto.getRandomValues(bytes);
        return bytes;
    }
    
    // Fallback (should not happen in modern environments)
    throw new Error('No secure random number generator available. ' +
        'Ensure you are running in Node.js (crypto module) or a browser (Web Crypto API).');
}

/**
 * Generate a random scalar in the curve's field
 * Uses cryptographically secure random number generation
 * @returns Random scalar
 */
export function randomScalar(): Scalar {
    const bytes = secureRandomBytes(32);
    return mod(bytesToScalar(bytes), CURVE_ORDER);
}

/**
 * Convert bytes to scalar (little-endian, matching scalarToBytes)
 * @param bytes - Input bytes
 * @returns Scalar value
 */
export function bytesToScalar(bytes: Uint8Array): Scalar {
    let result = BigInt(0);
    // Read in little-endian order (least significant byte first)
    for (let i = 0; i < bytes.length; i++) {
        result = result | (BigInt(bytes[i]) << BigInt(i * 8));
    }
    return result;
}

/**
 * Convert scalar to bytes (32 bytes, little-endian)
 * @param scalar - Scalar value
 * @returns Byte array
 */
export function scalarToBytes(scalar: Scalar): Uint8Array {
    const bytes = new Uint8Array(32);
    let value = mod(scalar, CURVE_ORDER);

    for (let i = 0; i < 32; i++) {
        bytes[i] = Number(value & BigInt(0xff));
        value = value >> BigInt(8);
    }

    return bytes;
}

/**
 * Modular arithmetic helper
 * @param a - Value
 * @param m - Modulus
 * @returns a mod m
 */
export function mod(a: bigint, m: bigint): bigint {
    const result = a % m;
    return result >= 0n ? result : result + m;
}

/**
 * Modular addition
 * @param a - First scalar
 * @param b - Second scalar
 * @returns (a + b) mod order
 */
export function scalarAdd(a: Scalar, b: Scalar): Scalar {
    return mod(a + b, CURVE_ORDER);
}

/**
 * Modular subtraction
 * @param a - First scalar
 * @param b - Second scalar
 * @returns (a - b) mod order
 */
export function scalarSub(a: Scalar, b: Scalar): Scalar {
    return mod(a - b, CURVE_ORDER);
}

/**
 * Modular multiplication
 * @param a - First scalar
 * @param b - Second scalar
 * @returns (a * b) mod order
 */
export function scalarMul(a: Scalar, b: Scalar): Scalar {
    return mod(a * b, CURVE_ORDER);
}

/**
 * Modular inverse using extended Euclidean algorithm
 * @param a - Scalar to invert
 * @returns a^(-1) mod order
 */
export function scalarInverse(a: Scalar): Scalar {
    let [old_r, r] = [mod(a, CURVE_ORDER), CURVE_ORDER];
    let [old_s, s] = [1n, 0n];

    while (r !== 0n) {
        const quotient = old_r / r;
        [old_r, r] = [r, old_r - quotient * r];
        [old_s, s] = [s, old_s - quotient * s];
    }

    return mod(old_s, CURVE_ORDER);
}

/**
 * Point wrapper for easier operations
 */
export class CurvePoint {
    constructor(public point: any) { }

    /**
     * Add two points
     */
    add(other: CurvePoint): CurvePoint {
        return new CurvePoint(this.point.add(other.point));
    }

    /**
     * Subtract points
     */
    subtract(other: CurvePoint): CurvePoint {
        return new CurvePoint(this.point.subtract(other.point));
    }

    /**
     * Multiply point by scalar
     */
    multiply(scalar: Scalar): CurvePoint {
        return new CurvePoint(this.point.multiply(scalar));
    }

    /**
     * Negate point
     */
    negate(): CurvePoint {
        return new CurvePoint(this.point.negate());
    }

    /**
     * Check if point equals another (constant-time comparison)
     */
    equals(other: CurvePoint): boolean {
        // Use constant-time comparison for security
        const thisBytes = this.toBytes();
        const otherBytes = other.toBytes();
        return constantTimeEqual(thisBytes, otherBytes);
    }

    /**
     * Convert to bytes
     */
    toBytes(): Uint8Array {
        return this.point.toBytes();
    }

    /**
     * Convert to hex string
     */
    toHex(): string {
        return Buffer.from(this.toBytes()).toString('hex');
    }

    /**
     * Create from bytes
     */
    static fromBytes(bytes: Uint8Array): CurvePoint {
        return new CurvePoint(RistrettoPoint.fromBytes(bytes));
    }

    /**
     * Create from uniform bytes (Dalek compatibility)
     * Maps 64 bytes to a Ristretto point
     */
    static fromUniformBytes(bytes: Uint8Array): CurvePoint {
        if (bytes.length !== 64) {
            throw new Error('fromUniformBytes requires exactly 64 bytes');
        }
        // Ristretto255 has a from_uniform_bytes method
        // For now, we'll use a hash-to-curve approach
        // Take first 32 bytes as scalar and multiply base point
        let scalar = 0n;
        for (let i = 0; i < 32; i++) {
            scalar |= BigInt(bytes[i]) << (BigInt(i) * 8n);
        }
        scalar = mod(scalar, CURVE_ORDER);
        return CurvePoint.base().multiply(scalar);
    }

    /**
     * Get base point (generator)
     */
    static base(): CurvePoint {
        return new CurvePoint(BASE_POINT);
    }

    /**
     * Get generator (alias for base)
     */
    static generator(): CurvePoint {
        return CurvePoint.base();
    }

    /**
     * Get identity point (zero)
     */
    static identity(): CurvePoint {
        return new CurvePoint(RistrettoPoint.ZERO);
    }
}

/**
 * Hash to scalar using SHA-256
 * @param data - Data to hash
 * @returns Scalar from hash
 */
export function hashToScalar(...data: Uint8Array[]): Scalar {
    const combined = new Uint8Array(data.reduce((acc, d) => acc + d.length, 0));
    let offset = 0;
    for (const d of data) {
        combined.set(d, offset);
        offset += d.length;
    }

    const hash = sha256Hash(combined);
    return mod(bytesToScalar(hash), CURVE_ORDER);
}

/**
 * Generate Fiat-Shamir challenge
 * @param transcript - Transcript data
 * @returns Challenge scalar
 */
export function generateChallenge(...transcript: Uint8Array[]): Scalar {
    return hashToScalar(...transcript);
}

/**
 * Multi-scalar multiplication (MSM)
 * Computes sum of scalars[i] * points[i]
 * 
 * @param scalars - Array of scalars
 * @param points - Array of points
 * @returns Resulting point
 */
export function multiScalarMul(scalars: Scalar[], points: CurvePoint[]): CurvePoint {
    if (scalars.length !== points.length) {
        throw new Error('Scalars and points must have same length');
    }

    let result = CurvePoint.identity();

    for (let i = 0; i < scalars.length; i++) {
        const term = points[i].multiply(scalars[i]);
        result = result.add(term);
    }

    return result;
}

/**
 * Inner product of two scalar vectors
 * @param a - First vector
 * @param b - Second vector
 * @returns Inner product
 */
export function innerProduct(a: Scalar[], b: Scalar[]): Scalar {
    if (a.length !== b.length) {
        throw new Error('Vectors must have same length');
    }

    let result = 0n;
    for (let i = 0; i < a.length; i++) {
        result = scalarAdd(result, scalarMul(a[i], b[i]));
    }

    return result;
}

/**
 * Hadamard product (element-wise multiplication) of two vectors
 * @param a - First vector
 * @param b - Second vector
 * @returns Hadamard product
 */
export function hadamardProduct(a: Scalar[], b: Scalar[]): Scalar[] {
    if (a.length !== b.length) {
        throw new Error('Vectors must have same length');
    }

    return a.map((ai, i) => scalarMul(ai, b[i]));
}

/**
 * Vector addition
 * @param a - First vector
 * @param b - Second vector
 * @returns Sum vector
 */
export function vectorAdd(a: Scalar[], b: Scalar[]): Scalar[] {
    if (a.length !== b.length) {
        throw new Error('Vectors must have same length');
    }

    return a.map((ai, i) => scalarAdd(ai, b[i]));
}

/**
 * Vector subtraction
 * @param a - First vector
 * @param b - Second vector
 * @returns Difference vector
 */
export function vectorSub(a: Scalar[], b: Scalar[]): Scalar[] {
    if (a.length !== b.length) {
        throw new Error('Vectors must have same length');
    }

    return a.map((ai, i) => scalarSub(ai, b[i]));
}

/**
 * Scalar-vector multiplication
 * @param scalar - Scalar value
 * @param vector - Vector
 * @returns Scaled vector
 */
export function scalarVectorMul(scalar: Scalar, vector: Scalar[]): Scalar[] {
    return vector.map(v => scalarMul(scalar, v));
}

/**
 * Generate powers of a scalar: [1, x, x^2, x^3, ...]
 * @param x - Base scalar
 * @param n - Number of powers
 * @returns Array of powers
 */
export function powerVector(x: Scalar, n: number): Scalar[] {
    const result: Scalar[] = new Array(n);
    result[0] = 1n;

    for (let i = 1; i < n; i++) {
        result[i] = scalarMul(result[i - 1], x);
    }

    return result;
}

/**
 * Pedersen commitment operations
 */
export class PedersenCommitment {
    private static _G: CurvePoint | null = null;
    private static _H: CurvePoint | null = null;

    private static get G(): CurvePoint {
        if (!this._G) {
            this._G = CurvePoint.generator();
        }
        return this._G;
    }

    private static get H(): CurvePoint {
        if (!this._H) {
            // Generate H by hashing to a scalar and multiplying the base point
            // This ensures we get a valid Ristretto255 point
            const hash = sha256Hash(new TextEncoder().encode('pedersen_h_generator'));
            const scalar = mod(bytesToScalar(hash), CURVE_ORDER);
            this._H = CurvePoint.base().multiply(scalar);
        }
        return this._H;
    }

    /**
     * Create commitment: C = vG + rH
     * @param value - Value to commit to (as bigint scalar)
     * @param blinding - Random blinding factor (as bigint scalar)
     */
    static commit(value: Scalar, blinding: Scalar): CurvePoint {
        // Handle zero values (noble-curves doesn't allow multiply by 0)
        const valuePoint = value === 0n ? CurvePoint.identity() : this.G.multiply(value);
        const blindingPoint = blinding === 0n ? CurvePoint.identity() : this.H.multiply(blinding);
        return valuePoint.add(blindingPoint);
    }

    /**
     * Verify commitment opening
     */
    static verify(
        commitment: CurvePoint,
        value: Scalar,
        blinding: Scalar
    ): boolean {
        const expected = this.commit(value, blinding);
        return commitment.equals(expected);
    }

    /**
     * Add commitments (homomorphic property)
     */
    static add(c1: CurvePoint, c2: CurvePoint): CurvePoint {
        return c1.add(c2);
    }

    /**
     * Subtract commitments
     */
    static subtract(c1: CurvePoint, c2: CurvePoint): CurvePoint {
        return c1.subtract(c2);
    }

    /**
     * Get generator points
     */
    static getGenerators(): { G: CurvePoint; H: CurvePoint } {
        return { G: this.G, H: this.H };
    }
}

/**
 * Transcript for Fiat-Shamir transform
 */
export class Transcript {
    private data: Uint8Array[] = [];

    /**
     * Add label to transcript
     */
    appendMessage(label: string, message: Uint8Array): void {
        const labelBytes = new TextEncoder().encode(label);
        this.data.push(new Uint8Array([labelBytes.length]));
        this.data.push(labelBytes);
        this.data.push(new Uint8Array([message.length]));
        this.data.push(message);
    }

    /**
     * Add point to transcript
     */
    appendPoint(label: string, point: CurvePoint): void {
        this.appendMessage(label, point.toBytes());
    }

    /**
     * Add scalar to transcript
     */
    appendScalar(label: string, scalar: Scalar): void {
        this.appendMessage(label, scalarToBytes(scalar));
    }

    /**
     * Generate challenge scalar
     */
    challengeScalar(label: string): Scalar {
        this.appendMessage(label, new Uint8Array(0));
        // Concatenate all data
        const totalLength = this.data.reduce((sum, arr) => sum + arr.length, 0);
        const combined = new Uint8Array(totalLength);
        let offset = 0;
        for (const arr of this.data) {
            combined.set(arr, offset);
            offset += arr.length;
        }
        // Concatenate all data
        const hash = sha256Hash(combined);
        return mod(bytesToScalar(hash), CURVE_ORDER);
    }

    /**
     * Generate multiple challenge scalars
     */
    challengeScalars(label: string, count: number): Scalar[] {
        const scalars: Scalar[] = [];
        for (let i = 0; i < count; i++) {
            const challenge = this.challengeScalar(`${label}_${i}`);
            scalars.push(challenge);
        }
        return scalars;
    }

    /**
     * Range proof domain separator (Dalek compatibility)
     */
    rangeproofDomainSep(n: number, m: number): void {
        this.appendMessage('dom-sep', new TextEncoder().encode(`rangeproof n=${n} m=${m}`));
    }

    /**
     * Inner product domain separator (Dalek compatibility)
     */
    innerproductDomainSep(n: number): void {
        this.appendMessage('dom-sep', new TextEncoder().encode(`ipp n=${n}`));
    }
}

/**
 * Hash functions
 */
export class Hash {
    /**
     * SHA-256 hash
     */
    static sha256(data: Uint8Array): Uint8Array {
        return sha256Hash(data);
    }

    /**
     * SHA-512 hash
     */
    static sha512(data: Uint8Array): Uint8Array {
        return sha512Hash(data);
    }

    /**
     * Hash to scalar
     */
    static toScalar(data: Uint8Array): Scalar {
        const hash = this.sha256(data);
        return mod(bytesToScalar(hash), CURVE_ORDER);
    }

    /**
     * Hash multiple inputs
     */
    static multiHash(...inputs: Uint8Array[]): Uint8Array {
        const totalLength = inputs.reduce((sum, arr) => sum + arr.length, 0);
        const combined = new Uint8Array(totalLength);
        let offset = 0;
        for (const input of inputs) {
            combined.set(input, offset);
            offset += input.length;
        }
        return this.sha256(combined);
    }
}

/**
 * Constant-time equality check for security
 * @param a - First array
 * @param b - Second array
 * @returns True if arrays are equal (constant-time)
 */
export function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a[i] ^ b[i];
    }
    return result === 0;
}

/**
 * Utility functions
 */
export class ZKUtils {
    /**
     * Generate cryptographically secure random bytes
     * Uses crypto.randomBytes() in Node.js or crypto.getRandomValues() in browsers
     * @param length - Number of bytes to generate
     * @returns Secure random bytes
     */
    static randomBytes(length: number): Uint8Array {
        return secureRandomBytes(length);
    }

    /**
     * Convert bigint to bytes (little-endian)
     */
    static bigintToBytes(value: bigint, length: number = 32): Uint8Array {
        const bytes = new Uint8Array(length);
        for (let i = 0; i < length; i++) {
            bytes[i] = Number(value & 0xFFn);
            value >>= 8n;
        }
        return bytes;
    }

    /**
     * Convert bytes to bigint (little-endian)
     */
    static bytesToBigint(bytes: Uint8Array): bigint {
        let result = 0n;
        for (let i = bytes.length - 1; i >= 0; i--) {
            result = (result << 8n) + BigInt(bytes[i]);
        }
        return result;
    }

    /**
     * Constant-time equality check
     */
    static constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
        return constantTimeEqual(a, b);
    }

    /**
     * Timing-safe array comparison
     */
    static timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
        return constantTimeEqual(a, b);
    }
}

/**
 * Scalar class for easier operations
 */
export class ScalarOps {
    /**
     * Create scalar from number
     */
    static fromNumber(n: number | bigint): Scalar {
        return mod(BigInt(n), CURVE_ORDER);
    }

    /**
     * Create random scalar
     */
    static random(): Scalar {
        return randomScalar();
    }

    /**
     * Create scalar from bytes
     */
    static fromBytes(bytes: Uint8Array): Scalar {
        return mod(bytesToScalar(bytes), CURVE_ORDER);
    }

    /**
     * Convert scalar to bytes
     */
    static toBytes(scalar: Scalar): Uint8Array {
        return scalarToBytes(scalar);
    }

    /**
     * Convert scalar to hex
     */
    static toHex(scalar: Scalar): string {
        return Buffer.from(scalarToBytes(scalar)).toString('hex');
    }

    /**
     * Add scalars
     */
    static add(a: Scalar, b: Scalar): Scalar {
        return scalarAdd(a, b);
    }

    /**
     * Multiply scalars
     */
    static multiply(a: Scalar, b: Scalar): Scalar {
        return scalarMul(a, b);
    }

    /**
     * Subtract scalars
     */
    static subtract(a: Scalar, b: Scalar): Scalar {
        return scalarSub(a, b);
    }

    /**
     * Negate scalar
     */
    static negate(a: Scalar): Scalar {
        return mod(CURVE_ORDER - a, CURVE_ORDER);
    }

    /**
     * Invert scalar
     */
    static invert(a: Scalar): Scalar {
        return scalarInverse(a);
    }
}

/**
 * Export all primitives
 */
export {
    ristretto255,
    sha256Hash,
    sha512Hash,
};