/**
 * Comprehensive tests for cryptographic primitives
 * Tests: Curve operations, Scalar arithmetic, Pedersen commitments, Transcript
 */

import {
    CurvePoint,
    ScalarOps,
    PedersenCommitment,
    Transcript,
    CURVE_ORDER,
    scalarAdd,
    scalarMul,
    scalarSub,
    scalarInverse,
    innerProduct,
    hadamardProduct,
    vectorAdd,
    vectorSub,
    powerVector,
    multiScalarMul,
} from '../primitives';

describe('Curve Operations', () => {
    test('Point addition is associative', () => {
        const p1 = CurvePoint.base();
        const p2 = CurvePoint.base().multiply(2n);
        const p3 = CurvePoint.base().multiply(3n);

        const left = p1.add(p2).add(p3);
        const right = p1.add(p2.add(p3));

        expect(left.equals(right)).toBe(true);
    });

    test('Point addition is commutative', () => {
        const p1 = CurvePoint.base().multiply(5n);
        const p2 = CurvePoint.base().multiply(7n);

        const left = p1.add(p2);
        const right = p2.add(p1);

        expect(left.equals(right)).toBe(true);
    });

    test('Identity point is additive identity', () => {
        const p = CurvePoint.base().multiply(42n);
        const identity = CurvePoint.identity();

        expect(p.add(identity).equals(p)).toBe(true);
        expect(identity.add(p).equals(p)).toBe(true);
    });

    test('Point negation', () => {
        const p = CurvePoint.base().multiply(13n);
        const negP = p.negate();

        expect(p.add(negP).equals(CurvePoint.identity())).toBe(true);
    });

    test('Point subtraction', () => {
        const p1 = CurvePoint.base().multiply(10n);
        const p2 = CurvePoint.base().multiply(3n);
        const expected = CurvePoint.base().multiply(7n);

        expect(p1.subtract(p2).equals(expected)).toBe(true);
    });

    test('Scalar multiplication', () => {
        const base = CurvePoint.base();
        const p1 = base.multiply(5n);
        const p2 = base.multiply(3n);

        // 5*G + 3*G = 8*G
        const sum = p1.add(p2);
        const expected = base.multiply(8n);

        expect(sum.equals(expected)).toBe(true);
    });

    test('Point serialization/deserialization', () => {
        const p = CurvePoint.base().multiply(123n);
        const bytes = p.toBytes();
        const restored = CurvePoint.fromBytes(bytes);

        expect(restored.equals(p)).toBe(true);
    });

    test('Multi-scalar multiplication', () => {
        const scalars = [2n, 3n, 5n];
        const points = [
            CurvePoint.base(),
            CurvePoint.base().multiply(7n),
            CurvePoint.base().multiply(11n),
        ];

        const result = multiScalarMul(scalars, points);

        // Manual computation: 2*G + 3*(7*G) + 5*(11*G) = (2 + 21 + 55)*G = 78*G
        const expected = CurvePoint.base().multiply(78n);

        expect(result.equals(expected)).toBe(true);
    });
});

describe('Scalar Arithmetic', () => {
    test('Addition is associative', () => {
        const a = 123n;
        const b = 456n;
        const c = 789n;

        const left = scalarAdd(scalarAdd(a, b), c);
        const right = scalarAdd(a, scalarAdd(b, c));

        expect(left).toBe(right);
    });

    test('Addition is commutative', () => {
        const a = 111n;
        const b = 222n;

        expect(scalarAdd(a, b)).toBe(scalarAdd(b, a));
    });

    test('Multiplication is associative', () => {
        const a = 12n;
        const b = 34n;
        const c = 56n;

        const left = scalarMul(scalarMul(a, b), c);
        const right = scalarMul(a, scalarMul(b, c));

        expect(left).toBe(right);
    });

    test('Multiplication is commutative', () => {
        const a = 17n;
        const b = 19n;

        expect(scalarMul(a, b)).toBe(scalarMul(b, a));
    });

    test('Distributive property', () => {
        const a = 5n;
        const b = 7n;
        const c = 11n;

        // a * (b + c) = a*b + a*c
        const left = scalarMul(a, scalarAdd(b, c));
        const right = scalarAdd(scalarMul(a, b), scalarMul(a, c));

        expect(left).toBe(right);
    });

    test('Subtraction', () => {
        const a = 100n;
        const b = 30n;

        const result = scalarSub(a, b);
        expect(scalarAdd(result, b)).toBe(a);
    });

    test('Modular inverse', () => {
        const a = 42n;
        const aInv = scalarInverse(a);

        // a * a^{-1} = 1 (mod order)
        expect(scalarMul(a, aInv)).toBe(1n);
    });

    test('Zero has no inverse', () => {
        const zeroInv = scalarInverse(0n);
        expect(zeroInv).toBe(0n);
    });

    test('Scalar operations stay in field', () => {
        const large = CURVE_ORDER - 1n;
        const result = scalarAdd(large, large);

        expect(result).toBeLessThan(CURVE_ORDER);
        expect(result).toBeGreaterThanOrEqual(0n);
    });

    test('Random scalars are in valid range', () => {
        for (let i = 0; i < 10; i++) {
            const r = ScalarOps.random();
            expect(r).toBeGreaterThanOrEqual(0n);
            expect(r).toBeLessThan(CURVE_ORDER);
        }
    });
});

