import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq, asc, sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import type {
  DesignBrief,
  FeasibilityReport,
  LayoutOption,
  VisualVersion,
  ProjectBundle,
  ProjectVersion,
  RevisionIntent,
} from "./schemas";

/**
 * Source of truth for project state. SQLite via Drizzle (locked in eng review).
 *
 * The DB — not the browser, not an LLM — owns the data. Cost metadata (stage 3) must
 * live here, server-side, so it can't be tampered with. JSON columns keep the schema
 * to one table while the typed payloads stay strongly typed via `$type<>()`.
 */
export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  createdAt: text("created_at").notNull(),
  clientProfile: text("client_profile").notNull(),
  budgetIdr: integer("budget_idr").notNull(),
  brief: text("brief", { mode: "json" }).$type<DesignBrief>().notNull(),
  feasibility: text("feasibility", { mode: "json" }).$type<FeasibilityReport>().notNull(),
  layouts: text("layouts", { mode: "json" }).$type<LayoutOption[]>().notNull(),
  visuals: text("visuals", { mode: "json" }).$type<VisualVersion[]>().notNull(),
  // Stage 4: extra image-prompt clauses from the latest visual revision, and the layout
  // the latest revision recommends highlighting. Nullable — added by guarded ALTER below.
  visualClauses: text("visual_clauses", { mode: "json" }).$type<string[]>(),
  recommendedLayout: text("recommended_layout").$type<"A" | "B">(),
});

/**
 * Append-only snapshot log for the Stage 4 comparison history. Version 1 is the original
 * brief; each accepted NL revision appends the next version. Nothing is ever mutated here,
 * so the consultant can always compare any two versions side by side.
 */
export const projectVersions = sqliteTable("project_versions", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  versionNumber: integer("version_number").notNull(),
  createdAt: text("created_at").notNull(),
  requestText: text("request_text"),
  intent: text("intent", { mode: "json" }).$type<RevisionIntent>(),
  changes: text("changes", { mode: "json" }).$type<string[]>().notNull(),
  brief: text("brief", { mode: "json" }).$type<DesignBrief>().notNull(),
  feasibility: text("feasibility", { mode: "json" }).$type<FeasibilityReport>().notNull(),
  layouts: text("layouts", { mode: "json" }).$type<LayoutOption[]>().notNull(),
  visuals: text("visuals", { mode: "json" }).$type<VisualVersion[]>().notNull(),
  recommendedLayout: text("recommended_layout").$type<"A" | "B">(),
});

/**
 * Ledger for paid NL-revision calls (one Claude call each). CostGuard reads count-per-
 * project and count-per-day from here to enforce the revision caps — the same cost-DoS
 * backstop image generation has. Logged only AFTER a successful, applied revision.
 */
export const revisions = sqliteTable("revisions", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  createdAt: text("created_at").notNull(),
  day: text("day").notNull(), // YYYY-MM-DD, for the daily revision cap
  costIdr: integer("cost_idr").notNull(),
});

/**
 * Every paid image generation is logged here BEFORE it can leak money silently.
 * CostGuard reads `count per project` and `sum per day` from this table to enforce
 * the spend caps. This is the server-side ledger — the browser never sees or sets it.
 */
export const imageGenerations = sqliteTable("image_generations", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  visualId: text("visual_id").notNull(),
  createdAt: text("created_at").notNull(),
  day: text("day").notNull(), // YYYY-MM-DD, for the daily spend cap
  costIdr: integer("cost_idr").notNull(),
});

const DATA_DIR = join(process.cwd(), ".data");
const DB_PATH = join(DATA_DIR, "gil.sqlite");

type Schema = {
  projects: typeof projects;
  imageGenerations: typeof imageGenerations;
  projectVersions: typeof projectVersions;
  revisions: typeof revisions;
};
type DB = ReturnType<typeof drizzle<Schema>>;

