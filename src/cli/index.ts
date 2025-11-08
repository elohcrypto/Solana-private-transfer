#!/usr/bin/env node

/**
 * CLI for Confidential Wallet
 */

import { Command } from 'commander';
import { PublicKey } from '@solana/web3.js';
import { ConfidentialWallet } from '../wallet/ConfidentialWallet';
import { LocalKeyStorage } from '../storage/KeyStorage';
import {
    promptPasswordWithConfirmation,
    loadWallet,
    formatError,
    formatAmount,
    formatAddress,
    getDefaultConfig,
    displaySuccess,
    displayError,
    displayInfo,
    displayWarning,
    getExplorerUrl,
} from './utils';

const program = new Command();

// Configure CLI
program
    .name('utxo-wallet')
    .description('Privacy-preserving confidential wallet using Token-2022')
    .version('0.1.0');

/**
 * Init command - Create new wallet
 */
program
    .command('init')
    .description('Initialize a new wallet')
    .action(async () => {
        try {
            const config = getDefaultConfig();
            const keyStorage = new LocalKeyStorage(config.keyStoragePath);

            // Check if wallet already exists
            if (keyStorage.exists()) {
                displayWarning('Wallet already exists!');
                displayInfo('Use a different directory or delete the existing wallet.');
                process.exit(1);
            }

            displayInfo('Creating new wallet...');
            displayInfo('Please enter a strong password to encrypt your wallet.');

            // Prompt for password
            const password = await promptPasswordWithConfirmation();

            // Validate password strength
            if (password.length < 8) {
                displayError('Password must be at least 8 characters long');
                process.exit(1);
            }

            // Create wallet
            const wallet = new ConfidentialWallet(config, keyStorage);
            await wallet.createNew(password, false);

            const address = wallet.getAddress();

            displaySuccess('Wallet created successfully!');
            console.log('\n📍 Wallet Address:');
            console.log(`   ${address.toBase58()}`);
            console.log('\n⚠️  IMPORTANT:');
            console.log('   1. Keep your password safe - it cannot be recovered');
            console.log('   2. Backup your .wallet directory');
            console.log('   3. Fund your wallet with devnet SOL before using');
            console.log('\n💰 To fund your wallet:');
            console.log(`   solana airdrop 2 ${address.toBase58()} --url devnet`);
            console.log('   Or visit: https://faucet.solana.com');
            console.log('\n🔐 Privacy Features:');
            console.log('   - Token-2022 confidential transfers');
            console.log('   - Encrypted key storage (AES-256-GCM)');
            console.log('   - Batch processing for efficiency');
            console.log('\n📖 Next Steps:');
            console.log('   1. Fund your wallet with SOL');
            console.log('   2. Setup Token-2022 accounts: utxo-wallet setup');
            console.log('   3. Deposit tokens: utxo-wallet deposit <amount>');
            console.log('   4. Check balance: utxo-wallet balance');
        } catch (error: any) {
            displayError(formatError(error));
            process.exit(1);
        }
    });

/**
 * Setup command - Setup Token-2022 accounts
 */
program
    .command('setup')
    .description('Setup Token-2022 accounts (requires SOL)')
    .action(async () => {
        try {
            const config = getDefaultConfig();
            const keyStorage = new LocalKeyStorage(config.keyStoragePath);

            displayInfo('Loading wallet...');
            const wallet = await loadWallet(config, keyStorage);

            // Check SOL balance first
            const connection = wallet.getConnection();
            const address = wallet.getAddress();
            const balance = await connection.getBalance(address);
            const solBalance = balance / 1_000_000_000;

            console.log(`\n💰 SOL Balance: ${solBalance.toFixed(4)} SOL`);

            if (solBalance < 0.01) {
                displayError('Insufficient SOL for transaction fees!');
                console.log('\n💰 To fund your wallet:');
                console.log(`   solana airdrop 2 ${address.toBase58()} --url devnet`);
                console.log('   Or visit: https://faucet.solana.com');
                process.exit(1);
            }

            displayInfo('Setting up Token-2022 accounts...');
            displayInfo('This will create a mint and token account.');

            await wallet.setupAccounts();

            displaySuccess('Token-2022 accounts created!');
            console.log('\n📍 Account Details:');
            console.log(`   Mint: ${wallet.getMint().toBase58()}`);
            console.log(`   Token Account: ${wallet.getTokenAccount().toBase58()}`);
            console.log('\n✅ Ready to deposit tokens!');
        } catch (error: any) {
            displayError(formatError(error));
            process.exit(1);
        }
    });