describe('Vector Operations', () => {
    test('Inner product', () => {
        const a = [2n, 3n, 5n];
        const b = [7n, 11n, 13n];

        const result = innerProduct(a, b);
        const expected = 2n * 7n + 3n * 11n + 5n * 13n; // 14 + 33 + 65 = 112

        expect(result).toBe(expected);
    });

    test('Hadamard product', () => {
        const a = [2n, 3n, 5n];
        const b = [7n, 11n, 13n];

        const result = hadamardProduct(a, b);
        expect(result).toEqual([14n, 33n, 65n]);
    });

    test('Vector addition', () => {
        const a = [1n, 2n, 3n];
        const b = [4n, 5n, 6n];

        const result = vectorAdd(a, b);
        expect(result).toEqual([5n, 7n, 9n]);
    });

    test('Vector subtraction', () => {
        const a = [10n, 20n, 30n];
        const b = [3n, 5n, 7n];

        const result = vectorSub(a, b);
        expect(result).toEqual([7n, 15n, 23n]);
    });

    test('Power vector', () => {
        const base = 2n;
        const n = 5;

        const result = powerVector(base, n);
        expect(result).toEqual([1n, 2n, 4n, 8n, 16n]);
    });

    test('Power vector with y', () => {
        const y = 3n;
        const n = 4;

        const result = powerVector(y, n);
        expect(result).toEqual([1n, 3n, 9n, 27n]);
    });
});

describe('Pedersen Commitments', () => {
    test('Commitment creation', () => {
        const value = 42n;
        const blinding = 123n;

        const commitment = PedersenCommitment.commit(value, blinding);
        expect(commitment).toBeDefined();
        expect(commitment.equals(CurvePoint.identity())).toBe(false);
    });

    test('Commitment verification', () => {
        const value = 100n;
        const blinding = 456n;

        const commitment = PedersenCommitment.commit(value, blinding);
        const valid = PedersenCommitment.verify(commitment, value, blinding);

        expect(valid).toBe(true);
    });

    test('Commitment verification fails with wrong value', () => {
        const value = 100n;
        const blinding = 456n;

        const commitment = PedersenCommitment.commit(value, blinding);
        const valid = PedersenCommitment.verify(commitment, 99n, blinding);

        expect(valid).toBe(false);
    });

    test('Commitment verification fails with wrong blinding', () => {
        const value = 100n;
        const blinding = 456n;

        const commitment = PedersenCommitment.commit(value, blinding);
        const valid = PedersenCommitment.verify(commitment, value, 455n);

        expect(valid).toBe(false);
    });

    test('Homomorphic addition', () => {
        const v1 = 10n;
        const v2 = 20n;
        const b1 = 100n;
        const b2 = 200n;

        const c1 = PedersenCommitment.commit(v1, b1);
        const c2 = PedersenCommitment.commit(v2, b2);

        const sum = PedersenCommitment.add(c1, c2);
        const expected = PedersenCommitment.commit(v1 + v2, b1 + b2);

        expect(sum.equals(expected)).toBe(true);
    });

    test('Homomorphic subtraction', () => {
        const v1 = 50n;
        const v2 = 20n;
        const b1 = 100n;
        const b2 = 30n;

        const c1 = PedersenCommitment.commit(v1, b1);
        const c2 = PedersenCommitment.commit(v2, b2);

        const diff = PedersenCommitment.subtract(c1, c2);
        const expected = PedersenCommitment.commit(
            scalarSub(v1, v2),
            scalarSub(b1, b2)
        );

        expect(diff.equals(expected)).toBe(true);
    });

    test('Zero commitment', () => {
        const c = PedersenCommitment.commit(0n, 0n);
        expect(c.equals(CurvePoint.identity())).toBe(true);
    });

    test('Commitment hiding property', () => {
        // Same value with different blinding should produce different commitments
        const value = 42n;
        const blinding1 = 100n;
        const blinding2 = 200n;

        const c1 = PedersenCommitment.commit(value, blinding1);
        const c2 = PedersenCommitment.commit(value, blinding2);

        expect(c1.equals(c2)).toBe(false);
    });
});

