"""
Authentication and Security Module for NeuralStock AI
Provides secure user registration, PBKDF2 password hashing with salt,
session token generation, and SQLite user management.
"""

import os
import sqlite3
import hashlib
import secrets
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Dict, Any

# Database path in project root
DB_PATH = Path(os.environ.get(
    "NEURALSTOCK_DB_PATH",
    Path(__file__).resolve().parent.parent / "data" / "users.db",
)).expanduser()


def get_db_connection() -> sqlite3.Connection:
    """Creates directory if needed and opens SQLite database connection."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initializes the users and sessions tables."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL COLLATE NOCASE,
            name TEXT NOT NULL,
            email TEXT,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'Trader',
            created_at TEXT NOT NULL,
            last_login TEXT
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            token TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
    """)

    conn.commit()
    conn.close()


def hash_password(password: str) -> str:
    """
    Hashes a password with a random 16-byte salt using PBKDF2-HMAC-SHA256 (100,000 iterations).
    Returns string in format: salt_hex$hash_hex
    """
    salt = secrets.token_bytes(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100_000)
    return f"{salt.hex()}${dk.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    """
    Verifies a plaintext password against the stored salt$hash string
    using constant-time comparison to prevent timing attacks.
    """
    try:
        parts = stored_hash.split("$")
        if len(parts) != 2:
            return False
        salt = bytes.fromhex(parts[0])
        expected_hash = bytes.fromhex(parts[1])
        actual_hash = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100_000)
        return secrets.compare_digest(expected_hash, actual_hash)
    except Exception:
        return False


def create_session(user_id: int, days_valid: int = 30) -> str:
    """Generates a cryptographically random session token and stores it."""
    token = secrets.token_urlsafe(32)
    created_at = datetime.utcnow()
    expires_at = created_at + timedelta(days=days_valid)

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO sessions (token, user_id, created_at, expires_at)
        VALUES (?, ?, ?, ?)
    """, (token, user_id, created_at.isoformat(), expires_at.isoformat()))
    conn.commit()
    conn.close()

    return token


def get_user_by_token(token: str) -> Optional[Dict[str, Any]]:
    """Retrieves user profile if session token is valid and not expired."""
    if not token:
        return None

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT u.id, u.username, u.name, u.email, u.role, u.created_at, u.last_login, s.expires_at
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.token = ?
    """, (token,))

    row = cursor.fetchone()
    conn.close()

    if not row:
        return None

    # Check expiration
    expires_at = datetime.fromisoformat(row["expires_at"])
    if datetime.utcnow() > expires_at:
        delete_session(token)
        return None

    return {
        "id": row["id"],
        "username": row["username"],
        "name": row["name"],
        "email": row["email"],
        "role": row["role"],
        "created_at": row["created_at"],
        "last_login": row["last_login"],
    }


def authenticate_user(username_or_email: str, password: str) -> Optional[Dict[str, Any]]:
    """Authenticates username/email and password. Returns user dict on success."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, username, name, email, password_hash, role, created_at
        FROM users
        WHERE username = ? OR email = ?
    """, (username_or_email.strip(), username_or_email.strip()))

    user = cursor.fetchone()

    if not user:
        conn.close()
        return None

    if not verify_password(password, user["password_hash"]):
        conn.close()
        return None

    # Update last login
    now_str = datetime.utcnow().isoformat()
    cursor.execute("UPDATE users SET last_login = ? WHERE id = ?", (now_str, user["id"]))
    conn.commit()
    conn.close()

    return {
        "id": user["id"],
        "username": user["username"],
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
        "created_at": user["created_at"],
        "last_login": now_str,
    }


def register_user(username: str, password: str, name: str, email: str = "") -> Dict[str, Any]:
    """
    Registers a new user account with validation.
    Returns user dict with generated session token.
    """
    username = username.strip()
    name = name.strip()
    email = email.strip()

    if len(username) < 3 or len(username) > 30:
        raise ValueError("Username must be between 3 and 30 characters.")
    
    if not username.replace("_", "").replace("-", "").isalnum():
        raise ValueError("Username can only contain letters, numbers, hyphens, and underscores.")

    if len(password) < 6:
        raise ValueError("Password must be at least 6 characters long.")

    if not name:
        name = username

    conn = get_db_connection()
    cursor = conn.cursor()

    # Check for existing username
    cursor.execute("SELECT id FROM users WHERE username = ?", (username,))
    if cursor.fetchone():
        conn.close()
        raise ValueError(f"Username '{username}' is already taken.")

    # Check for existing email if provided
    if email:
        cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
        if cursor.fetchone():
            conn.close()
            raise ValueError(f"An account with email '{email}' already exists.")

    pwd_hash = hash_password(password)
    now_str = datetime.utcnow().isoformat()

    cursor.execute("""
        INSERT INTO users (username, name, email, password_hash, role, created_at, last_login)
        VALUES (?, ?, ?, ?, 'Trader', ?, ?)
    """, (username, name, email, pwd_hash, now_str, now_str))

    user_id = cursor.lastrowid
    conn.commit()
    conn.close()

    token = create_session(user_id)

    return {
        "user": {
            "id": user_id,
            "username": username,
            "name": name,
            "email": email,
            "role": "Trader",
            "created_at": now_str,
            "last_login": now_str,
        },
        "token": token
    }


def delete_session(token: str):
    """Logs out by invalidating session token."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM sessions WHERE token = ?", (token,))
    conn.commit()
    conn.close()


# Initialize database automatically upon module load
init_db()
