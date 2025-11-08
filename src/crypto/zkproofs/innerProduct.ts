/**
 * Inner Product Argument for Bulletproofs
 * 
 * This implements the recursive inner product argument protocol
 * which is the core of Bulletproof range proofs.
 * 
 * Based on: https://eprint.iacr.org/2017/1066.pdf Section 3.1
 */

import {
    CurvePoint,
    ScalarOps,
    type Scalar,
    innerProduct,
    vectorAdd,
    scalarVectorMul,
} from './primitives';
import { MerlinTranscript } from './dalek-compat';

// Type alias for compatibility
type Transcript = MerlinTranscript;

/**
 * Inner product proof structure
 */
export interface InnerProductProof {
    /** Left commitment vectors */
    L: CurvePoint[];
    /** Right commitment vectors */
    R: CurvePoint[];
    /** Final scalar a */
    a: Scalar;
    /** Final scalar b */
    b: Scalar;
}

/**
 * Generator point manager
 */
export class GeneratorManager {
    private static cache: Map<string, CurvePoint> = new Map();

    /**
     * Hash to curve point (deterministic)
     * Uses scalar multiplication of base point for simplicity
     */
    private static hashToPoint(label: string, index: number): CurvePoint {
        const seed = new TextEncoder().encode(`${label}_${index}`);
        const hash = new Uint8Array(32);

        // Create deterministic hash
        for (let i = 0; i < Math.min(seed.length, 32); i++) {
            hash[i] = seed[i];
        }
        hash[31] = (index >> 8) & 0xFF;
        hash[30] = index & 0xFF;

        // Convert hash to scalar and multiply base point
        const scalar = ScalarOps.fromBytes(hash);
        return CurvePoint.base().multiply(scalar);
    }

    /**
     * Get generator point G_i
     */
    static getG(index: number): CurvePoint {
        const key = `G_${index}`;
        if (!this.cache.has(key)) {
            const point = this.hashToPoint('bulletproof_G', index);
            this.cache.set(key, point);
        }
        return this.cache.get(key)!;
    }

    /**
     * Get generator point H_i
     */
    static getH(index: number): CurvePoint {
        const key = `H_${index}`;
        if (!this.cache.has(key)) {
            const point = this.hashToPoint('bulletproof_H', index);
            this.cache.set(key, point);
        }
        return this.cache.get(key)!;
    }

    /**
     * Get multiple G generators
     */
    static getGVector(n: number): CurvePoint[] {
        return Array.from({ length: n }, (_, i) => this.getG(i));
    }

    /**
     * Get multiple H generators
     */
    static getHVector(n: number): CurvePoint[] {
        return Array.from({ length: n }, (_, i) => this.getH(i));
    }

    /**
     * Clear cache (for testing)
     */
    static clearCache(): void {
        this.cache.clear();
    }
}

/**
 * Inner Product Argument Protocol
 */
