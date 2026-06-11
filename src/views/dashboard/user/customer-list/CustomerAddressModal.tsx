'use client';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Collapse from '@mui/material/Collapse';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import useUserStore, { UserData } from 'src/stores/user';
import { IDeliveryAddress } from 'src/stores/delivery-address';
import { LoadingScreen } from 'src/components/loading-screen';

// ----------------------------------------------------------------------

interface Props {
   customer: UserData | null;
   open: boolean;
   onClose: () => void;
   onSuccess?: () => void;
}

export function CustomerAddressModal({ customer, open, onClose, onSuccess }: Props) {
   const { getDeliveryAddresses, addDeliveryAddress } = useUserStore();
   
   const [addresses, setAddresses] = useState<IDeliveryAddress[]>([]);
   const [loading, setLoading] = useState(false);
   const [submitting, setSubmitting] = useState(false);
   const [showAddForm, setShowAddForm] = useState(false);

   // Add address form state
   const [form, setForm] = useState({
      address: '',
      phone_number: '',
      notes: '',
      is_primary: false,
   });

   const fetchAddresses = useCallback(async () => {
      if (!customer?.id) return;
      setLoading(true);
      try {
         const res = await getDeliveryAddresses({ id: customer.id });
         if (res.success) {
            setAddresses(res.data || []);
         } else {
            toast.error(res.message || 'Gagal memuat alamat');
         }
      } catch {
         toast.error('Terjadi kesalahan saat memuat alamat');
      } finally {
         setLoading(false);
      }
   }, [customer?.id, getDeliveryAddresses]);

   useEffect(() => {
      if (open && customer?.id) {
         fetchAddresses();
         setShowAddForm(false);
         setForm({
            address: '',
            phone_number: typeof customer.phone === 'string' ? customer.phone : String(customer.phone || ''),
            notes: '',
            is_primary: false,
         });
      }
   }, [open, customer, fetchAddresses]);

   const handleFormChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
   };

   const handlePrimaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, is_primary: e.target.checked }));
   };

   const handleSubmitAddress = async () => {
      if (!customer?.id) return;
      if (!form.address.trim()) {
         toast.error('Alamat wajib diisi');
         return;
      }
      if (!form.phone_number.trim()) {
         toast.error('Nomor HP penerima wajib diisi');
         return;
      }

      setSubmitting(true);
      try {
         const res = await addDeliveryAddress({
            userId: customer.id,
            data: {
               address: form.address.trim(),
               phone_number: form.phone_number.trim(),
               notes: form.notes.trim() || undefined,
               is_primary: form.is_primary,
            },
         });

         if (res.success) {
            toast.success('Alamat berhasil ditambahkan');
            setForm({
               address: '',
               phone_number: typeof customer.phone === 'string' ? customer.phone : String(customer.phone || ''),
               notes: '',
               is_primary: false,
            });
            setShowAddForm(false);
            fetchAddresses();
            onSuccess?.(); // Notify parent to refresh user list (to update address count)
         } else {
            toast.error(res.message || 'Gagal menambahkan alamat');
         }
      } catch (err: any) {
         toast.error(err?.message || 'Terjadi kesalahan saat menyimpan alamat');
      } finally {
         setSubmitting(false);
      }
   };

   return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth scroll="paper">
         <DialogTitle sx={{ pb: 2 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
               <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Iconify icon="solar:map-point-bold-duotone" width={24} sx={{ color: 'primary.main' }} />
                  <Typography variant="h6">
                     Alamat Customer: {customer?.name}
                  </Typography>
               </Stack>
               <IconButton onClick={onClose} size="small">
                  <Iconify icon="mingcute:close-line" />
               </IconButton>
            </Stack>
         </DialogTitle>

         <DialogContent sx={{ p: 3, pt: 1, maxHeight: '60vh' }}>
            <Stack spacing={3}>
               {/* Add Address Collapsible Button */}
               {!showAddForm && (
                  <Button
                     variant="soft"
                     color="primary"
                     startIcon={<Iconify icon="solar:add-circle-bold" />}
                     onClick={() => setShowAddForm(true)}
                     fullWidth
                     sx={{ py: 1.25 }}
                  >
                     Tambah Alamat Baru
                  </Button>
               )}

               {/* Collapsible Add Address Form */}
               <Collapse in={showAddForm}>
                  <Card
                     variant="outlined"
                     sx={{
                        p: 2.5,
                        borderColor: 'primary.light',
                        bgcolor: (theme) => theme.palette.background.neutral,
                     }}
                  >
                     <Stack spacing={2}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between">
                           <Typography variant="subtitle2" sx={{ color: 'primary.main' }}>
                              Form Tambah Alamat
                           </Typography>
                           <IconButton size="small" onClick={() => setShowAddForm(false)}>
                              <Iconify icon="mingcute:close-line" />
                           </IconButton>
                        </Stack>

                        <TextField
                           label="Alamat Lengkap"
                           value={form.address}
                           onChange={handleFormChange('address')}
                           multiline
                           rows={2}
                           required
                           fullWidth
                        />

                        <Grid container spacing={2}>
                           <Grid size={{ xs: 12, sm: 6 }}>
                              <TextField
                                 label="HP Penerima"
                                 value={form.phone_number}
                                 onChange={handleFormChange('phone_number')}
                                 required
                                 fullWidth
                                 inputProps={{ inputMode: 'tel' }}
                              />
                           </Grid>
                           <Grid size={{ xs: 12, sm: 6 }}>
                              <TextField
                                 label="Catatan (opsional)"
                                 placeholder="Mis: Pagar hitam, dekat pos satpam"
                                 value={form.notes}
                                 onChange={handleFormChange('notes')}
                                 fullWidth
                              />
                           </Grid>
                        </Grid>

                        <Stack direction="row" alignItems="center" justifyContent="space-between">
                           <FormControlLabel
                              control={
                                 <Checkbox
                                    checked={form.is_primary}
                                    onChange={handlePrimaryChange}
                                    color="primary"
                                 />
                              }
                              label="Jadikan Alamat Utama"
                           />
                           <Stack direction="row" spacing={1}>
                              <Button size="small" variant="outlined" onClick={() => setShowAddForm(false)}>
                                 Batal
                              </Button>
                              <LoadingButton
                                 size="small"
                                 variant="contained"
                                 loading={submitting}
                                 onClick={handleSubmitAddress}
                              >
                                 Simpan
                              </LoadingButton>
                           </Stack>
                        </Stack>
                     </Stack>
                  </Card>
               </Collapse>

               {/* Address List */}
               {loading ? (
                  <LoadingScreen sx={{ py: 5 }} />
               ) : (
                  <Stack spacing={2}>
                     {addresses.length === 0 ? (
                        <Box
                           sx={{
                              py: 6,
                              textAlign: 'center',
                              borderRadius: 1.5,
                              border: '1px dashed',
                              borderColor: 'divider',
                              bgcolor: 'background.neutral',
                           }}
                        >
                           <Iconify
                              icon="solar:map-point-broken"
                              width={48}
                              sx={{ mb: 1.5, color: 'text.disabled', mx: 'auto' }}
                           />
                           <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 0.5 }}>
                              Belum ada alamat pengiriman
                           </Typography>
                           <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                              Silakan tambahkan alamat dengan menekan tombol diatas
                           </Typography>
                        </Box>
                     ) : (
                        addresses.map((addr) => (
                           <Card
                              key={addr.id}
                              variant="outlined"
                              sx={{
                                 p: 2,
                                 position: 'relative',
                                 borderColor: addr.is_primary ? 'primary.main' : 'divider',
                                 boxShadow: addr.is_primary
                                    ? (theme) => `0 0 0 1px ${theme.palette.primary.main}`
                                    : 'none',
                                 transition: 'all 0.2s ease-in-out',
                                 '&:hover': {
                                    borderColor: 'primary.light',
                                 },
                              }}
                           >
                              <Stack spacing={1}>
                                 <Stack direction="row" alignItems="center" justifyContent="space-between">
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                       <Iconify
                                          icon={addr.is_primary ? "solar:map-point-bold" : "solar:map-point-linear"}
                                          width={20}
                                          sx={{ color: addr.is_primary ? 'primary.main' : 'text.secondary' }}
                                       />
                                       <Typography variant="subtitle2">
                                          {addr.is_primary ? 'Alamat Utama' : 'Alamat Pengiriman'}
                                       </Typography>
                                    </Stack>
                                    {addr.is_primary && (
                                       <Chip
                                          label="Utama"
                                          color="primary"
                                          size="small"
                                          variant="soft"
                                       />
                                    )}
                                 </Stack>

                                 <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 'medium' }}>
                                    {addr.address}
                                 </Typography>

                                 <Stack
                                    direction={{ xs: 'column', sm: 'row' }}
                                    spacing={{ xs: 1, sm: 2 }}
                                    sx={{ pt: 0.5, typography: 'caption', color: 'text.secondary' }}
                                 >
                                    <Stack direction="row" alignItems="center" spacing={0.5}>
                                       <Iconify icon="solar:phone-bold" width={14} />
                                       <span>HP: {addr.phone_number}</span>
                                    </Stack>
                                    {addr.notes && (
                                       <Stack direction="row" alignItems="center" spacing={0.5}>
                                          <Iconify icon="solar:document-text-bold" width={14} />
                                          <span>Catatan: {addr.notes}</span>
                                       </Stack>
                                    )}
                                 </Stack>
                              </Stack>
                           </Card>
                        ))
                     )}
                  </Stack>
               )}
            </Stack>
         </DialogContent>

         <Divider />
         
         <DialogActions sx={{ px: 3, py: 2 }}>
            <Button variant="outlined" onClick={onClose} fullWidth>
               Tutup
            </Button>
         </DialogActions>
      </Dialog>
   );
}
