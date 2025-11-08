#!/bin/bash

# Test Organization Script
# Moves debug/development tests to archive/test/

echo "🗂️  Organizing test files..."
echo ""

# Create archive directories
mkdir -p archive/test/bulletproof-debug
mkdir -p archive/test/inner-product-debug
mkdir -p archive/test/verification-debug
mkdir -p archive/test/manual-computation
mkdir -p archive/test/equation-tests
mkdir -p archive/test/dalek-compat
mkdir -p archive/test/diagnostic
mkdir -p archive/test/deprecated
mkdir -p archive/test/demos

# Move Bulletproof debug tests
echo "📦 Moving Bulletproof debug tests..."
mv scripts/test/test-bulletproof-debug-detailed.ts archive/test/bulletproof-debug/ 2>/dev/null
mv scripts/test/test-bulletproof-debug.ts archive/test/bulletproof-debug/ 2>/dev/null
mv scripts/test/test-bulletproof-fixed-random.ts archive/test/bulletproof-debug/ 2>/dev/null
mv scripts/test/test-bulletproof-fixed.ts archive/test/bulletproof-debug/ 2>/dev/null
mv scripts/test/test-bulletproof-l-r.ts archive/test/bulletproof-debug/ 2>/dev/null
mv scripts/test/test-bulletproof-minimal.ts archive/test/bulletproof-debug/ 2>/dev/null
mv scripts/test/test-bulletproof-n2.ts archive/test/bulletproof-debug/ 2>/dev/null
mv scripts/test/test-bulletproof-n4.ts archive/test/bulletproof-debug/ 2>/dev/null
mv scripts/test/test-bulletproof-p-debug.ts archive/test/bulletproof-debug/ 2>/dev/null
mv scripts/test/test-bulletproof-simple.ts archive/test/bulletproof-debug/ 2>/dev/null
mv scripts/test/test-bulletproof-verify-debug.ts archive/test/bulletproof-debug/ 2>/dev/null
mv scripts/test/test-bulletproof-verify-fix.ts archive/test/bulletproof-debug/ 2>/dev/null

# Move Inner Product Argument debug tests
echo "📦 Moving Inner Product debug tests..."
mv scripts/test/test-inner-product-check.ts archive/test/inner-product-debug/ 2>/dev/null
mv scripts/test/test-inner-product-debug.ts archive/test/inner-product-debug/ 2>/dev/null
mv scripts/test/test-inner-product.ts archive/test/inner-product-debug/ 2>/dev/null
mv scripts/test/test-ipa-detailed-debug.ts archive/test/inner-product-debug/ 2>/dev/null
mv scripts/test/test-ipa-factors-debug.ts archive/test/inner-product-debug/ 2>/dev/null
mv scripts/test/test-ipa-minimal.ts archive/test/inner-product-debug/ 2>/dev/null
mv scripts/test/test-ipa-standalone.ts archive/test/inner-product-debug/ 2>/dev/null
mv scripts/test/test-ipa-verify-equation.ts archive/test/inner-product-debug/ 2>/dev/null
mv scripts/test/test-ipa-with-logging.ts archive/test/inner-product-debug/ 2>/dev/null
mv scripts/test/test-ipp-detailed.ts archive/test/inner-product-debug/ 2>/dev/null
mv scripts/test/test-ipp-only.ts archive/test/inner-product-debug/ 2>/dev/null

# Move Verification debug tests
echo "📦 Moving Verification debug tests..."
mv scripts/test/test-debug-verification.ts archive/test/verification-debug/ 2>/dev/null
mv scripts/test/test-detailed-verification.ts archive/test/verification-debug/ 2>/dev/null
mv scripts/test/test-verification-debug.ts archive/test/verification-debug/ 2>/dev/null
mv scripts/test/test-verification-equation.ts archive/test/verification-debug/ 2>/dev/null
mv scripts/test/test-verify-equation-detailed.ts archive/test/verification-debug/ 2>/dev/null
mv scripts/test/test-verify-with-factors.ts archive/test/verification-debug/ 2>/dev/null
mv scripts/test/test-simple-verify.ts archive/test/verification-debug/ 2>/dev/null

# Move Manual computation tests
echo "📦 Moving Manual computation tests..."
mv scripts/test/test-manual-computation.ts archive/test/manual-computation/ 2>/dev/null
mv scripts/test/test-manual-s-scalars.ts archive/test/manual-computation/ 2>/dev/null
mv scripts/test/test-manual-trace.ts archive/test/manual-computation/ 2>/dev/null
mv scripts/test/test-prove-manual.ts archive/test/manual-computation/ 2>/dev/null
mv scripts/test/test-prove-with-factors.ts archive/test/manual-computation/ 2>/dev/null
mv scripts/test/test-p-computation.ts archive/test/manual-computation/ 2>/dev/null
mv scripts/test/test-p-debug.ts archive/test/manual-computation/ 2>/dev/null
mv scripts/test/test-p-manual.ts archive/test/manual-computation/ 2>/dev/null
mv scripts/test/test-p-update-order.ts archive/test/manual-computation/ 2>/dev/null
mv scripts/test/test-p-variations.ts archive/test/manual-computation/ 2>/dev/null
mv scripts/test/test-s-detailed.ts archive/test/manual-computation/ 2>/dev/null
mv scripts/test/test-s-scalars-debug.ts archive/test/manual-computation/ 2>/dev/null
mv scripts/test/test-s-scalars.ts archive/test/manual-computation/ 2>/dev/null

