'use client';

import { paths } from 'src/routes/al/paths';
import { CatalogView } from '../catalog/view';

export function AgentOrderView() {
   return <CatalogView title="Agent Order" checkoutHref={paths.dashboard.agents.checkout} />;
}
