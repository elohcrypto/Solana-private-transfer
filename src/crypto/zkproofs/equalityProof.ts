/**
 * Equality Proof for Pedersen Commitments
 * 
 * Proves that two Pedersen commitments contain the same value
 * without revealing the value itself.
 * 
 * Protocol (Schnorr-like):
 * Given: C1 = g^v * h^r1, C2 = g^v * h^r2
 * Prove: C1 and C2 commit to the same value v
 * 
 * This is equivalent to proving knowledge of (r1 - r2) such that:
 * C1 / C2 = h^(r1 - r2)
 */

import {
    CurvePoint,
    ScalarOps,
    PedersenCommitment,
    Transcript,
    type Scalar,
} from './primitives';

/**
 * Equality proof structure
 */
export interface EqualityProof {
    /** Commitment to randomness */
    R: CurvePoint;
    /** Response scalar */
    s: Scalar;
}

/**
 * Equality Proof Protocol
 * 
 * Proves that two commitments C1 and C2 contain the same value.
 */
export class EqualityProofProtocol {
    /**
     * Generate equality proof
     * 
     * Proves that C1 = Commit(v, r1) and C2 = Commit(v, r2) contain the same value v.
     * 
     * Protocol:
     * 1. Compute D = C1 - C2 = h^(r1 - r2)
     * 2. Generate random k
     * 3. Compute R = h^k
     * 4. Challenge c = Hash(C1, C2, R)
     * 5. Response s = k + c*(r1 - r2)
     * 
     * @param value - The common value in both commitments
     * @param r1 - Blinding factor for C1
     * @param r2 - Blinding factor for C2
     * @param C1 - First commitment
     * @param C2 - Second commitment
     * @param transcript - Fiat-Shamir transcript
     * @returns Equality proof
     */
    static prove(
        value: Scalar,
        r1: Scalar,
        r2: Scalar,
        C1: CurvePoint,
        C2: CurvePoint,
        transcript?: Transcript
    ): EqualityProof {
        // Use provided transcript or create new one
        const trans = transcript || new Transcript();

        // Add domain separator
        trans.appendMessage('dom-sep', new TextEncoder().encode('equality-proof'));

        // Add commitments to transcript
        trans.appendPoint('C1', C1);
        trans.appendPoint('C2', C2);

        // Verify commitments are correct (optional, for safety)
        const C1_check = PedersenCommitment.commit(value, r1);
        const C2_check = PedersenCommitment.commit(value, r2);
        if (!C1.equals(C1_check) || !C2.equals(C2_check)) {
            throw new Error('Commitments do not match provided values');
        }

        // Compute difference in blinding factors
        const r_diff = ScalarOps.subtract(r1, r2);

        // Generate random nonce
        const k = ScalarOps.random();

        // Compute R = h^k (commitment to nonce)
        const { H } = PedersenCommitment.getGenerators();
        const R = H.multiply(k);

        // Add R to transcript
        trans.appendPoint('R', R);

        // Generate challenge
        const c = trans.challengeScalar('c');

        // Compute response: s = k + c * (r1 - r2)
        const s = ScalarOps.add(k, ScalarOps.multiply(c, r_diff));

        return { R, s };
    }

    /**
     * Verify equality proof
     * 
     * Verifies that C1 and C2 contain the same value.
     * 
     * Verification:
     * 1. Compute D = C1 - C2
     * 2. Recompute challenge c = Hash(C1, C2, R)
     * 3. Check: h^s = R + c*D
     * 
     * @param proof - The equality proof
     * @param C1 - First commitment
     * @param C2 - Second commitment
     * @param transcript - Fiat-Shamir transcript (optional)
     * @returns True if proof is valid
     */
    static verify(
        proof: EqualityProof,
        C1: CurvePoint,
        C2: CurvePoint,
        transcript?: Transcript
    ): boolean {
        try {
            const { R, s } = proof;

            // Use provided transcript or create new one
            const trans = transcript || new Transcript();

            // Add domain separator
            trans.appendMessage('dom-sep', new TextEncoder().encode('equality-proof'));

            // Add commitments to transcript
            trans.appendPoint('C1', C1);
            trans.appendPoint('C2', C2);

            // Add R to transcript
            trans.appendPoint('R', R);

            // Recompute challenge
            const c = trans.challengeScalar('c');

            // Compute D = C1 - C2 = h^(r1 - r2)
            const D = C1.subtract(C2);

            // Verify: h^s = R + c*D
            const { H } = PedersenCommitment.getGenerators();
            const lhs = H.multiply(s);
            const rhs = R.add(D.multiply(c));

            return lhs.equals(rhs);
        } catch (error) {
            console.error('Equality proof verification error:', error);
            return false;
        }
    }

    /**
     * Prove equality of multiple commitments
     * 
     * Proves that all commitments in the list contain the same value.
     * This is more efficient than proving pairwise equality.
     * 
     * @param value - The common value
     * @param blindings - Blinding factors for each commitment
     * @param commitments - List of commitments
     * @returns Array of equality proofs (proving C[i] = C[i+1])
     */
    static proveMultiple(
        value: Scalar,
        blindings: Scalar[],
        commitments: CurvePoint[]
    ): EqualityProof[] {
        if (blindings.length !== commitments.length) {
            throw new Error('Blindings and commitments length mismatch');
        }

        if (commitments.length < 2) {
            throw new Error('Need at least 2 commitments for equality proof');
        }

        const proofs: EqualityProof[] = [];

        // Prove C[i] = C[i+1] for all consecutive pairs
        for (let i = 0; i < commitments.length - 1; i++) {
            const proof = this.prove(
                value,
                blindings[i],
                blindings[i + 1],
                commitments[i],
                commitments[i + 1]
            );
            proofs.push(proof);
        }

        return proofs;
    }

    /**
     * Verify multiple equality proofs
     * 
     * @param proofs - Array of equality proofs
     * @param commitments - List of commitments
     * @returns True if all proofs are valid
     */
    static verifyMultiple(
        proofs: EqualityProof[],
        commitments: CurvePoint[]
    ): boolean {
        if (proofs.length !== commitments.length - 1) {
            return false;
        }

        // Verify each consecutive pair
        for (let i = 0; i < proofs.length; i++) {
            if (!this.verify(proofs[i], commitments[i], commitments[i + 1])) {
                return false;
            }
        }

        return true;
    }
}

/**
 * Convenience export
 */
export const EqualityProof = EqualityProofProtocol;
