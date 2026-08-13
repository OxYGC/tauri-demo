import { useState, useRef } from "react";
import {
  Box,
  Typography,
  CardContent,
  Grid,
  Stack,
  LinearProgress,
  Switch,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Paper,
  CircularProgress,
} from "@mui/material";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import LinkIcon from "@mui/icons-material/Link";
import HubIcon from "@mui/icons-material/Hub";
import BoltIcon from "@mui/icons-material/Bolt";
import SpeedIcon from "@mui/icons-material/Speed";
import MemoryIcon from "@mui/icons-material/Memory";
import StorageIcon from "@mui/icons-material/Storage";
import DnsIcon from "@mui/icons-material/Dns";
import WifiIcon from "@mui/icons-material/Wifi";
import LanIcon from "@mui/icons-material/Lan";
import PublicIcon from "@mui/icons-material/Public";
import { useConfig } from "../config";
import {
  useSystemInfo,
  useNetworkInfo,
  formatBytes,
  formatCpuMem,
  formatCpuFreq,
  countryFlag,
} from "../hooks/useSystemData";

const trend = [
  28, 35, 42, 30, 55, 48, 62, 70, 58, 65, 80, 72, 90, 68, 75, 60, 52, 66, 78,
  84, 70, 62, 50, 58,
];
const maxTrend = Math.max(...trend);

const nodes = [
  { name: "🇭🇰 香港 01", delay: 86, type: "Vmess" },
  { name: "🇯🇵 日本 01", delay: 98, type: "Vmess" },
  { name: "🇭🇰 香港 02", delay: 124, type: "Vmess" },
  { name: "🇹🇼 台湾 01", delay: 156, type: "Trojan" },
  { name: "🇸🇬 新加坡 01", delay: 175, type: "Vmess" },
  { name: "🇺🇸 美国 01", delay: 320, type: "Trojan" },
];

const delayColor = (d: number) =>
  d < 100 ? "success.main" : d < 200 ? "#4caf50" : d < 400 ? "warning.main" : "error.main";

/* ---- OS 品牌图标 ---- */
function AppleIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.05 12.04c-.03-2.7 2.2-3.99 2.3-4.06-1.26-1.84-3.21-2.09-3.91-2.12-1.66-.17-3.24.98-4.09.98-.84 0-2.14-.96-3.52-.93-1.81.03-3.48 1.05-4.41 2.68-1.88 3.26-.48 8.08 1.35 10.72.9 1.29 1.96 2.74 3.35 2.69 1.34-.05 1.85-.86 3.48-.86 1.62 0 2.08.86 3.5.83 1.45-.02 2.36-1.32 3.24-2.62 1.02-1.5 1.44-2.95 1.46-3.03-.03-.01-2.81-1.08-2.84-4.28zM14.6 4.59c.74-.9 1.24-2.14 1.1-3.39-1.07.04-2.36.71-3.13 1.61-.69.8-1.29 2.08-1.13 3.3 1.19.09 2.41-.61 3.16-1.52z"/>
    </svg>
  );
}

function WindowsIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 5.5L10.5 4.5V11.5H3V5.5zM10.5 12.5V19.5L3 18.5V12.5H10.5zM11.5 4.4L21 3V11.5H11.5V4.4zM21 12.5V21L11.5 19.6V12.5H21z"/>
    </svg>
  );
}

function LinuxIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C9.5 2 8 4 8 6.5c0 1 .3 2 .8 2.8-1.3 1.5-2.3 3.5-2.3 5.7 0 1.5.5 2.8 1.3 3.8-.5.5-.8 1.2-.8 2 0 .7.3 1.2.8 1.5.5.3 1.2.2 1.8-.2.3.5.8.8 1.4.8.6 0 1.1-.3 1.4-.8.3.5.8.8 1.4.8.6 0 1.1-.3 1.4-.8.6.4 1.3.5 1.8.2.5-.3.8-.8.8-1.5 0-.8-.3-1.5-.8-2 .8-1 1.3-2.3 1.3-3.8 0-2.2-1-4.2-2.3-5.7.5-.8.8-1.8.8-2.8C16 4 14.5 2 12 2zm-1.5 4c.3 0 .5.2.5.5s-.2.5-.5.5-.5-.2-.5-.5.2-.5.5-.5zm3 0c.3 0 .5.2.5.5s-.2.5-.5.5-.5-.2-.5-.5.2-.5.5-.5z"/>
    </svg>
  );
}

