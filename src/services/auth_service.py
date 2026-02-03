"""
ITF - Income. Tax. Financials
Authentication Service

Provides:
- User registration and authentication
- JWT token management
- Session persistence
- Multi-factor authentication (MFA)
- Password security
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, EmailStr, Field, validator
import secrets
import hashlib
import hmac
import jwt
import re
from enum import Enum


# ============================================================================
# CONFIGURATION
# ============================================================================

class AuthConfig:
    """Authentication configuration."""
    SECRET_KEY = secrets.token_hex(32)  # In production: load from environment
    ALGORITHM = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES = 60
    REFRESH_TOKEN_EXPIRE_DAYS = 30
    PASSWORD_MIN_LENGTH = 12
    PASSWORD_REQUIRE_SPECIAL = True
    PASSWORD_REQUIRE_NUMBER = True
    PASSWORD_REQUIRE_UPPER = True
    PASSWORD_REQUIRE_LOWER = True
    MAX_LOGIN_ATTEMPTS = 5
    LOCKOUT_DURATION_MINUTES = 30
    SESSION_TIMEOUT_MINUTES = 30
    MFA_REQUIRED = True


# ============================================================================
# MODELS
# ============================================================================

class UserRole(str, Enum):
    """User roles for RBAC."""
    TAXPAYER = "taxpayer"
    PREPARER = "preparer"
    ERO = "ero"  # Electronic Return Originator
    ADMIN = "admin"
    SUPPORT = "support"


class UserStatus(str, Enum):
    """User account status."""
    ACTIVE = "active"
    PENDING_VERIFICATION = "pending_verification"
    SUSPENDED = "suspended"
    LOCKED = "locked"
    DEACTIVATED = "deactivated"


class User(BaseModel):
    """User model."""
    id: str = Field(default_factory=lambda: secrets.token_hex(16))
    email: EmailStr
    password_hash: str
    first_name: str
    last_name: str
    phone: Optional[str] = None

    role: UserRole = UserRole.TAXPAYER
    status: UserStatus = UserStatus.PENDING_VERIFICATION

    # Security
    mfa_enabled: bool = False
    mfa_secret: Optional[str] = None
    failed_login_attempts: int = 0
    locked_until: Optional[datetime] = None
    password_changed_at: datetime = Field(default_factory=datetime.now)
    must_change_password: bool = False

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    last_login_at: Optional[datetime] = None
    email_verified_at: Optional[datetime] = None

    # Profile
    ssn_last4: Optional[str] = None  # For identity verification
    date_of_birth: Optional[str] = None
    address: Optional[Dict[str, str]] = None


class UserRegistration(BaseModel):
    """User registration request."""
    email: EmailStr
    password: str
    confirm_password: str
    first_name: str
    last_name: str
    phone: Optional[str] = None
    accept_terms: bool
    accept_privacy: bool
    consent_7216: bool  # IRC §7216 consent

    @validator('password')
    def validate_password(cls, v):
        errors = []
        if len(v) < AuthConfig.PASSWORD_MIN_LENGTH:
            errors.append(f"Password must be at least {AuthConfig.PASSWORD_MIN_LENGTH} characters")
        if AuthConfig.PASSWORD_REQUIRE_UPPER and not re.search(r'[A-Z]', v):
            errors.append("Password must contain an uppercase letter")
        if AuthConfig.PASSWORD_REQUIRE_LOWER and not re.search(r'[a-z]', v):
            errors.append("Password must contain a lowercase letter")
        if AuthConfig.PASSWORD_REQUIRE_NUMBER and not re.search(r'\d', v):
            errors.append("Password must contain a number")
        if AuthConfig.PASSWORD_REQUIRE_SPECIAL and not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            errors.append("Password must contain a special character")
        if errors:
            raise ValueError("; ".join(errors))
        return v

    @validator('confirm_password')
    def passwords_match(cls, v, values):
        if 'password' in values and v != values['password']:
            raise ValueError('Passwords do not match')
        return v

    @validator('accept_terms', 'accept_privacy', 'consent_7216')
    def must_accept(cls, v):
        if not v:
            raise ValueError('You must accept this agreement')
        return v


class LoginRequest(BaseModel):
    """Login request."""
    email: EmailStr
    password: str
    remember_me: bool = False
    mfa_code: Optional[str] = None


class TokenResponse(BaseModel):
    """Authentication token response."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: Dict[str, Any]


class Session(BaseModel):
    """User session."""
    id: str = Field(default_factory=lambda: secrets.token_hex(32))
    user_id: str
    token_hash: str
    ip_address: str
    user_agent: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    last_activity: datetime = Field(default_factory=datetime.now)
    expires_at: datetime
    is_valid: bool = True


