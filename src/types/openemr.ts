export interface VisitHistory {
  date: string;
  reason: string;
  notes: string;
}

export interface OpenEMRPatient {
  id: number;
  name: string;
  dob: string;
  sex: string;

  conditions: string[];
  medications: string[];

  visit_history: VisitHistory[];
}
