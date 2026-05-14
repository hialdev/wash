'use client';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { ServiceStepperForm } from '../service-stepper-form';
import { Grid } from '@mui/material';

// ----------------------------------------------------------------------

export function ServiceCreateView() {
   return (
      <DashboardContent>
         <CustomBreadcrumbs
            heading="Buat Layanan Baru"
            links={[
               { name: 'Dashboard', href: paths.dashboard.root },
               { name: 'Layanan', href: paths.dashboard.service.list },
               { name: 'Buat Baru' },
            ]}
            sx={{ mb: { xs: 3, md: 5 } }}
         />

         <ServiceStepperForm />
      </DashboardContent>
   );
}
