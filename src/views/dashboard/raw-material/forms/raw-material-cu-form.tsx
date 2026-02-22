'use client';

import type { RawMaterial } from 'src/types/raw-material';

import * as z from 'zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import { CONFIG } from 'src/global-config';
import useRawMaterialStore from 'src/stores/raw-material';

import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';

// ----------------------------------------------------------------------

const RawMaterialSchema = z.object({
   title: z.string().min(1, 'Nama wajib diisi'),
   slug: z.string().min(1, 'Slug wajib diisi'),
   unit: z.string().min(1, 'Satuan wajib diisi'),
   image: z.any().optional(), // File | string | undefined
});

type FormValues = z.infer<typeof RawMaterialSchema>;

type Props = {
   open: boolean;
   currentItem: RawMaterial | null;
   onSuccess: () => void;
   onClose: () => void;
};

// ----------------------------------------------------------------------

export function RawMaterialCUForm({ open, currentItem, onSuccess, onClose }: Props) {
   const { add, update } = useRawMaterialStore();
   const isEdit = !!currentItem;

   const defaultValues: FormValues = {
      title: '',
      slug: '',
      unit: '',
      image: undefined,
   };

   const methods = useForm<FormValues>({
      mode: 'onSubmit',
      resolver: zodResolver(RawMaterialSchema),
      defaultValues,
   });

   const {
      handleSubmit,
      reset,
      setValue,
      formState: { isSubmitting },
   } = methods;

   useEffect(() => {
      if (open) {
         if (currentItem) {
            reset({
               title: currentItem.title ?? '',
               slug: currentItem.slug ?? '',
               unit: currentItem.unit ?? '',
               image: currentItem.image
                  ? currentItem.image.startsWith('http')
                     ? currentItem.image
                     : `${CONFIG.apiHostUrl}/${currentItem.image}`
                  : undefined,
            });
         } else {
            reset(defaultValues);
         }
      }
   }, [open, currentItem]); // eslint-disable-line

   const onSubmit = handleSubmit(async (data) => {
      try {
         const formData = new FormData();
         formData.append('title', data.title);
         formData.append('slug', data.slug);
         formData.append('unit', data.unit);

         if (data.image instanceof File) {
            formData.append('image', data.image);
         }

         let result;
         if (isEdit && currentItem?.id) {
            result = await update({ id: currentItem.id, data: formData });
         } else {
            result = await add({ data: formData });
         }

         if (result?.success !== false) {
            toast.success(
               isEdit ? 'Bahan baku berhasil diperbarui' : 'Bahan baku berhasil ditambahkan'
            );
            reset(defaultValues);
            onSuccess();
         } else {
            toast.error(result?.message ?? 'Gagal menyimpan');
         }
      } catch (err: any) {
         toast.error(err?.response?.data?.message ?? 'Gagal menyimpan');
      }
   });

   const handleClose = () => {
      reset(defaultValues);
      onClose();
   };

   // Auto-generate slug from title on add mode
   const handleTitleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      if (!isEdit) {
         const slug = e.target.value
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
         setValue('slug', slug);
      }
   };

   return (
      <Dialog fullWidth maxWidth="md" open={open} onClose={handleClose}>
         <DialogTitle>{isEdit ? 'Edit Bahan Baku' : 'Tambah Bahan Baku'}</DialogTitle>

         <Form methods={methods} onSubmit={onSubmit}>
            <DialogContent dividers sx={{ pt: 3, pb: 3 }}>
               <Grid container spacing={3}>
                  {/* Image upload */}
                  <Grid size={{ xs: 12, md: 4 }}>
                     <Field.Upload
                        name="image"
                        maxSize={5242880}
                        helperText={
                           <Typography
                              variant="caption"
                              sx={{
                                 mt: 1,
                                 display: 'block',
                                 textAlign: 'center',
                                 color: 'text.disabled',
                              }}
                           >
                              *.jpeg, *.jpg, *.png — maks 5MB
                           </Typography>
                        }
                     />
                  </Grid>

                  {/* Fields */}
                  <Grid size={{ xs: 12, md: 8 }}>
                     <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                        <Field.Text
                           name="title"
                           label="Nama Bahan Baku"
                           fullWidth
                           onBlur={handleTitleBlur}
                        />
                        <Field.Text
                           name="slug"
                           label="Slug"
                           fullWidth
                           helperText="Terisi otomatis dari nama, bisa diedit"
                        />
                        <Field.Text
                           name="unit"
                           label="Satuan (kg, liter, pcs, ml, dll)"
                           fullWidth
                        />
                     </Box>
                  </Grid>
               </Grid>
            </DialogContent>

            <DialogActions>
               <Button onClick={handleClose} variant="outlined" color="inherit">
                  Batal
               </Button>
               <Button type="submit" variant="contained" disabled={isSubmitting}>
                  {isEdit ? 'Simpan Perubahan' : 'Tambahkan'}
               </Button>
            </DialogActions>
         </Form>
      </Dialog>
   );
}
