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
        const transferRecord = await db.query.transfer.findFirst({
            where: eq(transfer.code, code)
        });

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

        // Check if maximum downloads reached
        if (transferRecord.downloadsCompleted >= transferRecord.maxRecipients) {
            return {
                error: 'Maximum downloads reached'
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
                createdAt: transferRecord.createdAt
            }
        };
    } catch (error) {
        console.error('Database error:', error);
        return {
            error: 'Database error'
        };
    }
};