/* Wi-Fi 6 图标（小米手机状态栏样式：Wi-Fi 信号 + 右下角内嵌 "6"） */
function WifiSixIcon({ fontSize = 20, color = "inherit" }: { fontSize?: number; color?: string }) {
  return (
    <Box sx={{ position: "relative", display: "inline-flex", color, width: fontSize, height: fontSize }}>
      <svg width={fontSize} height={fontSize} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 4C7.3 4 3.07 5.85 0 8.74L2.01 11C4.52 8.67 8.05 7.5 12 7.5s7.48 1.17 9.99 3.5L24 8.74C20.93 5.85 16.7 4 12 4zm0 4.97c-2.98 0-5.69 1.02-7.78 2.74L6.22 13.9c1.78-1.38 3.84-2.2 5.78-2.2s4 0.82 5.78 2.2l2-2.19C17.69 9.99 14.98 8.97 12 8.97zm0 4.23c-1.69 0-3.23.58-4.42 1.55L12 20l4.42-5.25C15.23 13.78 13.69 13.2 12 13.2z"/>
      </svg>
      {/* 内嵌 "6" — 无外圈，直接覆盖在 Wi-Fi 扇形右下角，6 字号加大 */}
      <Box
        sx={{
          position: "absolute",
          right: -2,
          bottom: -2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: Math.round(fontSize * 0.6),
          fontWeight: 900,
          lineHeight: 1,
          color: "success.main",
          textShadow: "0 0 2px var(--mui-palette-background-paper, #fff), 0 0 3px var(--mui-palette-background-paper, #fff)",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        6
      </Box>
    </Box>
  );
}

function OsBrandIcon({ os, size = 24 }: { os: string; size?: number }) {
  const lower = os.toLowerCase();
  if (lower.includes("mac") || lower.includes("darwin")) return <AppleIcon size={size} />;
  if (lower.includes("win")) return <WindowsIcon size={size} />;
  if (lower.includes("linux")) return <LinuxIcon size={size} />;
  return <DnsIcon sx={{ fontSize: size }} />;
}

/* ---- KPI 卡片定义 ---- */
const KPI_DEFS: Record<string, { icon: React.ReactNode; label: string; value: string; sub: string; color: string }> = {
  download: { icon: <CloudDownloadIcon />, label: "下行总量", value: "38.6 GB", sub: "今日 4.2 GB", color: "success.main" },
  upload: { icon: <CloudUploadIcon />, label: "上行总量", value: "2.4 GB", sub: "今日 0.3 GB", color: "info.main" },
  connections: { icon: <LinkIcon />, label: "活跃连接", value: "6", sub: "较 5 分钟前 +2", color: "warning.main" },
  nodes: { icon: <HubIcon />, label: "代理节点", value: "8", sub: "可用 7 · 超时 1", color: "primary.main" },
};

function StatCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub: string; color: string }) {
  return (
    <CardContent>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <Box sx={{ width: 36, height: 36, borderRadius: 1.5, display: "flex", alignItems: "center", justifyContent: "center", color, bgcolor: "action.hover" }}>
          {icon}
        </Box>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
      </Box>
      <Typography sx={{ fontSize: 24, fontWeight: 700, lineHeight: 1.1 }}>{value}</Typography>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>{sub}</Typography>
    </CardContent>
  );
}

/* ---- 底部卡片定义 ---- */
function CurrentNodeCard() {
  return (
    <CardContent>
      <Typography sx={{ fontWeight: 700, mb: 1.5 }}>当前节点</Typography>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 1.5, borderRadius: 2, bgcolor: "action.hover", mb: 2 }}>
        <Box sx={{ width: 44, height: 44, borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "primary.main", color: "#fff" }}>
          <BoltIcon />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontWeight: 700 }}>🇭🇰 香港 01</Typography>
          <Typography variant="caption" color="text.secondary">Vmess · 🚀 节点选择</Typography>
        </Box>
        <Box sx={{ textAlign: "right" }}>
          <Typography sx={{ fontWeight: 700, color: "success.main" }}>86ms</Typography>
          <SpeedIcon sx={{ fontSize: 16, color: "success.main" }} />
        </Box>
      </Box>
      <Typography variant="caption" color="text.secondary">流量趋势（近 24 小时）</Typography>
      <Box sx={{ display: "flex", alignItems: "flex-end", gap: 0.5, height: 80, mt: 1 }}>
        {trend.map((v, i) => (
          <Box key={i} sx={{ flex: 1, height: `${(v / maxTrend) * 100}%`, borderRadius: "3px 3px 0 0", bgcolor: "primary.main", opacity: 0.5 + (v / maxTrend) * 0.5 }} />
        ))}
      </Box>
    </CardContent>
  );
}

