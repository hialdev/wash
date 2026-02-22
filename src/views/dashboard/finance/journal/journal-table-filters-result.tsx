import { useCallback } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Stack, { StackProps } from '@mui/material/Stack';

import { Iconify } from 'src/components/iconify';
import { fDateRangeShortLabel } from 'src/utils/format-time';

import { JournalInput } from 'src/types/journal';

// ----------------------------------------------------------------------

type Props = StackProps & {
   filters: {
      name: string;
      trx_type: string[];
      startDate: Date | null;
      endDate: Date | null;
   };
   onFilters: (name: string, value: any) => void;
   //
   onResetFilters: VoidFunction;
   results: number;
};

export default function JournalTableFiltersResult({
   filters,
   onFilters,
   //
   onResetFilters,
   results,
   ...other
}: Props) {
   const shortLabel = fDateRangeShortLabel(filters.startDate, filters.endDate);

   const handleRemoveKeyword = useCallback(() => {
      onFilters('name', '');
   }, [onFilters]);

   const handleRemoveRole = useCallback(
      (inputValue: string) => {
         const newValue = filters.trx_type.filter((item) => item !== inputValue);
         onFilters('trx_type', newValue);
      },
      [filters.trx_type, onFilters]
   );

   const handleRemoveDate = useCallback(() => {
      onFilters('startDate', null);
      onFilters('endDate', null);
   }, [onFilters]);

   return (
      <Stack spacing={1.5} {...other}>
         <Box sx={{ typography: 'body2' }}>
            <strong>{results}</strong>
            <Box component="span" sx={{ color: 'text.secondary', ml: 0.25 }}>
               results found
            </Box>
         </Box>

         <Stack flexGrow={1} spacing={1} direction="row" flexWrap="wrap" alignItems="center">
            {filters.trx_type.length > 0 && (
               <Block label="Type:">
                  {filters.trx_type.map((item) => (
                     <Chip
                        key={item}
                        label={item}
                        size="small"
                        onDelete={() => handleRemoveRole(item)}
                     />
                  ))}
               </Block>
            )}

            {filters.startDate && filters.endDate && (
               <Block label="Date:">
                  <Chip size="small" label={shortLabel} onDelete={handleRemoveDate} />
               </Block>
            )}

            {!!filters.name && (
               <Block label="Keyword:">
                  <Chip label={filters.name} size="small" onDelete={handleRemoveKeyword} />
               </Block>
            )}

            <Button
               color="error"
               onClick={onResetFilters}
               startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
            >
               Clear
            </Button>
         </Stack>
      </Stack>
   );
}

// ----------------------------------------------------------------------

type BlockProps = {
   label: string;
   children: React.ReactNode;
};

function Block({ label, children }: BlockProps) {
   return (
      <Stack
         component={Paper}
         variant="outlined"
         spacing={1}
         direction="row"
         sx={{
            p: 1,
            borderRadius: 1,
            overflow: 'hidden',
            borderStyle: 'dashed',
         }}
      >
         <Box component="span" sx={{ typography: 'subtitle2' }}>
            {label}
         </Box>

         <Stack spacing={1} direction="row" flexWrap="wrap">
            {children}
         </Stack>
      </Stack>
   );
}
