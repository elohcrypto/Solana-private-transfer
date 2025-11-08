# Test Suite Documentation

## Overview

This directory contains the active test suite for the Solana Confidential Wallet project. All tests validate the custom Zero-Knowledge proof implementation and wallet functionality.

**Total Active Tests**: 18 test files covering 110+ individual test cases

---

## Test Categories

### 1. Core Component Tests (8 files)

These tests validate the fundamental cryptographic components:

#### **test-primitives-manual.ts** (26 tests)
- Curve operations (Ristretto255)
- Scalar arithmetic
- Pedersen commitments
- Transcript generation
- Vector operations

**Run**: `npx ts-node scripts/test/test-primitives-manual.ts`

#### **test-bulletproof-comprehensive.ts** (20 tests)
- Bulletproof range proof generation
- Proof verification
- Edge cases (0, max value, out of range)
- Performance benchmarks

**Run**: `npx ts-node scripts/test/test-bulletproof-comprehensive.ts`

#### **test-equality-proof.ts**
- Schnorr-like equality proofs
- Commitment consistency validation
- Zero-knowledge property verification

**Run**: `npx ts-node scripts/test/test-equality-proof.ts`

#### **test-validity-proof.ts** (11 tests)
- Composite validity proofs
- Transfer proof generation
- Multi-input/output transactions
- Proof composition

**Run**: `npx ts-node scripts/test/test-validity-proof.ts`

#### **test-privacy-layer.ts** (12 tests)
- High-level privacy API
- Proof caching
- Parallel proof generation
- Batch proof generation

**Run**: `npx ts-node scripts/test/test-privacy-layer.ts`

#### **test-elgamal.ts** (REMOVED)
- ~~ElGamal encryption/decryption~~ (DEPRECATED - Removed)
- ~~Keypair generation~~ (DEPRECATED - Removed)
- ~~Homomorphic operations~~ (DEPRECATED - Removed)
**Status**: Removed - ElGamal has been replaced with Pedersen commitments

#### **test-encrypted-balance-tracker.ts** (24 tests - Pedersen Commitments)
- **Pedersen Commitments**: Balance commitments using Ristretto255
- Balance storage and retrieval (plaintext + commitment)
- Commitment verification
- Transfer processing with homomorphic operations
- Synchronization with external balances
- Persistence (save/load/export/import)
- Metadata and statistics tracking