# Move Equation/Formula tests
echo "📦 Moving Equation/Formula tests..."
mv scripts/test/test-commitment-equation.ts archive/test/equation-tests/ 2>/dev/null
mv scripts/test/test-correct-equation.ts archive/test/equation-tests/ 2>/dev/null
mv scripts/test/test-exact-equation.ts archive/test/equation-tests/ 2>/dev/null
mv scripts/test/test-exact-paper-formula.ts archive/test/equation-tests/ 2>/dev/null
mv scripts/test/test-lr-formulas.ts archive/test/equation-tests/ 2>/dev/null
mv scripts/test/test-t-commitment.ts archive/test/equation-tests/ 2>/dev/null
mv scripts/test/test-homomorphic-debug.ts archive/test/equation-tests/ 2>/dev/null

# Move Dalek compatibility tests
echo "📦 Moving Dalek compatibility tests..."
mv scripts/test/test-dalek-exact-impl.ts archive/test/dalek-compat/ 2>/dev/null
mv scripts/test/test-dalek-style.ts archive/test/dalek-compat/ 2>/dev/null
mv scripts/test/test-exact-dalek-test.ts archive/test/dalek-compat/ 2>/dev/null
mv scripts/test/test-exact-dalek.ts archive/test/dalek-compat/ 2>/dev/null

# Move Diagnostic tests
echo "📦 Moving Diagnostic tests..."
mv scripts/test/test-diagnostic.ts archive/test/diagnostic/ 2>/dev/null
mv scripts/test/test-show-issue.ts archive/test/diagnostic/ 2>/dev/null
mv scripts/test/test-minimal-debug.ts archive/test/diagnostic/ 2>/dev/null
mv scripts/test/test-final-fix.ts archive/test/diagnostic/ 2>/dev/null
mv scripts/test/test-challenges.ts archive/test/diagnostic/ 2>/dev/null
mv scripts/test/test-generators.ts archive/test/diagnostic/ 2>/dev/null
mv scripts/test/test-n64.ts archive/test/diagnostic/ 2>/dev/null
mv scripts/test/test-all-variations.ts archive/test/diagnostic/ 2>/dev/null

# Move Deprecated tests
echo "📦 Moving Deprecated tests..."
mv scripts/test/test-solana-zk-integration.ts archive/test/deprecated/ 2>/dev/null
mv scripts/test/test-solana-zk-proof-only.ts archive/test/deprecated/ 2>/dev/null
mv scripts/test/test-devnet-proof.ts archive/test/deprecated/ 2>/dev/null
mv scripts/test/test-deposit-working.ts archive/test/deprecated/ 2>/dev/null
mv scripts/test/test-deposit.ts archive/test/deprecated/ 2>/dev/null
mv scripts/test/test-withdraw-complete.ts archive/test/deprecated/ 2>/dev/null
mv scripts/test/test-withdraw-transfer.ts archive/test/deprecated/ 2>/dev/null
mv scripts/test/test-token2022.ts archive/test/deprecated/ 2>/dev/null
mv scripts/test/test-native-zk.ts archive/test/deprecated/ 2>/dev/null
mv scripts/test/test-range-proofs.ts archive/test/deprecated/ 2>/dev/null

# Move Demo tests
echo "📦 Moving Demo tests..."
mv scripts/test/test-primitives-demo.ts archive/test/demos/ 2>/dev/null
mv scripts/test/test-privacy-demo.ts archive/test/demos/ 2>/dev/null

echo ""
echo "✅ Test organization complete!"
echo ""
echo "📊 Summary:"
echo "   Active tests remain in: scripts/test/"
echo "   Archived tests moved to: archive/test/"
echo ""
echo "📝 Active test files:"
ls -1 scripts/test/*.ts 2>/dev/null | wc -l | xargs echo "   TypeScript tests:"
echo ""
echo "📦 Archived test files:"
find archive/test -name "*.ts" 2>/dev/null | wc -l | xargs echo "   Total archived:"
echo ""
echo "🔍 Review these files for potential duplication:"
echo "   - scripts/test/test-batch-concurrency.ts"
echo "   - scripts/test/test-batch-zk-proofs.ts"
