import { ErrorCode, createError } from '../types';
import winston from 'winston';

/**
 * Error classification for retry logic
 */
export enum ErrorType {
    RETRYABLE_NETWORK = 'RETRYABLE_NETWORK',
    RETRYABLE_RPC = 'RETRYABLE_RPC',
    NON_RETRYABLE_BALANCE = 'NON_RETRYABLE_BALANCE',
    NON_RETRYABLE_VALIDATION = 'NON_RETRYABLE_VALIDATION',
    NON_RETRYABLE_UNKNOWN = 'NON_RETRYABLE_UNKNOWN',
}

/**
 * Classified error with retry information
 */
export interface ClassifiedError {
    type: ErrorType;
    code: ErrorCode;
    message: string;
    retryable: boolean;
    originalError: Error;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
    maxAttempts: number;
    initialDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxAttempts: 5,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
};

/**
 * Configure winston logger
 */
const logLevel = process.env.LOG_LEVEL || 'info';

export const logger = winston.createLogger({
    level: logLevel,
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            ),
        }),
    ],
});

/**
 * Classify error for retry logic
 * @param error - Error to classify
 * @returns Classified error with retry information
 */
export function classifyError(error: any): ClassifiedError {
    const errorMessage = error.message || error.toString();
    const errorMessageLower = errorMessage.toLowerCase();

    // Network errors (retryable)
    if (
        errorMessageLower.includes('network') ||
        errorMessageLower.includes('timeout') ||
        errorMessageLower.includes('connection') ||
        errorMessageLower.includes('econnrefused') ||
        errorMessageLower.includes('enotfound')
    ) {
        return {
            type: ErrorType.RETRYABLE_NETWORK,
            code: ErrorCode.NETWORK_ERROR,
            message: errorMessage,
            retryable: true,
            originalError: error,
        };
    }

    // RPC errors (retryable)
    if (
        errorMessageLower.includes('429') ||
        errorMessageLower.includes('rate limit') ||
        errorMessageLower.includes('too many requests') ||
        errorMessageLower.includes('blockhash not found') ||
        errorMessageLower.includes('node is behind')
    ) {
        return {
            type: ErrorType.RETRYABLE_RPC,
            code: ErrorCode.NETWORK_ERROR,
            message: errorMessage,
            retryable: true,
            originalError: error,
        };
    }

    // Insufficient balance (non-retryable)
    if (
        errorMessageLower.includes('insufficient') ||
        errorMessageLower.includes('balance') ||
        errorMessageLower.includes('not enough')
    ) {
        return {
            type: ErrorType.NON_RETRYABLE_BALANCE,
            code: ErrorCode.INSUFFICIENT_BALANCE,
            message: errorMessage,
            retryable: false,
            originalError: error,
        };
    }

    // Validation errors (non-retryable)
    if (
        errorMessageLower.includes('invalid') ||
        errorMessageLower.includes('malformed') ||
        errorMessageLower.includes('bad') ||
        error.code === ErrorCode.INVALID_AMOUNT ||
        error.code === ErrorCode.INVALID_RECIPIENT
    ) {
        return {
            type: ErrorType.NON_RETRYABLE_VALIDATION,
            code: ErrorCode.INVALID_AMOUNT,
            message: errorMessage,
            retryable: false,
            originalError: error,
        };
    }

    // Unknown errors (non-retryable by default for safety)
    return {
        type: ErrorType.NON_RETRYABLE_UNKNOWN,
        code: ErrorCode.TRANSACTION_FAILED,
        message: errorMessage,
        retryable: false,
        originalError: error,
    };
}

/**
 * Calculate exponential backoff delay
 * @param attempt - Current attempt number (0-indexed)
 * @param config - Retry configuration
 * @returns Delay in milliseconds
 */
export function calculateBackoff(attempt: number, config: RetryConfig = DEFAULT_RETRY_CONFIG): number {
    const delay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt);
    return Math.min(delay, config.maxDelayMs);
}

/**
 * Execute function with retry logic
 * @param fn - Function to execute
 * @param config - Retry configuration
 * @param context - Context for logging (e.g., "transfer", "deposit")
 * @returns Result of function execution
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    config: RetryConfig = DEFAULT_RETRY_CONFIG,
    context: string = 'operation'
): Promise<T> {
    let lastError: ClassifiedError | null = null;

    for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
        try {
            // Log attempt
            if (attempt > 0) {
                logger.info(`Retry attempt ${attempt + 1}/${config.maxAttempts} for ${context}`);
            }

            // Execute function
            const result = await fn();

            // Log success if this was a retry
            if (attempt > 0) {
                logger.info(`${context} succeeded after ${attempt + 1} attempts`);
            }

            return result;
        } catch (error: any) {
            // Classify error
            const classified = classifyError(error);
            lastError = classified;

            // Log error (without sensitive data)
            logger.error(`${context} failed (attempt ${attempt + 1}/${config.maxAttempts})`, {
                type: classified.type,
                code: classified.code,
                retryable: classified.retryable,
                message: classified.message,
            });

            // If not retryable, throw immediately
            if (!classified.retryable) {
                logger.warn(`${context} failed with non-retryable error: ${classified.type}`);
                throw createError.transactionFailed(classified.message);
            }

            // If this was the last attempt, throw
            if (attempt === config.maxAttempts - 1) {
                logger.error(`${context} failed after ${config.maxAttempts} attempts`);
                throw createError.transactionFailed(
                    `Failed after ${config.maxAttempts} attempts: ${classified.message}`
                );
            }

            // Calculate backoff delay
            const delay = calculateBackoff(attempt, config);
            logger.info(`Waiting ${delay}ms before retry...`);

            // Wait before retry
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }

    // Should never reach here, but TypeScript needs it
    throw createError.transactionFailed(
        lastError?.message || 'Unknown error after all retry attempts'
    );
}

/**
 * Wrap SDK error with custom error type
 * @param error - Original error from SDK
 * @param operation - Operation that failed (for context)
 * @returns Custom error with proper code
 */
export function wrapSDKError(error: any, operation: string): Error {
    const classified = classifyError(error);

    logger.error(`SDK error in ${operation}`, {
        type: classified.type,
        code: classified.code,
        message: classified.message,
    });

    switch (classified.code) {
        case ErrorCode.NETWORK_ERROR:
            return createError.networkError(classified.message);
        case ErrorCode.INSUFFICIENT_BALANCE:
            return createError.insufficientBalance('unknown', 'unknown');
        case ErrorCode.INVALID_AMOUNT:
            return createError.invalidAmount(classified.message);
        case ErrorCode.INVALID_RECIPIENT:
            return createError.invalidRecipient(classified.message);
        default:
            return createError.transactionFailed(classified.message);
    }
}
