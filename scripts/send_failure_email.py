#!/usr/bin/env python3
"""
send_failure_email.py
Sends a modern, styled HTML email notification when a Jenkins CI/CD pipeline fails.
Configured via environment variables (ALERT_RECIPIENT_EMAIL, SMTP_USER, SMTP_PASSWORD).
"""

import os
import smtplib
from datetime import datetime, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

RECIPIENT_EMAIL = os.getenv("ALERT_RECIPIENT_EMAIL", "devops-alerts@example.com")
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "devops-alerts@example.com")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")

BUILD_NUMBER = os.getenv("BUILD_NUMBER", "N/A")
JOB_NAME = os.getenv("JOB_NAME", "nti-devops-pipeline")
JENKINS_BASE_URL = os.getenv("JENKINS_URL", "http://localhost:8080")
BUILD_URL = os.getenv("BUILD_URL", f"{JENKINS_BASE_URL}/job/{JOB_NAME}/{BUILD_NUMBER}/")
GIT_BRANCH = os.getenv("GIT_BRANCH", os.getenv("BRANCH_NAME", "main"))
GIT_COMMIT = os.getenv("GIT_COMMIT", "HEAD")[:8]
STAGE_NAME = os.getenv("FAILED_STAGE", "Unknown Pipeline Stage")
TIMESTAMP = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

def generate_html() -> str:
    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CI/CD Build Failure</title>
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0f172a;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:600px;background:#1e293b;border-radius:12px;overflow:hidden;border:1px solid #334155;box-shadow:0 10px 25px rgba(0,0,0,0.5);" cellspacing="0" cellpadding="0">
          <!-- Header Banner -->
          <tr>
            <td style="background:linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);padding:28px 32px;text-align:left;">
              <table width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="background:rgba(255,255,255,0.2);color:#ffffff;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:4px 10px;border-radius:20px;display:inline-block;margin-bottom:8px;">Pipeline Alert</span>
                    <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">🚨 CI/CD Pipeline Failed</h1>
                    <p style="margin:6px 0 0 0;font-size:13px;color:rgba(255,255,255,0.85);">Project: NTI DevOps Final Project (${JOB_NAME})</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 20px 0;font-size:14px;line-height:1.6;color:#94a3b8;">
                The automated CI/CD pipeline triggered by your recent commit has failed. Immediate action is required to investigate and unblock the GitOps deployment to AWS EKS.
              </p>

              <!-- Metadata Card -->
              <table width="100%" style="background:#0f172a;border-radius:8px;border:1px solid #334155;margin-bottom:24px;" cellspacing="0" cellpadding="12">
                <tr>
                  <td width="35%" style="font-size:12px;color:#64748b;font-weight:600;border-bottom:1px solid #1e293b;">BUILD RUN</td>
                  <td style="font-size:13px;color:#f8fafc;font-weight:600;border-bottom:1px solid #1e293b;">#{BUILD_NUMBER}</td>
                </tr>
                <tr>
                  <td style="font-size:12px;color:#64748b;font-weight:600;border-bottom:1px solid #1e293b;">BRANCH</td>
                  <td style="font-size:13px;color:#38bdf8;font-family:monospace;border-bottom:1px solid #1e293b;">{GIT_BRANCH}</td>
                </tr>
                <tr>
                  <td style="font-size:12px;color:#64748b;font-weight:600;border-bottom:1px solid #1e293b;">COMMIT</td>
                  <td style="font-size:13px;color:#f8fafc;font-family:monospace;border-bottom:1px solid #1e293b;">{GIT_COMMIT}</td>
                </tr>
                <tr>
                  <td style="font-size:12px;color:#64748b;font-weight:600;border-bottom:1px solid #1e293b;">FAILED STAGE</td>
                  <td style="font-size:13px;color:#f87171;font-weight:700;border-bottom:1px solid #1e293b;">{STAGE_NAME}</td>
                </tr>
                <tr>
                  <td style="font-size:12px;color:#64748b;font-weight:600;">TIMESTAMP</td>
                  <td style="font-size:12px;color:#94a3b8;">{TIMESTAMP}</td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding:8px 0 16px 0;">
                    <a href="{BUILD_URL}console" target="_blank" style="display:inline-block;background:#ef4444;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:6px;box-shadow:0 4px 12px rgba(239,68,68,0.3);">
                      View Jenkins Console Logs &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#0f172a;padding:20px 32px;border-top:1px solid #334155;text-align:center;">
              <p style="margin:0;font-size:11px;color:#64748b;">
                NTI Production App &bull; Automated CI/CD Notification System &bull; AWS us-east-1
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

def main():
    if not SMTP_PASSWORD:
        print("[WARNING] SMTP_PASSWORD is not set. Skipped actual email transmission, but generated HTML successfully.")
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"🚨 [FAILURE] Jenkins Pipeline Build #{BUILD_NUMBER} - {JOB_NAME}"
    msg["From"] = f"NTI Jenkins CI <{SMTP_USER}>"
    msg["To"] = RECIPIENT_EMAIL

    html_content = generate_html()
    msg.attach(MIMEText(html_content, "html"))

    try:
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_USER, [RECIPIENT_EMAIL], msg.as_string())
        print(f"[SUCCESS] Pipeline failure notification email dispatched to {RECIPIENT_EMAIL}")
    except Exception as e:
        print(f"[ERROR] Failed to send notification email: {e}")

if __name__ == "__main__":
    main()
