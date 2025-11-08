#!/bin/bash

# Run All Active Tests
# Executes all core test suites and reports results

echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo "║                    SOLANA CONFIDENTIAL WALLET TEST SUITE                   ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"
echo ""

PASSED=0
FAILED=0
TOTAL=0

run_test() {
    local test_file=$1
    local test_name=$2
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🧪 Running: $test_name"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    TOTAL=$((TOTAL + 1))
    
    if npx ts-node "$test_file" 2>&1; then
        PASSED=$((PASSED + 1))
        echo "✅ $test_name PASSED"
    else
        FAILED=$((FAILED + 1))
        echo "❌ $test_name FAILED"
    fi
    
    echo ""
}

# Core Component Tests
echo "═══════════════════════════════════════════════════════════════════════════════"
echo "                          CORE COMPONENT TESTS                                 "
echo "═══════════════════════════════════════════════════════════════════════════════"
echo ""

run_test "scripts/test/test-primitives-manual.ts" "Cryptographic Primitives (26 tests)"
run_test "scripts/test/test-bulletproof-comprehensive.ts" "Bulletproof Range Proofs (20 tests)"
run_test "scripts/test/test-equality-proof.ts" "Equality Proofs"
run_test "scripts/test/test-validity-proof.ts" "Validity Proofs (11 tests)"
run_test "scripts/test/test-privacy-layer.ts" "Privacy Layer (12 tests)"
run_test "scripts/test/test-encrypted-balance-tracker.ts" "Encrypted Balance Tracker (Pedersen Commitments)"
run_test "scripts/test/test-batch-queue.ts" "Batch Queue (11 tests)"

# Wallet Integration Tests
echo "═══════════════════════════════════════════════════════════════════════════════"
echo "                        WALLET INTEGRATION TESTS                               "
echo "═══════════════════════════════════════════════════════════════════════════════"
echo ""

run_test "scripts/test/test-wallet-integration.ts" "Wallet Integration (9 tests)"
run_test "scripts/test/test-transaction-history.ts" "Transaction History"
run_test "scripts/test/test-error-handling.ts" "Error Handling"

# Transfer Flow Tests
echo "═══════════════════════════════════════════════════════════════════════════════"
echo "                          TRANSFER FLOW TESTS                                  "
echo "═══════════════════════════════════════════════════════════════════════════════"
echo ""

run_test "scripts/test/test-transfer-flow-with-proofs.ts" "Transfer Flow with Proofs"

# Privacy Transaction Tests (E2E)
echo "═══════════════════════════════════════════════════════════════════════════════"
echo "                      PRIVACY TRANSACTION E2E TESTS                            "
echo "═══════════════════════════════════════════════════════════════════════════════"
echo ""

run_test "scripts/test/test-privacy-transaction-e2e.ts" "Privacy Transaction E2E"

# Dual Mode Tests (Token + SOL)
echo "═══════════════════════════════════════════════════════════════════════════════"
echo "                    DUAL MODE TESTS (Token-2022 + Native SOL)                  "
echo "═══════════════════════════════════════════════════════════════════════════════"
echo ""

run_test "scripts/test/test-dual-mode-simple.ts" "Dual Mode ZK Proofs (Token & SOL)"
run_test "scripts/test/test-sol-privacy-demo.ts" "SOL Privacy Demo"

# Devnet Integration Tests (Optional - requires devnet connection)
echo "═══════════════════════════════════════════════════════════════════════════════"
echo "                      DEVNET INTEGRATION TESTS (Optional)                      "
echo "═══════════════════════════════════════════════════════════════════════════════"
echo ""
echo "⚠️  Skipping devnet tests (require live connection and funded accounts)"
echo "   To run manually:"
echo ""
echo "   Token-2022 Privacy (Existing):"
echo "   - npx ts-node scripts/test/test-wallet-real-integration.ts"
echo "   - npx ts-node scripts/test/test-e2e-devnet-integration.ts"
echo "   - npx ts-node scripts/test/test-real-devnet-transfer.ts"
echo "   - npx ts-node scripts/test/test-funded-devnet-transfer.ts"
echo "   - npx ts-node scripts/test/test-on-chain-privacy.ts"
echo ""
echo "   Native SOL Privacy (New - Dual Mode):"
echo "   - npx ts-node scripts/test/test-real-sol-transfer-devnet-fixed.ts"
echo ""

# Summary
echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo "║                              TEST SUMMARY                                   ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"
echo ""
echo "Total Tests:  $TOTAL"
echo "Passed:       $PASSED ✅"
echo "Failed:       $FAILED ❌"
echo ""

if [ $FAILED -eq 0 ]; then
    echo "🎉 All tests passed!"
    exit 0
else
    echo "⚠️  Some tests failed. Please review the output above."
    exit 1
fi
