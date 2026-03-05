import { useState, useEffect } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { toast } from 'src/components/snackbar';
import useServiceStore from 'src/stores/service';
import useRawMaterialStore from 'src/stores/raw-material';
import type { RawMaterial } from 'src/types/raw-material';

type Props = {
   open: boolean;
   onClose: () => void;
   serviceId: string;
   serviceName: string;
};

export function ServiceCogsDialog({ open, onClose, serviceId, serviceName }: Props) {
   const { fetchServiceCogs, createServiceCog, deleteServiceCog } = useServiceStore();
   const { getAll } = useRawMaterialStore();

   const [cogs, setCogs] = useState<any[]>([]);
   const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
   const [loading, setLoading] = useState(false);

   const [newCog, setNewCog] = useState({
      raw_material_id: '',
      qty: '',
   });

   useEffect(() => {
      if (open && serviceId) {
         loadData();
      }
   }, [open, serviceId]);

   const loadData = async () => {
      setLoading(true);
      try {
         const [cogsRes, rmRes] = await Promise.all([fetchServiceCogs(serviceId), getAll()]);
         setCogs(cogsRes?.data || []);
         setRawMaterials(rmRes || []);
      } catch (error) {
         toast.error('Failed to load Service COGS');
      } finally {
         setLoading(false);
      }
   };

   const handleAdd = async () => {
      if (!newCog.raw_material_id || !newCog.qty) {
         toast.error('Please fill all fields');
         return;
      }
      try {
         const selectedRm = rawMaterials.find((rm) => rm.id === newCog.raw_material_id);

         await createServiceCog({
            service_id: serviceId,
            raw_material_id: newCog.raw_material_id,
            qty: parseFloat(newCog.qty),
            unit: selectedRm?.unit || '',
         });
         toast.success('BOM item added');
         setNewCog({ raw_material_id: '', qty: '' });
         loadData();
      } catch (error: any) {
         toast.error(error?.response?.data?.message || 'Failed to add item');
      }
   };

   const handleDelete = async (id: string) => {
      try {
         await deleteServiceCog(id);
         toast.success('BOM item deleted');
         loadData();
      } catch (error) {
         toast.error('Failed to delete item');
      }
   };

   const handleClose = () => {
      setNewCog({ raw_material_id: '', qty: '' });
      onClose();
   };

   return (
      <Dialog fullWidth maxWidth="md" open={open} onClose={handleClose}>
         <DialogTitle>Bill of Materials (BOM) - {serviceName}</DialogTitle>

         <DialogContent dividers>
            <Stack
               direction={{ xs: 'column', md: 'row' }}
               spacing={2}
               sx={{ mb: 3, alignItems: 'center' }}
            >
               <TextField
                  select
                  fullWidth
                  label="Raw Material"
                  value={newCog.raw_material_id}
                  onChange={(e) => setNewCog({ ...newCog, raw_material_id: e.target.value })}
               >
                  {rawMaterials.map((rm) => (
                     <MenuItem key={rm.id} value={rm.id}>
                        {rm.title} ({rm.unit})
                     </MenuItem>
                  ))}
               </TextField>

               <TextField
                  fullWidth
                  type="number"
                  label="Quantity"
                  value={newCog.qty}
                  onChange={(e) => setNewCog({ ...newCog, qty: e.target.value })}
               />

               <Button
                  variant="contained"
                  startIcon={<Iconify icon="mingcute:add-line" />}
                  onClick={handleAdd}
                  sx={{ whiteSpace: 'nowrap', height: 56 }}
               >
                  Add Item
               </Button>
            </Stack>

            <Scrollbar>
               <Table size="small" sx={{ minWidth: 600 }}>
                  <TableHead>
                     <TableRow>
                        <TableCell>Raw Material</TableCell>
                        <TableCell>Quantity</TableCell>
                        <TableCell>Unit</TableCell>
                        <TableCell align="right">Actions</TableCell>
                     </TableRow>
                  </TableHead>
                  <TableBody>
                     {loading ? (
                        <TableRow>
                           <TableCell colSpan={4} align="center">
                              Loading...
                           </TableCell>
                        </TableRow>
                     ) : cogs.length === 0 ? (
                        <TableRow>
                           <TableCell colSpan={4} align="center">
                              No BOM items found
                           </TableCell>
                        </TableRow>
                     ) : (
                        cogs.map((row) => (
                           <TableRow key={row.id}>
                              <TableCell>{row.raw_material?.title}</TableCell>
                              <TableCell>{row.qty}</TableCell>
                              <TableCell>{row.unit}</TableCell>
                              <TableCell align="right">
                                 <IconButton color="error" onClick={() => handleDelete(row.id)}>
                                    <Iconify icon="solar:trash-bin-trash-bold" />
                                 </IconButton>
                              </TableCell>
                           </TableRow>
                        ))
                     )}
                  </TableBody>
               </Table>
            </Scrollbar>
         </DialogContent>

         <DialogActions>
            <Button onClick={handleClose}>Close</Button>
         </DialogActions>
      </Dialog>
   );
}
