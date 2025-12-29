import { useState } from 'react';

import type { Dayjs } from 'dayjs';

import Box from '@mui/material/Box';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
   filters: any;
   onResetPage: () => void;
   principles: any[];
   selectedPrinciples: any[];
   onPrinciplesChange: (principles: any[]) => void;
   fromDate: Dayjs | null;
   toDate: Dayjs | null;
   onFromDateChange: (date: Dayjs | null) => void;
   onToDateChange: (date: Dayjs | null) => void;
   sortBy: string;
   onSortChange: (sort: string) => void;
};

const sortOptions = [
   { value: 'created_at-desc', label: 'Latest First' },
   { value: 'created_at-asc', label: 'Oldest First' },
   { value: 'total_price-desc', label: 'Highest Value' },
   { value: 'total_price-asc', label: 'Lowest Value' },
   { value: 'purchase_date-desc', label: 'Newest Purchase Date' },
   { value: 'purchase_date-asc', label: 'Oldest Purchase Date' },
];

export function PurchaseTableToolbar({
   filters,
   onResetPage,
   principles,
   selectedPrinciples,
   onPrinciplesChange,
   fromDate,
   toDate,
   onFromDateChange,
   onToDateChange,
   sortBy,
   onSortChange,
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
         <Grid container spacing={2} wrap='wrap'>
            {/* Search Field */}
            <Grid size={{ xs: 12, md: 3 }}>
               <TextField
                  fullWidth
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onBlur={handleSearchBlur}
                  onKeyUp={(event) => event.key === 'Enter' && handleSearchBlur()}
                  placeholder="Search purchase number..."
                  InputProps={{
                     startAdornment: (
                        <InputAdornment position="start">
                           <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                        </InputAdornment>
                     ),
                  }}
               />
            </Grid>

            {/* Principle Filter (Multiple) */}
            <Grid size={{ xs: 12, md: 3 }}>
               <Autocomplete
                  multiple
                  options={principles}
                  getOptionLabel={(option) => option.title || ''}
                  value={selectedPrinciples}
                  onChange={(_, newValue) => onPrinciplesChange(newValue)}
                  renderInput={(params) => (
                     <TextField
                        {...params}
                        placeholder="Filter by supplier..."
                        InputProps={{
                           ...params.InputProps,
                           startAdornment: (
                              <>
                                 <InputAdornment position="start">
                                    <Iconify icon="solar:user-bold" width={20} />
                                 </InputAdornment>
                                 {params.InputProps.startAdornment}
                              </>
                           ),
                        }}
                     />
                  )}
               />
            </Grid>

            {/* From Date */}
            <Grid size={{ xs: 12, md: 2 }}>
               <DatePicker
                  label="From Date"
                  value={fromDate}
                  onChange={onFromDateChange}
                  slotProps={{
                     textField: {
                        fullWidth: true,
                        InputProps: {
                           startAdornment: (
                              <InputAdornment position="start">
                                 <Iconify icon="solar:calendar-bold" width={20} />
                              </InputAdornment>
                           ),
                        },
                     },
                  }}
               />
            </Grid>

            {/* To Date */}
            <Grid size={{ xs: 12, md: 2 }}>
               <DatePicker
                  label="To Date"
                  value={toDate}
                  onChange={onToDateChange}
                  slotProps={{
                     textField: {
                        fullWidth: true,
                        InputProps: {
                           startAdornment: (
                              <InputAdornment position="start">
                                 <Iconify icon="solar:calendar-bold" width={20} />
                              </InputAdornment>
                           ),
                        },
                     },
                  }}
               />
            </Grid>

            {/* Sort By */}
            <Grid size={{ xs: 12, md: 2 }}>
               <TextField
                  select
                  fullWidth
                  value={sortBy}
                  onChange={(e) => onSortChange(e.target.value)}
                  InputProps={{
                     startAdornment: (
                        <InputAdornment position="start">
                           <Iconify icon="solar:sort-bold" width={20} />
                        </InputAdornment>
                     ),
                  }}
               >
                  {sortOptions.map((option) => (
                     <MenuItem key={option.value} value={option.value}>
                        {option.label}
                     </MenuItem>
                  ))}
               </TextField>
            </Grid>
         </Grid>
      </Box>
   );
}
