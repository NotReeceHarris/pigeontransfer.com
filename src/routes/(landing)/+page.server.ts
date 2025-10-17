import type { Actions } from './$types';
import { db } from '$lib/server/db';
import { transfer } from '$lib/server/db/schema';
import { generateCode } from '$lib/utils/file';

export const actions = {
	create: async ({ request }) => {
		const formData = await request.formData();

        const filename = formData.get('name')?.toString();
        const size = formData.get('size') ? Number(formData.get('size')) : null;
        const mimeType = formData.get('type')?.toString();
        const checksum = formData.get('checksum')?.toString();
        const offer = formData.get('offer')?.toString() || null;

        if (!filename || !size || !mimeType || !checksum || !offer) {
            return { success: false, error: 'Missing required fields' };
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
                expiresAt,
                offer
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
