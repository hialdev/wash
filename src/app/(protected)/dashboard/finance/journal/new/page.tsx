import JournalNewEditForm from 'src/views/dashboard/finance/journal/journal-new-edit-form';
import { DashboardContent } from 'src/layouts/dashboard';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { paths } from 'src/routes/al/paths';

// ----------------------------------------------------------------------

export const metadata = {
   title: 'Dashboard: New Journal',
};

export default function JournalNewPage() {
   return (
      <DashboardContent>
         <CustomBreadcrumbs
            heading="Create a new journal entry"
            links={[
               { name: 'Dashboard', href: paths.dashboard.root },
               { name: 'Finance', href: paths.dashboard.finance.root },
               { name: 'Journal', href: paths.dashboard.finance.journal.root },
               { name: 'New' },
            ]}
            sx={{ mb: { xs: 3, md: 5 } }}
         />
         <JournalNewEditForm />
      </DashboardContent>
   );
}