**Features**:
- ✅ No keypair needed (Pedersen commitments don't require keys)
- ✅ 32-byte commitments (Ristretto255 points)
- ✅ Homomorphic addition/subtraction
- ✅ Commitment verification

**Run**: `npx ts-node scripts/test/test-encrypted-balance-tracker.ts`

#### **test-batch-queue.ts** (11 tests)
- Batch processing
- Parallel execution
- Retry logic
- Concurrency control

**Run**: `npx ts-node scripts/test/test-batch-queue.ts`

---

### 2. Wallet Integration Tests (5 files)

These tests validate wallet functionality with ZK proofs:

#### **test-wallet-integration.ts** (9 tests)
- Wallet creation and initialization
- Transfer flow with proofs
- Balance tracking (Pedersen commitments)
- Error handling

**Run**: `npx ts-node scripts/test/test-wallet-integration.ts`

#### **test-wallet-native-zk.ts**
- Native ZK proof integration
- Proof generation in transfers
- Local verification

**Run**: `npx ts-node scripts/test/test-wallet-native-zk.ts`

#### **test-wallet-zk-integration.ts**
- Complete ZK integration
- End-to-end transfer flow
- Metadata tracking

**Run**: `npx ts-node scripts/test/test-wallet-zk-integration.ts`

#### **test-transaction-history.ts**
- Transaction recording
- History filtering
- Persistence

**Run**: `npx ts-node scripts/test/test-transaction-history.ts`

#### **test-error-handling.ts**
- Error classification
- Retry logic
- Recovery mechanisms

**Run**: `npx ts-node scripts/test/test-error-handling.ts`

---

### 3. Transfer Flow Tests (1 file)

#### **test-transfer-flow-with-proofs.ts**
- Complete transfer workflow
- Proof generation and verification
- Balance updates

**Run**: `npx ts-node scripts/test/test-transfer-flow-with-proofs.ts`

---

### 4. Devnet Integration Tests (4 files)

These tests require live devnet connection and funded accounts:

#### **test-e2e-devnet-integration.ts**
- End-to-end devnet testing
- Real blockchain interaction
- Complete transfer flow

**Run**: `npx ts-node scripts/test/test-e2e-devnet-integration.ts`

#### **test-real-devnet-transfer.ts**
- Real devnet transfers
- On-chain verification
- Transaction confirmation

**Run**: `npx ts-node scripts/test/test-real-devnet-transfer.ts`

#### **test-funded-devnet-transfer.ts**
- Funded account transfers
- Balance verification
- Transaction tracking

**Run**: `npx ts-node scripts/test/test-funded-devnet-transfer.ts`

#### **test-on-chain-privacy.ts**
- On-chain privacy verification
- Commitment visibility check
- Amount hiding validation

**Run**: `npx ts-node scripts/test/test-on-chain-privacy.ts`

---

## Running Tests

### Run All Tests
```bash
bash scripts/test/run-all-tests.sh
```

### Run Individual Test
```bash
npx ts-node scripts/test/<test-file>.ts
```

### Run Specific Category
```bash
# Core components
npx ts-node scripts/test/test-primitives-manual.ts
npx ts-node scripts/test/test-bulletproof-comprehensive.ts
npx ts-node scripts/test/test-validity-proof.ts

# Wallet integration
npx ts-node scripts/test/test-wallet-integration.ts
npx ts-node scripts/test/test-wallet-zk-integration.ts

# Devnet (requires connection)
npx ts-node scripts/test/test-e2e-devnet-integration.ts
```

---

## Test Results Summary

| Category | Files | Tests | Status |
|----------|-------|-------|--------|
| Core Components | 8 | 101+ | ✅ Passing |
| Wallet Integration | 5 | 9+ | ✅ Passing |
| Transfer Flow | 1 | - | ✅ Passing |
| Devnet Integration | 4 | - | ⚠️ Requires devnet |
| **Total** | **18** | **110+** | **✅ Passing** |

---

## Archived Tests

Debug and development tests have been moved to `archive/test/` and organized by category:

- `archive/test/bulletproof-debug/` - Bulletproof debugging tests (12 files)
- `archive/test/inner-product-debug/` - Inner product debugging (11 files)
- `archive/test/verification-debug/` - Verification debugging (7 files)
- `archive/test/manual-computation/` - Manual computation tests (13 files)
- `archive/test/equation-tests/` - Equation validation tests (7 files)
- `archive/test/dalek-compat/` - Dalek compatibility tests (4 files)
- `archive/test/diagnostic/` - Diagnostic tests (10 files)
- `archive/test/deprecated/` - Deprecated tests (10 files)
- `archive/test/demos/` - Demo tests (2 files)

**Total Archived**: 74 files

These tests were useful during development but are superseded by the comprehensive test suites.

---

## Test Coverage

### Cryptographic Primitives ✅
- Curve operations (Ristretto255)
- Scalar arithmetic
- Pedersen commitments
- Transcript generation
- Vector operations

### Zero-Knowledge Proofs ✅
- Bulletproof range proofs
- Equality proofs (Schnorr-like)
- Validity proofs (composite)
- Inner product arguments
- Proof verification

### Privacy Layer ✅
- High-level API
- Proof caching
- Parallel generation
- Batch processing

### Wallet Functionality ✅
- Wallet creation
- Key management
- Transfer flow
- Balance tracking (Pedersen commitments)
- Transaction history

### Batch Processing ✅
- Parallel execution
- Concurrency control
- Retry logic
- Error handling

### Integration ✅
- End-to-end flows
- Devnet interaction
- On-chain privacy
- Real transactions

---

## Performance Benchmarks

Tests include performance measurements:

- **Primitives**: <10ms per operation
- **Range Proof (n=16)**: ~145ms average
- **Range Proof (n=32)**: <600ms maximum
- **Equality Proof**: 6ms generation
- **Validity Proof**: 206-801ms
- **Batch (3 transfers)**: 1.2s parallel

---

## Contributing

When adding new tests:

1. Place in appropriate category
2. Follow naming convention: `test-<component>-<feature>.ts`
3. Include test count in header comment
4. Add to `run-all-tests.sh` if core test
5. Update this README

---

## Troubleshooting

### Import Errors
If you see import errors, ensure you're running from project root:
```bash
cd /path/to/Solana-private-sent
npx ts-node scripts/test/<test-file>.ts
```

### Devnet Tests Failing
Devnet tests require:
- Live internet connection
- Funded devnet accounts
- Valid RPC endpoint

### Performance Issues
Some tests may be slow on first run due to:
- Proof generation (computationally intensive)
- Network latency (devnet tests)
- Cache warming

---

**Last Updated**: Current Session  
**Status**: Test suite organized and documented  
**Total Tests**: 110+ passing
