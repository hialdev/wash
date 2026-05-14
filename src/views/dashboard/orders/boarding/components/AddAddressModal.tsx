'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import DialogTitle from '@mui/material/DialogTitle';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import FormControlLabel from '@mui/material/FormControlLabel';

import { toast } from 'src/components/snackbar';
import useUserStore from 'src/stores/user';

// ----------------------------------------------------------------------

export interface IDeliveryAddressResult {
   id: string;
   user_id: string;
   address: string;
   phone_number: string;
   notes?: string;
   is_primary?: boolean;
}

interface Props {
   open: boolean;
   onClose: () => void;
   customerId: string;
   onSuccess: (address: IDeliveryAddressResult) => void;
}

export function AddAddressModal({ open, onClose, customerId, onSuccess }: Props) {
   const { addDeliveryAddress } = useUserStore();
   const [loading, setLoading] = useState(false);

   const [form, setForm] = useState({
      address: '',
      phone_number: '',
      notes: '',
      is_primary: false,
   });

   const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
   };

   const handleSubmit = async () => {
      if (!form.address.trim()) {
         toast.error('Alamat wajib diisi');
         return;
      }
      if (!form.phone_number.trim()) {
         toast.error('Nomor HP wajib diisi');
         return;
      }

      setLoading(true);
      try {
         const res = await addDeliveryAddress({
            userId: customerId,
            data: {
               address: form.address.trim(),
               phone_number: form.phone_number.trim(),
               notes: form.notes.trim() || undefined,
               is_primary: form.is_primary,
            },
         });

         if (res.success) {
            toast.success('Alamat berhasil ditambahkan');
            onSuccess(res.data);
            setForm({ address: '', phone_number: '', notes: '', is_primary: false });
            onClose();
         } else {
            toast.error(res.message || 'Gagal menyimpan alamat');
         }
      } catch {
         toast.error('Terjadi kesalahan');
      }
      setLoading(false);
   };

   return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
         <DialogTitle>Tambah Alamat Customer</DialogTitle>
         <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
               <TextField
                  label="Alamat Lengkap"
                  value={form.address}
                  onChange={handleChange('address')}
                  required
                  fullWidth
                  multiline
                  rows={3}
               />
               <TextField
                  label="Nomor HP Penerima"
                  value={form.phone_number}
                  onChange={handleChange('phone_number')}
                  required
                  fullWidth
                  inputProps={{ inputMode: 'tel' }}
               />
               <TextField
                  label="Catatan Alamat (opsional)"
                  value={form.notes}
                  onChange={handleChange('notes')}
                  fullWidth
                  placeholder="Mis: Dekat masjid, pagar warna biru"
               />
               <FormControlLabel
                  control={
                     <Checkbox
                        checked={form.is_primary}
                        onChange={(e) =>
                           setForm((prev) => ({ ...prev, is_primary: e.target.checked }))
                        }
                     />
                  }
                  label="Jadikan alamat utama"
               />
            </Box>
         </DialogContent>
         <DialogActions>
            <Button onClick={onClose} disabled={loading}>
               Batal
            </Button>
            <LoadingButton loading={loading} variant="contained" onClick={handleSubmit}>
               Simpan Alamat
            </LoadingButton>
         </DialogActions>
      </Dialog>
   );
}
