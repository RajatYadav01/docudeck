"use client";

import type { DocumentSummary, SafeUser } from "@docudeck/types";
import { ArrowUpRight, Clock3, FileText, FileUp, LoaderCircle, LogOut, Plus, Search, Trash2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type DashboardData = { owned: DocumentSummary[]; shared: DocumentSummary[] };

function dateLabel(value: string) {
	return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function DocumentTile({
	document,
	onOpen,
	onDelete,
	canDelete,
}: {
	document: DocumentSummary;
	onOpen: () => void;
	onDelete?: () => void;
	canDelete?: boolean;
}) {
	return (
		<article className="group relative rounded-2xl border border-line bg-surface p-5 transition hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[var(--shadow)]">
			<button type="button" onClick={onOpen} className="block w-full text-left">
				<div className="mb-5 flex items-center justify-between">
					<div className="grid h-10 w-10 place-items-center rounded-xl bg-surface-muted text-ink">
						<FileText size={19} />
					</div>
					<span className="rounded-full border border-line px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-muted">
						{document.accessRole === "owner" ? "Owned" : document.accessRole}
					</span>
				</div>
				<h3 className="truncate pr-7 text-base font-semibold text-ink">{document.title}</h3>
				<p className="mt-1 text-xs text-muted">
					{document.accessRole === "owner" ? "You own this document" : `Shared by ${document.ownerName}`}
				</p>
			</button>
			<div className="mt-5 flex items-center justify-between border-t border-line pt-4 text-xs text-muted">
				<span className="flex items-center gap-1.5">
					<Clock3 size={13} /> {dateLabel(document.updatedAt)}
				</span>
				<div className="flex items-center gap-1">
					{canDelete && onDelete && (
						<button
							type="button"
							onClick={onDelete}
							aria-label={`Delete ${document.title}`}
							className="rounded-lg p-1.5 opacity-0 transition hover:bg-danger-surface hover:text-danger group-hover:opacity-100"
						>
							<Trash2 size={14} />
						</button>
					)}
					<button
						type="button"
						onClick={onOpen}
						aria-label={`Open ${document.title}`}
						className="rounded-lg p-1.5 transition hover:bg-surface-muted"
					>
						<ArrowUpRight size={15} />
					</button>
				</div>
			</div>
		</article>
	);
}

export function DocumentsDashboard() {
	const router = useRouter();
	const fileInput = useRef<HTMLInputElement>(null);
	const [user, setUser] = useState<SafeUser | null>(null);
	const [data, setData] = useState<DashboardData>({ owned: [], shared: [] });
	const [query, setQuery] = useState("");
	const [loading, setLoading] = useState(true);
	const [working, setWorking] = useState(false);
	const [error, setError] = useState("");
	const [notice, setNotice] = useState("");

	async function refresh() {
		const [meResponse, docsResponse] = await Promise.all([fetch("/api/v1/auth/me"), fetch("/api/v1/documents")]);
		if (meResponse.status === 401 || docsResponse.status === 401) {
			router.replace("/login");
			return;
		}
		const me = await meResponse.json();
		const docs = await docsResponse.json();
		if (!meResponse.ok || !docsResponse.ok) throw new Error(docs.error ?? me.error ?? "Unable to load documents");
		setUser(me.user);
		setData(docs);
	}

	useEffect(() => {
		refresh()
			.catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to load workspace"))
			.finally(() => setLoading(false));
	}, []);

	async function createDocument() {
		setWorking(true);
		setError("");
		try {
			const response = await fetch("/api/v1/documents", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({}),
			});
			const result = await response.json();
			if (!response.ok) throw new Error(result.error ?? "Could not create document");
			router.push(`/documents/${result.document.id}`);
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : "Could not create document");
		} finally {
			setWorking(false);
		}
	}

	async function importFile(file?: File) {
		if (!file) return;
		setWorking(true);
		setError("");
		setNotice("");
		try {
			const form = new FormData();
			form.set("file", file);
			const response = await fetch("/api/v1/import", { method: "POST", body: form });
			const result = await response.json();
			if (!response.ok) throw new Error(result.error ?? "Import failed");
			router.push(`/documents/${result.document.id}`);
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : "Import failed");
		} finally {
			setWorking(false);
			if (fileInput.current) fileInput.current.value = "";
		}
	}

	async function deleteDocument(document: DocumentSummary) {
		if (!window.confirm(`Delete “${document.title}” and its associated sharing, comments and history? This cannot be undone.`)) return;
		try {
			const response = await fetch(`/api/v1/documents/${document.id}`, { method: "DELETE" });
			const result = await response.json();
			if (!response.ok) throw new Error(result.error ?? "Could not delete document");
			setData((current) => ({ ...current, owned: current.owned.filter((item) => item.id !== document.id) }));
			setNotice("Document deleted.");
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : "Could not delete document");
		}
	}

	async function signOut() {
		await fetch("/api/v1/auth/logout", { method: "POST" });
		router.replace("/login");
		router.refresh();
	}

	const owned = useMemo(() => data.owned.filter((item) => item.title.toLowerCase().includes(query.toLowerCase())), [data.owned, query]);
	const shared = useMemo(
		() => data.shared.filter((item) => item.title.toLowerCase().includes(query.toLowerCase())),
		[data.shared, query],
	);

	if (loading)
		return (
			<main className="grid min-h-screen place-items-center">
				<LoaderCircle className="animate-spin text-muted" />
			</main>
		);
	return (
		<main className="min-h-screen bg-canvas">
			<header className="no-print sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur">
				<div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
					<div className="flex items-center gap-3">
						<span className="grid h-9 w-9 place-items-center rounded-xl bg-ink text-white">
							<FileText size={18} />
						</span>
						<span className="text-lg font-semibold tracking-tight">Docudeck</span>
					</div>
					<div className="flex items-center gap-3">
						<div className="hidden text-right sm:block">
							<p className="text-sm font-medium text-ink">{user?.name}</p>
							<p className="text-[11px] text-muted">Demo workspace</p>
						</div>
						<span className="grid h-9 w-9 place-items-center rounded-full bg-surface-muted text-xs font-semibold text-ink">
							{user?.name
								.split(" ")
								.map((part) => part[0])
								.join("")
								.slice(0, 2)}
						</span>
						<button
							type="button"
							onClick={signOut}
							className="rounded-lg p-2 text-muted transition hover:bg-surface-muted hover:text-ink"
							aria-label="Sign out"
						>
							<LogOut size={17} />
						</button>
					</div>
				</div>
			</header>

			<div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
				<div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Your workspace</p>
						<h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Documents, in one place.</h1>
						<p className="mt-3 max-w-xl text-sm leading-6 text-muted">
							Create something new or pick up where your team left off.
						</p>
					</div>
					<div className="flex flex-wrap gap-2">
						<input
							ref={fileInput}
							type="file"
							accept=".txt,text/plain"
							className="hidden"
							onChange={(event) => importFile(event.target.files?.[0])}
						/>
						<button
							type="button"
							disabled={working}
							onClick={() => fileInput.current?.click()}
							className="flex h-11 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-medium text-ink transition hover:bg-surface-muted disabled:opacity-50"
						>
							<FileUp size={16} /> Import .txt
						</button>
						<button
							type="button"
							disabled={working}
							onClick={createDocument}
							className="flex h-11 items-center gap-2 rounded-xl bg-action px-4 text-sm font-semibold text-action-ink transition hover:bg-action-hover disabled:opacity-50"
						>
							<Plus size={17} /> New document
						</button>
					</div>
				</div>

				{(error || notice) && (
					<div
						role="status"
						className={`mt-6 rounded-xl px-4 py-3 text-sm ${error ? "bg-danger-surface text-danger" : "bg-success-surface text-success"}`}
					>
						{error || notice}
					</div>
				)}
				{working && (
					<p className="mt-4 flex items-center gap-2 text-xs text-muted">
						<LoaderCircle size={13} className="animate-spin" /> Working…
					</p>
				)}

				<div className="mt-9 flex flex-col gap-3 border-b border-line pb-6 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex items-center gap-2 text-sm text-muted">
						<FileText size={15} />
						<span>{data.owned.length + data.shared.length} documents</span>
						<span className="text-subtle">·</span>
						<span>{data.owned.length} owned</span>
						<span className="text-subtle">·</span>
						<span>{data.shared.length} shared</span>
					</div>
					<label className="flex h-10 w-full items-center gap-2 rounded-xl border border-line bg-surface px-3 sm:w-64">
						<Search size={15} className="text-muted" />
						<input
							aria-label="Search documents"
							placeholder="Search documents"
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							className="w-full bg-transparent text-sm outline-none placeholder:text-subtle"
						/>
					</label>
				</div>

				<section className="mt-8">
					<div className="mb-4 flex items-center justify-between">
						<div>
							<h2 className="text-base font-semibold text-ink">Owned by you</h2>
							<p className="mt-1 text-xs text-muted">Documents you created and control.</p>
						</div>
						<span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium text-muted">{owned.length}</span>
					</div>
					{owned.length ? (
						<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
							{owned.map((document) => (
								<DocumentTile
									key={document.id}
									document={document}
									onOpen={() => router.push(`/documents/${document.id}`)}
									canDelete
									onDelete={() => deleteDocument(document)}
								/>
							))}
						</div>
					) : (
						<EmptyState
							title={query ? "No matching documents" : "Your workspace is ready"}
							description={
								query ? "Try a different search term." : "Create your first document or import a text file to get started."
							}
							onCreate={createDocument}
						/>
					)}
				</section>

				<section className="mt-12">
					<div className="mb-4 flex items-center justify-between">
						<div>
							<h2 className="text-base font-semibold text-ink">Shared with you</h2>
							<p className="mt-1 text-xs text-muted">Documents other people have invited you to.</p>
						</div>
						<span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium text-muted">{shared.length}</span>
					</div>
					{shared.length ? (
						<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
							{shared.map((document) => (
								<DocumentTile
									key={document.id}
									document={document}
									onOpen={() => router.push(`/documents/${document.id}`)}
								/>
							))}
						</div>
					) : (
						<div className="rounded-2xl border border-dashed border-line-strong bg-surface/60 px-6 py-8 text-center">
							<Users size={19} className="mx-auto text-subtle" />
							<p className="mt-3 text-sm font-medium text-ink">Nothing shared with you yet</p>
							<p className="mt-1 text-xs text-muted">When someone shares a document, it will appear here.</p>
						</div>
					)}
				</section>

				<footer className="mt-16 border-t border-line pt-5 text-xs text-muted">Docudeck · A calm space for shared work.</footer>
			</div>
		</main>
	);
}

function EmptyState({ title, description, onCreate }: { title: string; description: string; onCreate: () => void }) {
	return (
		<div className="rounded-2xl border border-dashed border-line-strong bg-surface/60 px-6 py-12 text-center">
			<div className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-surface-muted text-ink">
				<FileText size={20} />
			</div>
			<p className="mt-4 text-sm font-semibold text-ink">{title}</p>
			<p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-muted">{description}</p>
			<button
				type="button"
				onClick={onCreate}
				className="mt-5 inline-flex h-9 items-center gap-2 rounded-lg bg-action px-3 text-xs font-semibold text-action-ink hover:bg-action-hover"
			>
				<Plus size={14} /> New document
			</button>
		</div>
	);
}
