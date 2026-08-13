import { useState } from "react";
import {
  Box,
  Typography,
  Popover,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Checkbox,
  IconButton,
  Stack,
  TextField,
  MenuItem,
  Select,
  FormControl,
} from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { NAV_PATHS, useConfig, type NavItemConfig } from "../config";

import DashboardIcon from "@mui/icons-material/Dashboard";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import SubjectIcon from "@mui/icons-material/Subject";
import SettingsIcon from "@mui/icons-material/Settings";
import AppsIcon from "@mui/icons-material/Apps";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import HomeIcon from "@mui/icons-material/Home";
import WifiIcon from "@mui/icons-material/Wifi";
import RouterIcon from "@mui/icons-material/Router";
import StorageIcon from "@mui/icons-material/Storage";
import SecurityIcon from "@mui/icons-material/Security";
import PersonIcon from "@mui/icons-material/Person";
import SearchIcon from "@mui/icons-material/Search";
import CodeIcon from "@mui/icons-material/Code";
import BugReportIcon from "@mui/icons-material/BugReport";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import SpeedIcon from "@mui/icons-material/Speed";
import CloudIcon from "@mui/icons-material/Cloud";
import ComputerIcon from "@mui/icons-material/Computer";
import LanIcon from "@mui/icons-material/Lan";
import NetworkCellIcon from "@mui/icons-material/NetworkCell";

/* 可配置的图标列表 */
export const ICON_MAP: Record<string, React.ElementType> = {
  Dashboard: DashboardIcon,
  SwapHoriz: SwapHorizIcon,
  Subject: SubjectIcon,
  Settings: SettingsIcon,
  Apps: AppsIcon,
  Home: HomeIcon,
  Wifi: WifiIcon,
  Router: RouterIcon,
  Storage: StorageIcon,
  Security: SecurityIcon,
  Person: PersonIcon,
  Search: SearchIcon,
  Code: CodeIcon,
  BugReport: BugReportIcon,
  Analytics: AnalyticsIcon,
  Speed: SpeedIcon,
  Cloud: CloudIcon,
  Computer: ComputerIcon,
  Lan: LanIcon,
  NetworkCell: NetworkCellIcon,
};

export const ICON_NAMES = Object.keys(ICON_MAP);

