'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Chart, useChart } from 'src/components/chart';

import { useRouter } from 'src/routes/hooks';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import LinearProgress from '@mui/material/LinearProgress';
import CircularProgress from '@mui/material/CircularProgress';
import { useTheme } from '@mui/material/styles';

import { paths } from 'src/routes/al/paths';
import { Iconify } from 'src/components/iconify';
import useDashboardStore from 'src/stores/dashboard';

// ----------------------------------------------------------------------

const ORDER_STATUS_LABEL: Record<string, string> = {
   waiting_payment: 'Menunggu Bayar',
   on_progress: 'Diproses',
   finish: 'Selesai',
   cancelled: 'Dibatalkan',
   stock_issue: 'Stok Habis',
};

const ORDER_STATUS_COLOR: Record<string, 'primary' | 'warning' | 'success' | 'error' | 'info'> = {
   waiting_payment: 'warning',
   on_progress: 'primary',
   finish: 'success',
   cancelled: 'error',
   stock_issue: 'error',
};

function formatRp(value: number) {
   return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
}

// Mock chart data (replace with real date-based data from API when available)
function buildMockRevenueChart(totalRevenue: number) {
   const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun'];
   return months.map((month, i) => ({
      month,
      pendapatan: Math.round((totalRevenue / 6) * (0.6 + Math.random() * 0.8)),
   }));
}

// ----------------------------------------------------------------------

interface KpiCardProps {
   title: string;
   value: string;
   icon: string;
   color: string;
   subtitle?: string;
}

function KpiCard({ title, value, icon, color, subtitle }: KpiCardProps) {
   return (
      <Card sx={{ height: '100%' }}>
         <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
               <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                     {title}
                  </Typography>
                  <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5 }}>
                     {value}
                  </Typography>
                  {subtitle && (
                     <Typography variant="caption" color="text.secondary">
                        {subtitle}
                     </Typography>
                  )}
               </Box>
               <Avatar sx={{ bgcolor: `${color}.lighter`, width: 52, height: 52 }}>
                  <Iconify icon={icon} width={28} sx={{ color: `${color}.main` }} />
               </Avatar>
            </Stack>
         </CardContent>
      </Card>
   );
}

// ----------------------------------------------------------------------

