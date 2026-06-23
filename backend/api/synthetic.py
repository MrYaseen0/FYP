"""
Healtheon — Synthetic Case Generator API

Returns pre-built synthetic cases for demo and evaluation purposes.
These cases are taken from classic medical education scenarios (textbook presentations).
They contain NO real patient data and are clearly labelled as synthetic.
"""
import random
from fastapi import APIRouter

router = APIRouter(prefix="/api/synthetic", tags=["synthetic"])

SYNTHETIC_CASES = [
    {
        "id": "synth_001",
        "label": "Classic STEMI Presentation",
        "chief_complaint": "Sudden severe crushing chest pain radiating to the left arm",
        "onset": "45 minutes ago",
        "duration": "Ongoing, unrelenting",
        "severity": 9,
        "associated_symptoms": "Diaphoresis, nausea, vomiting, shortness of breath, feeling of impending doom",
        "past_medical_history": "Hypertension (10 years), Type 2 Diabetes Mellitus, hypercholesterolaemia, \
smoker (20 pack-years)",
        "current_medications": "Metformin 500mg BD, Atorvastatin 40mg ON, Amlodipine 5mg OD",
        "allergies": "Penicillin (rash)",
        "teaching_differentials": ["STEMI", "NSTEMI", "Unstable Angina", "Aortic Dissection"],
    },
    {
        "id": "synth_002",
        "label": "Thunderclap Headache",
        "chief_complaint": "Worst headache of my life, sudden onset",
        "onset": "1 hour ago, instantaneous onset",
        "duration": "Persistent and severe",
        "severity": 10,
        "associated_symptoms": "Neck stiffness, photophobia, vomiting once, no focal neurological deficit",
        "past_medical_history": "No significant past medical history. Non-smoker.",
        "current_medications": "None",
        "allergies": "None",
        "teaching_differentials": ["Subarachnoid Haemorrhage", "Meningitis", "Hypertensive Emergency", "Migraine"],
    },
    {
        "id": "synth_003",
        "label": "Suspected Pulmonary Embolism",
        "chief_complaint": "Sudden onset breathlessness and sharp left-sided chest pain",
        "onset": "3 hours ago",
        "duration": "Progressive",
        "severity": 7,
        "associated_symptoms": "Mild haemoptysis, left calf swelling and tenderness for 3 days, \
tachycardia on self-check",
        "past_medical_history": "Long-haul flight 5 days ago (14 hours), OCP use, no prior clotting disorders",
        "current_medications": "Combined oral contraceptive pill",
        "allergies": "None known",
        "teaching_differentials": ["Pulmonary Embolism", "Pneumothorax", "Pleuritis", "Pneumonia"],
    },
    {
        "id": "synth_004",
        "label": "Acute Ischaemic Stroke",
        "chief_complaint": "Sudden weakness of right arm and leg with slurred speech",
        "onset": "30 minutes ago",
        "duration": "Ongoing",
        "severity": 8,
        "associated_symptoms": "Facial droop on right side, difficulty finding words (expressive dysphasia), \
no headache, no loss of consciousness",
        "past_medical_history": "Atrial fibrillation (on Warfarin but missed doses this week), \
hypertension, previous TIA 2 years ago",
        "current_medications": "Warfarin 5mg OD, Ramipril 10mg OD, Bisoprolol 2.5mg OD",
        "allergies": "None",
        "teaching_differentials": ["Ischaemic Stroke", "Haemorrhagic Stroke", "Todd's Palsy", "Hypoglycaemia"],
    },
    {
        "id": "synth_005",
        "label": "Diabetic Ketoacidosis",
        "chief_complaint": "Nausea, vomiting, and abdominal pain with confusion",
        "onset": "24 hours ago, gradual onset",
        "duration": "Worsening",
        "severity": 8,
        "associated_symptoms": "Polyuria, polydipsia, fruity breath odour, Kussmaul breathing, \
generalized abdominal pain",
        "past_medical_history": "Type 1 Diabetes Mellitus (diagnosed age 14), missed insulin doses \
for 2 days",
        "current_medications": "Insulin Glargine 20 units ON, Insulin Aspart sliding scale",
        "allergies": "None",
        "teaching_differentials": ["Diabetic Ketoacidosis", "Hyperosmolar Hyperglycaemic State", \
"Alcoholic Ketoacidosis", "Acute Abdomen"],
    },
    {
        "id": "synth_006",
        "label": "Community-Acquired Pneumonia",
        "chief_complaint": "Productive cough with green sputum, fever, and right-sided chest pain",
        "onset": "5 days ago",
        "duration": "Progressive",
        "severity": 6,
        "associated_symptoms": "High-grade fever (39.2°C), pleuritic chest pain, rigors, reduced \
appetite, mild dyspnoea on exertion",
        "past_medical_history": "Asthma (well-controlled), no hospitalisations",
        "current_medications": "Salbutamol inhaler PRN, Beclomethasone inhaler BD",
        "allergies": "None",
        "teaching_differentials": ["Community-Acquired Pneumonia", "Pulmonary Embolism", "Lung Abscess",
                                    "Pleuritis"],
    },
    {
        "id": "synth_007",
        "label": "Aortic Dissection",
        "chief_complaint": "Tearing chest pain radiating to the back between the shoulder blades",
        "onset": "2 hours ago, sudden onset",
        "duration": "Persistent",
        "severity": 10,
        "associated_symptoms": "Pulse deficit in left arm, blood pressure difference between arms, \
mild confusion",
        "past_medical_history": "Marfan syndrome (known), poorly controlled hypertension",
        "current_medications": "Amlodipine 10mg OD, Lisinopril 20mg OD",
        "allergies": "Ibuprofen (GI intolerance)",
        "teaching_differentials": ["Type A Aortic Dissection", "STEMI", "Severe GERD", "Pericarditis"],
    },
    {
        "id": "synth_008",
        "label": "Sepsis (Urosepsis)",
        "chief_complaint": "Confusion, high fever, and reduced urine output",
        "onset": "12 hours ago",
        "duration": "Worsening",
        "severity": 8,
        "associated_symptoms": "Dysuria and haematuria for 3 days, high fever (40°C), rigors, \
hypotension, tachycardia",
        "past_medical_history": "Diabetes Type 2, recurrent UTIs, CKD stage 2",
        "current_medications": "Metformin 1g BD, Amlodipine 5mg OD",
        "allergies": "Trimethoprim (rash)",
        "teaching_differentials": ["Urosepsis/Septic Shock", "Acute Pyelonephritis", "AKI", "Encephalopathy"],
    },
    {
        "id": "synth_009",
        "label": "Tension Pneumothorax",
        "chief_complaint": "Sudden severe breathlessness and chest pain after central line insertion",
        "onset": "30 minutes ago",
        "duration": "Rapid progression",
        "severity": 9,
        "associated_symptoms": "Absent breath sounds on right side, tracheal deviation to left, \
hypotension, distended neck veins",
        "past_medical_history": "Admitted to ICU for ARDS",
        "current_medications": "ICU medications per chart",
        "allergies": "None documented",
        "teaching_differentials": ["Tension Pneumothorax", "Haemothorax", "Massive Pleural Effusion",
                                    "Cardiac Tamponade"],
    },
    {
        "id": "synth_010",
        "label": "Hypertensive Emergency with Encephalopathy",
        "chief_complaint": "Severe headache, blurred vision, and confusion",
        "onset": "6 hours ago",
        "duration": "Progressive",
        "severity": 9,
        "associated_symptoms": "BP recorded at 220/130 mmHg, papilloedema on fundoscopy, \
nausea, no focal neurology",
        "past_medical_history": "Known hypertension, non-compliant with medications",
        "current_medications": "Amlodipine 10mg OD (last dose 3 days ago)",
        "allergies": "None",
        "teaching_differentials": ["Hypertensive Emergency/Encephalopathy", "Ischaemic Stroke",
                                    "Intracranial Haemorrhage", "PRES"],
    },
]


@router.get("/cases")
async def list_synthetic_cases():
    """Returns all 10 pre-built synthetic cases for demo and evaluation use."""
    return {
        "count": len(SYNTHETIC_CASES),
        "cases": SYNTHETIC_CASES,
    }


@router.get("/cases/random")
async def get_random_synthetic_case():
    """Returns a randomly selected synthetic case for quick demo loading."""
    case = random.choice(SYNTHETIC_CASES)
    return {
        "case": case,
    }


@router.get("/cases/{synth_id}")
async def get_synthetic_case(synth_id: str):
    """Returns a specific synthetic case by its synth_id."""
    case = next((c for c in SYNTHETIC_CASES if c["id"] == synth_id), None)
    if not case:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Synthetic case '{synth_id}' not found.")
    return {
        "case": case,
    }
