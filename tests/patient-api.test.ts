import assert from "node:assert/strict";
import test from "node:test";
import patientExport from "../vthacks-openemr/patients.json" with { type: "json" };
import { getPatientById, getPatients, parsePatientExport } from "../src/data/patient-api.ts";

test("the patient list preserves the complete OpenEMR export in source order", async () => {
  assert.deepEqual(
    await getPatients(),
    patientExport.map((record) => ({
      patient_id: String(record.id),

      name: record.name,
      dob: record.dob,
      sex: record.sex,

      conditions: record.conditions ?? [],
      medications: record.medications ?? [],

      observations: record.observations ?? [],
      visit_history: record.visit_history ?? [],
    })),
  );
});

test("every exported ID resolves to its own record and missing IDs do not return a fallback patient", async () => {
  for (const patient of await getPatients()) {
    assert.deepEqual(await getPatientById(patient.patient_id), patient);
  }
  assert.equal(await getPatientById("not-in-the-export"), null);
});

test("returned records cannot mutate later requests or the source export", async () => {
  const baseline = structuredClone(patientExport);
  const records = await getPatients();
  records[0]!.conditions.push("Test mutation");
  records[0]!.name = "Changed name";
  assert.deepEqual(patientExport, baseline);
  assert.equal((await getPatients())[0]!.name, baseline[0]!.name);
  assert.deepEqual((await getPatients())[0]!.conditions, baseline[0]!.conditions);
});

test("missing optional data remains absent without inventing demographics or clinical findings", () => {
  assert.deepEqual(parsePatientExport([{ id: 25, name: "Test record" }]), [
    {
      patient_id: "25",
      name: "Test record",
      dob: null,
      sex: null,
      conditions: [],
      medications: [],
    },
  ]);
  assert.equal(
    parsePatientExport([{ id: 25, name: "Test record", dob: "", sex: "" }])[0]!.dob,
    null,
  );
});

test("an empty export stays empty and new records require no hardcoded patient mapping", () => {
  assert.deepEqual(parsePatientExport([]), []);
  const additional = { ...patientExport[0], id: 9001, name: "Added export record" };
  const result = parsePatientExport([...patientExport, additional]);
  assert.equal(result.length, patientExport.length + 1);
  assert.equal(result.at(-1)!.patient_id, "9001");
});

test("ambiguous IDs and malformed records fail instead of silently substituting demo data", () => {
  const record = { id: 1, name: "Test record" };
  for (const invalid of [
    [record, { ...record, id: "1" }],
    [{ ...record, dob: "2026-02-30" }],
    [{ ...record, conditions: "Not an array" }],
    [{ ...record, name: "" }],
    { patients: [record] },
  ]) {
    assert.throws(() => parsePatientExport(invalid), /OpenEMR patient export is invalid/);
  }
});
