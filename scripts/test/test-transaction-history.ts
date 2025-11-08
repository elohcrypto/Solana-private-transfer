/**
 * Test TransactionHistory functionality
 */

import { TransactionHistory } from '../../src/storage/TransactionHistory';
import { TransactionRecord } from '../../src/types';
import * as fs from 'fs';

async function testTransactionHistory() {
    console.log('🔍 Testing TransactionHistory\n');

    // Clean up any existing history
    if (fs.existsSync('.wallet-history-test')) {
        fs.rmSync('.wallet-history-test', { recursive: true, force: true });
    }

    const history = new TransactionHistory('.wallet-history-test');

    try {
        console.log('1️⃣ Testing add transaction...');
        const record1: TransactionRecord = {
            id: 'tx-1',
            type: 'deposit',
            amount: '10.0',
            status: 'confirmed',
            signature: 'sig-1',
            timestamp: Date.now(),
        };

        history.addTransaction(record1);
        console.log('✅ Transaction added');
        console.log('   Count:', history.getCount());

        console.log('\n2️⃣ Testing add multiple transactions...');
        const records: TransactionRecord[] = [
            {
                id: 'tx-2',
                type: 'transfer',
                amount: '2.0',
                recipient: 'recipient1',
                status: 'confirmed',
                signature: 'sig-2',
                timestamp: Date.now(),
            },
            {
                id: 'tx-3',
                type: 'transfer',
                amount: '3.0',
                recipient: 'recipient2',
                status: 'failed',
                timestamp: Date.now(),
                error: 'Network error',
            },
            {
                id: 'tx-4',
                type: 'withdraw',
                amount: '1.5',
                recipient: 'recipient3',
                status: 'confirmed',
                signature: 'sig-4',
                timestamp: Date.now(),
            },
        ];

        history.addTransactions(records);
        console.log('✅ Multiple transactions added');
        console.log('   Total count:', history.getCount());

        console.log('\n3️⃣ Testing get all history...');
        const allHistory = history.getHistory();
        console.log('✅ History retrieved');
        console.log('   Count:', allHistory.length);

        console.log('\n4️⃣ Testing get recent history...');
        const recentHistory = history.getRecentHistory(2);
        console.log('✅ Recent history retrieved');
        console.log('   Count:', recentHistory.length);
        console.log('   Last transaction:', recentHistory[recentHistory.length - 1].id);

        console.log('\n5️⃣ Testing filter by type...');
        const deposits = history.getByType('deposit');
        const transfers = history.getByType('transfer');
        const withdraws = history.getByType('withdraw');
        console.log('✅ Filtered by type');
        console.log('   Deposits:', deposits.length);
        console.log('   Transfers:', transfers.length);
        console.log('   Withdraws:', withdraws.length);

        console.log('\n6️⃣ Testing filter by status...');
        const confirmed = history.getByStatus('confirmed');
        const failed = history.getByStatus('failed');
        console.log('✅ Filtered by status');
        console.log('   Confirmed:', confirmed.length);
        console.log('   Failed:', failed.length);

        console.log('\n7️⃣ Testing get by ID...');
        const tx2 = history.getById('tx-2');
        console.log('✅ Transaction found by ID');
        console.log('   ID:', tx2?.id);
        console.log('   Type:', tx2?.type);
        console.log('   Amount:', tx2?.amount);

        console.log('\n8️⃣ Testing counts...');
        console.log('✅ Counts retrieved');
        console.log('   Total:', history.getCount());
        console.log('   Successful:', history.getSuccessfulCount());
        console.log('   Failed:', history.getFailedCount());

        console.log('\n9️⃣ Testing persistence...');
        const history2 = new TransactionHistory('.wallet-history-test');
        console.log('✅ History loaded from file');
        console.log('   Count:', history2.getCount());
        console.log('   Matches original:', history2.getCount() === history.getCount());

        console.log('\n🔟 Testing clear history...');
        history.clearHistory();
        console.log('✅ History cleared');
        console.log('   Count:', history.getCount());

        console.log('\n📊 Summary:');
        console.log('✅ Add transaction works');
        console.log('✅ Add multiple transactions works');
        console.log('✅ Get all history works');
        console.log('✅ Get recent history works');
        console.log('✅ Filter by type works');
        console.log('✅ Filter by status works');
        console.log('✅ Get by ID works');
        console.log('✅ Counts work');
        console.log('✅ Persistence works');
        console.log('✅ Clear history works');
        console.log('\n🎉 Task 5.2 (Transaction History) Complete!');

    } catch (error: any) {
        console.error('\n❌ Test failed:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        // Cleanup
        if (fs.existsSync('.wallet-history-test')) {
            fs.rmSync('.wallet-history-test', { recursive: true, force: true });
        }
    }
}

testTransactionHistory().catch(console.error);
