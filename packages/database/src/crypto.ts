import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { getDatabaseEnv } from "@docudeck/config";

const ENCRYPTION_VERSION = 1;

function getKey(): Buffer {
	return Buffer.from(getDatabaseEnv().DOCUMENT_ENCRYPTION_KEY, "hex");
}

/** Encrypt JSON before it is persisted. AES-256-GCM authenticates ciphertext as well as encrypting it. */
export function encryptDocumentContent(value: unknown): { ciphertext: string; version: number } {
	const iv = randomBytes(12);
	const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
	const plaintext = Buffer.from(JSON.stringify(value), "utf8");
	const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
	const authTag = cipher.getAuthTag();
	return {
		ciphertext: ["v1", iv.toString("base64url"), authTag.toString("base64url"), encrypted.toString("base64url")].join("."),
		version: ENCRYPTION_VERSION,
	};
}

/** Reject malformed or tampered payloads; never return partial plaintext. */
export function decryptDocumentContent<T = unknown>(ciphertext: string, version = ENCRYPTION_VERSION): T {
	if (version !== ENCRYPTION_VERSION) throw new Error(`Unsupported document encryption version: ${version}`);
	const [prefix, ivPart, tagPart, dataPart] = ciphertext.split(".");
	if (prefix !== "v1" || !ivPart || !tagPart || !dataPart) throw new Error("Invalid encrypted document payload");
	const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivPart, "base64url"));
	decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
	const plaintext = Buffer.concat([decipher.update(Buffer.from(dataPart, "base64url")), decipher.final()]);
	return JSON.parse(plaintext.toString("utf8")) as T;
}
