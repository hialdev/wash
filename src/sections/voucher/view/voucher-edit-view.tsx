'use client';

import { useState, useEffect } from 'react';
import { paths } from 'src/routes/paths';
import useVoucherStore from 'src/stores/voucher';
import { DashboardContent } from 'src/layouts/dashboard';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import type { IVoucher } from 'src/types/voucher';
import { VoucherCreateEditForm } from '../voucher-create-edit-form';

export function VoucherEditView({ id }: { id: string }) {
   const { getVoucher } = useVoucherStore();
   const [currentVoucher, setCurrentVoucher] = useState<IVoucher | null>(null);

   useEffect(() => {
      const getDetail = async () => {
         const res = await getVoucher(id);
         if (res && res.data) setCurrentVoucher(res.data);
      };
      if (id) getDetail();
   }, [id, getVoucher]);

   return (
      <DashboardContent>
         <CustomBreadcrumbs
            heading="Edit Voucher"
            links={[
               { name: 'Dashboard', href: paths.dashboard.root },
               { name: 'Voucher', href: paths.dashboard.voucher.root },
               { name: currentVoucher?.code || '...' },
            ]}
            sx={{ mb: { xs: 3, md: 5 } }}
         />

         {currentVoucher ? (
            <VoucherCreateEditForm currentVoucher={currentVoucher} />
         ) : (
            <div>Loading...</div>
         )}
      </DashboardContent>
   );
}
