'use client';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';

import { Iconify } from 'src/components/iconify';
import { toast } from 'src/components/snackbar';
import useServiceStore from 'src/stores/service';
import type { IService } from 'src/types/service';

// ----------------------------------------------------------------------

type Props = {
   open: boolean;
   onClose: () => void;
   parentService: IService;
};

const emptyVariant = () => ({
   name: '',
   price: '',
   unit: '',
   estimated_duration: '',
   description: '',
   is_active: 'true',
});

export function ServiceVariantsDialog({ open, onClose, parentService }: Props) {
   const { fetchServices, createService, deleteService } = useServiceStore();

   const [variants, setVariants] = useState<IService[]>([]);
   const [loading, setLoading] = useState(false);
   const [adding, setAdding] = useState(false);
   const [showForm, setShowForm] = useState(false);
   const [form, setForm] = useState(emptyVariant());

   const loadVariants = async () => {
      setLoading(true);
      try {
         const res = await fetchServices({ parent_id: parentService.id, limit: 50, page: 1 });
         setVariants(res?.data?.services || []);
      } catch {
         toast.error('Gagal memuat varian');
      } finally {
         setLoading(false);
      }
   };

   useEffect(() => {
      if (open && parentService.id) {
         loadVariants();
      }
   }, [open, parentService.id]); // eslint-disable-line

   const handleAdd = async () => {
      if (!form.name || !form.price || !form.unit) {
         toast.error('Nama, harga, dan satuan wajib diisi');
         return;
      }
      setAdding(true);
      try {
         const fd = new FormData();
         fd.append('name', form.name);
         fd.append('price', form.price);
         fd.append('unit', form.unit);
         fd.append('parent_id', parentService.id);
         fd.append('is_active', form.is_active);
         if (form.description) fd.append('description', form.description);
         if (form.estimated_duration) fd.append('estimated_duration', form.estimated_duration);
         // inherit category from parent
         if (parentService.service_category_id) {
            fd.append('service_category_id', parentService.service_category_id);
         }

         await createService(fd);
         toast.success('Varian berhasil ditambahkan');
         setForm(emptyVariant());
         setShowForm(false);
         loadVariants();
      } catch (err: any) {
         toast.error(err?.response?.data?.message || 'Gagal menambah varian');
      } finally {
         setAdding(false);
      }
   };

   const handleDelete = async (id: string) => {
      try {
         await deleteService(id);
         toast.success('Varian dihapus');
         loadVariants();
      } catch {
         toast.error('Gagal menghapus varian');
      }
   };

   return (
      <Dialog fullWidth maxWidth="sm" open={open} onClose={onClose}>
         <DialogTitle>
            <Stack direction="row" alignItems="center" spacing={1}>
               <Iconify icon="solar:layers-bold-duotone" />
               <span>Varian Layanan</span>
               <Chip label={parentService.name} size="small" color="primary" />
            </Stack>
         </DialogTitle>

         <DialogContent dividers>
            {/* Existing Variants */}
            {loading ? (
               <Box display="flex" justifyContent="center" py={3}>
                  <CircularProgress size={32} />
               </Box>
            ) : variants.length === 0 && !showForm ? (
               <Box textAlign="center" py={4}>
                  <Iconify icon="solar:layers-bold-duotone" width={48} sx={{ color: 'text.disabled', mb: 1 }} />
                  <Typography color="text.secondary" variant="body2">
                     Belum ada varian. Varian adalah sub-layanan dari <strong>{parentService.name}</strong>.
                  </Typography>
                  <Typography color="text.secondary" variant="caption">
                     Contoh: Regular, Express, Same Day
                  </Typography>
               </Box>
            ) : (
               <Stack spacing={1.5} sx={{ mb: 2 }}>
                  {variants.map((v) => (
                     <Stack
                        key={v.id}
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        sx={{
                           p: 1.5,
                           borderRadius: 1,
                           border: '1px solid',
                           borderColor: 'divider',
                        }}
                     >
                        <Box>
                           <Typography variant="subtitle2" fontWeight={700}>{v.name}</Typography>
                           <Typography variant="caption" color="text.secondary">
                              Rp {v.price.toLocaleString('id-ID')} / {v.unit}
                              {v.estimated_duration ? ` · ${v.estimated_duration} menit` : ''}
                           </Typography>
                        </Box>
                        <Stack direction="row" spacing={1} alignItems="center">
                           <Chip
                              label={v.is_active ? 'Aktif' : 'Nonaktif'}
                              size="small"
                              color={v.is_active ? 'success' : 'default'}
                           />
                           <IconButton size="small" color="error" onClick={() => handleDelete(v.id)}>
                              <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                           </IconButton>
                        </Stack>
                     </Stack>
                  ))}
               </Stack>
            )}

            {/* Add Form */}
            {showForm && (
               <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>
                     Tambah Varian Baru
                  </Typography>
                  <Stack spacing={2}>
                     <TextField
                        label="Nama Varian *"
                        placeholder="cth: Regular, Express, Same Day"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        fullWidth
                        size="small"
                     />
                     <Stack direction="row" spacing={2}>
                        <TextField
                           label="Harga (Rp) *"
                           type="number"
                           value={form.price}
                           onChange={(e) => setForm({ ...form, price: e.target.value })}
                           fullWidth
                           size="small"
                        />
                        <TextField
                           label="Satuan *"
                           placeholder="kg, pcs, item"
                           value={form.unit}
                           onChange={(e) => setForm({ ...form, unit: e.target.value })}
                           fullWidth
                           size="small"
                        />
                     </Stack>
                     <Stack direction="row" spacing={2}>
                        <TextField
                           label="Estimasi (menit)"
                           type="number"
                           value={form.estimated_duration}
                           onChange={(e) => setForm({ ...form, estimated_duration: e.target.value })}
                           fullWidth
                           size="small"
                        />
                        <TextField
                           select
                           label="Status"
                           value={form.is_active}
                           onChange={(e) => setForm({ ...form, is_active: e.target.value })}
                           fullWidth
                           size="small"
                        >
                           <MenuItem value="true">Aktif</MenuItem>
                           <MenuItem value="false">Nonaktif</MenuItem>
                        </TextField>
                     </Stack>
                     <TextField
                        label="Deskripsi"
                        multiline
                        rows={2}
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        fullWidth
                        size="small"
                     />
                     <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button
                           variant="outlined"
                           color="inherit"
                           onClick={() => { setShowForm(false); setForm(emptyVariant()); }}
                        >
                           Batal
                        </Button>
                        <Button
                           variant="contained"
                           onClick={handleAdd}
                           disabled={adding}
                           startIcon={adding ? <CircularProgress size={16} color="inherit" /> : <Iconify icon="solar:diskette-bold" />}
                        >
                           {adding ? 'Menyimpan...' : 'Simpan Varian'}
                        </Button>
                     </Stack>
                  </Stack>
               </>
            )}
         </DialogContent>

         <DialogActions sx={{ justifyContent: 'space-between' }}>
            <Button
               startIcon={<Iconify icon="mingcute:add-line" />}
               onClick={() => setShowForm(true)}
               disabled={showForm}
            >
               Tambah Varian
            </Button>
            <Button onClick={onClose}>Tutup</Button>
         </DialogActions>
      </Dialog>
   );
}
