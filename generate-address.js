/**
 * Generate a random Solana address for testing
 */

const { Keypair } = require('@solana/web3.js');

// Generate a random keypair
const keypair = Keypair.generate();

console.log('🔑 Generated Test Address:');
console.log('');
console.log('Address:', keypair.publicKey.toBase58());
console.log('');
console.log('📝 Use this address for testing transfers:');
console.log(`   node dist/cli/index.js transfer ${keypair.publicKey.toBase58()} 2.5`);
console.log('');
console.log('⚠️  Note: This is a random address. The tokens will be sent but not accessible.');
console.log('   For real transfers, create a second wallet or use a friend\'s address.');
