const { ConfidentialWallet } = require('./dist/wallet/ConfidentialWallet');
const { LocalKeyStorage } = require('./dist/storage/KeyStorage');

async function check() {
    const config = {
        rpcUrl: 'https://api.devnet.solana.com',
        network: 'devnet',
        batch: { windowMs: 10000, maxSize: 10 },
        keyStoragePath: '.wallet',
    };
    
    const keyStorage = new LocalKeyStorage();
    const wallet = new ConfidentialWallet(config, keyStorage);
    
    await wallet.initialize('abc12345678', false);
    
    const balance = await wallet.getBalance();
    const history = wallet.getHistory();
    
    console.log('\n💰 Current Balance:', balance, 'tokens');
    console.log('📜 Transaction Count:', history.length);
    console.log('\n📝 Recent Transactions:');
    history.slice(-3).forEach((tx, i) => {
        console.log(`\n${i + 1}. ${tx.type.toUpperCase()}`);
        console.log('   Amount:', tx.amount);
        if (tx.recipient) console.log('   Recipient:', tx.recipient.slice(0, 8) + '...');
        console.log('   Status:', tx.status);
        if (tx.signature) console.log('   Signature:', tx.signature.slice(0, 16) + '...');
    });
}

check().catch(console.error);
