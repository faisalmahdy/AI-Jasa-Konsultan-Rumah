import Anthropic from "@anthropic-ai/sdk";
import type { DesignBrief } from "./schemas";
import { RevisionIntent } from "./schemas";
import { STYLE_LABEL, PRIORITY_LABEL, formatIdr } from "./format";

/**
 * RevisionParser — the ONLY LLM call in the whole app (Stage 4, Agentic MVP).
 *
 * It converts a free-text Indonesian revision request into a typed, validated
 * `RevisionIntent` via FORCED tool use (`tool_choice` pins the one tool). The model
 * is constrained to emit the schema; we then re-validate with Zod at the trust
 * boundary, so nothing downstream ever trusts raw model output.
 *
 * Server-side ONLY: the Anthropic key never reaches the browser. The `client` is
 * injectable so tests exercise every path without a network call or key, exactly like
 * `lib/image.ts`. Errors NEVER throw out — they return a typed result so the review
 * screen degrades gracefully (the deterministic plan and PDF keep working).
 *
 * Model defaults to `claude-haiku-4-5` (cheap + fast, ideal for constrained extraction,
 * and the right call for a cost-sensitive product). Override with GIL_PARSER_MODEL.
 */

interface ParserClient {
  messages: {
    create(body: Record<string, unknown>): Promise<{
      content: Array<{ type: string; name?: string; input?: unknown }>;
    }>;
  };
}

export type RevisionParseResult =
  | { ok: true; intent: RevisionIntent }
  | {
      ok: false;
      code: "no_key" | "timeout" | "api_error" | "empty" | "invalid";
      error: string;
    };

export interface ParserDeps {
  client?: ParserClient;
  model?: string;
  timeoutMs?: number;
}

// Enum value lists — kept in lockstep with the Zod enums in schemas.ts. The tool
// schema below uses `strict: true`, so the model can only return these exact values.
const STYLES = ["minimalis", "minimalis_tropis", "industrial", "modern_sederhana"];
const EXTRA_ROOMS = [
  "ruang_tamu",
  "ruang_keluarga",
  "ruang_makan",
  "dapur",
  "garasi",
  "taman",
  "mushola",
  "gudang",
];
const PRIORITIES = ["hemat_biaya", "kamar_luas", "ruang_keluarga", "garasi", "taman", "rumah_tumbuh"];

const nullable = (s: Record<string, unknown>) => ({ anyOf: [s, { type: "null" }] });

/** Strict JSON Schema for the forced tool. Mirrors RevisionIntent in schemas.ts. */
export const REVISION_TOOL = {
  name: "ajukan_revisi",
  description:
    "Ubah permintaan revisi pengguna (Bahasa Indonesia) menjadi perubahan terstruktur pada brief desain rumah. Hanya isi field yang benar-benar diminta; sisanya null atau kosong.",
  strict: true,
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      understanding: {
        type: "string",
        description: "Ringkasan singkat (1-2 kalimat, Bahasa Indonesia) tentang apa yang diminta.",
      },
      briefPatch: {
        type: "object",
        additionalProperties: false,
        properties: {
          floors: nullable({ type: "integer", description: "Jumlah lantai 1 atau 2." }),
          style: nullable({ type: "string", enum: STYLES }),
          bedrooms: nullable({ type: "integer", description: "Jumlah kamar tidur baru (total)." }),
          bathrooms: nullable({ type: "integer", description: "Jumlah kamar mandi baru (total)." }),
          budgetIdr: nullable({ type: "integer", description: "Budget baru dalam Rupiah." }),
          landWidthM: nullable({ type: "number", description: "Lebar tanah baru (meter)." }),
          landDepthM: nullable({ type: "number", description: "Panjang tanah baru (meter)." }),
          addRooms: { type: "array", items: { type: "string", enum: EXTRA_ROOMS } },
          removeRooms: { type: "array", items: { type: "string", enum: EXTRA_ROOMS } },
          priorities: nullable({ type: "array", items: { type: "string", enum: PRIORITIES } }),
        },
        required: [
          "floors",
          "style",
          "bedrooms",
          "bathrooms",
          "budgetIdr",
          "landWidthM",
          "landDepthM",
          "addRooms",
          "removeRooms",
          "priorities",
        ],
      },
      layoutPreference: {
        type: "string",
        enum: ["privasi", "terbuka", "tidak_ada"],
        description:
          "privasi = kamar lebih privat/di belakang; terbuka = ruang keluarga/tamu lebih lega; tidak_ada = tak disebut.",
      },
      visual: {
        type: "object",
        additionalProperties: false,
        properties: {
          tweak: { type: "boolean", description: "true jika tampilan visual/gambar perlu diubah." },
          clauses: {
            type: "array",
            items: { type: "string" },
            description:
              "Frasa deskriptif singkat (Bahasa Indonesia) untuk gambar, mis. 'warna lebih cerah', 'tambah carport'.",
          },
        },
        required: ["tweak", "clauses"],
      },
      unsupported: {
        type: "array",
        items: { type: "string" },
        description:
          "Permintaan yang tidak bisa dipenuhi di tahap pra-desain konsep, masing-masing dengan alasan singkat.",
      },
      needsClarification: nullable({
        type: "string",
        description: "Diisi HANYA jika permintaan terlalu ambigu untuk dijalankan.",
      }),
    },
    required: [
      "understanding",
      "briefPatch",
      "layoutPreference",
      "visual",
      "unsupported",
      "needsClarification",
    ],
  },
} as const;

