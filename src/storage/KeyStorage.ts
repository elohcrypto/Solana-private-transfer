import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as argon2 from 'argon2';
import { createError } from '../types';

// NOTE: ElGamal keypair removed - using Pedersen commitments instead
// ElGamalKeypair is deprecated and no longer used

/**
 * Metadata stored alongside encrypted seed
 */
export interface KeyMetadata {
    createdAt: number;
    network: string;
    version: string;
}

/**
 * Encrypted key data structure
 * 
 * NOTE: ElGamal keypair fields removed - using Pedersen commitments instead
 */
export interface EncryptedKeyData {
    encryptedSeed: string;
    salt: string;
    iv: string;
    metadata: KeyMetadata;
}

/**
 * Wallet keys (ElGamal keypair removed - using Pedersen commitments)
 */
export interface WalletKeys {
    seed: Buffer;
    // ElGamal keypair removed - no longer needed with Pedersen commitments
}

/**
 * Interface for key storage operations
 */
export interface KeyStorage {
    /**
     * Save encrypted keys to storage
     * @param seed - The seed to encrypt and save
     * @param _elGamalKeypair - DEPRECATED: No longer used (using Pedersen commitments)
     * @param password - Password for encryption
     */
    save(seed: Buffer, _elGamalKeypair: undefined, password: string): Promise<void>;

    /**
     * Load and decrypt keys from storage
     * @param password - Password for decryption
     * @returns Decrypted wallet keys
     */
    load(password: string): Promise<WalletKeys>;

    /**
     * Check if wallet file exists
     * @returns True if wallet exists
     */
    exists(): boolean;
}

/**
 * Local file-based key storage with AES-256-GCM encryption
 * 
 * Security improvements:
 * - Uses Argon2id for key derivation (memory-hard, resistant to GPU/ASIC attacks)
 * - Strict file permissions (0o600 for files, 0o700 for directories)
 * - Explicit permission setting after file operations
 */
import { KEY_STORAGE_CONSTANTS } from '../utils/constants';

export class LocalKeyStorage implements KeyStorage {
    private readonly filePath: string;

    constructor(walletDir: string = '.wallet') {
        this.filePath = path.join(walletDir, 'keys.enc');
    }

    /**
     * Derive encryption key from password using Argon2id
     * 
     * Argon2id is memory-hard and provides better security than PBKDF2:
     * - Resistant to GPU and ASIC attacks
     * - Configurable memory cost
     * - Industry standard for password hashing
     * 
     * @param password - User password
     * @param salt - Random salt (16 bytes)
     * @returns Derived encryption key (32 bytes)
     */
    private async deriveKey(password: string, salt: Buffer): Promise<Buffer> {
        // Use raw option to get the hash bytes directly (not the encoded string)
        const hash = await argon2.hash(password, {
            type: argon2.argon2id,
            salt: salt,
            memoryCost: KEY_STORAGE_CONSTANTS.ARGON2_MEMORY_COST,
            timeCost: KEY_STORAGE_CONSTANTS.ARGON2_TIME_COST,
            parallelism: KEY_STORAGE_CONSTANTS.ARGON2_PARALLELISM,
            hashLength: KEY_STORAGE_CONSTANTS.KEY_LENGTH,
            raw: true, // Return raw hash bytes instead of encoded string
        });

        // hash is already a Buffer when raw: true
        return Buffer.from(hash);
    }

    /**
     * Encrypt seed using AES-256-GCM
     */
    private async encrypt(seed: Buffer, password: string, salt: Buffer): Promise<{ encrypted: Buffer; iv: Buffer }> {
        const key = await this.deriveKey(password, salt);
        const iv = crypto.randomBytes(KEY_STORAGE_CONSTANTS.IV_LENGTH);
        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

        const encrypted = Buffer.concat([cipher.update(seed), cipher.final()]);
        const authTag = cipher.getAuthTag();

        return {
            encrypted: Buffer.concat([encrypted, authTag]),
            iv,
        };
    }

    /**
     * Decrypt seed using AES-256-GCM
     */
    private async decrypt(encryptedData: Buffer, password: string, salt: Buffer, iv: Buffer): Promise<Buffer> {
        const key = await this.deriveKey(password, salt);
        const authTag = encryptedData.slice(-16);
        const encrypted = encryptedData.slice(0, -16);

        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(authTag);

        try {
            return Buffer.concat([decipher.update(encrypted), decipher.final()]);
        } catch (error) {
            throw createError.invalidPassword();
        }
    }

