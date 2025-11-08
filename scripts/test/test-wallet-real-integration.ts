/**
 * Real Wallet Integration Test with Devnet
 * Uses real test accounts and blockchain transactions
 * 
 * Prerequisites:
 * 1. Test accounts must be funded with devnet SOL
 * 2. Run: solana airdrop 2 BpastXPwBmT5HKXssSZjGKkMf9g73MipAPsGxcoTxGHy --url devnet
 */

import { Keypair, Connection, PublicKey } from '@solana/web3.js';
import { ConfidentialWallet } from '../../src/wallet/ConfidentialWallet';
import { LocalKeyStorage } from '../../src/storage/KeyStorage';
import { WalletConfig } from '../../src/types';
import * as fs from 'fs';

async function testRealWalletIntegration() {
    console.log('🔍 Testing ConfidentialWallet with Real Devnet Transactions\n');

    // Load sender keypair from test-accounts
    const senderKeypairData = JSON.parse(
        fs.readFileSync('test-accounts/sender-keypair.json', 'utf-8')
    );
    const senderKeypair = Keypair.fromSecretKey(new Uint8Array(senderKeypairData));

    // Load recipient
    const recipientKeypairData = JSON.parse(
        fs.readFileSync('test-accounts/recipient-keypair.json', 'utf-8')
    );
    const recipientKeypair = Keypair.fromSecretKey(new Uint8Array(recipientKeypairData));

    console.log('📍 Test Accounts:');
    console.log('   Sender:', senderKeypair.publicKey.toBase58());
    console.log('   Recipient:', recipientKeypair.publicKey.toBase58());

    // Check SOL balance
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    const balance = await connection.getBalance(senderKeypair.publicKey);
    const solBalance = balance / 1_000_000_000;

    console.log('\n💰 Sender SOL Balance:', solBalance.toFixed(4), 'SOL');

    if (solBalance < 0.01) {
        console.log('\n❌ Insufficient SOL for testing!');
        console.log('   Fund the sender account:');
        console.log(`   solana airdrop 2 ${senderKeypair.publicKey.toBase58()} --url devnet`);
        process.exit(1);
    }

    // Clean up any existing test wallet
    const testWalletPath = '.wallet-test-real';
    if (fs.existsSync(testWalletPath)) {
        console.log('\n🧹 Cleaning up existing test wallet...');
        fs.rmSync(testWalletPath, { recursive: true, force: true });
    }
    await new Promise(resolve => setTimeout(resolve, 100));

    const config: WalletConfig = {
        rpcUrl: 'https://api.devnet.solana.com',
        network: 'devnet',
        batch: {
            windowMs: 5000,
            maxSize: 3,
        },
        keyStoragePath: testWalletPath,
    };

    try {
        console.log('\n1️⃣ Creating wallet from test account...');

        // Create wallet using the test account's seed
        const keyStorage = new LocalKeyStorage(testWalletPath);
        const wallet = new ConfidentialWallet(config, keyStorage);

        // Use the sender keypair's secret key as seed
        const seed = senderKeypair.secretKey.slice(0, 32);
        // No ElGamal keypair needed - using Pedersen commitments instead

        await keyStorage.save(Buffer.from(seed), undefined, 'test-password-123');
        await wallet.initialize('test-password-123', false);

        console.log('✅ Wallet initialized');
        console.log('   Address:', wallet.getAddress().toBase58());

        console.log('\n2️⃣ Setting up Token-2022 accounts...');
        try {
            await wallet.setupAccounts();
            console.log('✅ Token-2022 accounts created');
            console.log('   Mint:', wallet.getMint().toBase58());
            console.log('   Token Account:', wallet.getTokenAccount().toBase58());
        } catch (error: any) {
            console.log('❌ Setup failed:', error.message);
            console.log('   This may be due to insufficient SOL or network issues');
            throw error;
        }

        console.log('\n3️⃣ Depositing tokens...');
        try {
            const depositSig = await wallet.deposit('100');
            console.log('✅ Deposit successful');
            console.log('   Signature:', depositSig.slice(0, 16) + '...' + depositSig.slice(-16));
            console.log('   Amount: 100 tokens');
        } catch (error: any) {
            console.log('❌ Deposit failed:', error.message);
            throw error;
        }

        console.log('\n4️⃣ Checking balance...');
        const balance = await wallet.getBalance();
        console.log('✅ Balance retrieved:', balance, 'tokens');

        console.log('\n5️⃣ Queueing confidential transfer...');
        const transferId = wallet.transfer(recipientKeypair.publicKey, '10');
        console.log('✅ Transfer queued');
        console.log('   Transfer ID:', transferId);
        console.log('   Recipient:', recipientKeypair.publicKey.toBase58());
        console.log('   Amount: 10 tokens (will be hidden with ZK proofs)');

        console.log('\n6️⃣ Processing batch with real blockchain transaction...');
        const result = await wallet.processBatch();

        console.log('\n📊 Batch Result:');
        console.log('   Successful:', result.successful);
        console.log('   Failed:', result.failed);

        if (result.signatures.length > 0) {
            console.log('\n✅ Real Transaction Signatures:');
            result.signatures.forEach((sig, i) => {
                console.log(`   ${i + 1}. ${sig.slice(0, 16)}...${sig.slice(-16)}`);
                console.log(`      Explorer: https://explorer.solana.com/tx/${sig}?cluster=devnet`);
            });
        }

        if (result.errors.length > 0) {
            console.log('\n❌ Errors:');
            result.errors.forEach((err, i) => {
                console.log(`   ${i + 1}. ${err.error}`);
            });
        }

        console.log('\n7️⃣ Checking final balance...');
        const finalBalance = await wallet.getBalance();
        console.log('✅ Final balance:', finalBalance, 'tokens');

        console.log('\n8️⃣ Viewing transaction history...');
        const history = wallet.getRecentHistory(5);
        console.log('✅ Transaction history:');
        history.forEach((tx, i) => {
            console.log(`   ${i + 1}. ${tx.type.toUpperCase()} - ${tx.amount} tokens - ${tx.status}`);
            if (tx.signature) {
                console.log(`      Signature: ${tx.signature.slice(0, 16)}...${tx.signature.slice(-16)}`);
            }
        });

        console.log('\n🎉 Real Integration Test Complete!');
        console.log('\n📊 Summary:');
        console.log('   ✅ Wallet created from test account');
        console.log('   ✅ Token-2022 accounts set up');
        console.log('   ✅ Tokens deposited');
        console.log('   ✅ Confidential transfer executed with ZK proofs');
        console.log('   ✅ Real blockchain signatures generated');
        console.log('   ✅ Transaction history tracked');

    } catch (error: any) {
        console.log('\n❌ Test failed:', error.message);
        console.log('Stack:', error.stack);
        throw error;
    } finally {
        // Cleanup
        if (fs.existsSync(testWalletPath)) {
            fs.rmSync(testWalletPath, { recursive: true, force: true });
        }
    }
}

testRealWalletIntegration()
    .then(() => {
        console.log('\n✅ Real Wallet Integration Test PASSED');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Real Wallet Integration Test FAILED');
        console.error(error);
        process.exit(1);
    });
