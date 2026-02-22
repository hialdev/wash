import type { RawMaterial } from 'src/types/raw-material';

import { useBoolean } from 'minimal-shared/hooks';

import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import Checkbox from '@mui/material/Checkbox';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { CONFIG } from 'src/global-config';

import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';

// ----------------------------------------------------------------------

type Props = {
   row: RawMaterial;
   selected: boolean;
   onSelectRow: () => void;
   onDeleteRow: () => void;
   onEditRow: () => void;
};

export function RawMaterialTableRow({ row, selected, onSelectRow, onDeleteRow, onEditRow }: Props) {
   const confirmDialog = useBoolean();

   const imgUrl = row.image
      ? row.image.startsWith('http')
         ? row.image
         : `${CONFIG.apiHostUrl}/${row.image}`
      : '';

   const stock = row.current_stock ?? 0;
   const stockColor = stock <= 0 ? 'error' : stock < 5 ? 'warning' : 'success';

   return (
      <>
         <TableRow hover selected={selected} aria-checked={selected} tabIndex={-1}>
            {/* Checkbox */}
            <TableCell padding="checkbox">
               <Checkbox id={row.id} checked={selected} onClick={onSelectRow} />
            </TableCell>

            {/* Image */}
            <TableCell>
               <Avatar
                  alt={row.title}
                  src={imgUrl}
                  variant="rounded"
                  sx={{ width: 48, height: 48 }}
               >
                  <Iconify icon="solar:test-tube-bold" />
               </Avatar>
            </TableCell>

            {/* Name + slug */}
            <TableCell>
               <Typography variant="body2" fontWeight={600}>
                  {row.title}
               </Typography>
               <Typography variant="caption" color="text.secondary">
                  {row.slug}
               </Typography>
            </TableCell>

            {/* Unit */}
            <TableCell>
               <Typography variant="body2">{row.unit}</Typography>
            </TableCell>

            {/* Stock */}
            <TableCell align="center">
               <Chip label={stock.toFixed(3)} size="small" color={stockColor} />
            </TableCell>

            {/* Actions */}
            <TableCell align="right" sx={{ px: 1, whiteSpace: 'nowrap' }}>
               <Tooltip title="Edit" placement="top" arrow>
                  <IconButton color="default" onClick={onEditRow}>
                     <Iconify icon="solar:pen-bold" />
                  </IconButton>
               </Tooltip>

               <Tooltip title="Hapus" placement="top" arrow>
                  <IconButton color="error" onClick={confirmDialog.onTrue}>
                     <Iconify icon="solar:trash-bin-trash-bold" />
                  </IconButton>
               </Tooltip>
            </TableCell>
         </TableRow>

         <ConfirmDialog
            open={confirmDialog.value}
            onClose={confirmDialog.onFalse}
            title="Hapus Bahan Baku"
            content="Yakin ingin menghapus bahan baku ini?"
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
