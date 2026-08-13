# 安全策略 · Security Policy

## 支持版本 · Supported Versions

| 版本 | 状态 |
|---|---|
| `main` 分支（开发版） | ✅ 接受漏洞报告 |
| Latest GitHub Release（SemVer tag，例如 `v0.1.0`） | ✅ 长期支持到下一个 minor |
| 历史 release（2 个 minor 之前） | ❌ 不再修复 |

本项目使用 **语义化版本 SemVer 2**。Tauri 2 / React / Rust 链路上的上游 CVE，我们会在升级依赖的同时发一个 patch release。

## 报告漏洞 · Reporting a Vulnerability

**请不要直接在 GitHub Issue 里贴漏洞细节**，这会导致 0-day 在尚未修复前公开传播。正确流程：

1. 发邮件到 **`<your-security-contact@example.com>`**（建议用 PGP/GPG 加密，公钥可在主页 README 获取）
2. 邮件里包含：
   - 影响范围（平台：macOS/Windows/Linux + 具体版本号 + commit hash）
   - 复现步骤（越短越好，最小 PoC 脚本）
   - 预计危害（如：本地权限提升、远程代码执行、用户侧 RCE、签名绕过、越权配置修改等）
   - 是否有缓解方案（workaround）
3. 我们会在 **3 个工作日内**回复并建立私下沟通频道（Keybase / Signal / 私有 PR）。
4. 修复 release 发布后，我们会在 **28 天内** 公布细节并致谢。

## 自动更新链路安全重点 · Updater Security Note

本项目的自动更新链路（`@tauri-apps/plugin-updater + minisign`）有以下两个安全设计，请部署时遵守：

1. **签名密钥**：`minisign` 私钥必须离线保存，**严禁**把 `.tauri/updater.key` 或任何 `TAURI_SIGNING_PRIVATE_KEY=...` 提交到公开仓库（`.gitignore` 已排除）。
   - `tauri.conf.json > plugins.updater.pubkey` 里只放**公钥字符串**（base64ed pubkey），用于客户端校验 `signature` 字段。
2. **latest.json HTTPS + endpoints**：`UPDATER_ENDPOINT` / `plugins.updater.endpoints` 必须是 `https://`，不能用 `http://`。否则即使签名正确，也有中间人替换版本信息的风险。
3. **`platforms.<target>.signature` 的格式**：字段值是 `minisign -Sm` 生成的**签名内容**（字符串），不是签名文件的 URL。写反的话会在下载后报 `Invalid symbol 58, offset 5` 导致更新失败。参考 [`docs/UPDATER.md`](./docs/UPDATER.md) 的 schema 示例。
