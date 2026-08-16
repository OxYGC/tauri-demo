# 超级内核 · Super Kernel (Tauri Demo)

> 一个基于 **Tauri 2 + React 18 + MUI 6 + Rust** 构建的跨平台桌面应用模板。开箱即用的：深浅色主题、系统托盘日历角标（与跑马灯样式严格同步）、站内通知中心、以及符合 Tauri 官方 `latest.json` schema 的**增量自动更新**（失败自动回退全量包）。

<p align="center">
  <img alt="Tauri" src="https://img.shields.io/badge/Tauri-2.x-FA4A1A?logo=tauri&logoColor=fff" />
  <img alt="React" src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=000" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=fff" />
  <img alt="Rust" src="https://img.shields.io/badge/Rust-1.80%2B-DEA584?logo=rust&logoColor=000" />
  <img alt="License" src="https://img.shields.io/badge/License-MIT-7CB68C" />
</p>

---
<img width="1440" height="900" alt="image" src="https://github.com/user-attachments/assets/dd5c57d6-c94d-4c8d-b0cc-2706292a52e5" />

## ✨ 功能一览

- 🖥️ **跨平台桌面应用**：macOS / Windows / Linux，单二进制分发（Windows: `.exe / .msi`，macOS: `.dmg / .app`）
- 🎨 **主题与语言**：浅/深/跟随系统三档；语言切换（zh-CN / en）
- 🔔 **真实站内通知中心（小铃铛）**：首次启动自动写入欢迎通知；更新有新版本时铃铛变黄 + 通知面板弹出 `发现新版本` 通知
- 📅 **状态栏托盘日历角标**：与跑马灯 `CalendarDateBadge` **完全同结构/同配色**（深/浅色自动切换）；跑马灯关闭时自动降级为「极简日期方片」样式
- 🚥 **底部跑马灯**：行情滚动条 + 实时日期 / 时间 / Wi-Fi 6 角标网络状态
- ⚙️ **可持久化配置**：所有主题/语言/托盘/跑马灯/快捷键/通知/更新状态 → 全量落盘到 `config.json`，修改即时生效
- 📦 **Tauri 2 自动更新（增量 + 回退）**：
  - 遵循 Tauri 官方 `latest.json` schema，`@tauri-apps/plugin-updater` 插件驱动（**不自写 HTTP**）
  - 检测地址通过环境变量 `UPDATER_ENDPOINT` 注入（部署时不需要再改代码）
  - `platforms.*.delta_url` 存在则优先增量（bsdiff），失败自动回退全量包
  - 签名校验：用 `minisign` 公钥写在 `tauri.conf.json > plugins.updater.pubkey`
- 🪪 **管理员权限检测**：Windows 非管理员启动一键重启为管理员
- ⌨️ **快捷键自定义**：打开设置 / 切换侧边栏 / 聚焦搜索

---

## 🚀 快速开始

### 0. 环境准备

