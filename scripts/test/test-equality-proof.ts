/**
 * Equality Proof Test Suite
 * Run with: npx ts-node test-equality-proof.ts
 */

import { EqualityProof } from '../../src/crypto/zkproofs/equalityProof';
import { PedersenCommitment, ScalarOps } from '../../src/crypto/zkproofs/primitives';

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

console.log('='.repeat(80));
console.log('EQUALITY PROOF TEST SUITE');
console.log('='.repeat(80));

console.log('\n🔐 Basic Equality Proofs');
console.log('-'.repeat(80));

test('Prove and verify equality of two commitments', () => {
    const value = 42n;
    const r1 = 12345n;
    const r2 = 67890n;

    const C1 = PedersenCommitment.commit(value, r1);
    const C2 = PedersenCommitment.commit(value, r2);

    const proof = EqualityProof.prove(value, r1, r2, C1, C2);
    const valid = EqualityProof.verify(proof, C1, C2);

    if (!valid) throw new Error('Verification failed');
});

test('Equality proof for same value with different blindings', () => {
    const value = 100n;
    const r1 = ScalarOps.random();
    const r2 = ScalarOps.random();

    const C1 = PedersenCommitment.commit(value, r1);
    const C2 = PedersenCommitment.commit(value, r2);

    const proof = EqualityProof.prove(value, r1, r2, C1, C2);
    const valid = EqualityProof.verify(proof, C1, C2);

    if (!valid) throw new Error('Verification failed');
});

test('Equality proof for value=0', () => {
    const value = 0n;
    const r1 = 11111n;
    const r2 = 22222n;

    const C1 = PedersenCommitment.commit(value, r1);
    const C2 = PedersenCommitment.commit(value, r2);

    const proof = EqualityProof.prove(value, r1, r2, C1, C2);
    const valid = EqualityProof.verify(proof, C1, C2);

    if (!valid) throw new Error('Verification failed');
});

test('Equality proof for large value', () => {
    const value = 1000000n;
    const r1 = ScalarOps.random();
    const r2 = ScalarOps.random();

    const C1 = PedersenCommitment.commit(value, r1);
    const C2 = PedersenCommitment.commit(value, r2);

    const proof = EqualityProof.prove(value, r1, r2, C1, C2);
    const valid = EqualityProof.verify(proof, C1, C2);

    if (!valid) throw new Error('Verification failed');
});

console.log('\n❌ Negative Tests (Should Fail)');
console.log('-'.repeat(80));

test('Reject proof for different values', () => {
    const value1 = 42n;
    const value2 = 43n;
    const r1 = 12345n;
    const r2 = 67890n;

    const C1 = PedersenCommitment.commit(value1, r1);
    const C2 = PedersenCommitment.commit(value2, r2);

    // Try to create a fake proof (this should fail verification)
    // We'll create a proof for value1 but verify against C2 which has value2
    try {
        const proof = EqualityProof.prove(value1, r1, r2, C1, C2);
        throw new Error('Should have thrown error for mismatched commitments');
    } catch (error) {
        if (error instanceof Error && error.message.includes('do not match')) {
            // Expected error
        } else {
            throw error;
        }
    }
});

test('Reject proof with wrong commitment', () => {
    const value = 42n;
    const r1 = 12345n;
    const r2 = 67890n;
    const r3 = 11111n;

    const C1 = PedersenCommitment.commit(value, r1);
    const C2 = PedersenCommitment.commit(value, r2);
    const C3 = PedersenCommitment.commit(value, r3);

    const proof = EqualityProof.prove(value, r1, r2, C1, C2);

    // Verify with wrong commitment
    const valid = EqualityProof.verify(proof, C1, C3);

    if (valid) throw new Error('Should have rejected wrong commitment');
});

test('Reject proof with swapped commitments', () => {
    const value = 42n;
    const r1 = 12345n;
    const r2 = 67890n;

    const C1 = PedersenCommitment.commit(value, r1);
    const C2 = PedersenCommitment.commit(value, r2);

    const proof = EqualityProof.prove(value, r1, r2, C1, C2);

    // Verify with swapped commitments
    const valid = EqualityProof.verify(proof, C2, C1);

    if (valid) throw new Error('Should have rejected swapped commitments');
});

console.log('\n🔗 Multiple Commitment Equality');
console.log('-'.repeat(80));

