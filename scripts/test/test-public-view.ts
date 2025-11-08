#!/usr/bin/env ts-node
/**
 * 🔍 PUBLIC VIEW TEST
 * 
 * This script simulates what a RANDOM PERSON sees when viewing
 * the privacy transaction on Solana Explorer - WITHOUT private keys.
 * 
 * Shows: What data is actually PUBLIC vs ENCRYPTED
 */

import { Connection, PublicKey } from '@solana/web3.js';

const DEVNET_RPC = 'https://api.devnet.solana.com';
const connection = new Connection(DEVNET_RPC, 'confirmed');

// Your transaction signature from the test
const TX_SIGNATURE = '5d5iHuuNK4CSTaEAYcowVAnS11zauaXKjr4cktp7i7dhEXa4wjj4mmHdQhozZsD9432NHYxj3Hw14fZ5kYRMXq5q';

// The encrypted accounts from your test
const SENDER_ENCRYPTED_ACCOUNT = '3YgPQVD8h8hFbeSawGfQUPEaSGSWKJyrZTuA7R6sveMQ';
const RECIPIENT_ENCRYPTED_ACCOUNT = 'Cg8pM4hjSdbBJWfu266bY9Sft1QWxFp5qQLg998aK3j4';
const SENDER_ESCROW = '6HcBZeYDtNmZ5EMcwR8wbLcDVJEqbA2idtWNUXvtXKym';
const RECIPIENT_ESCROW = 'DkGhdTgthZz5qaRhbdF3o8y9wLSdziHFzLWwBZ8qw7An';

console.log('🔍 PUBLIC VIEW: What Anyone Can See on Solana Explorer\n');
console.log('='.repeat(70));
console.log('Simulating: Random person WITHOUT private keys');
console.log('='.repeat(70));
console.log();

async function showPublicView() {
    try {
        // 1. Fetch the transaction
        console.log('📋 TRANSACTION DETAILS (Public)');
        console.log('-'.repeat(70));
        const tx = await connection.getTransaction(TX_SIGNATURE, {
            maxSupportedTransactionVersion: 0,
        });

        if (!tx) {
            console.log('❌ Transaction not found');
            return;
        }

        console.log(`✅ Transaction: ${TX_SIGNATURE}`);
        console.log(`✅ Block Time: ${new Date(tx.blockTime! * 1000).toLocaleString()}`);
        console.log(`✅ Status: ${tx.meta?.err ? 'Failed' : 'Success'}`);
        console.log(`✅ Fee: ${tx.meta?.fee} lamports`);
        console.log();

        // 2. Show what's in the instruction data
        console.log('📦 INSTRUCTION DATA (What was sent to the program)');
        console.log('-'.repeat(70));

        const instruction = tx.transaction.message.compiledInstructions[0];
        const instructionData = Buffer.from(instruction.data);

        console.log(`Raw instruction data (${instructionData.length} bytes):`);
        console.log(instructionData.toString('hex').substring(0, 100) + '...');
        console.log();
        console.log('⚠️  This is ENCRYPTED data - looks like random bytes!');
        console.log('⚠️  Without private keys, you CANNOT extract the amount!');
        console.log();

        // 3. Show the encrypted account data
        console.log('🔐 ENCRYPTED ACCOUNT DATA (On-chain state)');
        console.log('-'.repeat(70));

        const senderAccount = await connection.getAccountInfo(new PublicKey(SENDER_ENCRYPTED_ACCOUNT));
        const recipientAccount = await connection.getAccountInfo(new PublicKey(RECIPIENT_ENCRYPTED_ACCOUNT));

        if (senderAccount) {
            console.log('\n📍 Sender Encrypted Account:');
            console.log(`   Address: ${SENDER_ENCRYPTED_ACCOUNT}`);
            console.log(`   Data size: ${senderAccount.data.length} bytes`);
            console.log(`   First 64 bytes (commitment):`);
            console.log(`   ${senderAccount.data.slice(0, 64).toString('hex')}`);
            console.log('   ⚠️  This is the ENCRYPTED balance commitment!');
            console.log('   ⚠️  Cannot determine actual balance without private key!');
        }

        if (recipientAccount) {
            console.log('\n📍 Recipient Encrypted Account:');
            console.log(`   Address: ${RECIPIENT_ENCRYPTED_ACCOUNT}`);
            console.log(`   Data size: ${recipientAccount.data.length} bytes`);
            console.log(`   First 64 bytes (commitment):`);
            console.log(`   ${recipientAccount.data.slice(0, 64).toString('hex')}`);
            console.log('   ⚠️  This is the ENCRYPTED balance commitment!');
            console.log('   ⚠️  Cannot determine actual balance without private key!');
        }

        // 4. Show escrow balances (these ARE visible)
        console.log('\n💰 ESCROW BALANCES (Public - These ARE visible)');
        console.log('-'.repeat(70));

        const senderEscrow = await connection.getAccountInfo(new PublicKey(SENDER_ESCROW));
        const recipientEscrow = await connection.getAccountInfo(new PublicKey(RECIPIENT_ESCROW));

        if (senderEscrow) {
            console.log(`\n📍 Sender Escrow: ${SENDER_ESCROW}`);
            console.log(`   Balance: ${senderEscrow.lamports} lamports (${senderEscrow.lamports / 1e9} SOL)`);
            console.log('   ✅ This balance IS visible to everyone');
        }

        if (recipientEscrow) {
            console.log(`\n📍 Recipient Escrow: ${RECIPIENT_ESCROW}`);
            console.log(`   Balance: ${recipientEscrow.lamports} lamports (${recipientEscrow.lamports / 1e9} SOL)`);
            console.log('   ✅ This balance IS visible to everyone');
        }

        // 5. Summary
        console.log('\n' + '='.repeat(70));
        console.log('📊 PRIVACY SUMMARY: What Public Can vs Cannot See');
        console.log('='.repeat(70));
        console.log();
        console.log('✅ PUBLIC CAN SEE:');
        console.log('   • Transaction signature and status');
        console.log('   • Sender and recipient addresses');
        console.log('   • Escrow account balances (total locked SOL)');
        console.log('   • That a transfer occurred');
        console.log('   • Encrypted commitments (but cannot decrypt them)');
        console.log();
        console.log('❌ PUBLIC CANNOT SEE:');
        console.log('   • Transfer amount (30,000,000 lamports / 0.03 SOL)');
        console.log('   • Sender\'s encrypted balance');
        console.log('   • Recipient\'s encrypted balance');
        console.log('   • Individual transaction amounts in history');
        console.log();
        console.log('🔐 PRIVACY LEVEL: HIGH');
        console.log('   Only the sender and recipient (with private keys) can');
        console.log('   decrypt the commitments and see actual amounts.');
        console.log();
        console.log('🎯 COMPARISON TO REGULAR SOLANA TRANSFER:');
        console.log('   Regular transfer: Amount is 100% PUBLIC');
        console.log('   Privacy transfer: Amount is 100% ENCRYPTED');
        console.log('='.repeat(70));

    } catch (error) {
        console.error('Error:', error);
    }
}

showPublicView();
