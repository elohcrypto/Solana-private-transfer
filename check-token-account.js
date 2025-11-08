/**
 * Check token account ownership
 */

const { Connection, PublicKey } = require('@solana/web3.js');
const { getAccount, TOKEN_2022_PROGRAM_ID } = require('@solana/spl-token');

async function checkTokenAccount() {
    const tokenAccountAddress = process.argv[2];

    if (!tokenAccountAddress) {
        console.log('Usage: node check-token-account.js <token-account-address>');
        console.log('');
        console.log('Example:');
        console.log('  node check-token-account.js AfbmUxqFrzagbJMfoRy6nEWJvUKv8WCj2d4vJb5oFyR3');
        process.exit(1);
    }

    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

    console.log('🔍 Checking Token Account...');
    console.log('');

    try {
        const tokenAccount = new PublicKey(tokenAccountAddress);

        const accountInfo = await getAccount(
            connection,
            tokenAccount,
            'confirmed',
            TOKEN_2022_PROGRAM_ID
        );

        console.log('✅ Token Account Found!');
        console.log('');
        console.log('📍 Token Account Address:');
        console.log('   ', tokenAccount.toBase58());
        console.log('');
        console.log('👤 Owner (Wallet Address):');
        console.log('   ', accountInfo.owner.toBase58());
        console.log('');
        console.log('🪙 Mint Address:');
        console.log('   ', accountInfo.mint.toBase58());
        console.log('');
        console.log('💰 Balance:');
        console.log('   ', (Number(accountInfo.amount) / 1_000_000_000).toFixed(4), 'tokens');
        console.log('');
        console.log('📝 Explanation:');
        console.log('   The Token Account (' + tokenAccountAddress.slice(0, 8) + '...)');
        console.log('   is OWNED by the wallet (' + accountInfo.owner.toBase58().slice(0, 8) + '...)');
        console.log('   and holds tokens from mint (' + accountInfo.mint.toBase58().slice(0, 8) + '...)');
        console.log('');
        console.log('🔗 View on Solscan:');
        console.log('   Token Account: https://solscan.io/account/' + tokenAccount.toBase58() + '?cluster=devnet');
        console.log('   Owner Wallet:  https://solscan.io/account/' + accountInfo.owner.toBase58() + '?cluster=devnet');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.log('');
        console.log('This could mean:');
        console.log('   - Invalid address format');
        console.log('   - Account does not exist');
        console.log('   - Not a Token-2022 account');
    }
}

checkTokenAccount();
