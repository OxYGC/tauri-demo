# Changelog · 变更日志

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，本项目遵循 [语义化版本 SemVer 2](https://semver.org/lang/zh-CN/)。

---

## [Unreleased]

### Added
- 配置：新增 `AppConfig.notifications.items[]` + `welcomeShown`，站内通知中心持久化
- 配置：新增运行时字段 `updateState`（`config.json` 中自由结构）——缓存 `useAppUpdater` 的检测结果，跨进程不丢失“发现新版本 vX”状态
- 通知：HeaderBar 铃铛 → Popover 真通知面板（支持点单条已读 / 全部已读 / 删除，全部同步写盘）
- 通知：首次启动自动写入欢迎通知 `{id:welcome-1, title:欢迎使用, body:已切换至 超级内核 1.18.0，享受稳定体验。}`
- 自动更新：新增 `src/hooks/useAppUpdater.ts`（startup 静默检测 + 增量失败自动回退全量 + 写盘 `updateState` + 推送 update 通知）
- 自动更新：Rust 端 4 条自定义命令（`plugin:updater|check/download/install/download_and_install` 重命名覆盖）通过 `UPDATER_ENDPOINT` 环境变量注入 endpoints，不再依赖 JSON 插值
- 托盘：`day_icon(day, theme, marquee_enabled)` 严格复刻跑马灯 `CalendarDateBadge`（圆角 + 顶部标题栏 + 两小环 + 深/浅调色板 + 深/浅一致配色），与跑马灯样式 100% 对齐；跑马灯关闭时自动降级极简版
- 托盘：5s 轮询 + 每 25s 读盘检测 `theme / marquee.enabled / tray.enabled` 变化 → set_icon / set_tooltip / remove_tray；tooltip 实时显示「超级内核 · 日历 N日 · 浅/深色主题 · 跑马灯开/关」
- 美化：SettingsPage 移除独立「自动更新」一栏，更新能力内嵌进「关于」；「关于」加应用 Logo 方块 + 版权 chip + 技术栈 chips
- 美化：HeaderBar 铃铛检测到更新时变黄色（UpdateIcon 叠加）+ Tooltip 显示最新版本号
- 文档：新增 `.gitignore` / `.editorconfig` / `.npmrc` / `README.md` / `LICENSE` / `SECURITY.md` / `CONTRIBUTING.md` / `CHANGELOG.md` / `docs/UPDATER.md`

### Changed
- `tauri.conf.json > plugins.updater.endpoints` 移除了无法反序列化的 `{{...}}` 插值占位，改为静态 fallback URL 并由 Rust 端运行时覆盖
- `src-tauri/Cargo.toml` 新增依赖：`url`、`http`、`time(formatting, serde-well-known)`，`tauri-plugin-updater` 开启 `rustls-tls`
- `#[tauri::command(rename = "plugin:updater|xxx")]` 改用宏内 `rename = ...` 形式（而不是单独的 `#[rename]` 属性），避免 `rename attribute in this scope` 编译错误
- SettingsPage「关于」版本显示当前 Chip + 最新版本 Chip + UpdateIcon logo + “立即检查更新” 按钮（原关于卡片文案简化）

### Fixed
- 启动 panic：`PluginInitialization("updater", relative URL without a base: "{${UPDATER_ENDPOINT}}")` — 由 JSON 插值改为 Rust 运行时自定义命令覆盖 endpoints
- 托盘视觉：日期图标不再纯黑描边（原与 Marquee 的深浅色主题不协调）——改为与 Marquee CSS 同源的配色和结构

### Removed
- 移除设置页独立的「自动更新」卡片（功能仍完整，合并进「关于」）
