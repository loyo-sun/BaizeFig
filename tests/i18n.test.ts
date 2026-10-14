import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import ts from "typescript";
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  readLanguage,
  writeLanguage,
  translate,
  zhCN,
} from "../src/i18n";

describe("interface language preferences", () => {
  it("defaults to Chinese for new users and unsupported preferences", () => {
    expect(DEFAULT_LANGUAGE).toBe("zh-CN");
    expect(readLanguage({ getItem: () => null })).toBe("zh-CN");
    expect(readLanguage({ getItem: () => "de" })).toBe("zh-CN");
    expect(
      readLanguage({
        getItem: () => {
          throw Error("Storage blocked");
        },
      }),
    ).toBe("zh-CN");
  });
  it("restores saved English and supports switching back to Chinese", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
    };
    expect(writeLanguage("en", storage)).toBe(true);
    expect(values.get(LANGUAGE_STORAGE_KEY)).toBe("en");
    expect(readLanguage(storage)).toBe("en");
    expect(writeLanguage("zh-CN", storage)).toBe(true);
    expect(readLanguage(storage)).toBe("zh-CN");
  });
  it("reports a save failure so the editor can show session-only persistence", () => {
    expect(
      writeLanguage("en", {
        setItem: () => {
          throw Error("Quota or storage policy");
        },
      }),
    ).toBe(false);
  });
  it("translates labels, dynamic counts, statuses and engine errors in both languages", () => {
    expect(translate("zh-CN", "General settings")).toBe("通用设置");
    expect(translate("en", "General settings")).toBe("General settings");
    expect(translate("zh-CN", "{count} selected", { count: 3 })).toBe(
      "已选中 3 项",
    );
    expect(translate("en", "{count} selected", { count: 3 })).toBe(
      "3 selected",
    );
    expect(translate("zh-CN", "Saved locally")).toBe("已保存到本地");
    expect(translate("zh-CN", "Model request failed (401)")).toBe(
      "模型请求失败（401）",
    );
    expect(translate("en", "Model request failed (401)")).toBe(
      "Model request failed (401)",
    );
    expect(
      translate(
        "zh-CN",
        "FIG import is not implemented yet. Use .baizefig, JSON, SVG or images.",
      ),
    ).toContain("尚未支持 FIG 导入");
  });
  it("keeps identifiers, protocol values and user-authored strings intact", () => {
    for (const value of [
      "Brand hero",
      "客户项目 Alpha",
      "get_document",
      "PNG",
      "http://localhost:11434/v1",
    ]) {
      expect(translate("zh-CN", value)).toBe(value);
      expect(translate("en", value)).toBe(value);
    }
    expect(
      translate("zh-CN", "Export {name}", { name: "Custom page EN" }),
    ).toBe("导出 Custom page EN");
  });
  it("covers static editor UI strings without translating document content", () => {
    const source = readFileSync(
      new URL("../src/App.tsx", import.meta.url),
      "utf8",
    );
    const ast = ts.createSourceFile(
      "App.tsx",
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const neutral = new Set([
      "MCP",
      "X",
      "Y",
      "%",
      "↻",
      "⌜",
      "BaizeFig",
      "BAIZEFIG / 白泽",
      "白",
      "×",
      "100%",
      "x",
      "/",
      "npm run bridge",
      "Shift 1",
      "Shift 2",
      "⌘ C",
      "⌘ V",
      "⌫",
      "简体中文",
      "English",
    ]);
    const missing = new Set<string>(),
      untranslated = new Set<string>();
    function walk(n: ts.Node) {
      if (
        ts.isCallExpression(n) &&
        n.expression.getText(ast) === "t" &&
        n.arguments[0] &&
        ts.isStringLiteral(n.arguments[0])
      ) {
        const key = n.arguments[0].text;
        if (!zhCN[key] && !neutral.has(key)) missing.add(key);
      }
      if (ts.isJsxText(n) && n.text.trim()) {
        const value = n.text.replace(/\s+/g, " ").trim();
        if (!neutral.has(value)) untranslated.add(value);
      }
      ts.forEachChild(n, walk);
    }
    walk(ast);
    expect([...missing]).toEqual([]);
    expect([...untranslated]).toEqual([]);
    expect(source).not.toContain("t(n.text)");
    expect(source).not.toContain("t(n.name)");
    expect(source).not.toContain("t(doc.name)");
  });
});
