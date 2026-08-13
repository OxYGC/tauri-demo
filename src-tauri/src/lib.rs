use std::fs;
use std::net::UdpSocket;
use std::path::PathBuf;
use std::time::Duration;

use chrono::Datelike;
use serde::Serialize;
use sysinfo::{Disks, System};
use tauri::image::Image;
use tauri::ipc::Channel;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Manager, Resource, ResourceId, Runtime, Webview};
use tauri_plugin_updater::{UpdaterExt, Update};
use url::Url;

fn config_path(app: &AppHandle) -> Result<PathBuf, String> {
    // 管理员（sudo / osascript提权）启动时，HOME 会变成 /var/root，导致 config.json 跟普通用户不一致
    // → 检测 SUDO_USER / PKEXEC_UID / 环境变量 ORIG_HOME，优先回原用户的 app_data_dir 读取配置
    fn product_id(app: &AppHandle) -> String {
        app.config()
            .product_name
            .clone()
            .unwrap_or_else(|| "tauri-app".to_string())
    }

    fn user_app_data_dir(app: &AppHandle) -> Option<PathBuf> {
        use std::env;

        let id = product_id(app);

        // 1. 显式透传的 ORIG_HOME（本应用 relaunch 时会塞）
        if let Ok(home) = env::var("ORIG_HOME") {
            if !home.is_empty() {
                #[cfg(target_os = "macos")]
                {
                    return Some(PathBuf::from(home).join("Library/Application Support").join(&id));
                }
                #[cfg(target_os = "windows")]
                {
                    return Some(PathBuf::from(home).join("AppData/Roaming").join(&id));
                }
                #[cfg(all(unix, not(target_os = "macos")))]
                {
                    return Some(PathBuf::from(home).join(".config").join(&id));
                }
            }
        }

        // 2. sudo / doas：SUDO_USER 对应的真实用户 HOME
        if let Ok(user) = env::var("SUDO_USER").or_else(|_| env::var("DOAS_USER")) {
            if !user.is_empty() && user != "root" {
                if let Ok(output) = std::process::Command::new("sh")
                    .args(["-c", &format!("eval echo ~{}", user.replace('\'', ""))])
                    .output()
                {
                    let home = String::from_utf8_lossy(&output.stdout).trim().to_string();
                    if !home.is_empty() && !home.contains('~') {
                        #[cfg(target_os = "macos")]
                        {
                            return Some(PathBuf::from(home).join("Library/Application Support").join(&id));
                        }
                        #[cfg(target_os = "windows")]
                        {
                            return Some(PathBuf::from(home).join("AppData/Roaming").join(&id));
                        }
                        #[cfg(all(unix, not(target_os = "macos")))]
                        {
                            return Some(PathBuf::from(home).join(".config").join(&id));
                        }
                    }
                }
            }
        }

        None
    }

    let dir = user_app_data_dir(app)
        .or_else(|| app.path().app_data_dir().ok())
        .ok_or_else(|| "无法解析配置目录".to_string())?;
    Ok(dir.join("config.json"))
}

/* 定位可执行文件 / .app 路径（relaunch 专用）
 * 优先级：
 *   1) 如果当前被打包在 .app 里，优先返回 .app 目录（macOS 用 open 启动更稳）
 *   2) 否则直接返回 current_exe（dev / 直接运行二进制的情况）
 */
fn resolve_app_target(app: &AppHandle) -> Result<(String, bool), String> {
    let resource = app.path().resource_dir().ok();
    let bundled = resource.as_ref().and_then(|d| {
        d.ancestors()
            .find(|p| {
                p.file_name()
                    .and_then(|n| n.to_str())
                    .map(|n| n.ends_with(".app"))
                    .unwrap_or(false)
            })
            .map(|p| p.to_path_buf())
    });

    if let Some(app_bundle) = bundled {
        return Ok((app_bundle.to_string_lossy().into_owned(), true));
    }
    let exe = std::env::current_exe().map_err(|e| e.to_string())?;
    Ok((exe.to_string_lossy().into_owned(), false))
}

/* ---- 以管理员权限重新启动应用 ----
 *
 * 关键修复（管理员启动白屏的几大根因）：
 *   1. 保留 ORIG_HOME / ORIG_USER 环境变量，让提权后的实例仍从原用户的 app_data_dir 读配置，
 *      避免 Tauri 把配置存到 /var/root 导致配置丢失 → 初始化阶段 read_config 抛出异常或空字段。
 *   2. macOS：osascript 用 `&> /dev/null &` 立即返回，不阻塞等待新实例退出；
 *      同时通过 `env ...` 明确注入 ORIG_* 变量，不依赖 osascript 透传当前环境（经常被清掉）。
 *   3. macOS dev 模式（没有 .app bundle）：直接用可执行文件路径启动，不走 open -n，
 *      避免 open 找不到 bundle、或打开了错误的 /Applications 副本导致前端资源 404 白屏。
 *   4. 当前实例不"立即 exit"，等启动指令发出后给 300ms 让 IPC 返回前端再退出（防止前端 invoke 还没收到 ok 就被 kill 掉）。
 */
