import { readImagePng, isValidVisualId } from "@/lib/image-store";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ visualId: string }> }) {
  const { visualId } = await ctx.params;
  if (!isValidVisualId(visualId)) return new Response("ID tidak valid", { status: 400 });

  const buf = readImagePng(visualId);
  if (!buf) return new Response("Gambar tidak ditemukan", { status: 404 });

  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
