import { pinyin, customPinyin } from "pinyin-pro";
import { zhCN } from "./i18n";

// The generic dictionary reads 重 as zhong in these editor commands.
customPinyin({ 重做: "chóng zuò", 重命名: "chóng mìng míng" });

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/u\u0308/g, "v")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}]/gu, "");
}
const indexes = new Map<string, string[]>();
function searchIndex(name: string, displayName: string) {
  const labels = [...new Set([name, zhCN[name] || name, displayName])];
  const key = labels.join("\0");
  const cached = indexes.get(key);
  if (cached) return cached;
  const terms = new Set(labels.map(normalize));
  for (const label of labels) {
    if (!/\p{Script=Han}/u.test(label)) continue;
    terms.add(
      normalize(pinyin(label, { toneType: "none", type: "array" }).join("")),
    );
    terms.add(
      normalize(
        pinyin(label, {
          pattern: "first",
          toneType: "none",
          type: "array",
        }).join(""),
      ),
    );
  }
  const result = [...terms];
  indexes.set(key, result);
  return result;
}
export function matchesCommand(
  name: string,
  query: string,
  displayName = name,
) {
  const compact = normalize(query);
  if (!compact) return true;
  const terms = searchIndex(name, displayName);
  if (terms.some((term) => term.includes(compact))) return true;
  const tokens = query.trim().split(/\s+/).map(normalize).filter(Boolean);
  return (
    tokens.length > 1 &&
    tokens.every((token) => terms.some((term) => term.includes(token)))
  );
}
