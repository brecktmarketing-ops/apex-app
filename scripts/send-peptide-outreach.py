import smtplib
import csv
import time
import json
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

# Config
SMTP_HOST = 'smtpout.secureserver.net'
SMTP_PORT = 465
EMAIL = 'brecken@backendbranding.com'
PASSWORD = 'Bigballerbrand11!'
CSV_FILE = '/Users/breckentroike/Documents/peptide_outreach_list.csv'
LOG_FILE = '/Users/breckentroike/Documents/peptide_outreach_log.json'
DELAY_SECONDS = 60  # 60 sec between emails to stay under GoDaddy rate limit

SUBJECT = "Made you 3 ad creatives"

def get_body(company):
    return f"""Hey {company} team,

Came across your page — looks solid. I whipped up 3 ad creatives for you based on what's performing well in the online peptide space right now.

Want me to send them over?

— Brecken
Backend Branding"""

def load_sent_log():
    try:
        with open(LOG_FILE) as f:
            return json.load(f)
    except:
        return []

def save_sent_log(log):
    with open(LOG_FILE, 'w') as f:
        json.dump(log, f, indent=2)

def main():
    # Load CSV
    with open(CSV_FILE) as f:
        stores = list(csv.DictReader(f))

    # Load already sent
    sent_log = load_sent_log()
    sent_emails = set(entry['email'].lower() for entry in sent_log)

    # Filter unsent
    to_send = [s for s in stores if s['email'].lower() not in sent_emails]

    print(f"Total stores: {len(stores)}")
    print(f"Already sent: {len(sent_emails)}")
    print(f"To send now: {len(to_send)}")
    print(f"Delay: {DELAY_SECONDS}s between emails")
    print(f"Estimated time: {len(to_send) * DELAY_SECONDS / 60:.0f} minutes")
    print()

    if not to_send:
        print("All emails already sent!")
        return

    success = 0
    failed = 0
    server = None

    def connect():
        nonlocal server
        try:
            if server:
                try: server.quit()
                except: pass
        except: pass
        print("  Connecting to SMTP...")
        server = smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=15)
        server.login(EMAIL, PASSWORD)
        print("  Connected!")

    connect()

    for i, store in enumerate(to_send):
        company = store['company']
        to_email = store['email']

        # Reconnect every 5 emails to avoid timeout
        if i > 0 and i % 5 == 0:
            connect()

        try:
            msg = MIMEMultipart()
            msg['From'] = f'Brecken <{EMAIL}>'
            msg['To'] = to_email
            msg['Subject'] = SUBJECT
            msg['Reply-To'] = 'breckentroike@gmail.com'
            msg.attach(MIMEText(get_body(company), 'plain'))

            try:
                server.sendmail(EMAIL, to_email, msg.as_string())
            except smtplib.SMTPServerDisconnected:
                connect()
                server.sendmail(EMAIL, to_email, msg.as_string())

            sent_log.append({
                'company': company,
                'email': to_email,
                'domain': store.get('domain', ''),
                'sent_at': datetime.now().isoformat(),
                'status': 'sent'
            })
            save_sent_log(sent_log)

            success += 1
            print(f"[{i+1}/{len(to_send)}] ✓ {company} — {to_email}")

        except Exception as e:
            failed += 1
            sent_log.append({
                'company': company,
                'email': to_email,
                'domain': store.get('domain', ''),
                'sent_at': datetime.now().isoformat(),
                'status': 'failed',
                'error': str(e)
            })
            save_sent_log(sent_log)
            print(f"[{i+1}/{len(to_send)}] ✗ {company} — {to_email} — {e}")

        # Delay between sends
        if i < len(to_send) - 1:
            time.sleep(DELAY_SECONDS)

    try: server.quit()
    except: pass
    print(f"\nDone! Sent: {success} | Failed: {failed}")
    print(f"Log saved to: {LOG_FILE}")

if __name__ == '__main__':
    main()
