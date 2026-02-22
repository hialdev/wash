import { Metadata } from 'next';

import MyOrderDetailsView from 'src/views/dashboard/my-orders/my-order-details-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
   title: 'Dashboard: My Order Details',
};

export default function MyOrderDetailsPage() {
   return <MyOrderDetailsView />;
}
