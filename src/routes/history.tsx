import { createFileRoute } from '@tanstack/react-router';
import { HistoryView } from '@/features/medications/components/HistoryView';

export const Route = createFileRoute('/history')({
  component: HistoryPage,
});

function HistoryPage() {
  return <HistoryView />;
}
