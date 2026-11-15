import { getWebEnv } from "@docudeck/config";
import { SESSION_COOKIE_NAME, SESSION_DURATION_SECONDS } from "@docudeck/constants";
import { getDb, users } from "@docudeck/database";
import type { SafeUser } from "@docudeck/types";
import { eq } from "drizzle-orm";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";

function sessionKey() {
	return new TextEncoder().encode(getWebEnv().SESSION_SECRET);
}

export async function createSessionToken(user: SafeUser) {
	return new SignJWT({ email: user.email, name: user.name })
		.setProtectedHeader({ alg: "HS256" })
		.setSubject(user.id)
		.setIssuedAt()
		.setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
		.sign(sessionKey());
}

export async function getAuthenticatedUser(): Promise<SafeUser | null> {
	const cookieStore = await cookies();
	const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
	if (!token) return null;
	try {
		const { payload } = await jwtVerify(token, sessionKey(), { algorithms: ["HS256"] });
		if (!payload.sub) return null;
		const [user] = await getDb()
			.select({ id: users.id, name: users.name, email: users.email })
			.from(users)
			.where(eq(users.id, payload.sub))
			.limit(1);
		return user ?? null;
	} catch {
		return null;
	}
}

export function sessionCookieOptions() {
	const env = getWebEnv();
	return {
		httpOnly: true,
		secure: env.NODE_ENV === "production",
		sameSite: "lax" as const,
		path: "/",
		maxAge: SESSION_DURATION_SECONDS,
	};
}
