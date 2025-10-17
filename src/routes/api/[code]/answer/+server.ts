import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { transfer } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export async function GET({ params }) {
	const code = params.code;

	if (!code || code.length !== 6) {
        return json({ error: 'Invalid code' }, { status: 400 });
    }

	try {
		
		const transferRecord = await db.select({
			id: transfer.id,
			answer: transfer.answer,
			expiresAt: transfer.expiresAt,
			complete: transfer.complete,
			maxRecipients: transfer.maxRecipients
		}).from(transfer).where(eq(transfer.code, code)).limit(1).then(rows => rows[0]);

		if (!transferRecord) {
            return json({ error: 'Transfer not found' }, { status: 404 });
        }

		if (!transferRecord.answer) {
			return json({ answer: null }, { status: 200 });
		}

		if (transferRecord.complete) {
			return json({ error: 'Transfer already completed' }, { status: 409 });
		}

        // Check if transfer has expired
        if (transferRecord.expiresAt < new Date()) {
            return json({ error: 'Transfer has expired' }, { status: 410 });
        }

		return json({ answer: transferRecord.answer }, { status: 200 });

	} catch (error) {
		console.error('Database error:', error);
		return json({ error: 'Database error' }, { status: 500 });
	}

}

export async function POST({ params, request }) {
	const code = params.code;

	if (!code || code.length !== 6) {
        return json({ error: 'Invalid code' }, { status: 400 });
    }

	const formData = await request.formData();
	const answer = formData.get('answer')?.toString();

	if (!answer) {
		return json({ error: 'Missing answer' }, { status: 400 });
	}

	try {
		
		const transferRecord = await db.select({
			id: transfer.id,
			answer: transfer.answer,
			expiresAt: transfer.expiresAt,
			complete: transfer.complete,
			maxRecipients: transfer.maxRecipients
		}).from(transfer).where(eq(transfer.code, code)).limit(1).then(rows => rows[0]);

		if (!transferRecord) {
            return json({ error: 'Transfer not found' }, { status: 404 });
        }

		/* if (transferRecord.answer) {
			return json({ error: 'Answer already set' }, { status: 409 });
		} */

		if (transferRecord.complete) {
			return json({ error: 'Transfer already completed' }, { status: 409 });
		}

        // Check if transfer has expired
        if (transferRecord.expiresAt < new Date()) {
            return json({ error: 'Transfer has expired' }, { status: 410 });
        }

		await db.update(transfer).set({
			answer: answer
		}).where(eq(transfer.id, transferRecord.id));

		return json({ success: true}, { status: 200 });

	} catch (error) {
		console.error('Database error:', error);
		return json({ error: 'Database error' }, { status: 500 });
	}

}