/**
 * Encrypted Balance Tracker Test Suite
 * Run with: npx ts-node test-encrypted-balance-tracker.ts
 * 
 * UPDATED: Migrated from ElGamal to Pedersen commitments
 */

import { EncryptedBalanceTracker } from '../../src/storage/EncryptedBalanceTracker';
import * as fs from 'fs';
import * as path from 'path';

let passed = 0;
let failed = 0;

const TEST_STORAGE_PATH = './test-storage-encrypted-balance';

// Generate unique storage path for each test
let testCounter = 0;
function getTestStoragePath(): string {
    return `${TEST_STORAGE_PATH}-${testCounter++}`;
}

async function test(name: string, fn: () => void | Promise<void>) {
    try {
        await fn();
        console.log(`✅ ${name}`);
        passed++;
    } catch (error) {
        console.log(`❌ ${name}`);
        console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`);
        failed++;
    }
}

// Cleanup test storage
function cleanup() {
    try {
        // Clean up all test storage directories
        const currentDir = '.';
        const files = fs.readdirSync(currentDir);
        for (const file of files) {
            if (file.startsWith('test-storage-encrypted-balance')) {
                const fullPath = path.join(currentDir, file);
                if (fs.existsSync(fullPath)) {
                    fs.rmSync(fullPath, { recursive: true, force: true });
                }
            }
        }
    } catch (error) {
        console.error('Cleanup error:', error);
    }
}

console.log('='.repeat(80));
console.log('ENCRYPTED BALANCE TRACKER TEST SUITE (Pedersen Commitments)');
console.log('='.repeat(80));

async function runTests() {
    // Cleanup before tests
    cleanup();

    console.log('\n🔐 Basic Balance Operations');
    console.log('-'.repeat(80));

    await test('Initialize tracker (no keypair needed)', () => {
        const tracker = new EncryptedBalanceTracker(getTestStoragePath());
        tracker.initialize(); // No keypair needed with Pedersen commitments

        if (tracker.getAccountCount() !== 0) {
            throw new Error('Tracker should start empty');
        }
    });

    await test('Set and get balance', () => {
        const tracker = new EncryptedBalanceTracker(getTestStoragePath());
        tracker.initialize();

        const account = 'user1';
        const balance = 1000n;

        tracker.setBalance(account, balance);

        const retrieved = tracker.getBalance(account);
        if (retrieved !== balance) {
            throw new Error(`Balance mismatch: expected ${balance}, got ${retrieved}`);
        }
    });

    await test('Get commitment for account', () => {
        const tracker = new EncryptedBalanceTracker(getTestStoragePath());
        tracker.initialize();

        const account = 'user1';
        const balance = 1000n;

        tracker.setBalance(account, balance);

        const commitment = tracker.getCommitment(account);
        if (!commitment) {
            throw new Error('Commitment not found');
        }
        if (commitment.length !== 32) {
            throw new Error(`Commitment should be 32 bytes (Ristretto255), got ${commitment.length}`);
        }
    });

    await test('Verify commitment', () => {
        const tracker = new EncryptedBalanceTracker(getTestStoragePath());
        tracker.initialize();

        const account = 'user1';
        const balance = 1000n;

        tracker.setBalance(account, balance);

        const isValid = tracker.verifyCommitment(account, balance);
        if (!isValid) {
            throw new Error('Commitment verification failed');
        }
    });

    await test('Set balance for multiple accounts', () => {
        const tracker = new EncryptedBalanceTracker(getTestStoragePath());
        tracker.initialize();

        tracker.setBalance('user1', 1000n);
        tracker.setBalance('user2', 2000n);
        tracker.setBalance('user3', 3000n);

        if (tracker.getAccountCount() !== 3) {
            throw new Error('Should have 3 accounts');
        }

        if (tracker.getBalance('user1') !== 1000n) throw new Error('user1 balance wrong');
        if (tracker.getBalance('user2') !== 2000n) throw new Error('user2 balance wrong');
        if (tracker.getBalance('user3') !== 3000n) throw new Error('user3 balance wrong');
    });

    await test('Update balance with positive delta', () => {
        const tracker = new EncryptedBalanceTracker(getTestStoragePath());
        tracker.initialize();

        tracker.setBalance('user1', 1000n);
        tracker.updateBalance('user1', 500n);

        const balance = tracker.getBalance('user1');
        if (balance !== 1500n) {
            throw new Error(`Expected 1500, got ${balance}`);
        }
    });

    await test('Update balance with negative delta', () => {
        const tracker = new EncryptedBalanceTracker(getTestStoragePath());
        tracker.initialize();

        tracker.setBalance('user1', 1000n);
        tracker.updateBalance('user1', -300n);

        const balance = tracker.getBalance('user1');
        if (balance !== 700n) {
            throw new Error(`Expected 700, got ${balance}`);
        }
    });

    await test('Reject negative balance', () => {
        const tracker = new EncryptedBalanceTracker(getTestStoragePath());
        tracker.initialize();

        tracker.setBalance('user1', 100n);

        try {
            tracker.updateBalance('user1', -200n);
            throw new Error('Should have rejected negative balance');
        } catch (error) {
            if (error instanceof Error && error.message.includes('Insufficient balance')) {
                // Expected error
            } else {
                throw error;
            }
        }
    });

    console.log('\n💸 Transfer Operations');
    console.log('-'.repeat(80));

    await test('Process transfer between accounts', () => {
        const tracker = new EncryptedBalanceTracker(getTestStoragePath());
        tracker.initialize();

        tracker.setBalance('sender', 1000n);
        tracker.setBalance('recipient', 500n);

        tracker.processTransfer('sender', 'recipient', 300n, 'tx123');

        if (tracker.getBalance('sender') !== 700n) {
            throw new Error('Sender balance wrong');
        }
        if (tracker.getBalance('recipient') !== 800n) {
            throw new Error('Recipient balance wrong');
        }
    });

    await test('Reject transfer with insufficient balance', () => {
        const tracker = new EncryptedBalanceTracker(getTestStoragePath());
        tracker.initialize();

        tracker.setBalance('sender', 100n);
        tracker.setBalance('recipient', 0n);

        try {
            tracker.processTransfer('sender', 'recipient', 200n);
            throw new Error('Should have rejected insufficient balance');
        } catch (error) {
            if (error instanceof Error && error.message.includes('Insufficient balance')) {
                // Expected error
            } else {
                throw error;
            }
        }
    });

    await test('Reject transfer with zero amount', () => {
        const tracker = new EncryptedBalanceTracker(getTestStoragePath());
        tracker.initialize();

        tracker.setBalance('sender', 1000n);
        tracker.setBalance('recipient', 0n);

        try {
            tracker.processTransfer('sender', 'recipient', 0n);
            throw new Error('Should have rejected zero amount');
        } catch (error) {
            if (error instanceof Error && error.message.includes('must be positive')) {
                // Expected error
            } else {
                throw error;
            }
        }
    });

    await test('Process multiple transfers', () => {
        const tracker = new EncryptedBalanceTracker(getTestStoragePath());
        tracker.initialize();

        tracker.setBalance('user1', 1000n);
        tracker.setBalance('user2', 500n);
        tracker.setBalance('user3', 200n);

        tracker.processTransfer('user1', 'user2', 100n);
        tracker.processTransfer('user2', 'user3', 50n);
        tracker.processTransfer('user3', 'user1', 25n);

        if (tracker.getBalance('user1') !== 925n) throw new Error('user1 balance wrong');
        if (tracker.getBalance('user2') !== 550n) throw new Error('user2 balance wrong');
        if (tracker.getBalance('user3') !== 225n) throw new Error('user3 balance wrong');
    });

    console.log('\n📊 Batch Operations');
    console.log('-'.repeat(80));

    await test('Apply batch updates', () => {
        const tracker = new EncryptedBalanceTracker(getTestStoragePath());
        tracker.initialize();

        tracker.setBalance('user1', 1000n);
        tracker.setBalance('user2', 500n);

        tracker.applyUpdates([
            { account: 'user1', delta: 100n, timestamp: Date.now() },
            { account: 'user2', delta: -50n, timestamp: Date.now() },
            { account: 'user1', delta: -200n, timestamp: Date.now() },
        ]);

        if (tracker.getBalance('user1') !== 900n) throw new Error('user1 balance wrong');
        if (tracker.getBalance('user2') !== 450n) throw new Error('user2 balance wrong');
    });

    console.log('\n🔄 Synchronization');
    console.log('-'.repeat(80));

    await test('Synchronize with external balances', () => {
        const tracker = new EncryptedBalanceTracker(getTestStoragePath());
        tracker.initialize();

        tracker.setBalance('user1', 1000n);
        tracker.setBalance('user2', 500n);

        const externalBalances = new Map<string, bigint>();
        externalBalances.set('user1', 1500n); // Updated
        externalBalances.set('user2', 500n);  // Same
        externalBalances.set('user3', 300n);  // New

        tracker.synchronize(externalBalances);

        if (tracker.getBalance('user1') !== 1500n) throw new Error('user1 not synced');
        if (tracker.getBalance('user2') !== 500n) throw new Error('user2 changed');
        if (tracker.getBalance('user3') !== 300n) throw new Error('user3 not added');
    });

    console.log('\n💾 Persistence');
    console.log('-'.repeat(80));

    await test('Save and load balances', () => {
        const storagePath = getTestStoragePath(); // Use same path for both trackers

        // Create tracker and set balances
        const tracker1 = new EncryptedBalanceTracker(storagePath);
        tracker1.initialize();
        tracker1.setBalance('user1', 1000n);
        tracker1.setBalance('user2', 2000n);

        // Create new tracker with same storage path
        const tracker2 = new EncryptedBalanceTracker(storagePath);
        tracker2.initialize();

        // Should load saved balances
        if (tracker2.getBalance('user1') !== 1000n) throw new Error('user1 not loaded');
        if (tracker2.getBalance('user2') !== 2000n) throw new Error('user2 not loaded');
    });

    await test('Export and import encrypted balances', () => {
        const tracker1 = new EncryptedBalanceTracker(getTestStoragePath());
        tracker1.initialize();

        tracker1.setBalance('user1', 1000n);
        tracker1.setBalance('user2', 2000n);

        // Export
        const exported = tracker1.exportEncrypted();

        // Import into new tracker
        const tracker2 = new EncryptedBalanceTracker(TEST_STORAGE_PATH + '-import');
        tracker2.initialize();
        tracker2.importEncrypted(exported);

        if (tracker2.getBalance('user1') !== 1000n) throw new Error('user1 not imported');
        if (tracker2.getBalance('user2') !== 2000n) throw new Error('user2 not imported');
    });

    console.log('\n📈 Metadata & Statistics');
    console.log('-'.repeat(80));

    await test('Get balance metadata', () => {
        const tracker = new EncryptedBalanceTracker(getTestStoragePath());
        tracker.initialize();

        tracker.setBalance('user1', 1000n);

        const metadata = tracker.getBalanceMetadata('user1');
        if (!metadata) throw new Error('Metadata not found');
        if (metadata.version !== 1) throw new Error('Version should be 1');
        if (metadata.lastUpdated <= 0) throw new Error('Invalid timestamp');
    });

    await test('Version increments on updates', () => {
        const tracker = new EncryptedBalanceTracker(getTestStoragePath());
        tracker.initialize();

        tracker.setBalance('user1', 1000n);
        const meta1 = tracker.getBalanceMetadata('user1');

        tracker.setBalance('user1', 1500n);
        const meta2 = tracker.getBalanceMetadata('user1');

        if (!meta1 || !meta2) throw new Error('Metadata not found');
        if (meta2.version !== meta1.version + 1) {
            throw new Error('Version should increment');
        }
    });

    await test('Get storage statistics', () => {
        const tracker = new EncryptedBalanceTracker(getTestStoragePath());
        tracker.initialize();

        tracker.setBalance('user1', 1000n);
        tracker.setBalance('user2', 2000n);
        tracker.setBalance('user3', 3000n);

        const stats = tracker.getStats();
        if (stats.accountCount !== 3) throw new Error('Wrong account count');
        // Storage size: 3 accounts * (32 bytes commitment + 32 bytes blinding + ~16 bytes for balance string) = ~240 bytes
        // Allow some variance for JSON formatting
        if (stats.totalStorageBytes < 200 || stats.totalStorageBytes > 300) {
            throw new Error(`Wrong storage size: expected ~240 bytes, got ${stats.totalStorageBytes}`);
        }
        if (stats.newestUpdate <= 0) throw new Error('Invalid newest update');
    });

    await test('Get all accounts', () => {
        const tracker = new EncryptedBalanceTracker(getTestStoragePath());
        tracker.initialize();

        tracker.setBalance('user1', 1000n);
        tracker.setBalance('user2', 2000n);

        const accounts = tracker.getAccounts();
        if (accounts.length !== 2) throw new Error('Wrong account count');
        if (!accounts.includes('user1')) throw new Error('user1 not in accounts');
        if (!accounts.includes('user2')) throw new Error('user2 not in accounts');
    });

    await test('Get all balances', () => {
        const tracker = new EncryptedBalanceTracker(getTestStoragePath());
        tracker.initialize();

        tracker.setBalance('user1', 1000n);
        tracker.setBalance('user2', 2000n);

        const balances = tracker.getAllBalances();
        if (balances.size !== 2) throw new Error('Wrong balance count');
        if (balances.get('user1') !== 1000n) throw new Error('user1 balance wrong');
        if (balances.get('user2') !== 2000n) throw new Error('user2 balance wrong');
    });

    await test('Get all commitments', () => {
        const tracker = new EncryptedBalanceTracker(getTestStoragePath());
        tracker.initialize();

        tracker.setBalance('user1', 1000n);
        tracker.setBalance('user2', 2000n);

        const commitments = tracker.getAllCommitments();
        if (commitments.size !== 2) throw new Error('Wrong commitment count');
        
        const c1 = commitments.get('user1');
        const c2 = commitments.get('user2');
        if (!c1 || !c2) throw new Error('Commitments not found');
        if (c1.length !== 32) throw new Error('Commitment 1 should be 32 bytes (Ristretto255)');
        if (c2.length !== 32) throw new Error('Commitment 2 should be 32 bytes (Ristretto255)');
    });

    console.log('\n🗑️  Cleanup Operations');
    console.log('-'.repeat(80));

    await test('Clear single balance', () => {
        const tracker = new EncryptedBalanceTracker(getTestStoragePath());
        tracker.initialize();

        tracker.setBalance('user1', 1000n);
        tracker.setBalance('user2', 2000n);

        tracker.clearBalance('user1');

        if (tracker.hasAccount('user1')) throw new Error('user1 should be cleared');
        if (!tracker.hasAccount('user2')) throw new Error('user2 should still exist');
        if (tracker.getAccountCount() !== 1) throw new Error('Should have 1 account');
    });

    await test('Clear all balances', () => {
        const tracker = new EncryptedBalanceTracker(getTestStoragePath());
        tracker.initialize();

        tracker.setBalance('user1', 1000n);
        tracker.setBalance('user2', 2000n);

        tracker.clearAll();

        if (tracker.getAccountCount() !== 0) throw new Error('Should have 0 accounts');
    });

    console.log('\n' + '='.repeat(80));
    console.log(`RESULTS: ${passed} passed, ${failed} failed`);
    console.log('='.repeat(80));

    // Cleanup after tests
    cleanup();

    if (failed > 0) {
        process.exit(1);
    }
}

runTests().catch(console.error);
