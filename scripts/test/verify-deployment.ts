/**
 * Simple Deployment Verification Script
 * 
 * Verifies that the program is deployed and accessible on devnet
 */

import { Connection, PublicKey } from '@solana/web3.js';

const PROGRAM_ID = new PublicKey('HHvRt9CScrgHkfhDGUiwbskYpCSA9PetdT4uVwQ5C7f5');
const DEVNET_RPC = 'https://api.devnet.solana.com';

async function main() {
    console.log('🔒 Deployment Verification\n');
    console.log('='.repeat(60));
    console.log(`Program ID: ${PROGRAM_ID.toBase58()}`);
    console.log(`Cluster: devnet\n`);
    
    const connection = new Connection(DEVNET_RPC, 'confirmed');
    
    try {
        // Check program account
        console.log('Checking program account...');
        const programInfo = await connection.getAccountInfo(PROGRAM_ID);
        
        if (programInfo) {
            console.log('✅ Program exists on-chain');
            console.log(`   Owner: ${programInfo.owner.toBase58()}`);
            console.log(`   Executable: ${programInfo.executable}`);
            console.log(`   Data Length: ${programInfo.data.length} bytes`);
            console.log(`   Balance: ${programInfo.lamports / 1e9} SOL`);
            
            // Check program data account
            const programDataAddress = new PublicKey('6TWVzqkJBQxqrp6yFp5JCyXP6kPn1aP9f8ZiNW9cD5PG');
            const programDataInfo = await connection.getAccountInfo(programDataAddress);
            
            if (programDataInfo) {
                console.log('\n✅ Program data account exists');
                console.log(`   Data Length: ${programDataInfo.data.length} bytes`);
                console.log(`   Balance: ${programDataInfo.lamports / 1e9} SOL`);
            }
            
            console.log('\n' + '='.repeat(60));
            console.log('\n✅ Deployment Verification Successful!\n');
            console.log('🔗 Program Explorer:');
            console.log(`   https://explorer.solana.com/address/${PROGRAM_ID.toBase58()}?cluster=devnet\n`);
            console.log('📋 Next Steps:');
            console.log('   1. Test the program using existing test scripts');
            console.log('   2. Verify security fixes are working');
            console.log('   3. Test confidential transfers\n');
            
        } else {
            console.log('❌ Program not found on-chain');
            process.exit(1);
        }
        
    } catch (error: any) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});

