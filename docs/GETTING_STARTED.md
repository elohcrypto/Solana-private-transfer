# 🚀 Getting Started with Solana Privacy Transfer

## ⚠️ Security Warning

**IMPORTANT: This project has NOT been audited.**

- ✅ Safe for testing on DEVNET with test SOL
- ❌ NOT safe for mainnet or real funds
- ⚠️ Use at your own risk

This guide uses DEVNET only. Do not use on mainnet.

## What You'll Learn

In 10 minutes, you'll:
1. ✅ Run your first private transfer (on DEVNET)
2. ✅ See the amount hidden on Solana Explorer
3. ✅ Understand how privacy works

## Prerequisites

- Node.js 16+ installed
- Rust and Cargo installed (for program deployment)
- Solana CLI installed (for deployment)
- Anchor CLI installed (for program deployment)
- Basic terminal knowledge
- 5-10 minutes of time (testing)
- 15-20 minutes (if deploying your own program)

## Step 1: Clone and Install (2 minutes)

```bash
# Clone the repository
git clone <repository-url>
cd solana-privacy-transfer

# Install dependencies
npm install

# Build the project
npm run build
```

## Step 2: Run Your First Private Transfer (3 minutes)

```bash
# Run the test script
npx ts-node scripts/test/test-multi-recipient-sol-transfer.ts
```

**What this does:**
1. Creates 3 test accounts on Solana devnet
2. Deposits 0.1 SOL to Account 1
3. Sends 0.03 SOL privately to Account 2
4. Shows you the Solana Explorer link

**Expected output:**
```
🔐 Multi-Recipient SOL Privacy Transfer Test
Testing: test-account-1 → test-account-2 & test-account-3

📍 Loading test accounts...
Account 1 (Sender): Gam115nEisq3RjGE1BMp3...
Account 2 (Recipient): 9uziXV66LexjiAFhWmHH...

💰 Current SOL Balances:
Account 1: 1 SOL
Account 2: 1 SOL

======================================================================
STEP 1: Initialize All Accounts
======================================================================
✅ Initialized: 5tTCdRmBdBBVTRZG...

======================================================================
STEP 2: Deposit SOL to Account 1
======================================================================
✅ Deposit successful!
Explorer: https://explorer.solana.com/tx/...

======================================================================
STEP 3: Confidential Transfer #1 (Account 1 → Account 2)
======================================================================
🔐 Transfer: 0.03 SOL (HIDDEN)
Generating ZK proofs...
✅ Proofs generated in 3291ms
✅ Transfer #1 successful!
Signature: 5d5iHuuNK4CSTaEAYcowVAnS11zauaXKjr4cktp7i7dhEXa4...
Explorer: https://explorer.solana.com/tx/5d5iHuuNK4CSTaEAYcowVAnS11zauaXKjr4cktp7i7dhEXa4...?cluster=devnet
Amount: 0.03 SOL (ENCRYPTED on-chain)
```

## Step 3: Verify Privacy on Solana Explorer (2 minutes)

1. **Click the Explorer link** from the output above
2. **Look for the "Amount" field** in the transaction details
3. **Notice**: You'll see encrypted bytes, not "0.03 SOL"!

**What you'll see:**
```
Instruction #1
Privacy Transfer: Confidential Sol Transfer

Arguments:
- Amount: bytes (Base64) [ENCRYPTED]
- Sender New Commitment: [64 bytes] [ENCRYPTED]
- Recipient New Commitment: [64 bytes] [ENCRYPTED]
```

**This proves the amount is hidden!** 🎉

## Step 4: See What Public Can See (3 minutes)

```bash
# Run the public view test
npx ts-node scripts/test/test-public-view.ts
```

**This shows:**
- ✅ What anyone can see (addresses, encrypted data)
- ❌ What they CANNOT see (the actual amount)