#[tauri::command(async)]
fn relaunch_as_admin(app: AppHandle) -> Result<(), String> {
    let (target_path, is_app_bundle) = resolve_app_target(&app)?;
    let orig_home = std::env::var("HOME").unwrap_or_default();
    let orig_user = std::env::var("USER").unwrap_or_default();
    let orig_logname = std::env::var("LOGNAME").unwrap_or_default();

    #[cfg(target_os = "macos")]
    {
        // Shell 单引号转义：' → '\''
        fn sh_escape(s: &str) -> String {
            s.replace('\'', "'\\''")
        }
        // AppleScript 双引号字符串转义：只需转义 \ 和 "
        fn as_escape(s: &str) -> String {
            s.replace('\\', "\\\\").replace('"', "\\\"")
        }

        let oh = sh_escape(&orig_home);
        let ou = sh_escape(&orig_user);
        let ol = sh_escape(&orig_logname);

        let launch_cmd = if is_app_bundle {
            // .app bundle：用 open -n --env 透传环境变量（macOS 12+）
            // open 会正确处理进程分离，不会像直接 nohup & 那样被 do shell script 杀掉
            // --env KEY=VALUE 的 VALUE 不需要 shell 引号，用双引号包裹即可防空格
            format!(
                "open -n --env \"ORIG_HOME={}\" --env \"ORIG_USER={}\" --env \"ORIG_LOGNAME={}\" '{}'",
                orig_home.replace('"', "\\\""),
                orig_user.replace('"', "\\\""),
                orig_logname.replace('"', "\\\""),
                sh_escape(&target_path)
            )
        } else {
            // dev 模式 / 裸二进制：用子shell ( ... & ) 彻底脱离 do shell script 的进程组
            // ⚠️ 单纯 nohup & 不行：do shell script 退出时会向整个进程组发 SIGTERM
            //    子shell ( ... & ) 会让进程被 reparent 到 PID 1，不受父 shell 退出影响
            let inner = format!(
                "nohup /usr/bin/env ORIG_HOME='{}' ORIG_USER='{}' ORIG_LOGNAME='{}' '{}' > /dev/null 2>&1 &",
                oh, ou, ol,
                sh_escape(&target_path)
            );
            format!("( {} )", inner)
        };

        // AppleScript: do shell script "<escaped_cmd>" with administrator privileges
        let script = format!(
            "do shell script \"{}\" with administrator privileges",
            as_escape(&launch_cmd)
        );

        let output = std::process::Command::new("osascript")
            .args(["-e", &script])
            .output()
            .map_err(|e| format!("启动 osascript 失败: {}", e))?;
        if !output.status.success() {
            let err = String::from_utf8_lossy(&output.stderr);
            if err.contains("-128") || err.contains("User canceled") {
                return Err("用户取消了授权".to_string());
            }
            return Err(format!("管理员启动失败: {}", err));
        }

        // 延迟退出：让 invoke 响应先回到前端（300ms 足够）
        std::thread::spawn(move || {
            std::thread::sleep(std::time::Duration::from_millis(400));
            app.exit(0);
        });
        Ok(())
    }

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const SEE_MASK_NOCLOSEPROCESS: u32 = 0x00000040;
        let mut cmd = std::process::Command::new("powershell");
        let arg = format!(
            "$env:ORIG_HOME='{}'; $env:ORIG_USER='{}'; $env:ORIG_LOGNAME='{}'; Start-Process -FilePath '{}' -Verb RunAs",
            orig_home.replace('\'', "''"),
            orig_user.replace('\'', "''"),
            orig_logname.replace('\'', "''"),
            target_path.replace('\'', "''")
        );
        cmd.args(["-NoProfile", "-Command", &arg]);
        cmd.creation_flags(SEE_MASK_NOCLOSEPROCESS);
        cmd.spawn()
            .map_err(|e| format!("启动提权进程失败: {}", e))?;
        std::thread::spawn(move || {
            std::thread::sleep(std::time::Duration::from_millis(400));
            app.exit(0);
        });
        Ok(())
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        let _ = (target_path, is_app_bundle, orig_home, orig_user, orig_logname);
        Err("当前平台不支持管理员方式启动".to_string())
    }
}

/* ---- Updater 自定义 IPC：基于 UpdaterExt 官方 API 替换 endpoints，注入 UPDATER_ENDPOINT 环境变量 ----
 * 为什么不直接用 plugin-updater 默认 IPC：tauri.conf.json 的 plugins.updater.endpoints 必须是合法 URL，
 * 不支持 tauri 2.x 配置插值语法（{{ENV|fallback}}），否则插件初始化阶段就反序列化报错 panic。
 *
 * 本方案完全复用 plugin-updater 内部的 HTTP/签名校验/delta/全量回退 逻辑，**不手写一条 HTTP 请求**：
 *   - 用 `webview.updater_builder()`（UpdaterExt trait）先拿到默认 Builder
 *   - 如果环境变量 UPDATER_ENDPOINT 存在合法 URL → builder.endpoints(vec![env_url]) 覆盖
 *   - 剩余流程用官方 UpdaterBuilder / Update 类型：check/download/install/download_and_install
 *
 * 前端 @tauri-apps/plugin-updater 调用的 IPC 名是 plugin:updater|check 等，
 * tauri 在 invoke_handler 中注册同名命令会覆盖插件默认实现，达到无缝替换。
 */
#[derive(Serialize, Default)]
#[serde(rename_all = "camelCase")]
struct UpdateMetadata {
    rid: ResourceId,
    current_version: String,
    version: String,
    date: Option<String>,
    body: Option<String>,
    raw_json: serde_json::Value,
}

#[derive(Serialize, Clone)]
#[serde(tag = "event", content = "data")]
enum ChannelDownloadEvent {
    #[serde(rename_all = "camelCase")]
    Started { content_length: Option<u64> },
    #[serde(rename_all = "camelCase")]
    Progress { chunk_length: usize },
    Finished,
}

struct DownloadedBytes(pub Vec<u8>);
impl Resource for DownloadedBytes {}

/// 从环境变量 UPDATER_ENDPOINT 解析出覆盖 endpoints；解析失败就 eprintln 警告并返回 None（用默认）
fn env_endpoint_override() -> Option<Vec<Url>> {
    let endpoint = std::env::var("UPDATER_ENDPOINT").ok()?;
    let endpoint = endpoint.trim();
    if endpoint.is_empty() {
        return None;
    }
    match Url::parse(endpoint) {
        Ok(u) => Some(vec![u]),
        Err(e) => {
            eprintln!(
                "[updater] UPDATER_ENDPOINT={:?} 不是合法 URL，跳过覆盖：{}",
                endpoint, e
            );
            None
        }
    }
}

#[tauri::command(rename = "plugin:updater|check")]
async fn updater_check<R: Runtime>(
    webview: Webview<R>,
    headers: Option<Vec<(String, String)>>,
    timeout: Option<u64>,
    proxy: Option<String>,
    target: Option<String>,
    allow_downgrades: Option<bool>,
) -> tauri_plugin_updater::Result<Option<UpdateMetadata>> {
    // 1. 从官方 UpdaterExt 拿基础 Builder（已填 config/version 等）
    let mut builder = webview.updater_builder();

    // 2. 应用环境变量 UPDATER_ENDPOINT 覆盖（用户侧自定义服务器）
    if let Some(eps) = env_endpoint_override() {
        builder = builder.endpoints(eps)?;
    }

    // 3. 应用 check 调用参数（与 plugin-updater::commands::check 一致）
    if let Some(headers) = headers {
        for (k, v) in headers {
            builder = builder.header(k, v)?;
        }
    }
    if let Some(timeout) = timeout {
        builder = builder.timeout(Duration::from_millis(timeout));
    }
    if let Some(proxy) = proxy {
        builder = builder.proxy(Url::parse(&proxy)?);
    }
    if let Some(target) = target {
        builder = builder.target(target);
    }
    if allow_downgrades.unwrap_or(false) {
        builder = builder.version_comparator(|current, update| update.version != current);
    }

    // 4. 官方 check：纯官方逻辑（delta_url → bsdiff/zip 全量回退、签名校验、latest.json schema 解析等）
    let updater = builder.build()?;
    let update = updater.check().await?;

    if let Some(update) = update {
        let formatted_date = if let Some(date) = update.date {
            use time::format_description::well_known::Rfc3339;
            Some(date.format(&Rfc3339).map_err(|_| tauri_plugin_updater::Error::FormatDate)?)
        } else {
            None
        };
        let meta = UpdateMetadata {
            current_version: update.current_version.clone(),
            version: update.version.clone(),
            date: formatted_date,
            body: update.body.clone(),
            raw_json: update.raw_json.clone(),
            rid: webview.resources_table().add(update),
        };
        Ok(Some(meta))
    } else {
        Ok(None)
    }
}

