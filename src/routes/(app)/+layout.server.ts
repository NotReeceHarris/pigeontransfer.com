import { db } from '$lib/server/db';
import { transfer } from '$lib/server/db/schema';
import { count, eq, sql } from 'drizzle-orm';

// Simple in-memory cache for statistics.
// memory doesn't replicate across server 
// instances, but stats are not critical.

const cache: {
    expires: Date | null,
    totalTransfers: number | null,
    virusChecked: number | null,
    bytesTransferred: number | null
} = {
    expires: null,
    totalTransfers: null,
    virusChecked: null,
    bytesTransferred: null
}

export const load = async () => {

    if (
        (cache.expires && cache.expires < new Date())
        ||
        (
            cache.totalTransfers === null &&
            cache.virusChecked === null &&
            cache.bytesTransferred === null
        )
    ) {

        const totalTransfers = await db.select({
            count: count()
        })
        .from(transfer)
        .where(
            eq(transfer.complete, (1 as unknown as boolean))
        )
        .then(rows => rows[0].count)
        .catch(() => 0);

        const virusChecked = await db.select({
            count: count()
        })
        .from(transfer)
        .where(
            eq(transfer.virusChecked, true)
        )
        .then(rows => rows[0].count)
        .catch(() => 0);

        const bytesTransferred = await db.select({
            bytes: sql`COALESCE(SUM(${transfer.bytes}), 0)::bigint`.as('bytes')
        })
        .from(transfer)
        .where(
            eq(transfer.complete, (1 as unknown as boolean))
        )
        .then(rows => `${rows[0].bytes}`)
        .catch(() => '0');

        cache.expires = new Date(Date.now() + 5 * 60 * 1000);
        cache.totalTransfers = totalTransfers;
        cache.virusChecked = virusChecked;
        cache.bytesTransferred = parseInt(bytesTransferred, 10);
    }

    return {
        stats: {
            totalTransfers: cache.totalTransfers || 0,
            virusChecked: cache.virusChecked || 0,
            bytesTransferred: cache.bytesTransferred || 0
        }
    }

}