**Expected output:**
```
🔍 PUBLIC VIEW: What Anyone Can See on Solana Explorer

📋 TRANSACTION DETAILS (Public)
✅ Transaction: 5d5iHuuNK4CSTaEAYcowVAnS11zauaXKjr4cktp7i7dhEXa4...
✅ Status: Success

📦 INSTRUCTION DATA (What was sent to the program)
Raw instruction data (158 bytes):
af580d6db49cda3b80c3c901000000009288beff3d42d0e15431f70b9d48d14e...

⚠️  This is ENCRYPTED data - looks like random bytes!
⚠️  Without private keys, you CANNOT extract the amount!

🔐 ENCRYPTED ACCOUNT DATA (On-chain state)
📍 Sender Encrypted Account:
   First 64 bytes (commitment):
   1d25d0a3418ea66d03fde214daa57b230693ced87d5645a4e97267646288d54a...
   ⚠️  This is the ENCRYPTED balance commitment!
   ⚠️  Cannot determine actual balance without private key!

======================================================================
📊 PRIVACY SUMMARY: What Public Can vs Cannot See
======================================================================

✅ PUBLIC CAN SEE:
   • Transaction signature and status
   • Sender and recipient addresses
   • That a transfer occurred

❌ PUBLIC CANNOT SEE:
   • Transfer amount (30,000,000 lamports / 0.03 SOL)
   • Sender's encrypted balance
   • Recipient's encrypted balance

🔐 PRIVACY LEVEL: HIGH
```

## Understanding the Results

### What You Just Did

1. **Created a private transfer** on Solana devnet
2. **Amount was encrypted** using Pedersen commitments
3. **Zero-knowledge proof** was generated to prove validity
4. **Transaction confirmed** on blockchain
5. **Amount is hidden** from public view

### The Privacy Breakdown

```
┌─────────────────────────────────────────┐
│ What YOU see (with private key):        │
│ ✅ Sent: 0.03 SOL                       │
│ ✅ To: Account 2                        │
│ ✅ Balance: 0.07 SOL remaining          │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ What PUBLIC sees (Solana Explorer):     │
│ ✅ From: Gam115nEisq3RjGE1BMp3...       │
│ ✅ To: 9uziXV66LexjiAFhWmHH...          │
│ ❌ Amount: [ENCRYPTED]                  │
│    1d25d0a3418ea66d03fde214daa57b...    │
└─────────────────────────────────────────┘
```

## Next Steps

### Learn More

1. **[PRIVACY_EXPLAINED.md](./PRIVACY_EXPLAINED.md)** - Understand how it works (simple explanation)
2. **[COMPARISON.md](./COMPARISON.md)** - Compare with other solutions
3. **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)** - Technical deep dive

### Try More Features

```bash
# Test multiple recipients
npx ts-node scripts/test/test-multi-recipient-sol-transfer.ts

# Test dual-mode (privacy + regular)
npx ts-node scripts/test/test-dual-mode-devnet.ts

# Run all tests
npm test
```

### Build Your Own

Check out the code:
- **Wallet**: `src/wallet/SolPrivacyMethods.ts`
- **Cryptography**: `src/crypto/bulletproof/`
- **On-chain program**: `programs/privacy-transfer/src/lib.rs`

## Advanced: Deploy Your Own Program

Want to deploy your own instance of the privacy program? Here's how:

### Step 1: Install Prerequisites

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install 0.32.1
avm use 0.32.1
```

### Step 2: Configure Solana

```bash
# Set to devnet
solana config set --url devnet

# Create a new keypair (or use existing)
solana-keygen new --outfile ~/.config/solana/id.json

# Get some devnet SOL
solana airdrop 2
```

### Step 3: Build the Program

```bash
# Build the Anchor program
anchor build

# This creates:
# - target/deploy/privacy_transfer.so (program binary)
# - target/idl/privacy_transfer.json (interface definition)
```

### Step 4: Deploy to Devnet

```bash
# Deploy the program
anchor deploy

