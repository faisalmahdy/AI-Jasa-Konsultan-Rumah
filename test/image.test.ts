import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { generateImage } from "../lib/image";

function fakeClient(impl: () => Promise<{ data?: ({ b64_json?: string } | null)[] | null }>) {
  return { images: { generate: impl } };
}

describe("generateImage (ImageGenerator)", () => {
  let prevKey: string | undefined;
  beforeEach(() => {
    prevKey = process.env.OPENAI_API_KEY;
  });
  afterEach(() => {
    if (prevKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = prevKey;
  });

  it("returns no_key when there is no client and no API key (graceful, no throw)", async () => {
    delete process.env.OPENAI_API_KEY;
    const r = await generateImage({ prompt: "x" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("no_key");
  });

  it("returns the base64 image on success (injected client)", async () => {
    const r = await generateImage(
      { prompt: "x" },
      { client: fakeClient(async () => ({ data: [{ b64_json: "QUJD" }] })) },
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.b64).toBe("QUJD");
  });

  it("classifies a thrown timeout", async () => {
    const r = await generateImage(
      { prompt: "x" },
      {
        client: fakeClient(async () => {
          throw new Error("Request timed out");
        }),
      },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("timeout");
  });

  it("classifies a content-policy rejection", async () => {
    const r = await generateImage(
      { prompt: "x" },
      {
        client: fakeClient(async () => {
          const err = Object.assign(new Error("Your request was rejected by safety policy"), {
            status: 400,
          });
          throw err;
        }),
      },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("content_policy");
  });

  it("falls back to api_error for unknown failures", async () => {
    const r = await generateImage(
      { prompt: "x" },
      {
        client: fakeClient(async () => {
          throw new Error("boom");
        }),
      },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("api_error");
  });

  it("returns empty when the model gives no image", async () => {
    const r = await generateImage({ prompt: "x" }, { client: fakeClient(async () => ({ data: [] })) });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("empty");
  });
});
