"use client";

import { Check, LoaderCircle, MessageSquare, RotateCcw, Send } from "lucide-react";
import { useEffect, useState } from "react";

type CommentItem = { id: string; authorId: string; authorName: string; body: string; isResolved: boolean; createdAt: string };

export function CommentsPanel({
	documentId,
	canComment,
	currentUserId,
}: {
	documentId: string;
	canComment: boolean;
	currentUserId: string;
}) {
	const [comments, setComments] = useState<CommentItem[]>([]);
	const [body, setBody] = useState("");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	async function load() {
		const response = await fetch(`/api/v1/documents/${documentId}/comments`, { cache: "no-store" });
		const result = await response.json();
		if (!response.ok) throw new Error(result.error ?? "Could not load comments");
		setComments(result.comments ?? []);
	}
	useEffect(() => {
		load()
			.catch((caught) => setError(caught.message))
			.finally(() => setLoading(false));
	}, [documentId]);

	async function addComment(event: React.FormEvent) {
		event.preventDefault();
		setError("");
		const response = await fetch(`/api/v1/documents/${documentId}/comments`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ body }),
		});
		const result = await response.json();
		if (!response.ok) {
			setError(result.error ?? "Could not add comment");
			return;
		}
		setBody("");
		load().catch((caught) => setError(caught.message));
	}

	async function resolve(comment: CommentItem) {
		const response = await fetch(`/api/v1/documents/${documentId}/comments/${comment.id}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ isResolved: !comment.isResolved }),
		});
		const result = await response.json();
		if (!response.ok) {
			setError(result.error ?? "Could not update comment");
			return;
		}
		setComments((items) => items.map((item) => (item.id === comment.id ? { ...item, isResolved: result.comment.isResolved } : item)));
	}

	return (
		<aside className="no-print flex h-full min-h-[360px] flex-col border-l border-line bg-surface">
			<div className="flex items-center justify-between border-b border-line px-4 py-4">
				<div className="flex items-center gap-2">
					<MessageSquare size={16} className="text-ink" />
					<h2 className="text-sm font-semibold text-ink">Comments</h2>
				</div>
				<span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] text-muted">{comments.length}</span>
			</div>
			<div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
				{loading ? (
					<LoaderCircle size={16} className="mx-auto animate-spin text-muted" />
				) : comments.length ? (
					comments.map((comment) => (
						<article
							key={comment.id}
							className={`rounded-xl border p-3 ${comment.isResolved ? "border-line bg-surface-muted/60 opacity-70" : "border-line bg-white"}`}
						>
							<div className="flex items-start justify-between gap-2">
								<div>
									<p className="text-xs font-semibold text-ink">
										{comment.authorName}
										{comment.authorId === currentUserId ? " · you" : ""}
									</p>
									<p className="mt-0.5 text-[10px] text-muted">{new Date(comment.createdAt).toLocaleString()}</p>
								</div>
								{canComment && (
									<button
										type="button"
										onClick={() => resolve(comment)}
										aria-label={comment.isResolved ? "Reopen comment" : "Resolve comment"}
										className="rounded-md p-1 text-muted hover:bg-surface-muted"
									>
										{comment.isResolved ? <RotateCcw size={13} /> : <Check size={14} />}
									</button>
								)}
							</div>
							<p className="mt-3 whitespace-pre-wrap text-xs leading-5 text-ink-soft">{comment.body}</p>
							{comment.isResolved && <span className="mt-2 inline-block text-[10px] font-medium text-success">Resolved</span>}
						</article>
					))
				) : (
					<div className="py-10 text-center">
						<MessageSquare size={20} className="mx-auto text-subtle" />
						<p className="mt-3 text-xs font-medium text-ink">No comments yet</p>
						<p className="mt-1 text-[11px] text-muted">Start a conversation about this document.</p>
					</div>
				)}
			</div>
			{canComment ? (
				<form onSubmit={addComment} className="border-t border-line p-4">
					<label className="sr-only" htmlFor="comment-body">
						Add a comment
					</label>
					<textarea
						id="comment-body"
						rows={3}
						maxLength={5000}
						value={body}
						onChange={(event) => setBody(event.target.value)}
						placeholder="Write a comment…"
						className="w-full resize-none rounded-lg border border-line bg-canvas p-3 text-xs leading-5 outline-none focus:border-ink"
					/>
					<div className="mt-2 flex items-center justify-between">
						<span className="text-[10px] text-muted">Comments are visible to collaborators.</span>
						<button
							type="submit"
							disabled={!body.trim()}
							className="flex h-8 items-center gap-1.5 rounded-lg bg-action px-3 text-[11px] font-semibold text-white hover:bg-action-hover disabled:opacity-40"
						>
							<Send size={12} /> Post
						</button>
					</div>
				</form>
			) : (
				<p className="border-t border-line p-4 text-[11px] text-muted">You have view-only access to comments.</p>
			)}
			{error && (
				<p role="alert" className="px-4 pb-3 text-xs text-danger">
					{error}
				</p>
			)}
		</aside>
	);
}
