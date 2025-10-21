import { db } from '$lib/server/db';
import { transfer } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load = async ({ params }) => {
    const code = params.download;

    if (!code || code.length !== 6) {
        return {
            error: 'Invalid transfer code'
        };
    }

    try {
        // Find transfer by code
        const transferRecord = await db.select({
            code: transfer.code,
            filename: transfer.filename,
            bytes: transfer.bytes,
            mimeType: transfer.mimeType,
            checksum: transfer.checksum,
            createdAt: transfer.createdAt,
            expiresAt: transfer.expiresAt,
            complete: transfer.complete,
            answer: transfer.answer,
            offer: transfer.offer,
            virusChecked: transfer.virusChecked
        }).from(transfer).where(eq(transfer.code, code)).limit(1).then(rows => rows[0]);

        if (!transferRecord) {
            return {
                error: 'Transfer not found'
            };
        }

        // Check if transfer has expired
        if (transferRecord.expiresAt < new Date()) {
            return {
                error: 'Transfer has expired'
            };
        }

        // check if already downloaded
        if (transferRecord.complete) {
            return {
                error: 'Transfer already completed'
            };
        }

        // Return transfer metadata (no actual file data)
        return {
            transfer: {
                code: transferRecord.code,
                filename: transferRecord.filename,
                bytes: Number(transferRecord.bytes),
                mimeType: transferRecord.mimeType,
                checksum: transferRecord.checksum,
                createdAt: transferRecord.createdAt,
                virusChecked: transferRecord.virusChecked
            },
            offer: transferRecord.offer
        };
    } catch (error) {
        console.error('Database error:', error);
        return {
            error: 'Database error'
        };
    }
};
