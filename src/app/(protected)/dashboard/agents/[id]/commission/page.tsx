import { CONFIG } from 'src/global-config';
import { AgentCommissionView } from 'src/views/dashboard/agents/commission/view';

export const metadata = { title: `Manage Commission Rates - ${CONFIG.appName}` };

export default function Page() {
   return <AgentCommissionView />;
}
