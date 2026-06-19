// Lazy wrapper — self-contained page (no required props)
import { OrganizationDashboard } from '../components/parent/OrganizationDashboard';
export default function OrganizationsPage() {
  return <OrganizationDashboard onClose={() => {}} />;
}
