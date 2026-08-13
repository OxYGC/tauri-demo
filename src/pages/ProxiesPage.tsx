import { useState, type ReactNode } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Grid,
  TextField,
  LinearProgress,
  Stack,
  Divider,
  Dialog,
  DialogContent,
  IconButton,
  Tooltip,
} from "@mui/material";
import SpeedIcon from "@mui/icons-material/Speed";
import RouterIcon from "@mui/icons-material/Router";
import PhoneIcon from "@mui/icons-material/Phone";
import LaptopIcon from "@mui/icons-material/Laptop";
import StorageIcon from "@mui/icons-material/Storage";
import WifiIcon from "@mui/icons-material/Wifi";
import PublicIcon from "@mui/icons-material/Public";
import HomeIcon from "@mui/icons-material/Home";
import CloseIcon from "@mui/icons-material/Close";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";

interface SpeedResult {
  ping: number;
  download: number;
  upload: number;
}

interface LanDevice {
  id: string;
  ip: string;
  mac: string;
  name: string;
  type: "router" | "phone" | "laptop" | "nas" | "iot";
  notes: string;
}

const initialDevices: LanDevice[] = [
  {
    id: "d1",
    ip: "192.168.1.1",
    mac: "AA:BB:CC:DD:EE:01",
    name: "主路由器",
    type: "router",
    notes: "网关设备",
  },
  {
    id: "d2",
    ip: "192.168.1.5",
    mac: "AA:BB:CC:DD:EE:02",
    name: "MacBook Pro",
    type: "laptop",
    notes: "工作电脑",
  },
  {
    id: "d3",
    ip: "192.168.1.12",
    mac: "AA:BB:CC:DD:EE:03",
    name: "iPhone 15",
    type: "phone",
    notes: "",
  },
  {
    id: "d4",
    ip: "192.168.1.20",
    mac: "AA:BB:CC:DD:EE:04",
    name: "群晖 NAS",
    type: "nas",
    notes: "DS920+",
  },
  {
    id: "d5",
    ip: "192.168.1.30",
    mac: "AA:BB:CC:DD:EE:05",
    name: "智能音箱",
    type: "iot",
    notes: "",
  },
];

const deviceIconMap: Record<LanDevice["type"], ReactNode> = {
  router: <RouterIcon />,
  phone: <PhoneIcon />,
  laptop: <LaptopIcon />,
  nas: <StorageIcon />,
  iot: <WifiIcon />,
};

