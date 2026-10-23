import { test, expect, vi } from "vitest";
import { JSDOM } from "test-dom-jsdom";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { CloudFiles } from "../src/CloudFiles";
import { emptyDocument } from "../src/core";
vi.mock("../src/LanguageContext", () => ({
  useI18n: () => ({
    t: (s: string, v: Record<string, string> = {}) =>
      s.replace(/\{(\w+)\}/g, (_, k) => v[k] || _),
  }),
}));
vi.mock("../src/Canvas", () => ({ svgString: vi.fn(), raster: vi.fn() }));
test("cloud list navigates folders and opens the selected document in the editor", async () => {
  const dom = new JSDOM('<div id="root"></div>', {
    url: "https://editor.test",
  });
  vi.stubGlobal("window", dom.window);
  vi.stubGlobal("document", dom.window.document);
  vi.stubGlobal("localStorage", dom.window.localStorage);
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const doc = emptyDocument();
  const onOpen = vi.fn().mockResolvedValue(undefined);
  const fetcher = vi.fn(async (url: string) => ({
    ok: true,
    json: async () =>
      url.endsWith("/space")
        ? {
            folders: [{ id: "folder", name: "项目", parent_id: null }],
            files: [
              {
                id: doc.id,
                name: "设计",
                folder_id: "folder",
                head_id: "head",
              },
            ],
          }
        : url.endsWith("/thumbnail")
          ? { thumbnail: "data:image/png;base64,aGVsbG8=", headId: "head" }
          : { file: { head_id: "head" }, versions: [], content: doc },
  }));
  vi.stubGlobal("fetch", fetcher);
  const root = createRoot(document.getElementById("root")!);
  const click = async (label: string) => {
    const b = [...document.querySelectorAll("button")].find(
      (b) => b.textContent === label || b.getAttribute("aria-label") === label,
    )!;
    expect(b).toBeTruthy();
    await act(async () => {
      b.click();
    });
  };
  try {
    await act(async () => {
      root.render(
        React.createElement(CloudFiles, {
          session: {
            base: "https://cloud.test",
            token: "secret",
            user: { id: "u", username: "user" },
            expiresAt: Date.now() + 60000,
            mcpUrl: "",
          },
          document: doc,
          onOpen,
        }),
      );
    });
    expect(document.body.textContent).toContain("项目");
    expect(document.body.textContent).not.toContain("设计.baizefig");
    await click("项目");
    expect(document.querySelector(".cloud-file-grid")).toBeTruthy();
    expect(
      document.querySelector('img[alt="设计 thumbnail"]')?.getAttribute("src"),
    ).toBe("data:image/png;base64,aGVsbG8=");
    await click("List view");
    expect(document.querySelector(".cloud-file-list")).toBeTruthy();
    expect(document.querySelector(".cloud-thumbnail")).toBeNull();
    expect(localStorage.getItem("baizefig.cloud.view")).toBe("list");
    await click("Icon view");
    expect(document.body.textContent).toContain("设计.baizefig");
    await click("Open to edit");
    expect(onOpen).toHaveBeenCalledWith(doc);
    expect(fetcher.mock.calls[0][0]).toBe("https://cloud.test/api/v1/space");
  } finally {
    await act(async () => root.unmount());
    vi.unstubAllGlobals();
    dom.window.close();
  }
});
