import type { Actions } from './$types';
import { PUBLIC_MAX_FILE_SIZE } from '$env/static/public';
import { db } from '$lib/server/db';
import { transfer } from '$lib/server/db/schema';
import { generateCode } from '$lib/utils/file';

const MAX_UPLOAD_SIZE = parseInt(PUBLIC_MAX_FILE_SIZE);

export const actions = {
	create: async ({ request }) => {
		const formData = await request.formData();

        const filename = formData.get('name')?.toString();
        const size = formData.get('size') ? Number(formData.get('size')) : null;
        const mimeType = formData.get('type')?.toString();
        const checksum = formData.get('checksum')?.toString();

        if (!filename || !size || !mimeType || !checksum) {
            return { success: false, error: 'Missing required fields' };
        }

        if (size > MAX_UPLOAD_SIZE) {
            return { success: false, error: `File size exceeds the maximum limit of ${(MAX_UPLOAD_SIZE / (1024 * 1024 * 1024)).toFixed(1)} GB.` };
        }

        try {
            // Generate unique 6-character code
            let code: string;
            let attempts = 0;
            do {
                code = generateCode();
                attempts++;
                if (attempts > 10) {
                    return { success: false, error: 'Failed to generate unique code' };
                }
                
                // Check if code already exists
                const existing = await db.query.transfer.findFirst({
                    where: (transfer, { eq }) => eq(transfer.code, code)
                });
                
                if (!existing) break;
            } while (true);

            // Set expiration to 24 hours from now
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 24);

            // Insert transfer record
            const result = await db.insert(transfer).values({
                code,
                filename,
                bytes: BigInt(size),
                mimeType,
                checksum,
                expiresAt
            }).returning({ id: transfer.id, code: transfer.code });

            if (result.length > 0) {
                return { success: true, code: result[0].code };
            } else {
                return { success: false, error: 'Failed to create transfer' };
            }
        } catch (error) {
            console.error('Database error:', error);
            return { success: false, error: 'Database error' };
        }
	}
} satisfies Actions;
