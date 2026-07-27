"""
Seed script — creates an initial admin user.
Usage: python seed.py
"""

import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

from prisma import Prisma
from auth_utils import hash_password


async def main():
    db = Prisma()
    await db.connect()

    email = os.getenv("SEED_ADMIN_EMAIL", "admin@stellar.local")
    password = os.getenv("SEED_ADMIN_PASSWORD", "123456")

    existing = await db.admin.find_unique(where={"email": email})
    if existing:
        # Re-hash the password with updated bcrypt to fix any passlib-generated hashes
        await db.admin.update(
            where={"admin_id": existing.admin_id},
            data={"password_hash": hash_password(password)},
        )
        print(f"Admin '{email}' already exists (id={existing.admin_id}). Password re-hashed.")
    else:
        admin = await db.admin.create(
            data={
                "name": "Admin",
                "email": email,
                "password_hash": hash_password(password),
            }
        )
        print(f"Created admin: {admin.email} (id={admin.admin_id})")

    await db.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
