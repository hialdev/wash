import { zodResolver } from '@hookform/resolvers/zod';
import {
   Box,
   Button,
   Typography,
   Card,
   CardHeader,
   CardContent,
   Stack,
   IconButton,
   Dialog,
   DialogTitle,
   DialogContent,
   DialogActions,
   TextField,
   Chip,
} from '@mui/material';
import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Field, Form, schemaUtils } from 'src/components/hook-form';
import { LoadingScreen } from 'src/components/loading-screen';
import { Iconify } from 'src/components/iconify';
import useProfileStore, { ProfileData } from 'src/stores/profile';
import useDeliveryAddressStore, { IDeliveryAddress } from 'src/stores/delivery-address';
import { fData } from 'src/utils/format-number';
import z from 'zod';

// ----------------------------------------------------------------------

export type ProfileType = z.infer<typeof ProfileFormSchema>;
export const ProfileFormSchema = z.object({
   name: z.string().min(1, { message: 'Name is required!' }),
   username: z.string().min(1, { message: 'Username is required!' }),
   image: schemaUtils.file({ error: 'Avatar Image is required!' }).optional(),
});

// ----------------------------------------------------------------------

interface AddressDialogProps {
   open: boolean;
   onClose: () => void;
   onSaved: () => void;
   editData?: IDeliveryAddress | null;
}

export function AddressDialog({ open, onClose, onSaved, editData }: AddressDialogProps) {
   const { createAddress, updateAddress } = useDeliveryAddressStore();
   const [loading, setLoading] = useState(false);
   const [form, setForm] = useState({
      address: '',
      phone_number: '',
      notes: '',
      is_primary: false,
   });

   useEffect(() => {
      if (editData) {
         setForm({
            address: editData.address || '',
            phone_number: editData.phone_number || '',
            notes: editData.notes || '',
            is_primary: editData.is_primary ?? false,
         });
      } else {
         setForm({ address: '', phone_number: '', notes: '', is_primary: false });
      }
   }, [editData, open]);

   const handleSave = async () => {
      setLoading(true);
      try {
         if (editData) {
            await updateAddress(editData.id, form);
         } else {
            await createAddress(form);
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
         <DialogTitle>{editData ? 'Edit Alamat' : 'Tambah Alamat'}</DialogTitle>
         <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
               <TextField
                  label="Alamat Lengkap"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  multiline
                  rows={3}
                  fullWidth
                  required
               />
               <TextField
                  label="Nomor Telepon"
                  value={form.phone_number}
                  onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                  fullWidth
                  required
               />
               <TextField
                  label="Catatan (opsional)"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  fullWidth
               />
            </Stack>
         </DialogContent>
         <DialogActions>
            <Button onClick={onClose} disabled={loading}>
               Batal
            </Button>
            <Button variant="contained" onClick={handleSave} disabled={loading}>
               {loading ? 'Menyimpan...' : 'Simpan'}
            </Button>
         </DialogActions>
      </Dialog>
   );
}

// ----------------------------------------------------------------------

function DeliveryAddressSection() {
   const { addresses, fetchAddresses, deleteAddress, setPrimary } = useDeliveryAddressStore();
   const [dialogOpen, setDialogOpen] = useState(false);
   const [editData, setEditData] = useState<IDeliveryAddress | null>(null);

   const load = useCallback(() => {
      fetchAddresses();
   }, [fetchAddresses]);
   useEffect(() => {
      load();
   }, [load]);

   return (
      <Card sx={{ mt: 3 }}>
         <CardHeader
            title="Alamat Pengiriman"
            action={
               <Button
                  size="small"
                  startIcon={<Iconify icon="solar:add-square-bold-duotone" />}
                  onClick={() => {
                     setEditData(null);
                     setDialogOpen(true);
                  }}
               >
                  Tambah
               </Button>
            }
         />
         <CardContent>
            {addresses.length === 0 ? (
               <Typography color="text.secondary" variant="body2">
                  Belum ada alamat tersimpan.
               </Typography>
            ) : (
               <Stack spacing={1.5}>
                  {addresses.map((addr) => (
                     <Box
                        key={addr.id}
                        sx={{
                           p: 2,
                           borderRadius: 1.5,
                           border: '1px solid',
                           borderColor: addr.is_primary ? 'primary.main' : 'divider',
                           bgcolor: addr.is_primary ? 'primary.lighter' : 'background.paper',
                        }}
                     >
                        <Box
                           sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                           }}
                        >
                           <Box>
                              <Stack
                                 direction="row"
                                 spacing={1}
                                 alignItems="center"
                                 sx={{ mb: 0.5 }}
                              >
                                 {addr.is_primary && (
                                    <Chip label="Utama" size="small" color="primary" />
                                 )}
                                 <Typography variant="subtitle2">{addr.phone_number}</Typography>
                              </Stack>
                              <Typography variant="body2" color="text.secondary">
                                 {addr.address}
                              </Typography>
                              {addr.notes && (
                                 <Typography variant="caption" color="text.secondary">
                                    {addr.notes}
                                 </Typography>
                              )}
                           </Box>
                           <Stack direction="row" spacing={0.5}>
                              {!addr.is_primary && (
                                 <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={async () => {
                                       await setPrimary(addr.id);
                                       load();
                                    }}
                                 >
                                    Jadikan Utama
                                 </Button>
                              )}
                              <IconButton
                                 size="small"
                                 onClick={() => {
                                    setEditData(addr);
                                    setDialogOpen(true);
                                 }}
                              >
                                 <Iconify icon="solar:pen-bold-duotone" fontSize={18} />
                              </IconButton>
                              <IconButton
                                 size="small"
                                 color="error"
                                 onClick={async () => {
                                    if (!window.confirm('Hapus alamat ini?')) return;
                                    await deleteAddress(addr.id);
                                    load();
                                 }}
                              >
                                 <Iconify icon="solar:trash-bin-trash-bold-duotone" fontSize={18} />
                              </IconButton>
                           </Stack>
                        </Box>
                     </Box>
                  ))}
               </Stack>
            )}
         </CardContent>

         <AddressDialog
            open={dialogOpen}
            onClose={() => setDialogOpen(false)}
            onSaved={load}
            editData={editData}
         />
      </Card>
   );
}

