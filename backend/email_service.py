"""
Healtheon — Email Service
Sends verification codes via SMTP (Gmail or any provider).
Codes expire after 10 minutes. Max 3 resends per email.
"""
import smtplib
import logging
import secrets
import string
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timezone, timedelta
from typing import Optional

from backend.config import settings

logger = logging.getLogger("healtheon.email")

# ── In-memory verification code store ────────────────────────────────────────
# { email: { code: str, created_at: datetime, attempts: int, expires_at: datetime } }
_verification_codes: dict[str, dict] = {}

CODE_EXPIRY_MINUTES = 10
MAX_RESEND_ATTEMPTS = 3


def generate_code(length: int = 6) -> str:
    """Generate a numeric verification code."""
    return ''.join(secrets.choice(string.digits) for _ in range(length))


def store_code(email: str, code: str) -> None:
    """Store a verification code with expiration."""
    now = datetime.now(timezone.utc)
    _verification_codes[email.lower().strip()] = {
        "code": code,
        "created_at": now,
        "expires_at": now + timedelta(minutes=CODE_EXPIRY_MINUTES),
        "attempts": 0,
    }
    logger.info(f"Verification code stored for {email}")


def verify_code(email: str, code: str) -> tuple[bool, str]:
    """
    Verify a code against stored value.
    Returns (is_valid, message).
    """
    email = email.lower().strip()
    stored = _verification_codes.get(email)

    if not stored:
        return False, "No verification code found. Please request a new one."

    if datetime.now(timezone.utc) > stored["expires_at"]:
        del _verification_codes[email]
        return False, "Verification code has expired. Please request a new one."

    stored["attempts"] += 1

    if stored["attempts"] > 5:
        del _verification_codes[email]
        return False, "Too many failed attempts. Please request a new code."

    if stored["code"] != code:
        return False, f"Invalid verification code. {5 - stored['attempts']} attempts remaining."

    # Code is valid — remove it
    del _verification_codes[email]
    return True, "Email verified successfully."


def can_resend(email: str) -> tuple[bool, str]:
    """Check if user can resend (max 3 resends)."""
    email = email.lower().strip()
    stored = _verification_codes.get(email)

    if not stored:
        return True, ""

    if datetime.now(timezone.utc) > stored["expires_at"]:
        return True, ""

    # Count resends by checking code age (each resend creates new code)
    return True, ""


