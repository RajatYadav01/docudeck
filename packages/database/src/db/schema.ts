import {
	type AnyPgColumn,
	boolean,
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";

export const shareRoleEnum = pgEnum("docudeck_share_role", ["editor", "commenter", "viewer"]);
export const suggestionStatusEnum = pgEnum("docudeck_suggestion_status", ["pending", "accepted", "rejected"]);

export const users = pgTable(
	"users",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		name: varchar("name", { length: 120 }).notNull(),
		email: varchar("email", { length: 255 }).notNull(),
		passwordHash: text("password_hash").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [uniqueIndex("users_email_uidx").on(table.email)],
);

export const documents = pgTable(
	"documents",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		title: varchar("title", { length: 200 }).notNull().default("Untitled Document"),
		// Application-level AES-256-GCM encryption: plaintext JSON never reaches this column.
		contentCiphertext: text("content_ciphertext").notNull(),
		encryptionVersion: integer("encryption_version").notNull().default(1),
		revision: integer("revision").notNull().default(0),
		ownerId: uuid("owner_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [index("documents_owner_updated_idx").on(table.ownerId, table.updatedAt)],
);

export const documentShares = pgTable(
	"document_shares",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		documentId: uuid("document_id")
			.notNull()
			.references(() => documents.id, { onDelete: "cascade" }),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		role: shareRoleEnum("role").notNull().default("viewer"),
		createdBy: uuid("created_by")
			.notNull()
			.references(() => users.id, { onDelete: "restrict" }),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		uniqueIndex("document_shares_document_user_uidx").on(table.documentId, table.userId),
		index("document_shares_user_idx").on(table.userId),
	],
);

export const documentVersions = pgTable(
	"document_versions",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		documentId: uuid("document_id")
			.notNull()
			.references(() => documents.id, { onDelete: "cascade" }),
		versionNumber: integer("version_number").notNull(),
		title: varchar("title", { length: 200 }).notNull(),
		contentCiphertext: text("content_ciphertext").notNull(),
		encryptionVersion: integer("encryption_version").notNull().default(1),
		createdBy: uuid("created_by")
			.notNull()
			.references(() => users.id, { onDelete: "restrict" }),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		uniqueIndex("document_versions_document_version_uidx").on(table.documentId, table.versionNumber),
		index("document_versions_document_created_idx").on(table.documentId, table.createdAt),
	],
);

export const documentComments = pgTable(
	"document_comments",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		documentId: uuid("document_id")
			.notNull()
			.references(() => documents.id, { onDelete: "cascade" }),
		authorId: uuid("author_id")
			.notNull()
			.references(() => users.id, { onDelete: "restrict" }),
		parentCommentId: uuid("parent_comment_id").references((): AnyPgColumn => documentComments.id, { onDelete: "cascade" }),
		bodyCiphertext: text("body_ciphertext").notNull(),
		anchorData: jsonb("anchor_data").$type<Record<string, unknown> | null>(),
		isResolved: boolean("is_resolved").notNull().default(false),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [index("document_comments_document_created_idx").on(table.documentId, table.createdAt)],
);

export const documentPresence = pgTable(
	"document_presence",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		documentId: uuid("document_id")
			.notNull()
			.references(() => documents.id, { onDelete: "cascade" }),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		uniqueIndex("document_presence_document_user_uidx").on(table.documentId, table.userId),
		index("document_presence_last_seen_idx").on(table.documentId, table.lastSeenAt),
	],
);

export const documentSuggestions = pgTable(
	"document_suggestions",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		documentId: uuid("document_id")
			.notNull()
			.references(() => documents.id, { onDelete: "cascade" }),
		authorId: uuid("author_id")
			.notNull()
			.references(() => users.id, { onDelete: "restrict" }),
		originalCiphertext: text("original_ciphertext").notNull(),
		proposedCiphertext: text("proposed_ciphertext").notNull(),
		anchorData: jsonb("anchor_data").$type<Record<string, unknown> | null>(),
		status: suggestionStatusEnum("status").notNull().default("pending"),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		resolvedAt: timestamp("resolved_at", { withTimezone: true }),
	},
	(table) => [index("document_suggestions_document_status_idx").on(table.documentId, table.status)],
);
