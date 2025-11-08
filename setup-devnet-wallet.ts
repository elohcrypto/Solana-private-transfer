/**
 * Setup Persistent Devnet Wallet
 * 
 * This creates a wallet that can be funded once and reused for all tests
 */

import { Keypair, Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';

console.log('🔑 Setting Up Persistent Devnet Wallet\n');
console.log('═'.repeat(70));
console.log();

const WALLET_FILE = '.devnet-wallet.json';

async function main() {
    let wallet: Keypair;

    // Check if wallet already exists
    if (fs.existsSync(WALLET_FILE)) {
        console.log('📂 Found existing wallet file');
        const secretKey = JSON.parse(fs.readFileSync(WALLET_FILE, 'utf-8'));
        wallet = Keypair.fromSecretKey(Uint8Array.from(secretKey));
        console.log('✅ Loaded existing wallet');
    } else {
        console.log('🆕 Creating new wallet');
        wallet = Keypair.generate();
        fs.writeFileSync(WALLET_FILE, JSON.stringify(Array.from(wallet.secretKey)));
        console.log('✅ Wallet created and saved');
    }

    console.log();
    console.log('═'.repeat(70));
    console.log('📋 Wallet Information');
    console.log('═'.repeat(70));
    console.log();
    console.log(`Address: ${wallet.publicKey.toBase58()}`);
    console.log();

    // Check balance
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    const balance = await connection.getBalance(wallet.publicKey);

    console.log(`Current Balance: ${balance / LAMPORTS_PER_SOL} SOL`);
    console.log();

    if (balance === 0) {
        console.log('═'.repeat(70));
        console.log('💰 Fund This Wallet');
        console.log('═'.repeat(70));
        console.log();
        console.log('Option 1: Solana CLI');
        console.log(`   solana airdrop 2 ${wallet.publicKey.toBase58()} --url devnet`);
        console.log();
        console.log('Option 2: Web Faucet');
        console.log(`   https://faucet.solana.com`);
        console.log(`   Paste address: ${wallet.publicKey.toBase58()}`);
        console.log();
        console.log('Option 3: QuickNode Faucet');
        console.log(`   https://faucet.quicknode.com/solana/devnet`);
        console.log();
        console.log('Option 4: SolFaucet');
        console.log(`   https://solfaucet.com`);
        console.log();
    } else {
        console.log('✅ Wallet is funded and ready to use!');
        console.log();
    }

    console.log('═'.repeat(70));
    console.log('📝 Wallet File');
    console.log('═'.repeat(70));
    console.log();
    console.log(`Saved to: ${WALLET_FILE}`);
    console.log('⚠️  Keep this file safe! It contains your private key.');
    console.log('💡 This wallet will be reused for all devnet tests.');
    console.log();
}

main().catch(console.error);
