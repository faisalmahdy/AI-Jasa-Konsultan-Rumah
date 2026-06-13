import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import {
  getProject,
  updateProjectVisuals,
  logImageGeneration,
  countProjectGenerations,
  sumDailySpendIdr,
} from "@/lib/db";
import { checkBudget } from "@/lib/cost-guard";
import { buildImagePrompt, type ViewType } from "@/lib/prompt";
import { generateImage } from "@/lib/image";
import { saveImagePng } from "@/lib/image-store";
import type { VisualVersion } from "@/lib/schemas";

export const runtime = "nodejs";

const VIEWS: ViewType[] = ["front_elevation", "exterior_3d"];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const project = getProject(id);
  if (!project) return NextResponse.json({ error: "Proyek tidak ditemukan" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const action = body?.action;

  // ---- accept / reject (no cost) ----
  if (action === "accept" || action === "reject") {
    const target = project.visuals.find((v) => v.id === body.visualId);
    if (!target) return NextResponse.json({ error: "Visual tidak ditemukan" }, { status: 404 });
    const visuals = project.visuals.map((v) => {
      if (v.id === target.id) {
        return { ...v, status: action === "accept" ? ("accepted" as const) : ("rejected" as const) };
      }
      // Only one accepted visual per view type: demote a previous winner.
      if (action === "accept" && v.type === target.type && v.status === "accepted") {
        return { ...v, status: "candidate" as const };
      }
      return v;
    });
    updateProjectVisuals(id, visuals);
    return NextResponse.json({ visuals });
  }

  // ---- generate (PAID — cost-guarded before any OpenAI call) ----
  if (action === "generate") {
    const view = body?.viewType as ViewType;
    if (!VIEWS.includes(view)) {
      return NextResponse.json({ error: "viewType tidak valid" }, { status: 400 });
    }

    const decision = checkBudget({
      projectGenerations: countProjectGenerations(id),
      spentTodayIdr: sumDailySpendIdr(today()),
      regenCountForView: project.visuals.filter((v) => v.type === view).length,
    });
    if (!decision.allowed) {
      return NextResponse.json({ error: decision.reason, code: "budget" }, { status: 429 });
    }

    const layout = project.layouts[0];
    const prompt = buildImagePrompt(project.brief, layout, view);
    const result = await generateImage({ prompt });
    if (!result.ok) {
      // No spend logged on failure. PDF/review still work with floor plans only.
      const status = result.code === "no_key" ? 503 : 502;
      return NextResponse.json({ error: result.error, code: result.code }, { status });
    }

    const visualId = randomUUID();
    saveImagePng(visualId, result.b64);
    const now = new Date();
    logImageGeneration({
      id: randomUUID(),
      projectId: id,
      visualId,
      createdAt: now.toISOString(),
      day: now.toISOString().slice(0, 10),
      costIdr: decision.estimatedCostIdr,
    });

    const visual: VisualVersion = {
      id: visualId,
      type: view,
      prompt,
      status: "candidate",
      imageUrl: `/api/images/${visualId}`,
      costIdr: decision.estimatedCostIdr,
    };
    const visuals = [...project.visuals, visual];
    updateProjectVisuals(id, visuals);
    return NextResponse.json({ visual, visuals }, { status: 201 });
  }

  return NextResponse.json({ error: "Aksi tidak dikenal" }, { status: 400 });
}
