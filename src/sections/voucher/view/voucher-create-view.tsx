'use client';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { VoucherCreateEditForm } from '../voucher-create-edit-form';


// ----------------------------------------------------------------------

export function VoucherCreateView() {
   return (
      <DashboardContent>
         <CustomBreadcrumbs
            heading="Create a new Voucher"
            links={[
               { name: 'Dashboard', href: paths.dashboard.root },
               { name: 'Voucher', href: paths.dashboard.voucher.root },
               { name: 'New Voucher' },
            ]}
            sx={{ mb: { xs: 3, md: 5 } }}
         />

         <VoucherCreateEditForm />
      </DashboardContent>
   );
}
