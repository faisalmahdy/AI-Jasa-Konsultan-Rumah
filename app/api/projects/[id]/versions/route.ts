import { NextResponse } from "next/server";
import { getProject, listVersions } from "@/lib/db";
import type { ProjectVersion } from "@/lib/schemas";

export const runtime = "nodejs";

/**
 * Comparison history for the review screen. Returns every snapshot oldest-first. For a
 * project that hasn't been revised yet we synthesize version 1 from the current state so
 * the timeline always shows at least the original brief.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const project = getProject(id);
  if (!project) return NextResponse.json({ error: "Proyek tidak ditemukan" }, { status: 404 });

  let versions = listVersions(id);
  if (versions.length === 0) {
    const v1: ProjectVersion = {
      id: `${id}-v1`,
      projectId: id,
      versionNumber: 1,
      createdAt: project.createdAt,
      requestText: null,
      intent: null,
      changes: ["Versi awal"],
      brief: project.brief,
      feasibility: project.feasibility,
      layouts: project.layouts,
      visuals: project.visuals,
      recommendedLayout: null,
    };
    versions = [v1];
  }

  return NextResponse.json({ versions });
}
