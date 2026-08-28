import { createHmac, timingSafeEqual } from "node:crypto";
import { revalidateTag, revalidatePath } from "next/cache";
import { isKnownTag } from "@/lib/sistur/tags";

/**
 * Webhook receiver for Sistur's revalidation outbox worker.
 *
 * Contract (see app/workers/revalidation_worker.py):
 *   POST { "batch_id": uuid, "tags": string[], "paths": string[] }
 *   Header X-Sistur-Signature: hex HMAC-SHA256 of the RAW body.
 *
 * The signature is computed over the exact bytes received, so the body must be
 * read as text and never re-serialised before verification — JSON.stringify
 * would reorder keys and break the HMAC.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // node:crypto + revalidateTag need Node.

/**
 * Idempotency. The worker retries on any non-2xx, and a response lost in
 * transit means the same batch arrives twice; `batch_id` is deterministic for
 * a given set of events, so replays collapse here.
 *
 * In-memory is intentionally scoped to one instance: replaying a revalidation
 * is harmless (it only re-fetches), so a shared store would be cost without
 * benefit. It exists to damp storms, not to guarantee exactly-once.
 */
const seen = new Map<string, number>();
const SEEN_TTL_MS = 10 * 60 * 1000;

function alreadyHandled(batchId: string): boolean {
  const now = Date.now();
  for (const [id, at] of seen) if (now - at > SEEN_TTL_MS) seen.delete(id);
  if (seen.has(batchId)) return true;
  seen.set(batchId, now);
  return false;
}

function signatureMatches(raw: string, provided: string): boolean {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) return false;

  const expected = createHmac("sha256", secret).update(raw).digest("hex");
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  // timingSafeEqual throws on length mismatch — check first, and still compare
  // constant-time when lengths agree.
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const raw = await req.text();
  const provided = req.headers.get("x-sistur-signature") ?? "";

  if (!signatureMatches(raw, provided)) {
    // Deliberately vague: a valid-vs-invalid distinction would let an attacker
    // probe the secret.
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: { batch_id?: string; tags?: unknown; paths?: unknown };
  try {
    payload = JSON.parse(raw);
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  const { batch_id: batchId } = payload;
  const tags = Array.isArray(payload.tags) ? payload.tags.filter(isString) : [];
  const paths = Array.isArray(payload.paths) ? payload.paths.filter(isString) : [];

  if (!batchId || tags.length === 0) {
    return Response.json({ error: "batch_id and tags required" }, { status: 400 });
  }

  if (alreadyHandled(batchId)) {
    return Response.json({ ok: true, deduped: true });
  }

  // Reject unknown tags rather than passing them through. A tag Sistur emits
  // that this app does not recognise means the two sides have drifted, and a
  // silent 200 would hide that until someone noticed a stale page.
  const unknown = tags.filter((t) => !isKnownTag(t));
  if (unknown.length > 0) {
    return Response.json({ error: "unknown tags", unknown }, { status: 422 });
  }

  for (const tag of tags) revalidateTag(tag);
  // Paths are belt-and-braces for the full route cache; tags alone miss
  // nothing today, but a path revalidate is cheap and covers routes that
  // rendered before a tag was attached.
  for (const path of paths) revalidatePath(path);

  return Response.json({ ok: true, tags, paths });
}

function isString(v: unknown): v is string {
  return typeof v === "string";
}
