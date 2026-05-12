import sqlite3
import os
import json
from datetime import datetime

# Paths
ECOSYSTEM_ROOT = r"c:\Code\Ecosystem"
CENTRAL_AUTH_DB = os.path.join(ECOSYSTEM_ROOT, "Storage", "database", "CentralAuth.db")
QUIZMIND_DB = os.path.join(ECOSYSTEM_ROOT, "Storage", "database", "quizmind.db")

# Configs
CLIENT_ID = "quizmind-v1"
CLIENT_SECRET = "quizmind_secret_123"
QUIZMIND_PORT = 5080
CENTRAL_AUTH_PORT = 5000

def setup_central_auth():
    print(f"--- Setting up CentralAuth at {CENTRAL_AUTH_DB} ---")
    if not os.path.exists(CENTRAL_AUTH_DB):
        print(f"Error: CentralAuth DB not found at {CENTRAL_AUTH_DB}")
        return

    try:
        conn = sqlite3.connect(CENTRAL_AUTH_DB)
        cursor = conn.cursor()

        redirect_uri = f"http://localhost:{QUIZMIND_PORT}/auth-center/callback"
        app_url = f"http://localhost:{QUIZMIND_PORT}"

        # Check if client exists
        cursor.execute("SELECT id FROM clients WHERE client_id = ?", (CLIENT_ID,))
        row = cursor.fetchone()

        if row:
            print(f"Updating existing client: {CLIENT_ID}")
            cursor.execute("""
                UPDATE clients 
                SET client_secret = ?, redirect_uri = ?, app_url = ?, name = ?, app_icon = ?, app_color_theme = ?
                WHERE client_id = ?
            """, (CLIENT_SECRET, redirect_uri, app_url, "QuizMind", "brain", "purple", CLIENT_ID))
        else:
            print(f"Creating new client: {CLIENT_ID}")
            cursor.execute("""
                INSERT INTO clients (client_id, client_secret, name, redirect_uri, app_url, app_icon, app_color_theme, is_active, is_visible_on_portal, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, ?)
            """, (CLIENT_ID, CLIENT_SECRET, "QuizMind", redirect_uri, app_url, "brain", "purple", datetime.utcnow().isoformat()))

        conn.commit()
        conn.close()
        print("Done CentralAuth setup.")
    except Exception as e:
        print(f"Error setting up CentralAuth: {e}")

def setup_quizmind():
    print(f"--- Setting up QuizMind at {QUIZMIND_DB} ---")
    if not os.path.exists(QUIZMIND_DB):
        print(f"Error: QuizMind DB not found at {QUIZMIND_DB}")
        return

    try:
        conn = sqlite3.connect(QUIZMIND_DB)
        cursor = conn.cursor()

        sso_config = {
            "central_auth_url": f"http://localhost:{CENTRAL_AUTH_PORT}",
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "enabled": True
        }
        sso_config_json = json.dumps(sso_config)

        # Check if config exists
        cursor.execute("SELECT id FROM system_configs WHERE id = 'sso_config'")
        row = cursor.fetchone()

        if row:
            print("Updating existing sso_config")
            cursor.execute("""
                UPDATE system_configs 
                SET value = ?, updated_at = ?
                WHERE id = 'sso_config'
            """, (sso_config_json, datetime.utcnow().isoformat()))
        else:
            print("Creating new sso_config")
            cursor.execute("""
                INSERT INTO system_configs (id, value, updated_at)
                VALUES (?, ?, ?)
            """, ("sso_config", sso_config_json, datetime.utcnow().isoformat()))

        conn.commit()
        conn.close()
        print("Done QuizMind setup.")
    except Exception as e:
        print(f"Error setting up QuizMind: {e}")

if __name__ == "__main__":
    setup_central_auth()
    setup_quizmind()
    print("\n[SUCCESS] Ecosystem SSO setup completed!")
    print(f"QuizMind: http://localhost:{QUIZMIND_PORT}")
    print(f"CentralAuth: http://localhost:{CENTRAL_AUTH_PORT}")
