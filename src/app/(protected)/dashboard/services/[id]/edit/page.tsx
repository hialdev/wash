import { ServiceEditView } from 'src/sections/service/view';

// ----------------------------------------------------------------------

export const metadata = {
   title: 'Dashboard: Edit Service',
};

type Props = {
   params: {
      id: string;
   };
};

export default function ServiceEditPage({ params }: Props) {
   const { id } = params;

   return <ServiceEditView />;
}

export async function generateStaticParams() {
   return [];
}
