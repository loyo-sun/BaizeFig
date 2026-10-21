import "@fontsource-variable/work-sans/wght.css";
import "@fontsource-variable/inter/wght.css";
import "@fontsource-variable/inter/wght-italic.css";
import { ensureBundledFonts } from "./bundledFonts";
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { LanguageProvider } from "./LanguageProvider";
import "./style.css";
import "./inspector.css";
void ensureBundledFonts().finally(() =>
  createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </React.StrictMode>,
  ),
);

import "./experience.css";

import "./themes.css";

import "./colorPicker.css";

import "./quickPalette.css";

import "./smartPanel.css";

import "./workspaceNavigation.css";
