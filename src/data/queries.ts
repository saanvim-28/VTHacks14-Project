import { queryOptions } from "@tanstack/react-query";
import { getPatientById, getPatients } from "./patient-api";

export const patientsQuery = () =>
  queryOptions({ queryKey: ["openemr", "patients"], queryFn: getPatients, staleTime: Infinity });
export const patientQuery = (id: string) =>
  queryOptions({
    queryKey: ["openemr", "patient", id],
    queryFn: () => getPatientById(id),
    staleTime: Infinity,
  });
