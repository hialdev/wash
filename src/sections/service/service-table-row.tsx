import type { IService } from 'src/types/service';

import { useState } from 'react';
import { useBoolean } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import Checkbox from '@mui/material/Checkbox';
import TableBody from '@mui/material/TableBody';
import TableHead from '@mui/material/TableHead';
import TableCell from '@mui/material/TableCell';
import Collapse from '@mui/material/Collapse';
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
   onDeleteRow: (id: string) => void;
   onManageCogs: (id: string, name: string) => void;
   onManageVariants: (service: IService) => void;
};

export function ServiceTableRow({ row, selected, onSelectRow, onDeleteRow, onManageCogs, onManageVariants }: Props) {
   const router = useRouter();
   const collapse = useBoolean();
   const confirmDialog = useBoolean();
   
   const [variantToDelete, setVariantToDelete] = useState<IService | null>(null);
   const confirmDeleteVariant = useBoolean();

   const hasVariants = !!(row.variants && row.variants.length > 0);

   const handleEdit = () => {
      router.push(paths.dashboard.service.edit(row.id));
   };

   return (
      <>
         <TableRow hover selected={selected} aria-checked={selected} tabIndex={-1}>
            {/* 1. Collapse Icon Column */}
            <TableCell sx={{ px: 1 }}>
               {hasVariants && (
                  <IconButton
                     size="small"
                     color={collapse.value ? 'primary' : 'default'}
                     onClick={collapse.onToggle}
                  >
                     <Iconify
                        icon={collapse.value ? 'eva:arrow-ios-upward-fill' : 'eva:arrow-ios-downward-fill'}
                     />
                  </IconButton>
               )}
            </TableCell>

            {/* 2. Checkbox Column */}
            <TableCell padding="checkbox">
               <Checkbox id={row.id} checked={selected} onClick={onSelectRow} />
            </TableCell>

            {/* 3. Name */}
            <TableCell>
               <ListItemText
                  primary={
                     <Typography
                        variant="body2"
                        noWrap
                        sx={{
                           fontWeight: 600,
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

            {/* 4. Created At */}
            <TableCell>
               <Box sx={{ gap: 0.5, display: 'flex', flexDirection: 'column' }}>
                  <span>{fDate(row.created_at)}</span>
                  <Box component="span" sx={{ typography: 'caption', color: 'text.secondary' }}>
                     {fTime(row.created_at)}
                  </Box>
               </Box>
            </TableCell>

            {/* 5. Price */}
            <TableCell>
               {row.is_parent ? (
                  <Typography variant="caption" sx={{ color: 'info.main', fontWeight: 700 }}>
                     GROUP ({row.variants?.length || 0} Varian)
                  </Typography>
               ) : (
                  `${fCurrency(row.price)} / ${row.unit}`
               )}
            </TableCell>

            {/* 6. Status */}
            <TableCell>
               <Label variant="soft" color={row.is_active ? 'info' : 'default'}>
                  {row.is_active ? 'Active' : 'Inactive'}
               </Label>
            </TableCell>

            {/* 7. Actions */}
            <TableCell align="right" sx={{ px: 1, whiteSpace: 'nowrap' }}>
               {/* Only show manage variants modal if it is marked as parent (or has variants) */}
               {(row.is_parent || !row.parent_id) && (
                  <Tooltip title="Kelola Varian" placement="top" arrow>
                     <IconButton color="secondary" onClick={() => onManageVariants(row)}>
                        <Iconify icon="solar:layers-bold-duotone" />
                     </IconButton>
                  </Tooltip>
               )}

               {/* A parent flagged item CANNOT hold direct BOMs anymore per requirements */}
               {!row.is_parent && (
                  <Tooltip title="Manage BOM" placement="top" arrow>
                     <IconButton color="primary" onClick={() => onManageCogs(row.id, row.name)}>
                        <Iconify icon="solar:box-bold" />
                     </IconButton>
                  </Tooltip>
               )}

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

         {/* --------------------- Collapsible Sub-Table --------------------- */}
         {hasVariants && (
            <TableRow>
               <TableCell sx={{ p: 0, borderBottom: 'none' }} colSpan={7}>
                  <Collapse in={collapse.value} timeout="auto" unmountOnExit>
                     <Box sx={{ bgcolor: 'background.neutral', p: 2, pl: 7, pr: 3 }}>
                        <Box
                           sx={{
                              border: '1px solid',
                              borderColor: 'divider',
                              borderRadius: 1.5,
                              overflow: 'hidden',
                              boxShadow: (theme) => theme.customShadows?.z1 || 'none',
                           }}
                        >
                           <Table size="small">
                              <TableHead sx={{ bgcolor: 'background.paper' }}>
                                 <TableRow>
                                    <TableCell sx={{ fontWeight: 700, width: 240 }}>Nama Item Varian</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Harga Dasar</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Durasi Estimasi</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, pr: 2 }}>Aksi Varian</TableCell>
                                 </TableRow>
                              </TableHead>
                              <TableBody>
                                 {row.variants?.map((v) => (
                                    <TableRow key={v.id} hover sx={{ bgcolor: 'background.paper' }}>
                                       <TableCell>
                                          <Typography variant="subtitle2" sx={{ color: 'text.primary' }}>
                                             {v.name}
                                          </Typography>
                                          {v.description && (
                                             <Typography variant="caption" color="text.disabled" noWrap>
                                                {v.description}
                                             </Typography>
                                          )}
                                       </TableCell>
                                       <TableCell>{fCurrency(v.price)} / {v.unit}</TableCell>
                                       <TableCell>{v.estimated_duration || 0} Menit</TableCell>
                                       <TableCell>
                                          <Label variant="soft" color={v.is_active ? 'info' : 'default'} sx={{ height: 20 }}>
                                             {v.is_active ? 'Active' : 'Inactive'}
                                          </Label>
                                       </TableCell>
                                       <TableCell align="right" sx={{ pr: 1 }}>
                                          <Tooltip title="Manage BOM Varian" placement="top" arrow>
                                             <IconButton
                                                size="small"
                                                color="primary"
                                                onClick={() => onManageCogs(v.id, v.name)}
                                             >
                                                <Iconify icon="solar:box-bold" width={18} />
                                             </IconButton>
                                          </Tooltip>

                                          <Tooltip title="Edit Varian" placement="top" arrow>
                                             <IconButton
                                                size="small"
                                                color="default"
                                                onClick={() => router.push(paths.dashboard.service.edit(v.id))}
                                             >
                                                <Iconify icon="solar:pen-bold" width={18} />
                                             </IconButton>
                                          </Tooltip>

                                          <Tooltip title="Delete Varian" placement="top" arrow>
                                             <IconButton
                                                size="small"
                                                color="error"
                                                onClick={() => {
                                                   setVariantToDelete(v);
                                                   confirmDeleteVariant.onTrue();
                                                }}
                                             >
                                                <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                                             </IconButton>
                                          </Tooltip>
                                       </TableCell>
                                    </TableRow>
                                 ))}
                              </TableBody>
                           </Table>
                        </Box>
                     </Box>
                  </Collapse>
               </TableCell>
            </TableRow>
         )}

         {/* Delete Parent Dialog */}
         <ConfirmDialog
            open={confirmDialog.value}
            onClose={confirmDialog.onFalse}
            title="Hapus Layanan Utama"
            content="Apakah Anda yakin ingin menghapus layanan induk ini? Tindakan ini dapat berdampak pada item variannya."
            action={
               <IconButton
                  color="error"
                  onClick={() => {
                     onDeleteRow(row.id);
                     confirmDialog.onFalse();
                  }}
               >
                  <Iconify icon="solar:trash-bin-trash-bold" />
               </IconButton>
            }
         />

         {/* Delete Variant Dialog */}
         <ConfirmDialog
            open={confirmDeleteVariant.value}
            onClose={() => {
               confirmDeleteVariant.onFalse();
               setVariantToDelete(null);
            }}
            title="Hapus Varian Layanan"
            content={`Apakah Anda yakin ingin menghapus varian "${variantToDelete?.name}"? Data ini akan hilang selamanya.`}
            action={
               <IconButton
                  color="error"
                  onClick={() => {
                     if (variantToDelete) {
                        onDeleteRow(variantToDelete.id);
                     }
                     confirmDeleteVariant.onFalse();
                     setVariantToDelete(null);
                  }}
               >
                  <Iconify icon="solar:trash-bin-trash-bold" />
               </IconButton>
            }
         />
      </>
   );
}
