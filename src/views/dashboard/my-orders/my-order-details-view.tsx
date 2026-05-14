'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
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
import Rating from '@mui/material/Rating';
import TextField from '@mui/material/TextField';
import Grid from '@mui/material/Grid';

import { paths } from 'src/routes/al/paths';
import { RouterLink } from 'src/routes/components';
import { useParams } from 'src/routes/hooks';

import { DashboardContent } from 'src/layouts/dashboard';
import { Iconify } from 'src/components/iconify';
import { fCurrency } from 'src/utils/format-number';
import { toast } from 'src/components/snackbar';
import { CONFIG } from 'src/global-config';
import { LoadingScreen } from 'src/components/loading-screen';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import useOrderStore from 'src/stores/order';
import useOrderLogStatusStore from 'src/stores/order-log-status';
import useBankStore from 'src/stores/bank';
import useOrderProcessLogStore from 'src/stores/order-process-log';

import ServiceItem from '../orders/components/service-item';
import UsedRawMaterialList from '../orders/components/used-raw-material-list';
import { UploadPaymentProofModal } from '../payment/[orderId]/components/upload-payment-proof-modal';
import MyOrderProcessLog from './components/my-order-process-log';

// ----------------------------------------------------------------------

const OrderDetailsPDFDownload = dynamic(
   () => import('./components/order-details-pdf').then((mod) => mod.OrderDetailsPDFDownload),
   { ssr: false }
);

