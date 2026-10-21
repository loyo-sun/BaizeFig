import { useEffect, useState } from "react";
export type UiTheme = "light" | "dark" | "system";
const key = "baizefig.ui.theme";
export function readUiTheme(): UiTheme {
  try {
    const value = localStorage.getItem(key);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}
export function useUiTheme() {
  const [theme, setTheme] = useState<UiTheme>(readUiTheme);
  const [systemDark, setSystemDark] = useState(
    () => matchMedia("(prefers-color-scheme: dark)").matches,
  );
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const update = () => setSystemDark(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const resolved = theme === "system" ? (systemDark ? "dark" : "light") : theme;
  useEffect(() => {
    document.documentElement.dataset.uiTheme = resolved;
    document.documentElement.style.colorScheme = resolved;
  }, [resolved]);
  function update(value: UiTheme) {
    setTheme(value);
    try {
      localStorage.setItem(key, value);
    } catch {
      /* A session preference still works when storage is unavailable. */
    }
  }
  return { theme, setTheme: update, resolved };
}
