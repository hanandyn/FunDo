// Lazy wrapper — self-contained page (no required props)
import { TeacherDashboard } from '../components/parent/TeacherDashboard';
export default function TeacherDashboardPage() {
  return <TeacherDashboard onClose={() => {}} />;
}
