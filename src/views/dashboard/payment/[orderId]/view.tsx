'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Card from '@mui/material/Card';

import { paths } from 'src/routes/al/paths';

import useOrderStore from 'src/stores/order';
import useBankStore from 'src/stores/bank';
import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { LoadingScreen } from 'src/components/loading-screen';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { fCurrency } from 'src/utils/format-number';
import { UploadPaymentProofModal } from './components/upload-payment-proof-modal';

// ----------------------------------------------------------------------

type OrderStatus =
   | 'waiting_payment'
   | 'payment_verification'
   | 'waiting_process'
   | 'on_progress'
   | 'finish'
   | 'stock_issue'
   | 'waiting_restock'
   | 'refund_pending'
   | 'refunded'
   | 'canceled';

interface Order {
   id: string;
   order_number: string;
   status: OrderStatus;
   total_bill: number;
   xendit_invoice_url?: string;
   payment_proof?: string;
}

export function PaymentView() {
   const params = useParams();
   const router = useRouter();
   const orderId = params.orderId as string;

   const { getMyOrder } = useOrderStore();
   const { banks, fetchBanks } = useBankStore();

   const [loading, setLoading] = useState<boolean>(true);
   const [order, setOrder] = useState<Order | null>(null);
   const [uploadModalOpen, setUploadModalOpen] = useState<boolean>(false);

   const fetchOrder = async () => {
      setLoading(true);
      try {
         const res = await getMyOrder({ id: orderId });
         if (res.success && res.data) {
            setOrder(res.data);
         } else {
            toast.error('Gagal memuat data pesanan');
         }
      } catch (error) {
         toast.error('Gagal memuat data pesanan');
      }
      setLoading(false);
   };

   useEffect(() => {
      if (orderId) {
         fetchOrder();
         fetchBanks({ is_active: true });
      }
   }, [orderId]);

   if (loading) {
      return (
         <DashboardContent>
            <LoadingScreen />
         </DashboardContent>
      );
   }

   if (!order) {
      return (
         <DashboardContent>
            <Card sx={{ p: 8, textAlign: 'center' }}>
               <Typography variant="h6" color="text.secondary">
                  Pesanan tidak ditemukan
               </Typography>
               <Button
                  variant="contained"
                  onClick={() => router.push(paths.dashboard.customer_orders.my_orders)}
                  sx={{ mt: 2 }}
               >
                  Kembali ke My Orders
               </Button>
            </Card>
         </DashboardContent>
      );
   }

   const statusColor = {
      waiting_payment: 'warning',
      payment_verification: 'info',
      waiting_process: 'info',
      on_progress: 'primary',
      finish: 'success',
      stock_issue: 'warning',
      waiting_restock: 'info',
      refund_pending: 'info',
      refunded: 'success',
      canceled: 'error',
   } as const;

   const statusLabel = {
      waiting_payment: 'Waiting Payment',
      payment_verification: 'Payment Under Verification',
      waiting_process: 'Waiting Process',
      on_progress: 'On Progress',
      finish: 'Finish',
      stock_issue: 'Stock Issue',
      waiting_restock: 'Waiting Restock',
      refund_pending: 'Refund Pending',
      refunded: 'Refunded',
      canceled: 'Canceled',
   } as const;

   return (
      <DashboardContent>
         <CustomBreadcrumbs
            heading="Payment"
            links={[
               { name: 'Dashboard', href: paths.dashboard.root },
               { name: 'My Orders', href: paths.dashboard.customer_orders.my_orders },
               { name: 'Payment' },
            ]}
            sx={{ mb: { xs: 3, md: 5 } }}
         />

         <Card sx={{ p: 4, maxWidth: 600, mx: 'auto' }}>
            {/* Order Info */}
            <Box sx={{ textAlign: 'center', mb: 3 }}>
               <Typography variant="h5" gutterBottom>
                  Order #{order.order_number}
               </Typography>
               <Chip
                  label={statusLabel[order.status || 'waiting_payment']}
                  color={statusColor[order.status || 'waiting_payment']}
                  size="medium"
                  variant="soft"
               />
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Total Amount */}
            <Box
               sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  p: 3,
                  bgcolor: 'background.neutral',
                  borderRadius: 2,
                  mb: 3,
               }}
            >
               <Typography variant="h6">Total Pembayaran:</Typography>
               <Typography variant="h4" color="primary.main">
                  {fCurrency(order.total_bill || 0)}
               </Typography>
            </Box>

            {/* Payment Instructions */}
            {order.status === 'waiting_payment' && (
               <>
                  {/* Xendit Payment Option */}
                  {order.xendit_invoice_url && (
                     <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle1" gutterBottom>
                           Metode Pembayaran
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                           Silakan lakukan pembayaran melalui Xendit dengan klik tombol di bawah:
                        </Typography>
                        <Button
                           fullWidth
                           variant="contained"
                           size="large"
                           href={order.xendit_invoice_url}
                           target="_blank"
                           rel="noopener noreferrer"
                           startIcon={<Iconify icon="solar:card-send-bold" />}
                           sx={{ mb: 2 }}
                        >
                           Bayar dan terkonfirmasi secara instant
                        </Button>
                        <Box
                           sx={{
                              p: 2,
                              bgcolor: 'info.lighter',
                              borderRadius: 1,
                              border: 1,
                              borderColor: 'info.light',
                           }}
                        >
                           <Typography variant="caption" color="info.darker">
                              <strong>Catatan:</strong> Setelah pembayaran berhasil, status pesanan
                              akan otomatis berubah
                           </Typography>
                        </Box>
                     </Box>
                  )}
                  {/* Divider */}
                  <Divider sx={{ my: 3 }}>
                     <Chip label="ATAU" size="small" />
                  </Divider>
                  {/* Manual Payment Option */}
                  <Box>
                     <Typography variant="subtitle1" gutterBottom>
                        Transfer Manual
                     </Typography>
                     <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Transfer ke rekening berikut dan upload bukti pembayaran:
                     </Typography>
                     {/* Bank Account Details */}
                     {banks.length > 0 ? (
                         banks.map((bank) => {
                            if (bank.is_qris || bank.qris_image) {
                               return (
                                  <Card
                                     key={bank.id}
                                     variant="outlined"
                                     sx={{ p: 3, mb: 2, bgcolor: 'background.neutral', textAlign: 'center' }}
                                  >
                                     <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, mb: 2 }}>
                                        {bank.logo && (
                                           <Box
                                              component="img"
                                              src={`${process.env.NEXT_PUBLIC_API_HOST}/${bank.logo}`}
                                              alt={bank.bank_name}
                                              sx={{ height: 30, objectFit: 'contain' }}
                                           />
                                        )}
                                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{bank.bank_name}</Typography>
                                     </Box>
                                     
                                     {bank.qris_image && (
                                        <Box
                                           sx={{
                                              p: 1.5,
                                              bgcolor: '#fff',
                                              borderRadius: 1.5,
                                              display: 'inline-block',
                                              border: 1,
                                              borderColor: 'divider',
                                              mb: 2,
                                              boxShadow: (theme) => theme.shadows[1]
                                           }}
                                        >
                                           <Box
                                              component="img"
                                              src={`${process.env.NEXT_PUBLIC_API_HOST}/${bank.qris_image}`}
                                              alt="QRIS Code"
                                              sx={{ width: 240, height: 240, display: 'block', objectFit: 'contain' }}
                                           />
                                        </Box>
                                     )}
                                     
                                     <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                                        Scan QRIS untuk Bayar
                                     </Typography>
                                     <Typography variant="body2" color="text.secondary">
                                        a.n. {bank.account_owner}
                                     </Typography>
                                     {bank.description && (
                                        <Typography
                                           variant="caption"
                                           color="text.secondary"
                                           display="block"
                                           mt={1}
                                           sx={{ fontStyle: 'italic' }}
                                        >
                                           {bank.description}
                                        </Typography>
                                     )}
                                  </Card>
                               );
                            }

                            return (
                               <Card
                                  key={bank.id}
                                  variant="outlined"
                                  sx={{ p: 2, mb: 2, bgcolor: 'background.neutral' }}
                               >
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                                     {bank.logo && (
                                        <Box
                                           component="img"
                                           src={`${process.env.NEXT_PUBLIC_API_HOST}/${bank.logo}`}
                                           alt={bank.bank_name}
                                           sx={{ width: 40, height: 40, objectFit: 'contain' }}
                                        />
                                     )}
                                     <Typography variant="subtitle2">{bank.bank_name}</Typography>
                                  </Box>
                                  <Typography variant="h6" fontWeight={700} gutterBottom>
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
                                        mt={0.5}
                                     >
                                        {bank.description}
                                     </Typography>
                                  )}
                               </Card>
                            );
                         })
                     ) : (
                        <Card
                           variant="outlined"
                           sx={{ p: 2, mb: 2, bgcolor: 'background.neutral' }}
                        >
                           <Typography variant="body2" color="text.secondary">
                              Info rekening belum tersedia, silakan hubungi admin.
                           </Typography>
                        </Card>
                     )}
                     <Button
                        fullWidth
                        variant="outlined"
                        size="large"
                        onClick={() => setUploadModalOpen(true)}
                     >
                        Upload Bukti Pembayaran
                     </Button>
                  </Box>
               </>
            )}
            {/* Payment Verification Status */}
            {order.status === 'payment_verification' && (
               <Box
                  sx={{
                     p: 3,
                     bgcolor: 'info.lighter',
                     borderRadius: 2,
                     textAlign: 'center',
                     mb: 3,
                  }}
               >
                  <Iconify
                     icon="solar:clock-circle-bold"
                     width={64}
                     sx={{ color: 'info.main', mb: 2 }}
                  />
                  <Typography variant="h6" color="info.darker" gutterBottom>
                     Bukti Pembayaran Sedang Diverifikasi
                  </Typography>
                  <Typography variant="body2" color="info.darker" sx={{ mb: 2 }}>
                     Admin akan memverifikasi pembayaran Anda dalam 1x24 jam
                  </Typography>
                  {/* Show uploaded proof */}
                  {order.payment_proof && (
                     <Box
                        sx={{
                           mt: 2,
                           border: 1,
                           borderColor: 'divider',
                           borderRadius: 1,
                           overflow: 'hidden',
                           maxWidth: 400,
                           mx: 'auto',
                        }}
                     >
                        <img
                           src={`${process.env.NEXT_PUBLIC_API_HOST}/${order.payment_proof}`}
                           alt="Payment Proof"
                           style={{ width: '100%', height: 'auto', display: 'block' }}
                        />
                     </Box>
                  )}
               </Box>
            )}

            {/* Payment Success */}
            {order.status === 'on_progress' && (
               <Box
                  sx={{
                     p: 3,
                     bgcolor: 'success.lighter',
                     borderRadius: 2,
                     textAlign: 'center',
                     mb: 3,
                  }}
               >
                  <Iconify
                     icon="solar:check-circle-bold"
                     width={64}
                     sx={{ color: 'success.main', mb: 2 }}
                  />
                  <Typography variant="h6" color="success.darker" gutterBottom>
                     Pembayaran Berhasil!
                  </Typography>
                  <Typography variant="body2" color="success.darker">
                     Pesanan Anda sedang diproses
                  </Typography>
               </Box>
            )}

            {/* Order Finished */}
            {order.status === 'finish' && (
               <Box
                  sx={{
                     p: 3,
                     bgcolor: 'success.lighter',
                     borderRadius: 2,
                     textAlign: 'center',
                     mb: 3,
                  }}
               >
                  <Iconify
                     icon="solar:verified-check-bold"
                     width={64}
                     sx={{ color: 'success.main', mb: 2 }}
                  />
                  <Typography variant="h6" color="success.darker" gutterBottom>
                     Pesanan Selesai
                  </Typography>
                  <Typography variant="body2" color="success.darker">
                     Terima kasih atas pesanan Anda!
                  </Typography>
               </Box>
            )}

            <Divider sx={{ my: 3 }} />

            {/* Actions */}
            <Box sx={{ display: 'flex', gap: 2 }}>
               <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => router.push(paths.dashboard.customer_orders.my_orders)}
               >
                  Lihat Pesanan Saya
               </Button>
               <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => router.push(paths.dashboard.customer_orders.catalog)}
               >
                  Belanja Lagi
               </Button>
            </Box>
         </Card>

         {/* Upload Payment Proof Modal */}
         <UploadPaymentProofModal
            open={uploadModalOpen}
            onClose={() => setUploadModalOpen(false)}
            orderId={orderId}
         />
      </DashboardContent>
   );
}
