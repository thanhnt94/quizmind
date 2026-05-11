import sys
import os

# Add CentralAuth path to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../CentralAuth')))

from app import create_app, db
from app.models.client import Client

def register_quizmind():
    app = create_app()
    with app.app_context():
        client = Client.query.filter_by(client_id='quizmind-v1').first()
        if not client:
            print("Registering QuizMind Client...")
            client = Client(
                name="QuizMind",
                client_id="quizmind-v1",
                client_secret="quizmind_secret_123",
                redirect_uri="http://localhost:5173/auth-center/callback", # Vite default port
                app_icon="brain",
                app_color_theme="purple",
                is_active=True,
                is_visible_on_portal=True
            )
            db.session.add(client)
            db.session.commit()
            print("QuizMind registered successfully.")
        else:
            print("QuizMind already registered.")

if __name__ == "__main__":
    register_quizmind()
