import { SESSION_COOKIE_NAME } from "@docudeck/constants";
import { cookies } from "next/headers";

export async function POST() {
	const cookieStore = await cookies();
	cookieStore.set(SESSION_COOKIE_NAME, "", {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/",
		maxAge: 0,
	});
	return Response.json({ success: true });
}
