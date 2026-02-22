'use client';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { ServiceCreateEditForm } from '../service-create-edit-form';
import { Grid } from '@mui/material';

// ----------------------------------------------------------------------

export function ServiceCreateView() {
   return (
      <DashboardContent>
         <CustomBreadcrumbs
            heading="Create a new service"
            links={[
               { name: 'Dashboard', href: paths.dashboard.root },
               { name: 'Service', href: paths.dashboard.service.list },
               { name: 'Create' },
            ]}
            sx={{ mb: { xs: 3, md: 5 } }}
         />

         <ServiceCreateEditForm />
      </DashboardContent>
   );
}