export class InnerProductArgument {
    /**
     * Generate inner product proof with optional G_factors and H_factors
     * 
     * Proves that <a, b> = c for committed vectors a and b
     * 
     * @param a - Left vector
     * @param b - Right vector
     * @param G_factors - Optional scalars to adjust G generators (default: all 1s)
     * @param H_factors - Optional scalars to adjust H generators (default: all 1s)
     * @param u - Additional generator point
     * @param transcript - Fiat-Shamir transcript
     */
    static async prove(
        a: Scalar[],
        b: Scalar[],
        G_factors: Scalar[] | null,
        H_factors: Scalar[] | null,
        Q: CurvePoint,
        transcript: Transcript
    ): Promise<InnerProductProof> {
        const n = a.length;

        if (n !== b.length) {
            throw new Error('Vectors must have same length');
        }

        // Default factors to all 1s if not provided
        const gFactors = G_factors || Array(n).fill(1n);
        const hFactors = H_factors || Array(n).fill(1n);

        if (gFactors.length !== n || hFactors.length !== n) {
            throw new Error('Factor lengths must match vector length');
        }

        if (n === 0 || (n & (n - 1)) !== 0) {
            throw new Error('Vector length must be power of 2');
        }

        // Add domain separator (Dalek compatibility)
        transcript.innerproductDomainSep(n);

        const L: CurvePoint[] = [];
        const R: CurvePoint[] = [];

        let aVec = [...a];
        let bVec = [...b];

        // Get base generators (factors will be applied to scalars, not generators)
        // Use Dalek-compatible generators
        const { DalekGeneratorManager } = await import('./dalek-compat');
        const G_base = DalekGeneratorManager.getGVector(n);
        const H_base = DalekGeneratorManager.getHVector(n);

        // Keep generators as-is (Dalek applies factors to scalars in MSM)
        let gVec = [...G_base];
        let hVec = [...H_base];

        // Factors stay constant (Dalek doesn't fold them)
        // They're only used in the generator folding step

        let currentN = n;

        // Recursive halving
        while (currentN > 1) {
            const nPrime = currentN / 2;

            // Split vectors in half
            const aL = aVec.slice(0, nPrime);
            const aR = aVec.slice(nPrime);
            const bL = bVec.slice(0, nPrime);
            const bR = bVec.slice(nPrime);
            const gL = gVec.slice(0, nPrime);
            const gR = gVec.slice(nPrime);
            const hL = hVec.slice(0, nPrime);
            const hR = hVec.slice(nPrime);

            // For first round (currentN === n), use original factors
            // For subsequent rounds, factors are already baked into generators, so use 1s
            const isFirstRound = (currentN === n);
            const gFactorsL = isFirstRound ? gFactors.slice(0, nPrime) : Array(nPrime).fill(1n);
            const gFactorsR = isFirstRound ? gFactors.slice(nPrime) : Array(nPrime).fill(1n);
            const hFactorsL = isFirstRound ? hFactors.slice(0, nPrime) : Array(nPrime).fill(1n);
            const hFactorsR = isFirstRound ? hFactors.slice(nPrime) : Array(nPrime).fill(1n);

            // Compute cross terms
            const cL = innerProduct(aL, bR);
            const cR = innerProduct(aR, bL);

            // Compute L = <aL * gFactorsR, G_R> + <bR * hFactorsL, H_L> + cL * Q
            // (Dalek applies factors to scalars in MSM)
            let LPoint = CurvePoint.identity();
            for (let i = 0; i < nPrime; i++) {
                const aL_scaled = ScalarOps.multiply(aL[i], gFactorsR[i]);
                if (aL_scaled !== 0n) {
                    LPoint = LPoint.add(gR[i].multiply(aL_scaled));
                }
                const bR_scaled = ScalarOps.multiply(bR[i], hFactorsL[i]);
                if (bR_scaled !== 0n) {
                    LPoint = LPoint.add(hL[i].multiply(bR_scaled));
                }
            }
            if (cL !== 0n) {
                LPoint = LPoint.add(Q.multiply(cL));
            }

            // Compute R = <aR * gFactorsL, G_L> + <bL * hFactorsR, H_R> + cR * Q
            let RPoint = CurvePoint.identity();
            for (let i = 0; i < nPrime; i++) {
                const aR_scaled = ScalarOps.multiply(aR[i], gFactorsL[i]);
                if (aR_scaled !== 0n) {
                    RPoint = RPoint.add(gL[i].multiply(aR_scaled));
                }
                const bL_scaled = ScalarOps.multiply(bL[i], hFactorsR[i]);
                if (bL_scaled !== 0n) {
                    RPoint = RPoint.add(hR[i].multiply(bL_scaled));
                }
            }
            if (cR !== 0n) {
                RPoint = RPoint.add(Q.multiply(cR));
            }

            L.push(LPoint);
            R.push(RPoint);

            // Add to transcript and get challenge (Dalek uses 'u')
            transcript.appendPoint('L', LPoint);
            transcript.appendPoint('R', RPoint);
            const u = transcript.challengeScalar('u');
            const u_inv = ScalarOps.invert(u);

            // Fold vectors (Dalek formula)
            // a' = aL*u + aR*u_inv
            // b' = bL*u_inv + bR*u
            aVec = vectorAdd(
                scalarVectorMul(u, aL),
                scalarVectorMul(u_inv, aR)
            );
            bVec = vectorAdd(
                scalarVectorMul(u_inv, bL),
                scalarVectorMul(u, bR)
            );

            // Fold generators WITH factors baked in (EXACT Dalek approach)
            // Dalek does NOT fold factors separately - they're used only in generator folding
            // G'[i] = G_L[i] * (u_inv * gFactorsL[i]) + G_R[i] * (u * gFactorsR[i])
            // H'[i] = H_L[i] * (u * hFactorsL[i]) + H_R[i] * (u_inv * hFactorsR[i])

            // Fold generators with factors baked in (Dalek approach)
            // G'[i] = G_L[i] * (u_inv * gFactorsL[i]) + G_R[i] * (u * gFactorsR[i])
            // H'[i] = H_L[i] * (u * hFactorsL[i]) + H_R[i] * (u_inv * hFactorsR[i])
            gVec = [];
            for (let i = 0; i < nPrime; i++) {
                const gL_scalar = ScalarOps.multiply(u_inv, gFactorsL[i]);
                const gR_scalar = ScalarOps.multiply(u, gFactorsR[i]);
                gVec.push(gL[i].multiply(gL_scalar).add(gR[i].multiply(gR_scalar)));
            }

            hVec = [];
            for (let i = 0; i < nPrime; i++) {
                const hL_scalar = ScalarOps.multiply(u, hFactorsL[i]);
                const hR_scalar = ScalarOps.multiply(u_inv, hFactorsR[i]);
                hVec.push(hL[i].multiply(hL_scalar).add(hR[i].multiply(hR_scalar)));
            }

            currentN = nPrime;
        }

        return {
            L,
            R,
            a: aVec[0],
            b: bVec[0],
        };
    }

