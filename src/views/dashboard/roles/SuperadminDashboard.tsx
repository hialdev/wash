'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
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
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/al/paths';
import { Iconify } from 'src/components/iconify';
import useDashboardStore from 'src/stores/dashboard';

// ----------------------------------------------------------------------

export function SuperadminDashboard() {
   const { getSuperadminData, superadminData } = useDashboardStore();

   const [loading, setLoading] = useState(true);
   const [roleCounts, setRoleCounts] = useState<Record<string, number>>({});

   useEffect(() => {
      const load = async () => {
         setLoading(true);
         try {
            const res = await getSuperadminData();
            const data = res?.data || {};

            // Map backend role_counts to roleCounts state
            const counts: Record<string, number> = {};
            (data.role_counts || []).forEach((rc: any) => {
               const name = (rc.role_name || '').toLowerCase().trim().replace(/\s+/g, '');
               counts[name] = (counts[name] || 0) + rc.count;
            });
            setRoleCounts(counts);
         } finally {
            setLoading(false);
         }
      };
      load();
   }, []); // eslint-disable-line

   const roleConfig = [
      { name: 'superadmin', label: 'Superadmin', icon: 'solar:shield-bold-duotone', color: 'error' },
      { name: 'owner', label: 'Owner', icon: 'solar:crown-bold-duotone', color: 'warning' },
      { name: 'manager', label: 'Manager', icon: 'solar:briefcase-bold-duotone', color: 'info' },
      { name: 'kasir', label: 'Kasir/Staff', icon: 'solar:user-id-bold-duotone', color: 'primary' },
      { name: 'customer', label: 'Customer', icon: 'solar:user-bold-duotone', color: 'success' },
   ];

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
         <Card sx={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', color: 'white' }}>
            <CardContent sx={{ py: 3, px: 4 }}>
               <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" spacing={2}>
                  <Box>
                     <Stack direction="row" spacing={1} alignItems="center">
                        <Iconify icon="solar:shield-bold-duotone" width={28} sx={{ color: '#e94560' }} />
                        <Typography variant="h5" fontWeight={700}>Superadmin Panel</Typography>
                     </Stack>
                     <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5 }}>
                        Kelola seluruh pengguna, role, dan konfigurasi sistem
                     </Typography>
                  </Box>
                  <Stack direction="row" spacing={2}>
                     <Button
                        component={Link}
                        href={paths.dashboard.users.root}
                        variant="contained"
                        sx={{ bgcolor: '#e94560', '&:hover': { bgcolor: '#c73652' } }}
                        startIcon={<Iconify icon="solar:users-group-two-rounded-bold-duotone" />}
                     >
                        Kelola User
                     </Button>
                     <Button
                        component={Link}
                        href={paths.dashboard.settings}
                        variant="outlined"
                        sx={{ borderColor: 'white', color: 'white' }}
                        startIcon={<Iconify icon="solar:settings-minimalistic-bold-duotone" />}
                     >
                        Settings
                     </Button>
                  </Stack>
               </Stack>
            </CardContent>
         </Card>

         {/* System Summary Widgets */}
         <Grid container spacing={3}>
            {[
               { label: 'Total Users', value: superadminData?.total_users || 0, icon: 'solar:users-group-two-rounded-bold-duotone', color: 'primary' },
               { label: 'Total Roles', value: superadminData?.total_roles || 0, icon: 'solar:shield-keyhole-bold-duotone', color: 'info' },
               { label: 'Total Permissions', value: superadminData?.total_permissions || 0, icon: 'solar:key-bold-duotone', color: 'warning' },
               { label: 'Admin Active', value: roleCounts['superadmin'] || 0, icon: 'solar:user-speak-bold-duotone', color: 'error' },
            ].map(({ label, value, icon, color }, index) => (
               <Grid size={{ xs: 6, md: 3 }} key={`${label}-${index}`}>
                  <Card sx={{ bgcolor: `${color}.lighter`, color: `${color}.darker`, textAlign: 'center', py: 2 }}>
                     <Stack spacing={0.5} alignItems="center">
                        <Iconify icon={icon} width={32} />
                        <Typography variant="h4" fontWeight={800}>{value}</Typography>
                        <Typography variant="caption" fontWeight={700} sx={{ opacity: 0.8 }}>{label}</Typography>
                     </Stack>
                  </Card>
               </Grid>
            ))}
         </Grid>

         {/* Quick Action Cards */}
         <Grid container spacing={2}>
            {[
               { label: 'Kelola User', desc: 'CRUD semua pengguna', icon: 'solar:users-group-two-rounded-bold-duotone', color: 'primary', href: paths.dashboard.users.root },
               { label: 'Hak Akses', desc: 'User permissions & roles', icon: 'solar:lock-bold-duotone', color: 'warning', href: paths.dashboard.users.access },
               { label: 'Settings Sistem', desc: 'Konfigurasi aplikasi', icon: 'solar:settings-minimalistic-bold-duotone', color: 'info', href: paths.dashboard.settings },
               { label: 'Tambah User', desc: 'Buat akun baru', icon: 'mingcute:add-line', color: 'success', href: paths.dashboard.users.root },
            ].map(({ label, desc, icon, color, href }, index) => (
               <Grid size={{ xs: 6, md: 3 }} key={`${label}-${index}`}>
                  <Card
                     component={Link}
                     href={href}
                     sx={{
                        textDecoration: 'none',
                        height: '100%',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
                     }}
                  >
                     <CardContent>
                        <Avatar sx={{ bgcolor: `${color}.lighter`, width: 48, height: 48, mb: 2 }}>
                           <Iconify icon={icon} width={24} sx={{ color: `${color}.main` }} />
                        </Avatar>
                        <Typography variant="subtitle2" fontWeight={700}>{label}</Typography>
                        <Typography variant="caption" color="text.secondary">{desc}</Typography>
                     </CardContent>
                  </Card>
               </Grid>
            ))}
         </Grid>

         {/* Users by Role + Recent Users */}
         <Grid container spacing={3}>
            {/* Role Distribution */}
            <Grid size={{ xs: 12, md: 5 }}>
               <Card>
                  <CardHeader
                     title="User per Role"
                     titleTypographyProps={{ variant: 'h6', fontWeight: 700 }}
                  />
                  <CardContent sx={{ pt: 0 }}>
                     <Stack spacing={2}>
                        {roleConfig.map(({ name, label, icon, color }, index) => (
                           <Stack key={`${name}-${index}`} direction="row" alignItems="center" spacing={2}>
                              <Avatar sx={{ width: 36, height: 36, bgcolor: `${color}.lighter` }}>
                                 <Iconify icon={icon} width={18} sx={{ color: `${color}.main` }} />
                              </Avatar>
                              <Box flex={1}>
                                 <Typography variant="body2" fontWeight={600}>{label}</Typography>
                              </Box>
                              <Typography variant="h6" fontWeight={800} color={`${color}.main`}>
                                 {roleCounts[name] || 0}
                              </Typography>
                           </Stack>
                        ))}
                     </Stack>
                  </CardContent>
               </Card>
            </Grid>

            {/* Recent Users */}
            <Grid size={{ xs: 12, md: 7 }}>
               <Card>
                  <CardHeader
                     title="User Terbaru"
                     titleTypographyProps={{ variant: 'h6', fontWeight: 700 }}
                     action={
                        <Button component={Link} href={paths.dashboard.users.root} size="small">
                           Lihat Semua
                        </Button>
                     }
                  />
                  <CardContent sx={{ pt: 0, px: 0 }}>
                     <Table size="small">
                        <TableHead>
                           <TableRow>
                              <TableCell>Nama</TableCell>
                              <TableCell>Email</TableCell>
                              <TableCell>Role</TableCell>
                              <TableCell align="right">Aksi</TableCell>
                           </TableRow>
                        </TableHead>
                         <TableBody>
                            {(superadminData?.recent_users || []).map((user: any, index: number) => (
                               <TableRow key={`${user.id}-${index}`} hover>
                                  <TableCell>
                                     <Stack direction="row" spacing={1.5} alignItems="center">
                                        <Avatar sx={{ width: 28, height: 28, fontSize: 12 }}>
                                           {user.name?.[0]?.toUpperCase() || 'U'}
                                        </Avatar>
                                        <Typography variant="caption" fontWeight={600}>{user.name}</Typography>
                                     </Stack>
                                  </TableCell>
                                  <TableCell>
                                     <Typography variant="caption" color="text.secondary">{user.email}</Typography>
                                  </TableCell>
                                  <TableCell>
                                     <Typography variant="caption" fontWeight={600}>
                                        {user.role?.name || '-'}
                                     </Typography>
                                  </TableCell>
                                  <TableCell align="right">
                                     <Button
                                        size="small"
                                        component={Link}
                                        href={paths.dashboard.users.root}
                                        variant="outlined"
                                     >
                                        Edit
                                     </Button>
                                  </TableCell>
                               </TableRow>
                            ))}
                         </TableBody>
                     </Table>
                  </CardContent>
               </Card>
            </Grid>
         </Grid>
      </Stack>
   );
}