// ----------------------------------------------------------------------

export default function ProfileForm({ currentUser }: { currentUser: ProfileData | null }) {
   const { updateBasic } = useProfileStore();

   const defaultValues: ProfileType = {
      image: null,
      name: '',
      username: '',
   };

   const methods = useForm({
      mode: 'onSubmit',
      resolver: zodResolver(ProfileFormSchema),
      defaultValues,
   });

   const {
      reset,
      handleSubmit,
      formState: { isSubmitting },
   } = methods;

   useEffect(() => {
      if (currentUser) {
         reset({
            image: currentUser.image
               ? process.env.NEXT_PUBLIC_API_HOST + '/' + currentUser.image
               : null,
            name: currentUser.name ?? '',
            username: currentUser.username ?? '',
         });
      }
   }, [currentUser, reset]);

   const onSubmit = handleSubmit(async (data) => {
      try {
         const body = {
            username: data.username,
            name: data.name,
            image: data.image ?? undefined,
         };

         const response = await updateBasic({ data: body });

         if (response.success) {
            toast.success('Profile updated successfully!');
         }
      } catch (error) {
         console.error(error);
      }
   });

   const renderForm = () => {
      return (
         <Form methods={methods} onSubmit={onSubmit}>
            <Box sx={{ mb: 2 }}>
               <Field.UploadAvatar
                  name="image"
                  maxSize={3145728}
                  helperText={
                     <Typography
                        variant="caption"
                        sx={{
                           mt: 3,
                           mx: 'auto',
                           display: 'block',
                           textAlign: 'center',
                           color: 'text.disabled',
                        }}
                     >
                        Allowed *.jpeg, *.jpg, *.png, *.gif, *.svg, *.webp
                        <br /> max size of {fData(3145728)}
                     </Typography>
                  }
               />
            </Box>
            <Box
               sx={{
                  rowGap: 2,
                  columnGap: 2,
                  display: 'grid',
               }}
            >
               <Field.Text name="name" label="Full name" />
               <Field.Text name="username" label="Username" />
            </Box>

            <Button type="submit" sx={{ mt: 2 }} variant="contained" loading={isSubmitting}>
               Update Profile
            </Button>
         </Form>
      );
   };

   if (!currentUser) {
      return (
         <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
            <LoadingScreen />
         </Box>
      );
   }

   return (
      <>
         {renderForm()}
         <DeliveryAddressSection />
      </>
   );
}
