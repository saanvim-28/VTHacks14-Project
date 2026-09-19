import { queryOptions } from "@tanstack/react-query";
import { getBriefingForPatient, getMatchesForPatient, getPatientById, getPatients } from "./mock-api";

export const patientsQuery = () => queryOptions({ queryKey: ["patients"], queryFn: getPatients, staleTime: 60_000 });
export const patientQuery = (id: string) => queryOptions({ queryKey: ["patient", id], queryFn: () => getPatientById(id), staleTime: 60_000 });
export const matchesQuery = (id: string) => queryOptions({ queryKey: ["matches", id], queryFn: () => getMatchesForPatient(id), staleTime: 60_000 });
export const briefingQuery = (id: string, product: string) => queryOptions({ queryKey: ["briefing", id, product], queryFn: () => getBriefingForPatient(id, product), staleTime: 60_000 });
