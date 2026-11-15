"use client";

import { Check, GitPullRequest, LoaderCircle, RotateCcw, Send, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type Suggestion = {
	id: string;
	authorId: string;
	authorName: string;
	originalText: string;
	proposedText: string;
	status: "pending" | "accepted" | "rejected";
	createdAt: string;
};

export function SuggestionsPanel({
	documentId,
	canSuggest,
	canReview,
	onDocumentChanged,
}: {
	documentId: string;
	canSuggest: boolean;
	canReview: boolean;
	onDocumentChanged: () => void;
}) {
	const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
	const [originalText, setOriginalText] = useState("");
	const [proposedText, setProposedText] = useState("");
	const [loading, setLoading] = useState(true);
	const [working, setWorking] = useState(false);
	const [error, setError] = useState("");

	const load = useCallback(async () => {
		const response = await fetch(`/api/v1/documents/${documentId}/suggestions`, { cache: "no-store" });
		const result = await response.json();
		if (!response.ok) throw new Error(result.error ?? "Could not load suggestions");
		setSuggestions(result.suggestions ?? []);
	}, [documentId]);

	useEffect(() => {
		load()
			.catch((caught) => setError(caught.message))
			.finally(() => setLoading(false));
	}, [load]);

	async function submit(event: React.FormEvent) {
		event.preventDefault();
		setWorking(true);
		setError("");
		try {
			const response = await fetch(`/api/v1/documents/${documentId}/suggestions`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ originalText, proposedText }),
			});
			const result = await response.json();
			if (!response.ok) throw new Error(result.error ?? "Could not submit suggestion");
			setOriginalText("");
			setProposedText("");
			await load();
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : "Could not submit suggestion");
		} finally {
			setWorking(false);
		}
	}

	async function review(suggestion: Suggestion, status: "accepted" | "rejected") {
		setWorking(true);
		setError("");
		try {
			const response = await fetch(`/api/v1/documents/${documentId}/suggestions/${suggestion.id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ status }),
			});
			const result = await response.json();
			if (!response.ok) throw new Error(result.error ?? "Could not review suggestion");
			await load();
			if (status === "accepted") onDocumentChanged();
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : "Could not review suggestion");
		} finally {
			setWorking(false);
		}
	}

	return (
		<aside className="no-print flex h-full min-h-[360px] flex-col border-l border-line bg-surface">
			<div className="flex items-center justify-between border-b border-line px-4 py-4">
				<div className="flex items-center gap-2">
					<GitPullRequest size={16} className="text-ink" />
					<h2 className="text-sm font-semibold text-ink">Suggestions</h2>
				</div>
				<span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] text-muted">
					{suggestions.filter((item) => item.status === "pending").length} pending
				</span>
			</div>
			{canSuggest && (
				<form onSubmit={submit} className="space-y-2 border-b border-line p-4">
					<p className="text-[11px] font-medium text-ink">Suggest a text replacement</p>
					<label className="block text-[10px] text-muted">
						Exact original phrase
						<textarea
							required
							rows={2}
							maxLength={2000}
							value={originalText}
							onChange={(event) => setOriginalText(event.target.value)}
							placeholder="Copy a unique phrase from the document"
							className="mt-1 w-full resize-none rounded-lg border border-line bg-canvas p-2.5 text-xs text-ink outline-none focus:border-ink"
						/>
					</label>
					<label className="block text-[10px] text-muted">
						Proposed replacement
						<textarea
							required
							rows={2}
							maxLength={2000}
							value={proposedText}
							onChange={(event) => setProposedText(event.target.value)}
							placeholder="Write your replacement"
							className="mt-1 w-full resize-none rounded-lg border border-line bg-canvas p-2.5 text-xs text-ink outline-none focus:border-ink"
						/>
					</label>
					<p className="text-[10px] leading-4 text-muted">
						Use a unique, single-line phrase contained within one paragraph or list item.
					</p>
					<button
						type="submit"
						disabled={working || !originalText.trim() || !proposedText.trim()}
						className="flex h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-action px-3 text-[11px] font-semibold text-white hover:bg-action-hover disabled:opacity-40"
					>
						<Send size={12} /> Submit suggestion
					</button>
				</form>
			)}
			{error && (
				<p role="alert" className="mx-4 mt-3 rounded-lg bg-danger-surface px-3 py-2 text-[11px] text-danger">
					{error}
				</p>
			)}
			<div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
				{loading ? (
					<LoaderCircle size={16} className="mx-auto animate-spin text-muted" />
				) : suggestions.length ? (
					suggestions.map((suggestion) => (
						<article key={suggestion.id} className="rounded-xl border border-line p-3">
							<div className="flex items-start justify-between gap-2">
								<div>
									<p className="text-xs font-semibold text-ink">{suggestion.authorName}</p>
									<p className="mt-0.5 text-[10px] text-muted">{new Date(suggestion.createdAt).toLocaleString()}</p>
								</div>
								<span
									className={`rounded-full px-2 py-0.5 text-[9px] font-medium capitalize ${suggestion.status === "pending" ? "bg-warning-surface text-warning" : suggestion.status === "accepted" ? "bg-success-surface text-success" : "bg-surface-muted text-muted"}`}
								>
									{suggestion.status}
								</span>
							</div>
							<div className="mt-3 space-y-2 text-xs">
								<div>
									<p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-muted">Original</p>
									<p className="rounded-lg bg-danger-surface px-2.5 py-2 text-ink-soft line-through">
										{suggestion.originalText}
									</p>
								</div>
								<div>
									<p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-muted">Proposed</p>
									<p className="rounded-lg bg-success-surface px-2.5 py-2 text-ink-soft">{suggestion.proposedText}</p>
								</div>
							</div>
							{suggestion.status === "pending" && canReview && (
								<div className="mt-3 flex gap-2">
									<button
										type="button"
										disabled={working}
										onClick={() => review(suggestion, "accepted")}
										className="flex h-8 flex-1 items-center justify-center gap-1 rounded-lg bg-action px-2 text-[10px] font-semibold text-white hover:bg-action-hover disabled:opacity-40"
									>
										<Check size={12} /> Accept
									</button>
									<button
										type="button"
										disabled={working}
										onClick={() => review(suggestion, "rejected")}
										className="flex h-8 items-center justify-center gap-1 rounded-lg border border-line px-2 text-[10px] font-semibold text-ink hover:bg-surface-muted disabled:opacity-40"
									>
										<X size={12} /> Reject
									</button>
								</div>
							)}
							{suggestion.status === "pending" && !canReview && (
								<p className="mt-3 flex items-center gap-1 text-[10px] text-muted">
									<RotateCcw size={11} /> Waiting for an editor to review
								</p>
							)}
						</article>
					))
				) : (
					<div className="py-10 text-center">
						<GitPullRequest size={20} className="mx-auto text-subtle" />
						<p className="mt-3 text-xs font-medium text-ink">No suggestions yet</p>
						<p className="mt-1 text-[11px] text-muted">Propose a concise text replacement for review.</p>
					</div>
				)}
			</div>
		</aside>
	);
}
