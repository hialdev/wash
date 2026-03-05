import type { IServiceTableFilters } from 'src/types/service';
import type { UseSetStateReturn } from 'minimal-shared/hooks';

import { useCallback } from 'react';

import Stack from '@mui/material/Stack';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import IconButton from '@mui/material/IconButton';
import FormControl from '@mui/material/FormControl';
import InputAdornment from '@mui/material/InputAdornment';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
   onResetPage: () => void;
   filters: UseSetStateReturn<any>;
   options: {
      statuses: { value: string; label: string }[];
   };
};

export function VoucherTableToolbar({ filters, options, onResetPage }: Props) {
   const handleFilterName = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
         onResetPage();
         filters.setState({ code: event.target.value });
      },
      [filters, onResetPage]
   );

   const handleFilterStatus = useCallback(
      (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
         onResetPage();
         filters.setState({ status: event.target.value as string });
      },
      [filters, onResetPage]
   );

   return (
      <Stack
         spacing={2}
         alignItems={{ xs: 'flex-end', md: 'center' }}
         direction={{ xs: 'column', md: 'row' }}
         sx={{ p: 2.5, pr: { xs: 2.5, md: 1 } }}
      >
         <FormControl sx={{ flexShrink: 0, width: { xs: 1, md: 200 } }}>
            <InputLabel htmlFor="voucher-filter-status-select-label">Status</InputLabel>

            <Select
               inputProps={{ id: 'voucher-filter-status-select-label' }}
               value={filters.state.status}
               onChange={(e: any) => handleFilterStatus(e)}
               label="Status"
            >
               {options.statuses.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                     {option.label}
                  </MenuItem>
               ))}
            </Select>
         </FormControl>

         <Stack direction="row" alignItems="center" spacing={2} flexGrow={1} sx={{ width: 1 }}>
            <TextField
               fullWidth
               value={filters.state.code}
               onChange={handleFilterName}
               placeholder="Search voucher code..."
               slotProps={{
                  input: {
                     startAdornment: (
                        <InputAdornment position="start">
                           <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                        </InputAdornment>
                     ),
                  },
               }}
            />
         </Stack>
      </Stack>
   );
}
