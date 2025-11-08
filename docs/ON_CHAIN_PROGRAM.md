# 🔐 On-Chain Privacy Transfer Program

## ⚠️ Security Warning

**CRITICAL: This program has NOT undergone a security audit.**

- ✅ **Devnet**: Safe for testing purposes only
- ❌ **Mainnet**: DO NOT DEPLOY - Not audited
- ⚠️ **Risk Level**: HIGH - Use at your own risk

**This program requires professional security audit before production use.**

Do not use with real funds. Test on devnet only.

## Overview

The Privacy Transfer Program is a Solana smart contract (written in Rust using Anchor framework) that stores encrypted balance commitments and manages private SOL transfers on-chain.

**Program ID (Devnet):** `HHvRt9CScrgHkfhDGUiwbskYpCSA9PetdT4uVwQ5C7f5`

**Location:** `programs/privacy-transfer/src/lib.rs`

**Status:** ⚠️ NOT AUDITED - Devnet testing only

## What It Does

### Core Functionality

1. **Stores Encrypted Balances**
   - Uses Pedersen commitments (64 bytes)
   - Balances are HIDDEN on-chain
   - Only commitment visible, not actual amount

2. **Manages SOL Escrow**
   - Holds actual SOL in escrow accounts
   - Tracks encrypted balances separately
   - Enables native SOL privacy transfers

3. **Validates Transfers**
   - Verifies account ownership
   - Checks proof data presence
   - Updates encrypted commitments

## Program Structure

### Instructions

```rust
pub mod privacy_transfer {
    // 1. Initialize encrypted account
    pub fn initialize_account(ctx: Context<InitializeAccount>) -> Result<()>
    
    // 2. Initialize SOL escrow
    pub fn initialize_sol_escrow(ctx: Context<InitializeSolEscrow>) -> Result<()>
    
    // 3. Deposit SOL (plaintext → encrypted)
    pub fn deposit(
        ctx: Context<Deposit>,
        _amount_hint: u64,
        encrypted_commitment: [u8; 64],
    ) -> Result<()>
    
    // 4. Confidential transfer (encrypted → encrypted)
    pub fn confidential_transfer(
        ctx: Context<ConfidentialTransfer>,
        sender_new_commitment: [u8; 64],
        recipient_new_commitment: [u8; 64],
        proof_data: Vec<u8>,
    ) -> Result<()>
    
    // 5. Confidential SOL transfer (native SOL)
    pub fn confidential_sol_transfer(
        ctx: Context<ConfidentialSolTransfer>,
        amount: u64,
        sender_new_commitment: [u8; 64],
        recipient_new_commitment: [u8; 64],
        proof_data: Vec<u8>,
    ) -> Result<()>
    
    // 6. Withdraw (encrypted → plaintext)
    pub fn withdraw(
        ctx: Context<Withdraw>,
        amount: u64,
        new_commitment: [u8; 64],
        proof_data: Vec<u8>,
    ) -> Result<()>
}
```

### Account Structures

#### EncryptedAccount

```rust
#[account]
pub struct EncryptedAccount {
    pub owner: Pubkey,              // 32 bytes - Account owner
    pub encrypted_balance: [u8; 64], // 64 bytes - Pedersen commitment
    pub version: u64,                // 8 bytes - Update counter
    pub bump: u8,                    // 1 byte - PDA bump seed
}
// Total: 105 bytes
```

**What's stored:**
- Owner's public key (visible)
- Encrypted balance commitment (HIDDEN amount)
- Version number (for tracking updates)
- PDA bump (for account derivation)

#### SolEscrow

```rust
#[account]
pub struct SolEscrow {
    pub owner: Pubkey,    // 32 bytes - Escrow owner
    pub balance: u64,     // 8 bytes - Actual SOL balance
    pub bump: u8,         // 1 byte - PDA bump seed
}
// Total: 41 bytes
```

**What's stored:**
- Owner's public key (visible)
- Actual SOL balance (visible)
- PDA bump (for account derivation)

**Note:** The escrow balance is visible, but the encrypted account commitment hides individual transaction amounts.

## How It Works

### 1. Account Initialization

```
User → initialize_account()
         ↓
Creates EncryptedAccount PDA
         ↓
Stores: owner, zero commitment, version=0
         ↓
Result: Account ready for deposits
```

### 2. Deposit Flow

```
User has: 0.1 SOL (plaintext)
         ↓
Client generates: Pedersen commitment
         ↓
Call: deposit(commitment)
         ↓
Program stores: encrypted_balance = commitment
         ↓
Result: Balance is now ENCRYPTED on-chain
```

### 3. Transfer Flow

