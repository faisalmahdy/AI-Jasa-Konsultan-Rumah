import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { parseRevision } from "../lib/revision-parser";
import { goldenBrief } from "./fixtures";

type Content = Array<{ type: string; name?: string; input?: unknown }>;
function fakeClient(impl: () => Promise<{ content: Content }>) {
  return { messages: { create: impl } };
}

function validInput(over: Record<string, unknown> = {}) {
  return {
    understanding: "Tambah 1 kamar tidur",
    briefPatch: {
      floors: null,
      style: null,
      bedrooms: 4,
      bathrooms: null,
      budgetIdr: null,
      landWidthM: null,
      landDepthM: null,
      addRooms: [],
      removeRooms: [],
      priorities: null,
    },
    layoutPreference: "tidak_ada",
    visual: { tweak: false, clauses: [] },
    unsupported: [],
    needsClarification: null,
    ...over,
  };
}

describe("parseRevision (RevisionParser)", () => {
  let prevKey: string | undefined;
  beforeEach(() => {
    prevKey = process.env.ANTHROPIC_API_KEY;
  });
  afterEach(() => {
    if (prevKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = prevKey;
  });

  it("returns no_key when there is no client and no API key (graceful, no throw)", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const r = await parseRevision(goldenBrief, "tambah kamar");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("no_key");
  });

  it("parses a forced tool_use block into a validated intent", async () => {
    const r = await parseRevision(goldenBrief, "tambah 1 kamar", {
      client: fakeClient(async () => ({
        content: [{ type: "tool_use", name: "ajukan_revisi", input: validInput() }],
      })),
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.intent.briefPatch.bedrooms).toBe(4);
  });

  it("returns empty when the model returns no tool_use block", async () => {
    const r = await parseRevision(goldenBrief, "x", {
      client: fakeClient(async () => ({ content: [{ type: "text" }] })),
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("empty");
  });

  it("returns invalid when the tool input fails schema validation", async () => {
    const r = await parseRevision(goldenBrief, "x", {
      client: fakeClient(async () => ({
        content: [{ type: "tool_use", name: "ajukan_revisi", input: { understanding: 123 } }],
      })),
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("invalid");
  });

  it("classifies a thrown timeout", async () => {
    const r = await parseRevision(goldenBrief, "x", {
      client: fakeClient(async () => {
        throw new Error("Request timed out");
      }),
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("timeout");
  });

  it("falls back to api_error for unknown failures", async () => {
    const r = await parseRevision(goldenBrief, "x", {
      client: fakeClient(async () => {
        throw new Error("boom");
      }),
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("api_error");
  });

  it("passes through a clarification request as a valid intent", async () => {
    const r = await parseRevision(goldenBrief, "buat lebih bagus", {
      client: fakeClient(async () => ({
        content: [
          {
            type: "tool_use",
            name: "ajukan_revisi",
            input: validInput({ needsClarification: "Bagian mana yang ingin diperbaiki?" }),
          },
        ],
      })),
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.intent.needsClarification).toMatch(/Bagian mana/);
  });
});
