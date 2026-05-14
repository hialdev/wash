'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
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

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import useUserStore, { type UserData } from 'src/stores/user';

import type { IDeliveryAddressResult } from './AddAddressModal';

// ----------------------------------------------------------------------

interface Props {
   open: boolean;
   onClose: () => void;
   /** Called after user + first address are saved, so Step1 can auto-select them */
   onSuccess: (user: UserData, firstAddress: IDeliveryAddressResult) => void;
}

function generateUsername(name: string) {
   const base = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
   return `${base}_${Math.floor(1000 + Math.random() * 9000)}`;
}

export function AddCustomerModal({ open, onClose, onSuccess }: Props) {
   const { add: addUser, addDeliveryAddress } = useUserStore();
   const [loading, setLoading] = useState(false);
   const [step, setStep] = useState(0);

   const [form, setForm] = useState({ name: '', phone: '', email: '' });
   const [addresses, setAddresses] = useState([
      { address: '', phone_number: '', notes: '', is_primary: true },
   ]);

   const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

   const handleAddrChange = (idx: number, field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setAddresses((prev) => {
         const next = [...prev];
         next[idx] = { ...next[idx], [field]: e.target.value };
         return next;
      });

   const handleAddrCheck = (idx: number, checked: boolean) =>
      setAddresses((prev) => {
         const next = [...prev];
         next[idx] = { ...next[idx], is_primary: checked };
         return next;
      });

   const addAddressRow = () =>
      setAddresses((prev) => [
         ...prev,
         { address: '', phone_number: form.phone, notes: '', is_primary: false },
      ]);

   const removeAddressRow = (idx: number) =>
      setAddresses((prev) => prev.filter((_, i) => i !== idx));

   const validateStep0 = () => {
      if (!form.name.trim()) { toast.error('Nama wajib diisi'); return false; }
      if (!form.phone.trim()) { toast.error('Nomor HP wajib diisi'); return false; }
      return true;
   };

   const validateStep1 = () => {
      for (const a of addresses) {
         if (!a.address.trim()) { toast.error('Alamat tidak boleh kosong'); return false; }
         if (!a.phone_number.trim()) { toast.error('HP penerima tidak boleh kosong'); return false; }
      }
      return true;
   };

   const handleNext = () => {
      if (!validateStep0()) return;
      setAddresses((prev) =>
         prev.map((a, i) => (i === 0 && !a.phone_number ? { ...a, phone_number: form.phone } : a))
      );
      setStep(1);
   };

   const handleSubmit = async () => {
      if (!validateStep1()) return;
      setLoading(true);
      try {
         const userRes = await addUser({
            id: '',
            name: form.name.trim(),
            username: generateUsername(form.name),
            phone: form.phone.trim(),
            email: form.email.trim() || undefined,
         });

         if (!userRes.success) {
            toast.error(userRes.message || 'Gagal menambahkan customer');
            setLoading(false);
            return;
         }

         const newUser: UserData = userRes.data;
         const userId: string = newUser.id!;

         let firstAddress: IDeliveryAddressResult | null = null;
         for (const addr of addresses) {
            if (!addr.address.trim()) continue;
            const addrRes = await addDeliveryAddress({
               userId,
               data: {
                  address: addr.address.trim(),
                  phone_number: addr.phone_number.trim(),
                  notes: addr.notes.trim() || undefined,
                  is_primary: addr.is_primary,
               },
            });
            if (addrRes.success && !firstAddress) {
               firstAddress = addrRes.data as IDeliveryAddressResult;
            }
         }

         toast.success(`Customer "${form.name}" berhasil ditambahkan`);
         onSuccess(newUser, firstAddress!);
         handleClose();
      } catch {
         toast.error('Terjadi kesalahan');
      }
      setLoading(false);
   };

   const handleClose = () => {
      setForm({ name: '', phone: '', email: '' });
      setAddresses([{ address: '', phone_number: '', notes: '', is_primary: true }]);
      setStep(0);
      onClose();
   };

   return (
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
         <DialogTitle>
            <Stack direction="row" alignItems="center" spacing={1.5}>
               <Iconify icon="solar:user-plus-bold-duotone" width={24} sx={{ color: 'primary.main' }} />
               <span>Tambah Customer Baru</span>
            </Stack>
         </DialogTitle>

         <Tabs value={step} sx={{ px: 3, borderBottom: 1, borderColor: 'divider' }}>
            <Tab label="1. Data Diri" />
            <Tab label="2. Alamat" disabled={step < 1} />
         </Tabs>

         <DialogContent sx={{ pt: 3 }}>
            {step === 0 && (
               <Stack spacing={2}>
                  <TextField label="Nama Lengkap" value={form.name} onChange={handleChange('name')} required fullWidth autoFocus />
                  <TextField
                     label="Nomor HP"
                     value={form.phone}
                     onChange={handleChange('phone')}
                     required
                     fullWidth
                     inputProps={{ inputMode: 'tel' }}
                     helperText="Digunakan untuk login"
                  />
                  <TextField label="Email (opsional)" value={form.email} onChange={handleChange('email')} fullWidth type="email" />
               </Stack>
            )}

            {step === 1 && (
               <Stack spacing={3}>
                  <Typography variant="body2" color="text.secondary">
                     Tambahkan alamat pengiriman untuk <strong>{form.name}</strong>
                  </Typography>

                  {addresses.map((addr, idx) => (
                     <Box
                        key={idx}
                        sx={{
                           p: 2,
                           border: '1px solid',
                           borderColor: addr.is_primary ? 'primary.main' : 'divider',
                           borderRadius: 1.5,
                           position: 'relative',
                        }}
                     >
                        {addr.is_primary && (
                           <Chip label="Utama" color="primary" size="small" sx={{ position: 'absolute', top: -12, right: 12 }} />
                        )}
                        <Stack spacing={2}>
                           <TextField
                              label={`Alamat ${idx + 1}`}
                              value={addr.address}
                              onChange={handleAddrChange(idx, 'address')}
                              required fullWidth multiline rows={2}
                           />
                           <TextField
                              label="HP Penerima"
                              value={addr.phone_number}
                              onChange={handleAddrChange(idx, 'phone_number')}
                              required fullWidth
                              inputProps={{ inputMode: 'tel' }}
                           />
                           <TextField
                              label="Catatan (opsional)"
                              value={addr.notes}
                              onChange={handleAddrChange(idx, 'notes')}
                              fullWidth
                              placeholder="Mis: Dekat masjid, pagar biru"
                           />
                           <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <FormControlLabel
                                 control={<Checkbox checked={addr.is_primary} onChange={(e) => handleAddrCheck(idx, e.target.checked)} />}
                                 label="Jadikan alamat utama"
                              />
                              {addresses.length > 1 && (
                                 <Button size="small" color="error" startIcon={<Iconify icon="solar:trash-bin-trash-bold" />} onClick={() => removeAddressRow(idx)}>
                                    Hapus
                                 </Button>
                              )}
                           </Stack>
                        </Stack>
                     </Box>
                  ))}

                  <Button
                     variant="outlined" size="small"
                     startIcon={<Iconify icon="solar:add-square-bold" />}
                     onClick={addAddressRow}
                     sx={{ alignSelf: 'flex-start' }}
                  >
                     + Tambah Alamat Lain
                  </Button>
               </Stack>
            )}
         </DialogContent>

         <Divider />
         <DialogActions>
            {step === 0 ? (
               <>
                  <Button onClick={handleClose} disabled={loading}>Batal</Button>
                  <Button variant="contained" onClick={handleNext} endIcon={<Iconify icon="solar:arrow-right-bold" />}>
                     Selanjutnya
                  </Button>
               </>
            ) : (
               <>
                  <Button onClick={() => setStep(0)} disabled={loading} startIcon={<Iconify icon="solar:arrow-left-bold" />}>
                     Kembali
                  </Button>
                  <LoadingButton loading={loading} variant="contained" onClick={handleSubmit} startIcon={<Iconify icon="solar:check-circle-bold" />}>
                     Simpan Customer
                  </LoadingButton>
               </>
            )}
         </DialogActions>
      </Dialog>
   );
}
