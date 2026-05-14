'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { DashboardContent } from 'src/layouts/dashboard';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { paths } from 'src/routes/al/paths';

import useAuthStore from 'src/stores/auth';

import { CustomerDashboard } from './roles/CustomerDashboard';
import { KasirDashboard } from './roles/KasirDashboard';
import { ManagerDashboard } from './roles/ManagerDashboard';
import { OwnerDashboard } from './roles/OwnerDashboard';
import { SuperadminDashboard } from './roles/SuperadminDashboard';

// ----------------------------------------------------------------------

export function DashboardView() {
   const { user, authData } = useAuthStore();

   const isHydrated = user !== undefined;

   // Loading state while auth hydrates from localStorage
   if (!isHydrated) {
      return (
         <DashboardContent>
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
               <CircularProgress />
            </Box>
         </DashboardContent>
      );
   }

   const roleName = (user?.role?.name || '').toLowerCase().trim();

   const renderDashboard = () => {
      switch (roleName) {
         case 'customer':
            return <CustomerDashboard />;
         case 'kasir':
         case 'staff':
         case 'karyawan':
            return <KasirDashboard />;
         case 'manager':
            return <ManagerDashboard />;
         case 'owner':
            return <OwnerDashboard />;
         case 'superadmin':
         case 'super admin':
         case 'super_admin':
            return <SuperadminDashboard />;
         default:
            // Fallback: show a generic welcome if role not matched
            return (
               <Box textAlign="center" py={8}>
                  <Typography variant="h5" gutterBottom>Selamat datang!</Typography>
                  <Typography color="text.secondary">
                     Role <strong>{user?.role?.name || 'Anda'}</strong> belum memiliki dashboard khusus.
                  </Typography>
               </Box>
            );
      }
   };

   return (
      <DashboardContent>
         <CustomBreadcrumbs
            heading="Dashboard"
            links={[{ name: 'Dashboard', href: paths.dashboard.root }]}
            sx={{ mb: { xs: 3, md: 4 } }}
         />
         {renderDashboard()}
      </DashboardContent>
   );
}
