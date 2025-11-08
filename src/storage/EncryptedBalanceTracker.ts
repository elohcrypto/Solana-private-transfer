/**
 * Encrypted Balance Tracker
 * 
 * Tracks encrypted balances for confidential transactions using Pedersen commitments.
 * Stores both commitments (for on-chain operations) and plaintext balances (for local tracking).
 * 
 * MIGRATED FROM: ElGamal encryption (insecure XOR) to Pedersen commitments (secure)
 * 
 * NOTE: Pedersen commitments are hiding (cannot be "decrypted"), so we store:
 * - Plaintext balance: For local tracking and display
 * - Commitment: For on-chain operations and verification
 * - Blinding factor: For commitment verification and homomorphic operations
 */

import * as fs from 'fs';
import * as path from 'path';
import { PedersenCommitment, CurvePoint } from '../crypto/zkproofs/primitives';
import { ScalarOps, type Scalar } from '../crypto/zkproofs/primitives';

/**
 * Balance commitment entry
 */
export interface EncryptedBalanceEntry {
    /** Account identifier (public key or address) */
    account: string;
    /** Plaintext balance (for local tracking - NOT stored on-chain) */
    balance: bigint;
    /** Balance commitment (Pedersen commitment - 32 bytes for Ristretto255) */
    commitment: Uint8Array;
    /** Blinding factor (32 bytes) - needed for commitment verification */
    blinding: Uint8Array;
    /** Last update timestamp */
    lastUpdated: number;
    /** Balance version for synchronization */
    version: number;
}

/**
 * Balance update record
 */
export interface BalanceUpdate {
    /** Account identifier */
    account: string;
    /** Amount change (positive for increase, negative for decrease) */
    delta: bigint;
    /** Update timestamp */
    timestamp: number;
    /** Transaction ID or reference */
    txId?: string;
}

/**
 * Encrypted Balance Tracker using Pedersen Commitments
 */
export class EncryptedBalanceTracker {
    private storagePath: string;
    private balances: Map<string, EncryptedBalanceEntry>;

    constructor(storagePath: string) {
        this.storagePath = path.join(storagePath, 'encrypted-balances.json');
        this.balances = new Map();
    }

    /**
     * Initialize the tracker (no keypair needed - Pedersen commitments don't require keys)
     */
    initialize(): void {
        this.load();
    }

    /**
     * Set the balance for an account (creates Pedersen commitment)
     * @param account - Account identifier
     * @param balance - Balance amount (will be committed)
     */
    setBalance(account: string, balance: bigint): void {
        // Generate random blinding factor
        const blinding = ScalarOps.random();
        
        // Create Pedersen commitment: C = v*G + r*H
        const commitment = PedersenCommitment.commit(balance, blinding);
        
        // Serialize commitment to bytes (32 bytes for Ristretto255)
        const commitmentBytes = commitment.toBytes();
        
        // Serialize blinding factor to bytes (32 bytes)
        const blindingBytes = ScalarOps.toBytes(blinding);

        // Get existing entry or create new one
        const existing = this.balances.get(account);
        const version = existing ? existing.version + 1 : 1;

        // Store balance, commitment, and blinding
        this.balances.set(account, {
            account,
            balance, // Store plaintext for local tracking
            commitment: commitmentBytes,
            blinding: blindingBytes,
            lastUpdated: Date.now(),
            version,
        });

        this.save();
    }

    /**
     * Get the balance for an account
     * @param account - Account identifier
     * @returns Balance or undefined if not found
     */
    getBalance(account: string): bigint | undefined {
        const entry = this.balances.get(account);
        return entry ? entry.balance : undefined;
    }

    /**
     * Get the commitment for an account
     * @param account - Account identifier
     * @returns Commitment bytes (32 bytes for Ristretto255) or undefined if not found
     */
    getCommitment(account: string): Uint8Array | undefined {
        const entry = this.balances.get(account);
        return entry ? entry.commitment : undefined;
    }

    /**
     * Get the blinding factor for an account
     * @param account - Account identifier
     * @returns Blinding factor bytes (32 bytes) or undefined if not found
     */
    getBlinding(account: string): Uint8Array | undefined {
        const entry = this.balances.get(account);
        return entry ? entry.blinding : undefined;
    }

