import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq, sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import type {
  DesignBrief,
  FeasibilityReport,
  LayoutOption,
  VisualVersion,
  ProjectBundle,
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

type DB = ReturnType<typeof drizzle<{ projects: typeof projects; imageGenerations: typeof imageGenerations }>>;

function init(): DB {
  mkdirSync(DATA_DIR, { recursive: true });
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  // Bootstrap schema. One table, so a runtime CREATE IF NOT EXISTS is simpler than a
  // migration toolchain for the MVP. (Drizzle migrations are a post-MVP nicety.)
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
  `);
  return drizzle(sqlite, { schema: { projects, imageGenerations } });
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
