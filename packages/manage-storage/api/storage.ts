import { handleStorageRequest } from "../demo/server/storage-api";

/**
 * Vercel function behind the live demo: `POST /api/storage` runs one
 * StorageManager operation with the settings the demo's panel sends.
 */
export async function POST(request: Request): Promise<Response> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Body must be JSON" }, { status: 400 });
  }

  const { status, body } = await handleStorageRequest(payload as any);
  return Response.json(body, { status });
}
