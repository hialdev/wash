'use client';

import Link from 'next/link';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';

import { paths } from 'src/routes/al/paths';
import { Iconify } from 'src/components/iconify';

import { ManagerDashboard } from './ManagerDashboard';

// ----------------------------------------------------------------------

export function OwnerDashboard() {
   return (
      <Stack spacing={3}>
         {/* Owner Header Banner */}
         <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
            <CardContent sx={{ py: 3, px: 4 }}>
               <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" spacing={2}>
                  <Box>
                     <Typography variant="h5" fontWeight={700}>
                        Owner Dashboard
                     </Typography>
                     <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
                        Semua fitur Manager + Kelola Manager & Tim
                     </Typography>
                  </Box>
                  <Stack direction="row" spacing={2}>
                     <Button
                        component={Link}
                        href={`${paths.dashboard.users.root}?role=manager`}
                        variant="contained"
                        sx={{ bgcolor: 'white', color: 'error.main', '&:hover': { bgcolor: 'grey.100' } }}
                        startIcon={<Iconify icon="solar:users-group-two-rounded-bold-duotone" />}
                     >
                        Kelola Manager
                     </Button>
                     <Button
                        component={Link}
                        href={paths.dashboard.users.new}
                        variant="outlined"
                        sx={{ borderColor: 'white', color: 'white' }}
                        startIcon={<Iconify icon="mingcute:add-line" />}
                     >
                        Tambah Manager
                     </Button>
                  </Stack>
               </Stack>
            </CardContent>
         </Card>

         {/* Owner-specific quick actions */}
         <Grid container spacing={2}>
            {[
               {
                  label: 'Kelola Manager',
                  desc: 'Tambah dan atur hak akses manager',
                  icon: 'solar:shield-user-bold-duotone',
                  color: 'error',
                  href: paths.dashboard.users.root,
               },
               {
                  label: 'Kelola Karyawan',
                  desc: 'Staff, kasir, dan tim operasional',
                  icon: 'solar:users-group-two-rounded-bold-duotone',
                  color: 'primary',
                  href: paths.dashboard.users.root,
               },
               {
                  label: 'Hak Akses User',
                  desc: 'Atur permission per user',
                  icon: 'solar:lock-bold-duotone',
                  color: 'warning',
                  href: paths.dashboard.users.access,
               },
            ].map(({ label, desc, icon, color, href }) => (
               <Grid size={{ xs: 12, sm: 4 }} key={label}>
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
                        <Stack direction="row" spacing={2} alignItems="center">
                           <Avatar sx={{ bgcolor: `${color}.lighter`, width: 48, height: 48 }}>
                              <Iconify icon={icon} width={24} sx={{ color: `${color}.main` }} />
                           </Avatar>
                           <Box>
                              <Typography variant="subtitle2" fontWeight={700}>{label}</Typography>
                              <Typography variant="caption" color="text.secondary">{desc}</Typography>
                           </Box>
                        </Stack>
                     </CardContent>
                  </Card>
               </Grid>
            ))}
         </Grid>

         <Divider sx={{ borderStyle: 'dashed' }} />

         {/* All Manager Dashboard content below */}
         <ManagerDashboard />
      </Stack>
   );
}
