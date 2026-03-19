'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

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
import { toast } from 'src/components/snackbar';
import { Form, Field, schemaUtils } from 'src/components/hook-form';
import { fData } from 'src/utils/format-number';
import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { CONFIG } from 'src/global-config';
import { paths } from 'src/routes/al/paths';
import useAgentStore from 'src/stores/agent';
import { type Agent } from 'src/types/agent';

// ----------------------------------------------------------------------

interface AgentDialogProps {
   open: boolean;
   onClose: () => void;
   onSaved: () => void;
   editData?: Agent | null;
}

const AgentSchema = z.object({
   name: z.string().min(1, { message: 'Name is required!' }),
   phone: z.string().optional(),
   email: z.string().optional(),
   address: z.string().optional(),
   commission_rate: z.coerce.number().min(0),
   is_active: z.boolean(),
   image: schemaUtils.file({ error: 'Image is required!' }).optional(),
});
type AgentFormType = z.infer<typeof AgentSchema>;

function AgentDialog({ open, onClose, onSaved, editData }: AgentDialogProps) {
   const { add, update } = useAgentStore();

   const defaultValues: AgentFormType = {
      image: editData?.image ? `${process.env.NEXT_PUBLIC_API_HOST}/${editData.image}` : undefined,
      name: editData?.name || '',
      phone: editData?.phone || '',
      email: editData?.email || '',
      address: editData?.address || '',
      commission_rate: editData?.commission_rate || 0,
      is_active: editData?.is_active ?? true,
   };

   const methods = useForm({
      resolver: zodResolver(AgentSchema),
      defaultValues,
   });

   const { reset, handleSubmit, formState: { isSubmitting } } = methods;

   useEffect(() => {
      reset({
         image: editData?.image ? `${process.env.NEXT_PUBLIC_API_HOST}/${editData.image}` : undefined,
         name: editData?.name || '',
         phone: editData?.phone || '',
         email: editData?.email || '',
         address: editData?.address || '',
         commission_rate: editData?.commission_rate || 0,
         is_active: editData?.is_active ?? true,
      });
   }, [editData, open, reset]);

   const onSubmit = handleSubmit(async (data) => {
      try {
         const fd = new FormData();
         fd.append('name', data.name);
         if (data.phone) fd.append('phone', data.phone);
         if (data.email) fd.append('email', data.email);
         if (data.address) fd.append('address', data.address);
         fd.append('commission_rate', String(data.commission_rate));
         fd.append('is_active', String(data.is_active));
         if (data.image instanceof File) fd.append('image', data.image);

         if (editData) {
            await update({ id: editData.id, data: fd });
         } else {
            await add({ data: fd });
         }
         onSaved();
         onClose();
      } catch (err) {
         console.error(err);
      }
   });

   return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
         <DialogTitle>{editData ? 'Edit Agent' : 'Tambah Agent'}</DialogTitle>
         <Form methods={methods} onSubmit={onSubmit}>
            <DialogContent>
               <Box sx={{ mb: 3 }}>
                  <Field.UploadAvatar
                     name="image"
                     maxSize={3145728}
                     helperText={
                        <Typography
                           variant="caption"
                           sx={{ mt: 3, mx: 'auto', display: 'block', textAlign: 'center', color: 'text.disabled' }}
                        >
                           Allowed *.jpeg, *.jpg, *.png, *.gif
                           <br /> max size of {fData(3145728)}
                        </Typography>
                     }
                  />
               </Box>
               <Stack spacing={2} sx={{ pt: 1 }}>
                  {editData && editData.code && (
                     <TextField label="Code (Read Only)" value={editData.code} fullWidth disabled />
                  )}
                  <Field.Text name="name" label="Name" required />
                  <Field.Text name="phone" label="Phone" />
                  <Field.Text name="email" label="Email" type="email" />
                  <Field.Text name="address" label="Address" multiline rows={2} />
                  <Field.Text name="commission_rate" label="Commission Rate (%)" type="number" required />
                  <Field.Switch name="is_active" label="Active" />
               </Stack>
            </DialogContent>
            <DialogActions>
               <Button onClick={onClose} disabled={isSubmitting}>
                  Cancel
               </Button>
               <Button variant="contained" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Menyimpan...' : 'Simpan'}
               </Button>
            </DialogActions>
         </Form>
      </Dialog>
   );
}

// ----------------------------------------------------------------------

