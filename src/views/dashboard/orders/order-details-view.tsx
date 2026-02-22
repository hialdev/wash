'use client';

import { useState, useEffect } from 'react';
import dayjs from 'dayjs';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Timeline from '@mui/lab/Timeline';
import TimelineItem from '@mui/lab/TimelineItem';
import TimelineSeparator from '@mui/lab/TimelineSeparator';
import TimelineConnector from '@mui/lab/TimelineConnector';
import TimelineContent from '@mui/lab/TimelineContent';
import TimelineDot from '@mui/lab/TimelineDot';
import TimelineOppositeContent from '@mui/lab/TimelineOppositeContent';

import { paths } from 'src/routes/al/paths';
import { RouterLink } from 'src/routes/components';
import { useParams } from 'src/routes/hooks';

import { DashboardContent } from 'src/layouts/dashboard';
import { Iconify } from 'src/components/iconify';
import { fCurrency } from 'src/utils/format-number';
import { CONFIG } from 'src/global-config';
import { LoadingScreen } from 'src/components/loading-screen';

import useOrderStore from 'src/stores/order';
import useOrderLogStatusStore from 'src/stores/order-log-status';
import { Grid } from '@mui/material';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import ServiceItem from './components/service-item';
import UsedRawMaterialList from './components/used-raw-material-list';

// ----------------------------------------------------------------------