    /**
     * Verify inner product proof
     * 
     * Verification equation: Check that the folded generators with final scalars
     * reconstruct the original commitment when accounting for L and R.
     * 
     * The equation is: g*a + h*b + u*(a*b) == P + sum(L_j * x_j^2) + sum(R_j * x_j^-2)
     * where g and h are the folded generators computed from challenges.
     */
    static async verify(
        proof: InnerProductProof,
        n: number,
        P: CurvePoint,
        u: CurvePoint,
        transcript: Transcript
    ): Promise<boolean> {
        try {
            const { L, R, a, b } = proof;

            // Reconstruct challenges (must match prove - Dalek uses 'u')
            const challenges: Scalar[] = [];
            for (let i = 0; i < L.length; i++) {
                transcript.appendPoint('L', L[i]);
                transcript.appendPoint('R', R[i]);
                challenges.push(transcript.challengeScalar('u'));
            }

            // Get generators (use Dalek-compatible)
            const { DalekGeneratorManager } = await import('./dalek-compat');
            const G = DalekGeneratorManager.getGVector(n);
            const H = DalekGeneratorManager.getHVector(n);

            // Compute s scalars (from Dalek verification_scalars)
            const s = this.computeSScalarsFromChallenges(n, challenges);

            // Verification equation from Bulletproofs paper:
            // P = g^a · h^b · u^(a·b) · ∏(L_j^(-x_j^2) · R_j^(-x_j^(-2)))
            // 
            // Rearranged: g^a · h^b · u^(a·b) = P · ∏(L_j^(x_j^2) · R_j^(x_j^(-2)))
            //
            // With challenge-adjusted generators: g_i = g_i^(s_i), h_i = h_i^(s_i^(-1))
            // This gives: <G, a*s> + <H, b*s_inv> + u^(a*b)

            // Compute RHS: P · ∏(L_j^(x_j^2) · R_j^(x_j^(-2)))
            let rhs = P;
            for (let i = 0; i < L.length; i++) {
                const x = challenges[i];
                const xSq = ScalarOps.multiply(x, x);
                const xInv = ScalarOps.invert(x);
                const xInvSq = ScalarOps.multiply(xInv, xInv);

                rhs = rhs.add(L[i].multiply(xSq));
                rhs = rhs.add(R[i].multiply(xInvSq));
            }

            // Compute LHS: <G, a*s> + <H, b*s_inv> + u^(a*b)
            let lhs = CurvePoint.identity();

            // Add u^(a*b)
            const ab = ScalarOps.multiply(a, b);
            if (ab !== 0n) {
                lhs = lhs.add(u.multiply(ab));
            }

            // Add <G, a*s> where s_i represents challenge-based scaling
            for (let i = 0; i < n; i++) {
                const scalar = ScalarOps.multiply(a, s[i]);
                if (scalar !== 0n) {
                    lhs = lhs.add(G[i].multiply(scalar));
                }
            }

            // Add <H, b*s_inv> where s_inv[i] = s[n-1-i] (reversed)
            for (let i = 0; i < n; i++) {
                const sInv = s[n - 1 - i];
                const scalar = ScalarOps.multiply(b, sInv);
                if (scalar !== 0n) {
                    lhs = lhs.add(H[i].multiply(scalar));
                }
            }

            // Verify LHS == RHS
            return lhs.equals(rhs);

        } catch (error) {
            console.error('Inner product verification error:', error);
            return false;
        }
    }