function LatencyCard() {
  return (
    <CardContent>
      <Typography sx={{ fontWeight: 700, mb: 1.5 }}>节点延迟排行</Typography>
      <Stack spacing={1.25}>
        {nodes.map((n) => (
          <Box key={n.name}>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.25 }}>
              <Typography variant="body2">{n.name}</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: delayColor(n.delay) }}>{n.delay}ms</Typography>
            </Box>
            <LinearProgress variant="determinate" value={100 - (n.delay / 400) * 100} sx={{ height: 5, borderRadius: 3, "& .MuiLinearProgress-bar": { bgcolor: delayColor(n.delay) } }} />
          </Box>
        ))}
      </Stack>
    </CardContent>
  );
}

function QuickSwitchCard() {
  return (
    <CardContent>
      <Typography sx={{ fontWeight: 700, mb: 1 }}>快捷开关</Typography>
      <List dense>
        {[
          { primary: "系统代理", secondary: "HTTP/HTTPS 7890", checked: true },
          { primary: "TUN 模式", secondary: "全局流量接管", checked: false },
          { primary: "开机自启", secondary: "登录时启动", checked: true },
          { primary: "允许局域网", secondary: "LAN 共享", checked: false },
        ].map((item) => (
          <ListItem key={item.primary} divider>
            <ListItemText primary={item.primary} secondary={item.secondary} primaryTypographyProps={{ fontSize: 13 }} secondaryTypographyProps={{ fontSize: 11 }} />
            <ListItemSecondaryAction>
              <Switch defaultChecked={item.checked} size="small" />
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>
    </CardContent>
  );
}

function CompactInfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
      <Box sx={{ color: "text.secondary", display: "flex", flexShrink: 0 }}>{icon}</Box>
      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 56, flexShrink: 0 }}>{label}</Typography>
      <Typography variant="caption" sx={{ fontWeight: 600, flex: 1, wordBreak: "break-all" }}>{value}</Typography>
    </Box>
  );
}

function SystemInfoCard() {
  const { info } = useSystemInfo();

  if (!info) {
    return (
      <CardContent sx={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 100 }}>
        <CircularProgress size={24} />
      </CardContent>
    );
  }

  return (
    <CardContent sx={{ "&:last-child": { pb: 1.5 } }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <Box sx={{ color: "text.primary" }}>
          <OsBrandIcon os={info.os} size={26} />
        </Box>
        <Typography sx={{ fontWeight: 700, fontSize: 14 }}>本机信息</Typography>
      </Box>
      <Stack spacing={0.5}>
        <CompactInfoRow icon={<DnsIcon sx={{ fontSize: 14 }} />} label="系统" value={`${info.os} ${info.osVersion}`} />
        <CompactInfoRow icon={<MemoryIcon sx={{ fontSize: 14 }} />} label="CPU/内存" value={`${formatCpuMem(info.cpuPhysical, info.memory)} · ${formatCpuFreq(info.cpuFreq)}`} />
        <CompactInfoRow icon={<StorageIcon sx={{ fontSize: 14 }} />} label="存储" value={`${formatBytes(info.diskUsed)} / ${formatBytes(info.diskTotal)}`} />
        <Box sx={{ mt: 0.5 }}>
          <LinearProgress
            variant="determinate"
            value={info.diskTotal > 0 ? (info.diskUsed / info.diskTotal) * 100 : 0}
            sx={{ height: 4, borderRadius: 2 }}
          />
        </Box>
      </Stack>
    </CardContent>
  );
}

