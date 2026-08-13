# 贡献指南 · Contributing

非常欢迎任何形式的贡献：Issue、Bug 报告、Feature Request、文档优化、或者直接 Pull Request。

## 0. 行为准则 · Code of Conduct

请始终保持尊重和友善。任何形式的人身攻击、骚扰、歧视都会被移除并拉黑。

## 1. 开发环境搭建

参考 **[README.md → 快速开始](./README.md#-快速开始)**。

常用命令备忘：

```bash
# 前端构建校验（TypeScript 严格模式，必须 0 error）
pnpm tsc --noEmit

# 前端热更新 + 打开 Tauri 原生窗口（主流程）
pnpm tauri:dev

# Rust 编译 / 检查
cd src-tauri && cargo check && cargo clippy -- -D warnings  # 可选：开启严格 clippy

# 生产构建（带自动更新签名，详见 docs/UPDATER.md）
TAURI_SIGNING_PRIVATE_KEY="$(cat ~/.tauri/myapp.key)" pnpm tauri:build
```

## 2. 提交 Issue / Bug Report

模板 GitHub Issue 提交页通常会自动提供。如果没有，请至少包含：

- **版本**：当前 commit hash / tag + `package.json` 的 `version` + `src-tauri/Cargo.toml` 版本
- **平台**：macOS 15 / Windows 11 24H2 / Ubuntu 24.04 等
- **重现步骤**（最小可复现步骤）
- **预期 vs 实际行为**
- **截图 / 录屏**（UI 类 bug 最好有）；以及完整日志（设置 → 配置文件 → 复制 config.json 脱敏后一并提供）

## 3. Pull Request 规范

### 3.1 分支
- `main`：**发布分支**，永远稳定可构建，GitHub Actions CI 必须全绿才能合入
- 个人分支命名建议：`fix/xxx`、`feat/xxx`、`docs/xxx`、`chore/xxx`

### 3.2 Checklist（合入前必须打勾）
- [ ] `pnpm tsc --noEmit` 无错误
- [ ] `cd src-tauri && cargo check` 通过
- [ ] 所有「可配置 / 可点击」的 UI 状态，**已经同步写盘到 config.json**（参考 README 里的「交互设计要点表」）
- [ ] 对 config.json 结构有新增字段时：
  - [ ] `AppConfig` / `DEFAULT_CONFIG` TS 类型同步
  - [ ] `merge(...)` 新增容错分支
  - [ ] Rust 端 `default_config()` 缺省值同步
  - [ ] 如果是破坏性变更，`configVersion` +1 并在 `migrate_config()` 里做旧配置迁移
- [ ] README / docs/ 对应文档（尤其是涉及对外 API、配置项、CLI 参数、自动更新）已更新
- [ ] CHANGELOG.md 里按「Added / Changed / Fixed / Removed」分类记一笔

### 3.3 提交信息 · Conventional Commits
可选，但强烈推荐用 Conventional Commits 前缀：

```
feat: 新增 xxx 特性
fix: 修复 xxx 在 Windows 下 xxx 的问题
docs: 补充 UPDATER.md 签名示例
refactor: 拆分 useAppUpdater 为多文件
chore(deps): 升级 tauri-plugin-updater 到 2.10.x
```

## 4. 功能设计理念（避免返工）

本项目遵循几个固定约束，提 PR 前请先确认你改动符合：

- **配置 JSON 同步**：任何用户侧「可切换状态」，必须持久化到 `config.json`。不存在只存在内存里的开关。
- **Tauri 官方插件优先**：自动更新、文件打开、shell 打开等能力，优先走 `@tauri-apps/plugin-*`，不写原生 HTTP / FS / shell。
- **增量更新优先，失败回退全量**：所有更新路径必须保留 `delta → full` 的回退逻辑。
- **图标 / 托盘 / 跑马灯 样式对齐**：Rust 端生成的 tray icon 必须和前端 Marquee 的 CSS 结构一致，调色板对应 `paper/text.secondary/text.primary`。

有任何疑问欢迎先开 Issue 讨论，再动手写代码，避免重复返工 👍。
