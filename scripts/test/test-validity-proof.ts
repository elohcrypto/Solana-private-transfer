/**
 * Validity Proof Test Suite
 * Run with: npx ts-node test-validity-proof.ts
 */

import { ValidityProof } from '../../src/crypto/zkproofs/validityProof';
import { ScalarOps } from '../../src/crypto/zkproofs/primitives';

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void>) {
    try {
        const start = Date.now();
        await fn();
        const duration = Date.now() - start;
        console.log(`✅ ${name} (${duration}ms)`);
        passed++;
    } catch (error) {
        console.log(`❌ ${name}`);
        console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`);
        failed++;
    }
}

console.log('='.repeat(80));
console.log('VALIDITY PROOF TEST SUITE');
console.log('='.repeat(80));

async function runTests() {
    console.log('\n💸 Transfer Validity Proofs');
    console.log('-'.repeat(80));

    await test('Prove and verify simple transfer', async () => {
        const senderBefore = 100n;
        const amount = 30n;
        const senderAfter = 70n;

        const blindings = {
            senderBefore: ScalarOps.random(),
            amount: ScalarOps.random(),
            senderAfter: ScalarOps.random(),
        };

        const proof = await ValidityProof.proveTransfer(
            senderBefore,
            amount,
            senderAfter,
            blindings,
            8 // Use n=8 for faster tests
        );

        const valid = await ValidityProof.verifyTransfer(proof);
        if (!valid) throw new Error('Verification failed');
    });

    await test('Prove transfer with amount=0', async () => {
        const senderBefore = 100n;
        const amount = 0n;
        const senderAfter = 100n;

        const blindings = {
            senderBefore: ScalarOps.random(),
            amount: ScalarOps.random(),
            senderAfter: ScalarOps.random(),
        };

        const proof = await ValidityProof.proveTransfer(
            senderBefore,
            amount,
            senderAfter,
            blindings,
            8
        );

        const valid = await ValidityProof.verifyTransfer(proof);
        if (!valid) throw new Error('Verification failed');
    });

    await test('Prove transfer with full balance', async () => {
        const senderBefore = 100n;
        const amount = 100n;
        const senderAfter = 0n;

        const blindings = {
            senderBefore: ScalarOps.random(),
            amount: ScalarOps.random(),
            senderAfter: ScalarOps.random(),
        };

        const proof = await ValidityProof.proveTransfer(
            senderBefore,
            amount,
            senderAfter,
            blindings,
            8
        );

        const valid = await ValidityProof.verifyTransfer(proof);
        if (!valid) throw new Error('Verification failed');
    });

    await test('Reject invalid balance equation', async () => {
        const senderBefore = 100n;
        const amount = 30n;
        const senderAfter = 80n; // Wrong! Should be 70

        const blindings = {
            senderBefore: ScalarOps.random(),
            amount: ScalarOps.random(),
            senderAfter: ScalarOps.random(),
        };

        try {
            await ValidityProof.proveTransfer(
                senderBefore,
                amount,
                senderAfter,
                blindings,
                8
            );
            throw new Error('Should have rejected invalid balance');
        } catch (error) {
            if (error instanceof Error && error.message.includes('does not hold')) {
                // Expected error
            } else {
                throw error;
            }
        }
    });

    console.log('\n🔄 General Transaction Validity');
    console.log('-'.repeat(80));

    await test('Prove 1-input, 1-output transaction', async () => {
        const inputs = [100n];
        const outputs = [100n];
        const inputBlindings = [ScalarOps.random()];
        const outputBlindings = [ScalarOps.random()];

        const proof = await ValidityProof.proveTransaction(
            inputs,
            outputs,
            inputBlindings,
            outputBlindings,
            8
        );

        const valid = await ValidityProof.verifyTransaction(proof);
        if (!valid) throw new Error('Verification failed');
    });

    await test('Prove 1-input, 2-output transaction', async () => {
        const inputs = [100n];
        const outputs = [60n, 40n];
        const inputBlindings = [ScalarOps.random()];
        const outputBlindings = [ScalarOps.random(), ScalarOps.random()];

        const proof = await ValidityProof.proveTransaction(
            inputs,
            outputs,
            inputBlindings,
            outputBlindings,
            8
        );

        const valid = await ValidityProof.verifyTransaction(proof);
        if (!valid) throw new Error('Verification failed');
    });

    await test('Prove 2-input, 1-output transaction', async () => {
        const inputs = [60n, 40n];
        const outputs = [100n];
        const inputBlindings = [ScalarOps.random(), ScalarOps.random()];
        const outputBlindings = [ScalarOps.random()];

        const proof = await ValidityProof.proveTransaction(
            inputs,
            outputs,
            inputBlindings,
            outputBlindings,
            8
        );

        const valid = await ValidityProof.verifyTransaction(proof);
        if (!valid) throw new Error('Verification failed');
    });

    await test('Prove 2-input, 2-output transaction', async () => {
        const inputs = [60n, 40n];
        const outputs = [70n, 30n];
        const inputBlindings = [ScalarOps.random(), ScalarOps.random()];
        const outputBlindings = [ScalarOps.random(), ScalarOps.random()];

        const proof = await ValidityProof.proveTransaction(
            inputs,
            outputs,
            inputBlindings,
            outputBlindings,
            8
        );

        const valid = await ValidityProof.verifyTransaction(proof);
        if (!valid) throw new Error('Verification failed');
    });

    await test('Reject unbalanced transaction', async () => {
        const inputs = [100n];
        const outputs = [90n]; // Doesn't balance!
        const inputBlindings = [ScalarOps.random()];
        const outputBlindings = [ScalarOps.random()];

        try {
            await ValidityProof.proveTransaction(
                inputs,
                outputs,
                inputBlindings,
                outputBlindings,
                8
            );
            throw new Error('Should have rejected unbalanced transaction');
        } catch (error) {
            if (error instanceof Error && error.message.includes('does not balance')) {
                // Expected error
            } else {
                throw error;
            }
        }
    });

    console.log('\n⚡ Performance');
    console.log('-'.repeat(80));

    await test('Performance: Simple transfer (n=8)', async () => {
        const senderBefore = 100n;
        const amount = 30n;
        const senderAfter = 70n;

        const blindings = {
            senderBefore: ScalarOps.random(),
            amount: ScalarOps.random(),
            senderAfter: ScalarOps.random(),
        };

        const start = Date.now();
        const proof = await ValidityProof.proveTransfer(
            senderBefore,
            amount,
            senderAfter,
            blindings,
            8
        );
        const proveTime = Date.now() - start;

        const verifyStart = Date.now();
        await ValidityProof.verifyTransfer(proof);
        const verifyTime = Date.now() - verifyStart;

        console.log(`   Proof generation: ${proveTime}ms`);
        console.log(`   Verification: ${verifyTime}ms`);
    });

    await test('Performance: Complex transaction (2-in, 2-out, n=16)', async () => {
        const inputs = [5000n, 3000n];
        const outputs = [6000n, 2000n];
        const inputBlindings = [ScalarOps.random(), ScalarOps.random()];
        const outputBlindings = [ScalarOps.random(), ScalarOps.random()];

        const start = Date.now();
        const proof = await ValidityProof.proveTransaction(
            inputs,
            outputs,
            inputBlindings,
            outputBlindings,
            16
        );
        const proveTime = Date.now() - start;

        const verifyStart = Date.now();
        await ValidityProof.verifyTransaction(proof);
        const verifyTime = Date.now() - verifyStart;

        console.log(`   Proof generation: ${proveTime}ms`);
        console.log(`   Verification: ${verifyTime}ms`);
    });

    console.log('\n' + '='.repeat(80));
    console.log(`RESULTS: ${passed} passed, ${failed} failed`);
    console.log('='.repeat(80));

    if (failed > 0) {
        process.exit(1);
    }
}

runTests().catch(console.error);
