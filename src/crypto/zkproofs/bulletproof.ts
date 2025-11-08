/**
 * Complete Bulletproof Range Proof Implementation
 * 
 * Full implementation of Bulletproofs protocol for range proofs.
 * Based on: https://eprint.iacr.org/2017/1066.pdf
 */

import {
    CurvePoint,
    ScalarOps,
    PedersenCommitment,
    type Scalar,
    powerVector,
    multiScalarMul,
} from './primitives';
import {
    InnerProductArgument,
    InnerProductProof,
    GeneratorManager,
} from './innerProduct';
import {
    DalekGeneratorManager,
    MerlinTranscript,
} from './dalek-compat';

export interface BulletproofRangeProof {
    commitment: CurvePoint;
    A: CurvePoint;
    S: CurvePoint;
    T1: CurvePoint;
    T2: CurvePoint;
    taux: Scalar;
    mu: Scalar;
    t: Scalar;
    innerProductProof: InnerProductProof;
    n: number;
}

export class Bulletproof {
    /**
     * Generate complete Bulletproof range proof
     */
    static async prove(
        value: Scalar,
        blinding: Scalar,
        n: number = 64
    ): Promise<BulletproofRangeProof> {
        // Validate range
        if (value < 0n || value >= (1n << BigInt(n))) {
            throw new Error(`Value out of range [0, 2^${n})`);
        }

        // Create commitment V = g^v * h^gamma
        const V = PedersenCommitment.commit(value, blinding);

        // Convert value to bit vector aL
        const aL: Scalar[] = [];
        let v = value;
        for (let i = 0; i < n; i++) {
            aL.push(v & 1n);
            v >>= 1n;
        }

        // Compute aR = aL - 1^n
        const aR = aL.map(bit => ScalarOps.subtract(bit, 1n));

        // Generate random blinding vectors
        const sL: Scalar[] = Array.from({ length: n }, () => ScalarOps.random());
        const sR: Scalar[] = Array.from({ length: n }, () => ScalarOps.random());
        const alpha = ScalarOps.random();
        const rho = ScalarOps.random();

        // Initialize Merlin transcript with domain separator
        const transcript = new MerlinTranscript();
        transcript.rangeproofDomainSep(n, 1); // m=1 for single proof
        transcript.appendPoint('V', V);

        // Compute A and S commitments using Dalek-compatible vector generators
        const G_vec = DalekGeneratorManager.getGVector(n);
        const H_vec = DalekGeneratorManager.getHVector(n);
        const { H: H_blind } = PedersenCommitment.getGenerators(); // Blinding generator

        let A = H_blind.multiply(alpha);
        for (let i = 0; i < n; i++) {
            if (aL[i] !== 0n) A = A.add(G_vec[i].multiply(aL[i]));
            if (aR[i] !== 0n) A = A.add(H_vec[i].multiply(aR[i]));
        }

        let S = H_blind.multiply(rho);
        for (let i = 0; i < n; i++) {
            if (sL[i] !== 0n) S = S.add(G_vec[i].multiply(sL[i]));
            if (sR[i] !== 0n) S = S.add(H_vec[i].multiply(sR[i]));
        }

        transcript.appendPoint('A', A);
        transcript.appendPoint('S', S);

        // Get challenges y and z
        const y = transcript.challengeScalar('y');
        const z = transcript.challengeScalar('z');

        // Compute powers
        const yPowers = powerVector(y, n);
        const twoPowers = powerVector(2n, n);
        const z2 = ScalarOps.multiply(z, z);

        // Compute polynomial coefficients
        // l(X) = aL - z*1^n + sL*X
        // r(X) = y^n ∘ (aR + z*1^n + sR*X) + z^2*2^n
        // t(X) = <l(X), r(X)> = t0 + t1*X + t2*X^2

        // t1 coefficient
        let t1 = 0n;
        for (let i = 0; i < n; i++) {
            // <aL - z, sR*y^n>
            const lTerm = ScalarOps.multiply(
                ScalarOps.subtract(aL[i], z),
                ScalarOps.multiply(sR[i], yPowers[i])
            );
            // <sL, (aR + z)*y^n>
            const rTerm = ScalarOps.multiply(
                sL[i],
                ScalarOps.multiply(ScalarOps.add(aR[i], z), yPowers[i])
            );
            // <sL, z^2*2^n> - required term for t1 coefficient
            const zTerm = ScalarOps.multiply(
                sL[i],
                ScalarOps.multiply(z2, twoPowers[i])
            );
            t1 = ScalarOps.add(t1, ScalarOps.add(ScalarOps.add(lTerm, rTerm), zTerm));
        }

        // t2 coefficient
        let t2 = 0n;
        for (let i = 0; i < n; i++) {
            const term = ScalarOps.multiply(
                sL[i],
                ScalarOps.multiply(sR[i], yPowers[i])
            );
            t2 = ScalarOps.add(t2, term);
        }

        // Blind t1 and t2
        const tau1 = ScalarOps.random();
        const tau2 = ScalarOps.random();

        const T1 = PedersenCommitment.commit(t1, tau1);
        const T2 = PedersenCommitment.commit(t2, tau2);

        transcript.appendPoint('T1', T1);
        transcript.appendPoint('T2', T2);

        // Get challenge x
        const x = transcript.challengeScalar('x');
        const x2 = ScalarOps.multiply(x, x);

        // Compute l = l(x) and r = r(x)
        const l: Scalar[] = [];
        const r: Scalar[] = [];

        for (let i = 0; i < n; i++) {
            // l[i] = aL[i] - z + sL[i]*x
            l.push(ScalarOps.add(
                ScalarOps.subtract(aL[i], z),
                ScalarOps.multiply(sL[i], x)
            ));

            // r[i] = y^i * (aR[i] + z + sR[i]*x) + z^2 * 2^i
            const rInner = ScalarOps.add(
                ScalarOps.add(aR[i], z),
                ScalarOps.multiply(sR[i], x)
            );
            r.push(ScalarOps.add(
                ScalarOps.multiply(yPowers[i], rInner),
                ScalarOps.multiply(z2, twoPowers[i])
            ));
        }

        // Compute t = <l, r>
        let t = 0n;
        for (let i = 0; i < n; i++) {
            t = ScalarOps.add(t, ScalarOps.multiply(l[i], r[i]));
        }

        // Compute taux = tau2*x^2 + tau1*x + z^2*gamma
        const taux = ScalarOps.add(
            ScalarOps.add(
                ScalarOps.multiply(tau2, x2),
                ScalarOps.multiply(tau1, x)
            ),
            ScalarOps.multiply(z2, blinding)
        );

        // T1 and T2 are correctly computed as commitments to t1 and t2

        // Compute mu = alpha + rho*x
        const mu = ScalarOps.add(alpha, ScalarOps.multiply(rho, x));

        // CRITICAL: Append scalars to transcript BEFORE inner product proof
        // This ensures prover and verifier have the same transcript state
        transcript.appendScalar('taux', taux);
        transcript.appendScalar('mu', mu);
        transcript.appendScalar('t', t);

        // Generate c challenge to keep transcript in sync with verifier
        // (prover doesn't use c, but verifier does for batching)
        const c = transcript.challengeScalar('c');

        // Generate Inner Product Argument proof for <l, r> = t
        // Q = identity (no additional Q term in the commitment)
        const Q = CurvePoint.identity();

        // Set up factors (matching Dalek)
        // G_factors are all 1
        const G_factors = new Array(n).fill(1n);

        // H_factors are [1, y^{-1}, y^{-2}, ..., y^{-(n-1)}]
        const y_inv = ScalarOps.invert(y);
        const H_factors = powerVector(y_inv, n);

        // Generate inner product proof with factors
        const innerProductProof = await InnerProductArgument.prove(
            l,
            r,
            G_factors,
            H_factors,
            Q,
            transcript
        );

        return {
            commitment: V,
            A,
            S,
            T1,
            T2,
            taux,
            mu,
            t,
            innerProductProof,
            n,
        };
    }