| 依赖 | 推荐版本 | 备注 |
|---|---|---|
| Node.js | ≥ 18 | `brew install node` / `nvm install 20` |
| pnpm | ≥ 8 | `corepack enable && corepack prepare pnpm@latest --activate` |
| Rust | ≥ 1.77 | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| Tauri 2 系统依赖（macOS） | Xcode 15+ CLT | `xcode-select --install` |
| Tauri 2 系统依赖（Windows） | VS 2022 Build Tools (C++ + MFC/ATL) + WebView2 | Win10/11 通常自带 WebView2 |
| Tauri 2 系统依赖（Linux） | webkit2gtk-4.1、ayatana-appindicator 等 | [官方文档](https://v2.tauri.app/start/prerequisites/) |

### 1. 拉代码 & 安装依赖

```bash
git clone https://github.com/OxYGC/tauri-demo.git
cd tauri-demo
pnpm install
```

### 2. 开发模式

```bash
# 使用 tauri.conf.json 中 plugins.updater.endpoints 的默认地址
pnpm tauri:dev

# 或：指定自己的更新服务器 latest.json
UPDATER_ENDPOINT="https://your-updater.example.com/latest.json" pnpm tauri:dev
```

开发服务器会在 `http://localhost:1420`，并弹出 Tauri 原生窗口。

### 3. 生产构建

```bash
pnpm tauri:build
```

产物位置：
- macOS：`src-tauri/target/release/bundle/macos/超级内核.app` + dmg
- Windows：`src-tauri/target/release/bundle/msi/*.msi` + `nsis/*.exe`
- Linux：AppImage / deb / rpm（按 `tauri.conf.json > bundle.targets`）

### 4. 发布自动更新（minisign + latest.json）

完整方案请阅读 **[docs/UPDATER.md](./docs/UPDATER.md)**。  
最常用的 3 行命令：

```bash
# 1) 生成签名密钥对（会自动放 .tauri/updater.key 和 .tauri/updater.key.pub，已被 .gitignore 忽略）
pnpm tauri signer generate -w ~/.tauri/myapp.key
# 2) 构建带签名的安装包
TAURI_SIGNING_PRIVATE_KEY="$HOME/.tauri/myapp.key" \
TAURI_SIGNING_PRIVATE_KEY_PASSWORD="" \
pnpm tauri build
# 3) 把 latest.json 上传到 $UPDATER_ENDPOINT，再把用户端启动
UPDATER_ENDPOINT="https://your-updater.example.com/latest.json" ./超级内核.app/Contents/MacOS/tauri-app
```

---

## 🗂️ 目录结构

```
tauri-demo/
├── src/                         # 前端 (React 18 + MUI)
│   ├── components/              # HeaderBar / SideNav / MarqueeTicker / TrafficLight
│   ├── data/mock.ts             # 行情/节点等 mock 数据
│   ├── hooks/                   # useAppUpdater.ts、useSystemData.ts、useIsAdmin.ts
│   ├── pages/                   # Overview / Proxies / Logs / Settings
│   ├── config.tsx               # AppConfig、WELCOME_NOTIFICATION、ConfigProvider + save/load invoke
│   ├── App.tsx / main.tsx       # 应用入口 + 路由
│   └── index.css                # 跑马灯动画、scrollbar、全局字体
├── src-tauri/                   # 后端 (Rust / Tauri 2)
│   ├── src/
│   │   ├── main.rs              # bin 入口
│   │   └── lib.rs               # 配置读写 IPC、系统/网络信息、托盘日历绘制、
│   │                            # updater_* 自定义命令（注入 UPDATER_ENDPOINT + 覆盖 plugin-updater 默认 invoke）
│   ├── capabilities/default.json
│   ├── Cargo.toml               # tauri 2 / tauri-plugin-updater (rustls-tls) / sysinfo ...
│   ├── tauri.conf.json          # 窗口大小、Overlay 标题栏、plugins.updater.endpoints/pubkey、bundle.icons
│   └── icons/                   # Tauri 标准多尺寸图标 (icon.icns/.ico/Square*.png)
├── index.html                   # Vite 入口
├── vite.config.ts
├── tsconfig.json
├── package.json                 # scripts: dev/build/tauri:dev/tauri:build
├── .tauri/updater.key(.pub)     # ⚠️ minisign 签名密钥对，.gitignore 已排除，绝不提交
├── .editorconfig / .npmrc / .gitignore
└── docs/UPDATER.md              # 部署自动更新所需 latest.json schema & 签名示例
```

---

## 🧪 交互设计要点（与 config.json 100% 同步）

| UI 操作 | 写入字段 | 效果 |
|---|---|---|
| 设置 → 主题/语言/默认页/托盘开关/跑马灯开关/快捷键 | `config.theme / language / defaultPage / tray.enabled / marquee.* / shortcuts.*` | `save_config` 立刻写盘；Rust 托盘渲染端每 25s 读盘重绘 icon & tooltip |
| 通知面板 → 新增/已读/全部已读/删除 | `config.notifications.items[] + welcomeShown` | 下次启动不会重复欢迎通知；铃铛红点 = 未读计数 |
| `useAppUpdater` check 成功或发现新版本 | `config.updateState` | 关于页 Chip 显示「最新版本 vX」，铃铛黄色高亮提示，跨进程重启状态不丢 |

---

## 🛣️ Roadmap & Contributing

欢迎提 Issue / PR！提交前请阅读 **[CONTRIBUTING.md](./CONTRIBUTING.md)**。核心方向：
- Clash/Mihomo 内核接入 + 订阅管理
- 订阅/节点/规则的真实管理页
- 更多跑马灯信息（当前入站/CPU/内存）
- Linux AppIndicator 外观微调和键盘布局

---

## 🔐 安全 & 漏洞报告

请阅读 **[SECURITY.md](./SECURITY.md)**。安全问题不要发 GitHub issue，直接发邮件：`<keygenee@gmail.com>`。

---

## 📝 License

MIT License. See **[LICENSE](./LICENSE)**.
