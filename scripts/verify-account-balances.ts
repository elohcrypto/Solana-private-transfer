/**
 * Verify Account Balances Script
 * 
 * Checks that all devnet accounts have the required SOL balance
 * Run with: npx ts-node scripts/verify-account-balances.ts
 */

import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';

const DEVNET_RPC = 'https://api.devnet.solana.com';
const ACCOUNTS_FILE = './test-accounts/devnet-accounts.json';
const REQUIRED_BALANCE = 5; // SOL

interface AccountInfo {
    name: string;
    publicKey: string;
    secretKey: number[];
    balance: number;
}

async function verifyAccountBalances() {
    console.log('='.repeat(80));
    console.log('VERIFY DEVNET ACCOUNT BALANCES');
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
    console.log(`📋 Loaded ${accounts.length} accounts from ${ACCOUNTS_FILE}`);
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

    console.log();
    console.log('💰 Checking account balances...');
    console.log('-'.repeat(80));

    let allAccountsReady = true;
    const accountStatuses: Array<{
        name: string;
        address: string;
        balance: number;
        ready: boolean;
    }> = [];

    for (const account of accounts) {
        const pubkey = new PublicKey(account.publicKey);

        try {
            const balance = await connection.getBalance(pubkey);
            const balanceSOL = balance / LAMPORTS_PER_SOL;
            const ready = balanceSOL >= REQUIRED_BALANCE;

            accountStatuses.push({
                name: account.name,
                address: account.publicKey,
                balance: balanceSOL,
                ready,
            });

            const status = ready ? '✅' : '❌';
            const message = ready
                ? `${balanceSOL.toFixed(2)} SOL (Ready)`
                : `${balanceSOL.toFixed(2)} SOL (Need ${(REQUIRED_BALANCE - balanceSOL).toFixed(2)} more)`;

            console.log(`${status} ${account.name.toUpperCase()}`);
            console.log(`   Address: ${account.publicKey}`);
            console.log(`   Balance: ${message}`);
            console.log();

            if (!ready) {
                allAccountsReady = false;
            }
        } catch (error) {
            console.error(`❌ ${account.name.toUpperCase()}`);
            console.error(`   Error checking balance: ${error instanceof Error ? error.message : String(error)}`);
            console.log();
            allAccountsReady = false;
        }
    }

    // Print summary
    console.log('='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log();

    const readyCount = accountStatuses.filter(a => a.ready).length;
    const totalCount = accountStatuses.length;

    console.log(`Accounts ready: ${readyCount}/${totalCount}`);
    console.log(`Required balance: ${REQUIRED_BALANCE} SOL per account`);
    console.log();

    if (allAccountsReady) {
        console.log('✅ All accounts have sufficient balance!');
        console.log('   Ready to proceed with Task 15 testing.');
    } else {
        console.log('❌ Some accounts need more SOL');
        console.log();
        console.log('📝 To airdrop SOL to accounts:');
        console.log();

        for (const status of accountStatuses) {
            if (!status.ready) {
                const needed = Math.ceil(REQUIRED_BALANCE - status.balance);
                console.log(`   solana airdrop ${needed} ${status.address} --url devnet`);
            }
        }

        console.log();
        console.log('   Or use the web faucet: https://faucet.solana.com/');
        console.log();
        console.log('   After airdropping, run this script again to verify.');
        process.exit(1);
    }

    console.log();
}

// Run verification if executed directly
if (require.main === module) {
    verifyAccountBalances().catch((error) => {
        console.error('\n❌ Verification failed:', error);
        process.exit(1);
    });
}

export { verifyAccountBalances };
