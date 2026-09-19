import patientExport from "../vthacks-openemr/patients.json" with { type: "json" };

import { getPatientById, getPatients, parsePatientExport } from "../src/data/patient-api.ts";

/**
 * Simple assertion helper.
 *
 * Throws an error if the condition is false.
 */
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Test failed: ${message}`);
  }
}

/**
 * Compares two values using their JSON representation.
 *
 * This is sufficient for the plain patient objects
 * used by these tests.
 */
function assertDeepEqual(actual: unknown, expected: unknown, message: string): void {
  const actualJson = JSON.stringify(actual);

  const expectedJson = JSON.stringify(expected);

  if (actualJson !== expectedJson) {
    throw new Error(
      `Test failed: ${message}\n\n` + `Expected:\n${expectedJson}\n\n` + `Actual:\n${actualJson}`,
    );
  }
}

/**
 * Verifies that a function throws an error.
 */
function assertThrows(callback: () => void, message: string): void {
  let threw = false;

  try {
    callback();
  } catch {
    threw = true;
  }

  if (!threw) {
    throw new Error(`Test failed: ${message}`);
  }
}

/**
 * Runs one test and prints the result.
 */
async function runTest(name: string, testFunction: () => void | Promise<void>): Promise<void> {
  try {
    await testFunction();

    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);

    throw error;
  }
}

/**
 * Test 1
 *
 * The API should normalize the OpenEMR export
 * without changing its source order.
 */
async function testPatientList(): Promise<void> {
  const expected = parsePatientExport(patientExport);

  const actual = await getPatients();

  assertDeepEqual(actual, expected, "Patient list should match the normalized OpenEMR export.");
}

/**
 * Test 2
 *
 * Every patient ID should resolve to the correct patient.
 */
async function testPatientLookup(): Promise<void> {
  const patients = await getPatients();

  for (const patient of patients) {
    const result = await getPatientById(patient.patient_id);

    assertDeepEqual(result, patient, `Patient ${patient.patient_id} should resolve correctly.`);
  }

  const missing = await getPatientById("not-in-the-export");

  assert(missing === null, "Unknown patient IDs should return null.");
}

/**
 * Test 3
 *
 * Mutating returned patient data should not modify
 * the original OpenEMR JSON or future API responses.
 */
async function testMutationSafety(): Promise<void> {
  const baseline = structuredClone(patientExport);

  const records = await getPatients();

  assert(records.length > 0, "Patient export should contain at least one patient.");

  const firstPatient = records[0];

  if (!firstPatient) {
    throw new Error("Test failed: First patient does not exist.");
  }

  firstPatient.conditions.push("Test mutation");

  firstPatient.name = "Changed name";

  assertDeepEqual(
    patientExport,
    baseline,
    "Mutating returned records must not mutate patients.json.",
  );

  const freshRecords = await getPatients();

  const freshFirstPatient = freshRecords[0];

  const baselineFirstPatient = baseline[0];

  if (!freshFirstPatient || !baselineFirstPatient) {
    throw new Error("Test failed: Expected first patient.");
  }

  assert(
    freshFirstPatient.name === baselineFirstPatient.name,
    "A new request should restore the original patient name.",
  );

  assertDeepEqual(
    freshFirstPatient.conditions,
    baselineFirstPatient.conditions ?? [],
    "A new request should not contain previous mutations.",
  );
}

/**
 * Test 4
 *
 * Missing optional data should be normalized to
 * safe default values.
 */
function testMissingOptionalData(): void {
  const result = parsePatientExport([
    {
      id: 25,
      name: "Test record",
    },
  ]);

  assertDeepEqual(
    result,
    [
      {
        patient_id: "25",

        name: "Test record",

        dob: null,

        sex: null,

        conditions: [],

        medications: [],

        observations: [],

        visit_history: [],
      },
    ],
    "Missing optional patient data should be normalized.",
  );

  const emptyDemographics = parsePatientExport([
    {
      id: 25,

      name: "Test record",

      dob: "",

      sex: "",
    },
  ]);

  assert(emptyDemographics[0]?.dob === null, "Empty DOB should become null.");

  assert(emptyDemographics[0]?.sex === null, "Empty sex should become null.");
}

/**
 * Test 5
 *
 * The API should support empty exports and newly
 * added patients without hardcoded mappings.
 */
function testAdditionalPatients(): void {
  assertDeepEqual(parsePatientExport([]), [], "Empty patient export should remain empty.");

  const firstExportedPatient = patientExport[0];

  if (!firstExportedPatient) {
    throw new Error("Test failed: Expected at least one exported patient.");
  }

  const additional = {
    ...firstExportedPatient,

    id: 9001,

    name: "Added export record",
  };

  const result = parsePatientExport([...patientExport, additional]);

  assert(
    result.length === patientExport.length + 1,
    "New patient should be added without hardcoded mappings.",
  );

  assert(result.at(-1)?.patient_id === "9001", "New patient should use the normalized patient ID.");
}

/**
 * Test 6
 *
 * Invalid patient exports should fail validation.
 */
function testInvalidRecords(): void {
  const record = {
    id: 1,
    name: "Test record",
  };

  const invalidRecords: unknown[] = [
    // Duplicate normalized ID.
    [
      record,

      {
        ...record,
        id: "1",
      },
    ],

    // Invalid date.
    [
      {
        ...record,
        dob: "2026-02-30",
      },
    ],

    // Conditions must be an array.
    [
      {
        ...record,
        conditions: "Not an array",
      },
    ],

    // Name cannot be empty.
    [
      {
        ...record,
        name: "",
      },
    ],

    // Export itself must be an array.
    {
      patients: [record],
    },
  ];

  for (const invalid of invalidRecords) {
    assertThrows(
      () => parsePatientExport(invalid),

      "Malformed patient exports should throw an error.",
    );
  }
}

/**
 * Run all validation tests.
 */
async function runTests(): Promise<void> {
  console.log("\nRunning patient API tests...\n");

  await runTest("patient list preserves OpenEMR source order", testPatientList);

  await runTest("patient IDs resolve correctly", testPatientLookup);

  await runTest("returned records cannot mutate source data", testMutationSafety);

  await runTest("missing optional data is normalized", testMissingOptionalData);

  await runTest("new patients require no hardcoded mapping", testAdditionalPatients);

  await runTest("malformed patient records fail validation", testInvalidRecords);

  console.log("\n✓ All patient API tests passed.\n");
}

void runTests();
