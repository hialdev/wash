'use client';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import IconButton from '@mui/material/IconButton';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Avatar from '@mui/material/Avatar';

import { DashboardContent } from 'src/layouts/dashboard';
import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { CONFIG } from 'src/global-config';
import { paths } from 'src/routes/al/paths';
import { toast } from 'src/components/snackbar';

import useBankStore, { type IBank } from 'src/stores/bank';

// ----------------------------------------------------------------------

function imgUrl(path?: string | null) {
   if (!path) return '';
   if (path.startsWith('http')) return path;
   return `${CONFIG.apiHostUrl}/${path}`;
}

// ----------------------------------------------------------------------

interface BankDialogProps {
   open: boolean;
   onClose: () => void;
   onSaved: () => void;
   editData?: IBank | null;
}

function BankDialog({ open, onClose, onSaved, editData }: BankDialogProps) {
   const { createBank, updateBank } = useBankStore();
   const [loading, setLoading] = useState(false);
   const [logoFile, setLogoFile] = useState<File | null>(null);
   const [qrisFile, setQrisFile] = useState<File | null>(null);
   const [logoPreview, setLogoPreview] = useState('');
   const [qrisPreview, setQrisPreview] = useState('');

   const [form, setForm] = useState({
      bank_name: '',
      account_number: '',
      account_owner: '',
      description: '',
      is_active: true,
      is_qris: false,
   });

   useEffect(() => {
      if (editData) {
         setForm({
            bank_name: editData.bank_name || '',
            account_number: editData.account_number || '',
            account_owner: editData.account_owner || '',
            description: editData.description || '',
            is_active: editData.is_active ?? true,
            is_qris: editData.is_qris ?? false,
         });
         setLogoPreview(editData.logo ? imgUrl(editData.logo) : '');
         setQrisPreview(editData.qris_image ? imgUrl(editData.qris_image) : '');
      } else {
         setForm({
            bank_name: '',
            account_number: '',
            account_owner: '',
            description: '',
            is_active: true,
            is_qris: false,
         });
         setLogoPreview('');
         setQrisPreview('');
      }
      setLogoFile(null);
      setQrisFile(null);
   }, [editData, open]);

   const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0] || null;
      setLogoFile(f);
      setLogoPreview(f ? URL.createObjectURL(f) : logoPreview);
   };

   const handleQrisChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0] || null;
      setQrisFile(f);
      setQrisPreview(f ? URL.createObjectURL(f) : qrisPreview);
   };

   const handleSubmit = async () => {
      // Basic validation
      if (!form.is_qris && (!form.bank_name || !form.account_number)) {
         toast.error('Nama Bank dan Nomor Rekening wajib diisi');
         return;
      }
      if (form.is_qris && !form.bank_name) {
         toast.error('Nama/Label QRIS wajib diisi');
         return;
      }

      setLoading(true);
      try {
         const fd = new FormData();
         fd.append('bank_name', form.bank_name);
         fd.append('account_number', form.account_number);
         fd.append('account_owner', form.account_owner);
         fd.append('description', form.description);
         fd.append('is_active', String(form.is_active));
         fd.append('is_qris', String(form.is_qris));
         if (logoFile) fd.append('logo', logoFile);
         if (qrisFile) fd.append('qris_image', qrisFile);

         if (editData) {
            await updateBank(editData.id, fd);
            toast.success('Data bank berhasil diupdate');
         } else {
            await createBank(fd);
            toast.success('Data bank berhasil ditambahkan');
         }
         onSaved();
         onClose();
      } catch (err) {
         console.error(err);
         toast.error('Terjadi kesalahan');
      } finally {
         setLoading(false);
      }
   };

   const isQris = form.is_qris;

   return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
         <DialogTitle>{editData ? 'Edit Bank / QRIS' : 'Tambah Bank / QRIS'}</DialogTitle>
         <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
               {/* Mode toggle */}
               <FormControlLabel
                  control={
                     <Switch
                        checked={form.is_qris}
                        onChange={(e) => setForm({ ...form, is_qris: e.target.checked })}
                        color="secondary"
                     />
                  }
                  label={
                     <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography variant="body2">Mode QRIS</Typography>
                        {form.is_qris && (
                           <Chip label="QRIS" size="small" color="secondary" variant="soft" />
                        )}
                     </Stack>
                  }
               />

               <Divider />

               {/* Common fields */}
               <TextField
                  label={isQris ? 'Nama / Label QRIS' : 'Nama Bank'}
                  value={form.bank_name}
                  onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                  fullWidth
                  required
                  placeholder={isQris ? 'Contoh: QRIS BRI, QRIS Toko' : 'Contoh: BCA, Mandiri'}
               />

               {/* Account fields — only for non-QRIS */}
               {!isQris && (
                  <>
                     <TextField
                        label="Nomor Rekening"
                        value={form.account_number}
                        onChange={(e) => setForm({ ...form, account_number: e.target.value })}
                        fullWidth
                        required
                        inputProps={{ inputMode: 'numeric' }}
                     />
                     <TextField
                        label="Nama Pemilik Rekening"
                        value={form.account_owner}
                        onChange={(e) => setForm({ ...form, account_owner: e.target.value })}
                        fullWidth
                        required
                     />
                  </>
               )}

               {/* Account owner for QRIS (optional) */}
               {isQris && (
                  <TextField
                     label="Nama Pemilik (opsional)"
                     value={form.account_owner}
                     onChange={(e) => setForm({ ...form, account_owner: e.target.value })}
                     fullWidth
                     placeholder="a/n yang ditampilkan di bawah QR"
                  />
               )}

               <TextField
                  label="Deskripsi (opsional)"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  fullWidth
                  multiline
                  rows={2}
               />

               {/* Logo upload */}
               <Box>
                  <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                     {isQris ? 'Logo (opsional)' : 'Logo Bank'}
                  </Typography>
                  <Stack direction="row" alignItems="center" spacing={2}>
                     {logoPreview && (
                        <Avatar src={logoPreview} variant="rounded" sx={{ width: 48, height: 48 }}>
                           <Iconify icon="solar:card-bold-duotone" />
                        </Avatar>
                     )}
                     <Button
                        component="label"
                        variant="outlined"
                        size="small"
                        startIcon={<Iconify icon="solar:upload-bold" />}
                     >
                        {logoFile ? logoFile.name : (logoPreview ? 'Ganti Logo' : 'Pilih Logo')}
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoChange} />
                     </Button>
                  </Stack>
               </Box>

               {/* QRIS Image upload — only when is_qris */}
               {isQris && (
                  <Box>
                     <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                        Gambar QRIS <Typography component="span" variant="caption" color="error">*</Typography>
                     </Typography>
                     <Stack direction="row" alignItems="flex-start" spacing={2}>
                        {qrisPreview && (
                           <Box
                              component="img"
                              src={qrisPreview}
                              alt="QRIS preview"
                              sx={{ width: 120, height: 120, objectFit: 'contain', border: 1, borderColor: 'divider', borderRadius: 1 }}
                           />
                        )}
                        <Button
                           component="label"
                           variant="outlined"
                           size="small"
                           color="secondary"
                           startIcon={<Iconify icon="solar:qr-code-bold-duotone" />}
                        >
                           {qrisFile ? qrisFile.name : (qrisPreview ? 'Ganti Gambar QRIS' : 'Upload Gambar QRIS')}
                           <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleQrisChange} />
                        </Button>
                     </Stack>
                  </Box>
               )}

               <FormControlLabel
                  control={
                     <Switch
                        checked={form.is_active}
                        onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                     />
                  }
                  label="Aktif"
               />
            </Stack>
         </DialogContent>
         <DialogActions>
            <Button onClick={onClose} disabled={loading}>Batal</Button>
            <Button variant="contained" onClick={handleSubmit} disabled={loading}>
               {loading ? 'Menyimpan...' : 'Simpan'}
            </Button>
         </DialogActions>
      </Dialog>
   );
}

