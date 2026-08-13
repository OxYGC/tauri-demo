import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  Divider,
  TextField,
  MenuItem,
  Stack,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Tooltip,
  Snackbar,
  CircularProgress,
  LinearProgress,
} from "@mui/material";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import EditIcon from "@mui/icons-material/Edit";
import KeyboardIcon from "@mui/icons-material/Keyboard";
import ShieldIcon from "@mui/icons-material/Shield";
import UpdateIcon from "@mui/icons-material/Update";
import DownloadIcon from "@mui/icons-material/Download";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CodeIcon from "@mui/icons-material/Code";
import CopyrightIcon from "@mui/icons-material/Copyright";
import NewReleasesIcon from "@mui/icons-material/NewReleases";
import { invoke } from "@tauri-apps/api/core";
import { type Update } from "@tauri-apps/plugin-updater";
import { useConfig, formatShortcut, type AppConfig } from "../config";
import { useIsAdmin } from "../hooks/useSystemData";
import { useAppUpdater } from "../hooks/useAppUpdater";

/* 内嵌于“关于”栏的更新区域：美化 + 保留完整操作能力 */
function AboutUpdateBlock({
  updater,
  setSnack,
}: {
  updater: ReturnType<typeof useAppUpdater>;
  setSnack: (v: { kind: "success" | "error" | "info"; text: string } | null) => void;
}) {
  const currentVer = updater.currentVersion;
  const checking = updater.status === "checking";
  const downloading = updater.status === "downloading";
  const installing = updater.status === "installing";
  const updateInfo: Update | null = updater.available;
  const progressPct = updater.progressPct;
  const usedDelta = updater.usedDelta;
  const latest = updater.cached?.version ?? updateInfo?.version ?? "";
  const busy = checking || downloading || installing;
  const hasUpdate = !!latest;

  const handleCheck = async () => {
    const next = await updater.checkForUpdates();
    if (updater.errorText) {
      setSnack({ kind: "error", text: `检查更新失败: ${updater.errorText}` });
    } else if (!next) {
      setSnack({ kind: "success", text: "当前已是最新版本" });
    } else {
      const deltaHint = updater.cached?.hasDelta ? "（含增量包）" : "";
      setSnack({
        kind: "info",
        text: `发现新版本 v${next.version}${deltaHint}，可点击下载并安装`,
      });
    }
  };

  const handleDownloadAndInstall = async () => {
    try {
      await updater.downloadAndInstall();
    } catch {
      // 兜底错误交给 hook 内 setErrorText 即可
    }
    if (updater.status === "error" && updater.errorText) {
      setSnack({ kind: "error", text: `下载更新失败: ${updater.errorText}` });
    }
  };

  return (
    <Box
      sx={{
        mt: 1.5,
        mb: 0.5,
        p: 1.5,
        border: 1,
        borderColor: "divider",
        borderRadius: 2,
        bgcolor: (t) => (t.palette.mode === "dark" ? "#1b1b1f" : "#fafafa"),
        backgroundImage: (t) =>
          `linear-gradient(135deg, ${t.palette.primary.main}0a 0%, ${t.palette.warning.main}0a 100%)`,
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.25}
        alignItems={{ xs: "flex-start", sm: "center" }}
        justifyContent="space-between"
        sx={{ mb: (updateInfo?.body || updater.cached?.body) || downloading || installing ? 1.25 : 0 }}
      >
        <Box>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
            <NewReleasesIcon
              color={hasUpdate ? "warning" : "success"}
              sx={{ fontSize: 18 }}
            />
            <Typography sx={{ fontWeight: 800, fontSize: 15 }}>
              {hasUpdate ? `最新版本 v${latest}` : "版本状态"}
            </Typography>
            {hasUpdate && updater.cached?.hasDelta && (
              <Chip label="支持增量" size="small" color="warning" variant="outlined" />
            )}
            {!hasUpdate && currentVer && (
              <Chip label="已为最新" size="small" color="success" variant="outlined" />
            )}
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip label={`v${currentVer || "0.0.1"}`} size="small" color="primary" />
            {hasUpdate && (
              <>
                <Typography color="text.secondary">→</Typography>
                <Chip
                  label={`v${latest}${usedDelta ? " · 增量" : ""}`}
                  size="small"
                  color="warning"
                />
              </>
            )}
          </Stack>
        </Box>

        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            variant="outlined"
            startIcon={checking ? <CircularProgress size={14} /> : <UpdateIcon />}
            onClick={handleCheck}
            disabled={busy}
          >
            {checking ? "检查中…" : "检查更新"}
          </Button>
          <Button
            size="small"
            variant="contained"
            color="warning"
            startIcon={
              installing ? (
                <RestartAltIcon />
              ) : downloading ? (
                <CircularProgress size={14} />
              ) : (
                <DownloadIcon />
              )
            }
            onClick={handleDownloadAndInstall}
            disabled={!hasUpdate || busy}
          >
            {installing
              ? "安装中…"
              : downloading
              ? progressPct !== null
                ? `下载 ${progressPct}%`
                : "下载中…"
              : "下载并安装"}
          </Button>
        </Stack>
      </Stack>

      {(updateInfo?.body || updater.cached?.body) && (
        <Box
          sx={{
            p: 1.25,
            borderRadius: 1.5,
            border: 1,
            borderColor: "divider",
            bgcolor: "background.paper",
            fontSize: 13,
            color: "text.secondary",
            whiteSpace: "pre-wrap",
            mb: 1,
          }}
        >
          <Typography sx={{ fontSize: 12, color: "text.disabled", mb: 0.5 }}>
            更新日志
          </Typography>
          {updateInfo?.body ?? updater.cached?.body}
        </Box>
      )}

      {(downloading || installing) && (
        <Box>
          <LinearProgress
            variant={progressPct === null ? "indeterminate" : "determinate"}
            value={progressPct ?? 0}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
            {installing
              ? "正在安装更新包，完成后应用将自动重启"
              : progressPct !== null
              ? `下载进度 ${progressPct}%（${usedDelta ? "增量" : "全量"}，失败自动回退全量）`
              : "正在准备下载更新包…"}
          </Typography>
        </Box>
      )}

      {!busy && !hasUpdate && currentVer && (
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ color: "success.main" }}>
          <CheckCircleOutlineIcon sx={{ fontSize: 16 }} />
          <Typography variant="caption">
            最新版本已到位（支持增量更新，失败自动回退全量）
          </Typography>
        </Stack>
      )}
    </Box>
  );
}