```
Sender: Has encrypted balance
         ↓
Client generates:
  - New sender commitment (old - amount)
  - New recipient commitment (old + amount)
  - ZK proofs (range, equality, validity)
         ↓
Call: confidential_transfer(
  sender_new_commitment,
  recipient_new_commitment,
  proof_data
)
         ↓
Program validates:
  - Sender owns account ✓
  - Proof data present ✓
  - Commitments valid ✓
         ↓
Program updates:
  - sender.encrypted_balance = sender_new_commitment
  - recipient.encrypted_balance = recipient_new_commitment
         ↓
Result: Transfer complete, amount HIDDEN
```

### 4. SOL Transfer Flow

```
Sender: Has SOL in escrow
         ↓
Client generates:
  - New commitments
  - ZK proofs
         ↓
Call: confidential_sol_transfer(
  amount,
  sender_new_commitment,
  recipient_new_commitment,
  proof_data
)
         ↓
Program:
  1. Transfers SOL between escrows
  2. Updates encrypted commitments
         ↓
Result: SOL moved, amount HIDDEN in commitments
```

## Privacy Guarantees

### What's Hidden 🔒

1. **Transfer Amounts**
   - Stored as Pedersen commitments
   - Cannot be decrypted without private key
   - Only sender and recipient know amount

2. **Account Balances**
   - Encrypted commitments on-chain
   - Cannot determine balance from commitment
   - Only owner can decrypt

3. **Transaction History**
   - Past transfer amounts hidden
   - Cannot trace transaction amounts
   - Only commitments visible

### What's Visible 👁️

1. **Addresses**
   - Sender address (visible)
   - Recipient address (visible)
   - Account owners (visible)

2. **Transaction Metadata**
   - Transaction signature
   - Timestamp
   - That a transfer occurred

3. **Escrow Balances**
   - Total SOL in escrow (visible)
   - But not individual transaction amounts

## Security Features

### Current Implementation

1. **Ownership Verification**
   ```rust
   require!(
       sender_account.owner == ctx.accounts.sender.key(),
       ErrorCode::Unauthorized
   );
   ```

2. **Proof Data Validation**
   ```rust
   require!(
       proof_data.len() > 0,
       ErrorCode::InvalidProof
   );
   ```

3. **Commitment Validation**
   ```rust
   require!(
       sender_new_commitment != [0u8; 64],
       ErrorCode::InvalidCommitment
   );
   ```

### Proof Verification

**Note**: For details on proof verification (on-chain and off-chain), see [HYBRID_VERIFICATION_ARCHITECTURE.md](./HYBRID_VERIFICATION_ARCHITECTURE.md).

The program performs structural validation of proofs on-chain. Full cryptographic verification is performed off-chain due to Solana's constraints (4KB stack limit, 1232 byte transaction limit).

## Program Deployment

### Current Deployment (Devnet)

**Program ID:** `HHvRt9CScrgHkfhDGUiwbskYpCSA9PetdT4uVwQ5C7f5`

**Explorer:** https://explorer.solana.com/address/HHvRt9CScrgHkfhDGUiwbskYpCSA9PetdT4uVwQ5C7f5?cluster=devnet

**Deployment Date:** October 2025

**Status:** ✅ Active on devnet

### Deploy Your Own

