/**
 * Validity Proof for Confidential Transactions
 * 
 * Combines range proofs and equality proofs to prove transaction validity:
 * 1. All amounts are in valid range (non-negative)
 * 2. Input amounts equal output amounts (balance)
 * 3. No information about actual amounts is revealed
 * 
 * For a transfer: sender_balance_before = amount + sender_balance_after
 * This proves the sender has sufficient balance without revealing amounts.
 */

import {
    CurvePoint,
    ScalarOps,
    PedersenCommitment,
    type Scalar,
} from './primitives';
import { Bulletproof, type BulletproofRangeProof } from './bulletproof';
import { EqualityProof, type EqualityProof as EqualityProofType } from './equalityProof';

/**
 * Validity proof structure
 */
export interface ValidityProof {
    /** Range proofs for all amounts */
    rangeProofs: BulletproofRangeProof[];
    /** Equality proof for balance equation */
    equalityProof?: EqualityProofType;
    /** Commitments involved */
    commitments: {
        inputs: CurvePoint[];
        outputs: CurvePoint[];
    };
}

/**
 * Transfer validity proof
 * Proves: sender_before = amount + sender_after
 * Optionally proves: recipient_old + amount = recipient_new (when recipient info is available)
 */
export interface TransferValidityProof extends ValidityProof {
    /** Commitment to sender's balance before transfer */
    senderBefore: CurvePoint;
    /** Commitment to transfer amount */
    amount: CurvePoint;
    /** Commitment to sender's balance after transfer */
    senderAfter: CurvePoint;
    /** Optional equality proof for recipient balance equation */
    recipientEqualityProof?: EqualityProofType;
    /** Optional commitment to recipient's balance before transfer */
    recipientBefore?: CurvePoint;
    /** Optional commitment to recipient's balance after transfer */
    recipientAfter?: CurvePoint;
}

/**
 * Validity Proof Protocol
 */
export class ValidityProofProtocol {
    /**
     * Generate validity proof for a confidential transfer
     * 
     * Proves:
     * 1. amount >= 0 (range proof)
     * 2. sender_after >= 0 (range proof)
     * 3. sender_before = amount + sender_after (equality proof)
     * 
     * @param senderBefore - Sender's balance before transfer
     * @param amount - Transfer amount
     * @param senderAfter - Sender's balance after transfer
     * @param blindings - Blinding factors for each commitment
     * @param bitLength - Bit length for range proofs (default: 32)
     * @returns Validity proof
     */
    static async proveTransfer(
        senderBefore: Scalar,
        amount: Scalar,
        senderAfter: Scalar,
        blindings: {
            senderBefore: Scalar;
            amount: Scalar;
            senderAfter: Scalar;
        },
        bitLength: number = 32
    ): Promise<TransferValidityProof> {
        // Verify the balance equation
        if (senderBefore !== amount + senderAfter) {
            throw new Error('Balance equation does not hold: sender_before ≠ amount + sender_after');
        }

        // Create commitments
        const C_before = PedersenCommitment.commit(senderBefore, blindings.senderBefore);
        const C_amount = PedersenCommitment.commit(amount, blindings.amount);
        const C_after = PedersenCommitment.commit(senderAfter, blindings.senderAfter);

        // Generate range proofs
        const rangeProof_amount = await Bulletproof.prove(amount, blindings.amount, bitLength);
        const rangeProof_after = await Bulletproof.prove(senderAfter, blindings.senderAfter, bitLength);

        // For equality proof, we need to prove:
        // C_before = C_amount + C_after
        // Which is equivalent to proving:
        // C_before - C_amount - C_after = 0
        // Or: Commit(sender_before - amount - sender_after, r_before - r_amount - r_after) = identity

        // Compute the combined commitment
        const C_sum = C_amount.add(C_after);

        // The blinding for the sum
        const r_sum = ScalarOps.add(blindings.amount, blindings.senderAfter);

        // Prove C_before = C_sum (they should have the same value: senderBefore)
        const equalityProof = EqualityProof.prove(
            senderBefore,
            blindings.senderBefore,
            r_sum,
            C_before,
            C_sum
        );

        return {
            rangeProofs: [rangeProof_amount, rangeProof_after],
            equalityProof,
            commitments: {
                inputs: [C_before],
                outputs: [C_amount, C_after],
            },
            senderBefore: C_before,
            amount: C_amount,
            senderAfter: C_after,
        };
    }

