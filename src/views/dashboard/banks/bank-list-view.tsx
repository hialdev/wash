'use client';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
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

import useBankStore, { type IBank } from 'src/stores/bank';

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
   const [form, setForm] = useState({
      bank_name: '',
      account_number: '',
      account_owner: '',
      description: '',
      is_active: true,
   });

   useEffect(() => {
      if (editData) {
         setForm({
            bank_name: editData.bank_name || '',
            account_number: editData.account_number || '',
            account_owner: editData.account_owner || '',
            description: editData.description || '',
            is_active: editData.is_active ?? true,
         });
      } else {
         setForm({
            bank_name: '',
            account_number: '',
            account_owner: '',
            description: '',
            is_active: true,
         });
      }
      setLogoFile(null);
   }, [editData, open]);

   const handleSubmit = async () => {
      setLoading(true);
      try {
         const fd = new FormData();
         fd.append('bank_name', form.bank_name);
         fd.append('account_number', form.account_number);
         fd.append('account_owner', form.account_owner);
         fd.append('description', form.description);
         fd.append('is_active', String(form.is_active));
         if (logoFile) fd.append('logo', logoFile);

         if (editData) {
            await updateBank(editData.id, fd);
         } else {
            await createBank(fd);
         }
         onSaved();
         onClose();
      } catch (err) {
         console.error(err);
      } finally {
         setLoading(false);
      }
   };

   return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
         <DialogTitle>{editData ? 'Edit Bank' : 'Tambah Bank'}</DialogTitle>
         <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
               <TextField
                  label="Nama Bank"
                  value={form.bank_name}
                  onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                  fullWidth
                  required
               />
               <TextField
                  label="Nomor Rekening"
                  value={form.account_number}
                  onChange={(e) => setForm({ ...form, account_number: e.target.value })}
                  fullWidth
                  required
               />
               <TextField
                  label="Nama Pemilik Rekening"
                  value={form.account_owner}
                  onChange={(e) => setForm({ ...form, account_owner: e.target.value })}
                  fullWidth
                  required
               />
               <TextField
                  label="Deskripsi"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  fullWidth
                  multiline
                  rows={2}
               />
               <Box>
                  <Typography variant="caption" color="text.secondary" gutterBottom>
                     Logo Bank
                  </Typography>
                  <input
                     type="file"
                     accept="image/*"
                     id="bank-logo-upload"
                     style={{ display: 'none' }}
                     onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                  />
                  <label htmlFor="bank-logo-upload">
                     <Button variant="outlined" component="span" size="small" sx={{ mt: 0.5 }}>
                        {logoFile ? logoFile.name : 'Pilih Logo'}
                     </Button>
                  </label>
               </Box>
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
            <Button onClick={onClose} disabled={loading}>
               Batal
            </Button>
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
      fetchBanks();
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
      if (!window.confirm('Hapus data bank ini?')) return;
      try {
         await deleteBank(id);
         loadBanks();
      } catch (err) {
         console.error(err);
      }
   };

   return (
      <DashboardContent>
         <CustomBreadcrumbs
            heading="Banks"
            links={[{ name: 'Dashboard', href: paths.dashboard.root }, { name: 'Banks' }]}
            action={
               <Button
                  variant="contained"
                  startIcon={<Iconify icon="solar:add-square-bold-duotone" />}
                  onClick={handleAdd}
               >
                  Tambah Bank
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
                           <TableCell>Logo</TableCell>
                           <TableCell>Nama Bank</TableCell>
                           <TableCell>Nomor Rekening</TableCell>
                           <TableCell>Pemilik</TableCell>
                           <TableCell>Deskripsi</TableCell>
                           <TableCell>Status</TableCell>
                           <TableCell align="right">Aksi</TableCell>
                        </TableRow>
                     </TableHead>
                     <TableBody>
                        {banks.map((bank) => (
                           <TableRow key={bank.id}>
                              <TableCell>
                                 <Avatar
                                    src={
                                       bank.logo ? `${CONFIG.apiHostUrl}/${bank.logo}` : undefined
                                    }
                                    alt={bank.bank_name}
                                    variant="rounded"
                                    sx={{ width: 48, height: 48 }}
                                 >
                                    <Iconify icon="solar:card-bold-duotone" />
                                 </Avatar>
                              </TableCell>
                              <TableCell>
                                 <Typography variant="subtitle2">{bank.bank_name}</Typography>
                              </TableCell>
                              <TableCell>{bank.account_number}</TableCell>
                              <TableCell>{bank.account_owner}</TableCell>
                              <TableCell>
                                 <Typography variant="body2" color="text.secondary">
                                    {bank.description || '-'}
                                 </Typography>
                              </TableCell>
                              <TableCell>
                                 <Typography
                                    variant="caption"
                                    color={bank.is_active ? 'success.main' : 'text.disabled'}
                                 >
                                    {bank.is_active ? 'Aktif' : 'Nonaktif'}
                                 </Typography>
                              </TableCell>
                              <TableCell align="right">
                                 <IconButton onClick={() => handleEdit(bank)} size="small">
                                    <Iconify icon="solar:pen-bold-duotone" />
                                 </IconButton>
                                 <IconButton
                                    onClick={() => handleDelete(bank.id)}
                                    size="small"
                                    color="error"
                                 >
                                    <Iconify icon="solar:trash-bin-trash-bold-duotone" />
                                 </IconButton>
                              </TableCell>
                           </TableRow>
                        ))}
                        {banks.length === 0 && (
                           <TableRow>
                              <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4 }}>
                                 <Typography color="text.secondary">
                                    Belum ada data bank.
                                 </Typography>
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
