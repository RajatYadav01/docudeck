import { afterEach, vi } from "vitest";

// Unit tests for pure utilities use fixed, non-production keys and never connect to PostgreSQL.
process.env.DATABASE_URL ??= "postgres://docudeck:docudeck@localhost:5432/docudeck";
process.env.SESSION_SECRET ??= "unit-test-session-secret-that-is-at-least-32-characters";
process.env.DOCUMENT_ENCRYPTION_KEY ??= "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
process.env.NEXT_PUBLIC_APP_URL ??= "http://localhost:3000";

afterEach(() => vi.restoreAllMocks());