    /**
     * Generate validity proof for a confidential transfer with recipient information
     * 
     * Proves:
     * 1. amount >= 0 (range proof)
     * 2. sender_after >= 0 (range proof)
     * 3. sender_before = amount + sender_after (equality proof)
     * 4. recipient_old + amount = recipient_new (equality proof, when recipient info available)
     * 
     * @param senderBefore - Sender's balance before transfer
     * @param amount - Transfer amount
     * @param senderAfter - Sender's balance after transfer
     * @param recipientBefore - Recipient's balance before transfer (optional)
     * @param recipientAfter - Recipient's balance after transfer (optional, = recipientBefore + amount)
     * @param blindings - Blinding factors for each commitment
     * @param recipientBlindings - Optional blinding factors for recipient commitments
     * @param bitLength - Bit length for range proofs (default: 32)
     * @returns Validity proof with separate sender and recipient equality proofs
     */
    static async proveTransferWithRecipient(
        senderBefore: Scalar,
        amount: Scalar,
        senderAfter: Scalar,
        recipientBefore: Scalar | undefined,
        recipientAfter: Scalar | undefined,
        blindings: {
            senderBefore: Scalar;
            amount: Scalar;
            senderAfter: Scalar;
        },
        recipientBlindings?: {
            recipientBefore: Scalar;
            recipientAfter: Scalar;
        },
        bitLength: number = 32
    ): Promise<TransferValidityProof> {
        // Generate base transfer proof (sender side)
        const baseProof = await this.proveTransfer(
            senderBefore,
            amount,
            senderAfter,
            blindings,
            bitLength
        );

        // If recipient information is available, generate recipient equality proof
        if (recipientBefore !== undefined && recipientAfter !== undefined && recipientBlindings) {
            // Verify recipient balance equation
            if (recipientAfter !== recipientBefore + amount) {
                throw new Error('Recipient balance equation does not hold: recipient_after ≠ recipient_before + amount');
            }

            // Create recipient commitments
            const C_recipient_before = PedersenCommitment.commit(recipientBefore, recipientBlindings.recipientBefore);
            const C_recipient_after = PedersenCommitment.commit(recipientAfter, recipientBlindings.recipientAfter);
            const C_amount = baseProof.amount;

            // Compute the combined commitment: C_recipient_before + C_amount
            const C_recipient_sum = C_recipient_before.add(C_amount);

            // The blinding for the sum
            const r_recipient_sum = ScalarOps.add(recipientBlindings.recipientBefore, blindings.amount);

            // Prove C_recipient_after = C_recipient_sum (they should have the same value: recipientAfter)
            const recipientEqualityProof = EqualityProof.prove(
                recipientAfter,
                recipientBlindings.recipientAfter,
                r_recipient_sum,
                C_recipient_after,
                C_recipient_sum
            );

            return {
                ...baseProof,
                recipientEqualityProof,
                recipientBefore: C_recipient_before,
                recipientAfter: C_recipient_after,
            };
        }

        // Return base proof without recipient proof
        return baseProof;
    }

    /**
     * Verify transfer validity proof
     * 
     * @param proof - The validity proof
     * @returns True if proof is valid
     */
    static async verifyTransfer(proof: TransferValidityProof): Promise<boolean> {
        try {
            const { rangeProofs, equalityProof, senderBefore, amount, senderAfter } = proof;

            // Verify range proofs
            if (rangeProofs.length !== 2) {
                console.error('Expected 2 range proofs');
                return false;
            }

            // Verify amount range proof
            if (!(await Bulletproof.verify(rangeProofs[0]))) {
                console.error('Amount range proof verification failed');
                return false;
            }

            // Verify sender_after range proof
            if (!(await Bulletproof.verify(rangeProofs[1]))) {
                console.error('Sender after range proof verification failed');
                return false;
            }

            // Verify equality proof if present
            if (equalityProof) {
                // Compute C_sum = C_amount + C_after
                const C_sum = amount.add(senderAfter);

                // Verify C_before = C_sum
                if (!EqualityProof.verify(equalityProof, senderBefore, C_sum)) {
                    console.error('Equality proof verification failed');
                    return false;
                }
            }

            return true;
        } catch (error) {
            console.error('Validity proof verification error:', error);
            return false;
        }
    }

