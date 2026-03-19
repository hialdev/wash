'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
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
import MenuItem from '@mui/material/MenuItem';

import { paths } from 'src/routes/al/paths';
import { CONFIG } from 'src/global-config';

import useAgentCommissionStore, { AgentCommissionRate } from 'src/stores/agent-commission';
import useAgentStore from 'src/stores/agent';
import useProductStore from 'src/stores/product';
import useServiceStore from 'src/stores/service';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { DashboardContent } from 'src/layouts/dashboard';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import type { Product } from 'src/types/product';
import type { IService } from 'src/types/service';

// ----------------------------------------------------------------------

interface RowItem {
   type: 'product' | 'service';
   issuer_id: string;
   rate_type: 'percentage' | 'fixed';
   rate: number;
   // transient selected object for UX
   selectedOption: Product | IService | null;
}

const emptyRow = (): RowItem => ({ type: 'service', issuer_id: '', rate_type: 'percentage', rate: 0, selectedOption: null });

export function AgentCommissionView() {
   const params = useParams<{ id: string }>();
   const agentId = params?.id ?? '';
   const router = useRouter();

   const { detail: getAgentDetail } = useAgentStore();
   const { getCommissions, bulkUpdateCommissions } = useAgentCommissionStore();
   const { all: getProducts } = useProductStore();
   const { fetchServices: getServices } = useServiceStore();

   const [agent, setAgent] = useState<any>(null);
   const [products, setProducts] = useState<Product[]>([]);
   const [services, setServices] = useState<IService[]>([]);
   
   const [rows, setRows] = useState<RowItem[]>([]);
   const [fetching, setFetching] = useState(true);
   const [submitting, setSubmitting] = useState(false);

   const fetchData = useCallback(async () => {
      setFetching(true);
      try {
         const [agentRes, commRes, pRes, sRes] = await Promise.all([
            getAgentDetail({ id: agentId }),
            getCommissions(agentId),
            getProducts({ page: 1, limit: 1000 }),
            getServices({ page: 1, limit: 1000 })
         ]);

         const fetchedAgent = agentRes?.data || agentRes;
         setAgent(fetchedAgent);

         const prodsOptions = pRes?.data?.products || (Array.isArray(pRes?.data) ? pRes.data : []) || [];
         const svcsOptions = sRes?.data?.services || (Array.isArray(sRes?.data) ? sRes.data : []) || [];
         
         setProducts(prodsOptions);
         setServices(svcsOptions);

         // Map existing commissions to Rows
         const existingComms: AgentCommissionRate[] = commRes?.data || commRes;
         if (existingComms && existingComms.length > 0) {
            const mappedRows = existingComms.map((c) => {
               let selectedOpt = null;
               if (c.type === 'product') selectedOpt = prodsOptions.find((p: any) => p.id === c.issuer_id) || null;
               if (c.type === 'service') selectedOpt = svcsOptions.find((s: any) => s.id === c.issuer_id) || null;

               return {
                  type: c.type,
                  issuer_id: c.issuer_id,
                  rate_type: c.rate_type,
                  rate: c.rate,
                  selectedOption: selectedOpt,
               };
            });
            setRows(mappedRows);
         } else {
            setRows([emptyRow()]);
         }

      } catch (err) {
         console.error(err);
         toast.error('Gagal mengambil data');
      } finally {
         setFetching(false);
      }
   }, [agentId]); // eslint-disable-line

   useEffect(() => {
      fetchData();
   }, [fetchData]);

   const addRow = () => setRows((prev) => [...prev, emptyRow()]);
   const removeRow = (i: number) => setRows((prev) => prev.filter((_, idx) => idx !== i));
   const updateRow = (i: number, patch: Partial<RowItem>) =>
      setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

   const handleSubmit = async () => {
      // Validate
      for (let i = 0; i < rows.length; i++) {
         const r = rows[i];
         if (!r.issuer_id) {
            toast.error(`Baris ${i + 1}: pilih item`);
            return;
         }
         if (r.rate < 0) {
            toast.error(`Baris ${i + 1}: rate tidak valid`);
            return;
         }
      }

      setSubmitting(true);
      try {
         const payload = {
            rates: rows.map(r => ({
               type: r.type,
               issuer_id: r.issuer_id,
               rate_type: r.rate_type,
               rate: r.rate
            }))
         };
         
         await bulkUpdateCommissions(agentId, payload);
         toast.success('Komisi per-item Agent berhasil disimpan');
         router.push(paths.dashboard.agents.root);
      } catch (err: any) {
         toast.error(err?.response?.data?.message ?? 'Gagal menyimpan komisi');
      } finally {
         setSubmitting(false);
      }
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
            heading={`Atur Komisi Khusus - ${agent?.name || agentId}`}
            links={[
               { name: 'Dashboard', href: paths.dashboard.root },
               { name: 'Agents', href: paths.dashboard.agents.root },
               { name: 'Commission Rates' },
            ]}
            sx={{ mb: { xs: 3, md: 5 } }}
         />

         <Card sx={{ p: 3 }}>
            <Box sx={{ mb: 2 }}>
               <Typography variant="body2" color="text.secondary">
                  Konfigurasikan persentase (%) atau nominal (Rp) komisi yang didapat oleh{' '}
                  <strong>{agent?.name}</strong> per-transaksi untuk Servis atau Produk tertentu. Jika tidak ditambahkan di sini, agent akan mendapat komisi default <strong>{agent?.commission_rate}%</strong>.
               </Typography>
            </Box>

            <Box sx={{ overflowX: 'auto' }}>
               <Table size="small" sx={{ minWidth: 680 }}>
                  <TableHead>
                     <TableRow>
                        <TableCell sx={{ fontWeight: 700, width: 150 }}>Tipe Item</TableCell>
                        <TableCell sx={{ fontWeight: 700, minWidth: 250 }}>Nama Item</TableCell>
                        <TableCell sx={{ fontWeight: 700, width: 140 }}>Tipe Komisi</TableCell>
                        <TableCell sx={{ fontWeight: 700, width: 140 }}>Nilai Komisi</TableCell>
                        <TableCell width={48} align="center">Aksi</TableCell>
                     </TableRow>
                  </TableHead>
                  <TableBody>
                     {rows.map((row, idx) => {
                        const options = row.type === 'product' ? products : services;
                        
                        return (
                           <TableRow key={idx}>
                              <TableCell>
                                 <TextField
                                    select
                                    size="small"
                                    value={row.type}
                                    onChange={(e) => updateRow(idx, { type: e.target.value as any, issuer_id: '', selectedOption: null })}
                                    sx={{ width: '100%' }}
                                 >
                                    <MenuItem value="service">Service</MenuItem>
                                    <MenuItem value="product">Product</MenuItem>
                                 </TextField>
                              </TableCell>
                              <TableCell>
                                 <Autocomplete
                                    options={options}
                                    getOptionLabel={(o: any) => o.title || o.name || ''}
                                    value={row.selectedOption as any}
                                    onChange={(_, v: any) => updateRow(idx, { selectedOption: v, issuer_id: v?.id ?? '' })}
                                    isOptionEqualToValue={(o, v) => o.id === v.id}
                                    size="small"
                                    renderOption={(renderProps, opt: any) => {
                                       const { key, ...rest } = renderProps as any;
                                       return (
                                          <Box key={key} component="li" {...rest} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                             {opt.image ? (
                                                <Box
                                                   component="img"
                                                   src={opt.image.startsWith('http') ? opt.image : `${CONFIG.apiHostUrl}/${opt.image}`}
                                                   alt={opt.title}
                                                   sx={{ width: 32, height: 32, borderRadius: 1, objectFit: 'cover' }}
                                                />
                                             ) : (
                                                <Box sx={{ width: 32, height: 32, borderRadius: 1, bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                   <Iconify icon="solar:box-bold" width={16} />
                                                </Box>
                                             )}
                                             <Typography variant="body2">{opt.title || opt.name}</Typography>
                                          </Box>
                                       );
                                    }}
                                    renderInput={(p) => <TextField {...p} placeholder="Pilih Item" />}
                                 />
                              </TableCell>
                              <TableCell>
                                 <TextField
                                    select
                                    size="small"
                                    value={row.rate_type}
                                    onChange={(e) => updateRow(idx, { rate_type: e.target.value as any })}
                                    sx={{ width: '100%' }}
                                 >
                                    <MenuItem value="percentage">% Persentase</MenuItem>
                                    <MenuItem value="fixed">Rp Nominal Fix</MenuItem>
                                 </TextField>
                              </TableCell>
                              <TableCell>
                                 <TextField
                                    type="number"
                                    size="small"
                                    value={row.rate === 0 && row.issuer_id === '' ? '' : row.rate}
                                    onChange={(e) => updateRow(idx, { rate: parseFloat(e.target.value) || 0 })}
                                    inputProps={{ min: 0, step: row.rate_type === 'percentage' ? 0.1 : 500 }}
                                    sx={{ width: '100%' }}
                                 />
                              </TableCell>
                              <TableCell align="center">
                                 <IconButton size="small" color="error" onClick={() => removeRow(idx)}>
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

            <Stack direction="row" justifyContent="flex-start" alignItems="center">
               <Button startIcon={<Iconify icon="mingcute:add-line" />} onClick={addRow} size="small">
                  Tambah Item Komis Khusus
               </Button>
            </Stack>

            <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ mt: 3 }}>
               <Button variant="outlined" color="inherit" onClick={() => router.push(paths.dashboard.agents.root)}>
                  Batal
               </Button>
               <Button
                  variant="contained"
                  disabled={submitting || rows.length === 0}
                  onClick={handleSubmit}
                  startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <Iconify icon="solar:diskette-bold" />}
               >
                  {submitting ? 'Menyimpan...' : 'Simpan Konfigurasi'}
               </Button>
            </Stack>
         </Card>
      </DashboardContent>
   );
}