#[tauri::command(rename = "plugin:updater|download")]
async fn updater_download<R: Runtime>(
    webview: Webview<R>,
    rid: ResourceId,
    on_event: Channel<ChannelDownloadEvent>,
    headers: Option<Vec<(String, String)>>,
    timeout: Option<u64>,
) -> tauri_plugin_updater::Result<ResourceId> {
    // headers/timeouts 在 commands::download 中是往 Update.{headers,timeout} 塞的
    // → 我们这里不直接走 builder，而是从 resources_table 取出 Update，改完再 download
    // tauri_plugin_updater::commands::download 内部做法一样（get then clone）
    let update = webview.resources_table().get::<Update>(rid)?;
    let mut update = (*update).clone();

    use http::{HeaderMap, HeaderName, HeaderValue};
    use std::str::FromStr;

    if let Some(headers) = headers {
        let mut map = HeaderMap::new();
        for (k, v) in headers {
            map.append(HeaderName::from_str(&k)?, HeaderValue::from_str(&v)?);
        }
        update.headers = map;
    }
    if let Some(timeout) = timeout {
        update.timeout = Some(Duration::from_millis(timeout));
    }

    let mut first_chunk = true;
    let bytes = update
        .download(
            |chunk_length, content_length| {
                if first_chunk {
                    first_chunk = false;
                    let _ = on_event.send(ChannelDownloadEvent::Started { content_length });
                }
                let _ = on_event.send(ChannelDownloadEvent::Progress { chunk_length });
            },
            || {
                let _ = on_event.send(ChannelDownloadEvent::Finished);
            },
        )
        .await?;

    Ok(webview.resources_table().add(DownloadedBytes(bytes)))
}

#[tauri::command(rename = "plugin:updater|install")]
async fn updater_install<R: Runtime>(
    webview: Webview<R>,
    update_rid: ResourceId,
    bytes_rid: ResourceId,
) -> tauri_plugin_updater::Result<()> {
    let update = webview.resources_table().get::<Update>(update_rid)?;
    let bytes = webview.resources_table().get::<DownloadedBytes>(bytes_rid)?;
    update.install(&bytes.0)?;
    let _ = webview.resources_table().close(bytes_rid);
    Ok(())
}

#[tauri::command(rename = "plugin:updater|download_and_install")]
async fn updater_download_and_install<R: Runtime>(
    webview: Webview<R>,
    rid: ResourceId,
    on_event: Channel<ChannelDownloadEvent>,
    headers: Option<Vec<(String, String)>>,
    timeout: Option<u64>,
) -> tauri_plugin_updater::Result<()> {
    let update = webview.resources_table().get::<Update>(rid)?;
    let mut update = (*update).clone();

    use http::{HeaderMap, HeaderName, HeaderValue};
    use std::str::FromStr;

    if let Some(headers) = headers {
        let mut map = HeaderMap::new();
        for (k, v) in headers {
            map.append(HeaderName::from_str(&k)?, HeaderValue::from_str(&v)?);
        }
        update.headers = map;
    }
    if let Some(timeout) = timeout {
        update.timeout = Some(Duration::from_millis(timeout));
    }

    let mut first_chunk = true;
    update
        .download_and_install(
            |chunk_length, content_length| {
                if first_chunk {
                    first_chunk = false;
                    let _ = on_event.send(ChannelDownloadEvent::Started { content_length });
                }
                let _ = on_event.send(ChannelDownloadEvent::Progress { chunk_length });
            },
            || {
                let _ = on_event.send(ChannelDownloadEvent::Finished);
            },
        )
        .await?;
    Ok(())
}

fn default_config() -> serde_json::Value {
    serde_json::json!({
        "configVersion": 2,
        "theme": "dark",
        "language": "zh",
        "defaultPage": "overview",
        "tray": { "enabled": true },
        "shortcuts": {
            "settings": "meta+,",
            "toggleSidebar": "meta+shift+l",
            "search": "meta+k"
        },
        "nav": [
            { "id": "overview", "label": "总览", "icon": "Dashboard", "visible": true },
            { "id": "proxies", "label": "网络", "icon": "SwapHoriz", "visible": true },
            { "id": "logs", "label": "日志", "icon": "Subject", "visible": true }
        ],
        "overview": {
            "kpiOrder": ["download", "upload", "connections", "nodes"],
            "bottomOrder": ["currentNode", "latency", "quickSwitch", "systemInfo", "networkInfo"]
        },
        "marquee": {
            "enabled": true,
            "showWifi": true,
            "showDate": true,
            "showTime": true
        },
        "notifications": {
            "items": [],
            "welcomeShown": false
        }
    })
}

const CURRENT_CONFIG_VERSION: u32 = 2;

/* 配置文件迁移：
 * - v1 (无 version 字段 或 version=1)：
 *     * 若 nav 中包含 profiles/rules/connections（老菜单），用默认 nav 替换
 *     * 补全缺失字段（marquee / overview / shortcuts / tray）
 * - 迁移后写回 config.json，下次读取不再触发迁移
 */
