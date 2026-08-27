import { PageHeader } from '@/components/ui/page-header';
import { JobList } from '@/components/features/job-list';

// Reports exist for any job that finished, including a partial one: a run that
// skipped the sandbox or lost a feed still produced a scored, downloadable report,
// and filtering to `completed` alone would hide most of them.
const FINISHED = ['completed', 'partial'];

export default function ReportsPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader 
        title="Analysis Reports" 
        description="Completed analyses with generated SOC-ready reports." 
      />
      <div className="mt-6">
        <JobList
          status={FINISHED}
          hrefBase="/reports"
          emptyTitle="No reports yet"
          emptyDescription="Reports appear here once an analysis finishes."
        />
      </div>
    </div>
  );
}