describe('Transcript (Fiat-Shamir)', () => {
    test('Deterministic challenge generation', () => {
        const transcript1 = new Transcript();
        transcript1.appendMessage('test', new TextEncoder().encode('data'));
        const challenge1 = transcript1.challengeScalar('challenge');

        const transcript2 = new Transcript();
        transcript2.appendMessage('test', new TextEncoder().encode('data'));
        const challenge2 = transcript2.challengeScalar('challenge');

        expect(challenge1).toBe(challenge2);
    });

    test('Different messages produce different challenges', () => {
        const transcript1 = new Transcript();
        transcript1.appendMessage('test', new TextEncoder().encode('data1'));
        const challenge1 = transcript1.challengeScalar('challenge');

        const transcript2 = new Transcript();
        transcript2.appendMessage('test', new TextEncoder().encode('data2'));
        const challenge2 = transcript2.challengeScalar('challenge');

        expect(challenge1).not.toBe(challenge2);
    });

    test('Different labels produce different challenges', () => {
        const transcript = new Transcript();
        transcript.appendMessage('test', new TextEncoder().encode('data'));

        const challenge1 = transcript.challengeScalar('challenge1');
        const challenge2 = transcript.challengeScalar('challenge2');

        expect(challenge1).not.toBe(challenge2);
    });

    test('Append point to transcript', () => {
        const transcript = new Transcript();
        const point = CurvePoint.base().multiply(42n);

        transcript.appendPoint('point', point);
        const challenge = transcript.challengeScalar('challenge');

        expect(challenge).toBeGreaterThanOrEqual(0n);
        expect(challenge).toBeLessThan(CURVE_ORDER);
    });

    test('Append scalar to transcript', () => {
        const transcript = new Transcript();
        const scalar = 12345n;

        transcript.appendScalar('scalar', scalar);
        const challenge = transcript.challengeScalar('challenge');

        expect(challenge).toBeGreaterThanOrEqual(0n);
        expect(challenge).toBeLessThan(CURVE_ORDER);
    });

    test('Multiple challenges are independent', () => {
        const transcript = new Transcript();
        transcript.appendMessage('data', new TextEncoder().encode('test'));

        const challenges = transcript.challengeScalars('multi', 5);

        expect(challenges.length).toBe(5);
        // All challenges should be different
        const uniqueChallenges = new Set(challenges.map(c => c.toString()));
        expect(uniqueChallenges.size).toBe(5);
    });

    test('Transcript state affects challenges', () => {
        const transcript1 = new Transcript();
        transcript1.appendMessage('msg1', new TextEncoder().encode('data'));
        const c1 = transcript1.challengeScalar('c');

        const transcript2 = new Transcript();
        transcript2.appendMessage('msg1', new TextEncoder().encode('data'));
        transcript2.appendMessage('msg2', new TextEncoder().encode('more'));
        const c2 = transcript2.challengeScalar('c');

        expect(c1).not.toBe(c2);
    });
});

