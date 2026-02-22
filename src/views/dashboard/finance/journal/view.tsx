'use client';

import { useState, useCallback, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import TableBody from '@mui/material/TableBody';
import IconButton from '@mui/material/IconButton';
import TableContainer from '@mui/material/TableContainer';

import { paths } from 'src/routes/al/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { fDate } from 'src/utils/format-time';
import { fCurrency } from 'src/utils/format-number';

import { DashboardContent } from 'src/layouts/dashboard';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import {
   useTable,
   emptyRows,
   TableNoData,
   getComparator,
   TableEmptyRows,
   TableHeadCustom,
   TableSelectedAction,
   TablePaginationCustom,
} from 'src/components/table';

import { Journal } from 'src/types/journal';
import useJournalStore from 'src/stores/journal';
import { useBoolean } from 'minimal-shared/hooks';

import JournalTableToolbar from './journal-table-toolbar';
import JournalTableFiltersResult from './journal-table-filters-result';
import JournalTableRow from './journal-table-row';

// ----------------------------------------------------------------------

const TABLE_HEAD = [
   { id: 'trx_date', label: 'Date', width: 140 },
   { id: 'trx_type', label: 'Type', width: 120 },
   { id: 'trx_category', label: 'Category', width: 180 },
   { id: 'amount', label: 'Amount', width: 140 },
   { id: '', width: 88 },
];

const defaultFilters = {
   name: '',
   trx_type: [],
   startDate: null,
   endDate: null,
};

// ----------------------------------------------------------------------

export default function JournalListView() {
   const table = useTable({ defaultOrderBy: 'trx_date' });

   const router = useRouter();

   const confirm = useBoolean();

   const [tableData, setTableData] = useState<Journal[]>([]);

   const [filters, setFilters] = useState(defaultFilters);

   const { journals, getAll, delete: deleteJournal, loading } = useJournalStore();

   useEffect(() => {
      getAll();
   }, [getAll]);

   useEffect(() => {
      setTableData(journals);
   }, [journals]);

   const dataFiltered = applyFilter({
      inputData: tableData,
      comparator: getComparator(table.order, table.orderBy),
      filters,
   });

   const dataInPage = dataFiltered.slice(
      table.page * table.rowsPerPage,
      table.page * table.rowsPerPage + table.rowsPerPage
   );

   const denseHeight = table.dense ? 56 : 76;

   const canReset =
      !!filters.name || !!filters.trx_type.length || (!!filters.startDate && !!filters.endDate);

   const notFound = (!dataFiltered.length && canReset) || !dataFiltered.length;

   const handleFilters = useCallback(
      (name: string, value: any) => {
         table.onResetPage();
         setFilters((prevState) => ({
            ...prevState,
            [name]: value,
         }));
      },
      [table]
   );

   const handleDeleteRow = useCallback(
      async (id: string) => {
         try {
            await deleteJournal(id);
            getAll(); // REFRESH
         } catch (error) {
            console.error(error);
         }
      },
      [deleteJournal, getAll]
   );

   const handleResetFilters = useCallback(() => {
      setFilters(defaultFilters);
   }, []);

   return (
      <>
         <DashboardContent>
            <CustomBreadcrumbs
               heading="Journal List"
               links={[
                  { name: 'Dashboard', href: paths.dashboard.root },
                  { name: 'Finance', href: paths.dashboard.finance.root },
                  { name: 'List' },
               ]}
               action={
                  <Button
                     component={RouterLink}
                     href={paths.dashboard.finance.journal.new}
                     variant="contained"
                     startIcon={<Iconify icon="mingcute:add-line" />}
                  >
                     New Transaction
                  </Button>
               }
               sx={{ mb: { xs: 3, md: 5 } }}
            />

            <Card>
               <JournalTableToolbar
                  filters={filters}
                  onFilters={handleFilters}
                  //
                  roleOptions={['income', 'expense']}
               />

               {canReset && (
                  <JournalTableFiltersResult
                     filters={filters}
                     onFilters={handleFilters}
                     //
                     onResetFilters={handleResetFilters}
                     results={dataFiltered.length}
                     sx={{ p: 2.5, pt: 0 }}
                  />
               )}

               <Box sx={{ position: 'relative' }}>
                  <Scrollbar>
                     <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 960 }}>
                        <TableHeadCustom
                           order={table.order}
                           orderBy={table.orderBy}
                           headCells={TABLE_HEAD}
                           rowCount={tableData.length}
                           numSelected={table.selected.length}
                           onSort={table.onSort}
                           onSelectAllRows={(checked) =>
                              table.onSelectAllRows(
                                 checked,
                                 tableData.map((row) => row.id)
                              )
                           }
                        />

                        <TableBody>
                           {dataFiltered
                              .slice(
                                 table.page * table.rowsPerPage,
                                 table.page * table.rowsPerPage + table.rowsPerPage
                              )
                              .map((row) => (
                                 <JournalTableRow
                                    key={row.id}
                                    row={row}
                                    selected={table.selected.includes(row.id)}
                                    onSelectRow={() => table.onSelectRow(row.id)}
                                    onDeleteRow={() => handleDeleteRow(row.id)}
                                    onEditRow={() =>
                                       router.push(paths.dashboard.finance.journal.edit(row.id))
                                    }
                                 />
                              ))}

                           <TableEmptyRows
                              height={denseHeight}
                              emptyRows={emptyRows(table.page, table.rowsPerPage, tableData.length)}
                           />

                           <TableNoData notFound={notFound} />
                        </TableBody>
                     </Table>
                  </Scrollbar>
               </Box>

               <TablePaginationCustom
                  count={dataFiltered.length}
                  page={table.page}
                  rowsPerPage={table.rowsPerPage}
                  onPageChange={table.onChangePage}
                  onRowsPerPageChange={table.onChangeRowsPerPage}
                  //
                  dense={table.dense}
                  onChangeDense={table.onChangeDense}
               />
            </Card>
         </DashboardContent>
      </>
   );
}

// ----------------------------------------------------------------------

function applyFilter({
   inputData,
   comparator,
   filters,
}: {
   inputData: Journal[];
   comparator: (a: any, b: any) => number;
   filters: typeof defaultFilters;
}) {
   const { name, trx_type, startDate, endDate } = filters;

   const stabilizedThis = (inputData || []).map((el, index) => [el, index] as const);

   stabilizedThis.sort((a, b) => {
      const order = comparator(a[0], b[0]);
      if (order !== 0) return order;
      return a[1] - b[1];
   });

   inputData = stabilizedThis.map((el) => el[0]);

   if (name) {
      inputData = inputData.filter(
         (journal) =>
            journal.trx_category?.toLowerCase().indexOf(name.toLowerCase()) !== -1 ||
            journal.notes?.toLowerCase().indexOf(name.toLowerCase()) !== -1
      );
   }

   if (trx_type.length) {
      inputData = inputData.filter((journal) => trx_type.includes(journal.trx_type as never));
   }

   if (startDate && endDate) {
      inputData = inputData.filter(
         (journal) =>
            fDate(journal.trx_date) >= fDate(startDate) && fDate(journal.trx_date) <= fDate(endDate)
      );
   }

   return inputData;
}
