import { useState } from 'react';

import Box from '@mui/material/Box';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import Grid from '@mui/material/Grid';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
   filters: any;
   onResetPage: () => void;
   products: any[];
   selectedProduct: any;
   onProductChange: (product: any) => void;
   selectedStatus: string;
   onStatusChange: (status: string) => void;
};

const statusOptions = [
   { value: 'all', label: 'All Status' },
   { value: 'available', label: 'Available' },
   { value: 'depleted', label: 'Depleted' },
];

export function InventoryItemsTableToolbar({
   filters,
   onResetPage,
   products,
   selectedProduct,
   onProductChange,
   selectedStatus,
   onStatusChange,
}: Props) {
   const [search, setSearch] = useState(filters.state.search);

   const handleSearchBlur = () => {
      if (search !== filters.state.search) {
         filters.setState({ search });
         onResetPage();
      }
   };

   return (
      <Box sx={{ p: 2.5 }}>
         <Grid container spacing={2}>
            {/* Search Field */}
            <Grid size={{ xs: 12, md: 4 }}>
               <TextField
                  fullWidth
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onBlur={handleSearchBlur}
                  onKeyUp={(event) => event.key === 'Enter' && handleSearchBlur()}
                  placeholder="Search item number..."
                  InputProps={{
                     startAdornment: (
                        <InputAdornment position="start">
                           <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                        </InputAdornment>
                     ),
                  }}
               />
            </Grid>

            {/* Product Filter */}
            <Grid size={{ xs: 12, md: 4 }}>
               <Autocomplete
                  options={products.filter((p) => p.tracking_mode === 'individual')}
                  getOptionLabel={(option) => option.title || ''}
                  value={selectedProduct}
                  onChange={(_, newValue) => onProductChange(newValue)}
                  renderInput={(params) => (
                     <TextField
                        {...params}
                        placeholder="Filter by product..."
                        InputProps={{
                           ...params.InputProps,
                           startAdornment: (
                              <>
                                 <InputAdornment position="start">
                                    <Iconify icon="solar:box-bold" width={20} />
                                 </InputAdornment>
                                 {params.InputProps.startAdornment}
                              </>
                           ),
                        }}
                     />
                  )}
               />
            </Grid>

            {/* Status Filter */}
            <Grid size={{ xs: 12, md: 4 }}>
               <Autocomplete
                  options={statusOptions}
                  getOptionLabel={(option) => option.label}
                  value={statusOptions.find((opt) => opt.value === selectedStatus)}
                  onChange={(_, newValue) => onStatusChange(newValue?.value || 'all')}
                  renderInput={(params) => (
                     <TextField
                        {...params}
                        placeholder="Filter by status..."
                        InputProps={{
                           ...params.InputProps,
                           startAdornment: (
                              <>
                                 <InputAdornment position="start">
                                    <Iconify icon="solar:filter-bold" width={20} />
                                 </InputAdornment>
                                 {params.InputProps.startAdornment}
                              </>
                           ),
                        }}
                     />
                  )}
               />
            </Grid>
         </Grid>
      </Box>
   );
}
