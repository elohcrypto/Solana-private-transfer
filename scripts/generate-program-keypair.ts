import { Keypair } from '@solana/web3.js';
import * as fs from 'fs';

// Generate a new keypair for the program
const programKeypair = Keypair.generate();

// Save to file
const keypairPath = './target/deploy/privacy_transfer-keypair.json';
fs.mkdirSync('./target/deploy', { recursive: true });
fs.writeFileSync(
    keypairPath,
    JSON.stringify(Array.from(programKeypair.secretKey))
);

console.log('Program ID:', programKeypair.publicKey.toBase58());
console.log('Keypair saved to:', keypairPath);
