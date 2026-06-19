// Lazy wrapper — self-contained page (no required props)
import { TemplateMarketplace } from '../components/parent/TemplateMarketplace';
export default function MarketplacePage() {
  return <TemplateMarketplace onClose={() => {}} onFork={() => {}} />;
}
