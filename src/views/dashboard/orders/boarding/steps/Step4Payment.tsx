'use client';

import { useState, useEffect, useRef } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import LoadingButton from '@mui/lab/LoadingButton';

import { useRouter } from 'src/routes/hooks';
import { paths } from 'src/routes/al/paths';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { fCurrency } from 'src/utils/format-number';
import useOrderStore from 'src/stores/order';
import useBankStore, { type IBank } from 'src/stores/bank';
import { CONFIG } from 'src/global-config';

// ----------------------------------------------------------------------

interface Props {
   orderId: string;
   orderNumber: string;
   totalBill: number;
   xenditInvoiceUrl?: string;
   onBack?: () => void;
}

type PaymentMethod = 'manual' | 'xendit' | 'kasir_confirm';

// Helper to build image URL
function imgUrl(path?: string | null) {
   if (!path) return '';
   if (path.startsWith('http')) return path;
   return `${CONFIG.apiHostUrl}/${path}`;
}

export function Step4Payment({ orderId, orderNumber, totalBill, xenditInvoiceUrl, onBack }: Props) {
   const router = useRouter();
   const { verifyPayment, uploadPaymentProof } = useOrderStore();
   const { banks, fetchBanks } = useBankStore();

   const [method, setMethod] = useState<PaymentMethod | null>(null);
   const [file, setFile] = useState<File | null>(null);
   const [preview, setPreview] = useState('');
   const [submitting, setSubmitting] = useState(false);
   const fileInputRef = useRef<HTMLInputElement>(null);

   useEffect(() => {
      fetchBanks({ is_active: true, limit: 50 });
   }, [fetchBanks]);

   // Split banks and QRIS entries
   const bankEntries = banks.filter((b: IBank) => !b.is_qris);
   const qrisEntries = banks.filter((b: IBank) => b.is_qris);

   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f) return;
      if (!f.type.startsWith('image/')) { toast.error('File harus berupa gambar'); return; }
      if (f.size > 5 * 1024 * 1024) { toast.error('Ukuran file maksimal 5MB'); return; }
      setFile(f);
      setPreview(URL.createObjectURL(f));
   };

   // Kasir direct confirm — verify payment immediately (no proof needed)
   const handleKasirConfirm = async () => {
      setSubmitting(true);
      try {
         const res = await verifyPayment({
            id: orderId,
            data: {
               action: 'approve',
               reason: 'Pembayaran tunai dikonfirmasi langsung oleh kasir',
               payment_method: 'cash',
            },
         });
         if (res.success) {
            toast.success('Pembayaran dikonfirmasi! Pesanan siap diproses.');
            router.push(paths.dashboard.orders.detail(orderId));
         } else {
            toast.error(res.message || 'Gagal konfirmasi pembayaran');
         }
      } catch {
         toast.error('Terjadi kesalahan');
      }
      setSubmitting(false);
   };

   // Manual transfer / QRIS — upload proof then verify
   const handleManualUpload = async () => {
      if (!file) { toast.error('Pilih bukti transfer / bukti pembayaran terlebih dahulu'); return; }
      setSubmitting(true);
      try {
         // 1. Upload proof
         const fd = new FormData();
         fd.append('payment_proof', file);
         const uploadRes = await uploadPaymentProof({ id: orderId, data: fd });
         if (!uploadRes.success) {
            toast.error(uploadRes.message || 'Gagal upload bukti pembayaran');
            setSubmitting(false);
            return;
         }
         // 2. Verify immediately (kasir confirmed it)
         const verifyRes = await verifyPayment({
            id: orderId,
            data: { action: 'approve', reason: 'Bukti transfer/QRIS dikonfirmasi kasir' },
         });
         if (verifyRes.success) {
            toast.success('Pembayaran dikonfirmasi! Pesanan siap diproses.');
            router.push(paths.dashboard.orders.detail(orderId));
         } else {
            toast.error(verifyRes.message || 'Gagal konfirmasi pembayaran');
         }
      } catch {
         toast.error('Terjadi kesalahan');
      }
      setSubmitting(false);
   };

   return (
      <Box>
         <Typography variant="h6" gutterBottom>
            Pembayaran
         </Typography>

         {/* Order info summary */}
         <Card sx={{ mb: 3, bgcolor: 'background.neutral' }}>
            <CardContent>
               <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                     <Typography variant="subtitle2" color="text.secondary">Order</Typography>
                     <Typography variant="h6">{orderNumber}</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                     <Typography variant="subtitle2" color="text.secondary">Total Tagihan</Typography>
                     <Typography variant="h5" color="primary.main" fontWeight={700}>
                        {fCurrency(totalBill)}
                     </Typography>
                  </Box>
               </Stack>
            </CardContent>
         </Card>

         {/* Payment method selector */}
         <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Pilih Metode Pembayaran
         </Typography>

         <Stack spacing={2} sx={{ mb: 3 }}>
            {/* Kasir Confirm (paling cepat) */}
            <Card
               onClick={() => setMethod('kasir_confirm')}
               sx={{
                  cursor: 'pointer',
                  border: '2px solid',
                  borderColor: method === 'kasir_confirm' ? 'primary.main' : 'divider',
                  transition: 'border-color 0.2s',
                  '&:hover': { borderColor: 'primary.light' },
               }}
            >
               <CardContent>
                  <Stack direction="row" alignItems="center" spacing={2}>
                     <Box
                        sx={{
                           width: 44, height: 44, borderRadius: '50%',
                           bgcolor: method === 'kasir_confirm' ? 'primary.main' : 'action.hover',
                           display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                     >
                        <Iconify
                           icon="solar:check-circle-bold"
                           width={24}
                           sx={{ color: method === 'kasir_confirm' ? 'white' : 'text.secondary' }}
                        />
                     </Box>
                     <Box sx={{ flexGrow: 1 }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                           <Typography variant="subtitle2">Bayar Tunai ke Kasir</Typography>
                           <Chip label="Rekomendasi" color="primary" size="small" variant="soft" />
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                           Pembayaran lunas dalam bentuk tunai — kasir langsung konfirmasi
                        </Typography>
                     </Box>
                  </Stack>
               </CardContent>
            </Card>

            {/* Transfer / QRIS Manual */}
            <Card
               onClick={() => setMethod('manual')}
               sx={{
                  cursor: 'pointer',
                  border: '2px solid',
                  borderColor: method === 'manual' ? 'info.main' : 'divider',
                  transition: 'border-color 0.2s',
                  '&:hover': { borderColor: 'info.light' },
               }}
            >
               <CardContent>
                  <Stack direction="row" alignItems="center" spacing={2}>
                     <Box
                        sx={{
                           width: 44, height: 44, borderRadius: '50%',
                           bgcolor: method === 'manual' ? 'info.main' : 'action.hover',
                           display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                     >
                        <Iconify
                           icon="solar:transfer-horizontal-bold"
                           width={24}
                           sx={{ color: method === 'manual' ? 'white' : 'text.secondary' }}
                        />
                     </Box>
                     <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="subtitle2">Transfer / QRIS Manual</Typography>
                        <Typography variant="caption" color="text.secondary">
                           Upload bukti transfer atau struk QRIS — kasir konfirmasi
                        </Typography>
                     </Box>
                  </Stack>
               </CardContent>
            </Card>

            {/* Xendit */}
            {xenditInvoiceUrl && (
               <Card
                  onClick={() => setMethod('xendit')}
                  sx={{
                     cursor: 'pointer',
                     border: '2px solid',
                     borderColor: method === 'xendit' ? 'warning.main' : 'divider',
                     transition: 'border-color 0.2s',
                     '&:hover': { borderColor: 'warning.light' },
                  }}
               >
                  <CardContent>
                     <Stack direction="row" alignItems="center" spacing={2}>
                        <Box
                           sx={{
                              width: 44, height: 44, borderRadius: '50%',
                              bgcolor: method === 'xendit' ? 'warning.main' : 'action.hover',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                           }}
                        >
                           <Iconify
                              icon="solar:card-bold"
                              width={24}
                              sx={{ color: method === 'xendit' ? 'white' : 'text.secondary' }}
                           />
                        </Box>
                        <Box sx={{ flexGrow: 1 }}>
                           <Typography variant="subtitle2">Payment Gateway (Xendit)</Typography>
                           <Typography variant="caption" color="text.secondary">
                              QRIS, Virtual Account, Kartu Kredit, dll.
                           </Typography>
                        </Box>
                     </Stack>
                  </CardContent>
               </Card>
            )}
         </Stack>

         {/* Detail section per method */}
         {method === 'kasir_confirm' && (
            <Alert severity="info" icon={<Iconify icon="solar:info-circle-bold" />} sx={{ mb: 3 }}>
               Pastikan customer sudah membayar tunai sebesar <strong>{fCurrency(totalBill)}</strong> sebelum klik konfirmasi.
            </Alert>
         )}

         {method === 'manual' && (
            <Card sx={{ mb: 3 }}>
               <CardContent>
                  {/* ---- Bank Transfer Entries ---- */}
                  {bankEntries.length > 0 && (
                     <>
                        <Typography variant="subtitle2" gutterBottom>
                           <Iconify icon="solar:card-transfer-bold-duotone" width={16} sx={{ mr: 0.5, verticalAlign: 'middle' }} />
                           Rekening Transfer
                        </Typography>
                        <Stack spacing={1.5} sx={{ mb: 2 }}>
                           {bankEntries.map((bank: IBank) => (
                              <Box key={bank.id} sx={{ p: 2, bgcolor: 'background.neutral', borderRadius: 1.5 }}>
                                 <Stack direction="row" alignItems="center" spacing={1.5}>
                                    {bank.logo && (
                                       <Box
                                          component="img"
                                          src={imgUrl(bank.logo)}
                                          alt={bank.bank_name}
                                          sx={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 1 }}
                                       />
                                    )}
                                    <Box>
                                       <Typography variant="subtitle2">{bank.bank_name}</Typography>
                                       <Typography variant="body2" fontFamily="monospace" fontSize={15} fontWeight={700}>
                                          {bank.account_number}
                                       </Typography>
                                       <Typography variant="caption" color="text.secondary">
                                          a/n {bank.account_owner}
                                       </Typography>
                                    </Box>
                                 </Stack>
                              </Box>
                           ))}
                        </Stack>
                     </>
                  )}

                  {/* ---- QRIS Entries ---- */}
                  {qrisEntries.length > 0 && (
                     <>
                        {bankEntries.length > 0 && <Divider sx={{ my: 2 }} />}
                        <Typography variant="subtitle2" gutterBottom>
                           <Iconify icon="solar:qr-code-bold-duotone" width={16} sx={{ mr: 0.5, verticalAlign: 'middle' }} />
                           QRIS
                        </Typography>
                        <Stack spacing={2} sx={{ mb: 2 }}>
                           {qrisEntries.map((qris: IBank) => (
                              <Box key={qris.id} sx={{ p: 2, bgcolor: 'background.neutral', borderRadius: 1.5 }}>
                                 <Typography variant="subtitle2" gutterBottom>{qris.bank_name || 'QRIS'}</Typography>
                                 {qris.qris_image ? (
                                    <Box
                                       component="img"
                                       src={imgUrl(qris.qris_image)}
                                       alt="QRIS"
                                       sx={{ width: 220, height: 220, objectFit: 'contain', display: 'block', mx: 'auto', borderRadius: 1 }}
                                    />
                                 ) : (
                                    <Typography variant="caption" color="text.secondary">QR image belum tersedia</Typography>
                                 )}
                                 {qris.account_owner && (
                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5, textAlign: 'center' }}>
                                       a/n {qris.account_owner}
                                    </Typography>
                                 )}
                              </Box>
                           ))}
                        </Stack>
                     </>
                  )}

                  {bankEntries.length === 0 && qrisEntries.length === 0 && (
                     <Typography variant="body2" color="text.secondary">
                        Tidak ada rekening atau QRIS yang aktif.
                     </Typography>
                  )}

                  <Divider sx={{ my: 2 }} />

                  {/* Upload Proof */}
                  <Typography variant="subtitle2" gutterBottom>Upload Bukti Pembayaran</Typography>
                  <Button
                     component="label"
                     variant="outlined"
                     startIcon={<Iconify icon="solar:upload-bold" />}
                     fullWidth
                     sx={{ mb: 2 }}
                  >
                     {file ? `${file.name} (${(file.size / 1024).toFixed(0)} KB)` : 'Pilih Bukti Transfer / Struk QRIS'}
                     <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} hidden />
                  </Button>

                  {preview && (
                     <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden', maxWidth: 320 }}>
                        <img src={preview} alt="Preview" style={{ width: '100%', height: 'auto', display: 'block' }} />
                     </Box>
                  )}
               </CardContent>
            </Card>
         )}

         {method === 'xendit' && xenditInvoiceUrl && (
            <Alert severity="warning" icon={<Iconify icon="solar:card-bold" />} sx={{ mb: 3 }}>
               Klik tombol di bawah untuk membuka halaman pembayaran Xendit. Setelah customer selesai membayar, status pesanan akan otomatis terupdate.
            </Alert>
         )}

         {/* Actions */}
         <Stack direction="row" justifyContent="space-between" sx={{ mt: 2 }}>
            <Button
               variant="outlined"
               onClick={onBack}
               startIcon={<Iconify icon="solar:arrow-left-bold" />}
               disabled={submitting}
            >
               Kembali
            </Button>

            <Box>
               {method === 'kasir_confirm' && (
                  <LoadingButton
                     loading={submitting}
                     variant="contained"
                     color="primary"
                     size="large"
                     startIcon={<Iconify icon="solar:check-circle-bold" />}
                     onClick={handleKasirConfirm}
                  >
                     Konfirmasi Pembayaran
                  </LoadingButton>
               )}

               {method === 'manual' && (
                  <LoadingButton
                     loading={submitting}
                     variant="contained"
                     color="info"
                     size="large"
                     startIcon={<Iconify icon="solar:upload-bold" />}
                     onClick={handleManualUpload}
                     disabled={!file}
                  >
                     Upload & Konfirmasi
                  </LoadingButton>
               )}

               {method === 'xendit' && xenditInvoiceUrl && (
                  <Button
                     variant="contained"
                     color="warning"
                     size="large"
                     startIcon={<Iconify icon="solar:card-bold" />}
                     href={xenditInvoiceUrl}
                     target="_blank"
                  >
                     Bayar via Xendit
                  </Button>
               )}

               {!method && (
                  <Button variant="contained" size="large" disabled>
                     Pilih Metode Pembayaran
                  </Button>
               )}
            </Box>
         </Stack>

         {/* Skip — langsung ke detail order */}
         <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Button
               size="small"
               color="inherit"
               onClick={() => router.push(paths.dashboard.orders.detail(orderId))}
            >
               Bayar nanti — lihat detail pesanan
            </Button>
         </Box>
      </Box>
   );
}
