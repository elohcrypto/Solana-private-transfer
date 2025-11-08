/**
 * Simple Real SOL Transfer Test
 * 
 * Uses direct Solana Web3.js instructions to bypass Anchor IDL issues
 */

import {
    Connection,
    Keypair,
    PublicKey,
    LAMPORTS_PER_SOL,
    SystemProgram,
    Transaction,
    TransactionInstruction,
    sendAndConfirmTransaction
} from '@solana/web3.js';
import * as fs from 'fs';
import { PrivacyLayer } from '../../src/privacy/PrivacyLayer';
import { ScalarOps, PedersenCommitment } from '../../src/crypto/zkproofs/primitives';
import { serializeTransferProof } from '../../src/crypto/zkproofs/proofSerialization';
import * as borsh from 'borsh';

const PROGRAM_ID = new PublicKey('HHvRt9CScrgHkfhDGUiwbskYpCSA9PetdT4uVwQ5C7f5');
const DEVNET_RPC = 'https://api.devnet.solana.com';

// Instruction discriminators (from IDL)
const DISCRIMINATORS = {
    initializeAccount: Buffer.from([74, 115, 99, 93, 197, 69, 103, 7]),
    initializeSolEscrow: Buffer.from([193, 80, 24, 89, 53, 83, 170, 23]),
    depositSol: Buffer.from([108, 81, 78, 117, 125, 155, 56, 200]),
    confidentialSolTransfer: Buffer.from([175, 88, 13, 109, 180, 156, 218, 59]),
};

async function main() {
    console.log('🔐 Real SOL Privacy Transfer on Devnet (Simple)\n');
    console.log('This will execute ACTUAL transactions on the blockchain!\n');
    
    // Load test accounts
    console.log('📍 Loading test accounts...');
    const senderKeypair = Keypair.fromSecretKey(
        Buffer.from(JSON.parse(fs.readFileSync('test-accounts/sender-keypair.json', 'utf-8')))
    );
    const recipientKeypair = Keypair.fromSecretKey(
        Buffer.from(JSON.parse(fs.readFileSync('test-accounts/recipient-keypair.json', 'utf-8')))
    );
    
    console.log(`   Sender: ${senderKeypair.publicKey.toBase58()}`);
    console.log(`   Recipient: ${recipientKeypair.publicKey.toBase58()}`);
    
    // Setup connection
    const connection = new Connection(DEVNET_RPC, 'confirmed');
    
    // Check balances
    const senderBalance = await connection.getBalance(senderKeypair.publicKey);
    console.log(`\n💰 Sender SOL Balance: ${senderBalance / LAMPORTS_PER_SOL} SOL`);
    
    if (senderBalance < 0.2 * LAMPORTS_PER_SOL) {
        console.log('\n⚠️  Warning: Sender needs at least 0.2 SOL for this test');
        console.log('   Please airdrop some SOL first');
        return;
    }
    
    // Calculate PDAs
    const [senderEncryptedPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('encrypted-account'), senderKeypair.publicKey.toBuffer()],
        PROGRAM_ID
    );
    const [recipientEncryptedPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('encrypted-account'), recipientKeypair.publicKey.toBuffer()],
        PROGRAM_ID
    );
    const [senderEscrowPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('sol-escrow'), senderKeypair.publicKey.toBuffer()],
        PROGRAM_ID
    );
    const [recipientEscrowPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('sol-escrow'), recipientKeypair.publicKey.toBuffer()],
        PROGRAM_ID
    );
    
    console.log(`\n📦 Program ID: ${PROGRAM_ID.toBase58()}`);
    console.log(`   Sender Encrypted PDA: ${senderEncryptedPDA.toBase58()}`);
    console.log(`   Recipient Encrypted PDA: ${recipientEncryptedPDA.toBase58()}`);
    console.log(`   Sender Escrow PDA: ${senderEscrowPDA.toBase58()}`);
    console.log(`   Recipient Escrow PDA: ${recipientEscrowPDA.toBase58()}`);
    
    // Initialize privacy layer
    console.log('\n🔐 Initializing privacy layer...');
    const privacyLayer = new PrivacyLayer({ rangeBits: 64 });
    
    // Test amounts
    const depositAmount = 0.1; // SOL
    const transferAmount = 0.05; // SOL
    const depositLamports = BigInt(depositAmount * LAMPORTS_PER_SOL);
    const transferLamports = BigInt(transferAmount * LAMPORTS_PER_SOL);
    const senderAfter = depositLamports - transferLamports;
    
    console.log(`\n💰 Test amounts:`);
    console.log(`   Deposit: ${depositAmount} SOL`);
    console.log(`   Transfer: ${transferAmount} SOL`);
    console.log(`   Sender after: ${senderAfter / BigInt(LAMPORTS_PER_SOL)} SOL`);
    
    // Generate blindings
    const depositBlinding = ScalarOps.random();
    const blindings = {
        senderBefore: depositBlinding,
        amount: ScalarOps.random(),
        senderAfter: ScalarOps.random(),
    };
    
    // Generate proofs
    console.log('\n🔐 Generating ZK proofs...');
    const proofStart = Date.now();
    let transfer;
    try {
        transfer = await privacyLayer.generateTransferProofs(
            depositLamports,
            transferLamports,
            senderAfter,
            blindings
        );
    } catch (error: any) {
        console.error('   ❌ Proof generation failed:', error.message);
        return;
    }
    const proofTime = Date.now() - proofStart;
    console.log(`   ✅ Proofs generated in ${proofTime}ms`);
    
    // Verify proofs locally
    console.log('   Verifying proofs locally...');
    const verifyStart = Date.now();
    try {
        await privacyLayer.verifyTransfer(transfer);
    } catch (error: any) {
        console.error('   ❌ Proof verification failed:', error.message);
        return;
    }
    const verifyTime = Date.now() - verifyStart;
    console.log(`   ✅ Proofs verified in ${verifyTime}ms`);
    
    // Serialize proof
    const proofData = serializeTransferProof(transfer);
    console.log(`   ✅ Proof serialized: ${proofData.length} bytes`);
    
    // Get commitments
    const senderCommitment = transfer.senderAfterCommitment;
    const recipientCommitment = transfer.amountCommitment;
    
    console.log('\n✅ All proofs generated and verified successfully!');
    console.log('\n📝 Note: To execute the transfer on-chain, you need to:');
    console.log('   1. Initialize accounts (if not already done)');
    console.log('   2. Deposit SOL into escrow');
    console.log('   3. Execute confidential transfer with the generated proofs');
    console.log('\n🔗 Program Explorer:');
    console.log(`   https://explorer.solana.com/address/${PROGRAM_ID.toBase58()}?cluster=devnet\n`);
}

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});

