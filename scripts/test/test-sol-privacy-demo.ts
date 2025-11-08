/**
 * Native SOL Privacy Demo
 * 
 * Demonstrates confidential SOL transfers with zero-knowledge proofs
 * This is a simplified demo showing the dual-mode capability
 */

import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { PrivacyLayer } from '../../src/privacy/PrivacyLayer';
import { ScalarOps, PedersenCommitment } from '../../src/crypto/zkproofs/primitives';

async function demoSOLPrivacy() {
    console.log('🔐 Native SOL Privacy Transfer Demo\n');
    console.log('This demonstrates how the privacy system works with native SOL\n');

    // Setup
    const sender = Keypair.generate();
    const recipient = Keypair.generate();

    console.log('📍 Test Accounts:');
    console.log(`   Sender: ${sender.publicKey.toBase58().slice(0, 8)}...`);
    console.log(`   Recipient: ${recipient.publicKey.toBase58().slice(0, 8)}...`);

    // Initialize privacy layer (same for tokens and SOL!)
    console.log('\n1️⃣ Initializing Privacy Layer...');
    const privacyLayer = new PrivacyLayer({
        rangeBits: 64, // 64-bit for lamport amounts
        enableCaching: true,
        enableParallel: true,
    });
    console.log('   ✅ Privacy layer ready (works for both tokens and SOL)');

    // Simulate SOL deposit
    console.log('\n2️⃣ Simulating SOL Deposit...');
    const depositAmount = 100; // 100 SOL
    const depositLamports = BigInt(depositAmount * LAMPORTS_PER_SOL);

    console.log(`   Amount: ${depositAmount} SOL`);
    console.log(`   Lamports: ${depositLamports}`);

    // Generate encrypted commitment
    const depositBlinding = ScalarOps.random();
    const depositCommitment = PedersenCommitment.commit(depositLamports, depositBlinding);

    console.log('   ✅ Encrypted commitment generated');
    console.log('   📦 Commitment would be stored on-chain (amount hidden!)');

    // Simulate confidential transfer
    console.log('\n3️⃣ Simulating Confidential SOL Transfer...');
    const transferAmount = 10; // 10 SOL
    const transferLamports = BigInt(transferAmount * LAMPORTS_PER_SOL);
    const senderAfter = depositLamports - transferLamports;

    console.log(`   Transfer: ${transferAmount} SOL`);
    console.log(`   Sender before: ${depositAmount} SOL`);
    console.log(`   Sender after: ${Number(senderAfter) / LAMPORTS_PER_SOL} SOL`);

    // Generate ZK proofs
    console.log('\n   🔐 Generating ZK proofs...');
    const blindings = {
        senderBefore: depositBlinding,
        amount: ScalarOps.random(),
        senderAfter: ScalarOps.random(),
    };

    const startTime = Date.now();
    const proofResult = await privacyLayer.generateTransferProofs(
        depositLamports,
        transferLamports,
        senderAfter,
        blindings
    );
    const proofTime = Date.now() - startTime;

    console.log(`   ✅ Proofs generated in ${proofTime}ms`);

    // Verify proofs (standardized: throws on failure)
    console.log('\n   🔍 Verifying proofs...');
    const verifyStart = Date.now();
    await privacyLayer.verifyTransfer(proofResult);
    const verifyTime = Date.now() - verifyStart;

    console.log(`   ✅ Proofs verified in ${verifyTime}ms`);

    // Generate new commitments
    const senderCommitment = PedersenCommitment.commit(senderAfter, blindings.senderAfter);
    const recipientCommitment = PedersenCommitment.commit(transferLamports, blindings.amount);

    console.log('\n   📦 New encrypted commitments:');
    console.log(`      Sender: ${Buffer.from(senderCommitment.toBytes()).slice(0, 8).toString('hex')}... (64 bytes)`);
    console.log(`      Recipient: ${Buffer.from(recipientCommitment.toBytes()).slice(0, 8).toString('hex')}... (64 bytes)`);

    // Summary
    console.log('\n📊 Summary:');
    console.log('   ✅ SOL deposit: Encrypted commitment generated');
    console.log('   ✅ Confidential transfer: ZK proofs generated and verified');
    console.log('   ✅ Privacy guaranteed: Amount hidden on-chain');
    console.log(`   ⚡ Performance: ${proofTime}ms generation, ${verifyTime}ms verification`);

    console.log('\n🎯 Key Points:');
    console.log('   • Same ZK proof system works for tokens AND native SOL');
    console.log('   • Transfer amounts are encrypted (Pedersen commitments)');
    console.log('   • ZK proofs verify correctness without revealing amounts');
    console.log('   • 64-bit range proofs support up to ~18 billion SOL');
    console.log('   • Addresses remain visible (regulatory compliance)');

    console.log('\n💡 On-Chain Implementation:');
    console.log('   • SOL held in escrow PDAs (Program Derived Addresses)');
    console.log('   • Encrypted commitments stored in encrypted_account');
    console.log('   • Transfers move SOL between escrows with ZK proofs');
    console.log('   • Same security model as Token-2022 mode');

    console.log('\n🎉 Native SOL Privacy Demo Complete!\n');
    console.log('The dual-mode wallet can support BOTH:');
    console.log('   1. Token-2022 transfers (existing implementation)');
    console.log('   2. Native SOL transfers (new implementation)');
    console.log('\nBoth modes use the same ZK proof infrastructure! 🚀\n');
}

// Run demo
demoSOLPrivacy().catch((error) => {
    console.error('❌ Demo failed:', error);
    process.exit(1);
});