fn migrate_config(mut cfg: serde_json::Value) -> (serde_json::Value, bool) {
    let mut migrated = false;

    // 0. 确保 configVersion 存在
    let raw_ver = cfg
        .get("configVersion")
        .and_then(|v| v.as_u64())
        .unwrap_or(0);
    if raw_ver == 0 || raw_ver < CURRENT_CONFIG_VERSION as u64 {
        migrated = true;
    }

    // 1. v1 → v2：清理残留的 profiles/rules/connections 菜单
    if let Some(nav) = cfg.get("nav").and_then(|v| v.as_array()).cloned() {
        let allowed = ["overview", "proxies", "logs", "settings"];
        let cleaned: Vec<&serde_json::Value> = nav
            .iter()
            .filter(|item| {
                let id = item
                    .get("id")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                allowed.contains(&id)
            })
            .collect();
        if cleaned.len() != nav.len() {
            migrated = true;
            cfg["nav"] = serde_json::Value::Array(
                cleaned.into_iter().cloned().collect(),
            );
        }
    }

    // 2. 用默认值递归补全缺失的字段（避免空值崩溃）
    let def = default_config();
    fn deep_merge(base: &mut serde_json::Value, def: &serde_json::Value) {
        match (base, def) {
            (serde_json::Value::Object(a), serde_json::Value::Object(b)) => {
                for (k, v) in b.iter() {
                    if !a.contains_key(k) {
                        a.insert(k.clone(), v.clone());
                    } else {
                        deep_merge(a.get_mut(k).unwrap(), v);
                    }
                }
            }
            _ => {}
        }
    }
    deep_merge(&mut cfg, &def);

    // 3. 写入最新版本号
    if cfg
        .get("configVersion")
        .and_then(|v| v.as_u64())
        .unwrap_or(0)
        != CURRENT_CONFIG_VERSION as u64
    {
        cfg["configVersion"] = serde_json::Value::Number(
            serde_json::Number::from(CURRENT_CONFIG_VERSION),
        );
        migrated = true;
    }

    (cfg, migrated)
}

#[tauri::command(async)]
fn load_config(app: AppHandle) -> Result<serde_json::Value, String> {
    let path = config_path(&app)?;
    if path.exists() {
        match fs::read_to_string(&path) {
            Ok(content) => match serde_json::from_str::<serde_json::Value>(&content) {
                Ok(raw) => {
                    let (migrated_cfg, need_save) = migrate_config(raw);
                    if need_save {
                        // 迁移后静默写回，避免下次再触发
                        let _ = save_config_impl(&app, migrated_cfg.clone());
                    }
                    Ok(migrated_cfg)
                }
                Err(_) => Ok(default_config()),
            },
            Err(_) => Ok(default_config()),
        }
    } else {
        Ok(default_config())
    }
}

fn save_config_impl(app: &AppHandle, config: serde_json::Value) -> Result<(), String> {
    let path = config_path(app)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let pretty = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    fs::write(&path, pretty).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command(async)]
fn save_config(app: AppHandle, config: serde_json::Value) -> Result<(), String> {
    // 保存前自动补全缺失字段（防止前端漏传 configVersion）
    let (to_save, _) = migrate_config(config);
    save_config_impl(&app, to_save)
}

#[tauri::command(async)]
fn open_config_file(app: AppHandle) -> Result<(), String> {
    let path = config_path(&app)?;
    std::process::Command::new("open")
        .arg("-R")
        .arg(&path)
        .status()
        .map_err(|e| e.to_string())?;
    Ok(())
}

/* ---- 管理员权限检测 ---- */
#[tauri::command(async)]
fn is_admin() -> bool {
    #[cfg(unix)]
    {
        let output = std::process::Command::new("id")
            .arg("-u")
            .output();
        match output {
            Ok(o) => String::from_utf8_lossy(&o.stdout).trim() == "0",
            Err(_) => false,
        }
    }
    #[cfg(not(unix))]
    {
        // Windows: check if running as administrator
        let output = std::process::Command::new("net")
            .args(["session"])
            .output();
        match output {
            Ok(o) => o.status.success(),
            Err(_) => false,
        }
    }
}

/* ---- 本机信息 ---- */
#[tauri::command(async)]
fn system_info() -> serde_json::Value {
    let mut sys = System::new();
    sys.refresh_all();

    let os_name = System::name().unwrap_or_else(|| std::env::consts::OS.to_string());
    let os_version = System::os_version().unwrap_or_default();
    let hostname = System::host_name().unwrap_or_default();

    let cpus = sys.cpus();
    let logical_cores = cpus.len();
    let physical_cores = sys.physical_core_count().unwrap_or(logical_cores);
    let cpu_freq = cpus.first().map(|c| c.frequency()).unwrap_or(0);
    let cpu_brand = cpus
        .first()
        .map(|c| c.brand().to_string())
        .unwrap_or_default();

    let total_memory = sys.total_memory();

    // 磁盘：取第一块盘
    let disks = Disks::new_with_refreshed_list();
    let (disk_total, disk_used) = disks
        .list()
        .iter()
        .max_by_key(|d| d.total_space())
        .map(|d| {
            let total = d.total_space();
            let used = total - d.available_space();
            (total, used)
        })
        .unwrap_or((0, 0));

    serde_json::json!({
        "os": os_name,
        "osVersion": os_version,
        "hostname": hostname,
        "cpuBrand": cpu_brand,
        "cpuPhysical": physical_cores,
        "cpuLogical": logical_cores,
        "cpuFreq": cpu_freq,
        "memory": total_memory,
        "diskTotal": disk_total,
        "diskUsed": disk_used
    })
}

/* ---- 网络信息 ---- */
#[tauri::command(async)]
fn network_info() -> serde_json::Value {
    // 局域网 IP：UDP socket trick
    let lan_ip = UdpSocket::bind("0.0.0.0:0")
        .and_then(|s| {
            s.connect("8.8.8.8:80")?;
            s.local_addr().map(|a| a.ip().to_string())
        })
        .unwrap_or_else(|_| "127.0.0.1".to_string());

    // 公网 IP + 地理位置：curl ipinfo.io
    let public_info: serde_json::Value = std::process::Command::new("curl")
        .args(["-s", "--max-time", "5", "https://ipinfo.io/json"])
        .output()
        .ok()
        .and_then(|o| {
            if o.status.success() {
                serde_json::from_str(&String::from_utf8_lossy(&o.stdout)).ok()
            } else {
                None
            }
        })
        .unwrap_or(serde_json::json!({}));

    let public_ip = public_info
        .get("ip")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let country = public_info
        .get("country")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let region = public_info
        .get("region")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let city = public_info
        .get("city")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    // Wi-Fi 信息（macOS）
    let (connection_type, wifi_name, wifi_standard) = get_wifi_info();

    serde_json::json!({
        "lanIp": lan_ip,
        "publicIp": public_ip,
        "country": country,
        "region": region,
        "city": city,
        "connectionType": connection_type,
        "wifiName": wifi_name,
        "wifiStandard": wifi_standard
    })
}

