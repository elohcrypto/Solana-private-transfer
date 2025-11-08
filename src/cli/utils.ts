/**
 * CLI utility functions
 */

import * as readline from 'readline';
import { ConfidentialWallet } from '../wallet/ConfidentialWallet';
import { LocalKeyStorage } from '../storage/KeyStorage';
import { WalletConfig, createError } from '../types';
import { constantTimeEqual } from '../crypto/zkproofs/primitives';

/**
 * Prompt for password with hidden input
 * @param prompt - Prompt message
 * @returns Password entered by user
 */
export async function promptPassword(prompt: string = 'Enter password: '): Promise<string> {
    return new Promise((resolve, reject) => {
        try {
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout,
            });

            // Mute output for password
            const stdin = process.stdin as any;
            stdin.setRawMode(true);

            let password = '';
            process.stdout.write(prompt);

            const cleanup = () => {
                stdin.setRawMode(false);
                rl.close();
            };

            stdin.on('data', (char: Buffer) => {
                try {
                    const c = char.toString('utf8');

                    switch (c) {
                        case '\n':
                        case '\r':
                        case '\u0004': // Ctrl-D
                            cleanup();
                            process.stdout.write('\n');
                            resolve(password);
                            break;
                        case '\u0003': // Ctrl-C
                            cleanup();
                            process.exit(0);
                            break;
                        case '\u007f': // Backspace
                        case '\b':
                            if (password.length > 0) {
                                password = password.slice(0, -1);
                                process.stdout.write('\b \b');
                            }
                            break;
                        default:
                            password += c;
                            process.stdout.write('*');
                            break;
                    }
                } catch (error) {
                    cleanup();
                    reject(error);
                }
            });

            stdin.on('error', (error: Error) => {
                cleanup();
                reject(error);
            });
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Constant-time string comparison for passwords
 * Prevents timing attacks by comparing strings in constant time
 * @param a - First string
 * @param b - Second string
 * @returns True if strings are equal (constant-time)
 */
function constantTimeStringEqual(a: string, b: string): boolean {
    // Convert strings to Uint8Array for constant-time comparison
    const aBytes = new TextEncoder().encode(a);
    const bBytes = new TextEncoder().encode(b);
    
    // Use constant-time comparison
    return constantTimeEqual(aBytes, bBytes);
}

/**
 * Prompt for password confirmation
 * @returns Password entered by user
 */
export async function promptPasswordWithConfirmation(): Promise<string> {
    try {
        const password = await promptPassword('Enter password: ');
        const confirm = await promptPassword('Confirm password: ');

        // Use constant-time comparison to prevent timing attacks
        if (!constantTimeStringEqual(password, confirm)) {
            throw new Error('Passwords do not match');
        }

        return password;
    } catch (error) {
        // Re-throw with proper error handling
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('Failed to confirm password');
    }
}

/**
 * Load wallet with password prompt
 * @param config - Wallet configuration
 * @param keyStorage - Key storage instance
 * @returns Initialized wallet
 */
export async function loadWallet(
    config: WalletConfig,
    keyStorage: LocalKeyStorage
): Promise<ConfidentialWallet> {
    try {
        if (!keyStorage.exists()) {
            throw createError.keyNotFound();
        }

        const password = await promptPassword();
        const wallet = new ConfidentialWallet(config, keyStorage);
        await wallet.initialize(password, false);

        return wallet;
    } catch (error) {
        // Re-throw with proper error handling
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('Failed to load wallet');
    }
}

/**
 * Format error message for user display
 * @param error - Error object
 * @returns Formatted error message
 */
export function formatError(error: any): string {
    if (error.code) {
        return `Error [${error.code}]: ${error.message}`;
    }
    return `Error: ${error.message || error.toString()}`;
}

/**
 * Format amount for display
 * @param amount - Amount as string
 * @param decimals - Number of decimal places
 * @returns Formatted amount
 */
export function formatAmount(amount: string, decimals: number = 4): string {
    const num = parseFloat(amount);
    return num.toFixed(decimals);
}

/**
 * Format address for display (truncate middle)
 * @param address - Full address
 * @param startChars - Characters to show at start
 * @param endChars - Characters to show at end
 * @returns Formatted address
 */
export function formatAddress(address: string, startChars: number = 8, endChars: number = 8): string {
    if (address.length <= startChars + endChars) {
        return address;
    }
    return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Get default wallet configuration
 * @returns Default wallet configuration
 */
export function getDefaultConfig(): WalletConfig {
    return {
        rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
        network: (process.env.NETWORK as 'devnet' | 'testnet' | 'mainnet-beta') || 'devnet',
        batch: {
            windowMs: parseInt(process.env.BATCH_WINDOW_MS || '10000'),
            maxSize: parseInt(process.env.BATCH_MAX_SIZE || '10'),
        },
        keyStoragePath: process.env.KEY_STORAGE_PATH || '.wallet',
    };
}

/**
 * Display success message
 * @param message - Success message
 */
export function displaySuccess(message: string): void {
    console.log(`✅ ${message}`);
}

/**
 * Display error message
 * @param message - Error message
 */
export function displayError(message: string): void {
    console.error(`❌ ${message}`);
}

/**
 * Display info message
 * @param message - Info message
 */
export function displayInfo(message: string): void {
    console.log(`ℹ️  ${message}`);
}

/**
 * Display warning message
 * @param message - Warning message
 */
export function displayWarning(message: string): void {
    console.warn(`⚠️  ${message}`);
}

/**
 * Get explorer URL for transaction
 * @param signature - Transaction signature
 * @param network - Network (devnet, testnet, mainnet-beta)
 * @returns Explorer URL
 */
export function getExplorerUrl(signature: string, network: string): string {
    const cluster = network === 'mainnet-beta' ? '' : `?cluster=${network}`;
    return `https://solscan.io/tx/${signature}${cluster}`;
}
