import type { Actions } from './$types';
import { db } from '$lib/server/db';
import { transfer } from '$lib/server/db/schema';
import { generateCode } from '$lib/utils/file';
import { env } from '$env/dynamic/private';

const VIRUSTOTAL_URL = "https://www.virustotal.com/api/v3/files/"
const VIRUSTOTAL_API_KEY = env.VIRUSTOTAL_API_KEY;

export const actions = {
	create: async ({ request, platform }) => {
		const formData = await request.formData();

        const filename = formData.get('name')?.toString();
        const size = formData.get('size') ? Number(formData.get('size')) : null;
        const mimeType = formData.get('type')?.toString();
        const checksum = formData.get('checksum')?.toString();
        const offer = formData.get('offer')?.toString() || null;

        if (!filename || !size || !mimeType || !checksum || !offer) {
            return { success: false, error: 'Missing required fields' };
        }

        const response = await fetch(VIRUSTOTAL_URL + checksum, {
            method: 'GET',
            headers: {
                'x-apikey': VIRUSTOTAL_API_KEY
            }
        }).catch((error) => {
            console.error('Error fetching VirusTotal:', error);
            return null;
        })


        if (!response || !response.ok && response.status !== 404) {
            return { success: false, error: 'Error verifying file with VirusTotal' };
        }

        let virusChecked = false;

        if (response.status !== 404) {
            const json = await response.json().catch((error) => {
                console.error('Error parsing VirusTotal response:', error);
                return null;
            })

            if (json) {
                const reputation = json.data.attributes.reputation;
                const maliciousVotes = json.data.attributes.last_analysis_stats.malicious;
                const sandboxes = json.data.attributes.total_votes.malicious;
                const verdicts = json.data.attributes.sandbox_verdicts;

                if (reputation < 0 || maliciousVotes > 0 || sandboxes > 0) {
                    return { success: false, error: '🚫 File is flagged as malicious' };
                }

                if (verdicts) {
                    for (const key in verdicts) {
                        if (verdicts[key].verdict === 'malicious') {
                            return { success: false, error: `🚫 File is flagged as malicious by ${verdicts[key].sandbox_name}` };
                        }
                    }
                }

                virusChecked = true;
            }
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

            const verification = crypto.randomUUID().replace(/-/g, '').slice(0, 64);

            // Insert transfer record
            const result = await db.insert(transfer).values({
                code,
                filename,
                bytes: BigInt(size),
                mimeType,
                checksum,
                expiresAt,
                offer,
                virusChecked,
                verification: verification
            }).returning({ id: transfer.id, code: transfer.code });

            if (result.length > 0) {
                return { success: true, code: result[0].code, verification: verification };
            } else {
                return { success: false, error: 'Failed to create transfer' };
            }
        } catch (error) {
            console.error('Database error:', error);
            return { success: false, error: 'Database error' };
        }
	}
} satisfies Actions;
