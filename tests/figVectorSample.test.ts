import { expect, it } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { readFigArchive } from "../src/figImport";
import { networkPaths } from "../src/fidelity";
import { validateNetwork } from "../src/vectorNetwork";

it.skipIf(!process.env.FIG_VECTOR_SAMPLE_PATH)(
  "decodes every vector network in the external sample, including empty and implicitly closed contours",
  () => {
    const archive = readFigArchive(
      readFileSync(process.env.FIG_VECTOR_SAMPLE_PATH!),
    );
    const vectors = archive.message.nodeChanges.filter(
      (n: any) =>
        n.type === "VECTOR" && n.vectorData?.vectorNetworkBlob !== undefined,
    );
    let paths = 0,
      empty = 0;
    const errors: { id: string; error: string }[] = [];
    for (const n of vectors)
      try {
        const result = networkPaths(
          archive.message.blobs[n.vectorData.vectorNetworkBlob].bytes,
          n.size.x,
          n.size.y,
          n.vectorData.normalizedSize ?? n.size,
          validateNetwork,
        );
        paths += result.length;
        if (!result.length) empty++;
      } catch (error) {
        errors.push({
          id: `${n.guid.sessionID}:${n.guid.localID}`,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    if (process.env.FIG_VECTOR_REPORT_PATH)
      writeFileSync(
        process.env.FIG_VECTOR_REPORT_PATH,
        JSON.stringify(
          { vectors: vectors.length, paths, empty, errors },
          null,
          2,
        ),
      );
    expect(vectors.length).toBeGreaterThan(0);
    expect(errors).toEqual([]);
  },
  60000,
);
