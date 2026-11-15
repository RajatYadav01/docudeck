"use client";

import { ArrowRight, CircleUserRound, FileText, LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const demoUsers = [
	{ name: "Alice Morgan", email: "alice@example.com", description: "Document owner" },
	{ name: "Bob Chen", email: "bob@example.com", description: "Shared editor" },
	{ name: "Charlie Rivera", email: "charlie@example.com", description: "Additional user" },
] as const;

export function LoginForm() {
	const router = useRouter();
	const [email, setEmail] = useState<string>(demoUsers[0]?.email ?? "alice@example.com");
	const [password, setPassword] = useState("Docudeck!2026");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	async function submit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setLoading(true);
		setError("");
		try {
			const response = await fetch("/api/v1/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, password }),
			});
			const result = await response.json();
			if (!response.ok) throw new Error(result.error ?? "Unable to sign in");
			router.replace("/documents");
			router.refresh();
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : "Unable to sign in");
		} finally {
			setLoading(false);
		}
	}

	return (
		<main className="flex min-h-screen items-center justify-center bg-canvas px-5 py-12">
			<div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-line bg-surface shadow-[var(--shadow)] md:grid-cols-[1.05fr_0.95fr]">
				<section className="flex flex-col justify-between bg-ink p-9 text-white md:p-12">
					<div className="flex items-center gap-3">
						<div className="grid h-10 w-10 place-items-center rounded-xl bg-white text-ink">
							<FileText size={21} />
						</div>
						<span className="text-xl font-semibold tracking-tight">Docudeck</span>
					</div>
					<div className="my-16 max-w-md">
						<p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-white/55">Your shared workspace</p>
						<h1 className="text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
							Good work starts with a clear page.
						</h1>
						<p className="mt-6 max-w-sm text-base leading-7 text-white/65">
							Create thoughtful documents, keep them organized, and bring the right people into the work.
						</p>
					</div>
					<div className="flex items-center gap-2 text-xs text-white/50">
						<LockKeyhole size={14} /> Private demo workspace · Secure sessions
					</div>
				</section>

				<section className="p-8 md:p-12">
					<div className="mb-8">
						<p className="text-sm font-medium text-muted">Welcome back</p>
						<h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">Sign in to Docudeck</h2>
						<p className="mt-2 text-sm leading-6 text-muted">
							Choose a seeded account to explore the document and sharing workflows.
						</p>
					</div>
					<div className="mb-6 space-y-2">
						<p className="text-xs font-semibold uppercase tracking-wider text-muted">Demo accounts</p>
						{demoUsers.map((user) => (
							<button
								key={user.email}
								type="button"
								onClick={() => setEmail(user.email)}
								className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${email === user.email ? "border-ink bg-surface-muted" : "border-line hover:bg-surface-muted"}`}
							>
								<span className="grid h-9 w-9 place-items-center rounded-full bg-surface-muted text-ink">
									<CircleUserRound size={18} />
								</span>
								<span className="min-w-0 flex-1">
									<span className="block text-sm font-medium text-ink">{user.name}</span>
									<span className="block text-xs text-muted">{user.description}</span>
								</span>
								<span
									className={`h-4 w-4 rounded-full border ${email === user.email ? "border-4 border-ink" : "border-line-strong"}`}
								/>
							</button>
						))}
					</div>
					<form onSubmit={submit} className="space-y-4">
						<label className="block text-sm font-medium text-ink">
							Email address
							<input
								type="email"
								autoComplete="username"
								required
								value={email}
								onChange={(event) => setEmail(event.target.value)}
								className="mt-2 h-11 w-full rounded-xl border border-line bg-white px-3 text-sm outline-none transition focus:border-ink"
							/>
						</label>
						<label className="block text-sm font-medium text-ink">
							Demo password
							<input
								type="password"
								autoComplete="current-password"
								required
								value={password}
								onChange={(event) => setPassword(event.target.value)}
								className="mt-2 h-11 w-full rounded-xl border border-line bg-white px-3 text-sm outline-none transition focus:border-ink"
							/>
						</label>
						{error && (
							<p role="alert" className="rounded-lg bg-danger-surface px-3 py-2 text-sm text-danger">
								{error}
							</p>
						)}
						<button
							type="submit"
							disabled={loading}
							className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-action text-sm font-semibold text-action-ink transition hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-60"
						>
							{loading ? "Signing in…" : "Continue to workspace"}
							<ArrowRight size={16} />
						</button>
					</form>
					<p className="mt-5 text-center text-xs leading-5 text-muted">
						Demo password for all accounts: <span className="font-semibold text-ink">Docudeck!2026</span>
					</p>
				</section>
			</div>
		</main>
	);
}
