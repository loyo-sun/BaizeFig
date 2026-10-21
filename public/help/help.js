import { chapters } from "./content.js";

const nav = document.querySelector("nav");
const cards = document.querySelector(".cards");
const search = document.querySelector("#search");
const chapter = document.querySelector("#chapter");
const content = document.querySelector("#content");
const title = document.querySelector("#title");
const matches = document.querySelector("#matches");
const textOf = (html) => {
  const template = document.createElement("template");
  template.innerHTML = html;
  return template.content.textContent || "";
};
const searchable = chapters.map((c) =>
  `${c.title} ${c.summary} ${textOf(c.html)}`.toLowerCase(),
);
for (const [index, c] of chapters.entries()) {
  const a = document.createElement("a");
  a.href = "#" + c.id;
  a.textContent = c.title;
  nav.append(a);
  if (index) {
    const card = document.createElement("a");
    card.className = "card";
    card.href = "#" + c.id;
    const small = document.createElement("small");
    small.textContent = String(index).padStart(2, "0");
    const h = document.createElement("h2");
    h.textContent = c.title;
    const summary = document.createElement("span");
    summary.textContent = c.summary;
    card.append(small, h, summary);
    cards.append(card);
  }
}
function render(moveFocus = false) {
  let index = chapters.findIndex((c) => c.id === location.hash.slice(1));
  if (index < 0) index = 0;
  const current = chapters[index];
  title.textContent = current.title;
  document.title = current.title + " · BaizeFig 帮助中心";
  document.querySelector("#intro").textContent = current.summary;
  document.querySelector("#overview").hidden = index !== 0;
  // Content is authored in this repository; search input is never inserted as HTML.
  chapter.innerHTML = current.html;
  for (const [i, a] of [...nav.children].entries()) {
    if (index === i) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  }
  const toc = document.querySelector("#toc");
  toc.replaceChildren();
  chapter.querySelectorAll("h2").forEach((heading, i) => {
    heading.id = "section-" + i;
    const a = document.createElement("a");
    a.href = "#" + current.id;
    a.textContent = heading.textContent;
    a.addEventListener("click", (e) => {
      e.preventDefault();
      heading.scrollIntoView({ behavior: "smooth", block: "start" });
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    });
    toc.append(a);
  });
  const pager = document.querySelector(".pager");
  pager.replaceChildren();
  for (const i of [index - 1, index + 1]) {
    const a = document.createElement("a");
    if (chapters[i]) {
      a.href = "#" + chapters[i].id;
      a.textContent =
        (i < index ? "← 上一章：" : "下一章：") + chapters[i].title;
    }
    pager.append(a);
  }
  if (moveFocus) {
    content.scrollIntoView({ block: "start" });
    title.focus({ preventScroll: true });
  }
}
search.addEventListener("input", () => {
  const query = search.value.trim().toLowerCase();
  let count = 0;
  for (const [i, a] of [...nav.children].entries()) {
    a.hidden = !searchable[i].includes(query);
    if (!a.hidden) count++;
  }
  document.querySelector("#empty").hidden = count > 0;
  matches.textContent = query ? `找到 ${count} 个相关章节` : "";
});
window.addEventListener("hashchange", () => render(true));
render();
