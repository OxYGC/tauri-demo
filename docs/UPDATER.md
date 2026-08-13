# 自动更新部署指南 · Auto Update (UPDATER_ENDPOINT + latest.json + minisign)

本项目的自动更新**完全基于 `@tauri-apps/plugin-updater` v2**，遵循 Tauri 官方 schema。

- **不手写 HTTP 请求**：检测、下载、增量、回退、安装、重启都交给插件。
- **增量优先 + 自动回退全量**：`platforms.<target>.delta_url` 存在优先用 bsdiff；失败会根据错误关键词自动回退完整包 `url`。
- **签名必验**：`signature` 必须用 `minisign -Sm` 对 `platforms.<target>.url` 所指向的二进制（或 `.sig` 内容本身所描述的原始二进制）签名，公钥写在 `tauri.conf.json > plugins.updater.pubkey`。

---

## 0. 名词速查

| 名词 | 说明 |
|---|---|
| `UPDATER_ENDPOINT` | 环境变量，指向你的 `latest.json` URL。启动时 Rust 端 `env_endpoint_override()` 会读取并用它覆盖 `tauri.conf.json` 的 endpoints |
| `latest.json` | Tauri 官方 schema 的更新元数据文件 |
| `signature` | `latest.json > platforms.<target>.signature` 字段：minisign 签名字符串（不是 URL） |
| `delta_url` + `delta_signature` | 增量包 URL 与增量包签名；**允许为空**，客户端会自动降级为全量包 |
| `minisign` / `RUST_WASM_MINISIGN` | minisign 工具，或 `tauri signer generate` 产出的密钥对（完全兼容） |

---

## 1. 生成签名密钥对（一次就行）

```bash
# 方式 A：用 tauri 2 自带的 signer（推荐）
cd tauri-demo
pnpm tauri signer generate -w ~/.tauri/super-kernel.key
# 运行完会输出：
#   Generating private key...
#   Public key: "untrusted comment: minisign public key: 64F26F156B273141\nRWSBMSDrvFy9yZk...\n"
# 把上面这 "Public key:" 后两行（包括 "untrusted comment: minisign public key..." + base64 行）
# 复制到 src-tauri/tauri.conf.json：
#   "plugins": { "updater": { "pubkey": "粘贴到这里" } }

# 方式 B：用系统 minisign
minisign -G -p ~/.tauri/super-kernel.pub -s ~/.tauri/super-kernel.key
minisign -p -f ~/.tauri/super-kernel.pub   # 得到公钥字符串
```

> ⚠️ `.tauri/updater.key` 和 `~/.tauri/super-kernel.key` **不要上传 GitHub**，`.gitignore` 已经排除。

---

## 2. 构建带签名的发布包

### macOS (aarch64 + x86_64)

```bash
# 注意：macOS 平台需要先配置 Developer ID / notarization（可选，但强烈推荐）
export TAURI_SIGNING_PRIVATE_KEY="$(cat ~/.tauri/super-kernel.key)"
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD=""   # 密码有就填

# 双架构（或按需改 targets）
export UPDATER_ENDPOINT="https://your-updater.example.com/latest.json"

pnpm tauri build --target universal-apple-darwin
# 产物：
#   src-tauri/target/universal-apple-darwin/release/bundle/macos/Tauri Demo.app/
#   src-tauri/target/universal-apple-darwin/release/bundle/dmg/Tauri Demo_0.0.1_aarch64.dmg
#                                               ~Tauri Demo_0.0.1_x64.dmg  (视配置)
```

### Windows (x64)

```powershell
$env:TAURI_SIGNING_PRIVATE_KEY = Get-Content "$HOME\.tauri\super-kernel.key" -Raw
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = ""
$env:UPDATER_ENDPOINT = "https://your-updater.example.com/latest.json"
pnpm tauri build --target x86_64-pc-windows-msvc
# 产物：
#   src-tauri\target\x86_64-pc-windows-msvc\release\bundle\msi\Tauri Demo_0.0.1_x64_en-US.msi
#   src-tauri\target\x86_64-pc-windows-msvc\release\bundle\nsis\Tauri Demo_0.0.1_x64-setup.exe
```

