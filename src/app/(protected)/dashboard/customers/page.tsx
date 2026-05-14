import type { Metadata } from 'next';

import { paths } from 'src/routes/al/paths';

import { CONFIG } from 'src/global-config';
import AuthGuard from 'src/guards/auth-guard';
import { CustomerListView } from 'src/views/dashboard/user/customer-list/CustomerListView';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
   title: `Data Customer | ${CONFIG.appName}`,
};

export default function Page() {
   return (
      <AuthGuard currentPath={`${paths.dashboard.customers.root}`} requiredPermissions={[]}>
         <CustomerListView />
      </AuthGuard>
   );
}
