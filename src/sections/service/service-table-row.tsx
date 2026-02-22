import type { IService } from 'src/types/service';

import { useBoolean } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import Checkbox from '@mui/material/Checkbox';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import ListItemText from '@mui/material/ListItemText';
import { Typography } from '@mui/material';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { fCurrency } from 'src/utils/format-number';
import { fTime, fDate } from 'src/utils/format-time';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';

// ----------------------------------------------------------------------

type Props = {
   row: IService;
   selected: boolean;
   onSelectRow: () => void;
   onDeleteRow: () => void;
};

export function ServiceTableRow({ row, selected, onSelectRow, onDeleteRow }: Props) {
   const router = useRouter();
   const confirmDialog = useBoolean();

   const handleEdit = () => {
      router.push(paths.dashboard.service.edit(row.id));
   };

   return (
      <>
         <TableRow hover selected={selected} aria-checked={selected} tabIndex={-1}>
            <TableCell padding="checkbox">
               <Checkbox id={row.id} checked={selected} onClick={onSelectRow} />
            </TableCell>

            <TableCell>
               <ListItemText
                  primary={
                     <Typography
                        variant="body2"
                        noWrap
                        sx={{
                           cursor: 'pointer',
                           color: 'text.primary',
                           '&:hover': { textDecoration: 'underline' },
                        }}
                        onClick={() => router.push(paths.dashboard.service.details(row.id))}
                     >
                        {row.name}
                     </Typography>
                  }
                  secondary={row.description}
                  slotProps={{
                     secondary: { sx: { color: 'text.disabled' }, noWrap: true },
                  }}
               />
            </TableCell>

            <TableCell>
               <Box sx={{ gap: 0.5, display: 'flex', flexDirection: 'column' }}>
                  <span>{fDate(row.created_at)}</span>
                  <Box component="span" sx={{ typography: 'caption', color: 'text.secondary' }}>
                     {fTime(row.created_at)}
                  </Box>
               </Box>
            </TableCell>

            <TableCell>
               {fCurrency(row.price)} / {row.unit}
            </TableCell>

            <TableCell>
               <Label variant="soft" color={row.is_active ? 'info' : 'default'}>
                  {row.is_active ? 'Active' : 'Inactive'}
               </Label>
            </TableCell>

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
            content="Are you sure want to delete this service?"
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
