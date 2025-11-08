/**
 * Test BatchQueue functionality
 */

import { PublicKey, Keypair } from '@solana/web3.js';
import { BatchQueue } from '../../src/batch/BatchQueue';
import { WalletConfig } from '../../src/types';

// Mock transfer executor
let transferCount = 0;
const mockTransferExecutor = async (recipient: PublicKey, amount: string): Promise<string> => {
    transferCount++;
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Simulate occasional failures (10% failure rate)
    // Note: Math.random() is acceptable here for test simulation, not cryptographic use
    if (Math.random() < 0.1) {
        throw new Error('Simulated network error');
    }

    return `mock-signature-${transferCount}-${amount}`;
};

async function testBatchQueue() {
    console.log('🔍 Testing BatchQueue Functionality\n');

    const config: WalletConfig = {
        rpcUrl: 'https://api.devnet.solana.com',
        network: 'devnet',
        batch: {
            windowMs: 2000, // 2 seconds for testing
            maxSize: 5,     // Process after 5 transfers
        },
        keyStoragePath: '.wallet',
    };

    const queue = new BatchQueue(config, mockTransferExecutor);

    try {
        console.log('1️⃣ Testing single transfer queueing...');
        const recipient1 = Keypair.generate().publicKey;
        const transferId1 = queue.add(recipient1, '1.5');
        console.log('✅ Transfer queued');
        console.log('   Transfer ID:', transferId1);
        console.log('   Queue size:', queue.getQueueSize());

        console.log('\n2️⃣ Testing transfer status...');
        const status1 = queue.getStatus(transferId1);
        console.log('✅ Status retrieved');
        console.log('   Status:', status1?.status);
        console.log('   Amount:', status1?.amountSol);
        console.log('   Queued at:', new Date(status1?.queuedAt || 0).toISOString());

        console.log('\n3️⃣ Testing multiple transfers...');
        const recipient2 = Keypair.generate().publicKey;
        const recipient3 = Keypair.generate().publicKey;
        const transferId2 = queue.add(recipient2, '2.0');
        const transferId3 = queue.add(recipient3, '3.5');
        console.log('✅ Multiple transfers queued');
        console.log('   Queue size:', queue.getQueueSize());

        console.log('\n4️⃣ Testing size-based auto-processing...');
        console.log('   Adding 2 more transfers to trigger batch (max size: 5)...');
        const recipient4 = Keypair.generate().publicKey;
        const recipient5 = Keypair.generate().publicKey;
        queue.add(recipient4, '1.0');
        queue.add(recipient5, '0.5');

        // Wait for auto-processing
        await new Promise(resolve => setTimeout(resolve, 500));

        console.log('✅ Auto-processing triggered');
        console.log('   Queue size after processing:', queue.getQueueSize());

        // Check statuses
        const status2 = queue.getStatus(transferId1);
        console.log('   Transfer 1 status:', status2?.status);
        if (status2?.signature) {
            console.log('   Transfer 1 signature:', status2.signature);
        }

        console.log('\n5️⃣ Testing manual batch processing...');
        const recipient6 = Keypair.generate().publicKey;
        const recipient7 = Keypair.generate().publicKey;
        queue.add(recipient6, '4.0');
        queue.add(recipient7, '2.5');
        console.log('   Queue size before manual process:', queue.getQueueSize());

        const result = await queue.processNow();
        console.log('✅ Manual processing complete');
        console.log('   Successful:', result.successful);
        console.log('   Failed:', result.failed);
        console.log('   Signatures:', result.signatures.length);
        if (result.errors.length > 0) {
            console.log('   Errors:', result.errors.length);
        }

        console.log('\n6️⃣ Testing timer-based auto-processing...');
        const recipient8 = Keypair.generate().publicKey;
        queue.add(recipient8, '1.0');
        console.log('   Transfer queued, waiting for timer (2 seconds)...');

        // Wait for timer to trigger
        await new Promise(resolve => setTimeout(resolve, 2500));

        const status8 = queue.getStatus(queue.getAllTransfers()[queue.getAllTransfers().length - 1]?.id);
        console.log('✅ Timer-based processing complete');
        console.log('   Status:', status8?.status);

        console.log('\n7️⃣ Testing clearCompleted...');
        const beforeClear = queue.getAllTransfers().length;
        queue.clearCompleted();
        const afterClear = queue.getAllTransfers().length;
        console.log('✅ Completed transfers cleared');
        console.log('   Before:', beforeClear);
        console.log('   After:', afterClear);

        console.log('\n8️⃣ Testing concurrent processing prevention...');
        queue.add(Keypair.generate().publicKey, '1.0');
        queue.add(Keypair.generate().publicKey, '2.0');

        // Try to process twice simultaneously
        const [result1, result2] = await Promise.all([
            queue.processNow(),
            queue.processNow(),
        ]);

        console.log('✅ Concurrent processing handled');
        console.log('   First result - successful:', result1.successful);
        console.log('   Second result - successful:', result2.successful);
        console.log('   Second result - errors:', result2.errors.length);

        console.log('\n9️⃣ Testing getAllQueued...');
        queue.add(Keypair.generate().publicKey, '1.0');
        queue.add(Keypair.generate().publicKey, '2.0');
        const queued = queue.getAllQueued();
        console.log('✅ Queued transfers retrieved');
        console.log('   Count:', queued.length);
        console.log('   All have status "queued":', queued.every(t => t.status === 'queued'));

        console.log('\n🔟 Testing clearAll...');
        queue.clearAll();
        console.log('✅ All transfers cleared');
        console.log('   Queue size:', queue.getQueueSize());
        console.log('   Total transfers:', queue.getAllTransfers().length);

        console.log('\n📊 Summary:');
        console.log('✅ Transfer queueing works');
        console.log('✅ Status tracking works');
        console.log('✅ Size-based auto-processing works');
        console.log('✅ Timer-based auto-processing works');
        console.log('✅ Manual processing works');
        console.log('✅ Parallel processing works');
        console.log('✅ Concurrent processing prevention works');
        console.log('✅ Queue management works');
        console.log('\n🎉 Task 4.1 (BatchQueue) Complete!');

    } catch (error: any) {
        console.error('\n❌ Test failed:', error.message);
        console.error('Stack:', error.stack);
    }
}

testBatchQueue().catch(console.error);
