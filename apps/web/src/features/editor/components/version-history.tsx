"use client";

import { Clock3, History, LoaderCircle, RotateCcw, X } from "lucide-react";
import { useEffect, useState } from "react";

type Version = { id: string; versionNumber: number; title: string; createdAt: string; content: unknown };

export function VersionHistory({ documentId, onClose, onRestored }: { documentId: string; onClose: () => void; onRestored: () => void }) {
	const [versions, setVersions] = useState<Version[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [working, setWorking] = useState(false);
	useEffect(() => {
		fetch(`/api/v1/documents/${documentId}/versions`, { cache: "no-store" })
			.then(async (response) => {
				const result = await response.json();
				if (!response.ok) throw new Error(result.error ?? "Could not load version history");
				setVersions(result.versions ?? []);
			})
			.catch((caught) => setError(caught.message))
			.finally(() => setLoading(false));
	}, [documentId]);

	async function restore(version: Version) {
		if (!window.confirm(`Restore version ${version.versionNumber}? The current content will be kept in history.`)) return;
		setWorking(true);
		setError("");
		try {
			const response = await fetch(`/api/v1/documents/${documentId}/restore`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ versionId: version.id }),
			});
			const result = await response.json();
			if (!response.ok) throw new Error(result.error ?? "Could not restore version");
			onRestored();
			onClose();
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : "Could not restore version");
		} finally {
			setWorking(false);
		}
	}

	return (
		<div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-ink/35 p-4">
			<section
				role="dialog"
				aria-modal="true"
				aria-labelledby="history-title"
				className="w-full max-w-lg rounded-2xl border border-line bg-surface p-6 shadow-[var(--shadow)]"
			>
				<div className="flex items-start justify-between">
					<div>
						<div className="mb-2 grid h-9 w-9 place-items-center rounded-xl bg-surface-muted">
							<History size={18} />
						</div>
						<h2 id="history-title" className="text-lg font-semibold text-ink">
							Version history
						</h2>
						<p className="mt-1 text-xs text-muted">Previous saved content is kept as a restorable snapshot.</p>
					</div>
					<button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-muted hover:bg-surface-muted">
						<X size={18} />
					</button>
				</div>
				<div className="mt-6 max-h-[55vh] space-y-2 overflow-y-auto">
					{loading ? (
						<LoaderCircle className="mx-auto animate-spin text-muted" size={18} />
					) : versions.length ? (
						versions.map((version) => (
							<div key={version.id} className="flex items-center gap-3 rounded-xl border border-line p-3">
								<span className="grid h-9 w-9 place-items-center rounded-lg bg-surface-muted text-muted">
									<Clock3 size={16} />
								</span>
								<span className="min-w-0 flex-1">
									<span className="block text-xs font-semibold text-ink">Version {version.versionNumber}</span>
									<span className="mt-1 block text-[11px] text-muted">
										{new Date(version.createdAt).toLocaleString()} · {version.title}
									</span>
								</span>
								<button
									type="button"
									onClick={() => restore(version)}
									disabled={working}
									className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-2 text-[10px] font-semibold text-ink hover:bg-surface-muted disabled:opacity-40"
								>
									<RotateCcw size={12} /> Restore
								</button>
							</div>
						))
					) : (
						<p className="py-10 text-center text-xs text-muted">
							No saved versions yet. A snapshot is created when content is saved.
						</p>
					)}
				</div>
				{error && (
					<p role="alert" className="mt-3 text-xs text-danger">
						{error}
					</p>
				)}
			</section>
		</div>
	);
}
