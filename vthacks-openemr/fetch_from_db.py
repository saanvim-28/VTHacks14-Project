import json
import pymysql

# Connect directly to your local Docker MySQL container
connection = pymysql.connect(
    host="localhost",
    port=3306,
    user="openemr",
    password="openemrpassword",
    database="openemr",
    cursorclass=pymysql.cursors.DictCursor,
)

patient_records = []

try:
  with connection.cursor() as cursor:
    # 1. Fetch all patient demographics
    cursor.execute("SELECT pid, fname, lname, DOB, sex FROM patient_data")
    patients = cursor.fetchall()

    for p in patients:
      pid = p["pid"]

      # 2. Fetch medical problems and medications for this specific patient
      sql_lists = """
                SELECT title, type, subtype 
                FROM lists 
                WHERE type IN ('medical_problem', 'medication') AND pid = %s
            """
      cursor.execute(sql_lists, (pid,))
      clinical_items = cursor.fetchall()

      # Filter out conditions and medications into separate lists
      conditions = [
          item["title"]
          for item in clinical_items
          if item["type"] == "medical_problem"
      ]
      medications = [
          item["title"] for item in clinical_items if item["type"] == "medication"
      ]

      # Build a clean dictionary for this patient
      patient_records.append({
          "id": pid,
          "name": f"{p['fname']} {p['lname']}",
          "dob": str(p["DOB"]),
          "sex": p["sex"],
          "conditions": conditions,
          "medications": medications,
      })

finally:
  connection.close()

# 3. Save everything to a JSON file
filename = "patients.json"
with open(filename, "w") as f:
  json.dump(patient_records, f, indent=2)

print(
    f"\nSuccessfully exported {len(patient_records)} patient records to"
    f" '{filename}'!"
)