"use client";

import { Users } from "lucide-react";
import { useEffect, useState } from "react";

type Person = { id: string; name: string };

export function PresenceIndicator({ documentId, currentUserId }: { documentId: string; currentUserId: string }) {
	const [active, setActive] = useState<Person[]>([]);
	useEffect(() => {
		let alive = true;
		async function heartbeat() {
			await fetch(`/api/v1/documents/${documentId}/presence`, { method: "POST" });
			const response = await fetch(`/api/v1/documents/${documentId}/presence`, { cache: "no-store" });
			if (response.ok) {
				const result = await response.json();
				if (alive) setActive(result.active ?? []);
			}
		}
		heartbeat().catch(() => undefined);
		const interval = window.setInterval(() => heartbeat().catch(() => undefined), 20_000);
		return () => {
			alive = false;
			window.clearInterval(interval);
		};
	}, [documentId]);

	const others = active.filter((person) => person.id !== currentUserId);
	return (
		<div className="flex items-center gap-2" title={`${active.length} active viewer(s)`}>
			{others.length > 0 && (
				<div className="flex -space-x-2">
					{others.slice(0, 3).map((person) => (
						<span
							key={person.id}
							title={person.name}
							className="grid h-7 w-7 place-items-center rounded-full border-2 border-surface bg-surface-muted text-[9px] font-semibold text-ink"
						>
							{person.name
								.split(" ")
								.map((part) => part[0])
								.join("")
								.slice(0, 2)}
						</span>
					))}
				</div>
			)}
			<span className="flex items-center gap-1.5 text-xs text-muted">
				<Users size={14} /> {others.length ? `${others.length} here` : "Only you"}
			</span>
		</div>
	);
}