> 构建完成后，插件会自动为每个 `bundle` 产物生成 `.sig` 文件（和 `.dmg/.msi/.exe` 同级）。这些 `.sig` 就是 **`signature` 字段要粘贴的内容字符串**（去掉首尾的 `-----BEGIN MINISIGN SIGNATURE----- / -----END...-----` 两行，或直接原样粘贴均可，插件侧支持两种格式）。

---

## 3. latest.json Schema 示例（完全符合 Tauri 官方）

假设你的版本从 `0.0.1 → 0.1.0`，建一个 `latest.json` 放在静态站（可以是 GitHub Raw / OSS / Cloudflare R2 / S3）：

```json
{
  "version": "0.1.0",
  "notes": "超级内核 0.1.0 发布：\n- 接入 Mihomo 内核\n- 托盘日历样式与跑马灯完全同步\n- 自动更新支持增量（bsdiff），失败自动回退全量包",
  "pub_date": "2026-08-14T18:00:00Z",
  "platforms": {
    "darwin-aarch64": {
      "signature": "untrusted comment: ...\nbase64+base64.trust+comment==\n",
      "url": "https://download.example.com/super-kernel/0.1.0/Tauri%20Demo_0.1.0_aarch64.dmg",
      "delta_url": "https://download.example.com/super-kernel/0.1.0/delta/Tauri%20Demo_0.1.0_aarch64.patch",
      "delta_signature": "untrusted comment: minisign signature...\nbase64+trust==\n"
    },
    "darwin-x86_64": {
      "signature": "...对应当前 x64 dmg 的签名字符串...",
      "url": "https://download.example.com/super-kernel/0.1.0/Tauri%20Demo_0.1.0_x64.dmg"
    },
    "windows-x86_64-msi": {
      "signature": "...MSI 包的签名字符串...",
      "url": "https://download.example.com/super-kernel/0.1.0/Tauri%20Demo_0.1.0_x64_en-US.msi"
    },
    "windows-x86_64-nsis": {
      "signature": "...NSIS EXE 包的签名字符串...",
      "url": "https://download.example.com/super-kernel/0.1.0/Tauri%20Demo_0.1.0_x64-setup.exe"
    },
    "linux-x86_64-appimage": {
      "signature": "...AppImage 的签名字符串...",
      "url": "https://download.example.com/super-kernel/0.1.0/super-kernel_0.1.0_amd64.AppImage.tar.gz"
    }
  }
}
```

### 3.1 platform targets 命名表

plugin-updater 2.x 需要的 `<target>` 完全对应你在构建时 `bundle.active=true` 后产出的 target。常见组合：

| 操作系统 | 架构 | bundle target | latest.json key |
|---|---|---|---|
| macOS (Apple Silicon) | aarch64 | dmg/app | `darwin-aarch64` |
| macOS (Intel) | x86_64 | dmg/app | `darwin-x86_64` |
| Windows | x86_64 | MSI | `windows-x86_64-msi` |
| Windows | x86_64 | NSIS `.exe` | `windows-x86_64-nsis` |
| Linux | x86_64 | AppImage `.tar.gz` | `linux-x86_64-appimage` |
| Linux | x86_64 | deb | `linux-x86_64-deb` |

### 3.2 关于增量更新（delta）

- **服务器端**：用 `tauri build` 默认流程（`plugins.updater.delta.enabled=true`，我们仓库的 `tauri.conf.json` 已启用）会**自动产出** `.patch` 增量文件并自动在 `latest.json` 里填好 `delta_url` 和 `delta_signature`。如果你的构建链不是用 Tauri 默认 CLI（或想自己用 bsdiff 打补丁），确保：
  - `delta_url` 指向的补丁是 `bsdiff(oldFile, newFile)` 产物
  - `delta_signature` 是针对这个 `.patch` 文件的 **minisign 签名字符串**