/**
 * Deposit command - Deposit tokens
 */
program
    .command('deposit')
    .description('Deposit tokens into confidential account')
    .argument('<amount>', 'Amount to deposit')
    .action(async (amount: string) => {
        try {
            const config = getDefaultConfig();
            const keyStorage = new LocalKeyStorage(config.keyStoragePath);

            displayInfo('Loading wallet...');
            const wallet = await loadWallet(config, keyStorage);

            displayInfo(`Depositing ${amount} tokens...`);
            const signature = await wallet.deposit(amount);

            displaySuccess('Deposit successful!');
            console.log('\n📝 Transaction Details:');
            console.log(`   Signature: ${formatAddress(signature, 16, 16)}`);
            console.log(`   Amount: ${formatAmount(amount)} tokens`);
            console.log(`   Explorer: ${getExplorerUrl(signature, config.network)}`);
        } catch (error: any) {
            displayError(formatError(error));
            process.exit(1);
        }
    });

/**
 * Balance command - Check balance
 */
program
    .command('balance')
    .description('Check wallet balance')
    .action(async () => {
        try {
            const config = getDefaultConfig();
            const keyStorage = new LocalKeyStorage(config.keyStoragePath);

            displayInfo('Loading wallet...');
            const wallet = await loadWallet(config, keyStorage);

            displayInfo('Fetching balance...');
            const balance = await wallet.getBalance();

            displaySuccess('Balance retrieved!');
            console.log('\n💰 Balance:');
            console.log(`   ${formatAmount(balance)} tokens`);
        } catch (error: any) {
            displayError(formatError(error));
            process.exit(1);
        }
    });

/**
 * Transfer command - Transfer tokens
 */
program
    .command('transfer')
    .description('Transfer tokens to another address')
    .argument('<recipient>', 'Recipient address')
    .argument('<amount>', 'Amount to transfer')
    .action(async (recipient: string, amount: string) => {
        try {
            const config = getDefaultConfig();
            const keyStorage = new LocalKeyStorage(config.keyStoragePath);

            // Validate recipient address
            let recipientPubkey: PublicKey;
            try {
                recipientPubkey = new PublicKey(recipient);
            } catch {
                displayError('Invalid recipient address');
                process.exit(1);
            }

            displayInfo('Loading wallet...');
            const wallet = await loadWallet(config, keyStorage);

            displayInfo(`Transferring ${amount} tokens to ${formatAddress(recipient)}...`);
            const transferId = wallet.transfer(recipientPubkey, amount);

            displaySuccess('Transfer queued!');
            console.log('\n📝 Transfer Details:');
            console.log(`   Transfer ID: ${transferId}`);
            console.log(`   Recipient: ${formatAddress(recipient)}`);
            console.log(`   Amount: ${formatAmount(amount)} tokens`);
            console.log(`   Status: Queued`);
            console.log('\n⏳ Transfer will be processed automatically.');
            console.log('   Or use: utxo-wallet process-batch');
        } catch (error: any) {
            displayError(formatError(error));
            process.exit(1);
        }
    });

/**
 * Process batch command - Process queued transfers
 */
program
    .command('process-batch')
    .description('Process queued transfers immediately')
    .action(async () => {
        try {
            const config = getDefaultConfig();
            const keyStorage = new LocalKeyStorage(config.keyStoragePath);

            displayInfo('Loading wallet...');
            const wallet = await loadWallet(config, keyStorage);

            displayInfo('Processing batch...');
            const result = await wallet.processBatch();

            if (result.successful === 0 && result.failed === 0) {
                displayInfo('No transfers to process');
                return;
            }

            displaySuccess('Batch processed!');
            console.log('\n📊 Results:');
            console.log(`   Successful: ${result.successful}`);
            console.log(`   Failed: ${result.failed}`);

            if (result.signatures.length > 0) {
                console.log('\n✅ Successful Transactions:');
                result.signatures.forEach((sig, i) => {
                    console.log(`   ${i + 1}. ${formatAddress(sig, 16, 16)}`);
                    console.log(`      ${getExplorerUrl(sig, config.network)}`);
                });
            }

            if (result.errors.length > 0) {
                console.log('\n❌ Failed Transactions:');
                result.errors.forEach((err, i) => {
                    console.log(`   ${i + 1}. Transfer ${err.transferId.slice(0, 8)}`);
                    console.log(`      Error: ${err.error}`);
                });
            }
        } catch (error: any) {
            displayError(formatError(error));
            process.exit(1);
        }
    });