const SettingRow = ({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children?: React.ReactNode;
}) => (
  <ListItem divider>
    <ListItemText
      primary={title}
      secondary={desc}
      primaryTypographyProps={{ fontSize: 14, fontWeight: 500 }}
      secondaryTypographyProps={{ fontSize: 12 }}
    />
    <ListItemSecondaryAction>{children}</ListItemSecondaryAction>
  </ListItem>
);

/* ---- 快捷键录制按钮 ---- */
function ShortcutRecorder({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    if (!recording) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === "Escape") {
        setRecording(false);
        return;
      }
      if (e.key === "Meta" || e.key === "Control" || e.key === "Shift" || e.key === "Alt") {
        return;
      }
      const parts: string[] = [];
      if (e.metaKey) parts.push("meta");
      if (e.ctrlKey) parts.push("ctrl");
      if (e.shiftKey) parts.push("shift");
      if (e.altKey) parts.push("alt");
      parts.push(e.key.toLowerCase());
      onChange(parts.join("+"));
      setRecording(false);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [recording, onChange]);

  return (
    <Button
      size="small"
      variant={recording ? "contained" : "outlined"}
      color={recording ? "primary" : "inherit"}
      startIcon={<KeyboardIcon />}
      onClick={() => setRecording((v) => !v)}
      sx={{ minWidth: 160, justifyContent: "flex-start" }}
    >
      {recording ? "按下快捷键…" : formatShortcut(value)}
    </Button>
  );
}

