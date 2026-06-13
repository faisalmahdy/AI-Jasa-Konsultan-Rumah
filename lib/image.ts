import OpenAI from "openai";

/**
 * ImageGenerator — wraps OpenAI's images endpoint (the right tool for image generation;
 * the Agents SDK would add nothing here). Server-side ONLY: the API key never leaves
 * the server.
 *
 * Model defaults to `gpt-image-2` (released 2026-04-21; also addressable as
 * gpt-image-2-2026-04-21). Override with GIL_IMAGE_MODEL (e.g. gpt-image-1.5,
 * gpt-image-1, gpt-image-1-mini) if you want a cheaper/older model.
 *
 * The `client` is injectable so tests exercise every path without a network call or key.
 * Errors NEVER throw out of here — they return a typed result so the PDF can still ship.
 */

interface ImageClient {
  images: {
    generate(
      body: Record<string, unknown>,
    ): Promise<{ data?: ({ b64_json?: string } | null)[] | null }>;
  };
}

export type ImageGenResult =
  | { ok: true; b64: string }
  | {
      ok: false;
      code: "no_key" | "timeout" | "content_policy" | "api_error" | "empty";
      error: string;
    };

export interface ImageGenDeps {
  client?: ImageClient;
  model?: string;
  size?: string;
  quality?: string;
  timeoutMs?: number;
}

export async function generateImage(
  input: { prompt: string },
  deps: ImageGenDeps = {},
): Promise<ImageGenResult> {
  // `||` not `??`: treat an empty env value (GIL_IMAGE_MODEL=) as unset, not "".
  const model = deps.model || process.env.GIL_IMAGE_MODEL || "gpt-image-2";
  const size = deps.size || process.env.GIL_IMAGE_SIZE || "1536x1024";
  const quality = deps.quality || process.env.GIL_IMAGE_QUALITY || "low";
  const timeoutMs = deps.timeoutMs ?? 90_000;

  let client = deps.client;
  if (!client) {
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      return { ok: false, code: "no_key", error: "OPENAI_API_KEY belum diset di server." };
    }
    client = new OpenAI({ apiKey: key, timeout: timeoutMs }) as unknown as ImageClient;
  }

  try {
    const res = await client.images.generate({ model, prompt: input.prompt, size, quality, n: 1 });
    const b64 = res.data?.[0]?.b64_json;
    if (!b64) return { ok: false, code: "empty", error: "Model tidak mengembalikan gambar." };
    return { ok: true, b64 };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const lc = msg.toLowerCase();
    const status = (err as { status?: number } | null)?.status;
    const name = (err as { name?: string } | null)?.name ?? "";
    if (lc.includes("timeout") || lc.includes("timed out") || name.includes("Timeout")) {
      return { ok: false, code: "timeout", error: "Permintaan gambar melebihi waktu tunggu." };
    }
    if (status === 400 && (lc.includes("policy") || lc.includes("safety") || lc.includes("moderation"))) {
      return { ok: false, code: "content_policy", error: "Prompt ditolak oleh kebijakan konten." };
    }
    return { ok: false, code: "api_error", error: msg };
  }
}