/**
 * History command - View transaction history
 */
program
    .command('history')
    .description('View transaction history')
    .option('-l, --limit <number>', 'Limit number of transactions', '10')
    .action(async (options) => {
        try {
            const config = getDefaultConfig();
            const keyStorage = new LocalKeyStorage(config.keyStoragePath);

            displayInfo('Loading wallet...');
            const wallet = await loadWallet(config, keyStorage);

            const limit = parseInt(options.limit);
            const allHistory = wallet.getHistory();

            if (allHistory.length === 0) {
                displayInfo('No transaction history');
                return;
            }

            // Get recent transactions (limited)
            const history = allHistory.slice(-limit).reverse();

            displaySuccess(`Transaction History (showing ${history.length} of ${allHistory.length} transactions)`);
            console.log('\n📜 Recent Transactions:\n');

            history.forEach((tx, i) => {
                const date = new Date(tx.timestamp).toLocaleString();
                const statusIcon = tx.status === 'confirmed' ? '✅' : '❌';

                console.log(`${i + 1}. ${statusIcon} ${tx.type.toUpperCase()}`);
                console.log(`   Amount: ${formatAmount(tx.amount)} tokens`);
                if (tx.recipient) {
                    console.log(`   Recipient: ${formatAddress(tx.recipient)}`);
                }
                console.log(`   Status: ${tx.status}`);
                console.log(`   Date: ${date}`);
                if (tx.signature) {
                    console.log(`   Signature: ${formatAddress(tx.signature, 16, 16)}`);
                }
                if (tx.error) {
                    console.log(`   Error: ${tx.error}`);
                }
                console.log('');
            });
        } catch (error: any) {
            displayError(formatError(error));
            process.exit(1);
        }
    });

/**
 * Sync command - Sync wallet state
 */
program
    .command('sync')
    .description('Sync wallet state with blockchain')
    .action(async () => {
        try {
            const config = getDefaultConfig();
            const keyStorage = new LocalKeyStorage(config.keyStoragePath);

            displayInfo('Loading wallet...');
            const wallet = await loadWallet(config, keyStorage);

            displayInfo('Syncing wallet state...');
            await wallet.sync();

            const balance = await wallet.getBalance();

            displaySuccess('Wallet synced!');
            console.log('\n💰 Current Balance:');
            console.log(`   ${formatAmount(balance)} tokens`);
        } catch (error: any) {
            displayError(formatError(error));
            process.exit(1);
        }
    });

/**
 * Address command - Show wallet address and SOL balance
 */
program
    .command('address')
    .description('Show wallet address and SOL balance')
    .action(async () => {
        try {
            const config = getDefaultConfig();
            const keyStorage = new LocalKeyStorage(config.keyStoragePath);

            displayInfo('Loading wallet...');
            const wallet = await loadWallet(config, keyStorage);

            const address = wallet.getAddress();
            const connection = wallet.getConnection();
            const balance = await connection.getBalance(address);
            const solBalance = balance / 1_000_000_000;

            displaySuccess('Wallet information:');
            console.log('\n📍 Address:');
            console.log(`   ${address.toBase58()}`);
            console.log('\n💰 SOL Balance:');
            console.log(`   ${solBalance.toFixed(4)} SOL`);

            if (solBalance < 0.01) {
                console.log('\n⚠️  Low SOL balance!');
                console.log('💰 To fund your wallet:');
                console.log(`   solana airdrop 2 ${address.toBase58()} --url devnet`);
                console.log('   Or visit: https://faucet.solana.com');
            }
        } catch (error: any) {
            displayError(formatError(error));
            process.exit(1);
        }
    });

// Parse arguments
program.parse();
