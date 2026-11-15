import { SESSION_COOKIE_NAME } from "@docudeck/constants";
import { getDb, users } from "@docudeck/database";
import { loginSchema } from "@docudeck/schemas";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { createSessionToken, sessionCookieOptions } from "@/features/auth/lib/session";
import { HttpError, jsonError, readJson } from "@/lib/http";

export async function POST(request: Request) {
	try {
		const input = loginSchema.parse(await readJson<unknown>(request));
		const [user] = await getDb().select().from(users).where(eq(users.email, input.email.toLowerCase())).limit(1);
		if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
			throw new HttpError(401, "Email or password is incorrect");
		}
		const safeUser = { id: user.id, name: user.name, email: user.email };
		const token = await createSessionToken(safeUser);
		const cookieStore = await cookies();
		cookieStore.set(SESSION_COOKIE_NAME, token, sessionCookieOptions());
		return Response.json({ user: safeUser }, { headers: { "Cache-Control": "no-store" } });
	} catch (error) {
		if (error instanceof Error && error.name === "ZodError")
			return Response.json({ error: "Please enter a valid email and password" }, { status: 400 });
		return jsonError(error);
	}
}
