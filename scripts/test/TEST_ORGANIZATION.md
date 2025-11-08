# Test Organization Plan

## Current Tests (Keep - Active & Relevant)

### Core Component Tests (Keep in scripts/test/)
These are the main comprehensive test suites that validate the current implementation:

1. **test-primitives-manual.ts** ✅ KEEP
   - Tests cryptographic primitives (26 tests)
   - Core foundation tests

2. **test-bulletproof-comprehensive.ts** ✅ KEEP
   - Comprehensive Bulletproof tests (20 tests)
   - Main range proof validation

3. **test-validity-proof.ts** ✅ KEEP
   - Validity proof tests (11 tests)
   - Composite proof validation

4. **test-privacy-layer.ts** ✅ KEEP
   - Privacy layer API tests (12 tests)
   - High-level proof generation

5. **test-wallet-integration.ts** ✅ KEEP
   - Wallet integration tests (9 tests)
   - End-to-end wallet functionality

6. **test-encrypted-balance-tracker.ts** ✅ KEEP
   - Balance tracker tests (21 tests)
   - ElGamal encryption validation

7. **test-batch-queue.ts** ✅ KEEP
   - Batch processing tests (11 tests)
   - Parallel execution validation

8. **test-equality-proof.ts** ✅ KEEP
   - Equality proof tests
   - Schnorr-like protocol validation

---

## Debug/Development Tests (Archive)

### Bulletproof Debug Tests (Move to archive/test/)
These were used during development to debug specific issues:

- test-bulletproof-debug-detailed.ts ❌ ARCHIVE
- test-bulletproof-debug.ts ❌ ARCHIVE
- test-bulletproof-fixed-random.ts ❌ ARCHIVE
- test-bulletproof-fixed.ts ❌ ARCHIVE
- test-bulletproof-l-r.ts ❌ ARCHIVE
- test-bulletproof-minimal.ts ❌ ARCHIVE
- test-bulletproof-n2.ts ❌ ARCHIVE
- test-bulletproof-n4.ts ❌ ARCHIVE
- test-bulletproof-p-debug.ts ❌ ARCHIVE
- test-bulletproof-simple.ts ❌ ARCHIVE
- test-bulletproof-verify-debug.ts ❌ ARCHIVE
- test-bulletproof-verify-fix.ts ❌ ARCHIVE

### Inner Product Argument Debug Tests (Move to archive/test/)
- test-inner-product-check.ts ❌ ARCHIVE
- test-inner-product-debug.ts ❌ ARCHIVE
- test-inner-product.ts ❌ ARCHIVE (superseded by comprehensive)
- test-ipa-detailed-debug.ts ❌ ARCHIVE
- test-ipa-factors-debug.ts ❌ ARCHIVE
- test-ipa-minimal.ts ❌ ARCHIVE
- test-ipa-standalone.ts ❌ ARCHIVE
- test-ipa-verify-equation.ts ❌ ARCHIVE
- test-ipa-with-logging.ts ❌ ARCHIVE
- test-ipp-detailed.ts ❌ ARCHIVE
- test-ipp-only.ts ❌ ARCHIVE

### Verification Debug Tests (Move to archive/test/)
- test-debug-verification.ts ❌ ARCHIVE
- test-detailed-verification.ts ❌ ARCHIVE
- test-verification-debug.ts ❌ ARCHIVE
- test-verification-equation.ts ❌ ARCHIVE
- test-verify-equation-detailed.ts ❌ ARCHIVE
- test-verify-with-factors.ts ❌ ARCHIVE
- test-simple-verify.ts ❌ ARCHIVE

### Manual Computation Tests (Move to archive/test/)
- test-manual-computation.ts ❌ ARCHIVE
- test-manual-s-scalars.ts ❌ ARCHIVE
- test-manual-trace.ts ❌ ARCHIVE
- test-prove-manual.ts ❌ ARCHIVE
- test-prove-with-factors.ts ❌ ARCHIVE
- test-p-computation.ts ❌ ARCHIVE
- test-p-debug.ts ❌ ARCHIVE
- test-p-manual.ts ❌ ARCHIVE
- test-p-update-order.ts ❌ ARCHIVE
- test-p-variations.ts ❌ ARCHIVE
- test-s-detailed.ts ❌ ARCHIVE
- test-s-scalars-debug.ts ❌ ARCHIVE
- test-s-scalars.ts ❌ ARCHIVE

