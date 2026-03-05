import { Metadata } from 'next';

import BankListView from 'src/views/dashboard/banks/bank-list-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
   title: 'Dashboard: Banks',
};

export default function BanksPage() {
   return <BankListView />;
}