    /**
     * Convenience method: prove without factors (all factors = 1)
     */
    static async proveSimple(
        a: Scalar[],
        b: Scalar[],
        Q: CurvePoint,
        transcript: Transcript
    ): Promise<InnerProductProof> {
        return this.prove(a, b, null, null, Q, transcript);
    }

    /**
     * Fold two point vectors
     */
    private static foldPoints(
        left: CurvePoint[],
        right: CurvePoint[],
        scalar: Scalar
    ): CurvePoint[] {
        const result: CurvePoint[] = [];
        for (let i = 0; i < left.length; i++) {
            // result[i] = left[i] + scalar * right[i]
            const scaled = right[i].multiply(scalar);
            result.push(left[i].add(scaled));
        }
        return result;
    }



    /**
     * Verify with G and H factors (exact Dalek implementation)
     */
    static async verifyWithFactors(
        proof: InnerProductProof,
        n: number,
        P: CurvePoint,
        Q: CurvePoint,
        G_factors: Scalar[],
        H_factors: Scalar[],
        transcript: Transcript
    ): Promise<boolean> {
        try {
            const { L, R, a, b } = proof;

            // Add domain separator (Dalek compatibility)
            transcript.innerproductDomainSep(n);

            // Reconstruct challenges (must match prove - Dalek uses 'u')
            const challenges: Scalar[] = [];
            for (let i = 0; i < L.length; i++) {
                transcript.appendPoint('L', L[i]);
                transcript.appendPoint('R', R[i]);
                challenges.push(transcript.challengeScalar('u'));
            }

            // Compute s scalars
            const s = this.computeSScalarsFromChallenges(n, challenges);

            // Get generators (use Dalek-compatible)
            const { DalekGeneratorManager } = await import('./dalek-compat');
            const G = DalekGeneratorManager.getGVector(n);
            const H = DalekGeneratorManager.getHVector(n);

            // Compute expected P (from Dalek verify method)
            // expect_P = Q*(a*b) + <G, a*s*G_factors> + <H, b*s_inv*H_factors> - <L, u_sq> - <R, u_inv_sq>
            let expectedP = CurvePoint.identity();

            // Add Q * (a*b)
            const ab = ScalarOps.multiply(a, b);
            if (ab !== 0n) {
                expectedP = expectedP.add(Q.multiply(ab));
            }

            // Add <G, a*s*G_factors>
            for (let i = 0; i < n; i++) {
                const scalar = ScalarOps.multiply(ScalarOps.multiply(a, s[i]), G_factors[i]);
                if (scalar !== 0n) {
                    expectedP = expectedP.add(G[i].multiply(scalar));
                }
            }

            // Add <H, b*s_inv*H_factors> where s_inv[i] = s[n-1-i]
            for (let i = 0; i < n; i++) {
                const sInv = s[n - 1 - i];
                const scalar = ScalarOps.multiply(ScalarOps.multiply(b, sInv), H_factors[i]);
                if (scalar !== 0n) {
                    expectedP = expectedP.add(H[i].multiply(scalar));
                }
            }

            // Subtract <L, u_sq> and <R, u_inv_sq> (Dalek uses negative signs)
            for (let i = 0; i < L.length; i++) {
                const x = challenges[i];
                const xSq = ScalarOps.multiply(x, x);
                const xInv = ScalarOps.invert(x);
                const xInvSq = ScalarOps.multiply(xInv, xInv);

                const negXSq = ScalarOps.negate(xSq);
                const negXInvSq = ScalarOps.negate(xInvSq);

                expectedP = expectedP.add(L[i].multiply(negXSq));
                expectedP = expectedP.add(R[i].multiply(negXInvSq));
            }

            const matches = expectedP.equals(P);

            if (!matches) {
                console.log('\n  🔍 Inner Product Verification Mismatch:');
                console.log('    Expected P:', expectedP.toHex().substring(0, 40) + '...');
                console.log('    Actual P:', P.toHex().substring(0, 40) + '...');

                // Debug: show components
                console.log('\n  🔍 Expected P components:');
                let debugP = CurvePoint.identity();
                console.log('    Start (identity):', debugP.toHex().substring(0, 40) + '...');

                // Q * (a*b)
                if (ab !== 0n) {
                    debugP = debugP.add(Q.multiply(ab));
                    console.log('    After Q*(a*b):', debugP.toHex().substring(0, 40) + '...');
                }

                // <G, a*s*G_factors>
                for (let i = 0; i < n; i++) {
                    const scalar = ScalarOps.multiply(ScalarOps.multiply(a, s[i]), G_factors[i]);
                    if (scalar !== 0n) {
                        debugP = debugP.add(G[i].multiply(scalar));
                    }
                }
                console.log('    After <G, a*s*G_factors>:', debugP.toHex().substring(0, 40) + '...');

                // <H, b*s_inv*H_factors>
                for (let i = 0; i < n; i++) {
                    const sInv = s[n - 1 - i];
                    const scalar = ScalarOps.multiply(ScalarOps.multiply(b, sInv), H_factors[i]);
                    if (scalar !== 0n) {
                        debugP = debugP.add(H[i].multiply(scalar));
                    }
                }
                console.log('    After <H, b*s_inv*H_factors>:', debugP.toHex().substring(0, 40) + '...');

                // L and R terms
                for (let i = 0; i < L.length; i++) {
                    const x = challenges[i];
                    const xSq = ScalarOps.multiply(x, x);
                    const xInv = ScalarOps.invert(x);
                    const xInvSq = ScalarOps.multiply(xInv, xInv);
                    const negXSq = ScalarOps.negate(xSq);
                    const negXInvSq = ScalarOps.negate(xInvSq);
                    debugP = debugP.add(L[i].multiply(negXSq));
                    debugP = debugP.add(R[i].multiply(negXInvSq));
                }
                console.log('    After L and R terms:', debugP.toHex().substring(0, 40) + '...');
            }

            return matches;

        } catch (error) {
            console.error('Inner product verification error:', error);
            return false;
        }
    }

