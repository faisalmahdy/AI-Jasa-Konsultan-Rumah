import { getProject } from "@/lib/pipeline";
import { renderBriefPdf } from "@/lib/pdf";

export const runtime = "nodejs";

// Next 16: route `params` is a Promise and must be awaited.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const bundle = getProject(id);
  if (!bundle) return new Response("Proyek tidak ditemukan", { status: 404 });

  const pdf = await renderBriefPdf(bundle);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="brief-pra-desain-${id}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
