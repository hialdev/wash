'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TableRow from '@mui/material/TableRow';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/al/paths';
import { CONFIG } from 'src/global-config';
import { fCurrency } from 'src/utils/format-number';

import useOrderStore from 'src/stores/order';
import useRawMaterialStore from 'src/stores/raw-material';
import useRawMaterialMovementStore from 'src/stores/raw-material-movement';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { DashboardContent } from 'src/layouts/dashboard';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import type { RawMaterial } from 'src/types/raw-material';

// ----------------------------------------------------------------------

interface RowItem {
   rawMaterial: RawMaterial | null;
   qty: number;
   notes: string;
}

const emptyRow = (): RowItem => ({ rawMaterial: null, qty: 1, notes: '' });

// ----------------------------------------------------------------------

export default function UsedRawMaterialView() {
   const params = useParams<{ id: string }>();
   const orderId = params?.id ?? '';
   const router = useRouter();

   const { detail: orderDetail } = useOrderStore();
   const { getAll } = useRawMaterialStore();
   const { submitOrderUsage, getOrderMovements, movements } = useRawMaterialMovementStore();

   const [order, setOrder] = useState<any>(null);
   const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
   const [rows, setRows] = useState<RowItem[]>([emptyRow()]);
   const [fetching, setFetching] = useState(true);
   const [submitting, setSubmitting] = useState(false);

   const fetchData = useCallback(async () => {
      setFetching(true);
      try {
         const [ord, mats] = await Promise.all([orderDetail({ id: orderId }), getAll()]);
         setOrder(ord.data || ord.orders || ord);
         setRawMaterials(mats);
         await getOrderMovements({ orderId });
      } finally {
         setFetching(false);
      }
   }, [orderId]); // eslint-disable-line

   useEffect(() => {
      fetchData();
   }, [fetchData]);

   const addRow = () => setRows((prev) => [...prev, emptyRow()]);
   const removeRow = (i: number) => setRows((prev) => prev.filter((_, idx) => idx !== i));
   const updateRow = (i: number, patch: Partial<RowItem>) =>
      setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

   const remaining = (row: RowItem) =>
      row.rawMaterial ? (row.rawMaterial.current_stock ?? 0) - row.qty : null;

   const handleSubmit = async () => {
      for (let i = 0; i < rows.length; i++) {
         const r = rows[i];
         if (!r.rawMaterial) {
            toast.error(`Baris ${i + 1}: pilih bahan baku`);
            return;
         }
         if (!r.qty || r.qty <= 0) {
            toast.error(`Baris ${i + 1}: qty harus > 0`);
            return;
         }
         const rem = remaining(r);
         if (rem !== null && rem < 0) {
            toast.error(`Stok ${r.rawMaterial.title} tidak mencukupi`);
            return;
         }
      }

      setSubmitting(true);
      try {
         await submitOrderUsage({
            orderId,
            items: rows.map((r) => ({
               raw_material_id: r.rawMaterial!.id!,
               qty: r.qty,
               notes: r.notes || undefined,
            })),
         });
         toast.success('Pemakaian bahan baku berhasil dicatat');
         router.push(paths.dashboard.orders.detail(orderId));
      } catch (err: any) {
         toast.error(err?.response?.data?.message ?? 'Gagal menyimpan data');
      } finally {
         setSubmitting(false);
      }
   };

   const statusColor: Record<string, any> = {
      waiting_payment: 'warning',
      waiting_process: 'info',
      payment_verification: 'info',
      on_progress: 'primary',
      finish: 'success',
      stock_issue: 'error',
      waiting_restock: 'info',
      refund_pending: 'warning',
      refunded: 'error',
      canceled: 'error',
   };

   const statusLabel: Record<string, string> = {
      waiting_payment: 'Waiting Payment',
      waiting_process: 'Waiting Process',
      payment_verification: 'Payment Verification',
      on_progress: 'On Progress',
      finish: 'Finished',
      stock_issue: 'Stock Issue',
      waiting_restock: 'Waiting Restock',
      refund_pending: 'Refund Pending',
      refunded: 'Refunded',
      canceled: 'Canceled',
   };

   if (fetching) {
      return (
         <DashboardContent>
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
               <CircularProgress />
            </Box>
         </DashboardContent>
      );
   }

   return (
      <DashboardContent>
         <CustomBreadcrumbs
            heading="Pemakaian Bahan Baku"
            links={[
               { name: 'Dashboard', href: paths.dashboard.root },
               { name: 'Orders', href: paths.dashboard.orders.root },
               {
                  name: order?.order_number ?? orderId,
                  href: paths.dashboard.orders.detail(orderId),
               },
               { name: 'Bahan Baku' },
            ]}
            sx={{ mb: { xs: 3, md: 5 } }}
         />

         {/* ── Order Summary ── */}
         <Card sx={{ mb: 3 }}>
            <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
               <Typography variant="subtitle1">Informasi Order</Typography>
            </Box>
            <Box sx={{ p: 3 }}>
               <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  spacing={3}
                  divider={
                     <Divider orientation="vertical" flexItem sx={{ borderStyle: 'dashed' }} />
                  }
               >
                  <Stack spacing={1} sx={{ width: 1 }}>
                     <Typography variant="caption" color="text.secondary">
                        Nomor Order
                     </Typography>
                     <Typography variant="subtitle2">{order?.order_number || '-'}</Typography>
                  </Stack>

                  <Stack spacing={1} sx={{ width: 1 }}>
                     <Typography variant="caption" color="text.secondary">
                        Status
                     </Typography>
                     <Chip
                        label={statusLabel[order?.status || 'waiting_payment']}
                        color={statusColor[order?.status || 'waiting_payment']}
                        size="small"
                        variant="soft"
                     />
                  </Stack>

                  <Stack spacing={1} sx={{ width: 1 }}>
                     <Typography variant="caption" color="text.secondary">
                        Customer
                     </Typography>
                     <Stack>
                        <Typography variant="subtitle2">{order?.phone_receiver || '-'}</Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>
                           {order?.address_receiver || '-'}
                        </Typography>
                     </Stack>
                  </Stack>

                  <Stack spacing={1} sx={{ width: 1 }}>
                     <Typography variant="caption" color="text.secondary">
                        Total Tagihan
                     </Typography>
                     <Typography variant="subtitle2" color="primary.main">
                        {fCurrency(order?.total_bill || 0)}
                     </Typography>
                  </Stack>
               </Stack>
            </Box>
         </Card>

         {/* ── Pemakaian Sebelumnya ── */}
         {movements.length > 0 && (
            <Card sx={{ mb: 3 }}>
               <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="subtitle1">Pemakaian Sebelumnya</Typography>
               </Box>
               <Box sx={{ overflowX: 'auto' }}>
                  <Table size="small">
                     <TableHead>
                        <TableRow>
                           <TableCell sx={{ fontWeight: 700 }}>Bahan Baku</TableCell>
                           <TableCell align="center" sx={{ fontWeight: 700, width: 130 }}>
                              Qty Terpakai
                           </TableCell>
                           <TableCell sx={{ fontWeight: 700 }}>Catatan</TableCell>
                        </TableRow>
                     </TableHead>
                     <TableBody>
                        {movements.map((mv) => (
                           <TableRow key={mv.id} hover>
                              <TableCell>
                                 <Typography variant="body2" fontWeight={600}>
                                    {mv.raw_material?.title ?? mv.raw_material_id}
                                 </Typography>
                                 <Typography variant="caption" color="text.secondary">
                                    {mv.raw_material?.unit}
                                 </Typography>
                              </TableCell>
                              <TableCell align="center">
                                 <Chip
                                    label={`-${mv.qty} ${mv.raw_material?.unit ?? ''}`}
                                    color="error"
                                    size="small"
                                    variant="soft"
                                    icon={<Iconify icon="solar:arrow-down-bold" width={14} />}
                                 />
                              </TableCell>
                              <TableCell>
                                 <Typography variant="caption" color="text.secondary">
                                    {mv.notes || '-'}
                                 </Typography>
                              </TableCell>
                           </TableRow>
                        ))}
                     </TableBody>
                  </Table>
               </Box>
            </Card>
         )}

         {/* ── Form Input ── */}
         <Card sx={{ p: 3 }}>
            <Box sx={{ mb: 2 }}>
               <Typography variant="body2" color="text.secondary">
                  Catat bahan baku yang digunakan untuk order{' '}
                  <strong>{order?.order_number ?? orderId}</strong>. Stok akan dikurangi secara
                  otomatis setelah disimpan.
               </Typography>
            </Box>

            <Box sx={{ overflowX: 'auto' }}>
               <Table size="small" sx={{ minWidth: 680 }}>
                  <TableHead>
                     <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Bahan Baku</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700, width: 140 }}>
                           Qty Digunakan
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700, width: 80 }}>
                           Satuan
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700, width: 130 }}>
                           Sisa Stok
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Catatan</TableCell>
                        <TableCell width={48} />
                     </TableRow>
                  </TableHead>
                  <TableBody>
                     {rows.map((row, idx) => {
                        const rem = remaining(row);
                        const isOver = rem !== null && rem < 0;

                        return (
                           <TableRow key={idx}>
                              {/* Bahan Baku autocomplete */}
                              <TableCell sx={{ minWidth: 230 }}>
                                 <Autocomplete
                                    options={rawMaterials}
                                    getOptionLabel={(o) => o.title ?? ''}
                                    value={row.rawMaterial}
                                    onChange={(_, v) => updateRow(idx, { rawMaterial: v })}
                                    isOptionEqualToValue={(o, v) => o.id === v.id}
                                    size="small"
                                    renderOption={(renderProps, opt) => {
                                       const { key, ...rest } = renderProps as any;
                                       return (
                                          <Box
                                             key={key}
                                             component="li"
                                             {...rest}
                                             sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1.5,
                                             }}
                                          >
                                             {opt.image ? (
                                                <Box
                                                   component="img"
                                                   src={
                                                      opt.image.startsWith('http')
                                                         ? opt.image
                                                         : `${CONFIG.apiHostUrl}/${opt.image}`
                                                   }
                                                   alt={opt.title}
                                                   sx={{
                                                      width: 32,
                                                      height: 32,
                                                      borderRadius: 1,
                                                      objectFit: 'cover',
                                                   }}
                                                />
                                             ) : (
                                                <Box
                                                   sx={{
                                                      width: 32,
                                                      height: 32,
                                                      borderRadius: 1,
                                                      bgcolor: 'action.hover',
                                                      display: 'flex',
                                                      alignItems: 'center',
                                                      justifyContent: 'center',
                                                   }}
                                                >
                                                   <Iconify
                                                      icon="solar:test-tube-bold"
                                                      width={16}
                                                   />
                                                </Box>
                                             )}
                                             <Box>
                                                <Typography variant="body2" fontWeight={600}>
                                                   {opt.title}
                                                </Typography>
                                                <Typography
                                                   variant="caption"
                                                   color="text.secondary"
                                                >
                                                   Stok: {opt.current_stock ?? 0} {opt.unit}
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
                                    error={isOver}
                                    inputProps={{ min: 0.001, step: 0.001 }}
                                    sx={{ width: '100%' }}
                                 />
                              </TableCell>

                              {/* Unit */}
                              <TableCell align="center">
                                 <Typography variant="body2" color="text.secondary">
                                    {row.rawMaterial?.unit ?? '—'}
                                 </Typography>
                              </TableCell>

                              {/* Sisa stok */}
                              <TableCell align="center">
                                 {row.rawMaterial ? (
                                    <Chip
                                       label={rem !== null ? rem.toFixed(3) : '—'}
                                       size="small"
                                       color={
                                          isOver
                                             ? 'error'
                                             : rem !== null && rem < 5
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
                              <TableCell sx={{ minWidth: 150 }}>
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
                  {rows.length} bahan baku akan dikurangi dari stok
               </Typography>
            </Stack>

            <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ mt: 3 }}>
               <Button
                  variant="outlined"
                  color="inherit"
                  onClick={() => router.push(paths.dashboard.orders.detail(orderId))}
               >
                  Batal
               </Button>
               <Button
                  variant="contained"
                  disabled={submitting}
                  onClick={handleSubmit}
                  startIcon={
                     submitting ? (
                        <CircularProgress size={16} color="inherit" />
                     ) : (
                        <Iconify icon="solar:diskette-bold" />
                     )
                  }
               >
                  {submitting ? 'Menyimpan...' : 'Simpan Pemakaian'}
               </Button>
            </Stack>
         </Card>
      </DashboardContent>
   );
}