/** Idempotently add a column to an existing table (SQLite has no ADD COLUMN IF NOT EXISTS). */
function addColumnIfMissing(sqlite: Database.Database, table: string, column: string, ddl: string) {
  const cols = sqlite.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!cols.some((c) => c.name === column)) {
    sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  }
}

function init(): DB {
  mkdirSync(DATA_DIR, { recursive: true });
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  // Bootstrap schema. A runtime CREATE IF NOT EXISTS is simpler than a migration toolchain
  // for the MVP. (Drizzle migrations are a post-MVP nicety.)
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      client_profile TEXT NOT NULL,
      budget_idr INTEGER NOT NULL,
      brief TEXT NOT NULL,
      feasibility TEXT NOT NULL,
      layouts TEXT NOT NULL,
      visuals TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS image_generations (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      visual_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      day TEXT NOT NULL,
      cost_idr INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_imggen_project ON image_generations(project_id);
    CREATE INDEX IF NOT EXISTS idx_imggen_day ON image_generations(day);
    CREATE TABLE IF NOT EXISTS project_versions (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      version_number INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      request_text TEXT,
      intent TEXT,
      changes TEXT NOT NULL,
      brief TEXT NOT NULL,
      feasibility TEXT NOT NULL,
      layouts TEXT NOT NULL,
      visuals TEXT NOT NULL,
      recommended_layout TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_versions_project ON project_versions(project_id);
    CREATE TABLE IF NOT EXISTS revisions (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      day TEXT NOT NULL,
      cost_idr INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_revisions_project ON revisions(project_id);
    CREATE INDEX IF NOT EXISTS idx_revisions_day ON revisions(day);
  `);
  // Stage 4 columns on the pre-existing projects table (for DBs created before Stage 4).
  addColumnIfMissing(sqlite, "projects", "visual_clauses", "visual_clauses TEXT");
  addColumnIfMissing(sqlite, "projects", "recommended_layout", "recommended_layout TEXT");
  return drizzle(sqlite, { schema: { projects, imageGenerations, projectVersions, revisions } });
}

// Singleton across dev hot-reloads so we don't reopen the file handle on every change.
const g = globalThis as unknown as { __gilDb?: DB };
const db: DB = g.__gilDb ?? init();
if (process.env.NODE_ENV !== "production") g.__gilDb = db;

export function saveProject(bundle: ProjectBundle): void {
  db.insert(projects)
    .values({
      id: bundle.id,
      createdAt: bundle.createdAt,
      clientProfile: bundle.brief.clientProfile,
      budgetIdr: bundle.brief.budgetIdr,
      brief: bundle.brief,
      feasibility: bundle.feasibility,
      layouts: bundle.layouts,
      visuals: bundle.visuals,
    })
    .run();
}

export function getProject(id: string): ProjectBundle | null {
  const row = db.select().from(projects).where(eq(projects.id, id)).get();
  if (!row) return null;
  return {
    id: row.id,
    createdAt: row.createdAt,
    brief: row.brief,
    feasibility: row.feasibility,
    layouts: row.layouts,
    visuals: row.visuals,
  };
}

/** Replace a project's visuals array (used after generate / accept / reject). */
export function updateProjectVisuals(id: string, visuals: VisualVersion[]): void {
  db.update(projects).set({ visuals }).where(eq(projects.id, id)).run();
}

/** Record one paid generation in the ledger. Call only AFTER a successful image. */
export function logImageGeneration(rec: {
  id: string;
  projectId: string;
  visualId: string;
  createdAt: string;
  day: string;
  costIdr: number;
}): void {
  db.insert(imageGenerations).values(rec).run();
}

/** How many images this project has generated (per-project cap). */
export function countProjectGenerations(projectId: string): number {
  const row = db
    .select({ c: sql<number>`count(*)` })
    .from(imageGenerations)
    .where(eq(imageGenerations.projectId, projectId))
    .get();
  return row?.c ?? 0;
}

/** Total estimated spend on a given YYYY-MM-DD (daily cap). */
export function sumDailySpendIdr(day: string): number {
  const row = db
    .select({ s: sql<number>`coalesce(sum(cost_idr), 0)` })
    .from(imageGenerations)
    .where(eq(imageGenerations.day, day))
    .get();
  return row?.s ?? 0;
}

// ---------------------------------------------------------------------------
// Stage 4 — revisions, versions, and the per-project visual/layout overrides.
// ---------------------------------------------------------------------------

/** Extra image-prompt clauses set by the latest visual revision (empty if none). */
export function getProjectVisualClauses(id: string): string[] {
  const row = db
    .select({ c: projects.visualClauses })
    .from(projects)
    .where(eq(projects.id, id))
    .get();
  return row?.c ?? [];
}

/** Which layout the latest revision recommends highlighting, if any. */
export function getRecommendedLayout(id: string): "A" | "B" | null {
  const row = db
    .select({ r: projects.recommendedLayout })
    .from(projects)
    .where(eq(projects.id, id))
    .get();
  return row?.r ?? null;
}

/** Apply an accepted revision to the live project row (current state). */
export function updateProjectState(
  id: string,
  state: {
    brief: DesignBrief;
    feasibility: FeasibilityReport;
    layouts: LayoutOption[];
    visuals: VisualVersion[];
    visualClauses: string[];
    recommendedLayout: "A" | "B" | null;
  },
): void {
  db.update(projects)
    .set({
      brief: state.brief,
      budgetIdr: state.brief.budgetIdr, // keep the denormalized budget in sync
      feasibility: state.feasibility,
      layouts: state.layouts,
      visuals: state.visuals,
      visualClauses: state.visualClauses,
      recommendedLayout: state.recommendedLayout,
    })
    .where(eq(projects.id, id))
    .run();
}

/** Append one immutable snapshot to the comparison history. */
export function snapshotVersion(v: ProjectVersion): void {
  db.insert(projectVersions)
    .values({
      id: v.id,
      projectId: v.projectId,
      versionNumber: v.versionNumber,
      createdAt: v.createdAt,
      requestText: v.requestText,
      intent: v.intent,
      changes: v.changes,
      brief: v.brief,
      feasibility: v.feasibility,
      layouts: v.layouts,
      visuals: v.visuals,
      recommendedLayout: v.recommendedLayout,
    })
    .run();
}

/** Next version number for a project (1 if it has no history yet). */
export function nextVersionNumber(projectId: string): number {
  const row = db
    .select({ m: sql<number>`coalesce(max(version_number), 0)` })
    .from(projectVersions)
    .where(eq(projectVersions.projectId, projectId))
    .get();
  return (row?.m ?? 0) + 1;
}

/** Full, ordered comparison history for a project. */
export function listVersions(projectId: string): ProjectVersion[] {
  return db
    .select()
    .from(projectVersions)
    .where(eq(projectVersions.projectId, projectId))
    .orderBy(asc(projectVersions.versionNumber))
    .all() as ProjectVersion[];
}

/** Record one paid revision in the ledger. Call only AFTER a successful, applied revision. */
export function logRevision(rec: {
  id: string;
  projectId: string;
  createdAt: string;
  day: string;
  costIdr: number;
}): void {
  db.insert(revisions).values(rec).run();
}

/** How many revisions this project has run (per-project cap). */
export function countProjectRevisions(projectId: string): number {
  const row = db
    .select({ c: sql<number>`count(*)` })
    .from(revisions)
    .where(eq(revisions.projectId, projectId))
    .get();
  return row?.c ?? 0;
}

/** How many revisions ran on a given YYYY-MM-DD across ALL projects (daily cap). */
export function countDailyRevisions(day: string): number {
  const row = db
    .select({ c: sql<number>`count(*)` })
    .from(revisions)
    .where(eq(revisions.day, day))
    .get();
  return row?.c ?? 0;
}