#[cfg(target_os = "macos")]
fn get_wifi_info() -> (String, String, Option<u8>) {
    // 1. 找到 Wi-Fi 接口名
    let wifi_iface = find_wifi_interface();

    // 2. 获取默认路由接口
    let default_iface = get_default_route_interface();

    // 3. 判断连接类型：默认路由走 Wi-Fi 接口 → wifi，否则 → ethernet
    let is_wifi = default_iface == wifi_iface;

    if !is_wifi {
        return ("ethernet".to_string(), String::new(), None);
    }

    // 4. 获取 SSID 和 PHY 模式（从 system_profiler）
    let (ssid, standard) = get_wifi_details_from_profiler();

    ("wifi".to_string(), ssid, standard)
}

#[cfg(target_os = "macos")]
fn find_wifi_interface() -> String {
    let output = std::process::Command::new("networksetup")
        .args(["-listallhardwareports"])
        .output();

    if let Ok(o) = output {
        let text = String::from_utf8_lossy(&o.stdout);
        let mut found_wifi = false;
        for line in text.lines() {
            let trimmed = line.trim();
            if trimmed.contains("Wi-Fi") || trimmed.contains("AirPort") {
                found_wifi = true;
                continue;
            }
            if found_wifi && trimmed.starts_with("Device:") {
                return trimmed
                    .strip_prefix("Device:")
                    .unwrap_or("en0")
                    .trim()
                    .to_string();
            }
        }
    }
    "en0".to_string()
}

#[cfg(target_os = "macos")]
fn get_default_route_interface() -> String {
    let output = std::process::Command::new("route")
        .args(["-n", "get", "default"])
        .output();

    if let Ok(o) = output {
        let text = String::from_utf8_lossy(&o.stdout);
        for line in text.lines() {
            let trimmed = line.trim();
            if let Some(iface) = trimmed.strip_prefix("interface:") {
                return iface.trim().to_string();
            }
        }
    }
    String::new()
}

#[cfg(target_os = "macos")]
fn get_wifi_details_from_profiler() -> (String, Option<u8>) {
    // system_profiler 在部分 macOS/权限下可能超时或无输出，用 timeout 5s 兜底
    let output = std::process::Command::new("system_profiler")
        .args(["-timeout", "5", "SPAirPortDataType"])
        .output();

    let mut ssid = String::new();
    let mut standard: Option<u8> = None;

    if let Ok(o) = output {
        if o.status.success() && !o.stdout.is_empty() {
            let text = String::from_utf8_lossy(&o.stdout);
            let mut found_status_connected = false;
            let mut in_current_network = false;

            for line in text.lines() {
                let trimmed = line.trim();

                if trimmed.contains("Status:") && trimmed.contains("Connected") {
                    found_status_connected = true;
                    continue;
                }

                if found_status_connected && trimmed.contains("Current Network Information:") {
                    in_current_network = true;
                    continue;
                }

                if in_current_network {
                    // SSID 行：冒号结尾的非空行
                    if ssid.is_empty()
                        && trimmed.ends_with(":")
                        && !trimmed.contains("PHY Mode")
                        && !trimmed.contains("Security")
                        && !trimmed.contains("Channel")
                        && !trimmed.contains("CC")
                        && !trimmed.contains("RSSI")
                        && !trimmed.contains("Noise")
                        && !trimmed.contains("Rate")
                    {
                        let name = trimmed.trim_end_matches(':').trim();
                        if !name.is_empty() && name != "<redacted>" {
                            ssid = name.to_string();
                        } else if name == "<redacted>" {
                            ssid = "Wi-Fi".to_string();
                        }
                    }

                    // PHY Mode
                    if trimmed.contains("PHY Mode:") {
                        if trimmed.contains("802.11ax") {
                            standard = Some(6);
                        } else if trimmed.contains("802.11ac") {
                            standard = Some(5);
                        } else if trimmed.contains("802.11n") {
                            standard = Some(4);
                        } else if trimmed.contains("802.11a")
                            || trimmed.contains("802.11g")
                        {
                            standard = Some(3);
                        }
                    }

                    if !line.starts_with(' ') && !line.is_empty() && !trimmed.is_empty() {
                        in_current_network = false;
                    }
                }
            }
        }
    }

    // 回退 1：networksetup -getairportnetwork
    if ssid.is_empty() {
        let wifi_iface = find_wifi_interface();
        let ns_output = std::process::Command::new("networksetup")
            .args(["-getairportnetwork", &wifi_iface])
            .output();
        if let Ok(o) = ns_output {
            let text = String::from_utf8_lossy(&o.stdout).to_string();
            if let Some(name) = text.strip_prefix("Current Wi-Fi Network: ") {
                let n = name.trim();
                if !n.is_empty() && !n.contains("Error") && !n.starts_with("You are not") {
                    ssid = n.to_string();
                }
            }
        }
    }

    // 回退 2：wdutil info（macOS 13+）
    #[cfg(target_os = "macos")]
    if ssid.is_empty() {
        if let Ok(o) = std::process::Command::new("wdutil").args(["info"]).output() {
            let text = String::from_utf8_lossy(&o.stdout).to_string();
            for line in text.lines() {
                let trimmed = line.trim();
                if let Some(rest) = trimmed.strip_prefix("SSID:") {
                    let n = rest.trim();
                    if !n.is_empty() {
                        ssid = n.to_string();
                        break;
                    }
                }
            }
        }
    }

    // 回退 3：ipconfig getsummary（极少用，兜底）
    #[cfg(target_os = "macos")]
    if ssid.is_empty() {
        let wifi_iface = find_wifi_interface();
        if let Ok(o) = std::process::Command::new("ipconfig")
            .args(["getsummary", &wifi_iface])
            .output()
        {
            let text = String::from_utf8_lossy(&o.stdout).to_string();
            for line in text.lines() {
                let t = line.trim();
                if let Some(rest) = t.strip_prefix("SSID :") {
                    let n = rest.trim();
                    if !n.is_empty() {
                        ssid = n.to_string();
                        break;
                    }
                }
                if t.contains("802.11ax") {
                    standard = standard.or(Some(6));
                } else if t.contains("802.11ac") {
                    standard = standard.or(Some(5));
                } else if t.contains("802.11n") {
                    standard = standard.or(Some(4));
                }
            }
        }
    }

    (ssid, standard)
}

#[cfg(not(target_os = "macos"))]
fn get_wifi_info() -> (String, String, Option<u8>) {
    ("ethernet".to_string(), String::new(), None)
}

