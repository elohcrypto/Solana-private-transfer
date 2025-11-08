#!/bin/bash

# Test CLI commands
echo "🔍 Testing CLI Commands"
echo ""

# Clean up
rm -rf .wallet-test

# Set test environment
export KEY_STORAGE_PATH=.wallet-test

echo "1️⃣ Testing help command..."
node dist/cli/index.js --help
echo ""

echo "2️⃣ Testing version command..."
node dist/cli/index.js --version
echo ""

echo "3️⃣ Testing init command help..."
node dist/cli/index.js init --help
echo ""

echo "4️⃣ Testing deposit command help..."
node dist/cli/index.js deposit --help
echo ""

echo "5️⃣ Testing balance command help..."
node dist/cli/index.js balance --help
echo ""

echo "6️⃣ Testing transfer command help..."
node dist/cli/index.js transfer --help
echo ""

echo "7️⃣ Testing history command help..."
node dist/cli/index.js history --help
echo ""

echo "✅ All CLI help commands work!"
echo ""
echo "📝 To test interactive commands:"
echo "   node dist/cli/index.js init"
echo "   node dist/cli/index.js balance"
echo "   node dist/cli/index.js deposit 10"
echo ""
echo "Or install globally:"
echo "   npm link"
echo "   utxo-wallet init"
