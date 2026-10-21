import {
  ArrowDownLeft,
  ArrowUp,
  ArrowUpLeft,
  ArrowUpRight,
  ArrowRight,
  X,
} from "lucide-react";
import { useI18n } from "./LanguageContext";
import release from "../package.json";
import "./welcome.css";

// This is an editor introduction, not part of the saved/exported design.
export function WelcomeCanvas({
  onStart,
  onDismiss,
}: {
  onStart: () => void;
  onDismiss: () => void;
}) {
  const { language } = useI18n();
  const zh = language === "zh-CN";
  const copy = (cn: string, en: string) => (zh ? cn : en);
  return (
    <section
      className="welcome-canvas"
      aria-label={copy("欢迎使用 BaizeFig", "Welcome to BaizeFig")}
    >
      <div className="welcome-sheet">
        <div className="welcome-topline">
          <span>BAIZEFIG / GET STARTED</span>
          <button
            onClick={onDismiss}
            aria-label={copy("关闭欢迎页", "Close welcome")}
          >
            <X size={16} />
          </button>
        </div>
        <div className="welcome-guides welcome-guides-top">
          <div className="welcome-guide">
            <ArrowUpLeft />
            <span className="welcome-guide-index">01</span>
            <h2>{copy("你的创作素材库", "Your creative library")}</h2>
            <p>
              {copy(
                "图层管理结构，资源复用灵感，智能连接 AI。",
                "Organize layers, reuse assets and connect with AI.",
              )}
            </p>
            <span className="welcome-tags">
              {copy("图层 / 资源 / 智能", "LAYERS / ASSETS / SMART")}
            </span>
          </div>
          <div className="welcome-guide welcome-guide-tools">
            <ArrowUp />
            <span className="welcome-guide-index">02</span>
            <h2>{copy("从一个形状开始", "Start with a shape")}</h2>
            <p>
              {copy(
                "选择、画框、图形、文字与钢笔。按 V 选择，按 F 创建画框。",
                "Select, frame, shape, text and pen. V to select, F to frame.",
              )}
            </p>
          </div>
          <div className="welcome-guide welcome-guide-right">
            <ArrowUpRight />
            <span className="welcome-guide-index">03</span>
            <h2>{copy("让想法准备就绪", "Bring ideas to life")}</h2>
            <p>
              {copy(
                "在右上角登录、分享；切换设计、原型与检查，完成最后一笔。",
                "Sign in and share at the top right. Design, prototype and inspect your work.",
              )}
            </p>
          </div>
        </div>
        <div className="welcome-hero">
          <img
            src="/baize.svg"
            alt={copy("白泽标志", "Baize mark")}
            width="96"
            height="96"
          />
          <svg
            className="welcome-wordmark"
            viewBox="0 0 422 92"
            role="img"
            aria-label="BaizeFig"
          >
            <g
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 67V3h24l11 9v14l-11 9H4m24 0 14 8v14L30 67H4" />
              <path d="m98 28-9-7H74L64 32v22l11 11h13l10-11M98 21v46" />
              <path d="M126 25v42m0-64 6 6-6 6-6-6Z" />
              <path d="M153 23h34l-34 42h34M213 43h34V32l-10-11h-14l-10 11v22l11 11h21M274 67V3h38m-38 30h30M338 25v42m0-64 6 6-6 6-6-6Z" />
              <path d="m400 25-10-4h-14l-10 11v21l10 11h14l10-11m0-32v58l-10 10h-22" />
            </g>
          </svg>
          <h1>
            {copy(
              "同万物，识万象",
              "Connect everything. See every possibility.",
            )}
          </h1>
          <p>
            {copy(
              "让灵感有形，让创作发生。",
              "Give your ideas a shape. Make something yours.",
            )}
          </p>
          <button className="welcome-start" onClick={onStart}>
            {copy("开始创作", "Start creating")}
            <ArrowRight size={17} />
          </button>
          <span className="welcome-shortcuts">
            {copy("V 选择", "V Select")}
            <i />
            {copy("F 画框", "F Frame")}
            <i />
            {copy("T 文字", "T Text")}
          </span>
        </div>
        <div className="welcome-guides welcome-guides-bottom">
          <div className="welcome-guide">
            <ArrowDownLeft />
            <span className="welcome-guide-index">04</span>
            <h2>{copy("给万千想法一个位置", "A place for every idea")}</h2>
            <p>
              {copy(
                "左侧添加页面、整理图层。拖动调整顺序，为每个想法命名。",
                "Add pages and organize layers on the left. Reorder and name your ideas.",
              )}
            </p>
          </div>
          <div className="welcome-guide welcome-guide-right">
            <ArrowUpRight />
            <span className="welcome-guide-index">05</span>
            <h2>{copy("细节，尽在掌握", "Every detail, in reach")}</h2>
            <p>
              {copy(
                "选中对象后，在右侧调整尺寸、填色与布局；检查面板提供开发信息。",
                "Select an object to refine size, color and layout. Inspect it for development.",
              )}
            </p>
          </div>
        </div>
        <footer className="welcome-footer">
          <a
            href={`${import.meta.env.BASE_URL}help/index.html`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {release.displayVersion} <span> / </span>
            {copy("帮助中心 ↗", "Help center ↗")}
          </a>
          <span>
            {copy("从这里，创造万千可能。", "YOUR NEXT IDEA STARTS HERE.")}
          </span>
        </footer>
      </div>
    </section>
  );
}
