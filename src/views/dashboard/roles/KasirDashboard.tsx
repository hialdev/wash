'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/al/paths';
import { Iconify } from 'src/components/iconify';
import useOrderStore from 'src/stores/order';

// ----------------------------------------------------------------------

const STATUS_COLOR: Record<string, 'default' | 'primary' | 'warning' | 'success' | 'error'> = {
   waiting_payment: 'warning',
   on_progress: 'primary',
   finish: 'success',
   cancelled: 'error',
   stock_issue: 'error',
};

const STATUS_LABEL: Record<string, string> = {
   waiting_payment: 'Menunggu Bayar',
   on_progress: 'Diproses',
   finish: 'Selesai',
   cancelled: 'Dibatalkan',
   stock_issue: 'Stok Habis',
};

export function KasirDashboard() {
   const { all: getAllOrders } = useOrderStore();

   const [orders, setOrders] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);
   const [counts, setCounts] = useState<Record<string, number>>({});

   useEffect(() => {
      const load = async () => {
         setLoading(true);
         try {
            const res = await getAllOrders({
               page: 1,
               limit: 20,
               sort: 'created_at',
               order: 'desc',
            });
            const orderList = res?.data?.orders || res?.data?.data || [];
            setOrders(orderList);

            // Count by status
            const c: Record<string, number> = {};
            orderList.forEach((o: any) => {
               c[o.status] = (c[o.status] || 0) + 1;
            });
            setCounts(c);
         } finally {
            setLoading(false);
         }
      };
      load();
   }, []); // eslint-disable-line

   const activeOrders = orders.filter((o) =>
      ['waiting_payment', 'on_progress', 'stock_issue'].includes(o.status)
   );

   if (loading) {
      return (
         <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
            <CircularProgress />
         </Box>
      );
   }

   return (
      <Stack spacing={3}>
         {/* Header */}
         <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
               <Typography variant="h5" fontWeight={700}>Kasir Dashboard</Typography>
               <Typography variant="body2" color="text.secondary">Kelola dan proses pesanan layanan</Typography>
            </Box>
            <Button
               component={Link}
               href={paths.dashboard.orders.boarding}
               variant="contained"
               size="large"
               startIcon={<Iconify icon="solar:add-square-bold" />}
            >
               Buat Pesanan Baru
            </Button>
         </Stack>

         {/* Quick Actions */}
         <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
               <Card
                  component={Link}
                  href={paths.dashboard.orders.boarding}
                  sx={{
                     textDecoration: 'none',
                     cursor: 'pointer',
                     border: '1px solid',
                     borderColor: 'divider',
                     transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                     '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 },
                  }}
               >
                  <CardContent>
                     <Stack direction="row" alignItems="center" spacing={2}>
                        <Avatar sx={{ bgcolor: 'primary.main', width: 52, height: 52 }}>
                           <Iconify icon="solar:clipboard-add-bold-duotone" width={28} sx={{ color: 'common.white' }} />
                        </Avatar>
                        <Box>
                           <Typography variant="subtitle1" fontWeight={700} color="inherit">
                              Buat Pesanan
                           </Typography>
                           <Typography variant="caption" sx={{ opacity: 0.85 }} color="inherit">
                              Order Boarding 3-step
                           </Typography>
                        </Box>
                        <Iconify icon="solar:arrow-right-bold" sx={{ ml: 'auto', opacity: 0.7 }} />
                     </Stack>
                  </CardContent>
               </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
               <Card
                  component={Link}
                  href={paths.dashboard.orders.root}
                  sx={{
                     textDecoration: 'none',
                     cursor: 'pointer',
                     border: '1px solid',
                     borderColor: 'divider',
                     transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                     '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 },
                  }}
               >
                  <CardContent>
                     <Stack direction="row" alignItems="center" spacing={2}>
                        <Avatar sx={{ bgcolor: 'warning.lighter', width: 52, height: 52 }}>
                           <Iconify icon="solar:list-bold-duotone" width={28} sx={{ color: 'warning.main' }} />
                        </Avatar>
                        <Box>
                           <Typography variant="subtitle1" fontWeight={700}>Daftar Pesanan</Typography>
                           <Typography variant="caption" color="text.secondary">Lihat semua pesanan</Typography>
                        </Box>
                        <Iconify icon="solar:arrow-right-bold" sx={{ ml: 'auto', color: 'text.disabled' }} />
                     </Stack>
                  </CardContent>
               </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
               <Card
                  component={Link}
                  href={paths.dashboard.users.root}
                  sx={{
                     textDecoration: 'none',
                     cursor: 'pointer',
                     border: '1px solid',
                     borderColor: 'divider',
                     transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                     '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 },
                  }}
               >
                  <CardContent>
                     <Stack direction="row" alignItems="center" spacing={2}>
                        <Avatar sx={{ bgcolor: 'info.lighter', width: 52, height: 52 }}>
                           <Iconify icon="solar:users-group-rounded-bold-duotone" width={28} sx={{ color: 'info.main' }} />
                        </Avatar>
                        <Box>
                           <Typography variant="subtitle1" fontWeight={700}>Data Customer</Typography>
                           <Typography variant="caption" color="text.secondary">Kelola pelanggan</Typography>
                        </Box>
                        <Iconify icon="solar:arrow-right-bold" sx={{ ml: 'auto', color: 'text.disabled' }} />
                     </Stack>
                  </CardContent>
               </Card>
            </Grid>
         </Grid>

         {/* Status Summary */}
         <Grid container spacing={2}>
            {Object.entries(STATUS_LABEL).map(([status, label]) => (
               <Grid size={{ xs: 6, md: 3 }} key={status}>
                  <Card>
                     <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                           <Box>
                              <Typography variant="caption" color="text.secondary">{label}</Typography>
                              <Typography variant="h4" fontWeight={700}>{counts[status] || 0}</Typography>
                           </Box>
                           <Avatar
                              sx={{
                                 bgcolor: `${STATUS_COLOR[status]}.lighter`,
                                 width: 48,
                                 height: 48,
                              }}
                           >
                              <Iconify
                                 icon={
                                    status === 'finish' ? 'solar:check-circle-bold-duotone' :
                                    status === 'on_progress' ? 'solar:washing-machine-bold-duotone' :
                                    status === 'waiting_payment' ? 'solar:card-bold-duotone' :
                                    'solar:close-circle-bold-duotone'
                                 }
                                 sx={{ color: `${STATUS_COLOR[status]}.main` }}
                              />
                           </Avatar>
                        </Stack>
                     </CardContent>
                  </Card>
               </Grid>
            ))}
         </Grid>

         {/* Active Orders Queue */}
         <Card>
            <CardContent>
               <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="h6" fontWeight={700}>
                     Antrian Aktif ({activeOrders.length})
                  </Typography>
                  <Button
                     component={Link}
                     href={paths.dashboard.orders.root}
                     size="small"
                     endIcon={<Iconify icon="solar:alt-arrow-right-outline" />}
                  >
                     Lihat Semua
                  </Button>
               </Stack>

               {activeOrders.length === 0 ? (
                  <Box textAlign="center" py={4}>
                     <Iconify icon="solar:check-circle-bold-duotone" width={48} sx={{ color: 'success.main', mb: 1 }} />
                     <Typography color="text.secondary">Tidak ada pesanan aktif</Typography>
                  </Box>
               ) : (
                  <Table size="small">
                     <TableHead>
                        <TableRow>
                           <TableCell>No. Pesanan</TableCell>
                           <TableCell>Pelanggan</TableCell>
                           <TableCell>Total</TableCell>
                           <TableCell>Status</TableCell>
                           <TableCell align="right">Aksi</TableCell>
                        </TableRow>
                     </TableHead>
                     <TableBody>
                        {activeOrders.map((order) => (
                           <TableRow key={order.id} hover>
                              <TableCell>
                                 <Typography variant="caption" fontWeight={700}>
                                    #{order.order_number}
                                 </Typography>
                              </TableCell>
                              <TableCell>{order.user?.name || '-'}</TableCell>
                              <TableCell>
                                 Rp {(order.total_bill || 0).toLocaleString('id-ID')}
                              </TableCell>
                              <TableCell>
                                 <Chip
                                    label={STATUS_LABEL[order.status] || order.status}
                                    size="small"
                                    color={STATUS_COLOR[order.status] || 'default'}
                                 />
                              </TableCell>
                              <TableCell align="right">
                                 <Stack direction="row" spacing={1} justifyContent="flex-end">
                                    <Button
                                       size="small"
                                       component={Link}
                                       href={paths.dashboard.orders.detail(order.id)}
                                       variant="outlined"
                                    >
                                       Detail
                                    </Button>
                                    <Button
                                       size="small"
                                       component={Link}
                                       href={paths.dashboard.orders.process(order.id)}
                                       variant="contained"
                                       color="primary"
                                    >
                                       Proses
                                    </Button>
                                 </Stack>
                              </TableCell>
                           </TableRow>
                        ))}
                     </TableBody>
                  </Table>
               )}
            </CardContent>
         </Card>
      </Stack>
   );
}