// ----------------------------------------------------------------------

export default function BankListView() {
   const { banks, isLoading, fetchBanks, deleteBank } = useBankStore();
   const [dialogOpen, setDialogOpen] = useState(false);
   const [editData, setEditData] = useState<IBank | null>(null);

   const loadBanks = useCallback(() => {
      fetchBanks({ limit: 100 });
   }, [fetchBanks]);

   useEffect(() => {
      loadBanks();
   }, [loadBanks]);

   const handleEdit = (bank: IBank) => {
      setEditData(bank);
      setDialogOpen(true);
   };

   const handleAdd = () => {
      setEditData(null);
      setDialogOpen(true);
   };

   const handleDelete = async (id: string) => {
      if (!window.confirm('Hapus data bank / QRIS ini?')) return;
      try {
         await deleteBank(id);
         toast.success('Data berhasil dihapus');
         loadBanks();
      } catch (err) {
         console.error(err);
         toast.error('Gagal menghapus data');
      }
   };

   return (
      <DashboardContent>
         <CustomBreadcrumbs
            heading="Banks & QRIS"
            links={[{ name: 'Dashboard', href: paths.dashboard.root }, { name: 'Banks & QRIS' }]}
            action={
               <Button
                  variant="contained"
                  startIcon={<Iconify icon="solar:add-square-bold-duotone" />}
                  onClick={handleAdd}
               >
                  Tambah Bank / QRIS
               </Button>
            }
            sx={{ mb: { xs: 3, md: 5 } }}
         />

         <Card>
            <CardContent>
               {isLoading ? (
                  <Typography color="text.secondary">Memuat data...</Typography>
               ) : (
                  <Table>
                     <TableHead>
                        <TableRow>
                           <TableCell>Logo / QR</TableCell>
                           <TableCell>Nama / Label</TableCell>
                           <TableCell>Tipe</TableCell>
                           <TableCell>No. Rekening</TableCell>
                           <TableCell>Pemilik</TableCell>
                           <TableCell>Status</TableCell>
                           <TableCell align="right">Aksi</TableCell>
                        </TableRow>
                     </TableHead>
                     <TableBody>
                        {banks.map((bank) => (
                           <TableRow key={bank.id} hover>
                              <TableCell>
                                 {bank.is_qris && bank.qris_image ? (
                                    // QRIS: show small QR thumbnail
                                    <Box
                                       component="img"
                                       src={imgUrl(bank.qris_image)}
                                       alt="QRIS"
                                       sx={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 1, border: 1, borderColor: 'divider' }}
                                    />
                                 ) : (
                                    <Avatar
                                       src={bank.logo ? imgUrl(bank.logo) : undefined}
                                       alt={bank.bank_name}
                                       variant="rounded"
                                       sx={{ width: 48, height: 48 }}
                                    >
                                       <Iconify icon="solar:card-bold-duotone" />
                                    </Avatar>
                                 )}
                              </TableCell>
                              <TableCell>
                                 <Typography variant="subtitle2">{bank.bank_name || '-'}</Typography>
                                 {bank.description && (
                                    <Typography variant="caption" color="text.secondary">{bank.description}</Typography>
                                 )}
                              </TableCell>
                              <TableCell>
                                 {bank.is_qris ? (
                                    <Chip label="QRIS" size="small" color="secondary" variant="soft" />
                                 ) : (
                                    <Chip label="Transfer" size="small" color="info" variant="soft" />
                                 )}
                              </TableCell>
                              <TableCell>
                                 {bank.is_qris ? (
                                    <Typography variant="caption" color="text.disabled">—</Typography>
                                 ) : (
                                    <Typography variant="body2" fontFamily="monospace">
                                       {bank.account_number || '-'}
                                    </Typography>
                                 )}
                              </TableCell>
                              <TableCell>
                                 <Typography variant="body2">{bank.account_owner || '-'}</Typography>
                              </TableCell>
                              <TableCell>
                                 <Chip
                                    label={bank.is_active ? 'Aktif' : 'Nonaktif'}
                                    size="small"
                                    color={bank.is_active ? 'success' : 'default'}
                                    variant="soft"
                                 />
                              </TableCell>
                              <TableCell align="right">
                                 <IconButton onClick={() => handleEdit(bank)} size="small" title="Edit">
                                    <Iconify icon="solar:pen-bold-duotone" />
                                 </IconButton>
                                 <IconButton
                                    onClick={() => handleDelete(bank.id)}
                                    size="small"
                                    color="error"
                                    title="Hapus"
                                 >
                                    <Iconify icon="solar:trash-bin-trash-bold-duotone" />
                                 </IconButton>
                              </TableCell>
                           </TableRow>
                        ))}
                        {banks.length === 0 && (
                           <TableRow>
                              <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4 }}>
                                 <Typography color="text.secondary">Belum ada data bank / QRIS.</Typography>
                              </TableCell>
                           </TableRow>
                        )}
                     </TableBody>
                  </Table>
               )}
            </CardContent>
         </Card>

         <BankDialog
            open={dialogOpen}
            onClose={() => setDialogOpen(false)}
            onSaved={loadBanks}
            editData={editData}
         />
      </DashboardContent>
   );
}
