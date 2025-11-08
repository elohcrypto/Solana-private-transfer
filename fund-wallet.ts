/**
 * Fund wallet with devnet SOL using web3.js
 */

import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

async function fundWallet() {
    const address = 'sTxWnZDnsQvcLvUbu6hSUA4WDqZ26hy3t7KgHyrDDAc';
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

    console.log('💰 Requesting airdrop...');
    console.log('   Address:', address);

    try {
        const signature = await connection.requestAirdrop(
            new PublicKey(address),
            2 * LAMPORTS_PER_SOL
        );

        console.log('   Signature:', signature);
        console.log('   Waiting for confirmation...');

        await connection.confirmTransaction(signature);

        console.log('✅ Airdrop successful!');

        const balance = await connection.getBalance(new PublicKey(address));
        console.log('   New balance:', balance / LAMPORTS_PER_SOL, 'SOL');

    } catch (error: any) {
        console.error('❌ Airdrop failed:', error.message);
    }
}

fundWallet().catch(console.error);
