import { ProcessOrderView } from 'src/views/dashboard/orders/process/view';

// ----------------------------------------------------------------------

type Props = {
   params: { id: string };
};

export default function Page({ params }: Props) {
   return <ProcessOrderView orderId={params.id} />;
}
