export type SafeUser = { id: string; name: string; email: string };
export type ShareRole = "editor" | "commenter" | "viewer";
export type DocumentSummary = {
	id: string;
	title: string;
	ownerId: string;
	ownerName: string;
	updatedAt: string;
	createdAt: string;
	accessRole: "owner" | ShareRole;
};
export type DocumentContent = { type: "doc"; content?: unknown[] };
export type Collaborator = { userId: string; name: string; email: string; role: ShareRole };
