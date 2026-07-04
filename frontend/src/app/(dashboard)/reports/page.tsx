import { PageHeader } from "@/components/ui/page-header";
import { JobList } from "@/components/features/job-list";

export default function ReportsPage() {
  return (
    <div>
      <PageHeader title="Reports" description="Completed analyses with generated reports." />
      <JobList status="completed" hrefBase="/reports" />
    </div>
  );
}
