import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/patients/$patientId")({
  component: PatientLayout,
});

function PatientLayout() {
  return <Outlet />;
}
