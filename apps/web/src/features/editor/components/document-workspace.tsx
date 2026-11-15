"use client";

import type { DocumentRole } from "@docudeck/constants";
import type { SafeUser } from "@docudeck/types";
import {
	AlertCircle,
	ArrowLeft,
	Check,
	Download,
	FileText,
	GitPullRequest,
	History,
	LoaderCircle,
	MessageSquare,
	Printer,
	Share2,
	ShieldCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CommentsPanel } from "@/features/comments/components/comments-panel";
import { PresenceIndicator } from "@/features/presence/components/presence-indicator";
import { ShareDialog } from "@/features/sharing/components/share-dialog";
import { SuggestionsPanel } from "@/features/suggestions/components/suggestions-panel";
import { DocumentEditor } from "./document-editor";
import { VersionHistory } from "./version-history";

type Collaborator = { userId: string; name: string; email: string; role: "editor" | "commenter" | "viewer" };
type DocumentData = {
	id: string;
	title: string;
	content: unknown;
	ownerId: string;
	ownerName?: string;
	revision: number;
	updatedAt: string;
	accessRole: DocumentRole;
};

export function DocumentWorkspace({ documentId }: { documentId: string }) {
	const router = useRouter();
	const [user, setUser] = useState<SafeUser | null>(null);
	const [document, setDocument] = useState<DocumentData | null>(null);
	const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
	const [title, setTitle] = useState("");
	const [content, setContent] = useState<unknown>(null);
	const [revision, setRevision] = useState(0);
	const [titleDirty, setTitleDirty] = useState(false);
	const [contentDirty, setContentDirty] = useState(false);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [saveState, setSaveState] = useState<"saved" | "dirty" | "saving" | "error">("saved");
	const [error, setError] = useState("");
	const [showShare, setShowShare] = useState(false);
	const [showHistory, setShowHistory] = useState(false);
	const [showComments, setShowComments] = useState(false);
	const [showSuggestions, setShowSuggestions] = useState(false);

	const canEdit = document?.accessRole === "owner" || document?.accessRole === "editor";
	const canComment = document?.accessRole !== "viewer";
	const isOwner = document?.accessRole === "owner";
	const isDirty = titleDirty || contentDirty;

	const loadDocument = useCallback(async () => {
		const [meResponse, docResponse] = await Promise.all([
			fetch("/api/v1/auth/me", { cache: "no-store" }),
			fetch(`/api/v1/documents/${documentId}`, { cache: "no-store" }),
		]);
		if (meResponse.status === 401 || docResponse.status === 401) {
			router.replace("/login");
			return;
		}
		const me = await meResponse.json();
		const result = await docResponse.json();
		if (!docResponse.ok) throw new Error(result.error ?? "Document could not be opened");
		setUser(me.user);
		setDocument(result.document);
		setTitle(result.document.title);
		setContent(result.document.content);
		setRevision(result.document.revision);
		setCollaborators(result.collaborators ?? []);
		setTitleDirty(false);
		setContentDirty(false);
		setSaveState("saved");
	}, [documentId, router]);

	useEffect(() => {
		loadDocument()
			.catch((caught) => setError(caught instanceof Error ? caught.message : "Document could not be opened"))
			.finally(() => setLoading(false));
	}, [loadDocument]);

	useEffect(() => {
		setSaveState(isDirty ? "dirty" : "saved");
	}, [isDirty]);

	async function saveDocument() {
		if (!document || !isDirty || saving) return;
		setSaving(true);
		setSaveState("saving");
		setError("");
		const payload: { expectedRevision: number; title?: string; content?: unknown } = { expectedRevision: revision };
		if (titleDirty) payload.title = title;
		if (contentDirty) payload.content = content;
		try {
			const response = await fetch(`/api/v1/documents/${documentId}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			const result = await response.json();
			if (!response.ok) throw new Error(result.error ?? "Unable to save document");
			setRevision(result.document.revision);
			setDocument((current) =>
				current
					? { ...current, title: result.document.title, revision: result.document.revision, updatedAt: result.document.updatedAt }
					: current,
			);
			setTitle(result.document.title);
			setTitleDirty(false);
			setContentDirty(false);
			setSaveState("saved");
		} catch (caught) {
			setSaveState("error");
			setError(caught instanceof Error ? caught.message : "Unable to save document");
		} finally {
			setSaving(false);
		}
	}

	useEffect(() => {
		function onKeyDown(event: KeyboardEvent) {
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
				event.preventDefault();
				saveDocument();
			}
		}
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	});

	async function exportMarkdown() {
		const response = await fetch(`/api/v1/documents/${documentId}/export?format=markdown`);
		if (!response.ok) {
			const result = await response.json();
			setError(result.error ?? "Export failed");
			return;
		}
		const blob = await response.blob();
		const url = URL.createObjectURL(blob);
		const anchor = window.document.createElement("a");
		anchor.href = url;
		anchor.download = `${
			(title || "document")
				.replace(/[^a-z0-9-_ ]/gi, "")
				.trim()
				.replace(/\s+/g, "-") || "document"
		}.md`;
		anchor.click();
		URL.revokeObjectURL(url);
	}

	function leaveDocument() {
		if (isDirty && !window.confirm("You have unsaved changes. Leave without saving?")) return;
		router.push("/documents");
	}

	if (loading)
		return (
			<main className="grid min-h-screen place-items-center">
				<LoaderCircle className="animate-spin text-muted" />
			</main>
		);
	if (!document)
		return (
			<main className="mx-auto max-w-xl px-6 py-24 text-center">
				<AlertCircle className="mx-auto text-danger" />
				<h1 className="mt-4 text-xl font-semibold text-ink">Document unavailable</h1>
				<p className="mt-2 text-sm text-muted">
					{error || "This document may have been removed or you may no longer have access."}
				</p>
				<button
					onClick={() => router.push("/documents")}
					className="mt-6 rounded-lg bg-action px-4 py-2 text-sm font-medium text-white"
				>
					Back to documents
				</button>
			</main>
		);

	return (
		<main className="min-h-screen bg-canvas">
			<header className="no-print sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
				<div className="flex min-h-16 items-center justify-between gap-3 px-4 sm:px-6">
					<div className="flex min-w-0 items-center gap-3">
						<button
							type="button"
							onClick={leaveDocument}
							aria-label="Back to documents"
							className="rounded-lg p-2 text-muted hover:bg-surface-muted hover:text-ink"
						>
							<ArrowLeft size={18} />
						</button>
						<span className="hidden h-8 w-8 place-items-center rounded-lg bg-ink text-white sm:grid">
							<FileText size={16} />
						</span>
						<div className="min-w-0">
							<input
								aria-label="Document title"
								value={title}
								disabled={!isOwner}
								onChange={(event) => {
									setTitle(event.target.value);
									setTitleDirty(true);
								}}
								onBlur={() => {
									if (!title.trim()) setTitle("Untitled Document");
								}}
								className="block w-full max-w-[44vw] truncate border-b border-transparent bg-transparent py-0.5 text-sm font-semibold text-ink outline-none focus:border-line-strong disabled:cursor-default sm:max-w-[360px]"
							/>
							<div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted">
								<span className="capitalize">{document.accessRole}</span>
								<span>·</span>
								<SaveState state={saveState} />
							</div>
						</div>
					</div>
					<div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
						{user && (
							<div className="hidden md:block">
								<PresenceIndicator documentId={documentId} currentUserId={user.id} />
							</div>
						)}
						<button
							type="button"
							onClick={() => {
								setShowComments((value) => !value);
								setShowSuggestions(false);
							}}
							aria-pressed={showComments}
							className={`grid h-9 w-9 place-items-center rounded-lg border transition ${showComments ? "border-ink bg-surface-muted" : "border-line text-muted hover:bg-surface-muted"}`}
							title="Comments"
						>
							<MessageSquare size={16} />
						</button>
						<button
							type="button"
							onClick={() => {
								setShowSuggestions((value) => !value);
								setShowComments(false);
							}}
							aria-pressed={showSuggestions}
							className={`flex h-9 w-9 items-center justify-center gap-1.5 rounded-lg border px-2 text-xs font-medium transition sm:w-auto sm:px-3 ${showSuggestions ? "border-ink bg-surface-muted text-ink" : "border-line text-muted hover:bg-surface-muted"}`}
							title="Suggestions"
						>
							<GitPullRequest size={15} />
							<span className="hidden sm:inline">Suggestions</span>
						</button>
						{(document.accessRole === "owner" || document.accessRole === "editor") && (
							<button
								type="button"
								onClick={() => setShowHistory(true)}
								className="hidden h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-xs font-medium text-ink hover:bg-surface-muted sm:flex"
							>
								<History size={14} /> History
							</button>
						)}
						<div className="group relative">
							<button
								type="button"
								className="grid h-9 w-9 place-items-center rounded-lg border border-line text-muted hover:bg-surface-muted"
								aria-label="Export options"
							>
								<Download size={16} />
							</button>
							<div className="invisible absolute right-0 top-10 z-40 w-44 rounded-xl border border-line bg-surface p-1 opacity-0 shadow-[var(--shadow)] transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
								<button
									type="button"
									onClick={exportMarkdown}
									className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-ink hover:bg-surface-muted"
								>
									<Download size={13} /> Export Markdown
								</button>
								<button
									type="button"
									onClick={() => window.print()}
									className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-ink hover:bg-surface-muted"
								>
									<Printer size={13} /> Print / Save PDF
								</button>
							</div>
						</div>
						{isOwner && (
							<button
								type="button"
								onClick={() => setShowShare(true)}
								className="flex h-9 items-center gap-1.5 rounded-lg bg-action px-3 text-xs font-semibold text-white hover:bg-action-hover"
							>
								<Share2 size={14} />
								<span className="hidden sm:inline">Share</span>
							</button>
						)}
						{canEdit && (
							<button
								type="button"
								onClick={saveDocument}
								disabled={!isDirty || saving}
								className="flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-xs font-semibold text-ink hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
							>
								{saving ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />}
								<span className="hidden sm:inline">Save</span>
							</button>
						)}
					</div>
				</div>
				{error && (
					<div role="alert" className="border-t border-danger/20 bg-danger-surface px-5 py-2 text-xs text-danger">
						{error}
					</div>
				)}
			</header>

			<div className={`mx-auto flex max-w-[1500px] items-start ${showComments || showSuggestions ? "" : "justify-center"}`}>
				<section className="min-w-0 flex-1 px-4 py-7 sm:px-8 sm:py-10">
					<div className="mx-auto mb-5 flex max-w-4xl items-center justify-between gap-4">
						<div>
							<p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
								{document.accessRole === "owner" ? "Your document" : `Shared by ${document.ownerName ?? "a teammate"}`}
							</p>
							<h1 className="mt-1 text-xs font-medium text-ink-soft">{title}</h1>
						</div>
						<div className="flex items-center gap-2">
							{document.accessRole === "owner" ? (
								<span className="flex items-center gap-1 rounded-full bg-surface-muted px-2.5 py-1 text-[10px] font-medium text-ink">
									<ShieldCheck size={12} /> Owner
								</span>
							) : (
								<span className="rounded-full bg-surface-muted px-2.5 py-1 text-[10px] font-medium capitalize text-ink">
									{document.accessRole}
								</span>
							)}
						</div>
					</div>
					<div className="mx-auto max-w-4xl">
						<DocumentEditor
							content={content}
							editable={Boolean(canEdit)}
							onChange={(nextContent) => {
								setContent(nextContent);
								setContentDirty(true);
							}}
						/>
					</div>
					<div className="no-print mx-auto mt-4 flex max-w-4xl flex-wrap items-center justify-between gap-2 text-[10px] text-muted">
						<span>Changes are stored securely when you save.</span>
						<span>Last saved {new Date(document.updatedAt).toLocaleString()}</span>
					</div>
				</section>
				{showComments && (
					<div className="no-print sticky top-16 hidden h-[calc(100vh-4rem)] w-[320px] shrink-0 md:block">
						<CommentsPanel documentId={documentId} canComment={Boolean(canComment)} currentUserId={user?.id ?? ""} />
					</div>
				)}
				{showSuggestions && (
					<div className="no-print sticky top-16 hidden h-[calc(100vh-4rem)] w-[340px] shrink-0 md:block">
						<SuggestionsPanel
							documentId={documentId}
							canSuggest={Boolean(canComment)}
							canReview={Boolean(canEdit)}
							onDocumentChanged={() => loadDocument().catch((caught) => setError(caught.message))}
						/>
					</div>
				)}
			</div>

			{(showComments || showSuggestions) && (
				<div className="no-print fixed inset-0 z-20 bg-ink/20 md:hidden">
					<div className="absolute inset-y-0 right-0 w-[min(90vw,380px)] bg-surface pt-16">
						<button
							type="button"
							onClick={() => {
								setShowComments(false);
								setShowSuggestions(false);
							}}
							className="absolute right-4 top-5 rounded-lg border border-line px-3 py-1.5 text-xs"
						>
							Close
						</button>
						{showComments && (
							<CommentsPanel documentId={documentId} canComment={Boolean(canComment)} currentUserId={user?.id ?? ""} />
						)}
						{showSuggestions && (
							<SuggestionsPanel
								documentId={documentId}
								canSuggest={Boolean(canComment)}
								canReview={Boolean(canEdit)}
								onDocumentChanged={() => loadDocument().catch((caught) => setError(caught.message))}
							/>
						)}
					</div>
				</div>
			)}
			{showShare && (
				<ShareDialog
					documentId={documentId}
					collaborators={collaborators}
					onClose={() => setShowShare(false)}
					onChanged={() => loadDocument().catch((caught) => setError(caught.message))}
				/>
			)}
			{showHistory && (
				<VersionHistory
					documentId={documentId}
					onClose={() => setShowHistory(false)}
					onRestored={() => loadDocument().catch((caught) => setError(caught.message))}
				/>
			)}
		</main>
	);
}

function SaveState({ state }: { state: "saved" | "dirty" | "saving" | "error" }) {
	if (state === "saved")
		return (
			<span className="flex items-center gap-1 text-success">
				<Check size={11} /> Saved
			</span>
		);
	if (state === "saving")
		return (
			<span className="flex items-center gap-1">
				<LoaderCircle size={11} className="animate-spin" /> Saving
			</span>
		);
	if (state === "error") return <span className="text-danger">Save failed</span>;
	return <span className="text-warning">Unsaved changes</span>;
}
