/**
 * Manual test runner for cryptographic primitives
 * Run with: npx ts-node test-primitives-manual.ts
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
} from '../../src/crypto/zkproofs/primitives';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
    try {
        fn();
        console.log(`✅ ${name}`);
        passed++;
    } catch (error) {
        console.log(`❌ ${name}`);
        console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`);
        failed++;
    }
}

function expect(value: any) {
    return {
        toBe(expected: any) {
            if (value !== expected) {
                throw new Error(`Expected ${expected}, got ${value}`);
            }
        },
        toEqual(expected: any) {
            // Handle arrays
            if (Array.isArray(value) && Array.isArray(expected)) {
                if (value.length !== expected.length) {
                    throw new Error(`Array length mismatch: expected ${expected.length}, got ${value.length}`);
                }
                for (let i = 0; i < value.length; i++) {
                    if (value[i] !== expected[i]) {
                        throw new Error(`Array element ${i} mismatch: expected ${expected[i]}, got ${value[i]}`);
                    }
                }
                return;
            }
            // Handle objects
            const valueStr = JSON.stringify(value);
            const expectedStr = JSON.stringify(expected);
            if (valueStr !== expectedStr) {
                throw new Error(`Expected ${expectedStr}, got ${valueStr}`);
            }
        },
        toBeLessThan(expected: any) {
            if (!(value < expected)) {
                throw new Error(`Expected ${value} to be less than ${expected}`);
            }
        },
        toBeGreaterThanOrEqual(expected: any) {
            if (!(value >= expected)) {
                throw new Error(`Expected ${value} to be >= ${expected}`);
            }
        },
        not: {
            toBe(expected: any) {
                if (value === expected) {
                    throw new Error(`Expected not to be ${expected}`);
                }
            },
        },
    };
}

console.log('='.repeat(80));
console.log('CRYPTOGRAPHIC PRIMITIVES TEST SUITE');
console.log('='.repeat(80));

console.log('\n📐 Curve Operations');
console.log('-'.repeat(80));

test('Point addition is associative', () => {
    const p1 = CurvePoint.base();
    const p2 = CurvePoint.base().multiply(2n);
    const p3 = CurvePoint.base().multiply(3n);

    const left = p1.add(p2).add(p3);
    const right = p1.add(p2.add(p3));

    if (!left.equals(right)) throw new Error('Not associative');
});

test('Point addition is commutative', () => {
    const p1 = CurvePoint.base().multiply(5n);
    const p2 = CurvePoint.base().multiply(7n);

    const left = p1.add(p2);
    const right = p2.add(p1);

    if (!left.equals(right)) throw new Error('Not commutative');
});

test('Identity point is additive identity', () => {
    const p = CurvePoint.base().multiply(42n);
    const identity = CurvePoint.identity();

    if (!p.add(identity).equals(p)) throw new Error('Identity failed (right)');
    if (!identity.add(p).equals(p)) throw new Error('Identity failed (left)');
});

test('Point negation', () => {
    const p = CurvePoint.base().multiply(13n);
    const negP = p.negate();

    if (!p.add(negP).equals(CurvePoint.identity())) throw new Error('Negation failed');
});

test('Point subtraction', () => {
    const p1 = CurvePoint.base().multiply(10n);
    const p2 = CurvePoint.base().multiply(3n);
    const expected = CurvePoint.base().multiply(7n);

    if (!p1.subtract(p2).equals(expected)) throw new Error('Subtraction failed');
});

test('Point serialization/deserialization', () => {
    const p = CurvePoint.base().multiply(123n);
    const bytes = p.toBytes();
    const restored = CurvePoint.fromBytes(bytes);

    if (!restored.equals(p)) throw new Error('Serialization failed');
});

console.log('\n🔢 Scalar Arithmetic');
console.log('-'.repeat(80));

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

    const left = scalarMul(a, scalarAdd(b, c));
    const right = scalarAdd(scalarMul(a, b), scalarMul(a, c));

    expect(left).toBe(right);
});

test('Modular inverse', () => {
    const a = 42n;
    const aInv = scalarInverse(a);

    expect(scalarMul(a, aInv)).toBe(1n);
});

test('Random scalars are in valid range', () => {
    for (let i = 0; i < 10; i++) {
        const r = ScalarOps.random();
        expect(r).toBeGreaterThanOrEqual(0n);
        expect(r).toBeLessThan(CURVE_ORDER);
    }
});

console.log('\n📊 Vector Operations');
console.log('-'.repeat(80));

test('Inner product', () => {
    const a = [2n, 3n, 5n];
    const b = [7n, 11n, 13n];

    const result = innerProduct(a, b);
    const expected = 2n * 7n + 3n * 11n + 5n * 13n;

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

test('Power vector', () => {
    const base = 2n;
    const n = 5;

    const result = powerVector(base, n);
    expect(result).toEqual([1n, 2n, 4n, 8n, 16n]);
});

console.log('\n🔐 Pedersen Commitments');
console.log('-'.repeat(80));

test('Commitment creation', () => {
    const value = 42n;
    const blinding = 123n;

    const commitment = PedersenCommitment.commit(value, blinding);
    if (commitment.equals(CurvePoint.identity())) throw new Error('Commitment is identity');
});

test('Commitment verification', () => {
    const value = 100n;
    const blinding = 456n;

    const commitment = PedersenCommitment.commit(value, blinding);
    const valid = PedersenCommitment.verify(commitment, value, blinding);

    if (!valid) throw new Error('Verification failed');
});

test('Commitment verification fails with wrong value', () => {
    const value = 100n;
    const blinding = 456n;

    const commitment = PedersenCommitment.commit(value, blinding);
    const valid = PedersenCommitment.verify(commitment, 99n, blinding);

    if (valid) throw new Error('Should have failed');
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

    if (!sum.equals(expected)) throw new Error('Homomorphic addition failed');
});

test('Commitment hiding property', () => {
    const value = 42n;
    const blinding1 = 100n;
    const blinding2 = 200n;

    const c1 = PedersenCommitment.commit(value, blinding1);
    const c2 = PedersenCommitment.commit(value, blinding2);

    if (c1.equals(c2)) throw new Error('Hiding property failed');
});

console.log('\n📝 Transcript (Fiat-Shamir)');
console.log('-'.repeat(80));

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

test('Append point to transcript', () => {
    const transcript = new Transcript();
    const point = CurvePoint.base().multiply(42n);

    transcript.appendPoint('point', point);
    const challenge = transcript.challengeScalar('challenge');

    expect(challenge).toBeGreaterThanOrEqual(0n);
    expect(challenge).toBeLessThan(CURVE_ORDER);
});

test('Multiple challenges are independent', () => {
    const transcript = new Transcript();
    transcript.appendMessage('data', new TextEncoder().encode('test'));

    const challenges = transcript.challengeScalars('multi', 5);

    if (challenges.length !== 5) throw new Error('Wrong number of challenges');

    const uniqueChallenges = new Set(challenges.map(c => c.toString()));
    if (uniqueChallenges.size !== 5) throw new Error('Challenges not unique');
});

console.log('\n' + '='.repeat(80));
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log('='.repeat(80));

if (failed > 0) {
    process.exit(1);
}
