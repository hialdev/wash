import { VoucherEditView } from 'src/sections/voucher/view';

export const metadata = {
   title: 'Dashboard: Edit Voucher',
};

type Props = {
   params: {
      id: string;
   };
};

export default function VoucherEditPage({ params }: Props) {
   const { id } = params;

   return <VoucherEditView id={id} />;
}