describe('Scalar Field Properties', () => {
    test('Field closure under addition', () => {
        const a = CURVE_ORDER - 10n;
        const b = 20n;
        const result = scalarAdd(a, b);

        expect(result).toBeGreaterThanOrEqual(0n);
        expect(result).toBeLessThan(CURVE_ORDER);
    });

    test('Field closure under multiplication', () => {
        const a = CURVE_ORDER - 1n;
        const b = CURVE_ORDER - 1n;
        const result = scalarMul(a, b);

        expect(result).toBeGreaterThanOrEqual(0n);
        expect(result).toBeLessThan(CURVE_ORDER);
    });

    test('Additive identity', () => {
        const a = 42n;
        expect(scalarAdd(a, 0n)).toBe(a);
        expect(scalarAdd(0n, a)).toBe(a);
    });

    test('Multiplicative identity', () => {
        const a = 42n;
        expect(scalarMul(a, 1n)).toBe(a);
        expect(scalarMul(1n, a)).toBe(a);
    });

    test('Multiplicative inverse', () => {
        const a = 17n;
        const aInv = scalarInverse(a);
        expect(scalarMul(a, aInv)).toBe(1n);
    });

    test('Division via inverse', () => {
        const a = 100n;
        const b = 7n;

        // a / b = a * b^{-1}
        const bInv = scalarInverse(b);
        const quotient = scalarMul(a, bInv);

        // Verify: quotient * b = a (mod order)
        expect(scalarMul(quotient, b)).toBe(a);
    });
});

describe('Integration Tests', () => {
    test('Commitment with scalar operations', () => {
        const v1 = 10n;
        const v2 = 20n;
        const b1 = ScalarOps.random();
        const b2 = ScalarOps.random();

        const c1 = PedersenCommitment.commit(v1, b1);
        const c2 = PedersenCommitment.commit(v2, b2);

        // (v1 + v2, b1 + b2)
        const sumCommitment = PedersenCommitment.add(c1, c2);
        const expectedCommitment = PedersenCommitment.commit(
            scalarAdd(v1, v2),
            scalarAdd(b1, b2)
        );

        expect(sumCommitment.equals(expectedCommitment)).toBe(true);
    });

    test('Multi-scalar mul with commitments', () => {
        const values = [5n, 10n, 15n];
        const blindings = values.map(() => ScalarOps.random());

        const commitments = values.map((v, i) =>
            PedersenCommitment.commit(v, blindings[i])
        );

        const scalars = [2n, 3n, 1n];
        const result = multiScalarMul(scalars, commitments);

        // Expected: 2*C1 + 3*C2 + 1*C3
        const expectedValue = scalarAdd(
            scalarAdd(scalarMul(2n, values[0]), scalarMul(3n, values[1])),
            values[2]
        );
        const expectedBlinding = scalarAdd(
            scalarAdd(scalarMul(2n, blindings[0]), scalarMul(3n, blindings[1])),
            blindings[2]
        );
        const expected = PedersenCommitment.commit(expectedValue, expectedBlinding);

        expect(result.equals(expected)).toBe(true);
    });

    test('Transcript with multiple operations', () => {
        const transcript = new Transcript();

        // Simulate a proof protocol
        const commitment = PedersenCommitment.commit(42n, 123n);
        transcript.appendPoint('C', commitment);

        const challenge1 = transcript.challengeScalar('x');

        const response = scalarMul(challenge1, 5n);
        transcript.appendScalar('r', response);

        const challenge2 = transcript.challengeScalar('y');

        // Challenges should be deterministic
        expect(challenge1).toBeGreaterThanOrEqual(0n);
        expect(challenge2).toBeGreaterThanOrEqual(0n);
        expect(challenge1).not.toBe(challenge2);
    });
});

describe('Edge Cases', () => {
    test('Zero scalar multiplication', () => {
        const p = CurvePoint.base().multiply(0n);
        expect(p.equals(CurvePoint.identity())).toBe(true);
    });

    test('Large scalar multiplication', () => {
        const large = CURVE_ORDER - 1n;
        const p = CurvePoint.base().multiply(large);

        // Should equal -G
        const negBase = CurvePoint.base().negate();
        expect(p.equals(negBase)).toBe(true);
    });

    test('Empty vector operations', () => {
        expect(innerProduct([], [])).toBe(0n);
        expect(hadamardProduct([], [])).toEqual([]);
        expect(vectorAdd([], [])).toEqual([]);
    });

    test('Single element vectors', () => {
        expect(innerProduct([5n], [7n])).toBe(35n);
        expect(hadamardProduct([5n], [7n])).toEqual([35n]);
        expect(vectorAdd([5n], [7n])).toEqual([12n]);
    });
});