export default function OrderDetailsView() {
   const params = useParams();
   const { id } = params;

   const { detail: getOrder, order } = useOrderStore();
   const { logs, getByOrderId } = useOrderLogStatusStore();

   const [loading, setLoading] = useState(true);

   useEffect(() => {
      const init = async () => {
         if (id) {
            setLoading(true);
            try {
               await Promise.all([
                  getOrder({ id: id as string }),
                  getByOrderId({ orderId: id as string }),
               ]);
            } catch (error) {
               console.error('Failed to init order details:', error);
            } finally {
               setLoading(false);
            }
         }
      };
      init();
   }, [id, getOrder, getByOrderId]);

   if (loading) {
      return <LoadingScreen />;
   }

   if (!order) {
      return (
         <DashboardContent>
            <Box sx={{ textAlign: 'center', py: 10 }}>
               <Typography variant="h6">Order not found</Typography>
            </Box>
         </DashboardContent>
      );
   }

   const statusColor: Record<string, any> = {
      waiting_payment: 'warning',
      waiting_process: 'info',
      payment_verification: 'info',
      on_progress: 'primary',
      finish: 'success',
      stock_issue: 'error',
      waiting_restock: 'info',
      refund_pending: 'warning',
      refunded: 'error',
      canceled: 'error',
   };

   const statusLabel: Record<string, string> = {
      waiting_payment: 'Waiting Payment',
      waiting_process: 'Waiting Process',
      payment_verification: 'Payment Verification',
      on_progress: 'On Progress',
      finish: 'Finished',
      stock_issue: 'Stock Issue',
      waiting_restock: 'Waiting Restock',
      refund_pending: 'Refund Pending',
      refunded: 'Refunded',
      canceled: 'Canceled',
   };

   const parseImages = (imagesStr?: string): string[] => {
      if (!imagesStr) return [];
      try {
         return JSON.parse(imagesStr);
      } catch {
         return [];
      }
   };

   return (
      <DashboardContent>
         <CustomBreadcrumbs
            heading="Order Details"
            links={[
               { name: 'Dashboard', href: paths.dashboard.root },
               { name: 'Orders', href: paths.dashboard.orders.root },
               { name: order.order_number },
            ]}
            sx={{ mb: { xs: 3, md: 5 } }}
         />

         <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 8 }}>
               <Stack spacing={3}>
                  {/* Order Info */}
                  <Card>
                     <CardHeader title="Order Information" />
                     <CardContent>
                        <Stack spacing={2}>
                           <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="body2" color="text.secondary">
                                 Order Number
                              </Typography>
                              <Typography variant="subtitle2">{order.order_number}</Typography>
                           </Box>
                           <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="body2" color="text.secondary">
                                 Status
                              </Typography>
                              <Chip
                                 label={statusLabel[order.status || 'waiting_payment']}
                                 color={statusColor[order.status || 'waiting_payment']}
                                 size="small"
                              />
                           </Box>
                           <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="body2" color="text.secondary">
                                 Customer
                              </Typography>
                              <Box sx={{ textAlign: 'right' }}>
                                 <Typography variant="subtitle2">{order.phone_receiver}</Typography>
                                 <Typography variant="caption" color="text.secondary">
                                    {order.address_receiver}
                                 </Typography>
                              </Box>
                           </Box>
                           <Divider sx={{ borderStyle: 'dashed' }} />
                           <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="subtitle1">Total Bill</Typography>
                              <Typography variant="subtitle1" color="primary.main">
                                 {fCurrency(order.total_bill || 0)}
                              </Typography>
                           </Box>
                        </Stack>
                     </CardContent>
                  </Card>
                  {/* Products */}
                  {order.order_products && order.order_products.length > 0 && (
                     <Card>
                        <CardHeader title="Products" />
                        <CardContent>
                           <Stack spacing={2}>
                              {order.order_products.map((item: any) => {
                                 const isIndividual = item.product?.tracking_mode === 'individual';
                                 const subtotal = isIndividual
                                    ? (item.price_at_order || 0) *
                                      (item.requested_length || 0) *
                                      (item.qty || 0)
                                    : (item.price_at_order || 0) * (item.qty || 0);

                                 return (
                                    <Box
                                       key={item.id}
                                       sx={{ display: 'flex', alignItems: 'center' }}
                                    >
                                       <Box sx={{ flexGrow: 1 }}>
                                          <Typography variant="subtitle2">
                                             {item.product?.title}
                                          </Typography>
                                          <Typography variant="caption" color="text.secondary">
                                             {isIndividual
                                                ? `${item.qty} × ${item.requested_length} ${item.measurement_unit}`
                                                : `${item.qty} × ${fCurrency(item.price_at_order || 0)}`}
                                          </Typography>
                                       </Box>
                                       <Typography variant="subtitle2">
                                          {fCurrency(subtotal)}
                                       </Typography>
                                    </Box>
                                 );
                              })}
                           </Stack>
                        </CardContent>
                     </Card>
                  )}
                  {/* Services */}
                  {order.order_services && order.order_services.length > 0 && (
                     <Card>
                        <CardHeader title="Services" />
                        <CardContent>
                           <Stack spacing={0}>
                              {order.order_services.map((item: any) => (
                                 <ServiceItem key={item.id} item={item} orderId={order.id || ''} />
                              ))}
                           </Stack>
                        </CardContent>
                     </Card>
                  )}
               </Stack>
            </Grid>

            {/* Right Column: Timeline */}
            <Grid size={{ xs: 12, md: 4 }}>
               {/* Used Raw Material List - Only show if order is finished */}
               {order.status === 'finish' && <UsedRawMaterialList orderId={order.id || ''} />}

               <Card>
                  <CardHeader title="Status History" />
                  <CardContent>
                     <Timeline position="right" sx={{ pl: 0 }}>
                        {logs.map((log, index) => {
                           const images = parseImages(log.images);
                           const isLast = index === logs.length - 1;

                           return (
                              <TimelineItem key={log.id} sx={{ '&:before': { display: 'none' } }}>
                                 <TimelineSeparator>
                                    <TimelineDot color={statusColor[log.status || 'default']} />
                                    {!isLast && <TimelineConnector />}
                                 </TimelineSeparator>
                                 <TimelineContent>
                                    <Typography variant="subtitle2">
                                       {statusLabel[log.status || 'Unknown']}
                                    </Typography>
                                    <Typography
                                       variant="caption"
                                       color="text.secondary"
                                       display="block"
                                       sx={{ mb: 1 }}
                                    >
                                       {dayjs(log.created_at).format('DD MMM YYYY HH:mm')}
                                    </Typography>
                                    <Typography
                                       variant="body2"
                                       sx={{ color: 'text.secondary', mb: 1 }}
                                    >
                                       {log.reason}
                                    </Typography>
                                    {images.length > 0 && (
                                       <Box
                                          sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}
                                       >
                                          {images.map((img, idx) => (
                                             <Box
                                                key={idx}
                                                component="img"
                                                src={`${CONFIG.apiHostUrl}/${img}`}
                                                sx={{
                                                   width: 64,
                                                   height: 64,
                                                   borderRadius: 1,
                                                   cursor: 'pointer',
                                                   objectFit: 'cover',
                                                }}
                                                onClick={() =>
                                                   window.open(
                                                      `${CONFIG.apiHostUrl}/${img}`,
                                                      '_blank'
                                                   )
                                                }
                                             />
                                          ))}
                                       </Box>
                                    )}
                                 </TimelineContent>
                              </TimelineItem>
                           );
                        })}
                     </Timeline>
                  </CardContent>
               </Card>
            </Grid>
         </Grid>
      </DashboardContent>
   );
}