### Equation/Formula Tests (Move to archive/test/)
- test-commitment-equation.ts ❌ ARCHIVE
- test-correct-equation.ts ❌ ARCHIVE
- test-exact-equation.ts ❌ ARCHIVE
- test-exact-paper-formula.ts ❌ ARCHIVE
- test-lr-formulas.ts ❌ ARCHIVE
- test-t-commitment.ts ❌ ARCHIVE
- test-homomorphic-debug.ts ❌ ARCHIVE

### Dalek Compatibility Tests (Move to archive/test/)
- test-dalek-exact-impl.ts ❌ ARCHIVE
- test-dalek-style.ts ❌ ARCHIVE
- test-exact-dalek-test.ts ❌ ARCHIVE
- test-exact-dalek.ts ❌ ARCHIVE

### Diagnostic/Show Issue Tests (Move to archive/test/)
- test-diagnostic.ts ❌ ARCHIVE
- test-show-issue.ts ❌ ARCHIVE
- test-minimal-debug.ts ❌ ARCHIVE
- test-final-fix.ts ❌ ARCHIVE

### Specific Feature Tests (Move to archive/test/)
- test-challenges.ts ❌ ARCHIVE
- test-generators.ts ❌ ARCHIVE
- test-n64.ts ❌ ARCHIVE (specific bit size test)
- test-all-variations.ts ❌ ARCHIVE

---

## Integration/E2E Tests (Keep but Review)

### Devnet Integration Tests (Keep in scripts/test/)
- test-e2e-devnet-integration.ts ✅ KEEP
- test-real-devnet-transfer.ts ✅ KEEP
- test-funded-devnet-transfer.ts ✅ KEEP
- test-on-chain-privacy.ts ✅ KEEP

### Wallet Flow Tests (Keep in scripts/test/)
- test-wallet-native-zk.ts ✅ KEEP
- test-wallet-zk-integration.ts ✅ KEEP
- test-transfer-flow-with-proofs.ts ✅ KEEP

### Component Tests (Keep in scripts/test/)
- test-transaction-history.ts ✅ KEEP
- test-error-handling.ts ✅ KEEP
- test-elgamal.ts ❌ REMOVED (DEPRECATED - Replaced with Pedersen commitments)

---

## Deprecated/Outdated Tests (Archive)

### Elusiv/Old Protocol Tests (Move to archive/test/)
- test-solana-zk-integration.ts ❌ ARCHIVE (old approach)
- test-solana-zk-proof-only.ts ❌ ARCHIVE (old approach)
- test-devnet-proof.ts ❌ ARCHIVE (old approach)

### Old Wallet Tests (Move to archive/test/)
- test-deposit-working.ts ❌ ARCHIVE (superseded)
- test-deposit.ts ❌ ARCHIVE (superseded)
- test-withdraw-complete.ts ❌ ARCHIVE (superseded)
- test-withdraw-transfer.ts ❌ ARCHIVE (superseded)
- test-token2022.ts ❌ ARCHIVE (basic test, superseded)

### Demo/Example Tests (Move to archive/test/)
- test-primitives-demo.ts ❌ ARCHIVE (demo, not test)
- test-privacy-demo.ts ❌ ARCHIVE (demo, not test)
- test-native-zk.ts ❌ ARCHIVE (old approach)

### Batch Tests (Review - some may be duplicates)
- test-batch-concurrency.ts ⚠️ REVIEW (may be duplicate of test-batch-queue.ts)
- test-batch-zk-proofs.ts ⚠️ REVIEW (may be duplicate)

### Range Proof Tests (Archive - superseded by comprehensive)
- test-range-proofs.ts ❌ ARCHIVE (superseded by comprehensive)

---

## Summary

### Keep (Active Tests): ~20 files
- Core component tests (8 files)
- Integration/E2E tests (7 files)
- Wallet flow tests (3 files)
- Component tests (2 files)

### Archive (Debug/Development): ~70 files
- Bulletproof debug tests (~12 files)
- Inner product debug tests (~11 files)
- Verification debug tests (~7 files)
- Manual computation tests (~10 files)
- Equation/formula tests (~7 files)
- Dalek compatibility tests (~4 files)
- Diagnostic tests (~4 files)
- Deprecated tests (~10 files)
- Demo tests (~3 files)
- Other debug tests (~2 files)

### Review: ~2 files
- Batch tests that may be duplicates

---

## Recommended Actions

1. **Keep in scripts/test/**: 20 core test files
2. **Move to archive/test/**: ~70 debug/development test files
3. **Review**: 2 batch test files for potential duplication
4. **Create**: Test suite runner script to run all active tests

---

**Last Updated**: Current Session
**Status**: Organization plan ready for execution
