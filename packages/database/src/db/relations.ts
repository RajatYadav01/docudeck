import { defineRelations } from "drizzle-orm";
import { documentComments, documentPresence, documentShares, documentSuggestions, documents, documentVersions, users } from "./schema";

// Keep enums out of the relations input: Drizzle relations are defined over table objects only.
const relationalSchema = {
	users,
	documents,
	documentShares,
	documentVersions,
	documentComments,
	documentPresence,
	documentSuggestions,
};

// Drizzle v1 relation definitions live in one schema-level defineRelations call.
export const relations = defineRelations(relationalSchema, (r) => ({
	users: {
		ownedDocuments: r.many.documents(),
		recipientShares: r.many.documentShares({ alias: "share_recipient" }),
		createdShares: r.many.documentShares({ alias: "share_creator" }),
		comments: r.many.documentComments(),
		presence: r.many.documentPresence(),
	},
	documents: {
		owner: r.one.users({ from: r.documents.ownerId, to: r.users.id }),
		shares: r.many.documentShares(),
		versions: r.many.documentVersions(),
		comments: r.many.documentComments(),
		presence: r.many.documentPresence(),
		suggestions: r.many.documentSuggestions(),
	},
	documentShares: {
		document: r.one.documents({ from: r.documentShares.documentId, to: r.documents.id }),
		recipient: r.one.users({ from: r.documentShares.userId, to: r.users.id, alias: "share_recipient" }),
		creator: r.one.users({ from: r.documentShares.createdBy, to: r.users.id, alias: "share_creator" }),
	},
	documentVersions: {
		document: r.one.documents({ from: r.documentVersions.documentId, to: r.documents.id }),
		creator: r.one.users({ from: r.documentVersions.createdBy, to: r.users.id, alias: "version_creator" }),
	},
	documentComments: {
		document: r.one.documents({ from: r.documentComments.documentId, to: r.documents.id }),
		author: r.one.users({ from: r.documentComments.authorId, to: r.users.id }),
	},
	documentPresence: {
		document: r.one.documents({ from: r.documentPresence.documentId, to: r.documents.id }),
		user: r.one.users({ from: r.documentPresence.userId, to: r.users.id }),
	},
	documentSuggestions: {
		document: r.one.documents({ from: r.documentSuggestions.documentId, to: r.documents.id }),
		author: r.one.users({ from: r.documentSuggestions.authorId, to: r.users.id }),
	},
}));
