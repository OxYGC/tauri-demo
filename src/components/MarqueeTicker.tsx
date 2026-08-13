import { useState, useEffect } from "react";
import { Box, Typography, Tooltip } from "@mui/material";
import WifiIcon from "@mui/icons-material/Wifi";
import LanIcon from "@mui/icons-material/Lan";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import { tickerItems } from "../data/mock";
import { useConfig } from "../config";
import { useNetworkInfo, countryFlag } from "../hooks/useSystemData";

/* Wi-Fi 6 图标（小米手机状态栏样式：Wi-Fi 信号扇区 + 右下角内嵌 "6" 无外圈） */
function WifiSixIcon({ sx }: { sx?: React.CSSProperties }) {
  return (
    <Box sx={{ position: "relative", display: "inline-flex", width: 20, height: 20, ...sx }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 4C7.3 4 3.07 5.85 0 8.74L2.01 11C4.52 8.67 8.05 7.5 12 7.5s7.48 1.17 9.99 3.5L24 8.74C20.93 5.85 16.7 4 12 4zm0 4.97c-2.98 0-5.69 1.02-7.78 2.74L6.22 13.9c1.78-1.38 3.84-2.2 5.78-2.2s4 0.82 5.78 2.2l2-2.19C17.69 9.99 14.98 8.97 12 8.97zm0 4.23c-1.69 0-3.23.58-4.42 1.55L12 20l4.42-5.25C15.23 13.78 13.69 13.2 12 13.2z"/>
      </svg>
      {/* 内嵌 "6" — 无外圈，字号加大，带文字阴影避免与扇形重叠 */}
      <Box
        sx={{
          position: "absolute",
          right: -3,
          bottom: -3,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 900,
          lineHeight: 1,
          color: "success.main",
          textShadow:
            "0 0 2px var(--mui-palette-background-paper, #fff), 0 0 3px var(--mui-palette-background-paper, #fff)",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        6
      </Box>
    </Box>
  );
}

/* 小日历图标（与状态栏托盘图标同步样式） */
function CalendarDateBadge({ day }: { day: number }) {
  const dayStr = String(day);
  const isTwoDigits = dayStr.length > 1;
  return (
    <Box
      sx={{
        width: 26,
        height: 26,
        borderRadius: 1,
        border: 1.5,
        borderColor: "text.secondary",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      {/* 顶部标题栏 */}
      <Box
        sx={{
          height: 7,
          bgcolor: "text.secondary",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 0.5,
        }}
      >
        <Box sx={{ width: 2, height: 4, bgcolor: "background.paper", borderRadius: 0.5 }} />
        <Box sx={{ width: 2, height: 4, bgcolor: "background.paper", borderRadius: 0.5 }} />
      </Box>
      {/* 日期数字 */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 800,
          fontSize: isTwoDigits ? 10 : 12,
          lineHeight: 1,
          color: "text.primary",
        }}
      >
        {day}
      </Box>
    </Box>
  );
}

export default function MarqueeTicker() {
  const { config } = useConfig();
  const m = config.marquee;
  const loop = m.enabled ? [...tickerItems, ...tickerItems] : [];
  const [now, setNow] = useState(() => new Date());
  const { info: netInfo } = useNetworkInfo();

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const time = now.toLocaleTimeString("zh-CN", { hour12: false });
  const day = now.getDate();

  const isWifi = netInfo?.connectionType === "wifi";
  const netTooltip = netInfo
    ? [
        `网络状态: ${isWifi ? "Wi-Fi" : "有线"}`,
        netInfo.wifiName ? `Wi-Fi: ${netInfo.wifiName}` : "",
        `局域网 IP: ${netInfo.lanIp}`,
        netInfo.publicIp ? `公网 IP: ${netInfo.publicIp} ${countryFlag(netInfo.country)}` : "",
        netInfo.city ? `位置: ${countryFlag(netInfo.country)} ${netInfo.region} ${netInfo.city}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    : "网络状态: 获取中…";

  return (
    <Box
      sx={{
        height: 32,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        borderTop: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          height: "100%",
          overflow: "hidden",
          position: "relative",
          display: "flex",
          alignItems: "center",
        }}
      >
        {m.enabled && (
          <Box className="marquee-track">
            {loop.map((t, i) => (
              <Box
                key={i}
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.5,
                  px: 1.75,
                }}
              >
                <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                  {t.label}
                </Typography>
                <Typography
                  sx={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: t.up ? "success.main" : "error.main",
                  }}
                >
                  {t.value}
                </Typography>
                {t.up ? (
                  <TrendingUpIcon sx={{ fontSize: 13, color: "success.main" }} />
                ) : (
                  <TrendingDownIcon sx={{ fontSize: 13, color: "error.main" }} />
                )}
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {/* 右侧：日期角标 / 时间 / Wi-Fi 网络标识 */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          px: 2,
          height: "100%",
          borderLeft: 1,
          borderColor: "divider",
          flexShrink: 0,
        }}
      >
        {m.showDate && <CalendarDateBadge day={day} />}
        {m.showTime && (
          <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
            {time}
          </Typography>
        )}
        {m.showWifi && (
          <Tooltip
            title={<Box sx={{ whiteSpace: "pre-line" }}>{netTooltip}</Box>}
            arrow
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              {isWifi ? (
                netInfo?.wifiStandard === 6 ? (
                  <WifiSixIcon sx={{ color: "success.main", fontSize: 17 }} />
                ) : (
                  <WifiIcon sx={{ fontSize: 17, color: "success.main" }} />
                )
              ) : (
                <LanIcon sx={{ fontSize: 17, color: "success.main" }} />
              )}
            </Box>
          </Tooltip>
        )}
      </Box>
    </Box>
  );
}
