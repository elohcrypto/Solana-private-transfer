/**
 * Privacy Transfer Program Client
 * 
 * TypeScript client to interact with our custom Anchor program
 * for on-chain encrypted transfers
 */

import { Connection, Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import { PrivacyLayer } from '../src/privacy/PrivacyLayer';
import { ScalarOps } from '../src/crypto/zkproofs/primitives';

// Program ID - Deployed to Solana Devnet
const PROGRAM_ID = new PublicKey('DwBEX4CiNhpMG4cGzem9cvJgTdW17myKD1hZM6D9SG3v');

export class PrivacyProgramClient {
    private connection: Connection;
    private privacyLayer: PrivacyLayer;

    constructor(connection: Connection) {
        this.connection = connection;
        this.privacyLayer = new PrivacyLayer({
            rangeBits: 32,
            enableCaching: true,
            enableParallel: true,
        });
    }

    /**
     * Get the PDA for an encrypted account
     */
    getEncryptedAccountPDA(owner: PublicKey): [PublicKey, number] {
        return PublicKey.findProgramAddressSync(
            [Buffer.from('encrypted-account'), owner.toBuffer()],
            PROGRAM_ID
        );
    }

    /**
     * Initialize an encrypted account for a user
     */
    async initializeAccount(
        owner: Keypair
    ): Promise<string> {
        const [encryptedAccountPDA] = this.getEncryptedAccountPDA(owner.publicKey);

        console.log('🔐 Initializing encrypted account...');
        console.log(`   Owner: ${owner.publicKey.toBase58()}`);
        console.log(`   PDA: ${encryptedAccountPDA.toBase58()}`);

        // Create instruction data
        const instruction = {
            accounts: {
                encryptedAccount: encryptedAccountPDA,
                owner: owner.publicKey,
                systemProgram: SystemProgram.programId,
            },
            signers: [owner],
        };

        // In a real implementation, we would use the Anchor program
        // For now, we'll simulate the account creation
        console.log('   ✅ Account initialized (simulated)');

        return encryptedAccountPDA.toBase58();
    }

    /**
     * Deposit funds and create initial encrypted balance
     */
    async deposit(
        owner: Keypair,
        amount: bigint
    ): Promise<string> {
        const [encryptedAccountPDA] = this.getEncryptedAccountPDA(owner.publicKey);

        console.log('💰 Depositing funds...');
        console.log(`   Amount: ${amount} lamports`);
        console.log(`   Account: ${encryptedAccountPDA.toBase58()}`);

        // Generate Pedersen commitment for the amount
        const blinding = ScalarOps.random();
        const { PedersenCommitment } = await import('../src/crypto/zkproofs/primitives');
        const commitment = PedersenCommitment.commit(amount, blinding);

        // Serialize commitment (X and Y coordinates)
        const commitmentBytes = commitment.toBytes();
        const commitmentX = commitmentBytes.slice(0, 32);
        const commitmentY = commitmentBytes.slice(32, 64);

        console.log(`   Commitment created (encrypted)`);
        console.log(`   ✅ Deposit completed (simulated)`);

        return 'deposit-signature-simulated';
    }

    /**
     * Perform a confidential transfer
     */
    async confidentialTransfer(
        sender: Keypair,
        recipient: PublicKey,
        amount: bigint,
        senderBalance: bigint
    ): Promise<string> {
        const [senderPDA] = this.getEncryptedAccountPDA(sender.publicKey);
        const [recipientPDA] = this.getEncryptedAccountPDA(recipient);

        console.log('🔒 Confidential Transfer...');
        console.log(`   From: ${sender.publicKey.toBase58()}`);
        console.log(`   To: ${recipient.toBase58()}`);
        console.log(`   Amount: ${amount} lamports (encrypted)`);

        // Calculate new balances
        const senderNewBalance = senderBalance - amount;

        // Generate commitments for new balances
        const senderBlinding = ScalarOps.random();
        const recipientBlinding = ScalarOps.random();

        const { PedersenCommitment } = await import('../src/crypto/zkproofs/primitives');
        const senderCommitment = PedersenCommitment.commit(senderNewBalance, senderBlinding);
        const recipientCommitment = PedersenCommitment.commit(amount, recipientBlinding);

        // Generate ZK proofs
        console.log('   Generating ZK proofs...');
        const startTime = Date.now();

        const blindings = {
            senderBefore: ScalarOps.random(),
            amount: ScalarOps.random(),
            senderAfter: senderBlinding,
        };

        const transfer = await this.privacyLayer.generateTransferProofs(
            senderBalance,
            amount,
            senderNewBalance,
            blindings
        );

        const proofTime = Date.now() - startTime;
        console.log(`   ✅ Proofs generated in ${proofTime}ms`);

        // Verify proofs locally
        console.log('   Verifying proofs...');
        const verifyStartTime = Date.now();
        await this.privacyLayer.verifyTransfer(transfer);
        const verifyTime = Date.now() - verifyStartTime;

        console.log(`   ✅ Proofs verified in ${verifyTime}ms`);

        // Serialize proof data
        const proofData = this.serializeProofs(transfer);
        console.log(`   Proof data: ${proofData.length} bytes`);

        // In a real implementation, we would send this to the Anchor program
        console.log('   ✅ Transfer completed (simulated)');
        console.log(`   Sender new balance: ${senderNewBalance} lamports (encrypted)`);
        console.log(`   Recipient received: ${amount} lamports (encrypted)`);

        return 'transfer-signature-simulated';
    }

    /**
     * Withdraw funds (decrypt and convert to plaintext)
     */
    async withdraw(
        owner: Keypair,
        amount: bigint,
        currentBalance: bigint
    ): Promise<string> {
        const [encryptedAccountPDA] = this.getEncryptedAccountPDA(owner.publicKey);

        console.log('📤 Withdrawing funds...');
        console.log(`   Amount: ${amount} lamports`);
        console.log(`   Account: ${encryptedAccountPDA.toBase58()}`);

        const newBalance = currentBalance - amount;

        // Generate commitment for new balance
        const blinding = ScalarOps.random();
        const { PedersenCommitment } = await import('../src/crypto/zkproofs/primitives');
        const commitment = PedersenCommitment.commit(newBalance, blinding);

        console.log(`   New balance: ${newBalance} lamports (encrypted)`);
        console.log(`   ✅ Withdrawal completed (simulated)`);

        return 'withdraw-signature-simulated';
    }

    /**
     * Get encrypted account info
     */
    async getEncryptedAccount(owner: PublicKey): Promise<any> {
        const [encryptedAccountPDA] = this.getEncryptedAccountPDA(owner);

        // In a real implementation, we would fetch from the program
        return {
            address: encryptedAccountPDA.toBase58(),
            owner: owner.toBase58(),
            commitment: 'encrypted',
            version: 0,
        };
    }

    /**
     * Serialize proofs for on-chain storage
     * 
     * SECURITY: Properly serializes all proof components to bytes
     * Format matches Rust deserialization in proof_verification.rs
     */
    private serializeProofs(transfer: any): Buffer {
        // Import proof serialization utility
        const { serializeTransferProof } = require('../src/crypto/zkproofs/proofSerialization');
        
        // Serialize complete transfer proof
        const proofBytes = serializeTransferProof(transfer);
        
        return Buffer.from(proofBytes);
    }
}

export default PrivacyProgramClient;
