'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

import { paths } from 'src/routes/al/paths';

import { DashboardContent } from 'src/layouts/dashboard';
import useServiceStore from 'src/stores/service';
import { LoadingScreen } from 'src/components/loading-screen';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { IService } from 'src/types/service';

import { ServiceCreateEditForm } from '../service-create-edit-form';

// ----------------------------------------------------------------------

export function ServiceEditView() {
   const params = useParams();
   const { getService } = useServiceStore();

   const [currentService, setCurrentService] = useState<IService>();
   const [loading, setLoading] = useState(true);

   useEffect(() => {
      if (params.id) {
         setLoading(true);
         getService(params.id as string)
            .then((res) => {
               setCurrentService(res.data);
            })
            .catch((error) => {
               console.error(error);
            })
            .finally(() => {
               setLoading(false);
            });
      }
   }, [getService, params.id]);

   if (loading) {
      return <LoadingScreen />;
   }

   return (
      <DashboardContent>
         <CustomBreadcrumbs
            heading="Edit"
            backHref={paths.dashboard.service.list}
            links={[
               { name: 'Dashboard', href: paths.dashboard.root },
               { name: 'Service', href: paths.dashboard.service.list },
               { name: currentService?.name },
            ]}
            sx={{ mb: { xs: 3, md: 5 } }}
         />

         <ServiceCreateEditForm currentService={currentService} />
      </DashboardContent>
   );
}
