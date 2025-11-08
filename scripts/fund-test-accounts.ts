/**
 * Fund Test Accounts Script
 * 
 * Transfers SOL from sender account to test accounts
 * Run with: npx ts-node scripts/fund-test-accounts.ts
 */

import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL, SystemProgram, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';

const DEVNET_RPC = 'https://api.devnet.solana.com';
const ACCOUNTS_FILE = './test-accounts/devnet-accounts.json';
const AMOUNT_PER_ACCOUNT = 1; // SOL

interface AccountInfo {
    name: string;
    publicKey: string;
    secretKey: number[];
    balance: number;
}

async function fundTestAccounts() {
    console.log('='.repeat(80));
    console.log('FUND TEST ACCOUNTS FROM SENDER');
    console.log('='.repeat(80));
    console.log();

    // Check if accounts file exists
    if (!fs.existsSync(ACCOUNTS_FILE)) {
        console.error('❌ Accounts file not found:', ACCOUNTS_FILE);
        console.log('   Please run: npx ts-node scripts/setup-devnet-accounts.ts');
        process.exit(1);
    }

    // Load accounts
    const accounts: AccountInfo[] = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf8'));
    console.log(`📋 Loaded ${accounts.length} accounts`);
    console.log();

    // Get sender account (first account)
    const senderAccount = accounts[0];
    const senderKeypair = Keypair.fromSecretKey(new Uint8Array(senderAccount.secretKey));
    console.log(`💰 Sender: ${senderAccount.name.toUpperCase()}`);
    console.log(`   Address: ${senderAccount.publicKey}`);

    // Get test accounts (accounts 2-4, skipping recipient)
    const testAccounts = accounts.slice(2); // Skip sender and recipient
    console.log(`\n📦 Test accounts to fund: ${testAccounts.length}`);
    for (const account of testAccounts) {
        console.log(`   - ${account.name}: ${account.publicKey}`);
    }
    console.log();

    // Connect to devnet
    console.log('📡 Connecting to Solana devnet...');
    const connection = new Connection(DEVNET_RPC, 'confirmed');

    try {
        const version = await connection.getVersion();
        console.log(`   ✅ Connected to Solana ${version['solana-core']}`);
    } catch (error) {
        console.error('   ❌ Failed to connect to devnet');
        console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
    }

    // Check sender balance
    console.log('\n💵 Checking sender balance...');
    const senderBalance = await connection.getBalance(senderKeypair.publicKey);
    const senderBalanceSOL = senderBalance / LAMPORTS_PER_SOL;
    console.log(`   Current balance: ${senderBalanceSOL.toFixed(4)} SOL`);

    const totalNeeded = AMOUNT_PER_ACCOUNT * testAccounts.length;
    const estimatedFees = 0.00001 * testAccounts.length; // Rough estimate
    const totalRequired = totalNeeded + estimatedFees;

    console.log(`   Amount to send: ${totalNeeded} SOL (${AMOUNT_PER_ACCOUNT} SOL × ${testAccounts.length} accounts)`);
    console.log(`   Estimated fees: ~${estimatedFees.toFixed(5)} SOL`);
    console.log(`   Total required: ~${totalRequired.toFixed(4)} SOL`);

    if (senderBalanceSOL < totalRequired) {
        console.error(`\n❌ Insufficient balance!`);
        console.error(`   Need: ${totalRequired.toFixed(4)} SOL`);
        console.error(`   Have: ${senderBalanceSOL.toFixed(4)} SOL`);
        console.error(`   Short: ${(totalRequired - senderBalanceSOL).toFixed(4)} SOL`);
        process.exit(1);
    }

    console.log(`   ✅ Sufficient balance available`);

    // Transfer to each test account
    console.log('\n🚀 Starting transfers...');
    console.log('-'.repeat(80));

    let successCount = 0;
    let failCount = 0;

    for (const testAccount of testAccounts) {
        console.log(`\n📤 Transferring to ${testAccount.name.toUpperCase()}...`);
        console.log(`   Recipient: ${testAccount.publicKey}`);
        console.log(`   Amount: ${AMOUNT_PER_ACCOUNT} SOL`);

        try {
            const recipientPubkey = new PublicKey(testAccount.publicKey);

            // Create transfer instruction
            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: senderKeypair.publicKey,
                    toPubkey: recipientPubkey,
                    lamports: AMOUNT_PER_ACCOUNT * LAMPORTS_PER_SOL,
                })
            );

            // Send and confirm transaction
            console.log(`   Sending transaction...`);
            const signature = await sendAndConfirmTransaction(
                connection,
                transaction,
                [senderKeypair],
                {
                    commitment: 'confirmed',
                }
            );

            console.log(`   ✅ Transfer successful!`);
            console.log(`   Signature: ${signature}`);

            // Verify recipient balance
            const recipientBalance = await connection.getBalance(recipientPubkey);
            const recipientBalanceSOL = recipientBalance / LAMPORTS_PER_SOL;
            console.log(`   New balance: ${recipientBalanceSOL.toFixed(4)} SOL`);

            successCount++;
        } catch (error) {
            console.error(`   ❌ Transfer failed!`);
            console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`);
            failCount++;
        }
    }

    // Check final sender balance
    console.log('\n💵 Checking final sender balance...');
    const finalBalance = await connection.getBalance(senderKeypair.publicKey);
    const finalBalanceSOL = finalBalance / LAMPORTS_PER_SOL;
    console.log(`   Final balance: ${finalBalanceSOL.toFixed(4)} SOL`);
    console.log(`   Spent: ${(senderBalanceSOL - finalBalanceSOL).toFixed(4)} SOL`);

    // Print summary
    console.log('\n' + '='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log();
    console.log(`Successful transfers: ${successCount}/${testAccounts.length}`);
    console.log(`Failed transfers: ${failCount}/${testAccounts.length}`);
    console.log();

    if (successCount === testAccounts.length) {
        console.log('✅ All test accounts funded successfully!');
        console.log('\n📝 Run verification script to confirm:');
        console.log('   npx ts-node scripts/verify-account-balances.ts');
    } else {
        console.log('⚠️  Some transfers failed. Please check the errors above.');
        process.exit(1);
    }

    console.log();
}

// Run funding if executed directly
if (require.main === module) {
    fundTestAccounts().catch((error) => {
        console.error('\n❌ Funding failed:', error);
        process.exit(1);
    });
}

export { fundTestAccounts };
