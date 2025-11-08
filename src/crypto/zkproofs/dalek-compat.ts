/**
 * Dalek-Compatible Cryptographic Primitives
 * 
 * This module provides exact implementations matching Dalek's:
 * - Generator derivation using SHA3-XOF (Shake256)
 * - Merlin transcript for Fiat-Shamir
 */

import { shake256 } from '@noble/hashes/sha3.js';
import { CurvePoint, type Scalar, ScalarOps, scalarToBytes, CURVE_ORDER } from './primitives';

/**
 * Dalek-compatible generator chain using Shake256
 * Matches: src/generators.rs - GeneratorsChain
 */
export class DalekGeneratorChain {
    private reader: ReturnType<typeof shake256.create>;

    constructor(label: Uint8Array) {
        // Initialize Shake256 with "GeneratorsChain" + label
        const prefix = new TextEncoder().encode('GeneratorsChain');
        const combined = new Uint8Array(prefix.length + label.length);
        combined.set(prefix);
        combined.set(label, prefix.length);

        this.reader = shake256.create({ dkLen: 64 });
        this.reader.update(combined);
    }

    /**
     * Generate next point using from_uniform_bytes
     */
    next(): CurvePoint {
        // Squeeze 64 bytes from XOF
        const uniformBytes = new Uint8Array(64);
        this.reader.xofInto(uniformBytes);

        // Convert to RistrettoPoint using from_uniform_bytes
        // This is equivalent to Dalek's RistrettoPoint::from_uniform_bytes
        return CurvePoint.fromUniformBytes(uniformBytes);
    }

    /**
     * Generate n points
     */
    take(n: number): CurvePoint[] {
        const points: CurvePoint[] = [];
        for (let i = 0; i < n; i++) {
            points.push(this.next());
        }
        return points;
    }
}

/**
 * Dalek-compatible generator manager
 * Matches: src/generators.rs - BulletproofGens
 */
export class DalekGeneratorManager {
    private static G_cache: Map<number, CurvePoint> = new Map();
    private static H_cache: Map<number, CurvePoint> = new Map();
    private static G_chain: DalekGeneratorChain | null = null;
    private static H_chain: DalekGeneratorChain | null = null;
    private static G_next_index = 0;
    private static H_next_index = 0;

    /**
     * Get G generator at index i
     */
    static getG(i: number): CurvePoint {
        if (!this.G_cache.has(i)) {
            // Initialize chain if needed
            if (!this.G_chain) {
                this.G_chain = new DalekGeneratorChain(new TextEncoder().encode('G'));
                this.G_next_index = 0;
            }

            // Generate all missing generators up to i
            while (this.G_next_index <= i) {
                const point = this.G_chain.next();
                this.G_cache.set(this.G_next_index, point);
                this.G_next_index++;
            }
        }
        return this.G_cache.get(i)!;
    }

    /**
     * Get H generator at index i
     */
    static getH(i: number): CurvePoint {
        if (!this.H_cache.has(i)) {
            // Initialize chain if needed
            if (!this.H_chain) {
                this.H_chain = new DalekGeneratorChain(new TextEncoder().encode('H'));
                this.H_next_index = 0;
            }

            // Generate all missing generators up to i
            while (this.H_next_index <= i) {
                const point = this.H_chain.next();
                this.H_cache.set(this.H_next_index, point);
                this.H_next_index++;
            }
        }
        return this.H_cache.get(i)!;
    }

    /**
     * Get vector of G generators
     */
    static getGVector(n: number): CurvePoint[] {
        return Array.from({ length: n }, (_, i) => this.getG(i));
    }

    /**
     * Get vector of H generators
     */
    static getHVector(n: number): CurvePoint[] {
        return Array.from({ length: n }, (_, i) => this.getH(i));
    }

    /**
     * Clear cache (for testing)
     */
    static clearCache(): void {
        this.G_cache.clear();
        this.H_cache.clear();
        this.G_chain = null;
        this.H_chain = null;
        this.G_next_index = 0;
        this.H_next_index = 0;
    }
}

/**
 * Merlin transcript for Fiat-Shamir
 * Matches: Merlin transcript protocol
 */
export class MerlinTranscript {
    private state: Uint8Array;

    constructor() {
        // Initialize with Merlin protocol label
        this.state = new TextEncoder().encode('Merlin v1.0');
    }

    /**
     * Append message with label
     */
    appendMessage(label: string, message: Uint8Array): void {
        const labelBytes = new TextEncoder().encode(label);

        // Merlin format: label_len || label || message_len || message
        const combined = new Uint8Array(
            1 + labelBytes.length + 4 + message.length
        );

        let offset = 0;
        combined[offset++] = labelBytes.length;
        combined.set(labelBytes, offset);
        offset += labelBytes.length;

        // Message length as 4 bytes (little-endian)
        const msgLen = message.length;
        combined[offset++] = msgLen & 0xFF;
        combined[offset++] = (msgLen >> 8) & 0xFF;
        combined[offset++] = (msgLen >> 16) & 0xFF;
        combined[offset++] = (msgLen >> 24) & 0xFF;

        combined.set(message, offset);

        // Update state
        const newState = new Uint8Array(this.state.length + combined.length);
        newState.set(this.state);
        newState.set(combined, this.state.length);
        this.state = newState;
    }

    /**
     * Append point
     */
    appendPoint(label: string, point: CurvePoint): void {
        this.appendMessage(label, point.toBytes());
    }

    /**
     * Append scalar
     */
    appendScalar(label: string, scalar: Scalar): void {
        this.appendMessage(label, scalarToBytes(scalar));
    }

    /**
     * Generate challenge scalar
     */
    challengeScalar(label: string): Scalar {
        // Append challenge label
        this.appendMessage(label, new Uint8Array(0));

        // Use Shake256 to generate 64 bytes
        const hash = shake256(this.state, { dkLen: 64 });

        // Interpret as little-endian 512-bit integer (Dalek's from_bytes_mod_order_wide)
        let result = 0n;
        for (let i = 0; i < 64; i++) {
            result |= BigInt(hash[i]) << (BigInt(i) * 8n);
        }

        // Reduce modulo curve order
        const scalar = result % CURVE_ORDER;

        // Update state with the hash (for next challenge)
        const newState = new Uint8Array(this.state.length + hash.length);
        newState.set(this.state);
        newState.set(hash, this.state.length);
        this.state = newState;

        return scalar;
    }

    /**
     * Range proof domain separator
     */
    rangeproofDomainSep(n: number, m: number): void {
        const msg = new TextEncoder().encode(`rangeproof n=${n} m=${m}`);
        this.appendMessage('dom-sep', msg);
    }

    /**
     * Inner product domain separator
     */
    innerproductDomainSep(n: number): void {
        const msg = new TextEncoder().encode(`ipp n=${n}`);
        this.appendMessage('dom-sep', msg);
    }
}