# ============================================================================
# PASSWORD UTILITIES
# ============================================================================

def hash_password(password: str) -> str:
    """Hash password using PBKDF2-SHA256."""
    salt = secrets.token_hex(32)
    hash_value = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        iterations=100000
    )
    return f"{salt}${hash_value.hex()}"


def verify_password(password: str, password_hash: str) -> bool:
    """Verify password against hash."""
    try:
        salt, hash_value = password_hash.split('$')
        new_hash = hashlib.pbkdf2_hmac(
            'sha256',
            password.encode('utf-8'),
            salt.encode('utf-8'),
            iterations=100000
        )
        return hmac.compare_digest(new_hash.hex(), hash_value)
    except Exception:
        return False


def check_password_strength(password: str) -> Dict[str, Any]:
    """Check password strength and return detailed analysis."""
    score = 0
    feedback = []

    if len(password) >= 12:
        score += 1
    else:
        feedback.append("Use at least 12 characters")

    if len(password) >= 16:
        score += 1

    if re.search(r'[A-Z]', password):
        score += 1
    else:
        feedback.append("Add uppercase letters")

    if re.search(r'[a-z]', password):
        score += 1
    else:
        feedback.append("Add lowercase letters")

    if re.search(r'\d', password):
        score += 1
    else:
        feedback.append("Add numbers")

    if re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        score += 1
    else:
        feedback.append("Add special characters")

    # Check for common patterns
    common_patterns = ['password', '123456', 'qwerty', 'admin']
    if any(p in password.lower() for p in common_patterns):
        score = max(0, score - 2)
        feedback.append("Avoid common words and patterns")

    strength = "weak"
    if score >= 5:
        strength = "strong"
    elif score >= 3:
        strength = "medium"

    return {
        "score": score,
        "max_score": 6,
        "strength": strength,
        "feedback": feedback,
        "meets_requirements": score >= 4 and len(feedback) == 0
    }


# ============================================================================
# TOKEN UTILITIES
# ============================================================================

