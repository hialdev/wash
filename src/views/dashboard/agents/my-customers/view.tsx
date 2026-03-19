'use client';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import LoadingButton from '@mui/lab/LoadingButton';

import { paths } from 'src/routes/al/paths';
import { DashboardContent } from 'src/layouts/dashboard';
import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { toast } from 'src/components/snackbar';
import useMyCustomerStore, { type MyCustomer, type CustomerDeliveryAddress } from 'src/stores/my-customer';
import { PhoneInput } from 'src/components/phone-input';

// -----------------------------------------------------------------------

export function MyCustomersView() {
   const { customers, all: fetchAll, update, addDeliveryAddress, updateDeliveryAddress, deleteDeliveryAddress, setAddressPrimary, getDeliveryAddresses } = useMyCustomerStore();

   const [loading, setLoading] = useState(true);
   const [search, setSearch] = useState('');

   // Edit name modal
   const [editCustomer, setEditCustomer] = useState<MyCustomer | null>(null);
   const [editName, setEditName] = useState('');
   const [saving, setSaving] = useState(false);

   // Manage addresses modal
   const [addrCustomer, setAddrCustomer] = useState<MyCustomer | null>(null);
   const [addresses, setAddresses] = useState<CustomerDeliveryAddress[]>([]);
   const [addrLoading, setAddrLoading] = useState(false);

   // Add / edit address form
   const [addrForm, setAddrForm] = useState<{ address: string; phone_number: string; notes: string; is_primary: boolean } | null>(null);
   const [editAddrId, setEditAddrId] = useState<string | null>(null);
   const [addrSaving, setAddrSaving] = useState(false);

   const load = useCallback(async () => {
      setLoading(true);
      await fetchAll({ search });
      setLoading(false);
   }, [fetchAll, search]);

   useEffect(() => {
      load();
   }, [load]);

   // ------------ edit name handlers
   const openEdit = (c: MyCustomer) => {
      setEditCustomer(c);
      setEditName(c.name || '');
   };
   const handleSaveName = async () => {
      if (!editCustomer) return;
      setSaving(true);
      try {
         const res = await update(editCustomer.id, { name: editName });
         if (res?.success) {
            toast.success('Nama diperbarui');
            setEditCustomer(null);
            load();
         } else {
            toast.error(res?.message || 'Gagal menyimpan');
         }
      } catch (e: any) {
         toast.error(e?.response?.data?.message || 'Gagal menyimpan');
      }
      setSaving(false);
   };

   // ------------ address modal handlers
   const openAddresses = async (c: MyCustomer) => {
      setAddrCustomer(c);
      setAddrLoading(true);
      const res = await getDeliveryAddresses(c.id);
      setAddresses(res?.data || []);
      setAddrLoading(false);
   };

   const openAddrForm = (addr?: CustomerDeliveryAddress) => {
      setEditAddrId(addr?.id || null);
      setAddrForm({
         address: addr?.address || '',
         phone_number: addr?.phone_number || '',
         notes: addr?.notes || '',
         is_primary: addr?.is_primary || false,
      });
   };

   const handleSaveAddress = async () => {
      if (!addrCustomer || !addrForm) return;
      setAddrSaving(true);
      try {
         let res;
         if (editAddrId) {
            res = await updateDeliveryAddress(addrCustomer.id, editAddrId, addrForm);
         } else {
            res = await addDeliveryAddress(addrCustomer.id, addrForm);
         }
         if (res?.success) {
            toast.success('Alamat disimpan');
            setAddrForm(null);
            const refreshed = await getDeliveryAddresses(addrCustomer.id);
            setAddresses(refreshed?.data || []);
         } else {
            toast.error(res?.message || 'Gagal menyimpan');
         }
      } catch (e: any) {
         toast.error(e?.response?.data?.message || 'Gagal menyimpan');
      }
      setAddrSaving(false);
   };

   const handleDeleteAddress = async (addrId: string) => {
      if (!addrCustomer) return;
      if (!globalThis.confirm('Hapus alamat ini?')) return;
      try {
         await deleteDeliveryAddress(addrCustomer.id, addrId);
         const refreshed = await getDeliveryAddresses(addrCustomer.id);
         setAddresses(refreshed?.data || []);
         toast.success('Alamat dihapus');
      } catch (e: any) {
         toast.error(e?.response?.data?.message || 'Gagal menghapus alamat');
      }
   };

   const handleSetPrimary = async (addrId: string) => {
      if (!addrCustomer) return;
      await setAddressPrimary(addrCustomer.id, addrId);
      const refreshed = await getDeliveryAddresses(addrCustomer.id);
      setAddresses(refreshed?.data || []);
   };

   return (
      <DashboardContent>
         <CustomBreadcrumbs
            heading="Pelanggan Saya"
            links={[
               { name: 'Dashboard', href: paths.dashboard.root },
               { name: 'Agents', href: paths.dashboard.agents.root },
               { name: 'Pelanggan Saya' },
            ]}
            sx={{ mb: { xs: 3, md: 5 } }}
         />

         <Card>
            <CardContent>
               <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <TextField
                     size="small"
                     placeholder="Cari nama / telepon / email..."
                     value={search}
                     onChange={(e) => setSearch(e.target.value)}
                     onKeyDown={(e) => { if (e.key === 'Enter') load(); }}
                     InputProps={{ startAdornment: <Iconify icon="solar:magnifer-linear" sx={{ mr: 1, color: 'text.disabled' }} /> }}
                     sx={{ flex: 1, maxWidth: 360 }}
                  />
                  <Button variant="outlined" onClick={load}>Cari</Button>
               </Box>

               {loading ? (
                  <Typography color="text.secondary">Memuat data pelanggan...</Typography>
               ) : (
                  <Table>
                     <TableHead>
                        <TableRow>
                           <TableCell>Nama</TableCell>
                           <TableCell>Telepon</TableCell>
                           <TableCell>Email</TableCell>
                           <TableCell align="right">Aksi</TableCell>
                        </TableRow>
                     </TableHead>
                     <TableBody>
                        {customers.map((c) => (
                           <TableRow key={c.id}>
                              <TableCell>
                                 <Typography variant="subtitle2">{c.name || '-'}</Typography>
                              </TableCell>
                              <TableCell>{c.phone || '-'}</TableCell>
                              <TableCell>{c.email || '-'}</TableCell>
                              <TableCell align="right">
                                 <IconButton size="small" title="Edit Nama" onClick={() => openEdit(c)}>
                                    <Iconify icon="solar:pen-bold-duotone" />
                                 </IconButton>
                                 <IconButton size="small" color="info" title="Kelola Alamat" onClick={() => openAddresses(c)}>
                                    <Iconify icon="solar:map-point-bold-duotone" />
                                 </IconButton>
                              </TableCell>
                           </TableRow>
                        ))}
                        {customers.length === 0 && (
                           <TableRow>
                              <TableCell colSpan={4} sx={{ textAlign: 'center', py: 4 }}>
                                 <Typography color="text.secondary">Belum ada pelanggan. Tambahkan dari halaman Order Agent → Checkout.</Typography>
                              </TableCell>
                           </TableRow>
                        )}
                     </TableBody>
                  </Table>
               )}
            </CardContent>
         </Card>

         {/* Edit Name Modal */}
         <Dialog open={!!editCustomer} onClose={() => setEditCustomer(null)} maxWidth="xs" fullWidth>
            <DialogTitle>Edit Nama Pelanggan</DialogTitle>
            <DialogContent dividers>
               <TextField
                  label="Nama"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  fullWidth
                  autoFocus
               />
            </DialogContent>
            <DialogActions>
               <Button onClick={() => setEditCustomer(null)} color="inherit">Batal</Button>
               <LoadingButton onClick={handleSaveName} variant="contained" loading={saving}>Simpan</LoadingButton>
            </DialogActions>
         </Dialog>

         {/* Manage Addresses Modal */}
         <Dialog open={!!addrCustomer} onClose={() => { setAddrCustomer(null); setAddrForm(null); }} maxWidth="sm" fullWidth>
            <DialogTitle>Alamat — {addrCustomer?.name}</DialogTitle>
            <DialogContent dividers>
               {addrLoading ? (
                  <Typography color="text.secondary" textAlign="center" py={4}>Memuat...</Typography>
               ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                     {addresses.map((addr) => (
                        <Card key={addr.id} sx={{ p: 2, border: '1px solid', borderColor: addr.is_primary ? 'primary.main' : 'divider' }}>
                           <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <Box>
                                 {addr.is_primary && <Chip label="Utama" size="small" color="primary" sx={{ mb: 0.5 }} />}
                                 <Typography variant="body2">{addr.address}</Typography>
                                 <Typography variant="caption" color="text.secondary">📞 {addr.phone_number}</Typography>
                              </Box>
                              <Box>
                                 {!addr.is_primary && (
                                    <IconButton size="small" title="Set Utama" onClick={() => handleSetPrimary(addr.id)}>
                                       <Iconify icon="solar:star-bold-duotone" />
                                    </IconButton>
                                 )}
                                 <IconButton size="small" onClick={() => openAddrForm(addr)}>
                                    <Iconify icon="solar:pen-bold-duotone" />
                                 </IconButton>
                                 <IconButton size="small" color="error" onClick={() => handleDeleteAddress(addr.id)}>
                                    <Iconify icon="solar:trash-bin-trash-bold-duotone" />
                                 </IconButton>
                              </Box>
                           </Box>
                        </Card>
                     ))}
                     {addresses.length === 0 && (
                        <Typography color="text.secondary" textAlign="center" py={2}>Belum ada alamat tersimpan.</Typography>
                     )}
                  </Box>
               )}
            </DialogContent>
            <DialogActions sx={{ justifyContent: 'space-between' }}>
               <Button startIcon={<Iconify icon="solar:add-circle-bold-duotone" />} onClick={() => openAddrForm()}>
                  Tambah Alamat
               </Button>
               <Button onClick={() => { setAddrCustomer(null); setAddrForm(null); }} color="inherit">Tutup</Button>
            </DialogActions>
         </Dialog>

         {/* Add / Edit Address Sub-Modal */}
         <Dialog open={!!addrForm} onClose={() => setAddrForm(null)} maxWidth="xs" fullWidth>
            <DialogTitle>{editAddrId ? 'Edit Alamat' : 'Tambah Alamat'}</DialogTitle>
            <DialogContent dividers>
               <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                  <TextField
                     label="Alamat Lengkap"
                     value={addrForm?.address || ''}
                     onChange={(e) => setAddrForm((p) => p ? { ...p, address: e.target.value } : p)}
                     multiline rows={3} fullWidth required
                  />
                  <PhoneInput
                     label="Nomor Telepon"
                     value={addrForm?.phone_number || ''}
                     onChange={(val: any) => setAddrForm((p) => p ? { ...p, phone_number: val?.phone || '' } : p)}
                     defaultCountry="ID"
                     fullWidth
                     required
                  />
                  <TextField
                     label="Catatan (Opsional)"
                     value={addrForm?.notes || ''}
                     onChange={(e) => setAddrForm((p) => p ? { ...p, notes: e.target.value } : p)}
                     fullWidth
                  />
               </Box>
            </DialogContent>
            <DialogActions>
               <Button onClick={() => setAddrForm(null)} color="inherit">Batal</Button>
               <LoadingButton onClick={handleSaveAddress} variant="contained" loading={addrSaving}>Simpan</LoadingButton>
            </DialogActions>
         </Dialog>
      </DashboardContent>
   );
}
