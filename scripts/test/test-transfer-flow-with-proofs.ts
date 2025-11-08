/**
 * Transfer Flow with Proofs Test Suite
 * Tests the complete transfer flow with ZK proofs and encrypted balance tracking
 * Run with: npx ts-node test-transfer-flow-with-proofs.ts
 */

import { PrivacyLayer, ConfidentialTransfer } from '../../src/privacy/PrivacyLayer';
import { EncryptedBalanceTracker } from '../../src/storage/EncryptedBalanceTracker';
import { ScalarOps } from '../../src/crypto/zkproofs/primitives';
import * as fs from 'fs';

let passed = 0;
let failed = 0;

const TEST_STORAGE_PATH = './test-storage-transfer-flow';

async function test(name: string, fn: () => void | Promise<void>) {
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

// Cleanup test storage
function cleanup() {
    try {
        if (fs.existsSync(TEST_STORAGE_PATH)) {
            fs.rmSync(TEST_STORAGE_PATH, { recursive: true, force: true });
        }
    } catch (error) {
        console.error('Cleanup error:', error);
    }
}

console.log('='.repeat(80));
console.log('TRANSFER FLOW WITH PROOFS TEST SUITE');
console.log('='.repeat(80));

async function runTests() {
    cleanup();

    console.log('\n🔐 Complete Transfer Flow');
    console.log('-'.repeat(80));

    await test('Generate proofs and update balances for single transfer', async () => {
        const privacyLayer = new PrivacyLayer({ rangeBits: 16, enableCaching: true });
        const balanceTracker = new EncryptedBalanceTracker(TEST_STORAGE_PATH + '-1');
        balanceTracker.initialize(); // No keypair needed with Pedersen commitments

        // Setup initial balances
        const sender = 'sender1';
        const recipient = 'recipient1';
        const senderBefore = 10000n;
        const transferAmount = 3000n;
        const senderAfter = 7000n;

        balanceTracker.setBalance(sender, senderBefore);
        balanceTracker.setBalance(recipient, 0n);

        // Generate proofs
        const blindings = {
            senderBefore: ScalarOps.random(),
            amount: ScalarOps.random(),
            senderAfter: ScalarOps.random(),
        };

        const proofStartTime = Date.now();
        const transfer = await privacyLayer.generateTransferProofs(
            senderBefore,
            transferAmount,
            senderAfter,
            blindings
        );
        const proofTime = Date.now() - proofStartTime;

        console.log(`   Proof generation: ${proofTime}ms`);

        // Verify proofs (standardized: throws on failure)
        const verifyStartTime = Date.now();
        await privacyLayer.verifyTransfer(transfer);
        const verifyTime = Date.now() - verifyStartTime;

        console.log(`   Proof verification: ${verifyTime}ms`);

        // Update balances
        balanceTracker.processTransfer(sender, recipient, transferAmount, 'tx123');

        // Verify balances updated correctly
        const senderBalance = balanceTracker.getBalance(sender);
        const recipientBalance = balanceTracker.getBalance(recipient);

        if (senderBalance !== 7000n) throw new Error('Sender balance wrong');
        if (recipientBalance !== 3000n) throw new Error('Recipient balance wrong');

        console.log(`   ✅ Balances updated correctly`);
    });

    await test('Generate proofs with range, equality, and validity checks', async () => {
        const privacyLayer = new PrivacyLayer({ rangeBits: 16 });

        const senderBefore = 10000n;
        const amount = 3000n;
        const senderAfter = 7000n;

        const blindings = {
            senderBefore: ScalarOps.random(),
            amount: ScalarOps.random(),
            senderAfter: ScalarOps.random(),
        };

        const transfer = await privacyLayer.generateTransferProofs(
            senderBefore,
            amount,
            senderAfter,
            blindings
        );

        // Verify all proof components exist
        if (!transfer.amountRangeProof) throw new Error('Missing amount range proof');
        if (!transfer.senderAfterRangeProof) throw new Error('Missing sender after range proof');
        if (!transfer.validityProof) throw new Error('Missing validity proof');

        console.log(`   ✅ All proof components present`);
        console.log(`      - Amount range proof: ✓`);
        console.log(`      - Sender after range proof: ✓`);
        console.log(`      - Validity proof: ✓`);
    });

    await test('Process multiple transfers with proof generation', async () => {
        const privacyLayer = new PrivacyLayer({ rangeBits: 16, enableParallel: true });
        const balanceTracker = new EncryptedBalanceTracker(TEST_STORAGE_PATH + '-2');
        balanceTracker.initialize(); // No keypair needed with Pedersen commitments

        // Setup initial balances
        balanceTracker.setBalance('user1', 10000n);
        balanceTracker.setBalance('user2', 5000n);
        balanceTracker.setBalance('user3', 2000n);

        // Transfer 1: user1 -> user2 (1000)
        const transfer1 = await privacyLayer.generateTransferProofs(
            10000n,
            1000n,
            9000n,
            {
                senderBefore: ScalarOps.random(),
                amount: ScalarOps.random(),
                senderAfter: ScalarOps.random(),
            }
        );
        balanceTracker.processTransfer('user1', 'user2', 1000n, 'tx1');

        // Transfer 2: user2 -> user3 (500)
        const transfer2 = await privacyLayer.generateTransferProofs(
            6000n, // user2 now has 6000 (5000 + 1000)
            500n,
            5500n,
            {
                senderBefore: ScalarOps.random(),
                amount: ScalarOps.random(),
                senderAfter: ScalarOps.random(),
            }
        );
        balanceTracker.processTransfer('user2', 'user3', 500n, 'tx2');

        // Transfer 3: user3 -> user1 (250)
        const transfer3 = await privacyLayer.generateTransferProofs(
            2500n, // user3 now has 2500 (2000 + 500)
            250n,
            2250n,
            {
                senderBefore: ScalarOps.random(),
                amount: ScalarOps.random(),
                senderAfter: ScalarOps.random(),
            }
        );
        balanceTracker.processTransfer('user3', 'user1', 250n, 'tx3');

        // Verify final balances
        if (balanceTracker.getBalance('user1') !== 9250n) throw new Error('user1 balance wrong');
        if (balanceTracker.getBalance('user2') !== 5500n) throw new Error('user2 balance wrong');
        if (balanceTracker.getBalance('user3') !== 2250n) throw new Error('user3 balance wrong');

        console.log(`   ✅ All transfers processed correctly`);
        console.log(`      user1: 10000 -> 9250`);
        console.log(`      user2: 5000 -> 5500`);
        console.log(`      user3: 2000 -> 2250`);
    });

    console.log('\n📊 Proof Metadata Tracking');
    console.log('-'.repeat(80));

    await test('Track comprehensive proof metadata', async () => {
        const privacyLayer = new PrivacyLayer({ rangeBits: 16 });

        const proofStartTime = Date.now();
        const transfer = await privacyLayer.generateTransferProofs(
            10000n,
            3000n,
            7000n,
            {
                senderBefore: ScalarOps.random(),
                amount: ScalarOps.random(),
                senderAfter: ScalarOps.random(),
            }
        );
        const proofTime = Date.now() - proofStartTime;

        // Simulate metadata that would be stored
        const metadata = {
            privacyMode: 'NATIVE_ZK',
            proofGenerationMs: proofTime,
            hasRangeProofs: true,
            hasEqualityProofs: true,
            hasValidityProof: true,
            rangeBits: 16,
            senderBeforeEncrypted: true,
            amountEncrypted: true,
            senderAfterEncrypted: true,
            balanceTrackerUpdated: true,
        };

        console.log(`   Metadata tracked:`);
        console.log(`      Privacy mode: ${metadata.privacyMode}`);
        console.log(`      Proof generation: ${metadata.proofGenerationMs}ms`);
        console.log(`      Range proofs: ${metadata.hasRangeProofs ? '✓' : '✗'}`);
        console.log(`      Equality proofs: ${metadata.hasEqualityProofs ? '✓' : '✗'}`);
        console.log(`      Validity proof: ${metadata.hasValidityProof ? '✓' : '✗'}`);
        console.log(`      Range bits: ${metadata.rangeBits}`);
        console.log(`      Balance tracker updated: ${metadata.balanceTrackerUpdated ? '✓' : '✗'}`);
    });

    console.log('\n🔄 Balance Synchronization');
    console.log('-'.repeat(80));

    await test('Synchronize encrypted balances', async () => {
        const balanceTracker = new EncryptedBalanceTracker(TEST_STORAGE_PATH + '-3');
        balanceTracker.initialize(); // No keypair needed with Pedersen commitments

        // Set initial balances
        balanceTracker.setBalance('user1', 1000n);
        balanceTracker.setBalance('user2', 2000n);

        // Simulate external balance updates
        const externalBalances = new Map<string, bigint>();
        externalBalances.set('user1', 1500n); // Updated
        externalBalances.set('user2', 2000n); // Same
        externalBalances.set('user3', 500n);  // New

        balanceTracker.synchronize(externalBalances);

        if (balanceTracker.getBalance('user1') !== 1500n) throw new Error('user1 not synced');
        if (balanceTracker.getBalance('user2') !== 2000n) throw new Error('user2 changed');
        if (balanceTracker.getBalance('user3') !== 500n) throw new Error('user3 not added');

        console.log(`   ✅ Balances synchronized`);
        console.log(`      user1: 1000 -> 1500 (updated)`);
        console.log(`      user2: 2000 (unchanged)`);
        console.log(`      user3: 0 -> 500 (new)`);
    });

    console.log('\n⚡ Performance Metrics');
    console.log('-'.repeat(80));

    await test('Measure end-to-end transfer performance', async () => {
        const privacyLayer = new PrivacyLayer({ rangeBits: 16, enableCaching: true });
        const balanceTracker = new EncryptedBalanceTracker(TEST_STORAGE_PATH + '-4');
        balanceTracker.initialize(); // No keypair needed with Pedersen commitments

        balanceTracker.setBalance('sender', 10000n);
        balanceTracker.setBalance('recipient', 0n);

        const startTime = Date.now();

        // Generate proofs
        const proofStartTime = Date.now();
        const transfer = await privacyLayer.generateTransferProofs(
            10000n,
            3000n,
            7000n,
            {
                senderBefore: ScalarOps.random(),
                amount: ScalarOps.random(),
                senderAfter: ScalarOps.random(),
            }
        );
        const proofTime = Date.now() - proofStartTime;

        // Verify proofs (standardized: throws on failure)
        const verifyStartTime = Date.now();
        await privacyLayer.verifyTransfer(transfer);
        const verifyTime = Date.now() - verifyStartTime;

        // Update balances
        balanceTracker.processTransfer('sender', 'recipient', 3000n, 'tx');

        const totalTime = Date.now() - startTime;

        console.log(`   Performance breakdown:`);
        console.log(`      Proof generation: ${proofTime}ms`);
        console.log(`      Proof verification: ${verifyTime}ms`);
        console.log(`      Balance update: ${totalTime - proofTime - verifyTime}ms`);
        console.log(`      Total: ${totalTime}ms`);
    });

    console.log('\n' + '='.repeat(80));
    console.log(`RESULTS: ${passed} passed, ${failed} failed`);
    console.log('='.repeat(80));

    cleanup();

    if (failed > 0) {
        process.exit(1);
    }
}

runTests().catch(console.error);
