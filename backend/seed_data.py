"""
Healtheon — Seed Demo Data
Creates demo users, appointments, health metrics, prescriptions, records, notifications.
Only seeds if the database is empty (no existing cases).
"""
import uuid
from datetime import datetime, timezone, timedelta, date
from backend.db.database import SessionLocal
from backend.db.models import User, Case
from backend.db.models_extended import (
    Appointment, HealthMetric, MedicalRecord, Prescription, Notification, ChatMessage
)
from backend.auth import pwd_context

import logging
logger = logging.getLogger("healtheon.seed")


def _now():
    return datetime.now(timezone.utc)


def _uuid():
    return str(uuid.uuid4())


def seed_demo_data():
    """Seed demo data if database is empty."""
    db = SessionLocal()
    try:
        existing_users = db.query(User).count()
        if existing_users > 1:
            logger.info("Demo data already seeded.")
            return

        logger.info("Seeding demo data...")

        # ── Demo Users (idempotent) ─────────────────────────────────────────
        patient = db.query(User).filter(User.email == "john@patient.com").first()
        if not patient:
            patient = User(
                id="usr_patient01",
                username="john_patient",
                email="john@patient.com",
                full_name="John Mitchell",
                password_hash=pwd_context.hash("Patient123!"),
                role="user",
                institution="Community Health Center",
                status="approved",
                avatar="JM",
            )
            db.add(patient)
            db.flush()
        doctor = db.query(User).filter(User.email == "sarah@hospital.edu").first()
        if not doctor:
            doctor = User(
                id="usr_doctor01",
                username="sarah_doctor",
                email="sarah@hospital.edu",
                full_name="Dr. Sarah Chen",
                password_hash=pwd_context.hash("Doctor123!"),
                role="doctor",
                institution="Metropolitan General Hospital",
                status="approved",
                avatar="SC",
            )
            db.add(doctor)
            db.flush()

        # ── Appointments ────────────────────────────────────────────────────
        appointments_data = [
            ("usr_patient01", "usr_doctor01", "2026-06-10", "09:00", "consultation", "Annual checkup — blood work review", "completed"),
            ("usr_patient01", "usr_doctor01", "2026-06-20", "14:30", "follow_up", "Follow-up on hypertension management", "scheduled"),
            ("usr_patient01", "usr_doctor01", "2026-07-01", "10:00", "consultation", "Cardiology referral consultation", "scheduled"),
            ("usr_patient01", "usr_doctor01", "2026-05-15", "11:00", "emergency", "Acute chest pain evaluation", "completed"),
            ("usr_patient01", "usr_doctor01", "2026-05-28", "16:00", "follow_up", "Lab results review", "completed"),
        ]
        for pid, did, appt_date, appt_time, appt_type, notes, status in appointments_data:
            db.add(Appointment(
                id=_uuid(), patient_id=pid, doctor_id=did,
                appointment_date=appt_date, appointment_time=appt_time,
                appointment_type=appt_type, notes=notes, status=status,
            ))

        # ── Health Metrics ──────────────────────────────────────────────────
        metrics_data = [
            ("usr_patient01", "heart_rate", "78", "bpm"),
            ("usr_patient01", "heart_rate", "82", "bpm"),
            ("usr_patient01", "heart_rate", "75", "bpm"),
            ("usr_patient01", "blood_pressure", "138/88", "mmHg"),
            ("usr_patient01", "blood_pressure", "132/85", "mmHg"),
            ("usr_patient01", "blood_pressure", "128/82", "mmHg"),
            ("usr_patient01", "weight", "82.5", "kg"),
            ("usr_patient01", "weight", "81.8", "kg"),
            ("usr_patient01", "blood_sugar", "112", "mg/dL"),
            ("usr_patient01", "blood_sugar", "105", "mg/dL"),
            ("usr_patient01", "temperature", "36.8", "°C"),
            ("usr_patient01", "oxygen_saturation", "97", "%"),
            ("usr_patient01", "oxygen_saturation", "98", "%"),
        ]
        for uid, mtype, value, unit in metrics_data:
            db.add(HealthMetric(
                id=_uuid(), user_id=uid,
                metric_type=mtype, value=value, unit=unit,
            ))

        # ── Medical Records ─────────────────────────────────────────────────
        records_data = [
            ("usr_patient01", "usr_doctor01", "lab_report", "Complete Blood Count (CBC)", "WBC: 7.2 (normal), RBC: 4.8 (normal), Hemoglobin: 14.1 g/dL (normal), Platelets: 245 (normal)", "completed"),
            ("usr_patient01", "usr_doctor01", "lab_report", "Lipid Panel", "Total Cholesterol: 228 mg/dL (borderline high), LDL: 142 (high), HDL: 48 (low), Triglycerides: 178 (borderline)", "completed"),
            ("usr_patient01", "usr_doctor01", "lab_report", "HbA1c", "HbA1c: 6.2% (pre-diabetic range, monitor closely)", "completed"),
            ("usr_patient01", "usr_doctor01", "progress_note", "Hypertension Management Review", "Patient presenting with stage 1 hypertension. BP readings trending down with current Lisinopril 10mg. Continue current regimen, recheck in 4 weeks.", "active"),
            ("usr_patient01", "usr_doctor01", "imaging", "Chest X-Ray (PA View)", "No acute cardiopulmonary abnormality. Heart size normal. Lungs clear bilaterally.", "completed"),
            ("usr_patient01", "usr_doctor01", "progress_note", "Annual Physical Examination", "General: Well-appearing, no acute distress. CV: Regular rate and rhythm. Lungs: Clear to AEB. Abdomen: Soft, non-tender. Assessment: HTN well controlled, prediabetes trending.", "active"),
        ]
        for uid, did, rtype, title, desc, status in records_data:
            db.add(MedicalRecord(
                id=_uuid(), user_id=uid, doctor_id=did,
                record_type=rtype, title=title, description=desc,
                date=date.today().isoformat(), status=status,
            ))

        # ── Prescriptions ───────────────────────────────────────────────────
        prescriptions_data = [
            ("usr_patient01", "usr_doctor01", "Lisinopril", "10mg", "Once daily", "30 days", "Take in the morning. Monitor for dizziness."),
            ("usr_patient01", "usr_doctor01", "Metformin", "500mg", "Twice daily", "90 days", "Take with meals. Monitor blood sugar."),
            ("usr_patient01", "usr_doctor01", "Aspirin", "81mg", "Once daily", "30 days", "Low-dose aspirin for cardiovascular protection."),
            ("usr_patient01", "usr_doctor01", "Atorvastatin", "20mg", "Once daily at bedtime", "30 days", "For hyperlipidemia. Recheck lipid panel in 3 months."),
        ]
        for pid, did, med, dose, freq, dur, instr in prescriptions_data:
            db.add(Prescription(
                id=_uuid(), patient_id=pid, doctor_id=did,
                medication_name=med, dosage=dose, frequency=freq,
                duration=dur, instructions=instr,
                prescribed_date=date.today().isoformat(),
            ))

        # ── Notifications ───────────────────────────────────────────────────
        notifications_data = [
            ("usr_patient01", "Appointment Confirmed", "Your appointment with Dr. Sarah Chen on Jun 20 has been confirmed.", False),
            ("usr_patient01", "Lab Results Available", "Your Complete Blood Count results are now available for review.", True),
            ("usr_patient01", "Prescription Refill Reminder", "Your Lisinopril prescription is due for refill in 5 days.", True),
            ("usr_patient01", "New Case Analysis Complete", "The multi-agent analysis for your recent case has been completed.", False),
            ("usr_doctor01", "New Patient Registration", "John Mitchell has registered as a new patient awaiting approval.", True),
            ("usr_doctor01", "Appointment Request", "John Mitchell requested a cardiology consultation on Jul 1.", False),
        ]
        for uid, title, msg, is_read in notifications_data:
            db.add(Notification(
                id=_uuid(), user_id=uid, title=title,
                message=msg, is_read=is_read,
            ))

        # ── Chat Messages ───────────────────────────────────────────────────
        chat_data = [
            ("usr_patient01", "usr_doctor01", "Dr. Chen, I've been having some occasional chest tightness after climbing stairs. Should I be concerned?"),
            ("usr_doctor01", "usr_patient01", "Hi John. Given your hypertension history, let's monitor this. Can you describe the tightness — how long does it last?"),
            ("usr_patient01", "usr_doctor01", "It lasts about 1-2 minutes and goes away when I rest. It started about a week ago."),
            ("usr_doctor01", "usr_patient01", "I'd like to schedule a stress test. It's likely stable angina given your risk factors, but we should confirm. I'll send a referral."),
            ("usr_patient01", "usr_doctor01", "Thank you, Dr. Chen. Should I continue my current medications?"),
            ("usr_doctor01", "usr_patient01", "Yes, continue all current medications. If the chest pain becomes more frequent or occurs at rest, go to the ER immediately."),
        ]
        for sender, receiver, content in chat_data:
            db.add(ChatMessage(
                id=_uuid(), sender_id=sender, receiver_id=receiver,
                content=content,
            ))

        db.commit()
        logger.info("Demo data seeded successfully: 2 users, 5 appointments, 13 metrics, 6 records, 4 prescriptions, 6 notifications, 6 messages")

    except Exception as e:
        db.rollback()
        logger.error(f"Failed to seed demo data: {e}")
    finally:
        db.close()
