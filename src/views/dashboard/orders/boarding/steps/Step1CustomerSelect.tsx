import { useState, useEffect, useCallback } from 'react';
import { useDebounce } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Radio from '@mui/material/Radio';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import RadioGroup from '@mui/material/RadioGroup';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';
import CardContent from '@mui/material/CardContent';
import FormControlLabel from '@mui/material/FormControlLabel';
import CircularProgress from '@mui/material/CircularProgress';
import LoadingButton from '@mui/lab/LoadingButton';

import { useRouter } from 'src/routes/hooks';
import { paths } from 'src/routes/al/paths';
import { Iconify } from 'src/components/iconify';
import { toast } from 'src/components/snackbar';
import useUserStore, { type UserData } from 'src/stores/user';
import useOrderStore from 'src/stores/order';

import { AddCustomerModal } from '../components/AddCustomerModal';
import { AddAddressModal, type IDeliveryAddressResult } from '../components/AddAddressModal';

// ----------------------------------------------------------------------

interface Props {
   onNext: (customer: UserData, address: IDeliveryAddressResult, deliveryMode: 'store' | 'pickup') => void;
}

export function Step1CustomerSelect({ onNext }: Props) {
   const router = useRouter();
   const { all: getAllUsers, getDeliveryAddresses } = useUserStore();
   const { createPickupOrder } = useOrderStore();

   const [searchInput, setSearchInput] = useState('');
   const [customers, setCustomers] = useState<UserData[]>([]);
   const [searchLoading, setSearchLoading] = useState(false);

   const [selectedCustomer, setSelectedCustomer] = useState<UserData | null>(null);
   const [addresses, setAddresses] = useState<IDeliveryAddressResult[]>([]);
   const [selectedAddressId, setSelectedAddressId] = useState<string>('');
   const [addressLoading, setAddressLoading] = useState(false);

   const [deliveryMode, setDeliveryMode] = useState<'store' | 'pickup'>('store');
   const [submitting, setSubmitting] = useState(false);

   const [addCustomerOpen, setAddCustomerOpen] = useState(false);
   const [addAddressOpen, setAddAddressOpen] = useState(false);

   const debouncedSearch = useDebounce(searchInput, 400);

   // Search customers
   const searchCustomers = useCallback(async (query: string) => {
      setSearchLoading(true);
      try {
         const res = await getAllUsers({
            sort: 'name',
            order: 'asc',
            role: 'customer',
            search: query || undefined,
            limit: 20,
            page: 1,
         });
         const list: UserData[] = res?.data?.users || [];
         setCustomers(list);
      } catch {
         toast.error('Gagal mencari customer');
      }
      setSearchLoading(false);
   }, [getAllUsers]);

   useEffect(() => {
      searchCustomers(debouncedSearch);
   }, [debouncedSearch, searchCustomers]);

   // Load addresses when customer selected
   const loadAddresses = useCallback(async (userId: string) => {
      setAddressLoading(true);
      try {
         const res = await getDeliveryAddresses({ id: userId });
         const list: IDeliveryAddressResult[] = res?.data || [];
         setAddresses(list);
         const primary = list.find((a) => a.is_primary);
         if (primary) setSelectedAddressId(primary.id);
         else if (list.length > 0) setSelectedAddressId(list[0].id);
         else setSelectedAddressId('');
      } catch {
         toast.error('Gagal memuat alamat customer');
      }
      setAddressLoading(false);
   }, [getDeliveryAddresses]);

   const handleSelectCustomer = (customer: UserData | null) => {
      setSelectedCustomer(customer);
      setAddresses([]);
      setSelectedAddressId('');
      if (customer?.id) loadAddresses(customer.id);
   };

   const handleCustomerAdded = (newUser: UserData, firstAddress: IDeliveryAddressResult) => {
      setCustomers((prev) => [newUser, ...prev]);
      setSelectedCustomer(newUser);
      if (firstAddress) {
         setAddresses([firstAddress]);
         setSelectedAddressId(firstAddress.id);
      } else {
         if (newUser.id) loadAddresses(newUser.id);
      }
   };

   const handleAddressAdded = (newAddr: IDeliveryAddressResult) => {
      setAddresses((prev) => [newAddr, ...prev]);
      setSelectedAddressId(newAddr.id);
   };

   const handleNext = async () => {
      if (!selectedCustomer) {
         toast.error('Pilih customer terlebih dahulu');
         return;
      }
      const address = addresses.find((a) => a.id === selectedAddressId);
      if (!address) {
         toast.error('Pilih alamat pengiriman');
         return;
      }

      if (deliveryMode === 'pickup') {
         setSubmitting(true);
         try {
            const res = await createPickupOrder({
               data: {
                  user_id: selectedCustomer.id,
                  address_receiver: address.address,
                  phone_receiver: address.phone_number,
               }
            });
            if (res.success && res.data?.id) {
               toast.success('Berhasil membuat order penjemputan');
               router.push(paths.dashboard.orders.detail(res.data.id));
            } else {
               toast.error(res.message || 'Gagal membuat order penjemputan');
            }
         } catch (error) {
            console.error(error);
            toast.error('Gagal membuat order penjemputan');
         } finally {
            setSubmitting(false);
         }
      } else {
         onNext(selectedCustomer, address, 'store');
      }
   };

   const selectedAddress = addresses.find((a) => a.id === selectedAddressId);

   return (
      <Box>
         <Typography variant="h6" gutterBottom>
            Pilih Customer
         </Typography>

         <Card sx={{ mb: 3 }}>
            <CardContent>
               <Stack spacing={2}>
                  <Autocomplete
                     options={customers}
                     getOptionLabel={(opt) => {
                        const name = opt.name || opt.username || '';
                        const phone = opt.phone ? ` (${opt.phone})` : '';
                        return `${name}${phone}`;
                     }}
                     isOptionEqualToValue={(opt, val) => opt.id === val.id}
                     value={selectedCustomer}
                     onChange={(_, val) => handleSelectCustomer(val)}
                     loading={searchLoading}
                     inputValue={searchInput}
                     onInputChange={(_, val) => setSearchInput(val)}
                     renderInput={(params) => (
                        <TextField
                           {...params}
                           label="Cari Customer"
                           placeholder="Ketik nama, HP, atau email..."
                           InputProps={{
                              ...params.InputProps,
                              endAdornment: (
                                 <>
                                    {searchLoading ? <CircularProgress size={16} /> : null}
                                    {params.InputProps.endAdornment}
                                 </>
                              ),
                           }}
                        />
                     )}
                     noOptionsText="Customer tidak ditemukan"
                  />

                  <Button
                     variant="outlined"
                     startIcon={<Iconify icon="solar:user-plus-bold" />}
                     onClick={() => setAddCustomerOpen(true)}
                     sx={{ alignSelf: 'flex-start' }}
                  >
                     + Tambah Customer Baru
                  </Button>
               </Stack>
            </CardContent>
         </Card>

         {selectedCustomer && (
            <>
               <Typography variant="h6" gutterBottom>
                  Cara Terima Barang
               </Typography>
               <Card sx={{ mb: 3 }}>
                  <CardContent>
                     <RadioGroup
                        row
                        value={deliveryMode}
                        onChange={(e) => setDeliveryMode(e.target.value as 'store' | 'pickup')}
                     >
                        <FormControlLabel
                           value="store"
                           control={<Radio />}
                           label={
                              <Box sx={{ ml: 0.5 }}>
                                 <Typography variant="subtitle2">Barang diantar ke toko</Typography>
                                 <Typography variant="caption" color="text.secondary">Cucian diserahkan langsung oleh customer di toko</Typography>
                              </Box>
                           }
                           sx={{ mr: 4 }}
                        />
                        <FormControlLabel
                           value="pickup"
                           control={<Radio />}
                           label={
                              <Box sx={{ ml: 0.5 }}>
                                 <Typography variant="subtitle2">Jemput dari rumah customer</Typography>
                                 <Typography variant="caption" color="text.secondary">Kurir menjemput cucian ke alamat customer</Typography>
                              </Box>
                           }
                        />
                     </RadioGroup>
                  </CardContent>
               </Card>

               <Typography variant="h6" gutterBottom>
                  Pilih Alamat Pengiriman
               </Typography>

               <Card>
                  <CardContent>
                     {addressLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                           <CircularProgress />
                        </Box>
                     ) : addresses.length === 0 ? (
                        <Typography color="text.secondary" sx={{ mb: 2 }}>
                           Belum ada alamat. Tambahkan alamat terlebih dahulu.
                        </Typography>
                     ) : (
                        <RadioGroup
                           value={selectedAddressId}
                           onChange={(e) => setSelectedAddressId(e.target.value)}
                        >
                           {addresses.map((addr) => (
                              <FormControlLabel
                                 key={addr.id}
                                 value={addr.id}
                                 control={<Radio />}
                                 label={
                                    <Box>
                                       <Typography variant="body2" fontWeight={600}>
                                          {addr.address}
                                       </Typography>
                                       <Typography variant="caption" color="text.secondary">
                                          {addr.phone_number}
                                          {addr.is_primary && ' · Alamat Utama'}
                                          {addr.notes && ` · ${addr.notes}`}
                                       </Typography>
                                    </Box>
                                 }
                                 sx={{ mb: 1, alignItems: 'flex-start' }}
                              />
                           ))}
                        </RadioGroup>
                     )}

                     <Divider sx={{ my: 2 }} />

                     <Button
                        variant="outlined"
                        size="small"
                        startIcon={<Iconify icon="solar:add-square-bold" />}
                        onClick={() => setAddAddressOpen(true)}
                     >
                        + Tambah Alamat
                     </Button>
                  </CardContent>
               </Card>
            </>
         )}

         {/* Summary Card */}
         {selectedCustomer && selectedAddress && (
            <Card sx={{ mt: 2, bgcolor: 'primary.lighter' }}>
               <CardContent>
                  <Typography variant="subtitle2" color="primary.dark" gutterBottom>
                     Ringkasan Pilihan
                  </Typography>
                  <Typography variant="body2">
                     <strong>Customer:</strong> {selectedCustomer.name} ({selectedCustomer.phone})
                  </Typography>
                  <Typography variant="body2">
                     <strong>Cara Terima:</strong> {deliveryMode === 'store' ? 'Barang diantar ke toko' : 'Jemput dari rumah'}
                  </Typography>
                  <Typography variant="body2">
                     <strong>Alamat:</strong> {selectedAddress.address}
                  </Typography>
                  <Typography variant="body2">
                     <strong>HP Penerima:</strong> {selectedAddress.phone_number}
                  </Typography>
               </CardContent>
            </Card>
         )}

         <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
            <LoadingButton
               variant="contained"
               size="large"
               loading={submitting}
               onClick={handleNext}
               disabled={!selectedCustomer || !selectedAddressId}
               endIcon={<Iconify icon={deliveryMode === 'pickup' ? "solar:diskette-bold" : "solar:arrow-right-bold"} />}
            >
               {deliveryMode === 'pickup' ? 'Buat Order Penjemputan' : 'Lanjut ke Penimbangan'}
            </LoadingButton>
         </Box>

         <AddCustomerModal
            open={addCustomerOpen}
            onClose={() => setAddCustomerOpen(false)}
            onSuccess={handleCustomerAdded}
         />

         {selectedCustomer && (
            <AddAddressModal
               open={addAddressOpen}
               onClose={() => setAddAddressOpen(false)}
               customerId={selectedCustomer.id!}
               onSuccess={handleAddressAdded}
            />
         )}
      </Box>
   );
}
