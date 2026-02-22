'use client';

import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import { Grid } from '@mui/material';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';

import { paths } from 'src/routes/al/paths';
import { useParams } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { useSettingsContext } from 'src/components/settings';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { LoadingScreen } from 'src/components/loading-screen';

import useServiceTrackingStore from 'src/stores/service-tracking';

import ServiceDetailEditor from 'src/views/dashboard/orders/components/service-detail-editor';
import ServiceProcessTimeline from 'src/views/dashboard/orders/components/service-process-timeline';
import { DashboardContent } from 'src/layouts/dashboard';

// ----------------------------------------------------------------------

export default function ServiceTrackingPage() {
   const settings = useSettingsContext();
   const params = useParams();

   const orderId = params.id as string;
   const serviceId = params.serviceId as string;

   const { orderService, getServiceTracking, isLoading } = useServiceTrackingStore();

   useEffect(() => {
      if (orderId && serviceId) {
         getServiceTracking(orderId, serviceId, false);
      }
   }, [getServiceTracking, orderId, serviceId]);

   if (isLoading || !orderService) {
      return <LoadingScreen />;
   }

   return (
      <DashboardContent>
         <CustomBreadcrumbs
            heading="Service Tracking"
            links={[
               {
                  name: 'Dashboard',
                  href: paths.dashboard.root,
               },
               {
                  name: 'Order',
                  href: paths.dashboard.orders.root,
               },
               {
                  name: orderService.order?.order_number || 'Order Details',
                  href: paths.dashboard.orders.detail(orderId),
               },
               {
                  name: orderService.service?.name || 'Service Tracking',
               },
            ]}
            sx={{
               mb: { xs: 3, md: 5 },
            }}
         />

         <Grid container spacing={3}>
            {/* Left Column: Service Information & Detail Editor */}
            <Grid size={{ xs: 12, md: 7 }}>
               <Stack spacing={3}>
                  <Card>
                     <CardHeader title="Service Information" />
                     <CardContent>
                        <Stack spacing={2}>
                           <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="body2" color="text.secondary">
                                 Service Name
                              </Typography>
                              <Typography variant="subtitle2">
                                 {orderService.service?.name}
                              </Typography>
                           </Box>

                           <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="body2" color="text.secondary">
                                 Quantity
                              </Typography>
                              <Typography variant="subtitle2">
                                 {orderService.qty} {orderService.service?.unit}
                              </Typography>
                           </Box>

                           {orderService.notes && (
                              <Box>
                                 <Typography variant="body2" color="text.secondary" gutterBottom>
                                    Initial Notes
                                 </Typography>
                                 <Box
                                    sx={{
                                       p: 2,
                                       bgcolor: 'background.neutral',
                                       borderRadius: 1,
                                       typography: 'body2',
                                    }}
                                 >
                                    {orderService.notes}
                                 </Box>
                              </Box>
                           )}
                        </Stack>
                     </CardContent>
                  </Card>

                  <ServiceDetailEditor
                     orderId={orderId}
                     serviceId={serviceId}
                     currentDetail={orderService.service_detail}
                  />
               </Stack>
            </Grid>

            {/* Right Column: Process Timeline */}
            <Grid size={{ xs: 12, md: 5 }}>
               <ServiceProcessTimeline
                  orderId={orderId}
                  serviceId={serviceId}
                  processes={orderService.service_process || []}
               />
            </Grid>
         </Grid>
      </DashboardContent>
   );
}
