/**
 * @file route.ts
 * @description API route that generates a full text version of the documentation for LLM consumption.
 */
import { source, getLLMText } from "@/lib/fumadocs/source";

// cached forever
export const revalidate = false;

export async function GET() {
  const scan = source.getPages().map(getLLMText);
  const scanned = await Promise.all(scan);

  return new Response(scanned.join("\n\n"));
}
