import type { Journal } from 'src/types/journal';

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import Checkbox from '@mui/material/Checkbox';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import ListItemText from '@mui/material/ListItemText';

import { useBoolean, usePopover } from 'minimal-shared/hooks';

import { fCurrency } from 'src/utils/format-number';
import { fDate, fTime } from 'src/utils/format-time';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { CustomPopover } from 'src/components/custom-popover';

// ----------------------------------------------------------------------

type Props = {
   row: Journal;
   selected: boolean;
   onSelectRow: VoidFunction;
   onViewRow?: VoidFunction;
   onEditRow: VoidFunction;
   onDeleteRow: VoidFunction;
};

export default function JournalTableRow({
   row,
   selected,
   onSelectRow,
   onViewRow,
   onEditRow,
   onDeleteRow,
}: Props) {
   const { trx_category, trx_type, amount, notes, trx_date } = row;

   const confirm = useBoolean();

   const popover = usePopover();

   return (
      <>
         <TableRow hover selected={selected}>
            <TableCell padding="checkbox">
               <Checkbox checked={selected} onClick={onSelectRow} />
            </TableCell>

            <TableCell>
               <ListItemText
                  primary={fDate(trx_date)}
                  secondary={fTime(trx_date)}
                  primaryTypographyProps={{ typography: 'body2', noWrap: true }}
                  secondaryTypographyProps={{
                     mt: 0.5,
                     component: 'span',
                     typography: 'caption',
                  }}
               />
            </TableCell>

            <TableCell>
               <Label
                  variant="soft"
                  color={
                     (trx_type === 'income' && 'success') ||
                     (trx_type === 'expense' && 'error') ||
                     'default'
                  }
               >
                  {trx_type}
               </Label>
            </TableCell>

            <TableCell>
               <ListItemText
                  primary={trx_category}
                  secondary={notes}
                  primaryTypographyProps={{ typography: 'body2', noWrap: true }}
                  secondaryTypographyProps={{
                     mt: 0.5,
                     component: 'span',
                     typography: 'caption',
                  }}
               />
            </TableCell>

            <TableCell>{fCurrency(amount)}</TableCell>

            <TableCell align="right" sx={{ px: 1, whiteSpace: 'nowrap' }}>
               <IconButton color={popover.open ? 'inherit' : 'default'} onClick={popover.onOpen}>
                  <Iconify icon="eva:more-vertical-fill" />
               </IconButton>
            </TableCell>
         </TableRow>

         <CustomPopover
            open={popover.open}
            anchorEl={popover.anchorEl}
            onClose={popover.onClose}
            slotProps={{ arrow: { placement: 'right-top' } }}
            sx={{ width: 140 }}
         >
            <MenuItem
               onClick={() => {
                  onEditRow();
                  popover.onClose();
               }}
            >
               <Iconify icon="solar:pen-bold" />
               Edit
            </MenuItem>

            <MenuItem
               onClick={() => {
                  confirm.onTrue();
                  popover.onClose();
               }}
               sx={{ color: 'error.main' }}
            >
               <Iconify icon="solar:trash-bin-trash-bold" />
               Delete
            </MenuItem>
         </CustomPopover>

         <ConfirmDialog
            open={confirm.value}
            onClose={confirm.onFalse}
            title="Delete"
            content="Are you sure want to delete?"
            action={
               <Button variant="contained" color="error" onClick={onDeleteRow}>
                  Delete
               </Button>
            }
         />
      </>
   );
}
