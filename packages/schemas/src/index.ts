import { z } from "zod";

export const loginSchema = z.object({
	email: z.email().max(255),
	password: z.string().min(1).max(128),
});

export const createDocumentSchema = z.object({
	title: z.string().trim().min(1).max(200).optional(),
});

export const documentContentSchema = z
	.object({
		type: z.literal("doc"),
		content: z.array(z.record(z.string(), z.unknown())).optional(),
	})
	.strict();

export const updateDocumentSchema = z
	.object({
		title: z.string().trim().min(1).max(200).optional(),
		content: documentContentSchema.optional(),
		expectedRevision: z.number().int().min(0).optional(),
	})
	.refine((value) => value.title !== undefined || value.content !== undefined, {
		message: "Provide a title or document content to update",
	});

export const shareDocumentSchema = z.object({
	email: z.email().max(255),
	role: z.enum(["editor", "commenter", "viewer"]),
});

export const createCommentSchema = z.object({
	body: z.string().trim().min(1).max(5000),
	anchorData: z.record(z.string(), z.unknown()).optional(),
});

export const resolveCommentSchema = z.object({ isResolved: z.boolean() });

export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;

export const createSuggestionSchema = z
	.object({
		originalText: z.string().trim().min(1).max(2000),
		proposedText: z.string().trim().min(1).max(2000),
	})
	.refine((value) => !/[\r\n]/.test(value.originalText) && !/[\r\n]/.test(value.proposedText), {
		message: "Suggestions must be a single line of text",
	});

export const resolveSuggestionSchema = z.object({
	status: z.enum(["accepted", "rejected"]),
});
