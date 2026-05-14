'use client';

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

import { Iconify } from 'src/components/iconify';
import { toast } from 'src/components/snackbar';
import useUserStore, { type UserData } from 'src/stores/user';

import { AddCustomerModal } from '../components/AddCustomerModal';
import { AddAddressModal, type IDeliveryAddressResult } from '../components/AddAddressModal';

// ----------------------------------------------------------------------

interface Props {
   onNext: (customer: UserData, address: IDeliveryAddressResult) => void;
}

export function Step1CustomerSelect({ onNext }: Props) {
   const { all: getAllUsers, getDeliveryAddresses } = useUserStore();

   const [searchInput, setSearchInput] = useState('');
   const [customers, setCustomers] = useState<UserData[]>([]);
   const [searchLoading, setSearchLoading] = useState(false);

   const [selectedCustomer, setSelectedCustomer] = useState<UserData | null>(null);
   const [addresses, setAddresses] = useState<IDeliveryAddressResult[]>([]);
   const [selectedAddressId, setSelectedAddressId] = useState<string>('');
   const [addressLoading, setAddressLoading] = useState(false);

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
      // Directly set the address returned from the modal, no need to reload
      if (firstAddress) {
         setAddresses([firstAddress]);
         setSelectedAddressId(firstAddress.id);
      } else {
         // fallback: load addresses from server
         if (newUser.id) loadAddresses(newUser.id);
      }
   };

   const handleAddressAdded = (newAddr: IDeliveryAddressResult) => {
      setAddresses((prev) => [newAddr, ...prev]);
      setSelectedAddressId(newAddr.id);
   };

   const handleNext = () => {
      if (!selectedCustomer) {
         toast.error('Pilih customer terlebih dahulu');
         return;
      }
      const address = addresses.find((a) => a.id === selectedAddressId);
      if (!address) {
         toast.error('Pilih alamat pengiriman');
         return;
      }
      onNext(selectedCustomer, address);
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
                     <strong>Alamat:</strong> {selectedAddress.address}
                  </Typography>
                  <Typography variant="body2">
                     <strong>HP Penerima:</strong> {selectedAddress.phone_number}
                  </Typography>
               </CardContent>
            </Card>
         )}

         <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
            <Button
               variant="contained"
               size="large"
               onClick={handleNext}
               disabled={!selectedCustomer || !selectedAddressId}
               endIcon={<Iconify icon="solar:arrow-right-bold" />}
            >
               Lanjut ke Pilih Layanan
            </Button>
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
