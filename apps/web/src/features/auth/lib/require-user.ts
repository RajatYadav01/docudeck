import { HttpError } from "@/lib/http";
import { getAuthenticatedUser } from "./session";

export async function requireUser() {
	const user = await getAuthenticatedUser();
	if (!user) throw new HttpError(401, "Please sign in to continue");
	return user;
}
