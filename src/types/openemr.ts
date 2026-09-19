export interface VisitHistory {
  date: string;
  reason: string;
  notes: string;
}

export interface Observation {
  type: string;
  value: number;
  unit: string;
  date: string;
}

export interface OpenEMRPatient {
  id: number;
  name: string;
  dob: string;
  sex: string;

  conditions: string[];
  medications: string[];
  observations: Observation[];
  visit_history: VisitHistory[];
}