test('Prove equality of 3 commitments', () => {
    const value = 100n;
    const blindings = [
        ScalarOps.random(),
        ScalarOps.random(),
        ScalarOps.random(),
    ];

    const commitments = blindings.map(r => PedersenCommitment.commit(value, r));

    const proofs = EqualityProof.proveMultiple(value, blindings, commitments);
    const valid = EqualityProof.verifyMultiple(proofs, commitments);

    if (!valid) throw new Error('Verification failed');
    if (proofs.length !== 2) throw new Error('Expected 2 proofs for 3 commitments');
});

test('Prove equality of 5 commitments', () => {
    const value = 42n;
    const blindings = Array.from({ length: 5 }, () => ScalarOps.random());
    const commitments = blindings.map(r => PedersenCommitment.commit(value, r));

    const proofs = EqualityProof.proveMultiple(value, blindings, commitments);
    const valid = EqualityProof.verifyMultiple(proofs, commitments);

    if (!valid) throw new Error('Verification failed');
    if (proofs.length !== 4) throw new Error('Expected 4 proofs for 5 commitments');
});

console.log('\n🔒 Zero-Knowledge Property');
console.log('-'.repeat(80));

test('Proof reveals no information about value', () => {
    const value = 12345n;
    const r1 = ScalarOps.random();
    const r2 = ScalarOps.random();

    const C1 = PedersenCommitment.commit(value, r1);
    const C2 = PedersenCommitment.commit(value, r2);

    const proof = EqualityProof.prove(value, r1, r2, C1, C2);

    // The proof should only contain R and s
    // Neither should reveal the value
    if (proof.s === value) throw new Error('Proof leaks value!');
    if (proof.s === r1 || proof.s === r2) throw new Error('Proof leaks blinding!');
});

test('Same commitments with different proofs', () => {
    const value = 42n;
    const r1 = 12345n;
    const r2 = 67890n;

    const C1 = PedersenCommitment.commit(value, r1);
    const C2 = PedersenCommitment.commit(value, r2);

    // Generate two proofs for the same commitments
    const proof1 = EqualityProof.prove(value, r1, r2, C1, C2);
    const proof2 = EqualityProof.prove(value, r1, r2, C1, C2);

    // Proofs should be different (due to random nonce)
    if (proof1.R.equals(proof2.R)) throw new Error('Proofs should be randomized');
    if (proof1.s === proof2.s) throw new Error('Proofs should be randomized');

    // But both should verify
    if (!EqualityProof.verify(proof1, C1, C2)) throw new Error('Proof 1 failed');
    if (!EqualityProof.verify(proof2, C1, C2)) throw new Error('Proof 2 failed');
});

console.log('\n⚡ Performance');
console.log('-'.repeat(80));

test('Performance: Generate 100 proofs', () => {
    const start = Date.now();

    for (let i = 0; i < 100; i++) {
        const value = BigInt(i);
        const r1 = ScalarOps.random();
        const r2 = ScalarOps.random();

        const C1 = PedersenCommitment.commit(value, r1);
        const C2 = PedersenCommitment.commit(value, r2);

        EqualityProof.prove(value, r1, r2, C1, C2);
    }

    const duration = Date.now() - start;
    console.log(`   Generated 100 proofs in ${duration}ms (${(duration / 100).toFixed(2)}ms avg)`);
});

test('Performance: Verify 100 proofs', () => {
    // Generate proofs first
    const proofs: Array<{ proof: any; C1: any; C2: any }> = [];

    for (let i = 0; i < 100; i++) {
        const value = BigInt(i);
        const r1 = ScalarOps.random();
        const r2 = ScalarOps.random();

        const C1 = PedersenCommitment.commit(value, r1);
        const C2 = PedersenCommitment.commit(value, r2);

        const proof = EqualityProof.prove(value, r1, r2, C1, C2);
        proofs.push({ proof, C1, C2 });
    }

    // Now verify
    const start = Date.now();

    for (const { proof, C1, C2 } of proofs) {
        if (!EqualityProof.verify(proof, C1, C2)) {
            throw new Error('Verification failed');
        }
    }

    const duration = Date.now() - start;
    console.log(`   Verified 100 proofs in ${duration}ms (${(duration / 100).toFixed(2)}ms avg)`);
});

console.log('\n' + '='.repeat(80));
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log('='.repeat(80));

if (failed > 0) {
    process.exit(1);
}
