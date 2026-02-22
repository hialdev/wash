'use client';

import { z } from 'zod';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';

import useRawMaterialStore from 'src/stores/raw-material';
import { protectedApi } from 'src/lib/al/axios';
import { toast } from 'src/components/snackbar';

import type { RawMaterial } from 'src/types/raw-material';

// ----------------------------------------------------------------------

const schema = z.object({
   purchase_date: z.string().min(1, 'Tanggal wajib diisi'),
   price_purchase: z.number().gt(0, 'Harga harus lebih dari 0'),
   qty: z.number().gt(0, 'Qty harus lebih dari 0'),
   notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

type Props = {
   open: boolean;
   onSuccess: () => void;
   onClose: () => void;
};

export function RawMaterialPurchaseForm({ open, onSuccess, onClose }: Props) {
   const { getAll } = useRawMaterialStore();
   const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
   const [selectedRM, setSelectedRM] = useState<RawMaterial | null>(null);

   const {
      register,
      handleSubmit,
      reset,
      formState: { errors, isSubmitting },
   } = useForm<FormValues>({
      defaultValues: {
         purchase_date: new Date().toISOString().slice(0, 10),
         qty: 0,
         price_purchase: 0,
      },
   });

   useEffect(() => {
      if (open) {
         getAll().then(setRawMaterials);
         reset({
            purchase_date: new Date().toISOString().slice(0, 10),
            qty: 0,
            price_purchase: 0,
            notes: '',
         });
         setSelectedRM(null);
      }
   }, [open]); // eslint-disable-line

   const onSubmit = async (values: FormValues) => {
      if (!selectedRM?.id) {
         toast.error('Pilih bahan baku terlebih dahulu');
         return;
      }
      try {
         await protectedApi.post('/raw-material-purchases', {
            raw_material_id: selectedRM.id,
            purchase_date: values.purchase_date,
            price_purchase: values.price_purchase,
            qty: values.qty,
            notes: values.notes,
         });
         toast.success('Pembelian dicatat, stok bertambah');
         onSuccess();
      } catch (err: any) {
         toast.error(err?.response?.data?.message ?? 'Gagal menyimpan');
      }
   };

   return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
         <DialogTitle>Catat Pembelian Bahan Baku</DialogTitle>
         <form onSubmit={handleSubmit(onSubmit)}>
            <DialogContent>
               <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
                  {/* Raw Material Autocomplete */}
                  <Autocomplete
                     options={rawMaterials}
                     getOptionLabel={(o) => o.title ?? ''}
                     value={selectedRM}
                     onChange={(_, v) => setSelectedRM(v)}
                     isOptionEqualToValue={(o, v) => o.id === v.id}
                     renderOption={(props, o) => (
                        <Box component="li" {...props}>
                           <Box>
                              <Typography variant="body2" fontWeight={600}>
                                 {o.title}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                 Stok: {o.current_stock ?? 0} {o.unit}
                              </Typography>
                           </Box>
                        </Box>
                     )}
                     renderInput={(p) => <TextField {...p} label="Bahan Baku" required />}
                  />

                  <TextField
                     label="Tanggal Pembelian"
                     type="date"
                     fullWidth
                     InputLabelProps={{ shrink: true }}
                     {...register('purchase_date')}
                     error={!!errors.purchase_date}
                     helperText={errors.purchase_date?.message}
                  />

                  <TextField
                     label="Qty"
                     type="number"
                     fullWidth
                     inputProps={{ min: 0.001, step: 0.001 }}
                     InputProps={{
                        endAdornment: selectedRM?.unit ? (
                           <InputAdornment position="end">{selectedRM.unit}</InputAdornment>
                        ) : undefined,
                     }}
                     {...register('qty', { valueAsNumber: true })}
                     error={!!errors.qty}
                     helperText={errors.qty?.message}
                  />

                  <TextField
                     label="Harga Beli (Rp)"
                     type="number"
                     fullWidth
                     inputProps={{ min: 1, step: 1 }}
                     {...register('price_purchase', { valueAsNumber: true })}
                     error={!!errors.price_purchase}
                     helperText={errors.price_purchase?.message}
                  />

                  <TextField
                     label="Catatan (opsional)"
                     fullWidth
                     multiline
                     rows={2}
                     {...register('notes')}
                  />
               </Box>
            </DialogContent>
            <DialogActions>
               <Button onClick={onClose} color="inherit">
                  Batal
               </Button>
               <Button type="submit" variant="contained" disabled={isSubmitting}>
                  Simpan
               </Button>
            </DialogActions>
         </form>
      </Dialog>
   );
}
