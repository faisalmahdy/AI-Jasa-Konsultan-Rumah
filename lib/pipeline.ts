import { DesignBrief } from "./schemas";
import { buildBundle } from "./bundle";
import { saveProject, getProject } from "./db";

/** Validate raw form input, compute the bundle, save it, return it. */
export function createProject(input: unknown) {
  const brief = DesignBrief.parse(input); // throws ZodError on bad input
  const bundle = buildBundle(brief);
  saveProject(bundle);
  return bundle;
}

export { getProject, buildBundle };
