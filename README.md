<div align="center">
  <img src="public/baize.svg" width="72" alt="BaizeFig" />
  <h1>BaizeFig · 白泽</h1>
  <p>A local-first design canvas you can connect to your own AI tools.</p>
  <p><strong>English</strong> · <a href="README.zh-CN.md">简体中文</a></p>
  <p><a href="https://baizefig.netlify.app/">Try in your browser</a> · <a href="https://github.com/loyo-sun/BaizeFig/releases">Download for Mac</a> · <a href="https://github.com/loyo-sun/BaizeFig/issues">Feedback</a></p>
</div>

## Why I built this

I started BaizeFig after trying design software that advertised MCP and agent support, yet still limited what I could connect, read, or change. The interfaces I wanted to use were not always available, and too much depended on the product's own integrations.

I wanted a design tool where I could choose the model and client, deploy the editor myself, and let an agent work on the canvas through an explicit, inspectable set of tools. That is why I built BaizeFig. It is still growing; the aim is to make AI-assisted design easier to access and control.

## What it does

- **Local-first editing:** autosave, multiple files, a recycle bin, named versions, and editable `.baizefig` backups. The desktop editor works offline.
- **A working design canvas:** shapes, text, images, layers, alignment, snapping, rulers, gradients, effects, masks, and Boolean operations.
- **Editable vectors and typography:** pen and pencil tools, Bézier nodes, path operations, rich text, and font replacement.
- **Reusable design systems:** components, instances, variables, local component libraries, and auto layout.
- **Interactive prototypes:** page navigation, overlays, scrolling, and component interactions.
- **Import and delivery:** import `.fig` and SVG; export PNG, JPG, SVG, HTML, PDF, or a native design backup.
- **Your AI tools:** use a compatible model endpoint in Ask Baize, or connect an external client through local or remote MCP. Reading requires pairing; editing and export have separate permissions. Applied edits support undo.
- **Your deployment:** host the web editor, use the desktop app, run your own MCP service, or connect through LoyoCloud.

BaizeFig is under active development. Figma import is partial compatibility, not lossless conversion, and cannot write back `.fig` files. PDF export preserves the visual appearance as images. Some advanced Figma features remain unsupported; see the [support matrix](docs/FIGMA_PARITY.md).

## Quick start

### Use the browser version

Open [baizefig.netlify.app](https://baizefig.netlify.app/). Start drawing, import an existing design, or export a `.baizefig` backup. Files are stored in this browser's site storage; clearing that storage can remove them.

### Deploy your own editor

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/loyo-sun/BaizeFig)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Floyo-sun%2FBaizeFig)

Choose a button, connect your hosting account, and deploy. The repository includes the build settings for both platforms. **These buttons deploy the web editor, not a persistent MCP server or cloud document storage.** To add remote MCP, connect LoyoCloud or deploy the [MCP service](docs/MCP.md) separately. Your hosting provider's account requirements and usage limits apply.

### Download the Mac app

Download the **Apple Silicon / arm64 DMG** from [GitHub Releases](https://github.com/loyo-sun/BaizeFig/releases), open it, and drag BaizeFig into Applications. This release is unsigned and not notarized. If macOS blocks opening it, use **System Settings → Privacy & Security → Open Anyway** after reviewing the download source; do not disable system-wide security protections.

The app includes offline editing and a local MCP runtime. In **Desktop → Local MCP management** (currently labeled **桌面 → 本机 MCP 管理**), install/start the service and copy the client configuration. Then open the canvas MCP connection dialog and choose **连接桌面本机 MCP**. Stop or uninstall the service from the same management window. Node.js does not need to be installed separately.

The app checks GitHub Releases on launch and periodically. New versions trigger a download prompt; replace the application manually after quitting it. Local designs remain in the app's data directory. Browser files are separate: export from the browser, then import into the app. See the [desktop guide](docs/DESKTOP.md).

### Intel Mac and Windows testers wanted

The Electron codebase supports **Intel Mac and Windows**, but I do not have those computers for real-device testing. The public desktop download currently includes **Apple Silicon only**. Intel Mac was packaged during development but has not been tested on a physical Intel Mac; Windows support is not a verified release claim.

If you have an Intel Mac or Windows PC, please [open a testing issue](https://github.com/loyo-sun/BaizeFig/issues/new?title=Desktop%20testing%3A%20Intel%20Mac%20or%20Windows). Include your OS version, CPU architecture, build result, and what you tried: editing and reopening files, imports/exports, fonts, and local MCP installation, connection, and removal. Community test results will guide future platform releases.

## Which version or service do I need?

| | One-click web deployment | Local desktop app | LoyoCloud service | Self-hosted MCP service |
| --- | --- | --- | --- | --- |
| What runs | A web editor on your Netlify/Vercel site | The editor and optional local MCP on your computer | Account, authorization, and remote MCP routing | Your own Node MCP bridge and authorization service |
| Where designs live | Your browser's site storage | The app's local data directory | Designs remain in the connected editor; not cloud file storage | Designs remain in the connected editor |
| Offline use | Not a guaranteed offline installation | Editing works offline; offline AI also needs a local model/client | Requires internet | Remote access needs network connectivity |
| MCP availability | Connect a separate local/remote service | Built-in local MCP can be installed, stopped, and removed | Shared remote HTTPS MCP with OAuth | Your HTTPS endpoint with OAuth or token authentication |
| Account/setup | A hosting account to deploy | No cloud account needed for local editing/MCP | LoyoCloud account and client authorization | Your server, runtime, HTTPS, and configuration |
| Must the canvas stay open? | Yes, for MCP operations | Yes, for MCP operations | Yes, in the connected editor | Yes, in the paired editor |
| Who maintains it | You maintain your site | You install app updates | The service operator maintains the backend | You maintain the backend |
| Best fit | Your own web address and browser access | Offline work and local AI tools | Remote AI clients without running your own MCP server | Control over the remote MCP infrastructure |

These options can be combined. A self-hosted web editor can connect to LoyoCloud or your own MCP service, and the desktop app can use local MCP without a cloud account. LoyoCloud routes authorized design content to the AI client; it does not save your design files or render closed canvases. See [LoyoCloud connection details](docs/LOYO_CLOUD.md).

## Develop and contribute

Use Node.js **22.12+**:

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:4318`. Use `npm run build` for a web build and `npm run desktop:mac` for an unsigned Apple Silicon desktop package. For web-only dependency installation, use `BAIZEFIG_SKIP_DESKTOP_DOWNLOAD=1 npm ci` to skip downloading Electron.

[Development](docs/DEVELOPMENT.md) · [Desktop packaging](docs/DESKTOP.md) · [MCP deployment](docs/MCP.md) · [Architecture](docs/ARCHITECTURE.md) · [Keyboard shortcuts](docs/SHORTCUTS.md) · [Performance](docs/PERFORMANCE.md)

Please keep original imported files and export backups of important work. When using AI, the content required for your request is sent to the model endpoint or client you choose.
