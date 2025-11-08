/**
 * Setup Devnet Accounts Script
 * 
 * Creates sender and recipient accounts on Solana devnet with airdropped SOL
 * Run with: npx ts-node scripts/setup-devnet-accounts.ts
 */

import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';

const DEVNET_RPC = 'https://api.devnet.solana.com';
const ACCOUNTS_DIR = './test-accounts';
const AIRDROP_AMOUNT = 2; // SOL per account

interface AccountInfo {
    name: string;
    publicKey: string;
    secretKey: number[];
    balance: number;
}

async function setupDevnetAccounts() {
    console.log('='.repeat(80));
    console.log('SOLANA DEVNET ACCOUNT SETUP');
    console.log('='.repeat(80));
    console.log();

    // Create connection to devnet
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

    // Create accounts directory
    if (!fs.existsSync(ACCOUNTS_DIR)) {
        fs.mkdirSync(ACCOUNTS_DIR, { recursive: true });
        console.log(`📁 Created directory: ${ACCOUNTS_DIR}`);
    }

    const accounts: AccountInfo[] = [];

    // Create sender account
    console.log('\n👤 Creating SENDER account...');
    const sender = await createAndFundAccount(connection, 'sender', AIRDROP_AMOUNT);
    accounts.push(sender);

    // Create recipient account
    console.log('\n👤 Creating RECIPIENT account...');
    const recipient = await createAndFundAccount(connection, 'recipient', AIRDROP_AMOUNT);
    accounts.push(recipient);

    // Create additional test accounts
    console.log('\n👥 Creating additional test accounts...');
    for (let i = 1; i <= 3; i++) {
        console.log(`\n   Account ${i}:`);
        const account = await createAndFundAccount(connection, `test-account-${i}`, AIRDROP_AMOUNT);
        accounts.push(account);
    }

    // Save all accounts to file
    const accountsFile = path.join(ACCOUNTS_DIR, 'devnet-accounts.json');
    fs.writeFileSync(accountsFile, JSON.stringify(accounts, null, 2));
    console.log(`\n💾 Saved all accounts to: ${accountsFile}`);

    // Create individual keypair files
    for (const account of accounts) {
        const keypairFile = path.join(ACCOUNTS_DIR, `${account.name}-keypair.json`);
        fs.writeFileSync(keypairFile, JSON.stringify(account.secretKey));
        console.log(`   Saved ${account.name} keypair to: ${keypairFile}`);
    }

    // Print summary
    console.log('\n' + '='.repeat(80));
    console.log('SETUP COMPLETE');
    console.log('='.repeat(80));
    console.log('\nAccounts created:');
    for (const account of accounts) {
        console.log(`\n${account.name.toUpperCase()}:`);
        console.log(`   Public Key: ${account.publicKey}`);
        console.log(`   Balance: ${account.balance} SOL`);
    }

    console.log('\n📝 Usage in tests:');
    console.log('   const accounts = JSON.parse(fs.readFileSync("./test-accounts/devnet-accounts.json", "utf8"));');
    console.log('   const senderKeypair = Keypair.fromSecretKey(new Uint8Array(accounts[0].secretKey));');
    console.log('   const recipientPubkey = new PublicKey(accounts[1].publicKey);');

    console.log('\n✅ Ready for Task 15 testing on Solana devnet!');
    console.log();
}

async function createAndFundAccount(
    connection: Connection,
    name: string,
    airdropAmount: number
): Promise<AccountInfo> {
    // Generate new keypair
    const keypair = Keypair.generate();
    console.log(`   Generated keypair: ${keypair.publicKey.toBase58()}`);

    // Check current balance
    const balance = await connection.getBalance(keypair.publicKey);
    const balanceSOL = balance / LAMPORTS_PER_SOL;
    console.log(`   Current balance: ${balanceSOL} SOL`);
    console.log(`   ⚠️  Please manually airdrop ${airdropAmount} SOL to this address`);

    return {
        name,
        publicKey: keypair.publicKey.toBase58(),
        secretKey: Array.from(keypair.secretKey),
        balance: balanceSOL,
    };
}

// Helper function to load accounts
export function loadDevnetAccounts(): AccountInfo[] {
    const accountsFile = path.join(ACCOUNTS_DIR, 'devnet-accounts.json');
    if (!fs.existsSync(accountsFile)) {
        throw new Error(`Accounts file not found: ${accountsFile}. Run setup-devnet-accounts.ts first.`);
    }
    return JSON.parse(fs.readFileSync(accountsFile, 'utf8'));
}

// Helper function to get keypair from account info
export function getKeypairFromAccount(account: AccountInfo): Keypair {
    return Keypair.fromSecretKey(new Uint8Array(account.secretKey));
}

// Helper function to check account balances
export async function checkAccountBalances(connection: Connection, accounts: AccountInfo[]): Promise<void> {
    console.log('\n💰 Checking account balances...');
    for (const account of accounts) {
        const pubkey = new PublicKey(account.publicKey);
        const balance = await connection.getBalance(pubkey);
        const balanceSOL = balance / LAMPORTS_PER_SOL;
        console.log(`   ${account.name}: ${balanceSOL} SOL`);
    }
}

// Run setup if executed directly
if (require.main === module) {
    setupDevnetAccounts().catch((error) => {
        console.error('\n❌ Setup failed:', error);
        process.exit(1);
    });
}