function NetworkInfoCard() {
  const { info } = useNetworkInfo();

  if (!info) {
    return (
      <CardContent sx={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 100 }}>
        <CircularProgress size={24} />
      </CardContent>
    );
  }

  const isWifi = info.connectionType === "wifi";

  return (
    <CardContent sx={{ "&:last-child": { pb: 1.5 } }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        {isWifi ? (
          info.wifiStandard === 6 ? (
            <WifiSixIcon fontSize={20} color="primary.main" />
          ) : (
            <WifiIcon color="primary" fontSize="small" />
          )
        ) : (
          <LanIcon color="primary" fontSize="small" />
        )}
        <Typography sx={{ fontWeight: 700, fontSize: 14 }}>网络信息</Typography>
      </Box>
      <Stack spacing={0.5}>
        <CompactInfoRow icon={<LanIcon sx={{ fontSize: 14 }} />} label="局域网" value={info.lanIp} />
        <CompactInfoRow icon={<PublicIcon sx={{ fontSize: 14 }} />} label="公网" value={`${info.publicIp || "未知"} ${countryFlag(info.country)}`} />
        {(info.region || info.city) && (
          <CompactInfoRow icon={<PublicIcon sx={{ fontSize: 14 }} />} label="位置" value={`${countryFlag(info.country)} ${info.region} ${info.city}`} />
        )}
        <CompactInfoRow
          icon={isWifi ? <WifiIcon sx={{ fontSize: 14 }} /> : <LanIcon sx={{ fontSize: 14 }} />}
          label="连接"
          value={isWifi ? `Wi-Fi${info.wifiStandard ? ` ${info.wifiStandard}` : ""}` : "有线"}
        />
        {isWifi && info.wifiName && (
          <CompactInfoRow icon={<WifiIcon sx={{ fontSize: 14 }} />} label="SSID" value={info.wifiName} />
        )}
      </Stack>
    </CardContent>
  );
}

const BOTTOM_DEFS: Record<string, { render: () => React.ReactNode; md: number }> = {
  currentNode: { render: () => <CurrentNodeCard />, md: 4 },
  latency: { render: () => <LatencyCard />, md: 4 },
  quickSwitch: { render: () => <QuickSwitchCard />, md: 4 },
  systemInfo: { render: () => <SystemInfoCard />, md: 4 },
  networkInfo: { render: () => <NetworkInfoCard />, md: 4 },
};

