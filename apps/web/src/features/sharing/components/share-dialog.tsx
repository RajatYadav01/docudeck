"use client";

import { ShieldCheck, Trash2, UserPlus, X } from "lucide-react";
import { useState } from "react";

type Collaborator = { userId: string; name: string; email: string; role: "editor" | "commenter" | "viewer" };

export function ShareDialog({
	documentId,
	collaborators,
	onClose,
	onChanged,
}: {
	documentId: string;
	collaborators: Collaborator[];
	onClose: () => void;
	onChanged: () => void;
}) {
	const [email, setEmail] = useState("");
	const [role, setRole] = useState<Collaborator["role"]>("editor");
	const [working, setWorking] = useState(false);
	const [error, setError] = useState("");

	async function share(event: React.FormEvent) {
		event.preventDefault();
		setWorking(true);
		setError("");
		try {
			const response = await fetch(`/api/v1/documents/${documentId}/share`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, role }),
			});
			const result = await response.json();
			if (!response.ok) throw new Error(result.error ?? "Unable to share document");
			setEmail("");
			onChanged();
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : "Unable to share document");
		} finally {
			setWorking(false);
		}
	}

	async function revoke(userId: string) {
		setWorking(true);
		setError("");
		try {
			const response = await fetch(`/api/v1/documents/${documentId}/share/${userId}`, { method: "DELETE" });
			const result = await response.json();
			if (!response.ok) throw new Error(result.error ?? "Unable to remove access");
			onChanged();
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : "Unable to remove access");
		} finally {
			setWorking(false);
		}
	}

	return (
		<div
			className="no-print fixed inset-0 z-50 flex items-center justify-center bg-ink/35 p-4"
			role="presentation"
			onMouseDown={(event) => {
				if (event.target === event.currentTarget) onClose();
			}}
		>
			<section
				role="dialog"
				aria-modal="true"
				aria-labelledby="share-title"
				className="w-full max-w-lg rounded-2xl border border-line bg-surface p-6 shadow-[var(--shadow)]"
			>
				<div className="flex items-start justify-between">
					<div>
						<div className="mb-2 grid h-9 w-9 place-items-center rounded-xl bg-surface-muted text-ink">
							<ShieldCheck size={18} />
						</div>
						<h2 id="share-title" className="text-lg font-semibold text-ink">
							Share document
						</h2>
						<p className="mt-1 text-xs text-muted">Invite a demo user and choose what they can do.</p>
					</div>
					<button type="button" onClick={onClose} className="rounded-lg p-2 text-muted hover:bg-surface-muted" aria-label="Close">
						<X size={18} />
					</button>
				</div>
				<form onSubmit={share} className="mt-6 space-y-3">
					<label className="block text-xs font-medium text-ink">
						Email address
						<input
							type="email"
							required
							value={email}
							onChange={(event) => setEmail(event.target.value)}
							placeholder="name@example.com"
							className="mt-1.5 h-10 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none focus:border-ink"
						/>
					</label>
					<div className="flex gap-2">
						<label className="min-w-0 flex-1 text-xs font-medium text-ink">
							Permission
							<select
								value={role}
								onChange={(event) => setRole(event.target.value as Collaborator["role"])}
								className="mt-1.5 h-10 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none focus:border-ink"
							>
								<option value="editor">Editor · can edit</option>
								<option value="commenter">Commenter · can comment</option>
								<option value="viewer">Viewer · read only</option>
							</select>
						</label>
						<button
							disabled={working}
							className="mt-[19px] flex h-10 items-center gap-2 rounded-lg bg-action px-4 text-xs font-semibold text-white hover:bg-action-hover disabled:opacity-50"
						>
							<UserPlus size={14} /> Share
						</button>
					</div>
				</form>
				{error && (
					<p role="alert" className="mt-3 rounded-lg bg-danger-surface px-3 py-2 text-xs text-danger">
						{error}
					</p>
				)}
				<div className="mt-7 border-t border-line pt-5">
					<div className="mb-3 flex items-center justify-between">
						<h3 className="text-xs font-semibold text-ink">People with access</h3>
						<span className="text-[11px] text-muted">{collaborators.length} collaborator(s)</span>
					</div>
					<div className="max-h-64 space-y-2 overflow-y-auto">
						{collaborators.length ? (
							collaborators.map((person) => (
								<div key={person.userId} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-surface-muted">
									<span className="grid h-8 w-8 place-items-center rounded-full bg-surface-muted text-[10px] font-semibold text-ink">
										{person.name
											.split(" ")
											.map((part) => part[0])
											.join("")
											.slice(0, 2)}
									</span>
									<span className="min-w-0 flex-1">
										<span className="block truncate text-xs font-medium text-ink">{person.name}</span>
										<span className="block truncate text-[11px] text-muted">{person.email}</span>
									</span>
									<span className="text-[10px] capitalize text-muted">{person.role}</span>
									<button
										type="button"
										onClick={() => revoke(person.userId)}
										disabled={working}
										aria-label={`Remove ${person.name}`}
										className="rounded-lg p-2 text-muted hover:bg-danger-surface hover:text-danger disabled:opacity-40"
									>
										<Trash2 size={14} />
									</button>
								</div>
							))
						) : (
							<p className="py-4 text-center text-xs text-muted">No collaborators yet.</p>
						)}
					</div>
				</div>
			</section>
		</div>
	);
}