fn set_pixel_rgba(buf: &mut [u8], size: usize, x: usize, y: usize, rgba: [u8; 4]) {
    if x < size && y < size {
        let i = (y * size + x) * 4;
        buf[i] = rgba[0];
        buf[i + 1] = rgba[1];
        buf[i + 2] = rgba[2];
        buf[i + 3] = rgba[3];
    }
}

fn fill_rect_rgba(buf: &mut [u8], size: usize, x0: usize, y0: usize, x1: usize, y1: usize, rgba: [u8; 4]) {
    for y in y0..=y1.min(size - 1) {
        for x in x0..=x1.min(size - 1) {
            set_pixel_rgba(buf, size, x, y, rgba);
        }
    }
}

/* 带圆角的 filled rect（4 个 1/4 圆裁掉）；r=0 时等价于 fill_rect_rgba */
fn fill_round_rect_rgba(
    buf: &mut [u8],
    size: usize,
    x0: usize,
    y0: usize,
    x1: usize,
    y1: usize,
    radius: usize,
    rgba: [u8; 4],
) {
    let r = radius.min((x1 - x0) / 2).min((y1 - y0) / 2);
    let r2 = (r * r) as i32;
    for y in y0..=y1.min(size - 1) {
        for x in x0..=x1.min(size - 1) {
            let mut inside = true;
            // 左上角
            let (cx, cy) = (x0 + r, y0 + r);
            let (dx, dy) = (x as i32 - cx as i32, y as i32 - cy as i32);
            if x < cx && y < cy && dx * dx + dy * dy > r2 {
                inside = false;
            }
            // 右上角
            let (cx, cy) = (x1 - r, y0 + r);
            let (dx, dy) = (x as i32 - cx as i32, y as i32 - cy as i32);
            if x > cx && y < cy && dx * dx + dy * dy > r2 {
                inside = false;
            }
            // 左下角
            let (cx, cy) = (x0 + r, y1 - r);
            let (dx, dy) = (x as i32 - cx as i32, y as i32 - cy as i32);
            if x < cx && y > cy && dx * dx + dy * dy > r2 {
                inside = false;
            }
            // 右下角
            let (cx, cy) = (x1 - r, y1 - r);
            let (dx, dy) = (x as i32 - cx as i32, y as i32 - cy as i32);
            if x > cx && y > cy && dx * dx + dy * dy > r2 {
                inside = false;
            }
            if inside {
                set_pixel_rgba(buf, size, x, y, rgba);
            }
        }
    }
}

#[allow(dead_code)]
fn set_pixel(buf: &mut [u8], size: usize, x: usize, y: usize) {
    set_pixel_rgba(buf, size, x, y, [0, 0, 0, 255]);
}

#[allow(dead_code)]
fn fill_rect(buf: &mut [u8], size: usize, x0: usize, y0: usize, x1: usize, y1: usize) {
    fill_rect_rgba(buf, size, x0, y0, x1, y1, [0, 0, 0, 255]);
}

struct TrayPalette {
    bg: [u8; 4],       // 卡片填充
    border: [u8; 4],   // 外框线
    header: [u8; 4],   // 顶部标题栏
    ring: [u8; 4],     // 标题栏两个小环
    digit: [u8; 4],    // 日期数字颜色
}

fn palette_for(theme: &str) -> TrayPalette {
    if theme == "light" {
        TrayPalette {
            // —— 与 MarqueeTicker light 版视觉对齐：
            //    CalendarDateBadge 边框 borderColor = text.secondary
            //    顶部标题栏 bgcolor = text.secondary
            //    两个小环 bgcolor = background.paper（白色）
            //    日期数字 color = text.primary
            bg: [0xff, 0xff, 0xff, 0xff], // background.paper
            border: [0x9e, 0x9e, 0x9e, 0xff], // text.secondary (grey.500)
            header: [0x9e, 0x9e, 0x9e, 0xff], // text.secondary
            ring: [0xff, 0xff, 0xff, 0xff],   // background.paper
            digit: [0x21, 0x21, 0x21, 0xff],  // text.primary (grey.900)
        }
    } else {
        // dark 模式 + system（默认走 dark，与应用默认 theme=dark 一致）
        TrayPalette {
            // —— 与 MarqueeTicker dark 版视觉对齐：
            //    borderColor = text.secondary (grey.400 偏浅灰在深色基底上)
            //    顶部标题栏 bgcolor = text.secondary
            //    环 bgcolor = background.paper (接近 #121212)
            //    数字 color = text.primary (#fff)
            bg: [0x1e, 0x1e, 0x1e, 0xff],     // background.paper (#1e1e1e)
            border: [0xbd, 0xbd, 0xbd, 0xff], // text.secondary (grey.300)
            header: [0xbd, 0xbd, 0xbd, 0xff], // text.secondary
            ring: [0x1e, 0x1e, 0x1e, 0xff],   // background.paper
            digit: [0xff, 0xff, 0xff, 0xff],  // text.primary (#fff)
        }
    }
}

/* 托盘日历图标：严格复刻 MarqueeTicker CalendarDateBadge
 *   结构比例 26x26 -> 64x64 (scale ≈ 2.46)
 *   - 圆角外框（borderRadius 1px ≈ 3px in 64x64）
 *   - 顶部标题栏填充（高度 7/26 ≈ 17px），中间 2 个白/深色小环
 *   - 下方居中的日期数字（1 位 12px / 2 位 10px → scale 后自动适配）
 */
