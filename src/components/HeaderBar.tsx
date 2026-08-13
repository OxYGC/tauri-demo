import { useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  Badge,
  Avatar,
  Menu,
  MenuItem,
  Popover,
  Divider,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Button,
  TextField,
  InputAdornment,
  Stack,
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import MenuIcon from "@mui/icons-material/Menu";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import LanguageIcon from "@mui/icons-material/Language";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import BrightnessMediumIcon from "@mui/icons-material/BrightnessMedium";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";
import LoginIcon from "@mui/icons-material/Login";
import CheckIcon from "@mui/icons-material/Check";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import SearchIcon from "@mui/icons-material/Search";
import UpdateIcon from "@mui/icons-material/Update";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { useNavigate } from "react-router-dom";
import { useConfig, type ThemeMode, type AppNotification } from "../config";
import { useIsAdmin } from "../hooks/useSystemData";
import { useAppUpdater } from "../hooks/useAppUpdater";

interface HeaderBarProps {
  searchRef: React.RefObject<HTMLInputElement | null>;
  sidebarOpen: boolean;
}

const notifColor: Record<string, string> = {
  info: "info.main",
  success: "success.main",
  warning: "warning.main",
  error: "error.main",
  update: "warning.main",
};

const typeLabel: Record<string, string> = {
  info: "通知",
  success: "成功",
  warning: "提醒",
  error: "错误",
  update: "软件更新",
};

/* 拦截交互元素的鼠标事件，使其不触发 data-tauri-drag-region 的窗口拖拽
 * 用法：把 .no-drag 容器包装在 输入框/按钮/下拉 外层，onMouseDownCapture 调用 stopPropagation
 */
const stopDrag: React.MouseEventHandler = (e) => e.stopPropagation();

export default function HeaderBar({ searchRef, sidebarOpen }: HeaderBarProps) {
  const navigate = useNavigate();
  const {
    config,
    setConfig,
    markNotificationRead,
    markAllNotificationsRead,
    removeNotification,
  } = useConfig();
  const updater = useAppUpdater();
  const mode: ThemeMode = config.theme;
  const admin = useIsAdmin();
  const notAdmin = admin === false;

  const [notifAnchor, setNotifAnchor] = useState<HTMLElement | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [langAnchor, setLangAnchor] = useState<HTMLElement | null>(null);
  const [themeAnchor, setThemeAnchor] = useState<HTMLElement | null>(null);
  const [lang, setLang] = useState<"zh" | "en">(
    config.language === "en" ? "en" : "zh"
  );
  const [loggedIn, setLoggedIn] = useState(true);

  const items: AppNotification[] = config.notifications.items;
  const unread = items.filter((n) => !n.read).length;
  const hasUpdateAvailable = !!updater.cached || !!updater.available;

  const closeMenus = () => {
    setMenuAnchor(null);
    setLangAnchor(null);
    setThemeAnchor(null);
  };

  const setMode = (m: ThemeMode) => setConfig({ ...config, theme: m });

  const handleNotifClick = (n: AppNotification) => {
    if (!n.read) markNotificationRead(n.id);
    // 更新类通知：点击直接跳去设置页下载
    if (n.type === "update") {
      setNotifAnchor(null);
      navigate("/settings");
    }
  };

  /* 侧边栏展开时 padding 小一些；收起时需要给红绿灯留 92px */
  const leftPad = sidebarOpen ? "16px" : "92px";

  return (
    <Box
      data-tauri-drag-region
      sx={{
        height: 56,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        pl: leftPad,
        pr: 2,
        gap: 1.5,
        borderBottom: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
        userSelect: "none",
      }}
    >
      {/* 搜索栏（Cmd+K 聚焦） */}
      <Box className="no-drag" onMouseDownCapture={stopDrag} sx={{ flex: 1, maxWidth: 480 }}>
        <TextField
          inputRef={searchRef}
          size="small"
          placeholder="搜索节点 / 规则 / 连接…"
          sx={{ width: "100%" }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <Typography variant="caption" color="text.disabled">
                  ⌘K
                </Typography>
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <Box sx={{ flex: 1 }} />

      {/* 铃铛：有更新→黄色；有未读→红点；点击弹出通知面板 */}
      <Tooltip
        title={
          hasUpdateAvailable
            ? `发现新版本 v${updater.cached?.version ?? updater.available?.version ?? ""}，点击查看`
            : unread > 0
            ? `有 ${unread} 条未读通知`
            : "通知 / 站内信"
        }
      >
        <Box className="no-drag" onMouseDownCapture={stopDrag}>
          <IconButton
            size="small"
            onClick={(e) => setNotifAnchor(e.currentTarget)}
            sx={
              hasUpdateAvailable
                ? {
                    color: (t) =>
                      t.palette.mode === "dark" ? "warning.light" : "warning.dark",
                    "&:hover": { bgcolor: "warning.main", color: "#fff" },
                  }
                : undefined
            }
          >
            <Badge
              badgeContent={unread}
              color="error"
              variant={unread > 0 ? "standard" : "dot"}
              invisible={unread === 0}
            >
              {hasUpdateAvailable ? (
                <Stack direction="row" spacing={0.25} alignItems="center">
                  <UpdateIcon fontSize="small" />
                  <NotificationsIcon fontSize="small" sx={{ ml: 0.25 }} />
                </Stack>
              ) : (
                <NotificationsIcon fontSize="small" />
              )}
            </Badge>
          </IconButton>
        </Box>
      </Tooltip>

      {/* 三横线 + 头像（一体） */}
      <Tooltip title={notAdmin ? "非管理员权限运行（部分功能受限）" : "菜单"}>
        <Box
          className="no-drag"
          onMouseDownCapture={stopDrag}
          onClick={(e) => setMenuAnchor(e.currentTarget)}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.75,
            pl: 1,
            pr: loggedIn ? 0.5 : 1.25,
            py: 0.35,
            border: 1,
            borderColor: notAdmin ? "error.main" : "divider",
            borderRadius: 2,
            cursor: "pointer",
            "&:hover": { bgcolor: "action.hover" },
          }}
        >
          <MenuIcon fontSize="small" sx={{ color: notAdmin ? "error.main" : "inherit" }} />
          {loggedIn ? (
            <Avatar
              sx={{
                width: 24,
                height: 24,
                fontSize: 11,
                bgcolor: "primary.main",
                color: "#fff",
              }}
            >
              CV
            </Avatar>
          ) : (
            <Typography sx={{ fontSize: 13, fontWeight: 600 }}>登录</Typography>
          )}
        </Box>
      </Tooltip>

      {/* 通知面板（真实数据源 = config.notifications.items） */}
      <Popover
        open={!!notifAnchor}
        anchorEl={notifAnchor}
        onClose={() => setNotifAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{ sx: { width: 380 } }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 2,
            py: 1.25,
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Typography sx={{ fontWeight: 700 }}>
            通知
            {hasUpdateAvailable && (
              <Box
                component="span"
                sx={{
                  ml: 1,
                  px: 1,
                  py: 0.25,
                  fontSize: 11,
                  fontWeight: 700,
                  borderRadius: 1,
                  bgcolor: "warning.main",
                  color: "#000",
                }}
              >
                {`新版 v${updater.cached?.version ?? updater.available?.version ?? ""}`}
              </Box>
            )}
          </Typography>
          <Button
            size="small"
            startIcon={<DoneAllIcon />}
            onClick={markAllNotificationsRead}
          >
            全部已读
          </Button>
        </Box>

        <Box sx={{ maxHeight: 420, overflow: "auto" }}>
          {items.length === 0 && (
            <Box sx={{ px: 2, py: 4, textAlign: "center", color: "text.disabled" }}>
              <Typography variant="body2">暂无通知</Typography>
            </Box>
          )}
          {items.map((n) => (
            <Box
              key={n.id}
              onClick={() => handleNotifClick(n)}
              sx={{
                display: "flex",
                gap: 1,
                px: 2,
                py: 1.25,
                borderBottom: 1,
                borderColor: "divider",
                bgcolor: n.read ? "transparent" : "action.hover",
                cursor: "pointer",
                "&:hover": { bgcolor: "action.selected" },
              }}
            >
              <FiberManualRecordIcon
                sx={{
                  fontSize: 10,
                  mt: 0.6,
                  color: notifColor[n.type] ?? "text.secondary",
                  visibility: n.read ? "hidden" : "visible",
                }}
              />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" alignItems="center" spacing={0.75}>
                  <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                    {n.title}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: 10,
                      px: 0.6,
                      py: 0.15,
                      borderRadius: 0.5,
                      bgcolor: (t) =>
                        t.palette.mode === "dark"
                          ? "action.selected"
                          : "action.hover",
                      color:
                        n.type === "update"
                          ? "warning.main"
                          : notifColor[n.type] ?? "text.secondary",
                    }}
                  >
                    {typeLabel[n.type] ?? "通知"}
                  </Typography>
                </Stack>
                <Typography
                  sx={{
                    fontSize: 12,
                    color: "text.secondary",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {n.body}
                </Typography>
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{ mt: 0.25 }}
                >
                  <Typography sx={{ fontSize: 11, color: "text.disabled" }}>
                    {n.time}
                  </Typography>
                  <Box className="no-drag" onMouseDownCapture={stopDrag}>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeNotification(n.id);
                      }}
                      sx={{ color: "text.disabled", p: 0.25 }}
                    >
                      <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Box>
                </Stack>
              </Box>
            </Box>
          ))}
        </Box>

        {hasUpdateAvailable && (
          <>
            <Divider />
            <Box
              sx={{
                px: 2,
                py: 1.25,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                bgcolor: "warning.main",
                color: "#000",
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <UpdateIcon sx={{ fontSize: 18 }} />
                <Box>
                  <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                    {`最新版本 v${updater.cached?.version ?? updater.available?.version ?? ""}`}
                  </Typography>
                  <Typography sx={{ fontSize: 11, opacity: 0.8 }}>
                    {updater.cached?.hasDelta ? "支持增量更新，失败自动回退全量" : "点击前往下载并安装"}
                  </Typography>
                </Box>
              </Stack>
              <Button
                size="small"
                variant="contained"
                sx={{ bgcolor: "#000", color: "#fff", "&:hover": { bgcolor: "#222" } }}
                onClick={() => {
                  setNotifAnchor(null);
                  navigate("/settings");
                }}
              >
                前往更新
              </Button>
            </Box>
          </>
        )}
      </Popover>

      {/* 主下拉菜单 */}
      <Menu
        open={!!menuAnchor}
        anchorEl={menuAnchor}
        onClose={closeMenus}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{ sx: { minWidth: 180, mt: 1 } }}
      >
        <MenuItem
          onClick={(e) => {
            setMenuAnchor(null);
            setLangAnchor(e.currentTarget);
          }}
        >
          <ListItemIcon>
            <LanguageIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>语言</ListItemText>
          <ChevronRightIcon fontSize="small" />
        </MenuItem>
        <MenuItem
          onClick={(e) => {
            setMenuAnchor(null);
            setThemeAnchor(e.currentTarget);
          }}
        >
          <ListItemIcon>
            {mode === "dark" ? (
              <DarkModeIcon fontSize="small" />
            ) : mode === "light" ? (
              <LightModeIcon fontSize="small" />
            ) : (
              <BrightnessMediumIcon fontSize="small" />
            )}
          </ListItemIcon>
          <ListItemText>主题</ListItemText>
          <ChevronRightIcon fontSize="small" />
        </MenuItem>
        <MenuItem
          onClick={() => {
            closeMenus();
            navigate("/settings");
          }}
        >
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>设置</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            closeMenus();
            setLoggedIn((v) => !v);
          }}
        >
          <ListItemIcon>
            {loggedIn ? (
              <LogoutIcon fontSize="small" />
            ) : (
              <LoginIcon fontSize="small" />
            )}
          </ListItemIcon>
          <ListItemText>{loggedIn ? "登出" : "登录"}</ListItemText>
        </MenuItem>
      </Menu>

      {/* 语言子菜单 */}
      <Menu
        open={!!langAnchor}
        anchorEl={langAnchor}
        onClose={() => setLangAnchor(null)}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        PaperProps={{ sx: { minWidth: 160 } }}
      >
        <MenuItem
          selected={lang === "zh"}
          onClick={() => {
            setLang("zh");
            setLangAnchor(null);
          }}
        >
          简体中文
          {lang === "zh" && <CheckIcon fontSize="small" sx={{ ml: "auto" }} />}
        </MenuItem>
        <MenuItem
          selected={lang === "en"}
          onClick={() => {
            setLang("en");
            setLangAnchor(null);
          }}
        >
          English
          {lang === "en" && <CheckIcon fontSize="small" sx={{ ml: "auto" }} />}
        </MenuItem>
      </Menu>

      {/* 主题子菜单 */}
      <Menu
        open={!!themeAnchor}
        anchorEl={themeAnchor}
        onClose={() => setThemeAnchor(null)}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        PaperProps={{ sx: { minWidth: 160 } }}
      >
        <MenuItem
          selected={mode === "light"}
          onClick={() => {
            setMode("light");
            setThemeAnchor(null);
          }}
        >
          浅色
          {mode === "light" && <CheckIcon fontSize="small" sx={{ ml: "auto" }} />}
        </MenuItem>
        <MenuItem
          selected={mode === "dark"}
          onClick={() => {
            setMode("dark");
            setThemeAnchor(null);
          }}
        >
          深色
          {mode === "dark" && <CheckIcon fontSize="small" sx={{ ml: "auto" }} />}
        </MenuItem>
        <MenuItem
          selected={mode === "system"}
          onClick={() => {
            setMode("system");
            setThemeAnchor(null);
          }}
        >
          跟随系统
          {mode === "system" && (
            <CheckIcon fontSize="small" sx={{ ml: "auto" }} />
          )}
        </MenuItem>
      </Menu>
    </Box>
  );
}
