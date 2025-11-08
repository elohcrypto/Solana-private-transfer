/**
 * Verify a transaction is on-chain
 */

const { Connection } = require('@solana/web3.js');

async function verifyTransaction() {
    const signature = process.argv[2];

    if (!signature) {
        console.log('Usage: node verify-transaction.js <signature>');
        console.log('');
        console.log('Example:');
        console.log('  node verify-transaction.js 2NpLFittczotYhMXsDmqVBPB2mFttvr45q6nY8S49YNoSEbePhEH26G58Lcrjr7JgvfZAwd3aWZi8kwWDgFGtLgb');
        process.exit(1);
    }

    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

    console.log('🔍 Verifying transaction on-chain...');
    console.log('   Signature:', signature);
    console.log('');

    try {
        // Get transaction details
        const tx = await connection.getTransaction(signature, {
            maxSupportedTransactionVersion: 0
        });

        if (!tx) {
            console.log('❌ Transaction not found on-chain');
            console.log('   This could mean:');
            console.log('   - Transaction is still processing');
            console.log('   - Invalid signature');
            console.log('   - Wrong network (check devnet/mainnet)');
            return;
        }

        console.log('✅ Transaction confirmed on-chain!');
        console.log('');
        console.log('📊 Transaction Details:');
        console.log('   Slot:', tx.slot);
        console.log('   Block Time:', new Date(tx.blockTime * 1000).toLocaleString());
        console.log('   Fee:', tx.meta.fee / 1_000_000_000, 'SOL');
        console.log('   Status:', tx.meta.err ? '❌ Failed' : '✅ Success');

        if (tx.meta.err) {
            console.log('   Error:', tx.meta.err);
        }

        console.log('');
        console.log('🔗 View on Solscan:');
        console.log('   https://solscan.io/tx/' + signature + '?cluster=devnet');
        console.log('');
        console.log('🔗 View on Solana Explorer:');
        console.log('   https://explorer.solana.com/tx/' + signature + '?cluster=devnet');

    } catch (error) {
        console.error('❌ Error verifying transaction:', error.message);
    }
}

verifyTransaction();