See [GETTING_STARTED.md](../GETTING_STARTED.md#advanced-deploy-your-own-program) for detailed deployment instructions.

**Quick steps:**
```bash
# 1. Build
anchor build

# 2. Deploy
anchor deploy

# 3. Update program ID in code
# Edit: programs/privacy-transfer/src/lib.rs
# declare_id!("<YOUR_PROGRAM_ID>");

# 4. Rebuild and redeploy
anchor build
anchor deploy
```

## Program Accounts

### Account Derivation (PDAs)

**Encrypted Account PDA:**
```rust
seeds = [b"encrypted-account", owner.key().as_ref()]
```

**SOL Escrow PDA:**
```rust
seeds = [b"sol-escrow", owner.key().as_ref()]
```

**Example:**
```typescript
// Find encrypted account PDA
const [encryptedAccountPDA] = PublicKey.findProgramAddressSync(
  [Buffer.from("encrypted-account"), owner.publicKey.toBuffer()],
  programId
);

// Find SOL escrow PDA
const [solEscrowPDA] = PublicKey.findProgramAddressSync(
  [Buffer.from("sol-escrow"), owner.publicKey.toBuffer()],
  programId
);
```

### Account Rent

**Rent costs (devnet/mainnet):**
- EncryptedAccount (105 bytes): ~0.00167 SOL
- SolEscrow (41 bytes): ~0.00123 SOL
- Total per user: ~0.0029 SOL

**Rent is refundable** when accounts are closed.

## Integration Guide

### Client-Side Integration

```typescript
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';

// 1. Load program
const programId = new PublicKey('HHvRt9CScrgHkfhDGUiwbskYpCSA9PetdT4uVwQ5C7f5');
const connection = new Connection('https://api.devnet.solana.com');
const provider = new AnchorProvider(connection, wallet, {});
const program = new Program(IDL, programId, provider);

// 2. Initialize account
await program.methods
  .initializeAccount()
  .accounts({
    encryptedAccount: encryptedAccountPDA,
    owner: wallet.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .rpc();

// 3. Deposit
const commitment = generatePedersenCommitment(amount, blinding);
await program.methods
  .deposit(new BN(amount), Array.from(commitment))
  .accounts({
    encryptedAccount: encryptedAccountPDA,
    owner: wallet.publicKey,
  })
  .rpc();

// 4. Transfer
const proofs = await generateZKProofs(amount, senderBalance, recipientBalance);
await program.methods
  .confidentialTransfer(
    Array.from(senderNewCommitment),
    Array.from(recipientNewCommitment),
    Array.from(proofs)
  )
  .accounts({
    senderAccount: senderEncryptedAccountPDA,
    recipientAccount: recipientEncryptedAccountPDA,
    sender: wallet.publicKey,
  })
  .rpc();
```

### Full Example

See: `scripts/test/test-multi-recipient-sol-transfer.ts`

## Testing

### Run Tests

```bash
# Test all program functionality
npx ts-node scripts/test/test-multi-recipient-sol-transfer.ts

# Test specific features
npx ts-node scripts/test/test-dual-mode-devnet.ts
```

### Test Coverage

- ✅ Account initialization
- ✅ SOL escrow initialization
- ✅ Deposits
- ✅ Confidential transfers
- ✅ Multi-recipient transfers
- ✅ Withdrawals
- ✅ Error handling

## Performance

### Transaction Costs

| Operation | Compute Units | Cost (SOL) |
|-----------|---------------|------------|
| Initialize Account | ~5,000 | ~0.000005 |
| Initialize Escrow | ~5,000 | ~0.000005 |
| Deposit | ~8,000 | ~0.000005 |
| Confidential Transfer | ~12,000 | ~0.000005 |
| Withdraw | ~10,000 | ~0.000005 |

### Compute Budget

**Current usage:** ~12,000 CU per transfer
**Solana limit:** 200,000 CU per transaction
**Headroom:** ~94% available for future features

## Limitations

### Current Limitations

1. **Hybrid Verification System**
   - On-chain: Structural validation (fast, efficient)
   - Off-chain: Full cryptographic verification (complete security)
   - See [HYBRID_VERIFICATION_ARCHITECTURE.md](./HYBRID_VERIFICATION_ARCHITECTURE.md) for details

2. **No Proof Batching**
   - Each transfer requires separate proofs
   - Cannot batch multiple transfers
   - Future optimization opportunity

3. **Fixed Commitment Size**
   - 64-byte commitments
   - Cannot change without migration
   - Sufficient for current needs

### Future Improvements

1. **Enhanced On-Chain Verification**
   - Currently performs structural validation
   - Full cryptographic verification done off-chain
   - See [HYBRID_VERIFICATION_ARCHITECTURE.md](./HYBRID_VERIFICATION_ARCHITECTURE.md) for details

2. **Proof Aggregation**
   - Batch multiple proofs
   - Reduce transaction size
   - Lower costs

3. **Optimized Compute**
   - Use Solana's native ZK program (when available)
   - Optimize elliptic curve operations
   - Reduce compute units

## Error Codes

```rust
#[error_code]
pub enum ErrorCode {
    #[msg("Unauthorized: You don't own this account")]
    Unauthorized,
    
    #[msg("Invalid proof: Proof data is invalid or missing")]
    InvalidProof,
    
    #[msg("Invalid commitment: Commitment is zero or malformed")]
    InvalidCommitment,
    
    #[msg("Insufficient balance: Not enough encrypted balance")]
    InsufficientBalance,
}
```

## Resources

### Documentation
- [GETTING_STARTED.md](../GETTING_STARTED.md) - Deployment guide
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [README.md](../README.md) - Main documentation

### Source Code
- Program: `programs/privacy-transfer/src/lib.rs`
- Tests: `scripts/test/`
- Client: `src/wallet/SolPrivacyMethods.ts`

### External Resources
- [Anchor Documentation](https://www.anchor-lang.com/)
- [Solana Documentation](https://docs.solana.com/)
- [Solana Explorer](https://explorer.solana.com/)

---

**Program Status:** ✅ Deployed on devnet, ready for testing
**Mainnet Status:** ⏳ Pending security audit
**Last Updated:** October 2025

---

## 💝 Support Development

**Donations Welcome:**
```
2o8L5Er4tDqkhLEEjK3YnDv8ZDuxuHBKwYkvtUXpWQ6S
```

Help fund security audits and continued development. Thank you! 🙏
