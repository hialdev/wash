import { useCallback } from 'react';
import dayjs from 'dayjs';

import Stack from '@mui/material/Stack';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import IconButton from '@mui/material/IconButton';
import FormControl from '@mui/material/FormControl';
import OutlinedInput from '@mui/material/OutlinedInput';
import InputAdornment from '@mui/material/InputAdornment';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

import { usePopover } from 'minimal-shared/hooks';

import { Iconify } from 'src/components/iconify';
import { CustomPopover } from 'src/components/custom-popover';

// ----------------------------------------------------------------------

type Props = {
   filters: {
      name: string;
      trx_type: string[];
      startDate: Date | null;
      endDate: Date | null;
   };
   onFilters: (name: string, value: any) => void;
   //
   roleOptions: string[];
};

export default function JournalTableToolbar({
   filters,
   onFilters,
   //
   roleOptions,
}: Props) {
   const popover = usePopover();

   const handleFilterName = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
         onFilters('name', event.target.value);
      },
      [onFilters]
   );

   const handleFilterRole = useCallback(
      (event: SelectChangeEvent<string[]>) => {
         onFilters(
            'trx_type',
            typeof event.target.value === 'string'
               ? event.target.value.split(',')
               : event.target.value
         );
      },
      [onFilters]
   );

   const handleFilterStartDate = useCallback(
      (newValue: dayjs.Dayjs | null) => {
         onFilters('startDate', newValue ? newValue.toDate() : null);
      },
      [onFilters]
   );

   const handleFilterEndDate = useCallback(
      (newValue: dayjs.Dayjs | null) => {
         onFilters('endDate', newValue ? newValue.toDate() : null);
      },
      [onFilters]
   );

   return (
      <>
         <Stack
            spacing={2}
            alignItems={{ xs: 'flex-end', md: 'center' }}
            direction={{ xs: 'column', md: 'row' }}
            sx={{
               p: 2.5,
               pr: { xs: 2.5, md: 1 },
            }}
         >
            <FormControl
               sx={{
                  flexShrink: 0,
                  width: { xs: 1, md: 200 },
               }}
            >
               <InputLabel>Type</InputLabel>

               <Select
                  multiple
                  value={filters.trx_type}
                  onChange={handleFilterRole}
                  input={<OutlinedInput label="Type" />}
                  renderValue={(selected) => selected.map((value) => value).join(', ')}
                  MenuProps={{
                     PaperProps: {
                        sx: { maxHeight: 240 },
                     },
                  }}
               >
                  {roleOptions.map((option) => (
                     <MenuItem key={option} value={option}>
                        <Checkbox
                           disableRipple
                           size="small"
                           checked={filters.trx_type.includes(option)}
                        />
                        {option}
                     </MenuItem>
                  ))}
               </Select>
            </FormControl>

            <DatePicker
               label="Start date"
               value={filters.startDate ? dayjs(filters.startDate) : null}
               onChange={handleFilterStartDate}
               slotProps={{ textField: { fullWidth: true } }}
               sx={{
                  maxWidth: { md: 200 },
               }}
            />

            <DatePicker
               label="End date"
               value={filters.endDate ? dayjs(filters.endDate) : null}
               onChange={handleFilterEndDate}
               slotProps={{ textField: { fullWidth: true } }}
               sx={{
                  maxWidth: { md: 200 },
               }}
            />

            <Stack direction="row" alignItems="center" spacing={2} sx={{ flexGrow: 1, width: 1 }}>
               <TextField
                  fullWidth
                  value={filters.name}
                  onChange={handleFilterName}
                  placeholder="Search..."
                  InputProps={{
                     startAdornment: (
                        <InputAdornment position="start">
                           <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                        </InputAdornment>
                     ),
                  }}
               />

               <IconButton onClick={popover.onOpen}>
                  <Iconify icon="eva:more-vertical-fill" />
               </IconButton>
            </Stack>
         </Stack>

         <CustomPopover
            open={popover.open}
            anchorEl={popover.anchorEl}
            onClose={popover.onClose}
            slotProps={{ arrow: { placement: 'right-top' } }}
            sx={{ width: 140 }}
         >
            <MenuItem
               onClick={() => {
                  popover.onClose();
               }}
            >
               <Iconify icon="solar:printer-minimalistic-bold" />
               Print
            </MenuItem>

         </CustomPopover>
      </>
   );
}