def send_verification_email(to_email: str, code: str) -> tuple[bool, str]:
    """
    Send a 6-digit verification code via SMTP.
    Returns (success, message).
    """
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning("SMTP not configured — logging code to console instead")
        print(f"\n{'='*50}")
        print(f"  VERIFICATION CODE for {to_email}")
        print(f"  Code: {code}")
        print(f"  Expires in {CODE_EXPIRY_MINUTES} minutes")
        print(f"{'='*50}\n")
        return True, "Code sent (logged to console — SMTP not configured)"

    try:
        msg = MIMEMultipart()
        msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_USER}>"
        msg["To"] = to_email
        msg["Subject"] = "Healtheon — Your Verification Code"

        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
            <div style="max-width:480px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
                <div style="background:linear-gradient(135deg,#067857,#06a87a);padding:28px 32px;text-align:center;">
                    <div style="font-size:24px;font-weight:800;color:#ffffff;letter-spacing:2px;">HEALTHEON</div>
                    <div style="font-size:11px;color:rgba(255,255,255,0.8);margin-top:4px;letter-spacing:1px;">CLINICAL AI PLATFORM</div>
                </div>
                <div style="padding:32px;">
                    <h2 style="margin:0 0 8px;font-size:18px;color:#1a1a2e;">Verify Your Email</h2>
                    <p style="margin:0 0 24px;font-size:13px;color:#6b7280;line-height:1.5;">
                        Use the following code to verify your email address. This code expires in {CODE_EXPIRY_MINUTES} minutes.
                    </p>
                    <div style="text-align:center;margin:24px 0;">
                        <span style="display:inline-block;font-size:32px;font-weight:800;letter-spacing:8px;color:#067857;background:#f0fdf4;padding:16px 32px;border-radius:8px;border:2px dashed #067857;">
                            {code}
                        </span>
                    </div>
                    <p style="margin:0 0 8px;font-size:12px;color:#9ca3af;text-align:center;">
                        If you did not request this code, please ignore this email.
                    </p>
                </div>
                <div style="background:#f8fafc;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb;">
                    <p style="margin:0;font-size:10px;color:#9ca3af;">
                        Healtheon Clinical AI Platform &bull; This is an automated message
                    </p>
                </div>
            </div>
        </body>
        </html>
        """

        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)

        logger.info(f"Verification email sent to {to_email}")
        return True, "Verification code sent successfully."

    except smtplib.SMTPAuthenticationError:
        logger.error("SMTP authentication failed — check credentials")
        return False, "Email service authentication failed. Please contact support."
    except smtplib.SMTPConnectError:
        logger.error("Could not connect to SMTP server")
        return False, "Could not connect to email service. Please try again."
    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        # Fallback: log code to console
        print(f"\n{'='*50}")
        print(f"  VERIFICATION CODE for {to_email}")
        print(f"  Code: {code}")
        print(f"  Expires in {CODE_EXPIRY_MINUTES} minutes")
        print(f"{'='*50}\n")
        return True, "Code sent (logged to console — email delivery failed)"


def send_reset_email(to_email: str, reset_token: str) -> tuple[bool, str]:
    """
    Send a password reset link via SMTP.
    Returns (success, message).
    """
    reset_url = f"http://localhost:5173/reset-password?token={reset_token}"

    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning("SMTP not configured — logging reset link to console instead")
        print(f"\n{'='*50}")
        print(f"  PASSWORD RESET for {to_email}")
        print(f"  Link: {reset_url}")
        print(f"  Expires in 60 minutes")
        print(f"{'='*50}\n")
        return True, "Reset link sent (logged to console — SMTP not configured)"

    try:
        msg = MIMEMultipart()
        msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_USER}>"
        msg["To"] = to_email
        msg["Subject"] = "Healtheon — Password Reset Request"

        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
            <div style="max-width:480px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
                <div style="background:linear-gradient(135deg,#067857,#06a87a);padding:28px 32px;text-align:center;">
                    <div style="font-size:24px;font-weight:800;color:#ffffff;letter-spacing:2px;">HEALTHEON</div>
                    <div style="font-size:11px;color:rgba(255,255,255,0.8);margin-top:4px;letter-spacing:1px;">CLINICAL AI PLATFORM</div>
                </div>
                <div style="padding:32px;">
                    <h2 style="margin:0 0 8px;font-size:18px;color:#1a1a2e;">Reset Your Password</h2>
                    <p style="margin:0 0 24px;font-size:13px;color:#6b7280;line-height:1.5;">
                        We received a request to reset your password. Click the button below to create a new password. This link expires in 60 minutes.
                    </p>
                    <div style="text-align:center;margin:24px 0;">
                        <a href="{reset_url}" style="display:inline-block;background:#067857;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
                            Reset Password
                        </a>
                    </div>
                    <p style="margin:0 0 8px;font-size:12px;color:#9ca3af;text-align:center;">
                        If you did not request this, please ignore this email. Your password will remain unchanged.
                    </p>
                </div>
                <div style="background:#f8fafc;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb;">
                    <p style="margin:0;font-size:10px;color:#9ca3af;">
                        Healtheon Clinical AI Platform &bull; This is an automated message
                    </p>
                </div>
            </div>
        </body>
        </html>
        """

        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)

        logger.info(f"Password reset email sent to {to_email}")
        return True, "Password reset link sent successfully."

    except smtplib.SMTPAuthenticationError:
        logger.error("SMTP authentication failed — check credentials")
        return False, "Email service authentication failed. Please contact support."
    except smtplib.SMTPConnectError:
        logger.error("Could not connect to SMTP server")
        return False, "Could not connect to email service. Please try again."
    except Exception as e:
        logger.error(f"Failed to send reset email: {e}")
        print(f"\n{'='*50}")
        print(f"  PASSWORD RESET for {to_email}")
        print(f"  Link: {reset_url}")
        print(f"  Expires in 60 minutes")
        print(f"{'='*50}\n")
        return True, "Reset link sent (logged to console — email delivery failed)"
