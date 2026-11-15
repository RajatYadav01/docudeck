export class HttpError extends Error {
	constructor(
		public readonly status: number,
		message: string,
	) {
		super(message);
		this.name = "HttpError";
	}
}

export function jsonError(error: unknown) {
	if (error && typeof error === "object" && "issues" in error) {
		return Response.json({ error: "Request validation failed", details: (error as { issues: unknown[] }).issues }, { status: 400 });
	}
	if (error instanceof HttpError) {
		return Response.json({ error: error.message }, { status: error.status });
	}
	console.error("Unhandled API error:", error);
	return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}

export async function readJson<T>(request: Request): Promise<T> {
	try {
		return (await request.json()) as T;
	} catch {
		throw new HttpError(400, "Request body must be valid JSON");
	}
}
