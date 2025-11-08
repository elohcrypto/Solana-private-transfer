/**
 * Comprehensive Bulletproof Range Proof Test Suite
 * Tests: Proof generation, verification, edge cases, performance
 * Run with: npx ts-node test-bulletproof-comprehensive.ts
 */

import { Bulletproof } from '../../src/crypto/zkproofs/bulletproof';

let passed = 0;
let failed = 0;
const performanceResults: { test: string; time: number }[] = [];

async function test(name: string, fn: () => Promise<void>) {
    try {
        const start = Date.now();
        await fn();
        const duration = Date.now() - start;
        console.log(`✅ ${name} (${duration}ms)`);
        performanceResults.push({ test: name, time: duration });
        passed++;
    } catch (error) {
        console.log(`❌ ${name}`);
        console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`);
        failed++;
    }
}

console.log('='.repeat(80));
console.log('BULLETPROOF RANGE PROOF COMPREHENSIVE TEST SUITE');
console.log('='.repeat(80));

async function runTests() {
    console.log('\n📊 Basic Proof Generation & Verification');
    console.log('-'.repeat(80));

    await test('Prove and verify value=3 in range [0, 4)', async () => {
        const proof = await Bulletproof.prove(3n, 12345n, 2);
        const valid = await Bulletproof.verify(proof);
        if (!valid) throw new Error('Verification failed');
    });

    await test('Prove and verify value=100 in range [0, 256)', async () => {
        const proof = await Bulletproof.prove(100n, 67890n, 8);
        const valid = await Bulletproof.verify(proof);
        if (!valid) throw new Error('Verification failed');
    });

    await test('Prove and verify value=1000 in range [0, 2048)', async () => {
        const proof = await Bulletproof.prove(1000n, 11111n, 16); // n must be power of 2
        const valid = await Bulletproof.verify(proof);
        if (!valid) throw new Error('Verification failed');
    });

    console.log('\n🔍 Edge Cases');
    console.log('-'.repeat(80));

    await test('Prove value=0 (minimum)', async () => {
        const proof = await Bulletproof.prove(0n, 99999n, 4);
        const valid = await Bulletproof.verify(proof);
        if (!valid) throw new Error('Verification failed');
    });

    await test('Prove value=15 (maximum for n=4)', async () => {
        const proof = await Bulletproof.prove(15n, 88888n, 4);
        const valid = await Bulletproof.verify(proof);
        if (!valid) throw new Error('Verification failed');
    });

    await test('Prove value=255 (maximum for n=8)', async () => {
        const proof = await Bulletproof.prove(255n, 77777n, 8);
        const valid = await Bulletproof.verify(proof);
        if (!valid) throw new Error('Verification failed');
    });

    await test('Reject out-of-range value (value=16, n=4)', async () => {
        try {
            await Bulletproof.prove(16n, 12345n, 4);
            throw new Error('Should have rejected out-of-range value');
        } catch (error) {
            if (error instanceof Error && error.message.includes('out of range')) {
                // Expected error
            } else {
                throw error;
            }
        }
    });

    await test('Reject negative value', async () => {
        try {
            await Bulletproof.prove(-1n, 12345n, 4);
            throw new Error('Should have rejected negative value');
        } catch (error) {
            if (error instanceof Error && error.message.includes('out of range')) {
                // Expected error
            } else {
                throw error;
            }
        }
    });

    console.log('\n🔐 Different Blinding Factors');
    console.log('-'.repeat(80));

    await test('Same value, different blinding (1)', async () => {
        const proof = await Bulletproof.prove(42n, 11111n, 8); // n must be power of 2
        const valid = await Bulletproof.verify(proof);
        if (!valid) throw new Error('Verification failed');
    });

    await test('Same value, different blinding (2)', async () => {
        const proof = await Bulletproof.prove(42n, 22222n, 8); // n must be power of 2
        const valid = await Bulletproof.verify(proof);
        if (!valid) throw new Error('Verification failed');
    });

    await test('Same value, different blinding (3)', async () => {
        const proof = await Bulletproof.prove(42n, 33333n, 8); // n must be power of 2
        const valid = await Bulletproof.verify(proof);
        if (!valid) throw new Error('Verification failed');
    });

    console.log('\n📏 Different Range Sizes');
    console.log('-'.repeat(80));

    await test('n=2 (range [0, 4))', async () => {
        const proof = await Bulletproof.prove(2n, 12345n, 2);
        const valid = await Bulletproof.verify(proof);
        if (!valid) throw new Error('Verification failed');
    });

    await test('n=4 (range [0, 16))', async () => {
        const proof = await Bulletproof.prove(10n, 12345n, 4);
        const valid = await Bulletproof.verify(proof);
        if (!valid) throw new Error('Verification failed');
    });

    await test('n=8 (range [0, 256))', async () => {
        const proof = await Bulletproof.prove(200n, 12345n, 8);
        const valid = await Bulletproof.verify(proof);
        if (!valid) throw new Error('Verification failed');
    });

    await test('n=16 (range [0, 65536))', async () => {
        const proof = await Bulletproof.prove(50000n, 12345n, 16);
        const valid = await Bulletproof.verify(proof);
        if (!valid) throw new Error('Verification failed');
    });

    await test('n=32 (range [0, 2^32))', async () => {
        const proof = await Bulletproof.prove(1000000n, 12345n, 32);
        const valid = await Bulletproof.verify(proof);
        if (!valid) throw new Error('Verification failed');
    });

    console.log('\n⚡ Performance Tests');
    console.log('-'.repeat(80));

    await test('Performance: n=8 proof generation', async () => {
        const start = Date.now();
        await Bulletproof.prove(123n, 45678n, 8);
        const duration = Date.now() - start;
        if (duration > 500) {
            console.log(`   Warning: Took ${duration}ms (target <500ms)`);
        }
    });

    await test('Performance: n=16 proof generation', async () => {
        const start = Date.now();
        await Bulletproof.prove(12345n, 67890n, 16);
        const duration = Date.now() - start;
        if (duration > 1000) {
            console.log(`   Warning: Took ${duration}ms (target <1000ms)`);
        }
    });

    await test('Performance: n=32 proof generation', async () => {
        const start = Date.now();
        await Bulletproof.prove(1234567n, 9876543n, 32);
        const duration = Date.now() - start;
        if (duration > 2000) {
            console.log(`   Warning: Took ${duration}ms (target <2000ms)`);
        }
    });

    console.log('\n🔄 Multiple Proofs');
    console.log('-'.repeat(80));

    await test('Generate and verify 5 proofs sequentially', async () => {
        for (let i = 0; i < 5; i++) {
            const proof = await Bulletproof.prove(BigInt(i * 10), BigInt(i * 1000), 8);
            const valid = await Bulletproof.verify(proof);
            if (!valid) throw new Error(`Proof ${i} verification failed`);
        }
    });

    console.log('\n📈 Performance Summary');
    console.log('-'.repeat(80));

    const avgTime = performanceResults.reduce((sum, r) => sum + r.time, 0) / performanceResults.length;
    console.log(`Average test time: ${avgTime.toFixed(2)}ms`);

    const proofGenTests = performanceResults.filter(r => r.test.includes('Prove'));
    if (proofGenTests.length > 0) {
        const avgProofTime = proofGenTests.reduce((sum, r) => sum + r.time, 0) / proofGenTests.length;
        console.log(`Average proof generation time: ${avgProofTime.toFixed(2)}ms`);
    }

    const slowestTest = performanceResults.reduce((max, r) => r.time > max.time ? r : max);
    console.log(`Slowest test: ${slowestTest.test} (${slowestTest.time}ms)`);

    const fastestTest = performanceResults.reduce((min, r) => r.time < min.time ? r : min);
    console.log(`Fastest test: ${fastestTest.test} (${fastestTest.time}ms)`);

    console.log('\n' + '='.repeat(80));
    console.log(`RESULTS: ${passed} passed, ${failed} failed`);
    console.log('='.repeat(80));

    if (failed > 0) {
        process.exit(1);
    }
}

runTests().catch(console.error);