function RailItem({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: string;
  active: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  const Icon = ICON_MAP[icon] ?? AppsIcon;
  return (
    <Tooltip title={label} placement="right">
      <Box
        onClick={onClick}
        sx={{
          position: "relative",
          width: "100%",
          py: 1.1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 0.5,
          cursor: "pointer",
          color: active ? "primary.main" : "text.secondary",
          transition: "color .15s",
          "&:hover": { color: "primary.main", bgcolor: "action.hover" },
        }}
      >
        {active && (
          <Box
            sx={{
              position: "absolute",
              left: 0,
              top: 10,
              bottom: 10,
              width: 3,
              borderTopRightRadius: 3,
              borderBottomRightRadius: 3,
              bgcolor: "primary.main",
            }}
          />
        )}
        <Icon sx={{ fontSize: 22 }} />
        <Typography
          sx={{
            fontSize: 10,
            fontWeight: active ? 600 : 500,
            lineHeight: 1,
            maxWidth: 64,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </Typography>
      </Box>
    </Tooltip>
  );
}

interface SidebarProps {
  sidebarOpen: boolean;
}

export default function Sidebar({ sidebarOpen }: SidebarProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { config, setConfig } = useConfig();
  const [allAnchor, setAllAnchor] = useState<HTMLElement | null>(null);
  const [cfgAnchor, setCfgAnchor] = useState<HTMLElement | null>(null);

  const navItems = config.nav.filter((n) => n.visible);

  const updateNav = (nav: NavItemConfig[]) => setConfig({ ...config, nav });

  const toggleVisible = (id: string) => {
    updateNav(
      config.nav.map((n) =>
        n.id === id ? { ...n, visible: !n.visible } : n
      )
    );
  };

  const moveNav = (id: string, dir: -1 | 1) => {
    const arr = [...config.nav];
    const i = arr.findIndex((n) => n.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    updateNav(arr);
  };

  const editNav = (id: string, field: "label" | "icon", value: string) => {
    updateNav(
      config.nav.map((n) => (n.id === id ? { ...n, [field]: value } : n))
    );
  };

  void sidebarOpen;

  return (
    <Box
      sx={{
        width: 76,
        height: "100%",
        bgcolor: "background.paper",
        borderRight: 1,
        borderColor: "divider",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {/* 顶部拖拽区域（38px 避让红绿灯） */}
      <Box
        data-tauri-drag-region
        sx={{
          width: "100%",
          height: 38,
          flexShrink: 0,
        }}
      />
      {/* 导航区 */}
      <Box
        sx={{
          flex: 1,
          width: "100%",
          py: 1.5,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
      {/* 导航项 */}
      <Box sx={{ flex: 1, width: "100%" }}>
        {navItems.map((item) => {
          const path = NAV_PATHS[item.id] ?? "";
          return (
            <RailItem
              key={item.id}
              label={item.label}
              icon={item.icon}
              active={pathname === path}
              onClick={() => navigate(path)}
            />
          );
        })}
      </Box>

      {/* 全部（右下角三角角标 → 自定义导航配置） */}
      <Box sx={{ position: "relative", width: "100%" }}>
        <RailItem
          label="全部"
          icon="Apps"
          active={false}
          onClick={(e) => setAllAnchor(e.currentTarget as HTMLElement)}
        />
        <Box
          onClick={(e) => {
            e.stopPropagation();
            setCfgAnchor(e.currentTarget as HTMLElement);
          }}
          sx={{
            position: "absolute",
            right: 4,
            bottom: 4,
            width: 0,
            height: 0,
            borderLeft: "7px solid transparent",
            borderBottom: "7px solid",
            borderBottomColor: "primary.main",
            cursor: "pointer",
            opacity: 0.85,
            "&:hover": { opacity: 1 },
          }}
        />
      </Box>
      </Box>

      {/* 全部功能 快捷面板 */}
      <Popover
        open={!!allAnchor}
        anchorEl={allAnchor}
        onClose={() => setAllAnchor(null)}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        transformOrigin={{ vertical: "bottom", horizontal: "left" }}
        PaperProps={{ sx: { width: 220, mb: 1 } }}
      >
        <Box sx={{ px: 2, py: 1.25, borderBottom: 1, borderColor: "divider" }}>
          <Typography sx={{ fontWeight: 700, fontSize: 14 }}>全部功能</Typography>
        </Box>
        <List dense disablePadding>
          {[...config.nav, { id: "settings", label: "设置", icon: "Settings", visible: true }].map((item) => {
            const Icon = ICON_MAP[item.icon] ?? AppsIcon;
            const path = NAV_PATHS[item.id] ?? "";
            return (
              <ListItemButton
                key={item.id}
                onClick={() => {
                  navigate(path);
                  setAllAnchor(null);
                }}
              >
                <ListItemIcon sx={{ minWidth: 34 }}>
                  <Icon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            );
          })}
        </List>
      </Popover>

      {/* 自定义导航配置 */}
      <Popover
        open={!!cfgAnchor}
        anchorEl={cfgAnchor}
        onClose={() => setCfgAnchor(null)}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        transformOrigin={{ vertical: "bottom", horizontal: "left" }}
        PaperProps={{ sx: { width: 340, mb: 1, maxHeight: 500 } }}
      >
        <Box sx={{ px: 2, py: 1.25, borderBottom: 1, borderColor: "divider" }}>
          <Typography sx={{ fontWeight: 700, fontSize: 14 }}>
            自定义导航
          </Typography>
          <Typography variant="caption" color="text.secondary">
            勾选显示 · 箭头调整顺序 · 可编辑名称和图标
          </Typography>
        </Box>
        <Stack sx={{ p: 0.5, overflow: "auto" }}>
          {config.nav.map((item, idx) => {
            const Icon = ICON_MAP[item.icon] ?? AppsIcon;
            return (
              <Box
                key={item.id}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  "&:hover": { bgcolor: "action.hover" },
                }}
              >
                <Checkbox
                  size="small"
                  checked={item.visible}
                  onChange={() => toggleVisible(item.id)}
                />
                <Icon sx={{ fontSize: 18, color: "text.secondary" }} />
                <TextField
                  size="small"
                  value={item.label}
                  onChange={(e) => editNav(item.id, "label", e.target.value)}
                  sx={{ flex: 1, minWidth: 0, "& .MuiInputBase-input": { fontSize: 13, py: 0.5 } }}
                />
                <FormControl size="small" sx={{ minWidth: 90 }}>
                  <Select
                    value={ICON_NAMES.includes(item.icon) ? item.icon : "Apps"}
                    onChange={(e) => editNav(item.id, "icon", e.target.value)}
                    sx={{ "& .MuiSelect-select": { py: 0.5, fontSize: 12 } }}
                  >
                    {ICON_NAMES.map((name) => {
                      const I = ICON_MAP[name];
                      return (
                        <MenuItem key={name} value={name} sx={{ fontSize: 12 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <I sx={{ fontSize: 16 }} />
                            {name}
                          </Box>
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>
                <IconButton
                  size="small"
                  disabled={idx <= 0}
                  onClick={() => moveNav(item.id, -1)}
                >
                  <ArrowUpwardIcon sx={{ fontSize: 14 }} />
                </IconButton>
                <IconButton
                  size="small"
                  disabled={idx >= config.nav.length - 1}
                  onClick={() => moveNav(item.id, 1)}
                >
                  <ArrowDownwardIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Box>
            );
          })}
        </Stack>
      </Popover>
    </Box>
  );
}
