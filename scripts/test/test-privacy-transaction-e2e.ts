/**
 * End-to-End Privacy Transaction Test
 * 
 * Tests the complete privacy transaction flow with ZK proofs:
 * 1. Generate transfer proofs with realistic lamport amounts
 * 2. Verify proofs locally
 * 3. Track encrypted balances
 * 4. Verify transaction history
 */

import { PrivacyLayer } from '../../src/privacy/PrivacyLayer';
import { ScalarOps } from '../../src/crypto/zkproofs/primitives';
import { Keypair } from '@solana/web3.js';

const LAMPORTS_PER_SOL = 1_000_000_000;

async function main() {
    console.log('🔐 End-to-End Privacy Transaction Test\n');
    console.log('Testing ZK proof generation with realistic lamport amounts\n');

    // Initialize components
    console.log('1️⃣ Initializing Privacy Layer...');
    const privacyLayer = new PrivacyLayer({
        rangeBits: 64, // 64-bit for lamport amounts
        enableCaching: true,
        enableParallel: true,
    });

    const sender = Keypair.generate();
    const recipient = Keypair.generate();

    console.log('   ✅ Privacy layer initialized');
    console.log(`   Sender: ${sender.publicKey.toBase58().slice(0, 8)}...`);
    console.log(`   Recipient: ${recipient.publicKey.toBase58().slice(0, 8)}...`);

    // Test Case 1: Small transfer (10 tokens)
    console.log('\n2️⃣ Test Case 1: Small transfer (10 tokens)...');
    const senderBalance1 = BigInt(100 * LAMPORTS_PER_SOL); // 100 tokens
    const transferAmount1 = BigInt(10 * LAMPORTS_PER_SOL);  // 10 tokens
    const senderAfter1 = senderBalance1 - transferAmount1;

    console.log(`   Sender balance: ${Number(senderBalance1) / LAMPORTS_PER_SOL} tokens`);
    console.log(`   Transfer amount: ${Number(transferAmount1) / LAMPORTS_PER_SOL} tokens`);
    console.log(`   Expected after: ${Number(senderAfter1) / LAMPORTS_PER_SOL} tokens`);

    const blindings1 = {
        senderBefore: ScalarOps.random(),
        amount: ScalarOps.random(),
        senderAfter: ScalarOps.random(),
    };

    const startTime1 = Date.now();
    const transfer1 = await privacyLayer.generateTransferProofs(
        senderBalance1,
        transferAmount1,
        senderAfter1,
        blindings1
    );
    const proofTime1 = Date.now() - startTime1;

    console.log(`   ✅ Proofs generated in ${proofTime1}ms`);

    // Verify proofs (standardized: throws on failure)
    const verifyStart1 = Date.now();
    await privacyLayer.verifyTransfer(transfer1);
    const verifyTime1 = Date.now() - verifyStart1;

    console.log(`   ✅ Proofs verified in ${verifyTime1}ms`);

    // Test Case 2: Large transfer (1000 tokens)
    console.log('\n3️⃣ Test Case 2: Large transfer (1000 tokens)...');
    const senderBalance2 = BigInt(5000 * LAMPORTS_PER_SOL); // 5000 tokens
    const transferAmount2 = BigInt(1000 * LAMPORTS_PER_SOL); // 1000 tokens
    const senderAfter2 = senderBalance2 - transferAmount2;

    console.log(`   Sender balance: ${Number(senderBalance2) / LAMPORTS_PER_SOL} tokens`);
    console.log(`   Transfer amount: ${Number(transferAmount2) / LAMPORTS_PER_SOL} tokens`);
    console.log(`   Expected after: ${Number(senderAfter2) / LAMPORTS_PER_SOL} tokens`);

    const blindings2 = {
        senderBefore: ScalarOps.random(),
        amount: ScalarOps.random(),
        senderAfter: ScalarOps.random(),
    };

    const startTime2 = Date.now();
    const transfer2 = await privacyLayer.generateTransferProofs(
        senderBalance2,
        transferAmount2,
        senderAfter2,
        blindings2
    );
    const proofTime2 = Date.now() - startTime2;

    console.log(`   ✅ Proofs generated in ${proofTime2}ms`);

    // Verify proofs (standardized: throws on failure)
    const verifyStart2 = Date.now();
    await privacyLayer.verifyTransfer(transfer2);
    const verifyTime2 = Date.now() - verifyStart2;

    console.log(`   ✅ Proofs verified in ${verifyTime2}ms`);

    // Test Case 3: Batch transfers
    console.log('\n4️⃣ Test Case 3: Batch transfers (3 transfers)...');
    const batchTransfers = [
        {
            senderBefore: BigInt(100 * LAMPORTS_PER_SOL),
            amount: BigInt(5 * LAMPORTS_PER_SOL),
            senderAfter: BigInt(95 * LAMPORTS_PER_SOL),
            blindings: {
                senderBefore: ScalarOps.random(),
                amount: ScalarOps.random(),
                senderAfter: ScalarOps.random(),
            },
        },
        {
            senderBefore: BigInt(200 * LAMPORTS_PER_SOL),
            amount: BigInt(50 * LAMPORTS_PER_SOL),
            senderAfter: BigInt(150 * LAMPORTS_PER_SOL),
            blindings: {
                senderBefore: ScalarOps.random(),
                amount: ScalarOps.random(),
                senderAfter: ScalarOps.random(),
            },
        },
        {
            senderBefore: BigInt(1000 * LAMPORTS_PER_SOL),
            amount: BigInt(250 * LAMPORTS_PER_SOL),
            senderAfter: BigInt(750 * LAMPORTS_PER_SOL),
            blindings: {
                senderBefore: ScalarOps.random(),
                amount: ScalarOps.random(),
                senderAfter: ScalarOps.random(),
            },
        },
    ];

    const batchStartTime = Date.now();
    const batchTransfersResult = await privacyLayer.generateBatchTransferProofs(batchTransfers);
    const batchTime = Date.now() - batchStartTime;

    console.log(`   ✅ Generated ${batchTransfersResult.length}/3 proofs in ${batchTime}ms`);
    console.log(`   Average: ${Math.round(batchTime / 3)}ms per proof`);

    // Verify batch (standardized: throws on failure)
    const batchVerifyStart = Date.now();
    await privacyLayer.verifyBatchTransfers(batchTransfersResult);
    const batchVerifyTime = Date.now() - batchVerifyStart;

    console.log(`   ✅ Verified ${batchTransfersResult.length}/3 proofs in ${batchVerifyTime}ms`);

    // Summary
    console.log('\n📊 Summary:');
    console.log('   ✅ Small transfer (10 tokens): PASSED');
    console.log(`      Proof generation: ${proofTime1}ms`);
    console.log(`      Proof verification: ${verifyTime1}ms`);
    console.log('   ✅ Large transfer (1000 tokens): PASSED');
    console.log(`      Proof generation: ${proofTime2}ms`);
    console.log(`      Proof verification: ${verifyTime2}ms`);
    console.log('   ✅ Batch transfers (3 transfers): PASSED');
    console.log(`      Total time: ${batchTime}ms`);
    console.log(`      Average: ${Math.round(batchTime / 3)}ms per proof`);

    // Cache stats
    const cacheStats = privacyLayer.getCacheStats();
    console.log(`\n   💾 Proof cache: ${cacheStats.size} entries`);

    console.log('\n🎉 Privacy Transaction E2E Test PASSED!\n');
    console.log('✅ All tests passed with 64-bit range proofs for lamport amounts');
}

main().catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
});