def create_access_token(user_id: str, role: str, additional_claims: Dict = None) -> str:
    """Create JWT access token."""
    expires = datetime.utcnow() + timedelta(minutes=AuthConfig.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": user_id,
        "role": role,
        "type": "access",
        "exp": expires,
        "iat": datetime.utcnow(),
        "jti": secrets.token_hex(16)
    }
    if additional_claims:
        payload.update(additional_claims)
    return jwt.encode(payload, AuthConfig.SECRET_KEY, algorithm=AuthConfig.ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    """Create JWT refresh token."""
    expires = datetime.utcnow() + timedelta(days=AuthConfig.REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {
        "sub": user_id,
        "type": "refresh",
        "exp": expires,
        "iat": datetime.utcnow(),
        "jti": secrets.token_hex(16)
    }
    return jwt.encode(payload, AuthConfig.SECRET_KEY, algorithm=AuthConfig.ALGORITHM)


def verify_token(token: str, token_type: str = "access") -> Optional[Dict[str, Any]]:
    """Verify and decode JWT token."""
    try:
        payload = jwt.decode(token, AuthConfig.SECRET_KEY, algorithms=[AuthConfig.ALGORITHM])
        if payload.get("type") != token_type:
            return None
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


# ============================================================================
# AUTHENTICATION SERVICE
# ============================================================================

class AuthService:
    """
    Authentication service implementing:
    - Secure password hashing (PBKDF2-SHA256)
    - JWT token authentication
    - Session management
    - Account lockout protection
    - MFA support
    """

    def __init__(self):
        self.users: Dict[str, User] = {}
        self.sessions: Dict[str, Session] = {}
        self.email_to_user: Dict[str, str] = {}

    async def register(
        self,
        registration: UserRegistration,
        ip_address: str
    ) -> Dict[str, Any]:
        """Register a new user."""
        # Check if email already exists
        if registration.email.lower() in self.email_to_user:
            raise ValueError("Email already registered")

        # Create user
        user = User(
            email=registration.email.lower(),
            password_hash=hash_password(registration.password),
            first_name=registration.first_name,
            last_name=registration.last_name,
            phone=registration.phone,
        )

        # Store user
        self.users[user.id] = user
        self.email_to_user[user.email] = user.id

        # Generate email verification token
        verification_token = secrets.token_urlsafe(32)

        # In production: send verification email

        return {
            "user_id": user.id,
            "email": user.email,
            "status": user.status.value,
            "message": "Registration successful. Please verify your email.",
            "verification_required": True
        }

    async def login(
        self,
        request: LoginRequest,
        ip_address: str,
        user_agent: Optional[str] = None
    ) -> TokenResponse:
        """Authenticate user and create session."""
        email = request.email.lower()

        # Find user
        user_id = self.email_to_user.get(email)
        if not user_id:
            raise ValueError("Invalid email or password")

        user = self.users.get(user_id)
        if not user:
            raise ValueError("Invalid email or password")

        # Check account status
        if user.status == UserStatus.LOCKED:
            if user.locked_until and datetime.now() < user.locked_until:
                raise ValueError(f"Account locked. Try again after {user.locked_until}")
            else:
                # Unlock account
                user.status = UserStatus.ACTIVE
                user.failed_login_attempts = 0
                user.locked_until = None

        if user.status == UserStatus.SUSPENDED:
            raise ValueError("Account suspended. Contact support.")

        if user.status == UserStatus.DEACTIVATED:
            raise ValueError("Account deactivated.")

        # Verify password
        if not verify_password(request.password, user.password_hash):
            user.failed_login_attempts += 1

            if user.failed_login_attempts >= AuthConfig.MAX_LOGIN_ATTEMPTS:
                user.status = UserStatus.LOCKED
                user.locked_until = datetime.now() + timedelta(minutes=AuthConfig.LOCKOUT_DURATION_MINUTES)
                raise ValueError(f"Account locked due to too many failed attempts")

            raise ValueError("Invalid email or password")

        # Check MFA
        if user.mfa_enabled and not request.mfa_code:
            return TokenResponse(
                access_token="",
                refresh_token="",
                expires_in=0,
                user={"mfa_required": True}
            )

        # Reset failed attempts
        user.failed_login_attempts = 0
        user.last_login_at = datetime.now()

        # Create tokens
        access_token = create_access_token(user.id, user.role.value)
        refresh_token = create_refresh_token(user.id)

        # Create session
        expires_at = datetime.now() + timedelta(
            days=AuthConfig.REFRESH_TOKEN_EXPIRE_DAYS if request.remember_me
            else timedelta(minutes=AuthConfig.SESSION_TIMEOUT_MINUTES).days
        )

        session = Session(
            user_id=user.id,
            token_hash=hashlib.sha256(refresh_token.encode()).hexdigest(),
            ip_address=ip_address,
            user_agent=user_agent,
            expires_at=expires_at
        )
        self.sessions[session.id] = session

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=AuthConfig.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user={
                "id": user.id,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": user.role.value,
            }
        )

    async def refresh_token(self, refresh_token: str) -> TokenResponse:
        """Refresh access token using refresh token."""
        payload = verify_token(refresh_token, "refresh")
        if not payload:
            raise ValueError("Invalid or expired refresh token")

        user_id = payload.get("sub")
        user = self.users.get(user_id)
        if not user or user.status != UserStatus.ACTIVE:
            raise ValueError("User not found or inactive")

        # Create new access token
        access_token = create_access_token(user.id, user.role.value)

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,  # Reuse refresh token
            expires_in=AuthConfig.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user={
                "id": user.id,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": user.role.value,
            }
        )

    async def logout(self, user_id: str, session_id: Optional[str] = None):
        """Logout user and invalidate session(s)."""
        if session_id:
            # Invalidate specific session
            if session_id in self.sessions:
                self.sessions[session_id].is_valid = False
        else:
            # Invalidate all sessions for user
            for session in self.sessions.values():
                if session.user_id == user_id:
                    session.is_valid = False

    async def change_password(
        self,
        user_id: str,
        current_password: str,
        new_password: str
    ) -> bool:
        """Change user password."""
        user = self.users.get(user_id)
        if not user:
            raise ValueError("User not found")

        if not verify_password(current_password, user.password_hash):
            raise ValueError("Current password is incorrect")

        # Validate new password
        strength = check_password_strength(new_password)
        if not strength["meets_requirements"]:
            raise ValueError("; ".join(strength["feedback"]))

        user.password_hash = hash_password(new_password)
        user.password_changed_at = datetime.now()
        user.must_change_password = False

        # Invalidate all sessions
        for session in self.sessions.values():
            if session.user_id == user_id:
                session.is_valid = False

        return True

    async def request_password_reset(self, email: str) -> str:
        """Request password reset token."""
        email = email.lower()
        user_id = self.email_to_user.get(email)

        # Always return success to prevent email enumeration
        if not user_id:
            return "If the email exists, a reset link will be sent"

        # Generate reset token
        reset_token = secrets.token_urlsafe(32)

        # In production: save token and send email

        return "If the email exists, a reset link will be sent"

    def get_user(self, user_id: str) -> Optional[User]:
        """Get user by ID."""
        return self.users.get(user_id)

    def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email."""
        user_id = self.email_to_user.get(email.lower())
        if user_id:
            return self.users.get(user_id)
        return None


# Singleton instance
auth_service = AuthService()
