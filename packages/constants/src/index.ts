export const APP_NAME = "Docudeck";
export const SESSION_COOKIE_NAME = "docudeck_session";
export const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;
export const MAX_IMPORT_BYTES = 1_048_576;
export const SUPPORTED_IMPORT_EXTENSION = ".txt";
export const ACTIVE_PRESENCE_WINDOW_SECONDS = 60;

export const DOCUMENT_ROLES = ["owner", "editor", "commenter", "viewer"] as const;
export type DocumentRole = (typeof DOCUMENT_ROLES)[number];

export const DEFAULT_DOCUMENT_CONTENT = {
	type: "doc",
	content: [{ type: "paragraph" }],
} as const;
