import type { IVoucher } from 'src/types/voucher';

import { useBoolean } from 'minimal-shared/hooks';

import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import Checkbox from '@mui/material/Checkbox';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import ListItemText from '@mui/material/ListItemText';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { fCurrency } from 'src/utils/format-number';
import { fDate } from 'src/utils/format-time';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';

// ----------------------------------------------------------------------

type Props = {
   row: IVoucher;
   selected: boolean;
   onSelectRow: () => void;
   onDeleteRow: () => void;
};

export function VoucherTableRow({ row, selected, onSelectRow, onDeleteRow }: Props) {
   const router = useRouter();
   const confirmDialog = useBoolean();

   const handleEdit = () => {
      router.push(paths.dashboard.voucher.edit(row.id));
   };

   return (
      <>
         <TableRow hover selected={selected} aria-checked={selected} tabIndex={-1}>
            <TableCell padding="checkbox">
               <Checkbox id={row.id} checked={selected} onClick={onSelectRow} />
            </TableCell>

            <TableCell>
               <ListItemText
                  primary={row.code}
                  secondary={row.description}
                  slotProps={{
                     primary: { sx: { typography: 'subtitle2' } },
                     secondary: { sx: { color: 'text.disabled' }, noWrap: true },
                  }}
               />
            </TableCell>

            <TableCell>
               {row.discount_type === 'percentage'
                  ? `${row.discount_value}%`
                  : fCurrency(row.discount_value)}
            </TableCell>

            <TableCell>{row.quota ? `${row.used_count} / ${row.quota}` : 'Unlimited'}</TableCell>

            <TableCell>
               <Label variant="soft" color={row.is_active ? 'info' : 'default'}>
                  {row.is_active ? 'Active' : 'Inactive'}
               </Label>
               <br />
               <Label variant="soft" color={row.is_public ? 'success' : 'warning'} sx={{ mt: 0.5 }}>
                  {row.is_public ? 'Public' : 'Private'}
               </Label>
            </TableCell>

            <TableCell>{row.valid_until ? fDate(row.valid_until) : 'No Expiry'}</TableCell>

            <TableCell align="right" sx={{ px: 1, whiteSpace: 'nowrap' }}>
               <Tooltip title="Edit" placement="top" arrow>
                  <IconButton color="default" onClick={handleEdit}>
                     <Iconify icon="solar:pen-bold" />
                  </IconButton>
               </Tooltip>

               <Tooltip title="Delete" placement="top" arrow>
                  <IconButton color="error" onClick={confirmDialog.onTrue}>
                     <Iconify icon="solar:trash-bin-trash-bold" />
                  </IconButton>
               </Tooltip>
            </TableCell>
         </TableRow>

         <ConfirmDialog
            open={confirmDialog.value}
            onClose={confirmDialog.onFalse}
            title="Delete"
            content="Are you sure want to delete this voucher?"
            action={
               <IconButton
                  color="error"
                  onClick={() => {
                     onDeleteRow();
                     confirmDialog.onFalse();
                  }}
               >
                  <Iconify icon="solar:trash-bin-trash-bold" />
               </IconButton>
            }
         />
      </>
   );
}