    /**
     * Save encrypted keys to file
     * 
     * Security features:
     * - Uses Argon2id for key derivation
     * - Sets strict file permissions (0o600)
     * - Sets strict directory permissions (0o700)
     * - Explicitly sets permissions after write to ensure security
     */
    async save(seed: Buffer, _elGamalKeypair: undefined, password: string): Promise<void> {
        try {
            // Create directory if it doesn't exist with restricted permissions
            const dir = path.dirname(this.filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true, mode: KEY_STORAGE_CONSTANTS.DIR_PERMISSIONS });
            } else {
                // Ensure existing directory has correct permissions
                fs.chmodSync(dir, KEY_STORAGE_CONSTANTS.DIR_PERMISSIONS);
            }

            // Generate random salt for this user
            const salt = crypto.randomBytes(KEY_STORAGE_CONSTANTS.SALT_LENGTH);

            // Encrypt seed (now async with Argon2)
            const { encrypted, iv } = await this.encrypt(seed, password, salt);

            // Create encrypted key data (ElGamal keypair removed - using Pedersen commitments)
            const keyData: EncryptedKeyData = {
                encryptedSeed: encrypted.toString('base64'),
                salt: salt.toString('base64'),
                iv: iv.toString('base64'),
                metadata: {
                    createdAt: Date.now(),
                    network: 'devnet',
                    version: '3.0.0', // Updated for Pedersen commitments (removed ElGamal)
                },
            };

            // Write to file with restricted permissions
            fs.writeFileSync(this.filePath, JSON.stringify(keyData, null, 2), {
                mode: KEY_STORAGE_CONSTANTS.FILE_PERMISSIONS,
                flag: 'w', // Overwrite if exists
            });

            // Explicitly set permissions after write to ensure security
            // This is important because some filesystems may not respect the mode option
            fs.chmodSync(this.filePath, KEY_STORAGE_CONSTANTS.FILE_PERMISSIONS);
        } catch (error: any) {
            if (error.code === 'EACCES' || error.code === 'EPERM') {
                throw createError.keyNotFound();
            }
            throw error;
        }
    }

    /**
     * Load and decrypt seed from file
     * 
     * Security features:
     * - Verifies file permissions before reading
     * - Uses Argon2id for key derivation
     * - Validates file integrity
     * 
     * NOTE: ElGamal keypair loading removed - using Pedersen commitments instead
     */
    async load(password: string): Promise<WalletKeys> {
        if (!this.exists()) {
            throw createError.keyNotFound();
        }

        try {
            // Verify file permissions are secure (readable only by owner)
            const stats = fs.statSync(this.filePath);
            const mode = stats.mode & 0o777;
            if (mode !== KEY_STORAGE_CONSTANTS.FILE_PERMISSIONS && mode !== 0o644) {
                // Allow 0o644 for backward compatibility, but warn
                // Strict mode would be 0o600 (read/write owner only)
                console.warn(`Warning: Key file has insecure permissions (${mode.toString(8)}). Expected ${KEY_STORAGE_CONSTANTS.FILE_PERMISSIONS.toString(8)}`);
            }

            // Read encrypted data
            const fileContent = fs.readFileSync(this.filePath, 'utf-8');
            const keyData: EncryptedKeyData = JSON.parse(fileContent);

            // Convert from base64
            const encrypted = Buffer.from(keyData.encryptedSeed, 'base64');
            const salt = Buffer.from(keyData.salt, 'base64');
            const iv = Buffer.from(keyData.iv, 'base64');

            // Decrypt seed (now async with Argon2)
            const seed = await this.decrypt(encrypted, password, salt, iv);

            // ElGamal keypair removed - no longer needed with Pedersen commitments
            // Backward compatibility: ignore old ElGamal fields if present

            return { seed };
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                throw createError.keyNotFound();
            }
            if (error.code === 'EACCES' || error.code === 'EPERM') {
                throw createError.keyNotFound();
            }
            if (error.name === 'SyntaxError') {
                throw createError.keyNotFound();
            }
            throw error;
        }
    }

    /**
     * Check if wallet file exists
     */
    exists(): boolean {
        return fs.existsSync(this.filePath);
    }
}