    /**
     * Compute s scalars from challenges (EXACT Dalek implementation)
     * 
     * Matches the implementation in bulletproof.ts for consistency.
     * Uses allinv (product of challenge inverses) for s[0].
     */
    private static computeSScalarsFromChallenges(n: number, challenges: Scalar[]): Scalar[] {
        const lgN = challenges.length;

        if (lgN >= 32) {
            throw new Error('Too many challenges');
        }

        if (n !== (1 << lgN)) {
            throw new Error('n must be 2^lg_n');
        }

        // 1. Compute challenge inverses
        const challengesInv = challenges.map(c => ScalarOps.invert(c));

        // 2. Compute allinv = product of all inverses
        let allinv = 1n;
        for (const inv of challengesInv) {
            allinv = ScalarOps.multiply(allinv, inv);
        }

        // 3. Square the challenges for u_i^2
        const challengesSq = challenges.map(c => ScalarOps.multiply(c, c));

        // 4. Compute s values inductively (EXACT Dalek algorithm)
        const s: Scalar[] = new Array(n);
        s[0] = allinv; // First element is allinv, NOT 1!

        for (let i = 1; i < n; i++) {
            // lg_i = floor(log2(i)) using leading zeros
            const lgI = 31 - Math.clz32(i); // JavaScript equivalent of leading_zeros
            const k = 1 << lgI;
            const uLgISq = challengesSq[lgN - 1 - lgI];
            s[i] = ScalarOps.multiply(s[i - k], uLgISq);
        }

        return s;
    }
}
