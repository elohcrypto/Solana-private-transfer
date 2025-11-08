import * as fs from 'fs';
import * as path from 'path';
import { TransactionRecord } from '../types';
import { createError } from '../types';
import { KEY_STORAGE_CONSTANTS } from '../utils/constants';

/**
 * TransactionHistory - Manages transaction history storage
 * 
 * Features:
 * - Persistent storage to .wallet/history.json
 * - Add new transaction records
 * - Retrieve all or recent history
 * - Handles missing history file gracefully
 */
export class TransactionHistory {
    private readonly filePath: string;
    private history: TransactionRecord[];

    constructor(walletDir: string = '.wallet') {
        this.filePath = path.join(walletDir, 'history.json');
        this.history = [];
        this.loadHistory();
    }

    /**
     * Load history from file
     */
    private loadHistory(): void {
        try {
            if (fs.existsSync(this.filePath)) {
                const fileContent = fs.readFileSync(this.filePath, 'utf-8');
                this.history = JSON.parse(fileContent);
            }
        } catch (error: any) {
            // If file is corrupted or doesn't exist, start with empty history
            this.history = [];
        }
    }

    /**
     * Save history to file
     */
    private saveHistory(): void {
        try {
            // Create directory if it doesn't exist
            const dir = path.dirname(this.filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true, mode: KEY_STORAGE_CONSTANTS.DIR_PERMISSIONS });
            } else {
                // Ensure existing directory has correct permissions
                fs.chmodSync(dir, KEY_STORAGE_CONSTANTS.DIR_PERMISSIONS);
            }

            // Write history to file
            fs.writeFileSync(
                this.filePath,
                JSON.stringify(this.history, null, 2),
                { mode: KEY_STORAGE_CONSTANTS.FILE_PERMISSIONS }
            );

            // Explicitly set permissions after write to ensure security
            fs.chmodSync(this.filePath, KEY_STORAGE_CONSTANTS.FILE_PERMISSIONS);
        } catch (error: any) {
            throw createError.transactionFailed(`Failed to save history: ${error.message}`);
        }
    }

    /**
     * Add a transaction record
     * @param record - Transaction record to add
     */
    addTransaction(record: TransactionRecord): void {
        this.history.push(record);
        this.saveHistory();
    }

    /**
     * Add multiple transaction records
     * @param records - Array of transaction records
     */
    addTransactions(records: TransactionRecord[]): void {
        this.history.push(...records);
        this.saveHistory();
    }

    /**
     * Get all transaction history
     * @returns Array of all transaction records
     */
    getHistory(): TransactionRecord[] {
        return [...this.history];
    }

    /**
     * Get recent transaction history
     * @param limit - Maximum number of records to return
     * @returns Array of recent transaction records
     */
    getRecentHistory(limit: number): TransactionRecord[] {
        return this.history.slice(-limit);
    }

    /**
     * Get transactions by type
     * @param type - Transaction type to filter by
     * @returns Array of matching transaction records
     */
    getByType(type: 'deposit' | 'transfer' | 'withdraw'): TransactionRecord[] {
        return this.history.filter(record => record.type === type);
    }

    /**
     * Get transactions by status
     * @param status - Transaction status to filter by
     * @returns Array of matching transaction records
     */
    getByStatus(status: 'confirmed' | 'failed'): TransactionRecord[] {
        return this.history.filter(record => record.status === status);
    }

    /**
     * Get transaction by ID
     * @param id - Transaction ID
     * @returns Transaction record or undefined if not found
     */
    getById(id: string): TransactionRecord | undefined {
        return this.history.find(record => record.id === id);
    }

    /**
     * Clear all history
     */
    clearHistory(): void {
        this.history = [];
        this.saveHistory();
    }

    /**
     * Get history count
     * @returns Number of transactions in history
     */
    getCount(): number {
        return this.history.length;
    }

    /**
     * Get successful transaction count
     * @returns Number of successful transactions
     */
    getSuccessfulCount(): number {
        return this.history.filter(record => record.status === 'confirmed').length;
    }

    /**
     * Get failed transaction count
     * @returns Number of failed transactions
     */
    getFailedCount(): number {
        return this.history.filter(record => record.status === 'failed').length;
    }
}
