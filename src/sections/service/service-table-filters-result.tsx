import type { UseSetStateReturn } from 'minimal-shared/hooks';
import type { IServiceTableFilters } from 'src/types/service';
import type { FiltersResultProps } from 'src/components/filters-result';

import { useCallback } from 'react';
import { upperFirst } from 'es-toolkit';

import Chip from '@mui/material/Chip';

import { chipProps, FiltersBlock, FiltersResult } from 'src/components/filters-result';

// ----------------------------------------------------------------------

type Props = FiltersResultProps & {
   onResetPage: () => void;
   filters: UseSetStateReturn<IServiceTableFilters>;
};

export function ServiceTableFiltersResult({ filters, onResetPage, totalResults, sx }: Props) {
   const { state: currentFilters, setState: updateFilters, resetState: resetFilters } = filters;

   const handleRemoveStatus = useCallback(
      (inputValue: string) => {
         onResetPage();
         if (currentFilters.status === inputValue) {
            updateFilters({ status: 'all' });
         }
      },
      [updateFilters, onResetPage, currentFilters.status]
   );

   const handleReset = useCallback(() => {
      onResetPage();
      resetFilters();
   }, [onResetPage, resetFilters]);

   return (
      <FiltersResult totalResults={totalResults} onReset={handleReset} sx={sx}>
         <FiltersBlock
            label="Status:"
            isShow={currentFilters.status !== 'all' && !!currentFilters.status}
         >
            <Chip
               {...chipProps}
               label={upperFirst(currentFilters.status)}
               onDelete={() => handleRemoveStatus(currentFilters.status)}
            />
         </FiltersBlock>
      </FiltersResult>
   );
}