    /**
     * Get the blinding factor as a Scalar
     * @param account - Account identifier
     * @returns Blinding factor as Scalar or undefined if not found
     */
    getBlindingScalar(account: string): Scalar | undefined {
        const entry = this.balances.get(account);
        return entry ? ScalarOps.fromBytes(entry.blinding) : undefined;
    }

    /**
     * Verify a commitment matches a balance and blinding factor
     * @param account - Account identifier
     * @param balance - Balance to verify
     * @returns True if commitment is valid
     */
    verifyCommitment(account: string, balance: bigint): boolean {
        const entry = this.balances.get(account);
        if (!entry) {
            return false;
        }

        try {
            // Deserialize blinding factor
            const blinding = ScalarOps.fromBytes(entry.blinding);
            
            // Deserialize stored commitment
            const storedCommitment = CurvePoint.fromBytes(entry.commitment);
            
            // Recreate commitment from balance and blinding
            const expectedCommitment = PedersenCommitment.commit(balance, blinding);
            
            // Compare commitments (constant-time)
            return storedCommitment.equals(expectedCommitment);
        } catch (error) {
            // If deserialization fails, verification fails
            console.error('Commitment verification error:', error);
            return false;
        }
    }

    /**
     * Get the encrypted balance entry for an account
     * @param account - Account identifier
     * @returns Balance entry or undefined if not found
     */
    getEncryptedEntry(account: string): EncryptedBalanceEntry | undefined {
        return this.balances.get(account);
    }

    /**
     * Update balance by applying a delta (increase or decrease)
     * @param account - Account identifier
     * @param delta - Amount to add (positive) or subtract (negative)
     * @param txId - Optional transaction ID for tracking
     */
    updateBalance(account: string, delta: bigint, txId?: string): void {
        // Get current balance
        const currentBalance = this.getBalance(account) || 0n;

        // Calculate new balance
        const newBalance = currentBalance + delta;

        if (newBalance < 0n) {
            throw new Error(`Insufficient balance for account ${account}`);
        }

        // Set the new balance (creates new commitment)
        this.setBalance(account, newBalance);
    }

    /**
     * Update balance using homomorphic commitment addition
     * @param account - Account identifier
     * @param deltaCommitment - Commitment to the delta amount
     * @param deltaBlinding - Blinding factor for the delta
     * @param deltaBalance - Plaintext delta balance (for local tracking)
     * @param txId - Optional transaction ID for tracking
     */
    updateBalanceHomomorphic(
        account: string,
        deltaCommitment: CurvePoint,
        deltaBlinding: Scalar,
        deltaBalance: bigint,
        txId?: string
    ): void {
        const entry = this.balances.get(account);
        if (!entry) {
            throw new Error(`Account ${account} not found`);
        }

        // Deserialize current commitment
        const currentBlinding = ScalarOps.fromBytes(entry.blinding);
        
        // Recreate current commitment from stored balance and blinding
        const currentCommitment = PedersenCommitment.commit(entry.balance, currentBlinding);
        
        // Add commitments homomorphically
        const newCommitment = PedersenCommitment.add(
            currentCommitment,
            deltaCommitment
        );
        
        // Add blinding factors
        const newBlinding = ScalarOps.add(currentBlinding, deltaBlinding);
        
        // Calculate new balance
        const newBalance = entry.balance + deltaBalance;
        
        if (newBalance < 0n) {
            throw new Error(`Insufficient balance for account ${account}`);
        }
        
        // Verify the new commitment matches the new balance and blinding
        const expectedCommitment = PedersenCommitment.commit(newBalance, newBlinding);
        if (!newCommitment.equals(expectedCommitment)) {
            throw new Error('Homomorphic update failed: commitment mismatch');
        }
        
        // Store new commitment and balance
        const version = entry.version + 1;
        this.balances.set(account, {
            account,
            balance: newBalance,
            commitment: newCommitment.toBytes(),
            blinding: ScalarOps.toBytes(newBlinding),
            lastUpdated: Date.now(),
            version,
        });

        this.save();
    }