/* ---- 拖拽卡片容器（整个卡片都可拖，稳定可靠；dataTransfer 存 cardId 不存 index） ---- */
/* ⚠️ 关键：dragstart 期间绝对不能触发 React 重渲染，否则浏览器会丢失 drag session */
function DraggableCard({
  cardId,
  listType,
  draggingId,
  overId,
  onDrop,
  onDragStartGlobal,
  onDragEndGlobal,
  onDragEnterGlobal,
  children,
}: {
  cardId: string;
  listType: "kpi" | "bottom";
  draggingId: string | null;
  overId: string | null;
  onDrop: (fromId: string, toId: string) => void;
  onDragStartGlobal: (cardId: string, list: "kpi" | "bottom") => void;
  onDragEndGlobal: () => void;
  onDragEnterGlobal: (cardId: string, list: "kpi" | "bottom") => void;
  children: React.ReactNode;
}) {
  const paperRef = useRef<HTMLDivElement | null>(null);
  const isDragging = draggingId === cardId;
  const isOver = overId === cardId && draggingId !== null && draggingId !== cardId;

  return (
    <Paper
      ref={paperRef}
      data-card-id={cardId}
      data-list-type={listType}
      draggable
      onDragStart={(e) => {
        // ⚠️ 这里只设置 dataTransfer，不触发任何会引发 React 重渲染的 state 更新
        // onDragStartGlobal 只改 ref（不触发重渲染），不影响 drag session
        onDragStartGlobal(cardId, listType);
        const dt = e.dataTransfer;
        dt.effectAllowed = "move";
        dt.dropEffect = "move";
        try {
          dt.setData("text/x-card-id", cardId);
          dt.setData("text/x-list-type", listType);
          // 必须设置 text/plain 作为兜底，部分浏览器要求至少一个标准类型
          dt.setData("text/plain", cardId);
        } catch {}
        if (paperRef.current) {
          try {
            dt.setDragImage(paperRef.current, 20, 20);
          } catch {}
        }
      }}
      onDragOver={(e) => {
        // 必须 preventDefault 才能触发 drop
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        // 只在跨卡片时才更新 overId（避免重复 setState）
        if (draggingId !== null && draggingId !== cardId) {
          onDragEnterGlobal(cardId, listType);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        let fromId = "";
        try {
          fromId = e.dataTransfer.getData("text/x-card-id");
        } catch {}
        if (!fromId) {
          try {
            fromId = e.dataTransfer.getData("text/plain");
          } catch {}
        }
        if (fromId && fromId !== cardId) {
          onDrop(fromId, cardId);
        }
        onDragEndGlobal();
      }}
      onDragEnd={onDragEndGlobal}
      elevation={0}
      sx={{
        height: "100%",
        cursor: isDragging ? "grabbing" : "grab",
        opacity: isDragging ? 0.4 : 1,
        border: 1,
        borderColor: isOver ? "primary.main" : "divider",
        borderStyle: isOver ? "dashed" : "solid",
        borderWidth: isOver ? 2 : 1,
        borderRadius: 2,
        transition: "border-color .12s, opacity .12s",
        position: "relative",
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      {/* 拖拽手柄（视觉提示，pointerEvents none 不抢事件） */}
      <Box
        sx={{
          position: "absolute",
          top: 4,
          right: 4,
          width: 22,
          height: 22,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "text.disabled",
          zIndex: 2,
          borderRadius: 1,
          opacity: 0.55,
          pointerEvents: "none",
        }}
      >
        <DragIndicatorIcon sx={{ fontSize: 15 }} />
      </Box>
      <Box sx={{ height: "100%" }}>
        {children}
      </Box>
    </Paper>
  );
}

export default function OverviewPage() {
  const { config, setConfig } = useConfig();

  const kpiOrder = config.overview.kpiOrder.filter((id) => KPI_DEFS[id]);
  const bottomOrder = config.overview.bottomOrder.filter((id) => BOTTOM_DEFS[id]);

  /* 拖拽状态：全部用 state（不用 ref），但 dragstart 时只改 ref 不改 state
   * dragstart 改 ref（不触发重渲染，避免中断 drag session）
   * dragenter / drop / dragend 才改 state（这些时机浏览器已经稳定 drag session）
   */
  const dragSrcIdRef = useRef<string | null>(null);
  const dragListRef = useRef<"kpi" | "bottom" | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  /* 直接操作配置中的 order，立即写入 config.json */
  const reorderById = (list: "kpi" | "bottom", fromId: string, toId: string) => {
    const key = list === "kpi" ? "kpiOrder" : "bottomOrder";
    const order = [...config.overview[key]];
    const from = order.indexOf(fromId);
    let to = order.indexOf(toId);
    if (from === -1 || to === -1 || from === to) return;
    const [moved] = order.splice(from, 1);
    // splice(from,1) 后，如果 from 在 to 之前，to 位置左移 1
    if (from < to) to -= 1;
    order.splice(to, 0, moved);
    setConfig({ ...config, overview: { ...config.overview, [key]: order } });
  };

  // dragstart：只改 ref（不触发重渲染），保持 drag session 稳定
  const handleCardDragStart = (cardId: string, list: "kpi" | "bottom") => {
    dragSrcIdRef.current = cardId;
    dragListRef.current = list;
  };

  // dragenter：改 state 显示边框反馈（此时 drag session 已经稳定）
  const handleCardDragEnter = (cardId: string, _list: "kpi" | "bottom") => {
    if (dragSrcIdRef.current && dragSrcIdRef.current !== cardId) {
      setDraggingId(dragSrcIdRef.current);
      setOverId(cardId);
    }
  };

  const handleCardDrop = (list: "kpi" | "bottom") => (fromId: string, toId: string) => {
    if (dragListRef.current === list) {
      reorderById(list, fromId, toId);
    }
    dragSrcIdRef.current = null;
    dragListRef.current = null;
    setDraggingId(null);
    setOverId(null);
  };

  const handleCardDragEnd = () => {
    dragSrcIdRef.current = null;
    dragListRef.current = null;
    setDraggingId(null);
    setOverId(null);
  };

  return (
    <Box>
      {/* KPI 拖拽行 */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {kpiOrder.map((id) => {
          const def = KPI_DEFS[id];
          return (
            <Grid item xs={12} sm={6} md={3} key={id}>
              <DraggableCard
                cardId={id}
                listType="kpi"
                draggingId={draggingId}
                overId={overId}
                onDrop={handleCardDrop("kpi")}
                onDragStartGlobal={handleCardDragStart}
                onDragEnterGlobal={handleCardDragEnter}
                onDragEndGlobal={handleCardDragEnd}
              >
                <StatCard icon={def.icon} label={def.label} value={def.value} sub={def.sub} color={def.color} />
              </DraggableCard>
            </Grid>
          );
        })}
      </Grid>

      {/* 底部拖拽行 */}
      <Grid container spacing={2}>
        {bottomOrder.map((id) => {
          const def = BOTTOM_DEFS[id];
          return (
            <Grid item xs={12} sm={6} md={def.md} key={id}>
              <DraggableCard
                cardId={id}
                listType="bottom"
                draggingId={draggingId}
                overId={overId}
                onDrop={handleCardDrop("bottom")}
                onDragStartGlobal={handleCardDragStart}
                onDragEnterGlobal={handleCardDragEnter}
                onDragEndGlobal={handleCardDragEnd}
              >
                {def.render()}
              </DraggableCard>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
