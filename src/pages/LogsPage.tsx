import { useState, useMemo, useRef, useEffect } from "react";
import {
  Box,
  Typography,
  Chip,
  Stack,
  Paper,
  IconButton,
  Tooltip,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DownloadIcon from "@mui/icons-material/Download";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import VerticalAlignBottomIcon from "@mui/icons-material/VerticalAlignBottom";
import { type LogItem } from "../data/mock";

const levelColor: Record<LogItem["type"], string> = {
  info: "text.primary",
  debug: "text.secondary",
  warning: "warning.main",
  error: "error.main",
};

const levels: LogItem["type"][] = ["info", "debug", "warning", "error"];

/* 应用运行日志模板：本应用自身的运行时日志（非代理内核日志） */
const logTemplates: Omit<LogItem, "time">[] = [
  { type: "info", payload: "[INFO] 应用启动完成，加载配置文件 config.json" },
  { type: "info", payload: "[INFO] 主窗口创建成功，尺寸 1440×900" },
  { type: "info", payload: "[INFO] 配置加载完成：主题=深色，语言=简体中文" },
  { type: "info", payload: "[INFO] 侧边栏导航项已注册：总览 / 网络 / 日志" },
  { type: "info", payload: "[INFO] 顶部搜索栏已就绪，快捷键 ⌘K 已注册" },
  { type: "info", payload: "[INFO] 跑马灯组件初始化完成，日期/时间/网络模块已激活" },
  { type: "info", payload: "[INFO] 状态栏托盘图标已创建（日历样式）" },
  { type: "info", payload: "[INFO] 系统信息获取完成" },
  { type: "info", payload: "[INFO] 网络状态检测：Wi-Fi 已连接" },
  { type: "info", payload: "[INFO] 网络状态检测：有线连接，链路正常" },
  { type: "info", payload: "[INFO] 总览模块拖拽排序已保存到 config.json" },
  { type: "info", payload: "[INFO] 侧边栏菜单顺序已更新并持久化" },
  { type: "info", payload: "[INFO] 主题切换为深色模式" },
  { type: "info", payload: "[INFO] 主题切换为浅色模式" },
  { type: "info", payload: "[INFO] 配置文件已保存到 app_data_dir/config.json" },
  { type: "info", payload: "[INFO] 窗口最小尺寸约束已应用：960×640" },
  { type: "info", payload: "[INFO] 快捷键已监听：⌘, 设置 / ⌘⇧L 切换侧栏 / ⌘K 搜索" },
  { type: "info", payload: "[INFO] 托盘图标更新：日期变更" },
  { type: "debug", payload: "[DEBUG] 渲染 OverviewPage，KPI 卡片 4 个，底部卡片 5 个" },
  { type: "debug", payload: "[DEBUG] useSystemInfo hook 刷新周期完成" },
  { type: "debug", payload: "[DEBUG] useNetworkInfo hook 刷新周期完成" },
  { type: "debug", payload: "[DEBUG] 路由切换：/overview -> /logs" },
  { type: "debug", payload: "[DEBUG] 拖拽卡片重排事件已提交" },
  { type: "debug", payload: "[DEBUG] HeaderBar 通知面板打开" },
  { type: "debug", payload: "[DEBUG] 管理员权限检查完成" },
  { type: "warning", payload: "[WARNING] 非管理员权限运行，部分系统功能受限" },
  { type: "warning", payload: "[WARNING] 网络公网 IP 查询超时，已使用本地缓存" },
  { type: "error", payload: "[ERROR] 配置文件保存失败：权限不足，请检查 app_data_dir 写入权限" },
];

const makeTime = (d: Date) => d.toLocaleTimeString("zh-CN", { hour12: false });

const MAX_LOGS = 100;
const LOG_INTERVAL_MS = 6000;

const buildInitialLogs = (): LogItem[] => {
  const now = Date.now();
  const picks = logTemplates.slice(0, 8);
  return picks.map((t, i) => ({
    type: t.type,
    payload: t.payload,
    time: makeTime(new Date(now - (picks.length - i) * 1000)),
  }));
};

export default function LogsPage() {
  const [logs, setLogs] = useState<LogItem[]>(buildInitialLogs);
  const [active, setActive] = useState<LogItem["type"] | "all">("all");
  const [paused, setPaused] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const boxRef = useRef<HTMLDivElement>(null);

  // 模拟日志持续滚动（降低频率 + 控制条数上限，降低内存占用）
  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      const tpl = logTemplates[Math.floor(Math.random() * logTemplates.length)];
      setLogs((prev) => {
        const next = [...prev, { type: tpl.type, payload: tpl.payload, time: makeTime(new Date()) }];
        if (next.length > MAX_LOGS) {
          return next.slice(next.length - MAX_LOGS);
        }
        return next;
      });
    }, LOG_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [paused]);

  // 自动滚动到底部
  useEffect(() => {
    if (autoScroll && boxRef.current) {
      boxRef.current.scrollTop = boxRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const filtered = useMemo(
    () => (active === "all" ? logs : logs.filter((l) => l.type === active)),
    [logs, active]
  );

  const handleClear = () => setLogs([]);

  const handleExport = () => {
    const text = filtered.map((l) => `${l.time}  ${l.payload}`).join("\n");
    const blob = new Blob([text + "\n"], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const ts = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 19);
    a.href = url;
    a.download = `logs-${ts}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          mb: 2,
          gap: 1,
          flexWrap: "wrap",
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          软件运行日志
        </Typography>
        <Chip label={`共 ${logs.length} 条`} size="small" />
        <Box sx={{ flex: 1 }} />

        {/* 自动滚动 / 暂停继续 */}
        <Stack direction="row" spacing={0.5}>
          <Tooltip title={autoScroll ? "关闭自动滚动" : "开启自动滚动"}>
            <IconButton
              size="small"
              color={autoScroll ? "primary" : "default"}
              onClick={() => setAutoScroll((s) => !s)}
            >
              <VerticalAlignBottomIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={paused ? "继续日志" : "暂停日志"}>
            <IconButton
              size="small"
              color={paused ? "primary" : "default"}
              onClick={() => setPaused((p) => !p)}
            >
              {paused ? <PlayArrowIcon fontSize="small" /> : <PauseIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Stack>

        {/* 筛选 chips */}
        <Stack direction="row" spacing={0.5}>
          <Chip
            label="全部"
            size="small"
            color={active === "all" ? "primary" : "default"}
            onClick={() => setActive("all")}
            clickable
          />
          {levels.map((lv) => (
            <Chip
              key={lv}
              label={lv}
              size="small"
              color={active === lv ? "primary" : "default"}
              onClick={() => setActive(lv)}
              clickable
            />
          ))}
        </Stack>

        {/* 导出 / 清空（紧邻筛选 chips） */}
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="导出日志">
            <IconButton size="small" onClick={handleExport}>
              <DownloadIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="清空日志">
            <IconButton size="small" color="error" onClick={handleClear}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      <Paper
        ref={boxRef}
        variant="outlined"
        sx={{
          height: "calc(100vh - 180px)",
          overflow: "auto",
          p: 1.5,
          fontFamily: '"JetBrains Mono", "Fira Code", Consolas, monospace',
          fontSize: 13,
          lineHeight: 1.7,
        }}
      >
        {filtered.map((l, i) => (
          <Box key={i} sx={{ display: "flex", gap: 1.5 }}>
            <Typography
              component="span"
              sx={{
                color: "text.disabled",
                flexShrink: 0,
                fontFamily: "inherit",
                fontSize: "inherit",
              }}
            >
              {l.time}
            </Typography>
            <Typography
              component="span"
              sx={{
                color: levelColor[l.type],
                fontWeight: l.type === "error" || l.type === "warning" ? 600 : 400,
                fontFamily: "inherit",
                fontSize: "inherit",
                wordBreak: "break-all",
              }}
            >
              {l.payload}
            </Typography>
          </Box>
        ))}
      </Paper>
    </Box>
  );
}
