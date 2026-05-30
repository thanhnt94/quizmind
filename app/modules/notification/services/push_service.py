import os
import json
import logging
import base64
from pywebpush import webpush, WebPushException
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization
from app.core.config import settings

logger = logging.getLogger(__name__)

class PushService:
    _keys_cache = None

    @classmethod
    def _load_or_generate_vapid_keys(cls):
        if cls._keys_cache:
            return cls._keys_cache

        keys_file = os.path.join(settings.STORAGE_DIR, "vapid_keys.json")
        if os.path.exists(keys_file):
            try:
                with open(keys_file, "r") as f:
                    cls._keys_cache = json.load(f)
                    return cls._keys_cache
            except Exception as e:
                logger.error(f"Failed to read VAPID keys file: {e}")

        # Generate new keys using cryptography directly to avoid py-vapid type errors
        try:
            private_key = ec.generate_private_key(ec.SECP256R1())
            
            # Private value (32 bytes)
            private_value = private_key.private_numbers().private_value
            private_bytes = private_value.to_bytes(32, 'big')
            private_b64 = base64.urlsafe_b64encode(private_bytes).decode('utf-8').rstrip('=')
            
            # Public point (65 bytes uncompressed)
            public_key = private_key.public_key()
            public_bytes = public_key.public_bytes(
                encoding=serialization.Encoding.X962,
                format=serialization.PublicFormat.UncompressedPoint
            )
            public_b64 = base64.urlsafe_b64encode(public_bytes).decode('utf-8').rstrip('=')

            cls._keys_cache = {
                "public_key": public_b64,
                "private_key": private_b64
            }

            # Save keys to file
            os.makedirs(settings.STORAGE_DIR, exist_ok=True)
            with open(keys_file, "w") as f:
                json.dump(cls._keys_cache, f)

            logger.info("Generated new VAPID keypair successfully.")
            return cls._keys_cache
        except Exception as e:
            logger.error(f"Failed to generate VAPID keys: {e}")
            raise e

    @classmethod
    def get_public_key(cls) -> str:
        keys = cls._load_or_generate_vapid_keys()
        return keys["public_key"]

    @classmethod
    async def send_push(cls, db, subscription, title: str, body: str, url: str = "/"):
        """
        Sends a web push notification. If the endpoint returns 410 Gone (unsubscribed),
        the subscription is deleted from the database.
        """
        keys = cls._load_or_generate_vapid_keys()
        try:
            webpush(
                subscription_info={
                    "endpoint": subscription.endpoint,
                    "keys": {
                        "p256dh": subscription.p256dh,
                        "auth": subscription.auth
                    }
                },
                data=json.dumps({
                    "title": title,
                    "body": body,
                    "url": url
                }),
                vapid_private_key=keys["private_key"],
                vapid_claims={
                    "sub": "mailto:admin@quizmind.click"
                }
            )
            logger.info(f"Successfully sent push notification to user {subscription.user_id}")
            return True
        except WebPushException as ex:
            logger.warning(f"WebPushException for user {subscription.user_id}: {ex}")
            # If status code is 410 (Gone) or 404 (Not Found), delete subscription from DB
            if ex.response is not None and ex.response.status_code in (410, 404):
                logger.info(f"Deleting expired push subscription for user {subscription.user_id}")
                await db.delete(subscription)
                await db.commit()
            return False
        except Exception as e:
            logger.error(f"Failed to send push notification: {e}")
            return False
