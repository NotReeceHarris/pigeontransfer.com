import { pgTable, serial, varchar, bigint, timestamp, integer, boolean } from 'drizzle-orm/pg-core';

export const transfer = pgTable('transfer', {
	id: serial('id').primaryKey(),
	code: varchar('code', { length: 6 }).notNull().unique(),

	/* Meta Data */
	bytes: bigint('bytes', { mode: 'bigint' }).notNull(),
	filename: varchar('filename', { length: 255 }).notNull(),
	mimeType: varchar('mime_type', { length: 255 }).notNull(),
	
	/* Security */
	password: varchar('password', { length: 97 }),
	maxRecipients: integer('max_recipients').notNull().default(1),
	checksum: varchar('checksum', { length: 64 }).notNull(),
	
	/* Download Status */
	complete: boolean('complete').notNull().default(false),

	/* WebRTC */
	offer: varchar('offer', { length: 5000 }).notNull(),
	answer: varchar('answer', { length: 5000 }),

	createdAt: timestamp('created_at').defaultNow().notNull(),
	expiresAt: timestamp('expires_at').notNull(),
});
