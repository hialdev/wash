import type { SelectChangeEvent } from '@mui/material/Select';
import type { UseSetStateReturn } from 'minimal-shared/hooks';
import type { IServiceTableFilters } from 'src/types/service';

import { useCallback } from 'react';

import Box from '@mui/material/Box';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import InputAdornment from '@mui/material/InputAdornment';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
   onResetPage: () => void;
   filters: UseSetStateReturn<IServiceTableFilters>;
   options: {
      statuses: { value: string; label: string }[];
   };
};

export function ServiceTableToolbar({ filters, onResetPage, options }: Props) {
   const { state: currentFilters, setState: updateFilters } = filters;

   const handleFilterName = useCallback(
      (event: React.FocusEvent<HTMLInputElement>) => {
         onResetPage();
         updateFilters({ name: event.target.value });
      },
      [onResetPage, updateFilters]
   );

   const handleFilterStatus = useCallback(
      (event: SelectChangeEvent<string>) => {
         onResetPage();
         updateFilters({ status: event.target.value });
      },
      [onResetPage, updateFilters]
   );

   return (
      <Box
         sx={{
            p: 2.5,
            gap: 2,
            display: 'flex',
            pr: { xs: 2.5, md: 1 },
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { xs: 'flex-end', md: 'center' },
         }}
      >
         <FormControl sx={{ flexShrink: 0, width: { xs: 1, md: 200 } }}>
            <InputLabel>Status</InputLabel>
            <Select label="Status" value={currentFilters.status} onChange={handleFilterStatus}>
               {options.statuses.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                     {option.label}
                  </MenuItem>
               ))}
            </Select>
         </FormControl>

         <TextField
            fullWidth
            defaultValue={currentFilters.name}
            onBlur={handleFilterName}
            placeholder="Search service..."
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
      </Box>
   );
}