fn day_icon(day: u32, theme: &str, marquee_enabled: bool) -> Image<'static> {
    const DIGITS: [[u8; 7]; 10] = [
        [0b01110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
        [0b00100, 0b01100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
        [0b01110, 0b10001, 0b00001, 0b00010, 0b00100, 0b01000, 0b11111],
        [0b01110, 0b10001, 0b00001, 0b00110, 0b00001, 0b10001, 0b01110],
        [0b00010, 0b00110, 0b01010, 0b10010, 0b11111, 0b00010, 0b00010],
        [0b11111, 0b10000, 0b11110, 0b00001, 0b00001, 0b10001, 0b01110],
        [0b00110, 0b01000, 0b10000, 0b11110, 0b10001, 0b10001, 0b01110],
        [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b01000, 0b01000],
        [0b01110, 0b10001, 0b10001, 0b01110, 0b10001, 0b10001, 0b01110],
        [0b01110, 0b10001, 0b10001, 0b01111, 0b00001, 0b00010, 0b01100],
    ];

    const SIZE: usize = 64;
    let mut buf = vec![0u8; SIZE * SIZE * 4];

    let pal = palette_for(theme);

    // —— marquee.enabled == false 时，我们用“极简版日期圆贴”，仍然保持 Marquee 的配色
    // —— 否则完整复刻 CalendarDateBadge
    if !marquee_enabled {
        // 画一枚圆形/圆角方形，居中一位/两位数字（与 marquee showTime 字体风格一致）
        let body_x0: usize = 8;
        let body_y0: usize = 8;
        let body_x1: usize = 55;
        let body_y1: usize = 55;
        let radius: usize = 12;
        fill_round_rect_rgba(&mut buf, SIZE, body_x0, body_y0, body_x1, body_y1, radius, pal.border);
        let inner_pad: usize = 2;
        fill_round_rect_rgba(
            &mut buf,
            SIZE,
            body_x0 + inner_pad,
            body_y0 + inner_pad,
            body_x1 - inner_pad,
            body_y1 - inner_pad,
            radius.max(inner_pad) - inner_pad,
            pal.bg,
        );
        draw_digits_into(
            &mut buf,
            SIZE,
            DIGITS,
            day,
            body_x0 + inner_pad + 2,
            body_y0 + inner_pad + 2,
            body_x1 - inner_pad - 2,
            body_y1 - inner_pad - 2,
            pal.digit,
        );
        return Image::new_owned(buf, SIZE as u32, SIZE as u32);
    }

    // —— 完整复刻 CalendarDateBadge (26×26 -> 64×64) ——
    // 主体外框：留出日历环上方空间（与前端：顶部有两个小圆孔在 border 之上）
    let body_x0: usize = 4;
    let body_y0: usize = 10; // 顶部给 calendar-rings 留出空间 (≈ 9 像素)
    let body_x1: usize = 59;
    let body_y1: usize = 61;
    let radius: usize = 3; // CSS borderRadius=1 ≈ 3px in 64x64

    // 1. 外框（描边 + 内部填充）
    fill_round_rect_rgba(&mut buf, SIZE, body_x0, body_y0, body_x1, body_y1, radius, pal.border);
    // 内部填充：留 3px 作为边框厚度（CSS border=1.5 -> 3px）
    let inner_pad: usize = 3;
    fill_round_rect_rgba(
        &mut buf,
        SIZE,
        body_x0 + inner_pad,
        body_y0 + inner_pad,
        body_x1 - inner_pad,
        body_y1 - inner_pad,
        radius.max(inner_pad) - inner_pad,
        pal.bg,
    );

    // 2. 顶部标题栏（填充）：CSS 高度 7/26 ≈ 27% 主体高度
    //   主体内部高度 ≈ (58 - 13) = 45，27% ≈ 12 px
    let header_h: usize = 12;
    let header_y0 = body_y0 + inner_pad;
    let header_y1 = header_y0 + header_h;
    fill_rect_rgba(
        &mut buf,
        SIZE,
        body_x0 + inner_pad,
        header_y0,
        body_x1 - inner_pad,
        header_y1,
        pal.header,
    );

    // 3. 两个日历环：CSS 里 width:2 height:4，位于标题栏内部居中
    //    CSS: gap:0.5 两个方块在标题栏里均匀分布
    //    环宽 2 → ≈ 5 px，环高 4 → ≈ 10 px
    let ring_w: usize = 5;
    let ring_h: usize = 10;
    let inner_body_w = body_x1 - body_x0 - inner_pad * 2;
    let center1_x = body_x0 + inner_pad + inner_body_w * 30 / 100;
    let center2_x = body_x0 + inner_pad + inner_body_w * 70 / 100;
    let center_y = (header_y0 + header_y1) / 2;

    let ring1_x0 = center1_x - ring_w / 2;
    let ring1_x1 = ring1_x0 + ring_w - 1;
    let ring_y0 = center_y - ring_h / 2;
    let ring_y1 = ring_y0 + ring_h - 1;
    fill_rect_rgba(&mut buf, SIZE, ring1_x0, ring_y0, ring1_x1, ring_y1, pal.ring);
    let ring2_x0 = center2_x - ring_w / 2;
    let ring2_x1 = ring2_x0 + ring_w - 1;
    fill_rect_rgba(&mut buf, SIZE, ring2_x0, ring_y0, ring2_x1, ring_y1, pal.ring);

    // 4. 日期数字（标题栏下方到主体底部，居中）
    let digit_y0 = header_y1 + 1;
    let digit_y1 = body_y1 - inner_pad - 1;
    let digit_x0 = body_x0 + inner_pad + 1;
    let digit_x1 = body_x1 - inner_pad - 1;
    draw_digits_into(
        &mut buf,
        SIZE,
        DIGITS,
        day,
        digit_x0,
        digit_y0,
        digit_x1,
        digit_y1,
        pal.digit,
    );

    Image::new_owned(buf, SIZE as u32, SIZE as u32)
}

fn draw_digits_into(
    buf: &mut [u8],
    size: usize,
    digits_pattern: [[u8; 7]; 10],
    day: u32,
    x0: usize,
    y0: usize,
    x1: usize,
    y1: usize,
    rgba: [u8; 4],
) {
    let digit_area_h = y1 - y0 + 1;
    let digit_area_w = x1 - x0 + 1;

    let digits: Vec<usize> = day
        .to_string()
        .chars()
        .filter_map(|c| c.to_digit(10))
        .map(|d| d as usize)
        .collect();
    let count = digits.len();

    const ROWS: usize = 7;
    const COLS_PER_DIGIT: usize = 5;
    const GAP: usize = 1;

    let scale_by_h = digit_area_h / ROWS;
    let combined_cols = count * COLS_PER_DIGIT + count.saturating_sub(1) * GAP;
    let scale_by_w = if combined_cols > 0 { digit_area_w / combined_cols } else { 1 };
    let scale: usize = scale_by_h.min(scale_by_w).max(3);

    let combined_width = combined_cols * scale;
    let combined_height = ROWS * scale;
    let offset_x = x0 + (digit_area_w - combined_width) / 2;
    let offset_y = y0 + (digit_area_h - combined_height) / 2;

    for (idx, &d) in digits.iter().enumerate() {
        let base_col = idx * (COLS_PER_DIGIT + GAP);
        for r in 0..ROWS {
            for c in 0..COLS_PER_DIGIT {
                let on = (digits_pattern[d][r] >> (4 - c)) & 1 == 1;
                if on {
                    for sy in 0..scale {
                        for sx in 0..scale {
                            let px = offset_x + (base_col + c) * scale + sx;
                            let py = offset_y + r * scale + sy;
                            set_pixel_rgba(buf, size, px, py, rgba);
                        }
                    }
                }
            }
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            load_config,
            save_config,
            open_config_file,
            is_admin,
            system_info,
            network_info,
            relaunch_as_admin,
            // === updater 自定义 IPC（覆盖 plugin-updater 默认命令，注入 UPDATER_ENDPOINT）===
            // 每条命令用 #[rename = "plugin:updater|..."] 重命名为官方前端 API 的 invoke 名字，
            // tauri 2.x 中 invoke_handler 后注册会覆盖插件提供的同名命令，
            // 前端仍用 @tauri-apps/plugin-updater，完全无感但走我们带 env override 的实现
            updater_check,
            updater_download,
            updater_install,
            updater_download_and_install,
        ])
        .setup(|app| {
            let handle: AppHandle = app.handle().clone();
            // 使用与命令层完全一致的 config_path（管理员模式下回写原用户目录）
            // 任何一步失败都降级为默认配置，绝不把异常抛到 setup → 避免 setup 返回 Err 导致窗口白屏
            let path = config_path(&handle).ok();
            let config: serde_json::Value = path
                .as_ref()
                .filter(|p| p.exists())
                .and_then(|p| fs::read_to_string(p).ok())
                .and_then(|c| serde_json::from_str(&c).ok())
                .unwrap_or_else(default_config);
            let path_opt: Option<PathBuf> = path.clone();
            // 启动时顺便跑一次迁移（如果没有 configVersion 或有旧残留字段就静默写回）
            if let Some(p) = path {
                let (migrated, changed) = migrate_config(config.clone());
                if changed {
                    let _ = std::fs::create_dir_all(p.parent().unwrap_or(&p));
                    let _ = serde_json::to_string_pretty(&migrated)
                        .ok()
                        .and_then(|s| fs::write(&p, s).ok());
                }
            }
            let tray_enabled = config
                .get("tray")
                .and_then(|t| t.get("enabled"))
                .and_then(|e| e.as_bool())
                .unwrap_or(true);
            if !tray_enabled {
                return Ok(());
            }

            app.on_menu_event(|app, event| match event.id().as_ref() {
                "show" => {
                    if let Some(w) = app.get_webview_window("main") {
                        let _ = w.show();
                        let _ = w.set_focus();
                    }
                }
                "quit" => app.exit(0),
                _ => {}
            });

            let day = chrono::Local::now().day();
            let theme_now = config
                .get("theme")
                .and_then(|t| t.as_str())
                .unwrap_or("dark")
                .to_string();
            let marquee_on_now = config
                .get("marquee")
                .and_then(|m| m.get("enabled"))
                .and_then(|v| v.as_bool())
                .unwrap_or(true);

            let menu = Menu::new(app)?;
            let show_item = MenuItem::with_id(app, "show", "显示主窗口", true, None::<&str>)?;
            let sep = PredefinedMenuItem::separator(app)?;
            let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            menu.append(&show_item)?;
            menu.append(&sep)?;
            menu.append(&quit_item)?;

            let tooltip = format!(
                "超级内核 · 日历 {}日 · {}主题 · 跑马灯{}",
                day,
                match theme_now.as_str() {
                    "light" => "浅色",
                    "dark" => "深色",
                    _ => "跟随系统",
                },
                if marquee_on_now { "开" } else { "关" }
            );

            let tray = TrayIconBuilder::with_id("main-tray")
                .icon(day_icon(day, &theme_now, marquee_on_now))
                .menu(&menu)
                // macOS 下 template 会让系统按菜单栏外观染色，与我们“严格复刻 Marquee 配色”的目标冲突，
                // 因此不再 icon_as_template(true)，让图标以完整色彩呈现。
                .tooltip(&tooltip)
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                })
                .build(app)?;

            let tray_icon = tray.clone();
            let handle_for_watcher = handle.clone();
            // 复用 setup 开头已经 clone 过的 path_opt（避免对部分移动后的 path 再次 move）
            tauri::async_runtime::spawn(async move {
                let mut last_day = chrono::Local::now().day();
                let mut last_theme: String = theme_now;
                let mut last_marquee: bool = marquee_on_now;
                let mut tick: u64 = 0;
                loop {
                    tokio::time::sleep(std::time::Duration::from_secs(5)).await;
                    let day_now = chrono::Local::now().day();

                    // 每 5 tick = 25s 重新读盘一次，捕获用户在“设置”里修改 theme / marquee / tray 的动作
                    // （前端 save_config 会立刻写盘，我们不需要建立文件 watcher）
                    tick = tick.wrapping_add(1);
                    let mut new_theme = last_theme.clone();
                    let mut new_marquee = last_marquee;
                    if tick % 5 == 0 {
                        if let Some(p) = path_opt.clone() {
                            if let Ok(txt) = tokio::fs::read_to_string(&p).await {
                                if let Ok(v) = serde_json::from_str::<serde_json::Value>(&txt) {
                                    new_theme = v
                                        .get("theme")
                                        .and_then(|t| t.as_str())
                                        .unwrap_or("dark")
                                        .to_string();
                                    new_marquee = v
                                        .get("marquee")
                                        .and_then(|m| m.get("enabled"))
                                        .and_then(|x| x.as_bool())
                                        .unwrap_or(true);

                                    // tray.enabled 如果被用户从 true → false：调用 AppHandleExt 的 remove_tray_by_id
                                    let still_on = v
                                        .get("tray")
                                        .and_then(|t| t.get("enabled"))
                                        .and_then(|x| x.as_bool())
                                        .unwrap_or(true);
                                    if !still_on {
                                        let _handle = handle_for_watcher.clone();
                                        let _ = _handle.remove_tray_by_id("main-tray");
                                        return;
                                    }

                                    // tooltip 同步刷新：反映当日日期、主题、跑马灯
                                    let tt = format!(
                                        "超级内核 · 日历 {}日 · {}主题 · 跑马灯{}",
                                        day_now,
                                        match new_theme.as_str() {
                                            "light" => "浅色",
                                            "dark" => "深色",
                                            _ => "跟随系统",
                                        },
                                        if new_marquee { "开" } else { "关" }
                                    );
                                    let _ = tray_icon.set_tooltip(Some(&tt));
                                }
                            }
                        }
                    }

                    let style_changed = new_theme != last_theme || new_marquee != last_marquee;
                    if day_now != last_day || style_changed {
                        let _ = tray_icon.set_icon(Some(day_icon(day_now, &new_theme, new_marquee)));
                        last_day = day_now;
                        last_theme = new_theme;
                        last_marquee = new_marquee;
                    }
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