    /**
     * Apply a batch of balance updates
     * @param updates - Array of balance updates
     */
    applyUpdates(updates: BalanceUpdate[]): void {
        for (const update of updates) {
            this.updateBalance(update.account, update.delta, update.txId);
        }
    }

    /**
     * Process a transfer between two accounts
     * @param sender - Sender account identifier
     * @param recipient - Recipient account identifier
     * @param amount - Transfer amount
     * @param txId - Optional transaction ID
     */
    processTransfer(sender: string, recipient: string, amount: bigint, txId?: string): void {
        if (amount <= 0n) {
            throw new Error('Transfer amount must be positive');
        }

        // Check sender has sufficient balance
        const senderBalance = this.getBalance(sender) || 0n;
        if (senderBalance < amount) {
            throw new Error(`Insufficient balance: sender has ${senderBalance}, needs ${amount}`);
        }

        // Create commitment for transfer amount
        const amountBlinding = ScalarOps.random();
        const amountCommitment = PedersenCommitment.commit(amount, amountBlinding);

        // Update sender (subtract) - homomorphic subtraction
        const senderEntry = this.balances.get(sender);
        if (!senderEntry) {
            throw new Error(`Sender account ${sender} not found`);
        }

        // For subtraction: negate the commitment
        const negatedCommitment = PedersenCommitment.subtract(
            PedersenCommitment.commit(0n, 0n), // Identity
            amountCommitment
        );
        const negatedBlinding = ScalarOps.negate(amountBlinding);

        this.updateBalanceHomomorphic(
            sender,
            negatedCommitment,
            negatedBlinding,
            -amount,
            txId
        );

        // Update recipient (add) - homomorphic addition
        const recipientEntry = this.balances.get(recipient);
        if (recipientEntry) {
            this.updateBalanceHomomorphic(
                recipient,
                amountCommitment,
                amountBlinding,
                amount,
                txId
            );
        } else {
            // Create new entry for recipient
            this.setBalance(recipient, amount);
        }
    }

    /**
     * Get all tracked accounts
     * @returns Array of account identifiers
     */
    getAccounts(): string[] {
        return Array.from(this.balances.keys());
    }

    /**
     * Get all balances (plaintext)
     * @returns Map of account to balance
     */
    getAllBalances(): Map<string, bigint> {
        const balances = new Map<string, bigint>();
        for (const [account, entry] of this.balances.entries()) {
            balances.set(account, entry.balance);
        }
        return balances;
    }

    /**
     * Get all commitments (without decrypting)
     * @returns Map of account to commitment bytes
     */
    getAllCommitments(): Map<string, Uint8Array> {
        const commitments = new Map<string, Uint8Array>();
        for (const [account, entry] of this.balances.entries()) {
            commitments.set(account, entry.commitment);
        }
        return commitments;
    }

    /**
     * Get balance metadata (without decrypting)
     * @param account - Account identifier
     * @returns Balance metadata or undefined
     */
    getBalanceMetadata(account: string): { lastUpdated: number; version: number } | undefined {
        const entry = this.balances.get(account);
        if (!entry) {
            return undefined;
        }

        return {
            lastUpdated: entry.lastUpdated,
            version: entry.version,
        };
    }

    /**
     * Synchronize commitments from external source
     * @param externalBalances - Map of account to balance from external source
     */
    synchronize(externalBalances: Map<string, bigint>): void {
        for (const [account, balance] of externalBalances.entries()) {
            const existing = this.balances.get(account);

            // Only update if balance is different
            if (!existing || existing.balance !== balance) {
                this.setBalance(account, balance);
            }
        }
    }

    /**
     * Clear balance for an account
     * @param account - Account identifier
     */
    clearBalance(account: string): void {
        this.balances.delete(account);
        this.save();
    }

    /**
     * Clear all balances
     */
    clearAll(): void {
        this.balances.clear();
        this.save();
    }

    /**
     * Get the number of tracked accounts
     * @returns Number of accounts
     */
    getAccountCount(): number {
        return this.balances.size;
    }

    /**
     * Check if an account is tracked
     * @param account - Account identifier
     * @returns True if account is tracked
     */
    hasAccount(account: string): boolean {
        return this.balances.has(account);
    }

