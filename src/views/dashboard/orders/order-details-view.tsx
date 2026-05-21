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
import useAuthStore from 'src/stores/auth';
import { Grid } from '@mui/material';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import TextField from '@mui/material/TextField';
import LoadingButton from '@mui/lab/LoadingButton';
import { toast } from 'src/components/snackbar';

import ServiceItem from './components/service-item';
import UsedRawMaterialList from './components/used-raw-material-list';
import OrderProcessPanel from './components/order-process-panel';

// ----------------------------------------------------------------------

export default function OrderDetailsView() {
   const params = useParams();
   const { id } = params;

   const { detail: getOrder, order } = useOrderStore();
   const { logs, getByOrderId } = useOrderLogStatusStore();

   const [loading, setLoading] = useState(true);

   const [weightKg, setWeightKg] = useState<string>('');
   const [totalPcs, setTotalPcs] = useState<string>('');
   const [orderNotes, setOrderNotes] = useState<string>('');
   const [fastProcessLoading, setFastProcessLoading] = useState(false);

   useEffect(() => {
      if (order) {
         setWeightKg(order.weight_kg ? order.weight_kg.toString() : '');
         setTotalPcs(order.total_pcs ? order.total_pcs.toString() : '');
         setOrderNotes(order.notes || '');
      }
   }, [order]);

   const handleFastProcessSubmit = async () => {
      setFastProcessLoading(true);
      try {
         const { kasirValidateAndProcess } = useOrderStore.getState();
         const res = await kasirValidateAndProcess({
            id: id as string,
            data: {
               weight_kg: weightKg ? parseFloat(weightKg) : undefined,
               total_pcs: totalPcs ? parseInt(totalPcs, 10) : undefined,
               notes: orderNotes || undefined,
            }
         });
         
         if (res.success) {
            toast.success('Pesanan berhasil divalidasi dan diproses!');
            await Promise.all([
               getOrder({ id: id as string }),
               getByOrderId({ orderId: id as string }),
            ]);
         } else {
            toast.error(res.message || 'Gagal memproses pesanan');
         }
      } catch (error: any) {
         toast.error(error.response?.data?.message || error.message || 'Terjadi kesalahan saat memproses');
      } finally {
         setFastProcessLoading(false);
      }
   };

   const { user } = useAuthStore();
   const canReadRawMaterial = (user?.permissions ?? []).includes('Read RawMaterial');

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

   const handleSendWhatsapp = () => {
      if (!order) return;

      const formatMoney = (num: number) => "Rp " + Math.round(num).toLocaleString('id-ID');

      let text = `*📄 NOTA TRANSAKSI LAUNDRY*\n`;
      text += `------------------------------------------\n`;
      text += `*No. Pesanan:* ${order.order_number}\n`;
      text += `*Status:* ${statusLabel[order.status || 'waiting_payment']}\n`;
      text += `*Tanggal:* ${dayjs(order.created_at).format('DD MMM YYYY HH:mm')}\n\n`;

      text += `*Pelanggan:*\n`;
      text += `👤 ${order.phone_receiver}\n`;
      text += `📍 ${order.address_receiver}\n\n`;

      text += `*Rincian Layanan / Produk:*\n`;
      text += `\`\`\`\n`; // Monospace block

      if (order.order_services && order.order_services.length > 0) {
         order.order_services.forEach((item: any) => {
            const sName = `${item.service?.name || 'Layanan'}${
               item.service_variant?.name ? ` - ${item.service_variant.name}` : ''
            }`;
            const sSub = (item.price_at_order || 0) * (item.qty || 0);
            text += `${sName.substring(0, 22).padEnd(22)} x${item.qty}\n`;
            text += `  -> ${formatMoney(sSub)}\n`;
         });
      }

      if (order.order_products && order.order_products.length > 0) {
         order.order_products.forEach((item: any) => {
            const pName = item.product?.title || 'Produk';
            const isIndividual = item.product?.tracking_mode === 'individual';
            const pSub = isIndividual
               ? (item.price_at_order || 0) * (item.requested_length || 0) * (item.qty || 0)
               : (item.price_at_order || 0) * (item.qty || 0);
            text += `${pName.substring(0, 22).padEnd(22)} x${item.qty}\n`;
            text += `  -> ${formatMoney(pSub)}\n`;
         });
      }

      text += `\`\`\`\n`; // End Monospace block
      text += `------------------------------------------\n`;
      text += `*Total Berat:* ${order.weight_kg ? `${order.weight_kg} kg` : '-'}\n`;
      text += `*Total Pcs:* ${order.total_pcs ? `${order.total_pcs} Pcs` : '-'}\n`;

      const detailingBreakdown: string[] = [];
      if (order.selimut_pcs) detailingBreakdown.push(`- Selimut: ${order.selimut_pcs} Pcs`);
      if (order.celana_pcs) detailingBreakdown.push(`- Celana: ${order.celana_pcs} Pcs`);
      if (order.baju_pcs) detailingBreakdown.push(`- Baju: ${order.baju_pcs} Pcs`);
      if (order.sempak_pcs) detailingBreakdown.push(`- Sempak: ${order.sempak_pcs} Pcs`);
      if (order.bra_pcs) detailingBreakdown.push(`- Bra: ${order.bra_pcs} Pcs`);
      if (order.sprei_pcs) detailingBreakdown.push(`- Sprei: ${order.sprei_pcs} Pcs`);
      if (order.lainnya_pcs) detailingBreakdown.push(`- Lainnya: ${order.lainnya_pcs} Pcs`);

      if (detailingBreakdown.length > 0) {
         text += `*Rincian Pcs:*\n${detailingBreakdown.join('\n')}\n`;
      }

      text += `*Catatan:* ${order.notes || '-'}\n\n`;

      if ((order.discount_amount || 0) > 0) {
         text += `*Potongan:* -${formatMoney(order.discount_amount || 0)}\n`;
      }
      text += `*💳 TOTAL TAGIHAN: ${formatMoney(order.total_bill || 0)}*\n\n`;

      text += `Terima kasih telah mempercayai layanan laundry kami! 🙏😊`;

      let phone = order.phone_receiver || '';
      phone = phone.replace(/\D/g, '');
      if (phone.startsWith('0')) {
         phone = '62' + phone.substring(1);
      }

      const url = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
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

         {/* SECTION: Validasi dan Proses Pesanan */}
         {['waiting_payment', 'payment_verification', 'waiting_process'].includes(order.status || '') && (
            <Card sx={{ mb: 3, border: 1, borderColor: 'primary.lighter', bgcolor: 'background.neutral' }}>
               <CardHeader
                  title={
                     <Stack direction="row" alignItems="center" spacing={1}>
                        <Iconify icon="solar:verified-check-bold-duotone" width={24} sx={{ color: 'primary.main' }} />
                        <Typography variant="h6">Validasi dan Proses Pesanan</Typography>
                     </Stack>
                  }
                  subheader="Lengkapi data fisik cucian dan langsung proses order"
                  sx={{ pb: 2 }}
               />
               <Divider />
               <CardContent sx={{ pt: 3 }}>
                  <Grid container spacing={3}>
                     {/* Kiri: Bukti Pembayaran */}
                     <Grid size={{ xs: 12, md: 4 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1.5, color: 'text.secondary' }}>
                           Bukti Pembayaran:
                        </Typography>
                        {order.payment_proof ? (
                           <Box
                              sx={{
                                 position: 'relative',
                                 width: '100%',
                                 borderRadius: 1.5,
                                 overflow: 'hidden',
                                 border: 1,
                                 borderColor: 'divider',
                                 bgcolor: '#fff',
                                 lineHeight: 0
                              }}
                           >
                              <Box
                                 component="img"
                                 src={`${CONFIG.apiHostUrl}/${order.payment_proof}`}
                                 alt="Payment Proof"
                                 sx={{ width: '100%', height: 'auto', maxHeight: 260, objectFit: 'contain', cursor: 'pointer' }}
                                 onClick={() => window.open(`${CONFIG.apiHostUrl}/${order.payment_proof}`, '_blank')}
                              />
                           </Box>
                        ) : (
                           <Box
                              sx={{
                                 py: 6,
                                 px: 2,
                                 textAlign: 'center',
                                 border: '1px dashed',
                                 borderColor: 'divider',
                                 borderRadius: 1.5,
                                 bgcolor: 'background.default'
                              }}
                           >
                              <Iconify icon="solar:bill-cross-bold-duotone" width={48} sx={{ color: 'text.disabled', mb: 1.5, opacity: 0.6 }} />
                              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                                 Belum ada bukti upload
                              </Typography>
                              <Typography variant="caption" display="block" color="text.disabled" sx={{ mt: 0.5 }}>
                                 (Pelanggan belum upload bukti transfer manual/QRIS)
                              </Typography>
                           </Box>
                        )}
                     </Grid>

                     {/* Kanan: Input Field */}
                     <Grid size={{ xs: 12, md: 8 }}>
                        <Stack spacing={2.5}>
                           <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5}>
                              <TextField
                                 fullWidth
                                 label="Total Berat"
                                 placeholder="0.00"
                                 type="number"
                                 value={weightKg}
                                 onChange={(e) => setWeightKg(e.target.value)}
                                 slotProps={{
                                    input: {
                                       endAdornment: <Typography variant="body2" color="text.secondary">kg</Typography>
                                    }
                                 }}
                              />
                              <TextField
                                 fullWidth
                                 label="Total Pieces"
                                 placeholder="0"
                                 type="number"
                                 value={totalPcs}
                                 onChange={(e) => setTotalPcs(e.target.value)}
                                 slotProps={{
                                    input: {
                                       endAdornment: <Typography variant="body2" color="text.secondary">Pcs</Typography>
                                    }
                                 }}
                              />
                           </Stack>
                           <TextField
                              fullWidth
                              label="Catatan Deskripsi Cucian"
                              placeholder="Tulis catatan khusus kondisi barang, berat, atau permintaan pelanggan..."
                              multiline
                              rows={3}
                              value={orderNotes}
                              onChange={(e) => setOrderNotes(e.target.value)}
                           />
                           <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                              <LoadingButton
                                 size="large"
                                 variant="contained"
                                 loading={fastProcessLoading}
                                 onClick={handleFastProcessSubmit}
                                 startIcon={<Iconify icon="solar:bolt-circle-bold" />}
                                 sx={{ px: 4 }}
                              >
                                 Validasi & Proses Pesanan
                              </LoadingButton>
                           </Box>
                        </Stack>
                     </Grid>
                  </Grid>
               </CardContent>
            </Card>
         )}

         <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 7 }}>
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

                           <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Iconify icon="solar:scale-bold-duotone" width={20} sx={{ color: 'primary.main' }} />
                              <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
                                 Total Berat
                              </Typography>
                              <Typography variant="subtitle2">
                                 {order.weight_kg ? `${order.weight_kg} kg` : '-'}
                              </Typography>
                           </Box>

                           <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Iconify icon="solar:box-minimalistic-bold-duotone" width={20} sx={{ color: 'warning.main' }} />
                              <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
                                 Total Pcs
                              </Typography>
                              <Typography variant="subtitle2">
                                 {order.total_pcs ? `${order.total_pcs} Pcs` : '-'}
                              </Typography>
                           </Box>

                           {(order.selimut_pcs || order.celana_pcs || order.baju_pcs || order.sempak_pcs || order.bra_pcs || order.sprei_pcs || order.lainnya_pcs) ? (
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                 <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Iconify icon="solar:box-bold-duotone" width={20} sx={{ color: 'success.main' }} />
                                    <Typography variant="body2" color="text.secondary">
                                       Rincian Pcs Cucian
                                    </Typography>
                                 </Box>
                                 <Box sx={{ pl: 4.5 }}>
                                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ gap: 1 }}>
                                       {!!order.selimut_pcs && (
                                          <Chip
                                             icon={<Iconify icon="solar:bed-bold-duotone" width={14} />}
                                             label={`Selimut: ${order.selimut_pcs} pcs`}
                                             variant="soft"
                                             color="info"
                                             size="small"
                                             sx={{ fontWeight: 600 }}
                                          />
                                       )}
                                       {!!order.celana_pcs && (
                                          <Chip
                                             icon={<Iconify icon="ph:pants-bold" width={14} />}
                                             label={`Celana: ${order.celana_pcs} pcs`}
                                             variant="soft"
                                             color="warning"
                                             size="small"
                                             sx={{ fontWeight: 600 }}
                                          />
                                       )}
                                       {!!order.baju_pcs && (
                                          <Chip
                                             icon={<Iconify icon="solar:t-shirt-bold-duotone" width={14} />}
                                             label={`Baju: ${order.baju_pcs} pcs`}
                                             variant="soft"
                                             color="success"
                                             size="small"
                                             sx={{ fontWeight: 600 }}
                                          />
                                       )}
                                       {!!order.sempak_pcs && (
                                          <Chip
                                             icon={<Iconify icon="solar:shield-user-bold-duotone" width={14} />}
                                             label={`Sempak: ${order.sempak_pcs} pcs`}
                                             variant="soft"
                                             color="error"
                                             size="small"
                                             sx={{ fontWeight: 600 }}
                                          />
                                       )}
                                       {!!order.bra_pcs && (
                                          <Chip
                                             icon={<Iconify icon="solar:heart-bold-duotone" width={14} />}
                                             label={`Bra: ${order.bra_pcs} pcs`}
                                             variant="soft"
                                             color="secondary"
                                             size="small"
                                             sx={{ fontWeight: 600 }}
                                          />
                                       )}
                                       {!!order.sprei_pcs && (
                                          <Chip
                                             icon={<Iconify icon="solar:document-bold-duotone" width={14} />}
                                             label={`Sprei: ${order.sprei_pcs} pcs`}
                                             variant="soft"
                                             color="primary"
                                             size="small"
                                             sx={{ fontWeight: 600 }}
                                          />
                                       )}
                                       {!!order.lainnya_pcs && (
                                          <Chip
                                             icon={<Iconify icon="solar:box-bold-duotone" width={14} />}
                                             label={`Lainnya: ${order.lainnya_pcs} pcs`}
                                             variant="soft"
                                             color="default"
                                             size="small"
                                             sx={{ fontWeight: 600 }}
                                          />
                                       )}
                                    </Stack>
                                 </Box>
                              </Box>
                           ) : null}

                           <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                 <Iconify icon="solar:document-text-bold-duotone" width={20} sx={{ color: 'info.main' }} />
                                 <Typography variant="body2" color="text.secondary">
                                    Catatan / Deskripsi
                                 </Typography>
                              </Box>
                              <Typography
                                 variant="body2"
                                 sx={{
                                    pl: 4.5,
                                    fontStyle: order.notes ? 'normal' : 'italic',
                                    color: order.notes ? 'text.primary' : 'text.disabled',
                                 }}
                              >
                                 {order.notes || 'Tidak ada catatan tambahan'}
                              </Typography>
                           </Box>

                           <Divider sx={{ borderStyle: 'dashed' }} />
                           {((order.discount_amount || 0) > 0) && (
                              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                 <Box>
                                    <Typography variant="body2" color="error">
                                       Discount
                                    </Typography>
                                    {order.voucher && (
                                       <Typography variant="caption" color="text.secondary">
                                          Voucher: {order.voucher.code}
                                       </Typography>
                                    )}
                                 </Box>
                                 <Typography variant="subtitle2" color="error">
                                    -{fCurrency(order.discount_amount || 0)}
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

                        <Button
                           variant="contained"
                           fullWidth
                           startIcon={<Iconify icon="ic:baseline-whatsapp" width={24} />}
                           onClick={handleSendWhatsapp}
                           sx={{
                              mt: 3,
                              bgcolor: '#25D366',
                              color: 'white',
                              height: 48,
                              fontSize: '1rem',
                              fontWeight: 600,
                              boxShadow: (theme) => `0 8px 16px 0 rgba(37, 211, 102, 0.24)`,
                              '&:hover': {
                                 bgcolor: '#128C7E',
                                 boxShadow: 'none',
                              },
                           }}
                        >
                           Kirim Nota ke WhatsApp
                        </Button>
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
            <Grid size={{ xs: 12, md: 5 }}>
               {/* Used Raw Material List - Only for users with Read RawMaterial permission */}
               {order.status === 'finish' && canReadRawMaterial && <UsedRawMaterialList orderId={order.id || ''} />}

               {/* Order-Level Process Panel (kasir) */}
               <OrderProcessPanel
                  orderId={order.id || ''}
                  orderStatus={order.status || ''}
                  onOrderFinished={async () => {
                     if (id) {
                        await Promise.all([
                           getOrder({ id: id as string }),
                           getByOrderId({ orderId: id as string }),
                        ]);
                     }
                  }}
               />

               <Card sx={{ mt: 3 }}>
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
