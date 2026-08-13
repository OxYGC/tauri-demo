import { useState } from "react";
import {
  Box,
  Typography,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import { connections as initialConnections } from "../data/mock";

const networkColor = (
  network: string
): "success" | "warning" | "info" | "default" =>
  network === "TCP" ? "success" : network === "UDP" ? "warning" : "default";

export default function ConnectionsPage() {
  const [rows, setRows] = useState(initialConnections);

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", mb: 2, gap: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          连接
        </Typography>
        <Chip label={`活跃 ${rows.length}`} size="small" color="primary" />
        <Box sx={{ flex: 1 }} />
        <IconButton
          size="small"
          color="error"
          onClick={() => setRows([])}
        >
          <Tooltip title="关闭所有连接">
            <DeleteSweepIcon />
          </Tooltip>
        </IconButton>
      </Box>

      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{ maxHeight: "calc(100vh - 180px)" }}
      >
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell>主机</TableCell>
              <TableCell align="center">网络</TableCell>
              <TableCell>链路</TableCell>
              <TableCell>规则</TableCell>
              <TableCell>进程</TableCell>
              <TableCell align="right">↓ 速度</TableCell>
              <TableCell align="right">↑ 速度</TableCell>
              <TableCell align="right">↓ 总量</TableCell>
              <TableCell align="right">↑ 总量</TableCell>
              <TableCell align="center">时长</TableCell>
              <TableCell align="center"></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((c) => (
              <TableRow key={c.id} hover>
                <TableCell sx={{ fontWeight: 500 }}>{c.host}</TableCell>
                <TableCell align="center">
                  <Chip
                    label={c.network}
                    size="small"
                    color={networkColor(c.network)}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {c.chains}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip label={c.rule} size="small" variant="outlined" />
                </TableCell>
                <TableCell>{c.process}</TableCell>
                <TableCell align="right">
                  <Typography variant="body2" color="success.main" fontWeight={600}>
                    {c.dlSpeed}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" color="info.main" fontWeight={600}>
                    {c.ulSpeed}
                  </Typography>
                </TableCell>
                <TableCell align="right" sx={{ color: "text.secondary" }}>
                  {c.dl}
                </TableCell>
                <TableCell align="right" sx={{ color: "text.secondary" }}>
                  {c.ul}
                </TableCell>
                <TableCell align="center" sx={{ color: "text.secondary" }}>
                  {c.time}
                </TableCell>
                <TableCell align="center">
                  <IconButton
                    size="small"
                    onClick={() =>
                      setRows((r) => r.filter((x) => x.id !== c.id))
                    }
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">暂无活跃连接</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