- **客户端**：插件内部在 `downloadAndInstall()` 里先打补丁应用，应用失败 / 签名错误 会在内部 throw；**我们 `useAppUpdater.downloadAndInstall()`** 根据错误关键词自动回退全量包下载安装。配置项无需调整。

---

## 4. 部署 latest.json & 配置 `UPDATER_ENDPOINT`

把 `latest.json` 上传到任意静态站，URL 记为 `$LATEST_JSON_URL`。

### 客户端（用户电脑）启动方式

```bash
# macOS
UPDATER_ENDPOINT="$LATEST_JSON_URL" "/Applications/超级内核.app/Contents/MacOS/tauri-app"

# Windows (PowerShell)
$env:UPDATER_ENDPOINT="$LATEST_JSON_URL"
& "C:\Program Files\Tauri Demo\Tauri Demo.exe"
```

### 开发者（自己打包内置默认 endpoints）

如果你不想让用户每次都设 `UPDATER_ENDPOINT`，直接把 `LATEST_JSON_URL` 写在：
- `src-tauri/tauri.conf.json → plugins.updater.endpoints[]` 作为**默认 fallback**

用户侧有 `UPDATER_ENDPOINT` 就以环境变量覆盖；没有就走配置里的 fallback。两者都有 → 环境变量优先（Rust 端逻辑在 `lib.rs` 的 `env_endpoint_override()`）。

---

## 5. 常见坑速查

| 现象 | 根因（90% 的情况） | 修复 |
|---|---|---|
| 启动即 panic：`relative URL without a base: {{UPDATER_ENDPOINT}}` | 错误地在 `tauri.conf.json` 里用了模板插值 `{{...}}`；serde 反序列化 endpoints 时直接当 URL 解析 | 按本仓库方式：tauri.conf.json 只放合法 fallback URL；Rust 端运行时自定义命令覆盖（`plugin:updater|check` 内 `UpdaterBuilder::endpoints(...)`） |
| 下载完成后安装失败：`Invalid symbol 58, offset 5` | `platforms.*.signature` 写成了 `.sig` 文件的 URL（字符串），而不是签名内容本身 | 把 `.sig` 里的内容（`untrusted comment:...\nbase64==\n`）原样粘贴进 `signature` 字段 |
| 启动静默检查：一直没结果（蓝灯常亮） | 要么 endpoints 被墙 / CSP 被限制，要么 UPDATER_ENDPOINT URL 错；检查控制台错误 | 1) 先在浏览器里打开 `latest.json` 看能否拿到正确 JSON；2) 前端点击「设置 → 关于 → 检查更新」看具体错误 |
| Windows 10：`rustls` 访问 HTTPS 报 ConnectionReset | Windows 10 TLS stack 老；rustls-tls 一般 OK，若仍异常临时退 native-tls | 把 Cargo.toml 中 `tauri-plugin-updater = { version = "2", features = ["rustls-tls"] }` 的 `rustls-tls` 改为 `native-tls` 并重跑 build |
| 铃铛一直是蓝色/黄色（但其实没版本） | `useAppUpdater` 把上次检测结果存在 `config.updateState`；但其实你 latest.json 已经撤回新版 | 删除用户目录 config.json 或在「检查更新」手动重新查一次（查到 no-update 会清空 `updateState` 并推通知） |

---

## 6. Debug 快速开关

开发时如果想临时打 latest.json mock：用本项目仓库内置的 mock：

```
https://raw.githubusercontent.com/OxYGC/web-incubator/refs/heads/main/data-hub/mock/tauri-demo/latest.json
```

`plugins.updater.endpoints` 默认已指向该地址，CI/本地拉起来就能验证「黄色铃铛 + 关于版本 Chip + 下载流程」完整链路。
