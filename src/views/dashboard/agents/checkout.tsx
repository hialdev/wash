'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import * as z from 'zod';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import CardMedia from '@mui/material/CardMedia';
import LoadingButton from '@mui/lab/LoadingButton';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import Chip from '@mui/material/Chip';
import { PhoneInput } from 'src/components/phone-input';

import { paths } from 'src/routes/al/paths';

import useCartStore from 'src/stores/cart';
import useAgentStore from 'src/stores/agent';
import useUserStore, { type UserData } from 'src/stores/user';
import useMyCustomerStore, { type CustomerDeliveryAddress } from 'src/stores/my-customer';
import useAuthStore from 'src/stores/auth';
import { type Agent } from 'src/types/agent';
import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Form, Field } from 'src/components/hook-form';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { fCurrency } from 'src/utils/format-number';

// ----------------------------------------------------------------------

const CheckoutSchema = z.object({
   agent_id: z.string(),
   user_id: z.string().min(1, { message: 'Customer is required!' }),
   address_receiver: z.string().min(1, { message: 'Address is required!' }),
   phone_receiver: z.string().min(1, { message: 'Phone number is required!' }),
   notes: z.string().optional(),
});

type CheckoutFormType = z.infer<typeof CheckoutSchema>;

// ----------------------------------------------------------------------