    /**
     * Verify complete Bulletproof range proof
     */
    static async verify(proof: BulletproofRangeProof): Promise<boolean> {
        try {
            const { commitment, A, S, T1, T2, taux, mu, t, innerProductProof, n } = proof;

            // Recreate Merlin transcript with domain separator
            const transcript = new MerlinTranscript();
            transcript.rangeproofDomainSep(n, 1); // m=1 for single proof
            transcript.appendPoint('V', commitment);
            transcript.appendPoint('A', A);
            transcript.appendPoint('S', S);

            const y = transcript.challengeScalar('y');
            const z = transcript.challengeScalar('z');

            transcript.appendPoint('T1', T1);
            transcript.appendPoint('T2', T2);

            const x = transcript.challengeScalar('x');
            const x2 = ScalarOps.multiply(x, x);

            // Append scalars to transcript (EXACT Dalek labels)
            transcript.appendScalar('taux', taux);
            transcript.appendScalar('mu', mu);
            transcript.appendScalar('t', t);

            // Get c challenge for batching (Dalek does this)
            const c = transcript.challengeScalar('c');

            // Verify t commitment: g^t * h^taux == V^(z^2) * g^delta(y,z) * T1^x * T2^(x^2)
            const { G, H } = PedersenCommitment.getGenerators();
            const z2 = ScalarOps.multiply(z, z);

            // Compute P for inner product verification
            // P = A + x*S - z*G_vec - (z*y^n + z^2*2^n)*H_vec
            const yPowers = powerVector(y, n);
            const twoPowers = powerVector(2n, n);

            // Compute delta(y,z) = (z - z^2) * <1^n, y^n> - z^3 * <1^n, 2^n>
            const z3 = ScalarOps.multiply(z2, z);

            let sum_y = 0n;
            let sum_2 = 0n;
            for (let i = 0; i < n; i++) {
                sum_y = ScalarOps.add(sum_y, yPowers[i]);
                sum_2 = ScalarOps.add(sum_2, twoPowers[i]);
            }
            const delta = ScalarOps.subtract(
                ScalarOps.multiply(ScalarOps.subtract(z, z2), sum_y),
                ScalarOps.multiply(z3, sum_2)
            );

            const lhs = PedersenCommitment.commit(t, taux);
            const rhs = commitment.multiply(z2)
                .add(G.multiply(delta))
                .add(T1.multiply(x))
                .add(T2.multiply(x2));

            if (!lhs.equals(rhs)) {
                console.log('❌ T commitment check failed');
                return false;
            }
            const G_vec = DalekGeneratorManager.getGVector(n);
            const H_vec = DalekGeneratorManager.getHVector(n);

            // Compute P for inner product verification
            // The inner product proof with H_factors = [y^{-i}] proves:
            // P = <l, G> + <r, H * y^{-i}> - mu * H_blind
            // 
            // Where:
            // l[i] = aL[i] - z + sL[i]*x
            // r[i] = y^i * (aR[i] + z + sR[i]*x) + z^2 * 2^i
            //
            // Expanding:
            // <l, G> = <aL, G> + x*<sL, G> - z*<1, G> = A_G + x*S_G - z*<1, G>
            // <r, H*y^{-i}> = <y^i*(aR + z + sR*x) + z^2*2^i, H*y^{-i}>
            //               = <aR + z + sR*x, H> + <z^2*2^i*y^{-i}, H>
            //               = A_H + x*S_H + z*<1, H> + <z^2*2^i*y^{-i}, H>
            //
            // Therefore:
            // P = A + x*S - z*<1, G> + z*<1, H> + <z^2*2^i*y^{-i}, H> - mu*H_blind

            let P = A.add(S.multiply(x));

            // Subtract z * G_vec
            for (let i = 0; i < n; i++) {
                P = P.subtract(G_vec[i].multiply(z));
            }

            // Add z * H_vec and z^2*2^i*y^{-i} * H_vec[i]
            const y_inv = ScalarOps.invert(y);
            const y_inv_powers = powerVector(y_inv, n);
            for (let i = 0; i < n; i++) {
                const z2_2_yinv = ScalarOps.multiply(
                    ScalarOps.multiply(z2, twoPowers[i]),
                    y_inv_powers[i]
                );
                const coeff = ScalarOps.add(z, z2_2_yinv);
                P = P.add(H_vec[i].multiply(coeff));
            }

            // Add mu * H (blinding factor) - matching Dalek which uses +mu in the commitment
            P = P.add(H.multiply(mu));

            // Use Dalek-style batched verification instead of standalone inner product verification
            // Add IPP domain separator before reconstructing challenges
            transcript.innerproductDomainSep(n);

            // Reconstruct IPP challenges
            const challenges: Scalar[] = [];
            for (let i = 0; i < innerProductProof.L.length; i++) {
                transcript.appendPoint('L', innerProductProof.L[i]);
                transcript.appendPoint('R', innerProductProof.R[i]);
                challenges.push(transcript.challengeScalar('u'));
            }

            const u_sq = challenges.map(c => ScalarOps.multiply(c, c));
            const u_inv_sq = challenges.map(c => {
                const inv = ScalarOps.invert(c);
                return ScalarOps.multiply(inv, inv);
            });

            // Compute s scalars
            const s = this.computeSScalarsFromChallenges(n, challenges);
            const s_inv = s.slice().reverse();

            const a = innerProductProof.a;
            const b = innerProductProof.b;

            // Build the mega_check multi-scalar multiplication (EXACT Dalek implementation)
            const scalars: Scalar[] = [];
            const points: CurvePoint[] = [];

            // 1 * A (positive)
            scalars.push(1n);
            points.push(A);

            // x * S (positive)
            scalars.push(x);
            points.push(S);

            // -c * x * T1 (NEGATIVE!)
            scalars.push(ScalarOps.negate(ScalarOps.multiply(c, x)));
            points.push(T1);

            // -c * x^2 * T2 (NEGATIVE!)
            scalars.push(ScalarOps.negate(ScalarOps.multiply(c, x2)));
            points.push(T2);

            // u_sq[i] * L[i] (positive)
            for (let i = 0; i < innerProductProof.L.length; i++) {
                scalars.push(u_sq[i]);
                points.push(innerProductProof.L[i]);
            }

            // u_inv_sq[i] * R[i] (positive)
            for (let i = 0; i < innerProductProof.R.length; i++) {
                scalars.push(u_inv_sq[i]);
                points.push(innerProductProof.R[i]);
            }

            // (-mu + c*taux) * H_blind (Dalek formula)
            const h_blind_scalar = ScalarOps.add(ScalarOps.negate(mu), ScalarOps.multiply(c, taux));
            scalars.push(h_blind_scalar);
            points.push(H);

            // c * (t - delta) * G (Dalek formula)
            const basepoint_scalar = ScalarOps.multiply(c, ScalarOps.subtract(t, delta));
            scalars.push(basepoint_scalar);
            points.push(G);

            // (-z - a*s[i]) * G[i]
            for (let i = 0; i < n; i++) {
                const scalar = ScalarOps.subtract(ScalarOps.negate(z), ScalarOps.multiply(a, s[i]));
                scalars.push(scalar);
                points.push(G_vec[i]);
            }

            // (z + z²*2^i*y^{-i} - b*s_inv[i]*y^{-i}) * H[i] (CORRECT Dalek formula)
            for (let i = 0; i < n; i++) {
                const yInv = y_inv_powers[i];
                const term2 = ScalarOps.multiply(z2, ScalarOps.multiply(twoPowers[i], yInv));
                const term3 = ScalarOps.multiply(b, ScalarOps.multiply(s_inv[i], yInv));
                const scalar = ScalarOps.subtract(ScalarOps.add(z, term2), term3);
                scalars.push(scalar);
                points.push(H_vec[i]);
            }

            // -c * z^2 * V (NEGATIVE!)
            scalars.push(ScalarOps.negate(ScalarOps.multiply(c, z2)));
            points.push(commitment);

            // Compute multi-scalar multiplication (ONE big MSM like Dalek)
            const result = multiScalarMul(scalars, points);

            // Check if result equals identity
            if (result.equals(CurvePoint.identity())) {
                console.log('✅ PROOF VALID!');
                return true;
            } else {
                console.log('❌ PROOF INVALID');
                return false;
            }

        } catch (error) {
            console.error('Bulletproof verification error:', error);
            return false;
        }
    }

    /**
     * Batch verify multiple proofs
     */
    static async batchVerify(proofs: BulletproofRangeProof[]): Promise<boolean> {
        for (const proof of proofs) {
            if (!(await this.verify(proof))) {
                return false;
            }
        }
        return true;
    }

    /**
     * Compute s scalars from challenges (EXACT Dalek implementation)
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