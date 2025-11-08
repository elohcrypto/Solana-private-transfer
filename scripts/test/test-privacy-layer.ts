/**
 * Privacy Layer Test Suite
 * Run with: npx ts-node test-privacy-layer.ts
 */

import { PrivacyLayer } from '../../src/privacy/PrivacyLayer';
import { ScalarOps } from '../../src/crypto/zkproofs/primitives';

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void>) {
    try {
        const start = Date.now();
        await fn();
        const duration = Date.now() - start;
        console.log(`✅ ${name} (${duration}ms)`);
        passed++;
    } catch (error) {
        console.log(`❌ ${name}`);
        console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`);
        failed++;
    }
}

console.log('='.repeat(80));
console.log('PRIVACY LAYER TEST SUITE');
console.log('='.repeat(80));

async function runTests() {
    console.log('\n🔐 Basic Transfer Proof Generation');
    console.log('-'.repeat(80));

    await test('Generate and verify simple transfer', async () => {
        const privacyLayer = new PrivacyLayer({ rangeBits: 8 });

        const senderBefore = 100n;
        const amount = 30n;
        const senderAfter = 70n;

        const blindings = {
            senderBefore: ScalarOps.random(),
            amount: ScalarOps.random(),
            senderAfter: ScalarOps.random(),
        };

        const startTime = Date.now();
        const transfer = await privacyLayer.generateTransferProofs(
            senderBefore,
            amount,
            senderAfter,
            blindings
        );
        const generationTime = Date.now() - startTime;

        console.log(`   Proof generation time: ${generationTime}ms`);

        // Verify the transfer (standardized: throws on failure)
        const verifyStartTime = Date.now();
        await privacyLayer.verifyTransfer(transfer);
        const verificationTime = Date.now() - verifyStartTime;

        console.log(`   Verification time: ${verificationTime}ms`);
    });

    await test('Generate transfer with zero amount', async () => {
        const privacyLayer = new PrivacyLayer({ rangeBits: 8 });

        const senderBefore = 100n;
        const amount = 0n;
        const senderAfter = 100n;

        const blindings = {
            senderBefore: ScalarOps.random(),
            amount: ScalarOps.random(),
            senderAfter: ScalarOps.random(),
        };

        const transfer = await privacyLayer.generateTransferProofs(
            senderBefore,
            amount,
            senderAfter,
            blindings
        );

        // Verify the transfer (standardized: throws on failure)
        await privacyLayer.verifyTransfer(transfer);
    });

    await test('Generate transfer with full balance', async () => {
        const privacyLayer = new PrivacyLayer({ rangeBits: 8 });

        const senderBefore = 100n;
        const amount = 100n;
        const senderAfter = 0n;

        const blindings = {
            senderBefore: ScalarOps.random(),
            amount: ScalarOps.random(),
            senderAfter: ScalarOps.random(),
        };

        const transfer = await privacyLayer.generateTransferProofs(
            senderBefore,
            amount,
            senderAfter,
            blindings
        );

        // Verify the transfer (standardized: throws on failure)
        await privacyLayer.verifyTransfer(transfer);
    });

    console.log('\n❌ Invalid Transfers');
    console.log('-'.repeat(80));

    await test('Reject negative amount', async () => {
        const privacyLayer = new PrivacyLayer({ rangeBits: 8 });

        const senderBefore = 100n;
        const amount = -10n;
        const senderAfter = 110n;

        const blindings = {
            senderBefore: ScalarOps.random(),
            amount: ScalarOps.random(),
            senderAfter: ScalarOps.random(),
        };

        try {
            await privacyLayer.generateTransferProofs(
                senderBefore,
                amount,
                senderAfter,
                blindings
            );
            throw new Error('Should have thrown error for negative amount');
        } catch (error: any) {
            if (!error.message?.includes('cannot be negative') && !error.message?.includes('Invalid amount')) {
                throw new Error(`Wrong error message: ${error.message}`);
            }
        }
    });

    await test('Reject insufficient balance', async () => {
        const privacyLayer = new PrivacyLayer({ rangeBits: 8 });

        const senderBefore = 50n;
        const amount = 100n; // More than balance!
        const senderAfter = 0n;

        const blindings = {
            senderBefore: ScalarOps.random(),
            amount: ScalarOps.random(),
            senderAfter: ScalarOps.random(),
        };

        try {
            await privacyLayer.generateTransferProofs(
                senderBefore,
                amount,
                senderAfter,
                blindings
            );
            throw new Error('Should have thrown error for insufficient balance');
        } catch (error: any) {
            if (!error.message?.includes('Insufficient balance') && !error.message?.includes('insufficient')) {
                throw new Error(`Wrong error message: ${error.message}`);
            }
        }
    });

    await test('Reject invalid balance equation', async () => {
        const privacyLayer = new PrivacyLayer({ rangeBits: 8 });

        const senderBefore = 100n;
        const amount = 30n;
        const senderAfter = 80n; // Wrong! Should be 70

        const blindings = {
            senderBefore: ScalarOps.random(),
            amount: ScalarOps.random(),
            senderAfter: ScalarOps.random(),
        };

        try {
            await privacyLayer.generateTransferProofs(
                senderBefore,
                amount,
                senderAfter,
                blindings
            );
            throw new Error('Should have thrown error for invalid balance equation');
        } catch (error: any) {
            if (!error.message?.includes('does not hold') && !error.message?.includes('Balance equation')) {
                throw new Error(`Wrong error message: ${error.message}`);
            }
        }
    });

    console.log('\n🔄 Batch Processing');
    console.log('-'.repeat(80));

    await test('Generate batch of transfers in parallel', async () => {
        const privacyLayer = new PrivacyLayer({ rangeBits: 8, enableParallel: true });

        const transfers = [
            {
                senderBefore: 100n,
                amount: 30n,
                senderAfter: 70n,
                blindings: {
                    senderBefore: ScalarOps.random(),
                    amount: ScalarOps.random(),
                    senderAfter: ScalarOps.random(),
                },
            },
            {
                senderBefore: 200n,
                amount: 50n,
                senderAfter: 150n,
                blindings: {
                    senderBefore: ScalarOps.random(),
                    amount: ScalarOps.random(),
                    senderAfter: ScalarOps.random(),
                },
            },
            {
                senderBefore: 150n,
                amount: 75n,
                senderAfter: 75n,
                blindings: {
                    senderBefore: ScalarOps.random(),
                    amount: ScalarOps.random(),
                    senderAfter: ScalarOps.random(),
                },
            },
        ];

        const startTime = Date.now();
        const results = await privacyLayer.generateBatchTransferProofs(transfers);
        const totalTime = Date.now() - startTime;

        if (results.length !== 3) {
            throw new Error('Wrong number of results');
        }

        console.log(`   Generated ${results.length} proofs`);
        console.log(`   Total time: ${totalTime}ms (avg ${(totalTime / results.length).toFixed(2)}ms per proof)`);
    });

    await test('Verify batch of transfers', async () => {
        const privacyLayer = new PrivacyLayer({ rangeBits: 8, enableParallel: true });

        // Generate transfers
        const transfers = [
            {
                senderBefore: 100n,
                amount: 30n,
                senderAfter: 70n,
                blindings: {
                    senderBefore: ScalarOps.random(),
                    amount: ScalarOps.random(),
                    senderAfter: ScalarOps.random(),
                },
            },
            {
                senderBefore: 200n,
                amount: 50n,
                senderAfter: 150n,
                blindings: {
                    senderBefore: ScalarOps.random(),
                    amount: ScalarOps.random(),
                    senderAfter: ScalarOps.random(),
                },
            },
        ];

        const genResults = await privacyLayer.generateBatchTransferProofs(transfers);
        
        if (genResults.length !== 2) {
            throw new Error('Wrong number of generated transfers');
        }

        // Verify batch (standardized: throws on failure)
        await privacyLayer.verifyBatchTransfers(genResults);

        console.log(`   Verified ${genResults.length} transfers`);
    });

    console.log('\n⚙️ Configuration & Caching');
    console.log('-'.repeat(80));

    await test('Update configuration', async () => {
        const privacyLayer = new PrivacyLayer({ rangeBits: 8 });

        const initialConfig = privacyLayer.getConfig();
        if (initialConfig.rangeBits !== 8) {
            throw new Error('Initial config wrong');
        }

        privacyLayer.updateConfig({ rangeBits: 16 });

        const updatedConfig = privacyLayer.getConfig();
        if (updatedConfig.rangeBits !== 16) {
            throw new Error('Config update failed');
        }
    });

    await test('Cache statistics', async () => {
        const privacyLayer = new PrivacyLayer({ rangeBits: 8, enableCaching: true });

        const stats = privacyLayer.getCacheStats();
        if (stats.size !== 0) {
            throw new Error('Cache should be empty initially');
        }

        // Generate a transfer (should populate cache)
        await privacyLayer.generateTransferProofs(
            100n,
            30n,
            70n,
            {
                senderBefore: ScalarOps.random(),
                amount: ScalarOps.random(),
                senderAfter: ScalarOps.random(),
            }
        );

        const statsAfter = privacyLayer.getCacheStats();
        console.log(`   Cache size: ${statsAfter.size}`);
        console.log(`   Cache TTL: ${statsAfter.ttlMs}ms`);
    });

    await test('Clear cache', async () => {
        const privacyLayer = new PrivacyLayer({ rangeBits: 8, enableCaching: true });

        // Generate a transfer
        await privacyLayer.generateTransferProofs(
            100n,
            30n,
            70n,
            {
                senderBefore: ScalarOps.random(),
                amount: ScalarOps.random(),
                senderAfter: ScalarOps.random(),
            }
        );

        privacyLayer.clearCache();

        const stats = privacyLayer.getCacheStats();
        if (stats.size !== 0) {
            throw new Error('Cache should be empty after clear');
        }
    });

    console.log('\n⚡ Performance');
    console.log('-'.repeat(80));

    await test('Performance: Sequential vs Parallel (3 transfers)', async () => {
        const transfers = [
            {
                senderBefore: 100n,
                amount: 30n,
                senderAfter: 70n,
                blindings: {
                    senderBefore: ScalarOps.random(),
                    amount: ScalarOps.random(),
                    senderAfter: ScalarOps.random(),
                },
            },
            {
                senderBefore: 200n,
                amount: 50n,
                senderAfter: 150n,
                blindings: {
                    senderBefore: ScalarOps.random(),
                    amount: ScalarOps.random(),
                    senderAfter: ScalarOps.random(),
                },
            },
            {
                senderBefore: 150n,
                amount: 75n,
                senderAfter: 75n,
                blindings: {
                    senderBefore: ScalarOps.random(),
                    amount: ScalarOps.random(),
                    senderAfter: ScalarOps.random(),
                },
            },
        ];

        // Sequential
        const seqLayer = new PrivacyLayer({ rangeBits: 8, enableParallel: false });
        const seqStart = Date.now();
        await seqLayer.generateBatchTransferProofs(transfers);
        const seqTime = Date.now() - seqStart;

        // Parallel
        const parLayer = new PrivacyLayer({ rangeBits: 8, enableParallel: true });
        const parStart = Date.now();
        await parLayer.generateBatchTransferProofs(transfers);
        const parTime = Date.now() - parStart;

        console.log(`   Sequential: ${seqTime}ms`);
        console.log(`   Parallel: ${parTime}ms`);
        console.log(`   Speedup: ${(seqTime / parTime).toFixed(2)}x`);
    });

    console.log('\n' + '='.repeat(80));
    console.log(`RESULTS: ${passed} passed, ${failed} failed`);
    console.log('='.repeat(80));

    if (failed > 0) {
        process.exit(1);
    }
}

runTests().catch(console.error);