    /**
     * Generate validity proof for a general transaction
     * 
     * Proves:
     * 1. All amounts are non-negative (range proofs)
     * 2. Sum of inputs = Sum of outputs (equality proof)
     * 
     * @param inputs - Input amounts
     * @param outputs - Output amounts
     * @param inputBlindings - Blinding factors for inputs
     * @param outputBlindings - Blinding factors for outputs
     * @param bitLength - Bit length for range proofs
     * @returns Validity proof
     */
    static async proveTransaction(
        inputs: Scalar[],
        outputs: Scalar[],
        inputBlindings: Scalar[],
        outputBlindings: Scalar[],
        bitLength: number = 32
    ): Promise<ValidityProof> {
        // Verify balance
        const inputSum = inputs.reduce((sum, val) => sum + val, 0n);
        const outputSum = outputs.reduce((sum, val) => sum + val, 0n);

        if (inputSum !== outputSum) {
            throw new Error('Transaction does not balance: inputs ≠ outputs');
        }

        // Create commitments
        const inputCommitments = inputs.map((val, i) =>
            PedersenCommitment.commit(val, inputBlindings[i])
        );
        const outputCommitments = outputs.map((val, i) =>
            PedersenCommitment.commit(val, outputBlindings[i])
        );

        // Generate range proofs for all amounts
        const rangeProofs: BulletproofRangeProof[] = [];

        for (let i = 0; i < inputs.length; i++) {
            rangeProofs.push(await Bulletproof.prove(inputs[i], inputBlindings[i], bitLength));
        }

        for (let i = 0; i < outputs.length; i++) {
            rangeProofs.push(await Bulletproof.prove(outputs[i], outputBlindings[i], bitLength));
        }

        // For equality, prove sum of inputs = sum of outputs
        const inputSumBlinding = inputBlindings.reduce((sum, r) => ScalarOps.add(sum, r), 0n);
        const outputSumBlinding = outputBlindings.reduce((sum, r) => ScalarOps.add(sum, r), 0n);

        const C_inputSum = inputCommitments.reduce((sum, C) => sum.add(C), CurvePoint.identity());
        const C_outputSum = outputCommitments.reduce((sum, C) => sum.add(C), CurvePoint.identity());

        const equalityProof = EqualityProof.prove(
            inputSum,
            inputSumBlinding,
            outputSumBlinding,
            C_inputSum,
            C_outputSum
        );

        return {
            rangeProofs,
            equalityProof,
            commitments: {
                inputs: inputCommitments,
                outputs: outputCommitments,
            },
        };
    }

    /**
     * Verify general transaction validity proof
     * 
     * @param proof - The validity proof
     * @returns True if proof is valid
     */
    static async verifyTransaction(proof: ValidityProof): Promise<boolean> {
        try {
            const { rangeProofs, equalityProof, commitments } = proof;

            const totalAmounts = commitments.inputs.length + commitments.outputs.length;

            if (rangeProofs.length !== totalAmounts) {
                console.error(`Expected ${totalAmounts} range proofs, got ${rangeProofs.length}`);
                return false;
            }

            // Verify all range proofs
            for (let i = 0; i < rangeProofs.length; i++) {
                if (!(await Bulletproof.verify(rangeProofs[i]))) {
                    console.error(`Range proof ${i} verification failed`);
                    return false;
                }
            }

            // Verify equality proof
            if (equalityProof) {
                const C_inputSum = commitments.inputs.reduce(
                    (sum, C) => sum.add(C),
                    CurvePoint.identity()
                );
                const C_outputSum = commitments.outputs.reduce(
                    (sum, C) => sum.add(C),
                    CurvePoint.identity()
                );

                if (!EqualityProof.verify(equalityProof, C_inputSum, C_outputSum)) {
                    console.error('Equality proof verification failed');
                    return false;
                }
            }

            return true;
        } catch (error) {
            console.error('Transaction validity proof verification error:', error);
            return false;
        }
    }
}

/**
 * Convenience export
 */
export const ValidityProof = ValidityProofProtocol;
