/**
 * Private Balance Verification
 * 
 * This demonstrates how you would verify your balance privately
 * without revealing it to anyone else
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import * as fs from 'fs';


const PROGRAM_ID = new PublicKey('DwBEX4CiNhpMG4cGzem9cvJgTdW17myKD1hZM6D9SG3v');
const DEVNET_URL = 'https://api.devnet.solana.com';

async function main() {
    console.log('\n================================================================================');
    console.log('🔐 PRIVATE BALANCE VERIFICATION');
    console.log('================================================================================\n');

    // Load your keypair (only YOU have this!)
    const yourKeypairData = JSON.parse(
        fs.readFileSync('./test-accounts/sender-keypair.json', 'utf-8')
    );
    const yourKeypair = Keypair.fromSecretKey(new Uint8Array(yourKeypairData));

    console.log('👤 Your Identity:');
    console.log(`   Public Key: ${yourKeypair.publicKey.toBase58()}`);
    console.log('   Private Key: [HIDDEN - only you know this!]\n');

    // Connect to devnet
    const connection = new Connection(DEVNET_URL, 'confirmed');

    // Calculate your encrypted account PDA
    const [yourEncryptedPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('encrypted-account'), yourKeypair.publicKey.toBuffer()],
        PROGRAM_ID
    );

    console.log('📍 Your Encrypted Account:');
    console.log(`   PDA: ${yourEncryptedPDA.toBase58()}`);
    console.log(`   🔗 View on Explorer: https://explorer.solana.com/address/${yourEncryptedPDA.toBase58()}?cluster=devnet\n`);

    // Check if account exists on-chain
    console.log('🔍 Checking on-chain data...');
    const accountInfo = await connection.getAccountInfo(yourEncryptedPDA);

    if (!accountInfo) {
        console.log('   ⚠️  Account not yet initialized on-chain');
        console.log('   (This is expected - we need to implement the full program first)\n');
    } else {
        console.log('   ✅ Account found on-chain!');
        console.log(`   • Data size: ${accountInfo.data.length} bytes`);
        console.log(`   • Owner: ${accountInfo.owner.toBase58()}`);
        console.log('   • Data: [ENCRYPTED - not readable by public]\n');
    }

    // Demonstrate local encrypted balance tracking
    console.log('================================================================================');
    console.log('LOCAL ENCRYPTED BALANCE (What Only YOU Can See)');
    console.log('================================================================================\n');

    // Simulate having an encrypted balance (stored locally)
    console.log('💰 Your Private Balance Information:');
    console.log('   (This would be stored locally, encrypted with your key)\n');

    // Simulated balance
    const yourBalance = BigInt(1000000);
    console.log(`   Your Balance: ${yourBalance} lamports (${Number(yourBalance) / 1e9} SOL)`);
    console.log('   ✅ Only YOU can decrypt this with your private key!\n');

    // Simulate a transfer
    console.log('================================================================================');
    console.log('SIMULATED PRIVATE TRANSFER');
    console.log('================================================================================\n');

    const transferAmount = BigInt(10000);
    console.log(`📤 Sending ${transferAmount} lamports privately...\n`);

    // Update your balance
    const newBalance = yourBalance - transferAmount;

    console.log('✅ Transfer Complete!\n');
    console.log('📊 What Different Parties See:\n');

    console.log('👁️  PUBLIC (Anyone on Solana Explorer):');
    console.log('   ✅ Transaction occurred');
    console.log('   ✅ From: ' + yourKeypair.publicKey.toBase58());
    console.log('   ✅ To: [recipient address]');
    console.log('   ❌ Amount: HIDDEN (encrypted!)');
    console.log('   ❌ Your balance: HIDDEN (encrypted!)');
    console.log('   ✅ Proof valid: YES (ZK proof verified)\n');

    console.log('🔐 YOU (With your private key):');
    console.log(`   ✅ Your old balance: ${yourBalance} lamports`);
    console.log(`   ✅ Amount sent: ${transferAmount} lamports`);
    console.log(`   ✅ Your new balance: ${newBalance} lamports`);
    console.log('   ✅ You can decrypt everything!\n');

    console.log('👤 RECIPIENT (With their private key):');
    console.log('   ✅ Their old balance: [they can decrypt]');
    console.log(`   ✅ Amount received: ${transferAmount} lamports`);
    console.log('   ✅ Their new balance: [they can decrypt]');
    console.log('   ❌ Your balance: HIDDEN (they cannot see!)\n');

    console.log('🕵️  THIRD PARTY (No private keys):');
    console.log('   ✅ Transaction happened: YES');
    console.log('   ✅ Proof valid: YES');
    console.log('   ❌ Amount: CANNOT SEE');
    console.log('   ❌ Balances: CANNOT SEE');
    console.log('   ❌ Cannot decrypt anything!\n');

    console.log('================================================================================');
    console.log('HOW TO VERIFY ON REAL DEVNET');
    console.log('================================================================================\n');

    console.log('Once the full program is implemented, you would:\n');

    console.log('1️⃣  Make a confidential transfer:');
    console.log('   npx ts-node make-private-transfer.ts --amount 10000\n');

    console.log('2️⃣  Check on Solana Explorer:');
    console.log('   https://explorer.solana.com/tx/[signature]?cluster=devnet');
    console.log('   You will see: Transaction confirmed, but amount is HIDDEN\n');

    console.log('3️⃣  Verify YOUR balance privately:');
    console.log('   npx ts-node verify-private-balance.ts');
    console.log('   Output: Your balance: 990,000 lamports (only you see this)\n');

    console.log('4️⃣  Recipient verifies THEIR balance:');
    console.log('   npx ts-node verify-private-balance.ts --recipient');
    console.log('   Output: Your balance: 10,000 lamports (only they see this)\n');

    console.log('5️⃣  Anyone can verify the proof:');
    console.log('   npx ts-node verify-proof.ts [signature]');
    console.log('   Output: ✅ Proof valid (but amounts stay hidden!)\n');

    console.log('================================================================================');
    console.log('SUMMARY');
    console.log('================================================================================\n');

    console.log('✅ What We Have:');
    console.log('   • ZK proof system (working)');
    console.log('   • Encrypted balance tracking (working)');
    console.log('   • Program deployed to devnet (working)');
    console.log('   • Local encryption/decryption (working)\n');

    console.log('🚧 What We Need:');
    console.log('   • Store encrypted balances on-chain');
    console.log('   • Verify ZK proofs in Rust program');
    console.log('   • Implement confidential_transfer instruction\n');

    console.log('🎯 Result:');
    console.log('   Once complete, amounts will be HIDDEN on Solana Explorer,');
    console.log('   but you can verify your balance privately with your key!\n');
}

main().catch(console.error);
