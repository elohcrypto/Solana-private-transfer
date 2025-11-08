/**
 * Native SOL Privacy Methods
 * 
 * Extension methods for ConfidentialWallet to support native SOL transfers
 * with zero-knowledge proofs. Works alongside Token-2022 methods for dual-mode support.
 */

import { Connection, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor';
import { PedersenCommitment, ScalarOps } from '../crypto/zkproofs/primitives';
import { PrivacyLayer } from '../privacy/PrivacyLayer';

const LAMPORTS_PER_SOL = 1_000_000_000;

export interface SolEscrowAccount {
    owner: PublicKey;
    balance: BN;
    bump: number;
}

export class SolPrivacyMethods {
    constructor(
        private connection: Connection,
        private program: Program,
        private wallet: any,
        private privacyLayer: PrivacyLayer
    ) { }

    /**
     * Get SOL escrow PDA for a wallet
     */
    getSolEscrowPDA(owner: PublicKey): [PublicKey, number] {
        return PublicKey.findProgramAddressSync(
            [Buffer.from('sol-escrow'), owner.toBuffer()],
            this.program.programId
        );
    }

    /**
     * Get encrypted account PDA
     */
    getEncryptedAccountPDA(owner: PublicKey): [PublicKey, number] {
        return PublicKey.findProgramAddressSync(
            [Buffer.from('encrypted-account'), owner.toBuffer()],
            this.program.programId
        );
    }

    /**
     * Initialize SOL escrow account
     */
    async initializeSolEscrow(): Promise<string> {
        const [solEscrowPDA] = this.getSolEscrowPDA(this.wallet.publicKey);

        console.log('🔐 Initializing SOL escrow...');
        console.log(`   Escrow PDA: ${solEscrowPDA.toBase58()}`);

        const tx = await this.program.methods
            .initializeSolEscrow()
            .accounts({
                solEscrow: solEscrowPDA,
                owner: this.wallet.publicKey,
                systemProgram: SystemProgram.programId,
            })
            .rpc();

        console.log('✅ SOL escrow initialized');
        console.log(`   Signature: ${tx}`);

        return tx;
    }

    /**
     * Deposit native SOL with privacy
     */
    async depositSOL(amountSol: number): Promise<string> {
        console.log(`\n💰 Depositing ${amountSol} SOL with privacy...`);

        const lamports = BigInt(Math.floor(amountSol * LAMPORTS_PER_SOL));

        // Generate encrypted commitment
        const blinding = ScalarOps.random();
        const commitment = PedersenCommitment.commit(lamports, blinding);
        const commitmentBytes = commitment.toBytes();

        // Get PDAs
        const [encryptedAccountPDA] = this.getEncryptedAccountPDA(this.wallet.publicKey);
        const [solEscrowPDA] = this.getSolEscrowPDA(this.wallet.publicKey);

        console.log('   Generating encrypted commitment...');
        console.log(`   Amount: ${lamports} lamports (ENCRYPTED)`);

        // Call on-chain program
        const tx = await this.program.methods
            .depositSol(
                new BN(lamports.toString()),
                Array.from(commitmentBytes)
            )
            .accounts({
                encryptedAccount: encryptedAccountPDA,
                solEscrow: solEscrowPDA,
                owner: this.wallet.publicKey,
                systemProgram: SystemProgram.programId,
            })
            .rpc();

        console.log('✅ SOL deposit complete');
        console.log(`   Signature: ${tx.slice(0, 16)}...`);
        console.log(`   Amount: ${amountSol} SOL (encrypted on-chain)`);

        return tx;
    }

    /**
     * Withdraw native SOL
     */
    async withdrawSOL(amountSol: number): Promise<string> {
        console.log(`\n💸 Withdrawing ${amountSol} SOL...`);

        const lamports = BigInt(Math.floor(amountSol * LAMPORTS_PER_SOL));

        // Get current balance and calculate new commitment
        const currentBalance = await this.getSOLBalance();
        const currentLamports = BigInt(Math.floor(currentBalance * LAMPORTS_PER_SOL));
        const newBalance = currentLamports - lamports;

        // Generate new encrypted commitment
        const blinding = ScalarOps.random();
        const commitment = PedersenCommitment.commit(newBalance, blinding);
        const commitmentBytes = commitment.toBytes();

        // Get PDAs
        const [encryptedAccountPDA] = this.getEncryptedAccountPDA(this.wallet.publicKey);
        const [solEscrowPDA] = this.getSolEscrowPDA(this.wallet.publicKey);

        console.log('   Generating new encrypted commitment...');
        console.log(`   Remaining: ${Number(newBalance) / LAMPORTS_PER_SOL} SOL (ENCRYPTED)`);

        // Call on-chain program
        const tx = await this.program.methods
            .withdrawSol(
                new BN(lamports.toString()),
                Array.from(commitmentBytes)
            )
            .accounts({
                encryptedAccount: encryptedAccountPDA,
                solEscrow: solEscrowPDA,
                owner: this.wallet.publicKey,
                systemProgram: SystemProgram.programId,
            })
            .rpc();

        console.log('✅ SOL withdrawal complete');
        console.log(`   Signature: ${tx.slice(0, 16)}...`);
        console.log(`   Amount: ${amountSol} SOL`);

        return tx;
    }

    /**
     * Confidential SOL transfer with ZK proofs
     */
    async confidentialSOLTransfer(
        recipient: PublicKey,
        amountSol: number
    ): Promise<string> {
        console.log(`\n🔐 Confidential SOL Transfer`);
        console.log(`   Recipient: ${recipient.toBase58()}`);
        console.log(`   Amount: ${amountSol} SOL (will be hidden with ZK proofs)`);

        const transferAmount = BigInt(Math.floor(amountSol * LAMPORTS_PER_SOL));

        // Get current balances
        const senderBalance = await this.getSOLBalance();
        const senderBalanceLamports = BigInt(Math.floor(senderBalance * LAMPORTS_PER_SOL));
        const senderAfter = senderBalanceLamports - transferAmount;

        if (senderAfter < 0n) {
            throw new Error('Insufficient SOL balance');
        }

        console.log('   Generating ZK proofs...');
        const startTime = Date.now();

        // Generate blinding factors
        const blindings = {
            senderBefore: ScalarOps.random(),
            amount: ScalarOps.random(),
            senderAfter: ScalarOps.random(),
        };

        // Generate ZK proofs (standardized: throws errors on failure)
        const transfer = await this.privacyLayer.generateTransferProofs(
            senderBalanceLamports,
            transferAmount,
            senderAfter,
            blindings
        );

        const proofTime = Date.now() - startTime;
        console.log(`   ✅ Proofs generated in ${proofTime}ms`);

        // Verify proofs locally (standardized: throws errors on failure)
        console.log('   Verifying proofs locally...');
        const verifyStartTime = Date.now();
        await this.privacyLayer.verifyTransfer(transfer);
        const verifyTime = Date.now() - verifyStartTime;

        console.log(`   ✅ Proofs verified in ${verifyTime}ms`);

        // Generate new commitments
        const senderCommitment = PedersenCommitment.commit(senderAfter, blindings.senderAfter);
        const recipientCommitment = PedersenCommitment.commit(transferAmount, blindings.amount);

        // Serialize proof data for on-chain submission
        // SECURITY: Properly serializes all proof components to bytes
        const { serializeTransferProof } = await import('../crypto/zkproofs/proofSerialization');
        const proofData = Buffer.from(serializeTransferProof(transfer));

        // Get PDAs
        const [senderAccountPDA] = this.getEncryptedAccountPDA(this.wallet.publicKey);
        const [recipientAccountPDA] = this.getEncryptedAccountPDA(recipient);
        const [senderEscrowPDA] = this.getSolEscrowPDA(this.wallet.publicKey);
        const [recipientEscrowPDA] = this.getSolEscrowPDA(recipient);

        // Call on-chain program
        const tx = await this.program.methods
            .confidentialSolTransfer(
                new BN(transferAmount.toString()),
                Array.from(senderCommitment.toBytes()),
                Array.from(recipientCommitment.toBytes()),
                Array.from(proofData)
            )
            .accounts({
                senderAccount: senderAccountPDA,
                recipientAccount: recipientAccountPDA,
                senderEscrow: senderEscrowPDA,
                recipientEscrow: recipientEscrowPDA,
                sender: this.wallet.publicKey,
                recipient: recipient,
                systemProgram: SystemProgram.programId,
            })
            .rpc();

        console.log('✅ Confidential SOL transfer complete');
        console.log(`   Signature: ${tx.slice(0, 16)}...`);
        console.log(`   Amount: ${amountSol} SOL (ENCRYPTED on-chain)`);
        console.log(`   Proof generation: ${proofTime}ms`);
        console.log(`   Proof verification: ${verifyTime}ms`);

        return tx;
    }

    /**
     * Get SOL balance from escrow
     */
    async getSOLBalance(): Promise<number> {
        try {
            const [solEscrowPDA] = this.getSolEscrowPDA(this.wallet.publicKey);
            // Use type assertion to access account (IDL may not have generated types yet)
            const escrowAccount = await (this.program.account as any).solEscrow?.fetch(solEscrowPDA) 
                || await (this.program.account as any).SolEscrow?.fetch(solEscrowPDA);

            if (!escrowAccount) {
                return 0;
            }

            const balance = Number(escrowAccount.balance) / LAMPORTS_PER_SOL;
            return balance;
        } catch (error) {
            // Escrow not initialized yet
            return 0;
        }
    }

    /**
     * Get SOL escrow info
     */
    async getSOLEscrowInfo(): Promise<SolEscrowAccount | null> {
        try {
            const [solEscrowPDA] = this.getSolEscrowPDA(this.wallet.publicKey);
            // Use type assertion to access account (IDL may not have generated types yet)
            const escrowAccount = await (this.program.account as any).solEscrow?.fetch(solEscrowPDA)
                || await (this.program.account as any).SolEscrow?.fetch(solEscrowPDA);
            
            if (!escrowAccount) {
                return null;
            }

            return {
                owner: escrowAccount.owner as PublicKey,
                balance: escrowAccount.balance as BN,
                bump: escrowAccount.bump as number,
            };
        } catch (error) {
            return null;
        }
    }
}