export default function MyOrderDetailsView() {
   const params = useParams();
   const { id } = params;

   const { getMyOrder: getOrder, order } = useOrderStore();
   const { logs, getByOrderId } = useOrderLogStatusStore();
   const { banks, fetchBanks } = useBankStore();
   const { logs: processLogs, getUserLogs } = useOrderProcessLogStore();

   const [mounted, setMounted] = useState(false);
   const [loading, setLoading] = useState(true);
   const [uploadModalOpen, setUploadModalOpen] = useState(false);
   const [ratingValue, setRatingValue] = useState<number | null>(null);
   const [reviewValue, setReviewValue] = useState('');
   const [isSubmittingRating, setIsSubmittingRating] = useState(false);

   const { rateOrder } = useOrderStore();

   useEffect(() => {
      setMounted(true);
   }, []);

   useEffect(() => {
      const init = async () => {
         if (id) {
            setLoading(true);
            try {
               await Promise.all([
                  getOrder({ id: id as string }),
                  getByOrderId({ orderId: id as string }),
                  fetchBanks({ is_active: true }),
                  getUserLogs(id as string),
               ]);
            } catch (error) {
               console.error('Failed to init order details:', error);
            } finally {
               setLoading(false);
            }
         }
      };
      init();
   }, [id, getOrder, getByOrderId, fetchBanks, getUserLogs]);

   const handleRate = async () => {
      if (!ratingValue) {
         toast.error('Silakan pilih bintang rating');
         return;
      }
      setIsSubmittingRating(true);
      try {
         const res = await rateOrder({
            id: id as string,
            data: { rating: ratingValue, review: reviewValue },
         });
         if (res.success) {
            toast.success('Terima kasih atas rating Anda!');
            getOrder({ id: id as string }); // Refresh data
         } else {
            toast.error(res.message || 'Gagal memberi rating');
         }
      } catch (error) {
         toast.error('Terjadi kesalahan saat memberi rating');
      } finally {
         setIsSubmittingRating(false);
      }
   };

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
               { name: 'My Orders', href: paths.dashboard.customer_orders.my_orders },
               { name: order.order_number },
            ]}
            action={
               order && (
                  <OrderDetailsPDFDownload
                     order={order}
                     logs={logs}
                     processLogs={processLogs}
                  />
               )
            }
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
                              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                 Customer
                              </Typography>
                              <Box sx={{ textAlign: 'right' }}>
                                 {order.is_agent_order && order.user?.name && (
                                    <Typography variant="subtitle2" color="primary.main" sx={{ mb: 0.2 }}>
                                       {order.user.name} (Customer)
                                    </Typography>
                                 )}
                                 <Typography variant="subtitle2">{order.phone_receiver}</Typography>
                                 <Typography variant="caption" color="text.secondary">
                                    {order.address_receiver}
                                 </Typography>
                              </Box>
                           </Box>
                           <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="body2" color="text.secondary">
                                 Total Berat
                              </Typography>
                              <Typography variant="subtitle2">{order.weight_kg ? `${order.weight_kg} kg` : '-'}</Typography>
                           </Box>
                           <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="body2" color="text.secondary">
                                 Total Pieces
                              </Typography>
                              <Typography variant="subtitle2">{order.total_pcs ? `${order.total_pcs} Pcs` : '-'}</Typography>
                           </Box>
                           <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="body2" color="text.secondary">
                                 Deskripsi / Catatan
                              </Typography>
                              <Typography
                                 variant="body2"
                                 sx={{
                                    textAlign: 'right',
                                    maxWidth: '60%',
                                    color: order.notes ? 'text.primary' : 'text.disabled',
                                    fontStyle: order.notes ? 'normal' : 'italic'
                                 }}
                              >
                                 {order.notes || 'Tidak ada catatan'}
                              </Typography>
                           </Box>
                           <Divider sx={{ borderStyle: 'dashed' }} />
                           {(order as any).discount_amount > 0 && (
                              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                 <Box>
                                    <Typography variant="body2" color="error">
                                       Discount
                                    </Typography>
                                    {(order as any).voucher && (
                                       <Typography variant="caption" color="text.secondary">
                                          Voucher: {(order as any).voucher.code}
                                       </Typography>
                                    )}
                                 </Box>
                                 <Typography variant="subtitle2" color="error">
                                    -{fCurrency((order as any).discount_amount || 0)}
                                 </Typography>
                              </Box>
                           )}
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
                                 <ServiceItem
                                    key={item.id}
                                    item={item}
                                    orderId={order.id || ''}
                                    readOnly={true}
                                    readOnlyProcess={true}
                                 />
                              ))}
                           </Stack>
                        </CardContent>
                     </Card>
                  )}

                  {/* Rating Section - when finished and not yet rated */}
                  {order.status === 'finish' && (
                     <Card>
                        <CardHeader title="Penilaian & Review" />
                        <CardContent>
                           {order.rating ? (
                              <Stack spacing={1}>
                                 <Rating value={order.rating} readOnly />
                                 {order.review && (
                                    <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                                       "{order.review}"
                                    </Typography>
                                 )}
                              </Stack>
                           ) : (
                              <Stack spacing={2.5}>
                                 <Box>
                                    <Typography variant="subtitle2" gutterBottom>
                                       Berikan penilaian Anda
                                    </Typography>
                                    <Rating
                                       value={ratingValue}
                                       onChange={(event, newValue) => setRatingValue(newValue)}
                                       size="large"
                                    />
                                 </Box>
                                 <TextField
                                    fullWidth
                                    multiline
                                    rows={3}
                                    label="Tuliskan pengalaman Anda..."
                                    value={reviewValue}
                                    onChange={(e) => setReviewValue(e.target.value)}
                                 />
                                 <Button
                                    variant="contained"
                                    onClick={handleRate}
                                    loading={isSubmittingRating}
                                    disabled={!ratingValue}
                                    startIcon={<Iconify icon="solar:star-bold" />}
                                 >
                                    Kirim Rating
                                 </Button>
                              </Stack>
                           )}
                        </CardContent>
                     </Card>
                  )}
               </Stack>
            </Grid>

            {/* Right Column: Payment (if waiting) + Timeline */}
            <Grid size={{ xs: 12, md: 4 }}>
               <Stack spacing={3}>
                  {/* Payment Section - only when waiting_payment */}
                  {order.status === 'waiting_payment' && (
                     <Card>
                        <CardHeader title="Pembayaran" />
                        <CardContent>
                           <Box
                              sx={{
                                 display: 'flex',
                                 justifyContent: 'space-between',
                                 alignItems: 'center',
                                 p: 2,
                                 bgcolor: 'background.neutral',
                                 borderRadius: 2,
                                 mb: 2,
                              }}
                           >
                              <Typography variant="subtitle2">Total Tagihan</Typography>
                              <Typography variant="h5" color="primary.main">
                                 {fCurrency(order.total_bill || 0)}
                              </Typography>
                           </Box>

                           {/* Xendit Option */}
                           {(order as any).xendit_invoice_url && (
                              <Box sx={{ mb: 2 }}>
                                 <Typography variant="subtitle2" gutterBottom>
                                    Bayar Instant
                                 </Typography>
                                 <Button
                                    fullWidth
                                    variant="contained"
                                    size="large"
                                    href={(order as any).xendit_invoice_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    startIcon={<Iconify icon="solar:card-send-bold" />}
                                 >
                                    Bayar Sekarang
                                 </Button>
                                 <Box
                                    sx={{
                                       p: 1.5,
                                       mt: 1,
                                       bgcolor: 'info.lighter',
                                       borderRadius: 1,
                                       border: 1,
                                       borderColor: 'info.light',
                                    }}
                                 >
                                    <Typography variant="caption" color="info.darker">
                                       Status akan otomatis berubah setelah pembayaran berhasil.
                                    </Typography>
                                 </Box>
                              </Box>
                           )}

                           <Divider sx={{ my: 2 }}>
                              <Chip label="ATAU" size="small" />
                           </Divider>

                           {/* Bank Transfer */}
                           <Box>
                              <Typography variant="subtitle2" gutterBottom>
                                 Transfer Manual
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                                 Transfer ke salah satu rekening berikut:
                              </Typography>
                              {banks.length > 0 ? (
                                 banks.map((bank) => (
                                    <Card
                                       key={bank.id}
                                       variant="outlined"
                                       sx={{ p: 2, mb: 1.5, bgcolor: 'background.neutral' }}
                                    >
                                       <Box
                                          sx={{
                                             display: 'flex',
                                             alignItems: 'center',
                                             gap: 1.5,
                                             mb: 0.5,
                                          }}
                                       >
                                          {bank.logo && (
                                             <Box
                                                component="img"
                                                src={`${CONFIG.apiHostUrl}/${bank.logo}`}
                                                alt={bank.bank_name}
                                                sx={{ width: 36, height: 36, objectFit: 'contain' }}
                                             />
                                          )}
                                          <Typography variant="subtitle2">
                                             {bank.bank_name}
                                          </Typography>
                                       </Box>
                                       <Typography variant="h6" fontWeight={700}>
                                          {bank.account_number}
                                       </Typography>
                                       <Typography variant="body2" color="text.secondary">
                                          a.n. {bank.account_owner}
                                       </Typography>
                                       {bank.description && (
                                          <Typography
                                             variant="caption"
                                             color="text.secondary"
                                             display="block"
                                          >
                                             {bank.description}
                                          </Typography>
                                       )}
                                    </Card>
                                 ))
                              ) : (
                                 <Typography variant="body2" color="text.secondary">
                                    Info rekening belum tersedia, hubungi admin.
                                 </Typography>
                              )}

                              <Button
                                 fullWidth
                                 variant="outlined"
                                 size="large"
                                 sx={{ mt: 1 }}
                                 startIcon={<Iconify icon="solar:upload-bold" />}
                                 onClick={() => setUploadModalOpen(true)}
                              >
                                 Upload Bukti Transfer
                              </Button>
                           </Box>
                        </CardContent>
                     </Card>
                  )}
                  {/* Rincian Proses Laundry */}
                  <MyOrderProcessLog orderId={order.id || ''} />
                  
                  {/* Status History */}
                  <Card>
                     <CardHeader title="Status History" />
                     <CardContent>
                        {logs.length === 0 ? (
                           <Box sx={{ py: 6, textAlign: 'center' }}>
                              <Iconify icon="solar:history-bold-duotone" width={48} sx={{ color: 'text.disabled', mb: 1.5, opacity: 0.4 }} />
                              <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 500 }}>
                                 Belum ada riwayat status
                              </Typography>
                              <Typography variant="caption" color="text.disabled">
                                 Log aktivitas pesanan akan muncul di sini.
                              </Typography>
                           </Box>
                        ) : (
                           <Timeline position="right" sx={{ pl: 0 }}>
                              {logs.map((log, index) => {
                                 const images = parseImages(log.images);
                                 const isLast = index === logs.length - 1;

                                 return (
                                    <TimelineItem
                                       key={log.id}
                                       sx={{ '&:before': { display: 'none' } }}
                                    >
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
                                                sx={{
                                                   display: 'flex',
                                                   gap: 1,
                                                   flexWrap: 'wrap',
                                                   mt: 1,
                                                }}
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
                        )}
                     </CardContent>
                  </Card>
               </Stack>
            </Grid>
         </Grid>

         {/* Upload Payment Proof Modal */}
         <UploadPaymentProofModal
            open={uploadModalOpen}
            onClose={() => setUploadModalOpen(false)}
            orderId={id as string}
         />
      </DashboardContent>
   );
}
