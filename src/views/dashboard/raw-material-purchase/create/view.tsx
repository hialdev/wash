'use client';

import type { RawMaterial } from 'src/types/raw-material';

import { useState, useEffect } from 'react';
import { useRouter } from 'src/routes/hooks';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
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

import { paths } from 'src/routes/al/paths';
import { fCurrency } from 'src/utils/format-number';
import { protectedApi } from 'src/lib/al/axios';
import useRawMaterialStore from 'src/stores/raw-material';
import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

// ----------------------------------------------------------------------

type PurchaseRow = {
   raw_material: RawMaterial | null;
   qty: number;
   price_per_unit: number;
   notes: string;
};

const emptyRow = (): PurchaseRow => ({
   raw_material: null,
   qty: 0,
   price_per_unit: 0,
   notes: '',
});

// ----------------------------------------------------------------------

export default function RawMaterialPurchaseCreateView() {
   const router = useRouter();
   const { getAll } = useRawMaterialStore();
   const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
   const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
   const [rows, setRows] = useState<PurchaseRow[]>([emptyRow()]);
   const [submitting, setSubmitting] = useState(false);

   useEffect(() => {
      getAll().then(setRawMaterials);
   }, []);

   const addRow = () => setRows((prev) => [...prev, emptyRow()]);

   const removeRow = (idx: number) => setRows((prev) => prev.filter((_, i) => i !== idx));

   const updateRow = (idx: number, patch: Partial<PurchaseRow>) =>
      setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

   const totalAmount = rows.reduce((sum, r) => sum + r.qty * r.price_per_unit, 0);

   const handleSubmit = async () => {
      // Validation
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
         if (!r.price_per_unit || r.price_per_unit <= 0) {
            toast.error(`Baris ${i + 1}: harga per unit harus lebih dari 0`);
            return;
         }
      }

      setSubmitting(true);
      try {
         // Post each row sequentially
         for (const r of rows) {
            await protectedApi.post('/raw-material-purchases', {
               raw_material_id: r.raw_material!.id,
               purchase_date: `${purchaseDate}T00:00:00Z`,
               price_purchase: r.price_per_unit,
               qty: r.qty,
               notes: r.notes || undefined,
            });
         }
         toast.success(`${rows.length} pembelian dicatat — stok bertambah`);
         router.push(paths.dashboard.rawMaterialPurchases.root);
      } catch (err: any) {
         toast.error(err?.response?.data?.message ?? 'Gagal menyimpan pembelian');
      }
      setSubmitting(false);
   };

   return (
      <DashboardContent>
         <CustomBreadcrumbs
            heading="Catat Pembelian Bahan Baku"
            links={[
               { name: 'Dashboard', href: paths.dashboard.root },
               { name: 'Raw Material', href: paths.dashboard.rawMaterials.root },
               { name: 'Pembelian', href: paths.dashboard.rawMaterialPurchases.root },
               { name: 'Baru' },
            ]}
            sx={{ mb: { xs: 3, md: 5 } }}
         />

         <Card sx={{ p: 3 }}>
            {/* Header: purchase date */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
               <TextField
                  label="Tanggal Pembelian"
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ width: { xs: '100%', sm: 240 } }}
               />
            </Stack>

            {/* Journal rows table */}
            <Box sx={{ overflowX: 'auto' }}>
               <Table size="small" sx={{ minWidth: 760 }}>
                  <TableHead>
                     <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Bahan Baku</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700, width: 120 }}>
                           Qty
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700, width: 80 }}>
                           Satuan
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, width: 180 }}>
                           Harga / Unit (Rp)
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, width: 160 }}>
                           Subtotal
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Catatan</TableCell>
                        <TableCell width={48} />
                     </TableRow>
                  </TableHead>
                  <TableBody>
                     {rows.map((row, idx) => {
                        const subtotal = row.qty * row.price_per_unit;
                        return (
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
                                                <Typography
                                                   variant="caption"
                                                   color="text.secondary"
                                                >
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
                                 />
                              </TableCell>

                              {/* Unit (read only) */}
                              <TableCell align="center">
                                 <Typography variant="body2" color="text.secondary">
                                    {row.raw_material?.unit ?? '—'}
                                 </Typography>
                              </TableCell>

                              {/* Harga per unit */}
                              <TableCell>
                                 <TextField
                                    type="number"
                                    size="small"
                                    value={row.price_per_unit || ''}
                                    onChange={(e) =>
                                       updateRow(idx, {
                                          price_per_unit: parseFloat(e.target.value) || 0,
                                       })
                                    }
                                    inputProps={{ min: 1, step: 1 }}
                                    InputProps={{
                                       startAdornment: (
                                          <InputAdornment position="start">
                                             <Typography variant="caption">Rp</Typography>
                                          </InputAdornment>
                                       ),
                                    }}
                                    sx={{ width: '100%' }}
                                 />
                              </TableCell>

                              {/* Subtotal */}
                              <TableCell align="right">
                                 <Typography
                                    variant="body2"
                                    fontWeight={600}
                                    color={subtotal > 0 ? 'text.primary' : 'text.disabled'}
                                 >
                                    {subtotal > 0 ? fCurrency(subtotal) : '—'}
                                 </Typography>
                                 {row.qty > 0 && row.price_per_unit > 0 && (
                                    <Typography
                                       variant="caption"
                                       color="text.secondary"
                                       display="block"
                                    >
                                       {row.qty.toFixed(3)} × {fCurrency(row.price_per_unit)}
                                    </Typography>
                                 )}
                              </TableCell>

                              {/* Notes */}
                              <TableCell sx={{ minWidth: 160 }}>
                                 <TextField
                                    size="small"
                                    placeholder="Catatan"
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
                        );
                     })}
                  </TableBody>
               </Table>
            </Box>

            {/* Add row + total */}
            <Divider sx={{ my: 2 }} />
            <Stack
               direction={{ xs: 'column', sm: 'row' }}
               justifyContent="space-between"
               alignItems="center"
            >
               <Button
                  startIcon={<Iconify icon="mingcute:add-line" />}
                  onClick={addRow}
                  size="small"
               >
                  Tambah Baris
               </Button>

               <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="caption" color="text.secondary">
                     Total Pembelian
                  </Typography>
                  <Typography variant="h5" fontWeight={700}>
                     {fCurrency(totalAmount)}
                  </Typography>
               </Box>
            </Stack>

            {/* Submit */}
            <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ mt: 3 }}>
               <Button
                  variant="outlined"
                  color="inherit"
                  onClick={() => router.push(paths.dashboard.rawMaterialPurchases.root)}
               >
                  Batal
               </Button>
               <Button
                  variant="contained"
                  disabled={submitting}
                  onClick={handleSubmit}
                  startIcon={<Iconify icon="solar:diskette-bold" />}
               >
                  {submitting ? 'Menyimpan...' : 'Simpan Pembelian'}
               </Button>
            </Stack>
         </Card>
      </DashboardContent>
   );
}