# Output will show:
# Program Id: <YOUR_PROGRAM_ID>
```

### Step 5: Update Configuration

```bash
# Update Anchor.toml with your program ID
# Edit the [programs.devnet] section:
# privacy_transfer = "<YOUR_PROGRAM_ID>"

# Update declare_id! in programs/privacy-transfer/src/lib.rs
# declare_id!("<YOUR_PROGRAM_ID>");
```

### Step 6: Rebuild and Redeploy

```bash
# Rebuild with new program ID
anchor build

# Deploy again
anchor deploy
```

### Step 7: Test Your Deployment

```bash
# Run the test script with your program
npx ts-node scripts/test/test-multi-recipient-sol-transfer.ts

# Check your program on Solana Explorer
# https://explorer.solana.com/address/<YOUR_PROGRAM_ID>?cluster=devnet
```

### Deployment Costs

- **Program deployment**: ~2-3 SOL (refundable if you close the program)
- **Account rent**: ~0.001 SOL per account
- **Transactions**: ~0.000005 SOL per transaction

**Tip:** Get devnet SOL from faucets:
- `solana airdrop 2` (CLI)
- https://faucet.solana.com/ (Web)

> ⚠️ **CRITICAL WARNING**: Only deploy to DEVNET. This program has NOT been audited. Do not deploy to mainnet. Do not use with real funds. A professional security audit is required before any production deployment.

## Common Issues

### "Transaction failed"

**Cause:** Devnet might be congested or accounts need more SOL

**Solution:**
```bash
# Get more devnet SOL
solana airdrop 2 <your-address> --url devnet
```

### "Proof generation taking too long"

**Cause:** First run compiles code

**Solution:** Wait ~5 seconds. Subsequent runs will be faster.

### "Cannot find module"

**Cause:** Dependencies not installed

**Solution:**
```bash
npm install
npm run build
```

### "Anchor build failed"

**Cause:** Rust or Anchor not installed correctly

**Solution:**
```bash
# Check versions
rustc --version  # Should be 1.70+
anchor --version # Should be 0.32.1

# Reinstall if needed
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
```

### "Insufficient funds for deployment"

**Cause:** Not enough SOL in wallet

**Solution:**
```bash
# Check balance
solana balance

# Get more SOL
solana airdrop 2
# Or use web faucet: https://faucet.solana.com/
```

## FAQ

**Q: Is this safe to use?**
A: It's on devnet (testnet). Don't use real money yet. Mainnet requires security audit.

**Q: How much does it cost?**
A: Almost the same as regular transfers (~$0.00003 vs $0.000025)

**Q: Can I use this in my app?**
A: Yes! Check the code in `src/wallet/` for integration examples.

**Q: Is the amount really hidden?**
A: Yes! Check the Solana Explorer yourself - you'll see encrypted bytes, not the amount.

**Q: Why are addresses visible?**
A: Regulatory compliance. Many jurisdictions require knowing who sent to whom.

## Success Checklist

After completing this guide, you should have:

- ✅ Run a private transfer on Solana devnet
- ✅ Seen the encrypted amount on Solana Explorer
- ✅ Understood what's hidden vs visible
- ✅ Verified privacy works

**Congratulations!** You've just used privacy-preserving transfers on Solana! 🎉

## Get Help

- 📖 Read [PRIVACY_EXPLAINED.md](./PRIVACY_EXPLAINED.md)
- 🔍 Check [COMPARISON.md](./COMPARISON.md)
- 💬 Open an issue on GitHub
- 📧 Contact the team

---

**Ready to dive deeper?** Check out the [README.md](./README.md) for complete documentation.

---

## 💝 Support This Project

Enjoyed this guide? Support the project:

**Solana Donation Address:**
```
2o8L5Er4tDqkhLEEjK3YnDv8ZDuxuHBKwYkvtUXpWQ6S
```

Help fund security audits and future development! 🙏
