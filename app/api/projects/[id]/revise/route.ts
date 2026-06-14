import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import {
  getProject,
  getProjectVisualClauses,
  getRecommendedLayout,
  nextVersionNumber,
  snapshotVersion,
  updateProjectState,
  logRevision,
  countProjectRevisions,
  countDailyRevisions,
} from "@/lib/db";
import { checkRevisionBudget } from "@/lib/cost-guard";
import { parseRevision } from "@/lib/revision-parser";
import { applyRevision } from "@/lib/revise";
import type { ProjectBundle, ProjectVersion } from "@/lib/schemas";

export const runtime = "nodejs";

const MAX_REQUEST_CHARS = 1000;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Snapshot the original brief as version 1 the first time a project is revised. */
function ensureInitialVersion(bundle: ProjectBundle): number {
  let vnum = nextVersionNumber(bundle.id);
  if (vnum === 1) {
    const v1: ProjectVersion = {
      id: randomUUID(),
      projectId: bundle.id,
      versionNumber: 1,
      createdAt: bundle.createdAt,
      requestText: null,
      intent: null,
      changes: ["Versi awal"],
      brief: bundle.brief,
      feasibility: bundle.feasibility,
      layouts: bundle.layouts,
      visuals: bundle.visuals,
      recommendedLayout: null,
    };
    snapshotVersion(v1);
    vnum = 2;
  }
  return vnum;
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const project = getProject(id);
  if (!project) return NextResponse.json({ error: "Proyek tidak ditemukan" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const requestText = typeof body?.request === "string" ? body.request.trim() : "";
  if (!requestText) {
    return NextResponse.json({ error: "Permintaan revisi kosong." }, { status: 400 });
  }
  if (requestText.length > MAX_REQUEST_CHARS) {
    return NextResponse.json(
      { error: `Permintaan terlalu panjang (maksimal ${MAX_REQUEST_CHARS} karakter).` },
      { status: 400 },
    );
  }

  // Cost-DoS guard — the paid LLM call is gated server-side BEFORE it can spend money.
  const decision = checkRevisionBudget({
    projectRevisions: countProjectRevisions(id),
    revisionsToday: countDailyRevisions(today()),
  });
  if (!decision.allowed) {
    return NextResponse.json({ error: decision.reason, code: "budget" }, { status: 429 });
  }

  const parsed = await parseRevision(project.brief, requestText);
  if (!parsed.ok) {
    // No spend logged on failure. The deterministic plan + PDF keep working.
    const status = parsed.code === "no_key" ? 503 : parsed.code === "timeout" ? 504 : 502;
    return NextResponse.json({ error: parsed.error, code: parsed.code }, { status });
  }

  const now = new Date();
  // The call happened (real spend) — log it whether or not we end up applying changes.
  logRevision({
    id: randomUUID(),
    projectId: id,
    createdAt: now.toISOString(),
    day: now.toISOString().slice(0, 10),
    costIdr: decision.estimatedCostIdr,
  });

  const intent = parsed.intent;

  // Too ambiguous to act on safely — surface the question, change nothing.
  if (intent.needsClarification) {
    return NextResponse.json({
      ok: true,
      applied: false,
      understanding: intent.understanding,
      needsClarification: intent.needsClarification,
      unsupported: intent.unsupported,
    });
  }

  const result = applyRevision(project, intent);

  // Visual tweaks and the layout preference PERSIST across revisions: a revision that
  // explicitly mentions them replaces the stored value; one that doesn't keeps the prior
  // value, so an earlier "lebih cerah" or "kamar di belakang" isn't silently undone by a
  // later, unrelated revision.
  const visualClauses = intent.visual.tweak ? result.visualClauses : getProjectVisualClauses(id);
  const recommendedLayout =
    intent.layoutPreference !== "tidak_ada" ? result.recommendedLayout : getRecommendedLayout(id);

  // Persist current state, then append the immutable version snapshot.
  updateProjectState(id, {
    brief: result.bundle.brief,
    feasibility: result.bundle.feasibility,
    layouts: result.bundle.layouts,
    visuals: result.bundle.visuals,
    visualClauses,
    recommendedLayout,
  });

  const versionNumber = ensureInitialVersion(project);
  const version: ProjectVersion = {
    id: randomUUID(),
    projectId: id,
    versionNumber,
    createdAt: now.toISOString(),
    requestText,
    intent,
    changes: result.changes,
    brief: result.bundle.brief,
    feasibility: result.bundle.feasibility,
    layouts: result.bundle.layouts,
    visuals: result.bundle.visuals,
    recommendedLayout,
  };
  snapshotVersion(version);

  return NextResponse.json({
    ok: true,
    applied: true,
    versionNumber,
    understanding: intent.understanding,
    changes: result.changes,
    unsupported: intent.unsupported,
    recommendedLayout,
    visualChanged: result.visualClauses.length > 0,
  });
}
