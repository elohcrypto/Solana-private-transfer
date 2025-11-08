/**
 * Storage for Token-2022 account information
 */

import * as fs from 'fs';
import * as path from 'path';
import { PublicKey } from '@solana/web3.js';
import { KEY_STORAGE_CONSTANTS } from '../utils/constants';

export interface AccountInfo {
    mint: string;
    tokenAccount: string;
    createdAt: number;
}

/**
 * Store and retrieve Token-2022 account information
 */
export class AccountStorage {
    private filePath: string;

    constructor(walletDir: string = '.wallet') {
        this.filePath = path.join(walletDir, 'accounts.json');
    }

    /**
     * Save account information
     */
    save(mint: PublicKey, tokenAccount: PublicKey): void {
        const accountInfo: AccountInfo = {
            mint: mint.toBase58(),
            tokenAccount: tokenAccount.toBase58(),
            createdAt: Date.now(),
        };

        // Create directory if it doesn't exist
        const dir = path.dirname(this.filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true, mode: KEY_STORAGE_CONSTANTS.DIR_PERMISSIONS });
        } else {
            // Ensure existing directory has correct permissions
            fs.chmodSync(dir, KEY_STORAGE_CONSTANTS.DIR_PERMISSIONS);
        }

        fs.writeFileSync(this.filePath, JSON.stringify(accountInfo, null, 2), {
            mode: KEY_STORAGE_CONSTANTS.FILE_PERMISSIONS,
        });

        // Explicitly set permissions after write to ensure security
        fs.chmodSync(this.filePath, KEY_STORAGE_CONSTANTS.FILE_PERMISSIONS);
    }

    /**
     * Load account information
     */
    load(): AccountInfo | null {
        if (!this.exists()) {
            return null;
        }

        try {
            const fileContent = fs.readFileSync(this.filePath, 'utf-8');
            return JSON.parse(fileContent);
        } catch {
            return null;
        }
    }

    /**
     * Check if account info exists
     */
    exists(): boolean {
        return fs.existsSync(this.filePath);
    }

    /**
     * Delete account information
     */
    delete(): void {
        if (this.exists()) {
            fs.unlinkSync(this.filePath);
        }
    }
}