export function AgentView() {
   const router = useRouter();
   const { agents, all, delete: deleteAgent, generateUser } = useAgentStore();
   const [dialogOpen, setDialogOpen] = useState(false);
   const [editData, setEditData] = useState<Agent | null>(null);
   const [loading, setLoading] = useState(true);

   const [confirmGenerateOpen, setConfirmGenerateOpen] = useState(false);
   const [targetAgent, setTargetAgent] = useState<{id: string, name: string} | null>(null);

   const loadAgents = useCallback(async () => {
      setLoading(true);
      await all({ page: 1, limit: 100 });
      setLoading(false);
   }, [all]);

   useEffect(() => {
      loadAgents();
   }, [loadAgents]);

   const handleEdit = (agent: Agent) => {
      setEditData(agent);
      setDialogOpen(true);
   };

   const handleAdd = () => {
      setEditData(null);
      setDialogOpen(true);
   };

   const handleDelete = async (id: string) => {
      if (!window.confirm('Hapus agent ini?')) return;
      try {
         await deleteAgent({ id });
         loadAgents();
      } catch (err) {
         console.error(err);
      }
   };

   const handleGenerateClick = (id: string, name: string) => {
      setTargetAgent({ id, name });
      setConfirmGenerateOpen(true);
   };

   const executeGenerateUser = async () => {
      if (!targetAgent) return;
      try {
         await generateUser({ id: targetAgent.id });
         toast.success("User berhasil digenerate! Agent kini bisa login.");
         setConfirmGenerateOpen(false);
         loadAgents();
      } catch (err: any) {
         toast.error(err?.response?.data?.message || err?.message || "Gagal generate user");
      }
   };

   return (
      <DashboardContent>
         <CustomBreadcrumbs
            heading="Agent Management"
            links={[{ name: 'Dashboard', href: paths.dashboard.root }, { name: 'Agents' }]}
            action={
               <Button
                  variant="contained"
                  startIcon={<Iconify icon="solar:add-square-bold-duotone" />}
                  onClick={handleAdd}
               >
                  Tambah Agent
               </Button>
            }
            sx={{ mb: { xs: 3, md: 5 } }}
         />

         <Card>
            <CardContent>
               {loading ? (
                  <Typography color="text.secondary">Memuat data...</Typography>
               ) : (
                  <Table>
                     <TableHead>
                        <TableRow>
                           <TableCell>Photo</TableCell>
                           <TableCell>Name</TableCell>
                           <TableCell>Code</TableCell>
                           <TableCell>Contact</TableCell>
                           <TableCell>Commission Rate</TableCell>
                           <TableCell>Status</TableCell>
                           <TableCell align="right">Actions</TableCell>
                        </TableRow>
                     </TableHead>
                     <TableBody>
                        {agents.map((row) => (
                           <TableRow key={row.id}>
                              <TableCell>
                                 <Avatar
                                    src={
                                       row.image ? `${CONFIG.apiHostUrl}/${row.image}` : undefined
                                    }
                                    alt={row.name}
                                    variant="rounded"
                                    sx={{ width: 48, height: 48 }}
                                 >
                                    <Iconify icon="solar:user-id-bold-duotone" />
                                 </Avatar>
                              </TableCell>
                              <TableCell>
                                 <Typography variant="subtitle2">{row.name}</Typography>
                              </TableCell>
                              <TableCell>{row.code}</TableCell>
                              <TableCell>
                                 <Typography variant="body2">{row.phone || '-'}</Typography>
                                 <Typography variant="caption" color="text.secondary">
                                    {row.email || '-'}
                                 </Typography>
                              </TableCell>
                              <TableCell>{row.commission_rate}%</TableCell>
                              <TableCell>
                                 <Typography
                                    variant="caption"
                                    color={row.is_active ? 'success.main' : 'text.disabled'}
                                 >
                                    {row.is_active ? 'Active' : 'Inactive'}
                                 </Typography>
                              </TableCell>
                              <TableCell align="right">
                                 <IconButton onClick={() => handleGenerateClick(row.id, row.name)} size="small" color="warning" title="Beri Akses Login / Generate User App">
                                    <Iconify icon="solar:key-square-bold-duotone" />
                                 </IconButton>
                                 <IconButton onClick={() => router.push(paths.dashboard.agents.commission(row.id))} size="small" color="info" title="Commission Rates">
                                    <Iconify icon="solar:wad-of-money-bold-duotone" />
                                 </IconButton>
                                 <IconButton onClick={() => handleEdit(row)} size="small">
                                    <Iconify icon="solar:pen-bold-duotone" />
                                 </IconButton>
                                 <IconButton
                                    onClick={() => handleDelete(row.id)}
                                    size="small"
                                    color="error"
                                 >
                                    <Iconify icon="solar:trash-bin-trash-bold-duotone" />
                                 </IconButton>
                              </TableCell>
                           </TableRow>
                        ))}
                        {agents.length === 0 && (
                           <TableRow>
                              <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4 }}>
                                 <Typography color="text.secondary">
                                    Belum ada data agent.
                                 </Typography>
                              </TableCell>
                           </TableRow>
                        )}
                     </TableBody>
                  </Table>
               )}
            </CardContent>
         </Card>

         <AgentDialog
            open={dialogOpen}
            onClose={() => setDialogOpen(false)}
            onSaved={loadAgents}
            editData={editData}
         />

         {/* Confirm Generate User Modal */}
         <Dialog open={confirmGenerateOpen} onClose={() => setConfirmGenerateOpen(false)} maxWidth="xs" fullWidth>
            <DialogTitle>Generate User Agent</DialogTitle>
            <DialogContent dividers>
               <Typography>
                  Proses ini akan membuat akun login (User) otomatis untuk Agent <strong>{targetAgent?.name}</strong>. Lanjutkan?
               </Typography>
            </DialogContent>
            <DialogActions>
               <Button onClick={() => setConfirmGenerateOpen(false)} color="inherit">Batal</Button>
               <Button onClick={executeGenerateUser} variant="contained" color="warning">Generate Account</Button>
            </DialogActions>
         </Dialog>
      </DashboardContent>
   );
}