const SYSTEM = [
  "Anda asisten yang membantu konsultan pra-desain rumah di Indonesia memahami permintaan revisi klien.",
  "Tugas Anda HANYA mengubah permintaan bebas menjadi pemanggilan tool `ajukan_revisi`. Jangan menjawab dengan teks biasa.",
  "Ini alat KONSEP pra-desain, BUKAN gambar kerja. Yang bisa diubah: jumlah/jenis ruang, gaya, lantai, budget, ukuran tanah, prioritas, preferensi tata letak (privasi vs terbuka), dan tampilan visual.",
  "Denah dibuat otomatis dari template parametrik — Anda TIDAK bisa memindahkan satu ruang ke koordinat tertentu. Permintaan posisi spesifik petakan ke layoutPreference (mis. 'kamar utama di belakang' -> privasi) dan, bila perlu, catat di unsupported.",
  "Jika klien minta hal di luar lingkup (struktur, RAB detail, izin, interior detail), masukkan ke `unsupported` dengan alasan singkat — jangan memaksakannya ke briefPatch.",
  "Untuk field yang tidak disebut, gunakan null (atau array kosong). bedrooms/bathrooms adalah jumlah TOTAL yang baru, bukan delta.",
].join(" ");

function briefContext(brief: DesignBrief): string {
  const rooms = brief.extraRooms.length ? brief.extraRooms.join(", ") : "tidak ada ruang tambahan";
  const prio = brief.priorities.length
    ? brief.priorities.map((p) => PRIORITY_LABEL[p]).join(", ")
    : "tidak ada";
  return [
    "Brief saat ini:",
    `- Tanah: ${brief.land.widthM} x ${brief.land.depthM} m`,
    `- Budget: ${formatIdr(brief.budgetIdr)}`,
    `- Lantai: ${brief.floors}`,
    `- Gaya: ${STYLE_LABEL[brief.style]}`,
    `- Kamar tidur: ${brief.bedrooms}, kamar mandi: ${brief.bathrooms}`,
    `- Ruang tambahan: ${rooms}`,
    `- Prioritas: ${prio}`,
  ].join("\n");
}

export async function parseRevision(
  brief: DesignBrief,
  requestText: string,
  deps: ParserDeps = {},
): Promise<RevisionParseResult> {
  // `||` not `??`: treat an empty env value (GIL_PARSER_MODEL=) as unset.
  const model = deps.model || process.env.GIL_PARSER_MODEL || "claude-haiku-4-5";
  const timeoutMs = deps.timeoutMs ?? 30_000;

  let client = deps.client;
  if (!client) {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) {
      return { ok: false, code: "no_key", error: "ANTHROPIC_API_KEY belum diset di server." };
    }
    client = new Anthropic({ apiKey: key, timeout: timeoutMs }) as unknown as ParserClient;
  }

  let res;
  try {
    res = await client.messages.create({
      model,
      max_tokens: 1024,
      tools: [REVISION_TOOL],
      tool_choice: { type: "tool", name: REVISION_TOOL.name },
      system: SYSTEM,
      messages: [
        { role: "user", content: `${briefContext(brief)}\n\nPermintaan revisi klien:\n"${requestText}"` },
      ],
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const lc = msg.toLowerCase();
    if (lc.includes("timeout") || lc.includes("timed out")) {
      return { ok: false, code: "timeout", error: "Permintaan revisi melebihi waktu tunggu." };
    }
    return { ok: false, code: "api_error", error: msg };
  }

  const toolUse = res.content?.find((b) => b.type === "tool_use" && b.name === REVISION_TOOL.name);
  if (!toolUse || toolUse.input === undefined) {
    return { ok: false, code: "empty", error: "Model tidak mengembalikan hasil revisi." };
  }

  // Re-validate at the trust boundary — never trust raw model output.
  const parsed = RevisionIntent.safeParse(toolUse.input);
  if (!parsed.success) {
    return { ok: false, code: "invalid", error: "Hasil revisi tidak sesuai format." };
  }
  return { ok: true, intent: parsed.data };
}