/* 双击 Card 边框触发 Dialog 全屏放大显示其内容 */
function ZoomableCard({
  title,
  children,
  cardSx,
}: {
  title: string;
  children: ReactNode;
  cardSx?: object;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Card
        variant="outlined"
        onDoubleClick={() => setOpen(true)}
        sx={{
          height: "100%",
          cursor: "zoom-in",
          position: "relative",
          transition: "border-color .15s, box-shadow .15s",
          "&:hover": {
            borderColor: "primary.main",
            boxShadow: 2,
          },
          "&:hover .zoom-hint": { opacity: 1 },
          ...cardSx,
        }}
      >
        {children}
        <Tooltip title="双击放大" placement="left">
          <IconButton
            className="zoom-hint"
            size="small"
            onClick={() => setOpen(true)}
            sx={{
              position: "absolute",
              top: 4,
              right: 4,
              opacity: 0,
              transition: "opacity .15s",
              bgcolor: "background.paper",
              "&:hover": { bgcolor: "action.hover" },
            }}
          >
            <OpenInFullIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
      </Card>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth={false}
        sx={{
          "& .MuiDialog-paper": {
            margin: 1.5,
            maxHeight: "calc(100vh - 24px)",
            height: "calc(100vh - 24px)",
            width: "calc(100vw - 24px)",
            maxWidth: "calc(100vw - 24px) !important",
            borderRadius: 2,
            overflow: "hidden",
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            px: 2,
            py: 1.25,
            borderBottom: 1,
            borderColor: "divider",
            bgcolor: "background.default",
          }}
        >
          <Typography sx={{ fontWeight: 700, fontSize: 16 }}>{title}</Typography>
          <Box sx={{ flex: 1 }} />
          <IconButton size="small" onClick={() => setOpen(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        <DialogContent
          sx={{
            p: 3,
            overflow: "auto",
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
          }}
        >
          <Box sx={{ width: "100%", maxWidth: 1200 }}>{children}</Box>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SpeedTestCard({
  title,
  icon,
  finalResult,
}: {
  title: string;
  icon: ReactNode;
  finalResult: SpeedResult;
}) {
  const [testing, setTesting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<SpeedResult | null>(null);

  const start = () => {
    setTesting(true);
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((p) => Math.min(100, p + 100 / 30));
    }, 100);
    setTimeout(() => {
      clearInterval(interval);
      setProgress(100);
      setResult(finalResult);
      setTesting(false);
    }, 3000);
  };

  return (
    <CardContent>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
        {icon}
        <Typography sx={{ fontWeight: 600, fontSize: 15 }}>{title}</Typography>
        <Box sx={{ flex: 1 }} />
        <Button
          variant="contained"
          size="small"
          disabled={testing}
          onClick={start}
          startIcon={<SpeedIcon />}
        >
          {testing ? "测试中..." : "开始测试"}
        </Button>
      </Box>
      {testing && (
        <Box sx={{ mb: 1.5 }}>
          <LinearProgress variant="determinate" value={progress} />
        </Box>
      )}
      <Stack
        direction="row"
        spacing={2}
        divider={<Divider orientation="vertical" flexItem />}
      >
        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Ping
          </Typography>
          <Typography sx={{ fontWeight: 600 }}>
            {result ? `${result.ping} ms` : "-"}
          </Typography>
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" color="text.secondary">
            ↓ 下载
          </Typography>
          <Typography sx={{ fontWeight: 600 }}>
            {result ? `${result.download.toFixed(1)} MB/s` : "-"}
          </Typography>
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" color="text.secondary">
            ↑ 上传
          </Typography>
          <Typography sx={{ fontWeight: 600 }}>
            {result ? `${result.upload.toFixed(1)} MB/s` : "-"}
          </Typography>
        </Box>
      </Stack>
    </CardContent>
  );
}

export default function ProxiesPage() {
  const [devices, setDevices] = useState<LanDevice[]>(initialDevices);

  const updateNotes = (id: string, notes: string) => {
    setDevices((prev) => prev.map((d) => (d.id === id ? { ...d, notes } : d)));
  };

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          mb: 2,
          gap: 1,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          网络
        </Typography>
        <Box sx={{ flex: 1 }} />
      </Box>

      {/* 网速测试 */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
          <SpeedIcon fontSize="small" />
          <Typography sx={{ fontWeight: 600, fontSize: 16 }}>网速测试</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
            （双击卡片可全屏放大）
          </Typography>
        </Box>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <ZoomableCard title="国内网速">
              <SpeedTestCard
                title="国内网速"
                icon={<HomeIcon color="primary" />}
                finalResult={{ ping: 50, download: 95.2, upload: 12.3 }}
              />
            </ZoomableCard>
          </Grid>
          <Grid item xs={12} md={6}>
            <ZoomableCard title="国外网速">
              <SpeedTestCard
                title="国外网速"
                icon={<PublicIcon color="primary" />}
                finalResult={{ ping: 180, download: 45.6, upload: 8.1 }}
              />
            </ZoomableCard>
          </Grid>
        </Grid>
      </Box>

      {/* 局域网拓扑图 */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
          <RouterIcon fontSize="small" />
          <Typography sx={{ fontWeight: 600, fontSize: 16 }}>局域网拓扑图</Typography>
          <Chip label={`${devices.length} 台设备`} size="small" />
          <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
            （双击卡片可全屏放大）
          </Typography>
        </Box>
        <Grid container spacing={2}>
          {devices.map((device) => (
            <Grid item xs={12} sm={6} md={4} key={device.id}>
              <ZoomableCard title={device.name}>
                <CardContent>
                  <Box
                    sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}
                  >
                    <Box sx={{ color: "primary.main" }}>
                      {deviceIconMap[device.type]}
                    </Box>
                    <Typography sx={{ fontWeight: 600, fontSize: 15 }}>
                      {device.name}
                    </Typography>
                    <Box sx={{ flex: 1 }} />
                    <Chip
                      label={device.type.toUpperCase()}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                  <Stack spacing={1}>
                    <Box
                      sx={{ display: "flex", justifyContent: "space-between" }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        IP 地址
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ fontFamily: "monospace" }}
                      >
                        {device.ip}
                      </Typography>
                    </Box>
                    <Box
                      sx={{ display: "flex", justifyContent: "space-between" }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        MAC 地址
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ fontFamily: "monospace" }}
                      >
                        {device.mac}
                      </Typography>
                    </Box>
                    <TextField
                      label="备注"
                      size="small"
                      fullWidth
                      value={device.notes}
                      onChange={(e) => updateNotes(device.id, e.target.value)}
                    />
                  </Stack>
                </CardContent>
              </ZoomableCard>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
}