/* ---- 配置文件查看/编辑对话框 ---- */
function ConfigFileEditor({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { config, setConfig, openFile } = useConfig();
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setText(JSON.stringify(config, null, 2));
      setError("");
    }
  }, [open, config]);

  const apply = () => {
    try {
      const parsed = JSON.parse(text) as AppConfig;
      setConfig(parsed);
      setError("");
      onClose();
    } catch (e) {
      setError("JSON 格式错误: " + (e as Error).message);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <EditIcon fontSize="small" />
        配置文件 (config.json)
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 1.5 }}>
            {error}
          </Alert>
        )}
        <TextField
          multiline
          fullWidth
          minRows={16}
          maxRows={24}
          value={text}
          onChange={(e) => setText(e.target.value)}
          sx={{
            fontFamily: "monospace",
            fontSize: 13,
            "& .MuiInputBase-input": { fontFamily: "monospace", fontSize: 13 },
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button startIcon={<FolderOpenIcon />} onClick={() => openFile()}>
          在文件夹中打开
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={apply}>
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function SettingsPage() {
  const { config, setConfig, openFile } = useConfig();
  const [configOpen, setConfigOpen] = useState(false);
  const admin = useIsAdmin();
  const [adminLaunching, setAdminLaunching] = useState(false);
  const [adminMsg, setAdminMsg] = useState<
    { kind: "success" | "error" | "info"; text: string } | null
  >(null);
  const updater = useAppUpdater();
  const currentVer = updater.currentVersion;
  const latest = updater.cached?.version ?? updater.available?.version ?? "";
  const hasUpdate = !!latest;

  const update = (patch: Partial<AppConfig>) => setConfig({ ...config, ...patch });

  const handleLaunchAdmin = async () => {
    setAdminLaunching(true);
    setAdminMsg(null);
    try {
      await invoke("relaunch_as_admin");
      // 成功：当前实例即将退出
      setAdminMsg({ kind: "success", text: "已启动管理员实例，当前窗口将关闭" });
    } catch (e) {
      const err = String(e);
      if (err.includes("取消")) {
        setAdminMsg({ kind: "error", text: "已取消授权" });
      } else {
        setAdminMsg({ kind: "error", text: `启动失败: ${err}` });
      }
    } finally {
      setAdminLaunching(false);
    }
  };

  return (
    <Box>
      <Stack spacing={2}>
        {/* 应用设置 */}
        <Card variant="outlined">
          <CardContent sx={{ pb: 0 }}>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>应用设置</Typography>
          </CardContent>
          <List dense>
            <SettingRow
              title="管理员方式启动"
              desc={admin ? "当前已以管理员权限运行" : "提升权限后部分功能可用"}
            >
              <Tooltip
                title={admin ? "已在管理员模式下运行" : "将以管理员权限重新启动应用"}
              >
                <span>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={
                      adminLaunching ? (
                        <CircularProgress size={14} />
                      ) : (
                        <ShieldIcon />
                      )
                    }
                    onClick={handleLaunchAdmin}
                    disabled={admin !== false || adminLaunching}
                    color={admin === false ? "warning" : "inherit"}
                    sx={
                      admin !== false
                        ? { opacity: 0.55, "&.Mui-disabled": { opacity: 0.55 } }
                        : undefined
                    }
                  >
                    {adminLaunching ? "启动中…" : "管理员方式启动"}
                  </Button>
                </span>
              </Tooltip>
            </SettingRow>
            <SettingRow title="开机自启" desc="登录时自动启动">
              <Switch defaultChecked />
            </SettingRow>
            <SettingRow title="关闭时最小化到托盘" desc="点击关闭按钮时隐藏到系统托盘">
              <Switch defaultChecked />
            </SettingRow>
            <SettingRow title="默认页面" desc="应用启动后默认显示的页面">
              <TextField
                select
                size="small"
                value={config.defaultPage}
                onChange={(e) => update({ defaultPage: e.target.value })}
                sx={{ width: 140 }}
              >
                {config.nav.filter((n) => n.visible).map((n) => (
                  <MenuItem key={n.id} value={n.id}>
                    {n.label}
                  </MenuItem>
                ))}
                <MenuItem value="settings">设置</MenuItem>
              </TextField>
            </SettingRow>
            <SettingRow title="主题模式" desc="切换深浅色主题">
              <TextField
                select
                size="small"
                value={config.theme}
                onChange={(e) => update({ theme: e.target.value as AppConfig["theme"] })}
                sx={{ width: 120 }}
              >
                <MenuItem value="light">浅色</MenuItem>
                <MenuItem value="dark">深色</MenuItem>
                <MenuItem value="system">跟随系统</MenuItem>
              </TextField>
            </SettingRow>
            <SettingRow title="语言" desc="界面显示语言">
              <TextField
                select
                size="small"
                value={config.language}
                onChange={(e) =>
                  update({ language: e.target.value as AppConfig["language"] })
                }
                sx={{ width: 120 }}
              >
                <MenuItem value="zh">简体中文</MenuItem>
                <MenuItem value="en">English</MenuItem>
              </TextField>
            </SettingRow>
          </List>
        </Card>

        {/* 状态栏 / 托盘 */}
        <Card variant="outlined">
          <CardContent sx={{ pb: 0 }}>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>状态栏</Typography>
          </CardContent>
          <List dense>
            <SettingRow title="显示状态栏图标" desc="在菜单栏显示日期角标（类似小历）">
              <Switch
                checked={config.tray.enabled}
                onChange={(e) =>
                  update({ tray: { ...config.tray, enabled: e.target.checked } })
                }
              />
            </SettingRow>
          </List>
        </Card>

        {/* 快捷键 */}
        <Card variant="outlined">
          <CardContent sx={{ pb: 0 }}>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>快捷键</Typography>
          </CardContent>
          <List dense>
            <SettingRow title="打开设置" desc="跳转到设置页面">
              <ShortcutRecorder
                value={config.shortcuts.settings}
                onChange={(v) =>
                  update({ shortcuts: { ...config.shortcuts, settings: v } })
                }
              />
            </SettingRow>
            <SettingRow title="显示 / 关闭左侧栏" desc="切换侧边栏显隐">
              <ShortcutRecorder
                value={config.shortcuts.toggleSidebar}
                onChange={(v) =>
                  update({ shortcuts: { ...config.shortcuts, toggleSidebar: v } })
                }
              />
            </SettingRow>
            <SettingRow title="显示搜索栏" desc="聚焦顶部搜索框">
              <ShortcutRecorder
                value={config.shortcuts.search}
                onChange={(v) =>
                  update({ shortcuts: { ...config.shortcuts, search: v } })
                }
              />
            </SettingRow>
          </List>
        </Card>

        {/* 底部跑马灯 */}
        <Card variant="outlined">
          <CardContent sx={{ pb: 0 }}>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>底部跑马灯</Typography>
          </CardContent>
          <List dense>
            <SettingRow title="启用跑马灯" desc="底部行情滚动条">
              <Switch
                checked={config.marquee.enabled}
                onChange={(e) =>
                  update({ marquee: { ...config.marquee, enabled: e.target.checked } })
                }
              />
            </SettingRow>
            <SettingRow title="显示日期角标" desc="右侧显示当日日期">
              <Switch
                checked={config.marquee.showDate}
                onChange={(e) =>
                  update({ marquee: { ...config.marquee, showDate: e.target.checked } })
                }
              />
            </SettingRow>
            <SettingRow title="显示时间" desc="右侧显示当前时间">
              <Switch
                checked={config.marquee.showTime}
                onChange={(e) =>
                  update({ marquee: { ...config.marquee, showTime: e.target.checked } })
                }
              />
            </SettingRow>
            <SettingRow title="显示网络状态" desc="Wi-Fi 标识，悬停查看延迟">
              <Switch
                checked={config.marquee.showWifi}
                onChange={(e) =>
                  update({ marquee: { ...config.marquee, showWifi: e.target.checked } })
                }
              />
            </SettingRow>
          </List>
        </Card>

        {/* 配置文件 */}
        <Card variant="outlined">
          <CardContent>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>配置文件</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              所有配置（主题/快捷键/跑马灯/托盘/通知/更新状态）都持久化在 config.json，
              点击下方按钮查看或直接在编辑器中修改，保存后会立刻生效。
            </Typography>
            <Stack direction="row" spacing={1.5}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<EditIcon />}
                onClick={() => setConfigOpen(true)}
              >
                查看并编辑
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<FolderOpenIcon />}
                onClick={() => openFile()}
              >
                在文件夹中打开
              </Button>
            </Stack>
          </CardContent>
        </Card>

        {/* 关于（内嵌更新模块 + 美化） */}
        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 1.25 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2.5,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: (t) =>
                    t.palette.mode === "dark"
                      ? "primary.main"
                      : "primary.light",
                  color: (t) =>
                    t.palette.mode === "dark" ? "#000" : "primary.dark",
                  boxShadow: (t) => `0 6px 18px ${t.palette.primary.main}33`,
                  flexShrink: 0,
                }}
              >
                <CodeIcon sx={{ fontSize: 24 }} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 900, fontSize: 16, lineHeight: 1.2 }}>
                  超级内核
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip
                    label={`v${currentVer || "0.0.1"}`}
                    size="small"
                    color="primary"
                    sx={{ fontWeight: 700 }}
                  />
                  {hasUpdate && (
                    <Chip
                      icon={<UpdateIcon sx={{ fontSize: 13, ml: 0.5 }} />}
                      label={`最新版本 v${latest}`}
                      size="small"
                      color="warning"
                      sx={{ fontWeight: 700 }}
                      onClick={() => {
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    />
                  )}
                </Stack>
              </Box>
            </Stack>

            <Divider sx={{ mb: 1.25 }} />

            {/* 关于栏内嵌更新（取代独立的“自动更新”卡片） */}
            <AboutUpdateBlock updater={updater} setSnack={setAdminMsg} />

            <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1.25 }}>
              <CopyrightIcon sx={{ fontSize: 16, color: "text.disabled" }} />
              <Typography variant="body2" color="text.secondary">
                © 2026 超级内核 · 基于 Tauri 2 + React 18 + MUI 6 构建
              </Typography>
            </Stack>
            <Stack
              direction="row"
              alignItems="center"
              spacing={0.75}
              sx={{ mt: 0.5, color: "text.secondary" }}
            >
              <Typography variant="body2" color="text.secondary">
                技术栈：
              </Typography>
              {["Tauri 2", "React 18", "MUI 6", "Rust"].map((s) => (
                <Chip
                  key={s}
                  label={s}
                  size="small"
                  variant="outlined"
                  sx={{ color: "text.secondary", borderColor: "divider" }}
                />
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      <ConfigFileEditor open={configOpen} onClose={() => setConfigOpen(false)} />

      <Snackbar
        open={adminMsg !== null}
        autoHideDuration={4000}
        onClose={() => setAdminMsg(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setAdminMsg(null)}
          severity={
            adminMsg?.kind === "success"
              ? "success"
              : adminMsg?.kind === "info"
              ? "info"
              : "error"
          }
          variant="filled"
          sx={{ width: "100%" }}
        >
          {adminMsg?.text}
        </Alert>
      </Snackbar>
    </Box>
  );
}