export function ManagerDashboard() {
   const theme = useTheme();
   const router = useRouter();
   const { getManagerData } = useDashboardStore();
   const [data, setData] = useState<any>(null);
   const [loading, setLoading] = useState(true);

   useEffect(() => {
      const load = async () => {
         setLoading(true);
         try {
            const res = await getManagerData();
            setData(res?.data);
         } finally {
            setLoading(false);
         }
      };
      load();
   }, []); // eslint-disable-line

   const chartData = buildMockRevenueChart(data?.total_revenue || 0);
   const chartOptions = useChart({
      xaxis: {
         categories: chartData.map((d) => d.month),
      },
      tooltip: {
         y: {
            formatter: (value: number) => formatRp(value),
         },
      },
   });

   if (loading) {
      return (
         <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
            <CircularProgress />
         </Box>
      );
   }

   const rawMaterial = data?.raw_material || {};
   const lowStockItems: any[] = rawMaterial.low_stock_items || [];

   return (
      <Stack spacing={3}>
         {/* Header */}
         <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
               <Typography variant="h5" fontWeight={700}>Dashboard Manager</Typography>
               <Typography variant="body2" color="text.secondary">Ringkasan bisnis & operasional</Typography>
            </Box>
            <Stack direction="row" spacing={1}>
               <Button
                  component={Link}
                  href={paths.dashboard.finance.reports}
                  variant="outlined"
                  startIcon={<Iconify icon="solar:chart-bold-duotone" />}
               >
                  Laporan Keuangan
               </Button>
               <Button
                  component={Link}
                  href={paths.dashboard.users.new}
                  variant="contained"
                  startIcon={<Iconify icon="mingcute:add-line" />}
               >
                  Tambah Karyawan
               </Button>
            </Stack>
         </Stack>

         {/* Low Stock Alert */}
         {lowStockItems.length > 0 && (
            <Alert severity="warning" icon={<Iconify icon="solar:danger-bold-duotone" />}>
               <strong>{lowStockItems.length} bahan baku</strong> memiliki stok di bawah 20:{' '}
               {lowStockItems.slice(0, 3).map((m: any) => m.title).join(', ')}
               {lowStockItems.length > 3 && `, dan ${lowStockItems.length - 3} lainnya`}
            </Alert>
         )}

         {/* KPI Row 1 — Financial */}
         <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
               <KpiCard
                  title="Total Pendapatan"
                  value={formatRp(data?.total_revenue || 0)}
                  icon="solar:dollar-minimalistic-bold-duotone"
                  color="success"
                  subtitle="Dari pesanan selesai"
               />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
               <KpiCard
                  title="Total Pengeluaran"
                  value={formatRp(data?.total_expense || 0)}
                  icon="solar:cart-large-2-bold-duotone"
                  color="error"
                  subtitle="Pembelian bahan baku"
               />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
               <KpiCard
                  title="Laba Bersih (Est.)"
                  value={formatRp(data?.net_profit || 0)}
                  icon="solar:graph-up-bold-duotone"
                  color={(data?.net_profit || 0) >= 0 ? 'success' : 'error'}
                  subtitle="Pendapatan - Pengeluaran"
               />
            </Grid>
         </Grid>

         {/* KPI Row 2 — Operational */}
         <Grid container spacing={2}>
            <Grid size={{ xs: 6, md: 3 }}>
               <KpiCard
                  title="Total Pesanan"
                  value={String(data?.total_orders || 0)}
                  icon="solar:bag-4-bold-duotone"
                  color="info"
               />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
               <KpiCard
                  title="Total Karyawan"
                  value={String(data?.total_employees || 0)}
                  icon="solar:users-group-two-rounded-bold-duotone"
                  color="warning"
               />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
               <KpiCard
                  title="Layanan Aktif"
                  value={String(data?.total_services || 0)}
                  icon="solar:washing-machine-bold-duotone"
                  color="primary"
               />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
               <Card sx={{ height: '100%' }}>
                  <CardContent>
                     <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        Bahan Baku
                     </Typography>
                     <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                        <Chip label={`${rawMaterial.below_20 || 0} kritis`} size="small" color="error" />
                        <Chip label={`${rawMaterial.above_20 || 0} aman`} size="small" color="success" />
                     </Stack>
                     <Typography variant="caption" color="text.secondary">
                        Total {rawMaterial.total || 0} bahan
                     </Typography>
                  </CardContent>
               </Card>
            </Grid>
         </Grid>

         <Grid container spacing={3} sx={{ mt: 0.5 }}>
            {/* Revenue Chart */}
                  <Grid size={{ xs: 12, md: 8 }}>
                     <Card>
                        <CardHeader
                           title="Estimasi Pendapatan"
                           subheader="Data berbasis total pesanan selesai"
                           titleTypographyProps={{ variant: 'h6', fontWeight: 700 }}
                        />
                        <CardContent>
                           <Chart
                              type="area"
                              series={[{ name: 'Pendapatan', data: chartData.map((d) => d.pendapatan) }]}
                              options={chartOptions}
                              sx={{ height: 280 }}
                           />
                        </CardContent>
                     </Card>
                  </Grid>

            {/* Quick Navigation */}
            <Grid size={{ xs: 12, md: 4 }}>
               <Card sx={{ height: '100%' }}>
                  <CardHeader
                     title="Navigasi Cepat"
                     titleTypographyProps={{ variant: 'h6', fontWeight: 700 }}
                  />
                  <CardContent sx={{ pt: 0 }}>
                     <Stack spacing={0}>
                        {[
                           { label: 'Kelola Layanan', icon: 'solar:washing-machine-bold-duotone', href: paths.dashboard.service.root },
                           { label: 'Pesanan Masuk', icon: 'solar:bag-4-bold-duotone', href: paths.dashboard.orders.root },
                           { label: 'Laporan Keuangan', icon: 'solar:chart-bold-duotone', href: paths.dashboard.finance.reports },
                           { label: 'Bahan Baku', icon: 'solar:box-bold-duotone', href: paths.dashboard.rawMaterials.root },
                           { label: 'Pembelian Bahan', icon: 'solar:cart-large-2-bold-duotone', href: paths.dashboard.rawMaterialPurchases.root },
                           { label: 'Karyawan', icon: 'solar:users-group-two-rounded-bold-duotone', href: paths.dashboard.users.root },
                        ].map(({ label, icon, href }, index) => (
                           <Box key={`${label}-${index}`}>
                              <Stack
                                 component={Link}
                                 href={href}
                                 direction="row"
                                 alignItems="center"
                                 spacing={2}
                                 sx={{
                                    py: 1.5,
                                    px: 1,
                                    textDecoration: 'none',
                                    color: 'text.primary',
                                    borderRadius: 1,
                                    '&:hover': { bgcolor: 'action.hover' },
                                 }}
                              >
                                 <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.lighter' }}>
                                    <Iconify icon={icon} width={18} sx={{ color: 'primary.main' }} />
                                 </Avatar>
                                 <Typography variant="body2" fontWeight={500}>{label}</Typography>
                                 <Box flex={1} />
                                 <Iconify icon="solar:alt-arrow-right-outline" width={16} sx={{ color: 'text.disabled' }} />
                              </Stack>
                              <Divider />
                           </Box>
                        ))}
                     </Stack>
                  </CardContent>
               </Card>
            </Grid>
         </Grid>

         {/* Orders by Status + Recent Orders */}
         <Grid container spacing={3}>
            {/* Orders by Status */}
            <Grid size={{ xs: 12, md: 5 }}>
               <Card>
                  <CardHeader
                     title="Pesanan per Status"
                     titleTypographyProps={{ variant: 'h6', fontWeight: 700 }}
                  />
                  <CardContent sx={{ pt: 0 }}>
                     <Stack spacing={2}>
                        {(data?.orders_by_status || []).map((item: any, index: number) => {
                           const total = data?.total_orders || 1;
                           const pct = Math.round((item.count / total) * 100);
                           return (
                              <Box key={`${item.status}-${index}`}>
                                 <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                                    <Typography variant="caption">
                                       {ORDER_STATUS_LABEL[item.status] || item.status}
                                    </Typography>
                                    <Typography variant="caption" fontWeight={700}>
                                       {item.count} ({pct}%)
                                    </Typography>
                                 </Stack>
                                 <LinearProgress
                                    variant="determinate"
                                    value={pct}
                                    color={(ORDER_STATUS_COLOR[item.status] as any) || 'primary'}
                                    sx={{ height: 8, borderRadius: 4 }}
                                 />
                              </Box>
                           );
                        })}
                     </Stack>
                  </CardContent>
               </Card>
            </Grid>

            {/* Recent Orders */}
            <Grid size={{ xs: 12, md: 7 }}>
               <Card>
                  <CardHeader
                     title="Pesanan Terbaru"
                     titleTypographyProps={{ variant: 'h6', fontWeight: 700 }}
                     action={
                        <Button component={Link} href={paths.dashboard.orders.root} size="small">
                           Lihat Semua
                        </Button>
                     }
                  />
                  <CardContent sx={{ pt: 0, px: 0 }}>
                     <Table size="small">
                        <TableHead>
                           <TableRow>
                              <TableCell>No. Pesanan</TableCell>
                              <TableCell>Pelanggan</TableCell>
                              <TableCell align="right">Total</TableCell>
                              <TableCell>Status</TableCell>
                           </TableRow>
                        </TableHead>
                        <TableBody>
                           {(data?.recent_orders || []).map((order: any, index: number) => (
                              <TableRow
                                 key={`${order.id}-${index}`}
                                 hover
                                 onClick={() => router.push(paths.dashboard.orders.detail(order.id))}
                                 sx={{ cursor: 'pointer' }}
                              >
                                 <TableCell>
                                    <Typography variant="caption" fontWeight={700}>
                                       #{order.order_number}
                                    </Typography>
                                 </TableCell>
                                 <TableCell>{order.user?.name || '-'}</TableCell>
                                 <TableCell align="right">
                                    <Typography variant="caption">
                                       {formatRp(order.total_bill || 0)}
                                    </Typography>
                                 </TableCell>
                                 <TableCell>
                                    <Chip
                                       label={ORDER_STATUS_LABEL[order.status] || order.status}
                                       size="small"
                                       color={ORDER_STATUS_COLOR[order.status] || 'default'}
                                    />
                                 </TableCell>
                              </TableRow>
                           ))}
                        </TableBody>
                     </Table>
                  </CardContent>
               </Card>
            </Grid>
         </Grid>

         {/* Recent Activity */}
         {(data?.recent_activity || []).length > 0 && (
            <Card>
               <CardHeader
                  title="Aktivitas Terbaru"
                  titleTypographyProps={{ variant: 'h6', fontWeight: 700 }}
               />
               <CardContent sx={{ pt: 0 }}>
                  <Stack spacing={1.5}>
                     {(data?.recent_activity || []).map((log: any, index: number) => (
                        <Stack key={`${log.id}-${index}`} direction="row" spacing={2} alignItems="flex-start">
                           <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.lighter', flexShrink: 0 }}>
                              <Iconify icon="solar:bell-bold-duotone" width={16} sx={{ color: 'primary.main' }} />
                           </Avatar>
                           <Box>
                              <Typography variant="caption" fontWeight={600}>
                                 Status pesanan diubah ke{' '}
                                 <Chip
                                    label={ORDER_STATUS_LABEL[log.status] || log.status}
                                    size="small"
                                    color={ORDER_STATUS_COLOR[log.status] || 'default'}
                                    sx={{ height: 18, fontSize: 10 }}
                                 />
                              </Typography>
                              {log.reason && (
                                 <Typography variant="caption" color="text.secondary" display="block">
                                    {log.reason}
                                 </Typography>
                              )}
                              <Typography variant="caption" color="text.disabled">
                                 {new Date(log.created_at).toLocaleString('id-ID')}
                              </Typography>
                           </Box>
                        </Stack>
                     ))}
                  </Stack>
               </CardContent>
            </Card>
         )}
      </Stack>
   );
}
