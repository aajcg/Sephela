import { PageHeader } from '@/components/ui/page-header';
import { JobList } from '@/components/features/job-list';

export default function TasksPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader 
        title="Tasks Pipeline" 
        description="Monitor active and completed analysis jobs in real-time." 
      />
      <div className="mt-6">
        <JobList hrefBase="/tasks" />
      </div>
    </div>
  );
}