    /**
     * Export balances to JSON (commitments + plaintext for local tracking)
     * @returns JSON string with balances and commitments
     */
    exportEncrypted(): string {
        const entries: any[] = [];
        for (const [account, entry] of this.balances.entries()) {
            entries.push({
                account,
                balance: entry.balance.toString(), // Store as string for bigint
                commitment: Array.from(entry.commitment),
                blinding: Array.from(entry.blinding),
                lastUpdated: entry.lastUpdated,
                version: entry.version,
            });
        }
        return JSON.stringify(entries, null, 2);
    }

    /**
     * Import balances from JSON (commitments + plaintext)
     * @param json - JSON string with balances and commitments
     * 
     * NOTE: Handles backward compatibility with old ElGamal format files
     */
    importEncrypted(json: string): void {
        const entries = JSON.parse(json);
        this.balances.clear();

        for (const entry of entries) {
            // Check if this is the new Pedersen format (has balance, commitment, blinding)
            if (entry.balance !== undefined && entry.commitment !== undefined && entry.blinding !== undefined) {
                // New Pedersen format
                this.balances.set(entry.account, {
                    account: entry.account,
                    balance: BigInt(entry.balance),
                    commitment: new Uint8Array(entry.commitment),
                    blinding: new Uint8Array(entry.blinding),
                    lastUpdated: entry.lastUpdated || Date.now(),
                    version: entry.version || 1,
                });
            } else if (entry.encryptedBalance !== undefined) {
                // Old ElGamal format - cannot decrypt without keypair, skip or set to 0
                // For backward compatibility, we'll skip these entries
                // The user will need to re-initialize their balances
                console.warn(`⚠️  Skipping old ElGamal format entry for account ${entry.account}. Please re-initialize balance.`);
                continue;
            } else {
                // Invalid format - skip
                console.warn(`⚠️  Skipping invalid entry for account ${entry.account || 'unknown'}. Missing required fields.`);
                continue;
            }
        }

        // Only save if we have valid entries
        if (this.balances.size > 0) {
            this.save();
        }
    }

    /**
     * Save balances to disk
     */
    private save(): void {
        try {
            const dir = path.dirname(this.storagePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            const data = this.exportEncrypted();
            fs.writeFileSync(this.storagePath, data, 'utf8');
        } catch (error) {
            console.error('Failed to save encrypted balances:', error);
        }
    }

    /**
     * Load balances from disk
     * 
     * NOTE: Handles backward compatibility with old ElGamal format files
     */
    private load(): void {
        try {
            if (fs.existsSync(this.storagePath)) {
                const data = fs.readFileSync(this.storagePath, 'utf8');
                try {
                    this.importEncrypted(data);
                } catch (error) {
                    // If import fails, it might be an old format file
                    // Try to handle gracefully
                    console.warn('Failed to import balance file. It may be in old ElGamal format.');
                    console.warn('Please re-initialize your balances. Old format files cannot be migrated automatically.');
                    // Clear the balances map to start fresh
                    this.balances.clear();
                }
            }
        } catch (error) {
            // File doesn't exist or can't be read - that's okay, start fresh
            // Only log if it's not a "file not found" error
            if ((error as any).code !== 'ENOENT') {
                console.error('Failed to load encrypted balances:', error);
            }
        }
    }

    /**
     * Get storage statistics
     * @returns Storage statistics
     */
    getStats(): {
        accountCount: number;
        totalStorageBytes: number;
        oldestUpdate: number;
        newestUpdate: number;
    } {
        let oldestUpdate = Date.now();
        let newestUpdate = 0;
        let totalBytes = 0;

        for (const entry of this.balances.values()) {
            oldestUpdate = Math.min(oldestUpdate, entry.lastUpdated);
            newestUpdate = Math.max(newestUpdate, entry.lastUpdated);
            // Storage: commitment (32 bytes) + blinding (32 bytes) + balance as string in JSON (~8-20 bytes)
            totalBytes += entry.commitment.length + entry.blinding.length + 16; // ~16 bytes for balance string in JSON
        }

        return {
            accountCount: this.balances.size,
            totalStorageBytes: totalBytes,
            oldestUpdate: this.balances.size > 0 ? oldestUpdate : 0,
            newestUpdate,
        };
    }
}
