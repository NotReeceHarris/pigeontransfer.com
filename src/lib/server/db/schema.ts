import { pgTable, serial, varchar, bigint, timestamp, integer } from 'drizzle-orm/pg-core';

export const transfer = pgTable('transfer', {
	id: serial('id').primaryKey(),
	code: varchar('code', { length: 6 }).notNull(),

	/* Meta Data */
	bytes: bigint({ mode: 'bigint' }).notNull(),
	filename: varchar('filename', { length: 255 }).notNull(),
	mimeType: varchar('mime_type', { length: 255 }).notNull(),
	
	/* Security */
	password: varchar('password', { length: 97 }),
	maxRecipients: integer('max_recipients').notNull().default(1),
	checksum: varchar('checksum', { length: 64 }).notNull(),

	createdAt: timestamp().defaultNow().notNull(),
});