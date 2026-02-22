'use client';

import type { RawMaterial } from 'src/types/raw-material';

import { useState, useEffect } from 'react';
import { useRouter } from 'src/routes/hooks';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Autocomplete from '@mui/material/Autocomplete';
import InputAdornment from '@mui/material/InputAdornment';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import Chip from '@mui/material/Chip';

import { paths } from 'src/routes/al/paths';
import { protectedApi } from 'src/lib/al/axios';
import useRawMaterialStore from 'src/stores/raw-material';
import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

// ----------------------------------------------------------------------

type AdjRow = {
   raw_material: RawMaterial | null;
   qty: number;
   is_increment: boolean; // true = tambah, false = kurangi
   notes: string;
};

const emptyRow = (): AdjRow => ({
   raw_material: null,
   qty: 0,
   is_increment: true,
   notes: '',
});

// ----------------------------------------------------------------------

export default function RawMaterialAdjustmentCreateView() {
   const router = useRouter();
   const { getAll } = useRawMaterialStore();
   const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
   const [rows, setRows] = useState<AdjRow[]>([emptyRow()]);
   const [submitting, setSubmitting] = useState(false);

   useEffect(() => {
      getAll().then(setRawMaterials);
   }, []);

   const addRow = () => setRows((prev) => [...prev, emptyRow()]);

   const removeRow = (idx: number) => setRows((prev) => prev.filter((_, i) => i !== idx));

   const updateRow = (idx: number, patch: Partial<AdjRow>) =>
      setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

   const handleSubmit = async () => {
      for (let i = 0; i < rows.length; i++) {
         const r = rows[i];
         if (!r.raw_material) {
            toast.error(`Baris ${i + 1}: pilih bahan baku`);
            return;
         }
         if (!r.qty || r.qty <= 0) {
            toast.error(`Baris ${i + 1}: qty harus lebih dari 0`);
            return;
         }
      }

      setSubmitting(true);
      try {
         await protectedApi.post('/raw-material-movements/adjustment', {
            items: rows.map((r) => ({
               raw_material_id: r.raw_material!.id,
               qty: r.qty,
               is_increment: r.is_increment,
               notes: r.notes || undefined,
            })),
         });
         toast.success(`${rows.length} adjustment dicatat — stok diperbarui`);
         router.push(paths.dashboard.rawMaterialMovements.root);
      } catch (err: any) {
         toast.error(err?.response?.data?.message ?? 'Gagal menyimpan adjustment');
      }
      setSubmitting(false);
   };

   return (
      <DashboardContent>
         <CustomBreadcrumbs
            heading="Adjustment Stok Bahan Baku"
            links={[
               { name: 'Dashboard', href: paths.dashboard.root },
               { name: 'Raw Material', href: paths.dashboard.rawMaterials.root },
               { name: 'Movements', href: paths.dashboard.rawMaterialMovements.root },
               { name: 'Adjustment' },
            ]}
            sx={{ mb: { xs: 3, md: 5 } }}
         />

         <Card sx={{ p: 3 }}>
            <Box sx={{ mb: 2 }}>
               <Typography variant="body2" color="text.secondary">
                  Gunakan halaman ini untuk menyesuaikan stok bahan baku secara manual. Pilih{' '}
                  <strong>Tambah</strong> untuk menambah stok atau <strong>Kurangi</strong> untuk
                  mengurangi stok.
               </Typography>
            </Box>

            <Box sx={{ overflowX: 'auto' }}>
               <Table size="small" sx={{ minWidth: 700 }}>
                  <TableHead>
                     <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Bahan Baku</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700, width: 130 }}>
                           Jenis
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700, width: 130 }}>
                           Qty
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700, width: 80 }}>
                           Satuan
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700, width: 120 }}>
                           Stok Sekarang
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Catatan</TableCell>
                        <TableCell width={48} />
                     </TableRow>
                  </TableHead>
                  <TableBody>
                     {rows.map((row, idx) => (
                        <TableRow key={idx}>
                           {/* Bahan Baku */}
                           <TableCell sx={{ minWidth: 220 }}>
                              <Autocomplete
                                 options={rawMaterials}
                                 getOptionLabel={(o) => o.title ?? ''}
                                 value={row.raw_material}
                                 onChange={(_, v) => updateRow(idx, { raw_material: v })}
                                 isOptionEqualToValue={(o, v) => o.id === v.id}
                                 size="small"
                                 renderOption={(renderProps, o) => {
                                    const { key, ...rest } = renderProps as any;
                                    return (
                                       <Box component="li" key={key} {...rest}>
                                          <Box>
                                             <Typography variant="body2" fontWeight={600}>
                                                {o.title}
                                             </Typography>
                                             <Typography variant="caption" color="text.secondary">
                                                Stok: {o.current_stock ?? 0} {o.unit}
                                             </Typography>
                                          </Box>
                                       </Box>
                                    );
                                 }}
                                 renderInput={(p) => (
                                    <TextField {...p} placeholder="Pilih bahan baku" />
                                 )}
                              />
                           </TableCell>

                           {/* Jenis: Tambah / Kurangi */}
                           <TableCell>
                              <TextField
                                 select
                                 size="small"
                                 value={row.is_increment ? 'true' : 'false'}
                                 onChange={(e) =>
                                    updateRow(idx, { is_increment: e.target.value === 'true' })
                                 }
                                 sx={{ width: '100%' }}
                              >
                                 <MenuItem value="true">
                                    <Stack direction="row" alignItems="center" spacing={0.5}>
                                       <Iconify
                                          icon="solar:arrow-up-bold"
                                          width={16}
                                          sx={{ color: 'success.main' }}
                                       />
                                       <span>Tambah</span>
                                    </Stack>
                                 </MenuItem>
                                 <MenuItem value="false">
                                    <Stack direction="row" alignItems="center" spacing={0.5}>
                                       <Iconify
                                          icon="solar:arrow-down-bold"
                                          width={16}
                                          sx={{ color: 'error.main' }}
                                       />
                                       <span>Kurangi</span>
                                    </Stack>
                                 </MenuItem>
                              </TextField>
                           </TableCell>

                           {/* Qty */}
                           <TableCell>
                              <TextField
                                 type="number"
                                 size="small"
                                 value={row.qty || ''}
                                 onChange={(e) =>
                                    updateRow(idx, { qty: parseFloat(e.target.value) || 0 })
                                 }
                                 inputProps={{ min: 0.001, step: 0.001 }}
                                 sx={{ width: '100%' }}
                                 InputProps={{
                                    startAdornment: (
                                       <InputAdornment position="start">
                                          <Iconify
                                             icon={
                                                row.is_increment
                                                   ? 'solar:arrow-up-bold'
                                                   : 'solar:arrow-down-bold'
                                             }
                                             sx={{
                                                color: row.is_increment
                                                   ? 'success.main'
                                                   : 'error.main',
                                             }}
                                             width={14}
                                          />
                                       </InputAdornment>
                                    ),
                                 }}
                              />
                           </TableCell>

                           {/* Unit */}
                           <TableCell align="center">
                              <Typography variant="body2" color="text.secondary">
                                 {row.raw_material?.unit ?? '—'}
                              </Typography>
                           </TableCell>

                           {/* Stok sekarang */}
                           <TableCell align="center">
                              {row.raw_material ? (
                                 <Chip
                                    label={`${row.raw_material.current_stock?.toFixed(3) ?? '0.000'}`}
                                    size="small"
                                    color={
                                       (row.raw_material.current_stock ?? 0) <= 0
                                          ? 'error'
                                          : (row.raw_material.current_stock ?? 0) < 5
                                            ? 'warning'
                                            : 'success'
                                    }
                                    variant="outlined"
                                 />
                              ) : (
                                 <Typography variant="caption" color="text.disabled">
                                    —
                                 </Typography>
                              )}
                           </TableCell>

                           {/* Notes */}
                           <TableCell sx={{ minWidth: 160 }}>
                              <TextField
                                 size="small"
                                 placeholder="Alasan / catatan"
                                 value={row.notes}
                                 onChange={(e) => updateRow(idx, { notes: e.target.value })}
                                 sx={{ width: '100%' }}
                              />
                           </TableCell>

                           {/* Remove */}
                           <TableCell>
                              <IconButton
                                 size="small"
                                 color="error"
                                 onClick={() => removeRow(idx)}
                                 disabled={rows.length === 1}
                              >
                                 <Iconify icon="solar:trash-bin-trash-bold" />
                              </IconButton>
                           </TableCell>
                        </TableRow>
                     ))}
                  </TableBody>
               </Table>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Stack direction="row" justifyContent="space-between" alignItems="center">
               <Button
                  startIcon={<Iconify icon="mingcute:add-line" />}
                  onClick={addRow}
                  size="small"
               >
                  Tambah Baris
               </Button>
               <Typography variant="caption" color="text.secondary">
                  {rows.length} item adjustment
               </Typography>
            </Stack>

            <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ mt: 3 }}>
               <Button
                  variant="outlined"
                  color="inherit"
                  onClick={() => router.push(paths.dashboard.rawMaterialMovements.root)}
               >
                  Batal
               </Button>
               <Button
                  variant="contained"
                  disabled={submitting}
                  onClick={handleSubmit}
                  startIcon={<Iconify icon="solar:diskette-bold" />}
               >
                  {submitting ? 'Menyimpan...' : 'Simpan Adjustment'}
               </Button>
            </Stack>
         </Card>
      </DashboardContent>
   );
}
