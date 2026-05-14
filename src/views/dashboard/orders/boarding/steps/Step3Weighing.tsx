'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import LoadingButton from '@mui/lab/LoadingButton';

import type { IVoucher } from 'src/types/voucher';

import { Iconify } from 'src/components/iconify';
import { toast } from 'src/components/snackbar';
import useOrderStore from 'src/stores/order';
import type { UserData } from 'src/stores/user';

import type { BoardingCartItem } from './Step2ServiceSelect';
import type { IDeliveryAddressResult } from '../components/AddAddressModal';

// ----------------------------------------------------------------------

interface Props {
   customer: UserData;
   address: IDeliveryAddressResult;
   cartItems: BoardingCartItem[];
   voucher: IVoucher | null;
   discountAmount: number;
   onBack: () => void;
   onNext: (order: { id: string; order_number: string; total_bill: number; xendit_invoice_url?: string }) => void;
}


function formatCurrency(value: number) {
   return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
   }).format(value);
}

export function Step3Weighing({ customer, address, cartItems, voucher, discountAmount, onBack, onNext }: Props) {
   const { kasirCreateOrder } = useOrderStore();

   const [weightKg, setWeightKg] = useState('');
   const [totalPcs, setTotalPcs] = useState('');
   const [notes, setNotes] = useState('');
   const [submitting, setSubmitting] = useState(false);

   const subtotal = cartItems.reduce((sum, item) => {
      const price = item.variant ? item.variant.price : item.service.price;
      return sum + price * item.qty;
   }, 0);
   const total = Math.max(0, subtotal - discountAmount);

   const handleSubmit = async () => {
      setSubmitting(true);
      try {
         const payload = {
            user_id: customer.id!,
            address_receiver: address.address,
            phone_receiver: address.phone_number,
            notes: notes.trim() || undefined,
            voucher_code: voucher?.code || undefined,
            weight_kg: weightKg ? parseFloat(weightKg) : undefined,
            total_pcs: totalPcs ? parseInt(totalPcs, 10) : undefined,
            products: [],
            services: cartItems.map((item) => ({
               service_id: item.service.id,
               service_variant_id: item.variant?.id || undefined,
               qty: item.qty,
            })),
         };

         const res = await kasirCreateOrder({ data: payload });
         if (res.success) {
            toast.success('Pesanan berhasil dibuat!');
            onNext({
               id: res.data?.id,
               order_number: res.data?.order_number,
               total_bill: res.data?.total_bill,
               xendit_invoice_url: res.data?.xendit_invoice_url,
            });
         } else {
            toast.error(res.message || 'Gagal membuat pesanan');
         }
      } catch (err: any) {
         toast.error(err?.message || 'Terjadi kesalahan');
      }
      setSubmitting(false);
   };

   return (
      <Box>
         <Typography variant="h6" gutterBottom>
            Penimbangan & Konfirmasi
         </Typography>

         <Stack spacing={3}>
            {/* Customer & Address Summary */}
            <Card>
               <CardContent>
                  <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                     Info Customer
                  </Typography>
                  <Stack spacing={0.5}>
                     <Typography variant="body2">
                        <strong>Nama:</strong> {customer.name}
                     </Typography>
                     <Typography variant="body2">
                        <strong>HP:</strong> {String(customer.phone || '-')}
                     </Typography>
                     <Typography variant="body2">
                        <strong>Alamat Pengiriman:</strong> {address.address}
                     </Typography>
                     <Typography variant="body2">
                        <strong>HP Penerima:</strong> {address.phone_number}
                     </Typography>
                  </Stack>
               </CardContent>
            </Card>

            {/* Order Summary */}
            <Card>
               <CardContent>
                  <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                     Rincian Layanan
                  </Typography>
                  <Stack spacing={1}>
                     {cartItems.map((item, idx) => {
                        const price = item.variant ? item.variant.price : item.service.price;
                        return (
                           <Stack key={idx} direction="row" justifyContent="space-between">
                              <Typography variant="body2">
                                 {item.service.name}
                                 {item.variant && (
                                    <Typography component="span" variant="caption" color="text.secondary">
                                       {' '}• {item.variant.name}
                                    </Typography>
                                 )}{' '}
                                 × {item.qty}
                              </Typography>
                              <Typography variant="body2" fontWeight={600}>
                                 {formatCurrency(price * item.qty)}
                              </Typography>
                           </Stack>
                        );
                     })}
                  </Stack>

                  <Divider sx={{ my: 2 }} />

                  <Stack spacing={0.5}>
                     <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">Subtotal</Typography>
                        <Typography variant="body2">{formatCurrency(subtotal)}</Typography>
                     </Stack>
                     {voucher && discountAmount > 0 && (
                        <Stack direction="row" justifyContent="space-between">
                           <Typography variant="body2" color="success.main">
                              Voucher ({voucher.code})
                           </Typography>
                           <Typography variant="body2" color="success.main">
                              -{formatCurrency(discountAmount)}
                           </Typography>
                        </Stack>
                     )}
                     <Stack direction="row" justifyContent="space-between">
                        <Typography variant="subtitle1" fontWeight={700}>Total</Typography>
                        <Typography variant="subtitle1" fontWeight={700} color="primary.main">
                           {formatCurrency(total)}
                        </Typography>
                     </Stack>
                  </Stack>
               </CardContent>
            </Card>

            {/* Weighing Form */}
            <Card>
               <CardContent>
                  <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                     Data Penimbangan
                  </Typography>
                  <Stack spacing={2}>
                     <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <TextField
                           label="Total Berat (kg)"
                           value={weightKg}
                           onChange={(e) => setWeightKg(e.target.value)}
                           type="number"
                           inputProps={{ step: 0.1, min: 0 }}
                           InputProps={{
                              endAdornment: (
                                 <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                                    kg
                                 </Typography>
                              ),
                           }}
                           fullWidth
                           placeholder="0.0"
                        />
                        <TextField
                           label="Total Item (pcs)"
                           value={totalPcs}
                           onChange={(e) => setTotalPcs(e.target.value)}
                           type="number"
                           inputProps={{ step: 1, min: 0 }}
                           InputProps={{
                              endAdornment: (
                                 <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                                    pcs
                                 </Typography>
                              ),
                           }}
                           fullWidth
                           placeholder="0"
                        />
                     </Stack>
                     <TextField
                        label="Catatan Tambahan (opsional)"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        multiline
                        rows={3}
                        fullWidth
                        placeholder="Catatan khusus untuk pesanan ini..."
                     />
                  </Stack>
               </CardContent>
            </Card>
         </Stack>

         {/* Navigation */}
         <Stack direction="row" justifyContent="space-between" sx={{ mt: 4 }}>
            <Button
               variant="outlined"
               onClick={onBack}
               startIcon={<Iconify icon="solar:arrow-left-bold" />}
               disabled={submitting}
            >
               Kembali
            </Button>
            <LoadingButton
               loading={submitting}
               variant="contained"
               size="large"
               color="primary"
               onClick={handleSubmit}
               startIcon={<Iconify icon="solar:check-circle-bold" />}
            >
               Submit Pesanan
            </LoadingButton>
         </Stack>
      </Box>
   );
}
