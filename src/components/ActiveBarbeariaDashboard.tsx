import React from 'react';
import { Barbearia, Usuario } from '../services/pocketbase';
import { DashboardAdminView } from '../pages/DashboardAdminView';

export interface ActiveBarbeariaDashboardProps {
  user: Usuario;
  barbearia: Barbearia | null;
  onBarbeariaUpdated?: (barbearia: Barbearia) => void;
  onLogout?: () => void;
  onOpenVitrine?: (slug: string) => void;
  onOpenSuperAdmin?: () => void;
}

export const ActiveBarbeariaDashboard: React.FC<ActiveBarbeariaDashboardProps> = (props) => {
  return <DashboardAdminView {...props} />;
};

export default ActiveBarbeariaDashboard;
