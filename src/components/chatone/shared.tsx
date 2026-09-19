import { AlertCircle, FileSearch, LoaderCircle } from "lucide-react";
import { Link, useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function PageSkeleton() {
  return (
    <main className="page-shell">
      <div className="space-y-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-5 w-96 max-w-full" />
      </div>
      <div className="mt-9 space-y-4">
        {[1, 2, 3].map((n) => (
          <Skeleton key={n} className="h-36 w-full rounded-xl" />
        ))}
      </div>
    </main>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="empty-state">
      <FileSearch className="size-9 text-muted-foreground" />
      <h2>{title}</h2>
      <p>{body}</p>
      <Button asChild variant="outline">
        <Link to="/">Return to queue</Link>
      </Button>
    </div>
  );
}

export function RouteError({ error }: { error: Error }) {
  const router = useRouter();
  return (
    <main className="page-shell">
      <div className="empty-state">
        <AlertCircle className="size-9 text-destructive" />
        <h2>We couldn’t load this clinical view</h2>
        <p>{error.message || "The data service did not respond. No changes were made."}</p>
        <Button onClick={() => router.invalidate()}>
          <LoaderCircle />
          Try again
        </Button>
      </div>
    </main>
  );
}

export function PatientContext({ name, id }: { name: string; id: string }) {
  return (
    <div className="patient-context">
      <span>{name}</span>
      <span className="context-separator" />
      <span>Patient ID {id}</span>
    </div>
  );
}

export function DataUnavailable() {
  return (
    <div className="empty-state">
      <FileSearch className="size-9 text-muted-foreground" />
      <h2>No matching record found</h2>
      <p>This patient ID is not present in the OpenEMR export.</p>
      <Button asChild>
        <Link to="/">View patient queue</Link>
      </Button>
    </div>
  );
}
