'use client';

import { useEffect, useState } from 'react';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';

import { paths } from 'src/routes/al/paths';
import { DashboardContent } from 'src/layouts/dashboard';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import useAgentStore from 'src/stores/agent';
import { LoadingScreen } from 'src/components/loading-screen';
import { fCurrency } from 'src/utils/format-number';

export function AgentReportView() {
   const { financeReports, grandTotalSales, grandTotalCommission, fetchFinanceReport } = useAgentStore();
   const [loading, setLoading] = useState(true);

   useEffect(() => {
      const fetchData = async () => {
         setLoading(true);
         await fetchFinanceReport();
         setLoading(false);
      };
      fetchData();
   }, [fetchFinanceReport]);

   if (loading) {
      return <LoadingScreen />;
   }

   return (
      <DashboardContent>
         <CustomBreadcrumbs
            heading="Agent Finance Report"
            links={[
               { name: 'Dashboard', href: paths.dashboard.root },
               { name: 'Agent Report' },
            ]}
            sx={{ mb: { xs: 3, md: 5 } }}
         />

         <Card>
            <TableContainer sx={{ minWidth: 800 }}>
               <Table>
                  <TableHead>
                     <TableRow>
                        <TableCell>Agent Name</TableCell>
                        <TableCell>Agent Code</TableCell>
                        <TableCell>Total Orders</TableCell>
                        <TableCell>Total Sales</TableCell>
                        <TableCell>Total Commission</TableCell>
                     </TableRow>
                  </TableHead>
                  <TableBody>
                     {financeReports.map((row) => (
                        <TableRow key={row.agent_id}>
                           <TableCell>{row.agent_name}</TableCell>
                           <TableCell>{row.agent_code}</TableCell>
                           <TableCell>{row.total_orders}</TableCell>
                           <TableCell>{fCurrency(row.total_sales)}</TableCell>
                           <TableCell>{fCurrency(row.total_commission)}</TableCell>
                        </TableRow>
                     ))}
                     {financeReports.length === 0 && (
                        <TableRow>
                           <TableCell colSpan={5} align="center">
                              No data found
                           </TableCell>
                        </TableRow>
                     )}
                     <TableRow sx={{ '& td': { fontWeight: 'bold' } }}>
                        <TableCell colSpan={3} align="right">
                           GRAND TOTAL
                        </TableCell>
                        <TableCell>{fCurrency(grandTotalSales)}</TableCell>
                        <TableCell>{fCurrency(grandTotalCommission)}</TableCell>
                     </TableRow>
                  </TableBody>
               </Table>
            </TableContainer>
         </Card>
      </DashboardContent>
   );
}