export function AgentCheckoutView() {
   const router = useRouter();
   // Use the real auth store (Zustand + persist) — it holds the actual user data
   // from our backend (incl. role.name). useAuthContext() points to the Minimal
   // demo server and never returns the correct role.
   const { user } = useAuthStore();
   const isAgentRole = user?.role?.name === 'Agent';

   const { items, serviceItems, getTotalPrice, clearCart, validateAllStock } = useCartStore();
   const { createAgentOrder, all: fetchAgents, myAgent: fetchMyAgent } = useAgentStore();
   const { all: fetchUsers, getDeliveryAddresses } = useUserStore();
   const { customers: myCustomers, all: fetchMyCustomers, add: addMyCustomer, addDeliveryAddress } = useMyCustomerStore();

   const [loading, setLoading] = useState<boolean>(false);
   const [agentList, setAgentList] = useState<Agent[]>([]);
   const [userList, setUserList] = useState<UserData[]>([]);
   const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
   const [deliveryAddresses, setDeliveryAddresses] = useState<CustomerDeliveryAddress[]>([]);
   const [selectedAddressId, setSelectedAddressId] = useState<string>('');

   // Add Customer Modal state
   const [addCustomerOpen, setAddCustomerOpen] = useState(false);
   const [newCustomerName, setNewCustomerName] = useState('');
   const [newCustomerPhone, setNewCustomerPhone] = useState('');
   const [newCustomerEmail, setNewCustomerEmail] = useState('');
   const [addingCustomer, setAddingCustomer] = useState(false);

   // Add Address Modal state
   const [addAddrOpen, setAddAddrOpen] = useState(false);
   const [addrForCustomerId, setAddrForCustomerId] = useState<string>('');
   const [newAddrAddress, setNewAddrAddress] = useState('');
   const [newAddrPhone, setNewAddrPhone] = useState('');
   const [newAddrNotes, setNewAddrNotes] = useState('');
   const [addingAddr, setAddingAddr] = useState(false);

   const totalPrice = getTotalPrice();
   const hasAnyItem = items.length > 0 || serviceItems.length > 0;

   const methods = useForm<CheckoutFormType>({
      resolver: zodResolver(CheckoutSchema),
      defaultValues: {
         agent_id: '',
         user_id: '',
         address_receiver: '',
         phone_receiver: '',
         notes: '',
      },
   });

   const {
      handleSubmit,
      control,
      setValue,
      formState: { isSubmitting },
   } = methods;

   useEffect(() => {
      // useAuthStore user starts as null (persisted), not undefined
      // Wait until user is actually populated before running
      if (!user) return;

      const loadData = async () => {
         try {
            const roleName = (user as any)?.role?.name;
            const isAgent = roleName === 'Agent';

            if (!isAgent) {
               const agentRes = await fetchAgents({ limit: 500 });
               let loadedAgents: Agent[] = [];
               if (agentRes?.data?.agents) loadedAgents = agentRes.data.agents;
               else if (Array.isArray(agentRes?.data)) loadedAgents = agentRes.data;
               setAgentList(loadedAgents);
            }


            if (isAgent && user?.id) {
               const currentAgent = await fetchMyAgent({ id: user?.id });
               if (currentAgent?.data?.id) {
                  setValue('agent_id', currentAgent?.data?.id);
               }
               // Fetch my (agent's) customers instead of all users
               await fetchMyCustomers();
            } else {
               const userRes = await fetchUsers({ limit: 500, sort: 'name', order: 'asc' });
               if (userRes?.data?.users) setUserList(userRes.data.users);
               else if (Array.isArray(userRes?.data)) setUserList(userRes.data);
            }
         } catch(e) {
            console.error("Failed loading reference data", e);
         }
      };
      loadData();
   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [user]);



   // Handler: submit new customer modal
   const handleAddCustomer = async () => {
      if (!newCustomerName || !newCustomerPhone) {
         toast.error('Nama dan nomor telepon wajib diisi');
         return;
      }
      setAddingCustomer(true);
      try {
         const res = await addMyCustomer({ name: newCustomerName, phone: newCustomerPhone, email: newCustomerEmail || undefined });
         if (res?.success && res?.data) {
            toast.success('Pelanggan berhasil ditambahkan!');
            await fetchMyCustomers();
            // Auto-select the new customer
            const newId = res.data.id;
            const newPhone = res.data.phone;
            setValue('user_id', newId);
            if (newPhone) setValue('phone_receiver', newPhone);
            setSelectedCustomerId(newId);
            setDeliveryAddresses([]);
            setSelectedAddressId('');
            setAddCustomerOpen(false);
            setNewCustomerName('');
            setNewCustomerPhone('');
            setNewCustomerEmail('');
            // Prompt to add address for the new customer
            setAddrForCustomerId(newId);
            setAddAddrOpen(true);
         } else {
            toast.error(res?.message || 'Gagal menambahkan pelanggan');
         }
      } catch (err: any) {
         toast.error(err?.response?.data?.message || err?.message || 'Gagal menambahkan pelanggan');
      }
      setAddingCustomer(false);
   };

   // Handler: add address for a customer in checkout
   const handleAddAddress = async () => {
      if (!newAddrAddress || !newAddrPhone) {
         toast.error('Alamat dan nomor telepon wajib diisi');
         return;
      }
      setAddingAddr(true);
      try {
         const res = await addDeliveryAddress(addrForCustomerId, {
            address: newAddrAddress,
            phone_number: newAddrPhone,
            notes: newAddrNotes,
            is_primary: deliveryAddresses.length === 0,
         });
         if (res?.success) {
            toast.success('Alamat berhasil ditambahkan!');
            // Refresh addresses and auto-select new address
            const addrRes = await useMyCustomerStore.getState().getDeliveryAddresses(addrForCustomerId);
            const newAddresses: CustomerDeliveryAddress[] = addrRes?.data || [];
            setDeliveryAddresses(newAddresses);
            // Auto select the primary or last
            const primary = newAddresses.find((a) => a.is_primary) || newAddresses[0];
            if (primary) {
               setSelectedAddressId(primary.id);
               setValue('address_receiver', primary.address || '');
               setValue('phone_receiver', primary.phone_number || '');
            }
            setAddAddrOpen(false);
            setNewAddrAddress('');
            setNewAddrPhone('');
            setNewAddrNotes('');
         } else {
            toast.error(res?.message || 'Gagal menambahkan alamat');
         }
      } catch (err: any) {
         toast.error(err?.response?.data?.message || err?.message || 'Gagal menambahkan alamat');
      }
      setAddingAddr(false);
   };

   // Handler: when a customer is selected in checkout
   const handleCustomerChange = async (newValue: any) => {
      if (newValue) {
         setValue('user_id', newValue.id);
         if (newValue.phone) setValue('phone_receiver', newValue.phone);
         setSelectedCustomerId(newValue.id);
         setDeliveryAddresses([]);
         setSelectedAddressId('');
         setValue('address_receiver', '');

         const fetcher = isAgentRole
            ? (cid: string) => useMyCustomerStore.getState().getDeliveryAddresses(cid)
            : (cid: string) => getDeliveryAddresses({ id: cid });

         try {
            const res = await fetcher(newValue.id);
            const addrs: CustomerDeliveryAddress[] = res?.data || [];
            setDeliveryAddresses(addrs);
            const primary = addrs.find((a) => a.is_primary) || addrs[0];
            if (primary) {
               setSelectedAddressId(primary.id);
               setValue('address_receiver', primary.address || '');
               setValue('phone_receiver', primary.phone_number || '');
            }
         } catch (error) {
            console.error('Failed to fetch delivery addresses', error);
         }
      } else {
         setValue('user_id', '');
         setSelectedCustomerId('');
         setDeliveryAddresses([]);
         setSelectedAddressId('');
      }
   };


   const onSubmit = handleSubmit(async (data) => {
      if (!hasAnyItem) {
         toast.error('Keranjang kosong');
         return;
      }

      setLoading(true);

      try {
         // Validate product stock
         if (items.length > 0) {
            const validations = await validateAllStock();
            const hasInvalidStock = validations.some((v) => !v.isValid);

            if (hasInvalidStock) {
               toast.error('Stock telah berubah, periksa keranjang.');
               setLoading(false);
               return;
            }
         }

         // Create order
         const orderData = {
            agent_id: data.agent_id,
            user_id: data.user_id,
            address_receiver: data.address_receiver,
            phone_receiver: data.phone_receiver,
            notes: data.notes || '',
            // Map product items
            products: items.map((item) => ({
               product_id: item.product.id!,
               qty: item.qty,
               requested_length: item.requested_length,
               measurement_unit: item.measurement_unit,
            })),
            // Map service items
            services: serviceItems.map((item) => ({
               service_id: item.service.id!,
               qty: item.qty,
               notes: item.notes,
            })),
         };

         const response = await createAgentOrder(orderData);

         if (response.success && response.data) {
            toast.success('Agent Order berhasil dibuat');
            clearCart();
            // Redirect to standard payment page using Xendit
            router.push(paths.dashboard.customer_orders.payment(response.data.id));
         } else {
            toast.error(response.message || 'Gagal membuat order agent');
         }
      } catch (error: any) {
         toast.error(error.message || 'Gagal membuat order agent');
      }

      setLoading(false);
   });

   if (!hasAnyItem) {
      return (
         <DashboardContent>
            <CustomBreadcrumbs
               heading="Agent Checkout"
               links={[
                  { name: 'Dashboard', href: paths.dashboard.root },
                  { name: 'Agent Order', href: paths.dashboard.agents.order },
                  { name: 'Checkout' },
               ]}
               sx={{ mb: { xs: 3, md: 5 } }}
            />

            <Card sx={{ p: 8, textAlign: 'center' }}>
               <Iconify
                  icon="solar:cart-large-2-bold-duotone"
                  width={80}
                  sx={{ color: 'text.disabled', mb: 2 }}
               />
               <Typography variant="h6" color="text.secondary" gutterBottom>
                  Keranjang kosong
               </Typography>
               <Button
                  variant="contained"
                  onClick={() => router.push(paths.dashboard.agents.order)}
                  sx={{ mt: 2 }}
               >
                  Kembali ke Agent Order
               </Button>
            </Card>
         </DashboardContent>
      );
   }

   return (
      <DashboardContent>
         <CustomBreadcrumbs
            heading="Agent Checkout"
            links={[
               { name: 'Dashboard', href: paths.dashboard.root },
               { name: 'Agent Order', href: paths.dashboard.agents.order },
               { name: 'Checkout' },
            ]}
            sx={{ mb: { xs: 3, md: 5 } }}
         />

         <Form methods={methods} onSubmit={onSubmit}>
            <Grid container spacing={3}>
               {/* Order Summary */}
               <Grid size={{ xs: 12, md: 8 }}>
                  <Card sx={{ p: 3 }}>
                     <Typography variant="h6" gutterBottom>
                        Order Summary
                     </Typography>

                     {/* PRODUCT SECTION */}
                     {items.length > 0 && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2, mb: 3 }}>
                           <Typography variant="subtitle2" color="text.secondary">
                              Products ({items.length})
                           </Typography>
                           {items.map((item, i) => {
                              const imageUrl = item.product.image
                                 ? `${process.env.NEXT_PUBLIC_API_HOST}/${item.product.image}`
                                 : '/assets/placeholder.svg';

                              const isIndividual = item.product.tracking_mode === 'individual';
                              const subtotal = isIndividual
                                 ? (item.product.sale_price || 0) *
                                   (item.requested_length || 0) *
                                   item.qty
                                 : (item.product.sale_price || 0) * item.qty;

                              return (
                                 <Box
                                    key={`prod-${i}`}
                                    sx={{
                                       display: 'flex',
                                       gap: 2,
                                       p: 2,
                                       border: 1,
                                       borderColor: 'divider',
                                       borderRadius: 1,
                                    }}
                                 >
                                    <CardMedia
                                       component="img"
                                       image={imageUrl}
                                       alt={item.product.title}
                                       sx={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 1 }}
                                    />
                                    <Box sx={{ flexGrow: 1 }}>
                                       <Typography variant="subtitle1">{item.product.title}</Typography>
                                       <Typography variant="body2" color="text.secondary">
                                          {fCurrency(item.product.sale_price || 0)} × {item.qty}
                                       </Typography>
                                    </Box>
                                    <Typography variant="h6" color="primary.main">
                                       {fCurrency(subtotal)}
                                    </Typography>
                                 </Box>
                              );
                           })}
                        </Box>
                     )}

                     {items.length > 0 && serviceItems.length > 0 && <Divider sx={{ my: 3 }} />}

                     {/* SERVICE SECTION */}
                     {serviceItems.length > 0 && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                           <Typography variant="subtitle2" color="text.secondary">
                              Services ({serviceItems.length})
                           </Typography>
                           {serviceItems.map((item, i) => {
                              const subtotal = (item.service.price || 0) * item.qty;

                              return (
                                 <Box
                                    key={`serv-${i}`}
                                    sx={{
                                       display: 'flex',
                                       gap: 2,
                                       p: 2,
                                       border: 1,
                                       borderColor: 'divider',
                                       borderRadius: 1,
                                    }}
                                 >
                                    <Box
                                       sx={{
                                          width: 80,
                                          height: 80,
                                          borderRadius: 1,
                                          bgcolor: 'background.neutral',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                       }}
                                    >
                                       <Iconify icon="solar:washing-machine-bold-duotone" width={40} />
                                    </Box>
                                    <Box sx={{ flexGrow: 1 }}>
                                       <Typography variant="subtitle1">{item.service.name}</Typography>
                                       <Typography variant="body2" color="text.secondary">
                                          {fCurrency(item.service.price || 0)} × {item.qty} {item.service.unit}
                                       </Typography>
                                    </Box>
                                    <Typography variant="h6" color="secondary.main">
                                       {fCurrency(subtotal)}
                                    </Typography>
                                 </Box>
                              );
                           })}
                        </Box>
                     )}
                  </Card>
               </Grid>

               {/* Delivery Information */}
               <Grid size={{ xs: 12, md: 4 }}>
                  <Card sx={{ p: 3, position: 'sticky', top: 24 }}>
                     <Typography variant="h6" gutterBottom>
                        Customer & Agent Info
                     </Typography>

                     <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                        
                        {/* Agent Selector — hidden for agent role */}
                        {!isAgentRole && (
                           <Controller
                              name="agent_id"
                              control={control}
                              render={({ field, fieldState: { error } }) => (
                                 <Autocomplete
                                    options={agentList}
                                    value={agentList.find((a) => a.id === field.value) || null}
                                    getOptionLabel={(option) => `${option.name} (${option.code})`}
                                    onChange={(_, newValue) => field.onChange(newValue?.id || '')}
                                    renderInput={(params) => (
                                       <TextField
                                          {...params}
                                          label="Pilih Agent"
                                          error={!!error}
                                          helperText={error?.message}
                                          required
                                       />
                                    )}
                                 />
                              )}
                           />
                        )}

                        {/* Customer Selector */}
                        <Box>
                           <Controller
                              name="user_id"
                              control={control}
                              render={({ field, fieldState: { error } }) => {
                                 const options: any[] = isAgentRole ? myCustomers : userList;
                                 const selected = options.find((o) => o.id === field.value) || null;

                                 return (
                                    <Autocomplete
                                       options={options}
                                       value={selected}
                                       getOptionLabel={(option: any) => `${option.name || option.username} — ${option.phone || option.email || ''}`}
                                       onChange={(_, newValue: any) => handleCustomerChange(newValue)}
                                       renderInput={(params) => (
                                          <TextField
                                             {...params}
                                             label="Pilih Pelanggan"
                                             error={!!error}
                                             helperText={error?.message}
                                             required
                                          />
                                       )}
                                    />
                                 );
                              }}
                           />
                           {isAgentRole && (
                              <Button
                                 fullWidth
                                 size="small"
                                 variant="outlined"
                                 color="primary"
                                 startIcon={<Iconify icon="solar:add-circle-bold-duotone" />}
                                 onClick={() => setAddCustomerOpen(true)}
                                 sx={{ mt: 1 }}
                              >
                                 Tambah Pelanggan Baru
                              </Button>
                           )}
                        </Box>
                        {/* Delivery Addresses Section */}
                         {selectedCustomerId && (
                            <Box>
                               <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                  <Typography variant="overline" color="text.secondary">Alamat Pengiriman</Typography>
                                  {isAgentRole && (
                                     <Button
                                        size="small"
                                        startIcon={<Iconify icon="solar:add-circle-bold-duotone" />}
                                        onClick={() => { setAddrForCustomerId(selectedCustomerId); setAddAddrOpen(true); }}
                                     >
                                        Tambah Alamat
                                     </Button>
                                  )}
                               </Box>

                               {deliveryAddresses.length === 0 ? (
                                  <Box sx={{ textAlign: 'center', py: 2, border: '1px dashed', borderColor: 'divider', borderRadius: 1 }}>
                                     <Typography variant="body2" color="text.secondary" gutterBottom>
                                        Belum ada alamat tersimpan.
                                     </Typography>
                                     {isAgentRole && (
                                        <Button
                                           size="small"
                                           variant="contained"
                                           startIcon={<Iconify icon="solar:add-circle-bold-duotone" />}
                                           onClick={() => { setAddrForCustomerId(selectedCustomerId); setAddAddrOpen(true); }}
                                        >
                                           Tambah Alamat Sekarang
                                        </Button>
                                     )}
                                  </Box>
                               ) : (
                                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                     {deliveryAddresses.map((addr) => {
                                        const isSelected = addr.id === selectedAddressId;
                                        return (
                                           <Box
                                              key={addr.id}
                                              onClick={() => {
                                                 setSelectedAddressId(addr.id);
                                                 setValue('address_receiver', addr.address || '');
                                                 setValue('phone_receiver', addr.phone_number || '');
                                              }}
                                              sx={{
                                                 p: 1.5,
                                                 border: '2px solid',
                                                 borderColor: isSelected ? 'primary.main' : 'divider',
                                                 borderRadius: 1,
                                                 cursor: 'pointer',
                                                 bgcolor: isSelected ? 'primary.lighter' : 'transparent',
                                                 transition: 'all 0.15s',
                                                 '&:hover': { borderColor: 'primary.light' },
                                              }}
                                           >
                                              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 0.5 }}>
                                                 {addr.is_primary && <Chip label="Utama" size="small" color="primary" />}
                                                 {isSelected && <Chip label="Dipilih" size="small" color="success" />}
                                              </Box>
                                              <Typography variant="body2">{addr.address}</Typography>
                                              <Typography variant="caption" color="text.secondary">📞 {addr.phone_number}</Typography>
                                           </Box>
                                        );
                                     })}
                                  </Box>
                               )}
                            </Box>
                         )}

                         <Field.Text
                            name="address_receiver"
                            label="Alamat Pengiriman"
                            multiline
                            rows={3}
                            required
                         />

                        <Field.Text name="phone_receiver" label="Nomor Telepon (Pelanggan)" required />
                        <Field.Text name="notes" label="Catatan (Opsional)" multiline rows={2} />
                     </Box>

                     <Divider sx={{ my: 3 }} />

                     <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
                        <Box
                           sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                           }}
                        >
                           <Typography variant="h6">Total:</Typography>
                           <Typography variant="h5" color="primary.main">
                              {fCurrency(totalPrice)}
                           </Typography>
                        </Box>
                     </Box>

                     <LoadingButton
                        fullWidth
                        size="large"
                        type="submit"
                        variant="contained"
                        loading={isSubmitting || loading}
                        startIcon={<Iconify icon="solar:card-send-bold" />}
                     >
                        Process Order
                     </LoadingButton>

                     <Button
                        fullWidth
                        variant="outlined"
                        color="inherit"
                        onClick={() => router.push(paths.dashboard.agents.order)}
                        sx={{ mt: 1 }}
                     >
                        Back to Agent Order
                     </Button>
                  </Card>
               </Grid>
            </Grid>
         </Form>
         {/* Add Address Modal */}
         <Dialog open={addAddrOpen} onClose={() => setAddAddrOpen(false)} maxWidth="xs" fullWidth>
            <DialogTitle>Tambah Alamat Pengiriman</DialogTitle>
            <DialogContent dividers>
               <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                  <TextField
                     label="Alamat Lengkap"
                     value={newAddrAddress}
                     onChange={(e) => setNewAddrAddress(e.target.value)}
                     multiline
                     rows={3}
                     fullWidth
                     required
                  />
                  <PhoneInput
                     label="Nomor Telepon"
                     value={newAddrPhone}
                     onChange={(val: any) => setNewAddrPhone(val?.phone || '')}
                     defaultCountry="ID"
                     fullWidth
                     required
                  />
                  <TextField
                     label="Catatan (Opsional)"
                     value={newAddrNotes}
                     onChange={(e) => setNewAddrNotes(e.target.value)}
                     fullWidth
                  />
               </Box>
            </DialogContent>
            <DialogActions>
               <Button onClick={() => setAddAddrOpen(false)} color="inherit">
                  Batal
               </Button>
               <LoadingButton onClick={handleAddAddress} variant="contained" loading={addingAddr}>
                  Simpan Alamat
               </LoadingButton>
            </DialogActions>
         </Dialog>

         {/* Add Customer Modal */}
         <Dialog open={addCustomerOpen} onClose={() => setAddCustomerOpen(false)} maxWidth="xs" fullWidth>
            <DialogTitle>Tambah Pelanggan Baru</DialogTitle>
            <DialogContent dividers>
               <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                  <TextField
                     label="Nama Pelanggan"
                     value={newCustomerName}
                     onChange={(e) => setNewCustomerName(e.target.value)}
                     required
                     fullWidth
                  />
                  <PhoneInput
                     label="Nomor Telepon"
                     value={newCustomerPhone}
                     onChange={(val: any) => setNewCustomerPhone(val?.phone || '')}
                     defaultCountry="ID"
                     fullWidth
                     required
                  />
                  <TextField
                     label="Email (Opsional)"
                     value={newCustomerEmail}
                     onChange={(e) => setNewCustomerEmail(e.target.value)}
                     fullWidth
                  />
               </Box>
            </DialogContent>
            <DialogActions>
               <Button onClick={() => setAddCustomerOpen(false)} color="inherit">Batal</Button>
               <LoadingButton onClick={handleAddCustomer} variant="contained" loading={addingCustomer}>
                  Simpan Pelanggan
               </LoadingButton>
            </DialogActions>
         </Dialog>
      </DashboardContent>
   );
}
