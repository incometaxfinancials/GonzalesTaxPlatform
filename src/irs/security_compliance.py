"""
IRS Security and Compliance Module
Implements IRS Publication 4557 requirements and industry security standards
"""

import hashlib
import hmac
import secrets
import base64
import re
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
import json
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import logging


class SecurityLevel(Enum):
    """Data security classification levels"""
    PUBLIC = "public"
    INTERNAL = "internal"
    CONFIDENTIAL = "confidential"
    PII = "pii"
    FTI = "fti"  # Federal Tax Information


class ComplianceFramework(Enum):
    """Applicable compliance frameworks"""
    IRS_PUB_4557 = "IRS Publication 4557"
    IRS_PUB_1075 = "IRS Publication 1075"
    NIST_800_53 = "NIST 800-53"
    SOC2_TYPE2 = "SOC 2 Type II"
    GLBA = "Gramm-Leach-Bliley Act"
    PCI_DSS = "PCI DSS"


@dataclass
class AuditLogEntry:
    """Audit trail log entry"""
    timestamp: datetime
    user_id: str
    action: str
    resource_type: str
    resource_id: str
    ip_address: str
    user_agent: str
    status: str
    details: Dict[str, Any] = field(default_factory=dict)
    previous_hash: str = ""
    entry_hash: str = ""

    def calculate_hash(self) -> str:
        """Calculate tamper-evident hash"""
        data = f"{self.timestamp.isoformat()}|{self.user_id}|{self.action}|" \
               f"{self.resource_type}|{self.resource_id}|{self.status}|{self.previous_hash}"
        return hashlib.sha256(data.encode()).hexdigest()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "timestamp": self.timestamp.isoformat(),
            "user_id": self.user_id,
            "action": self.action,
            "resource_type": self.resource_type,
            "resource_id": self.resource_id,
            "ip_address": self.ip_address,
            "user_agent": self.user_agent,
            "status": self.status,
            "details": self.details,
            "entry_hash": self.entry_hash
        }


class PIIProtection:
    """PII (Personally Identifiable Information) Protection"""

    # Fields classified as PII
    PII_FIELDS = {
        'ssn', 'social_security_number', 'ein', 'itin',
        'date_of_birth', 'dob', 'birth_date',
        'bank_account', 'account_number', 'routing_number',
        'credit_card', 'card_number',
        'driver_license', 'passport_number',
        'mother_maiden_name', 'security_answer'
    }

    # Fields classified as FTI (Federal Tax Information)
    FTI_FIELDS = {
        'agi', 'adjusted_gross_income', 'taxable_income',
        'refund_amount', 'tax_liability', 'withholding',
        'w2_wages', 'self_employment_income',
        'prior_year_agi', 'prior_year_pin'
    }

    @classmethod
    def mask_ssn(cls, ssn: str) -> str:
        """Mask SSN showing only last 4 digits"""
        digits = re.sub(r'[^0-9]', '', ssn)
        if len(digits) >= 4:
            return f"XXX-XX-{digits[-4:]}"
        return "XXX-XX-XXXX"

    @classmethod
    def mask_ein(cls, ein: str) -> str:
        """Mask EIN showing only last 4 digits"""
        digits = re.sub(r'[^0-9]', '', ein)
        if len(digits) >= 4:
            return f"XX-XXX{digits[-4:]}"
        return "XX-XXXXXXX"

    @classmethod
    def mask_account_number(cls, account: str) -> str:
        """Mask bank account number"""
        if len(account) >= 4:
            return f"{'*' * (len(account) - 4)}{account[-4:]}"
        return "****"

    @classmethod
    def mask_field(cls, field_name: str, value: str) -> str:
        """Automatically mask a field based on its type"""
        field_lower = field_name.lower()

        if 'ssn' in field_lower or 'social_security' in field_lower:
            return cls.mask_ssn(value)
        elif 'ein' in field_lower:
            return cls.mask_ein(value)
        elif 'account' in field_lower or 'routing' in field_lower:
            return cls.mask_account_number(value)
        elif field_lower in cls.PII_FIELDS:
            # Generic masking for other PII
            if len(value) > 4:
                return f"{'*' * (len(value) - 4)}{value[-4:]}"
            return "****"

        return value

    @classmethod
    def sanitize_for_logging(cls, data: Dict[str, Any]) -> Dict[str, Any]:
        """Sanitize data dict for safe logging"""
        sanitized = {}
        for key, value in data.items():
            key_lower = key.lower()
            if key_lower in cls.PII_FIELDS or key_lower in cls.FTI_FIELDS:
                if isinstance(value, str):
                    sanitized[key] = cls.mask_field(key, value)
                else:
                    sanitized[key] = "[REDACTED]"
            elif isinstance(value, dict):
                sanitized[key] = cls.sanitize_for_logging(value)
            elif isinstance(value, list):
                sanitized[key] = [
                    cls.sanitize_for_logging(item) if isinstance(item, dict)
                    else item
                    for item in value
                ]
            else:
                sanitized[key] = value
        return sanitized


class EncryptionService:
    """Encryption service for data at rest and in transit"""

    def __init__(self, master_key: Optional[bytes] = None):
        if master_key:
            self.master_key = master_key
        else:
            self.master_key = self._derive_key_from_env()

    def _derive_key_from_env(self) -> bytes:
        """Derive encryption key from environment (placeholder)"""
        # In production, this would come from a secure key management service
        # like AWS KMS, Azure Key Vault, or HashiCorp Vault
        password = b"gonzales-tax-platform-dev-key"
        salt = b"gonzales-tax-salt-2025"

        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=480000,
        )
        return base64.urlsafe_b64encode(kdf.derive(password))

    def encrypt(self, data: str) -> str:
        """Encrypt string data"""
        fernet = Fernet(self.master_key)
        encrypted = fernet.encrypt(data.encode())
        return base64.urlsafe_b64encode(encrypted).decode()

    def decrypt(self, encrypted_data: str) -> str:
        """Decrypt string data"""
        fernet = Fernet(self.master_key)
        decoded = base64.urlsafe_b64decode(encrypted_data.encode())
        decrypted = fernet.decrypt(decoded)
        return decrypted.decode()

    def encrypt_pii(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Encrypt PII fields in a dictionary"""
        encrypted = {}
        for key, value in data.items():
            if key.lower() in PIIProtection.PII_FIELDS:
                if isinstance(value, str):
                    encrypted[key] = self.encrypt(value)
                    encrypted[f"{key}_encrypted"] = True
                else:
                    encrypted[key] = value
            elif isinstance(value, dict):
                encrypted[key] = self.encrypt_pii(value)
            else:
                encrypted[key] = value
        return encrypted

    def generate_secure_token(self, length: int = 32) -> str:
        """Generate a cryptographically secure token"""
        return secrets.token_urlsafe(length)


class AuditLogger:
    """Tamper-evident audit logging system"""

    def __init__(self):
        self.entries: List[AuditLogEntry] = []
        self.previous_hash = "GENESIS"
        self.logger = logging.getLogger("audit")

    def log(self, user_id: str, action: str, resource_type: str,
            resource_id: str, ip_address: str, user_agent: str,
            status: str, details: Optional[Dict] = None) -> AuditLogEntry:
        """Create an audit log entry"""

        # Sanitize details for logging
        safe_details = PIIProtection.sanitize_for_logging(details or {})

        entry = AuditLogEntry(
            timestamp=datetime.utcnow(),
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            ip_address=ip_address,
            user_agent=user_agent,
            status=status,
            details=safe_details,
            previous_hash=self.previous_hash
        )

        # Calculate tamper-evident hash
        entry.entry_hash = entry.calculate_hash()
        self.previous_hash = entry.entry_hash

        self.entries.append(entry)

        # Also log to standard logger
        self.logger.info(
            f"AUDIT: {action} | User: {user_id} | Resource: {resource_type}/{resource_id} | "
            f"Status: {status} | Hash: {entry.entry_hash[:16]}..."
        )

        return entry

    def verify_chain(self) -> Tuple[bool, List[int]]:
        """Verify the integrity of the audit log chain"""
        invalid_entries = []

        for i, entry in enumerate(self.entries):
            # Verify hash
            expected_hash = entry.calculate_hash()
            if entry.entry_hash != expected_hash:
                invalid_entries.append(i)
                continue

            # Verify chain link
            if i > 0:
                if entry.previous_hash != self.entries[i - 1].entry_hash:
                    invalid_entries.append(i)

        return len(invalid_entries) == 0, invalid_entries

    def export_for_compliance(self) -> List[Dict]:
        """Export audit logs for compliance reporting"""
        return [entry.to_dict() for entry in self.entries]


class AccessControl:
    """Role-based access control for tax data"""

    ROLES = {
        "admin": {
            "description": "Full system access",
            "permissions": ["read", "write", "delete", "admin", "view_pii", "export"]
        },
        "preparer": {
            "description": "Tax preparer with full return access",
            "permissions": ["read", "write", "view_pii", "submit"]
        },
        "reviewer": {
            "description": "Review returns before submission",
            "permissions": ["read", "view_pii", "approve", "reject"]
        },
        "support": {
            "description": "Customer support - limited access",
            "permissions": ["read", "view_masked_pii"]
        },
        "client": {
            "description": "Tax client self-service",
            "permissions": ["read_own", "write_own", "view_own_pii"]
        }
    }

    RESOURCE_PERMISSIONS = {
        "tax_return": ["read", "write", "delete", "submit", "view_pii"],
        "client_profile": ["read", "write", "delete", "view_pii"],
        "w2_document": ["read", "write", "delete", "view_pii"],
        "bank_info": ["read", "write", "view_pii"],
        "audit_log": ["read", "export", "admin"],
        "user_account": ["read", "write", "delete", "admin"]
    }

    @classmethod
    def check_permission(cls, role: str, resource: str, action: str) -> bool:
        """Check if role has permission for action on resource"""
        if role not in cls.ROLES:
            return False

        role_permissions = cls.ROLES[role]["permissions"]

        # Admin has all permissions
        if "admin" in role_permissions:
            return True

        # Check specific permission
        if action in role_permissions:
            return True

        # Check own-resource permissions
        if f"{action}_own" in role_permissions:
            # This would be validated with actual user/resource ownership
            return True

        return False

    @classmethod
    def get_allowed_actions(cls, role: str, resource: str) -> List[str]:
        """Get list of allowed actions for role on resource"""
        if role not in cls.ROLES:
            return []

        role_permissions = cls.ROLES[role]["permissions"]
        resource_actions = cls.RESOURCE_PERMISSIONS.get(resource, [])

        allowed = []
        for action in resource_actions:
            if cls.check_permission(role, resource, action):
                allowed.append(action)

        return allowed


class ComplianceChecker:
    """Verify compliance with IRS and industry standards"""

    IRS_4557_REQUIREMENTS = {
        "encryption_at_rest": "All FTI must be encrypted when stored",
        "encryption_in_transit": "All data transmission must use TLS 1.2+",
        "access_control": "Role-based access control required",
        "audit_logging": "All access to FTI must be logged",
        "background_checks": "All personnel with FTI access must have background checks",
        "security_awareness": "Annual security awareness training required",
        "incident_response": "Incident response plan required",
        "data_retention": "FTI retention limited to business need",
        "secure_disposal": "FTI must be securely disposed when no longer needed"
    }

    IRS_1075_REQUIREMENTS = {
        "safeguard_fti": "Implement safeguards for FTI",
        "restrict_access": "Restrict FTI access to need-to-know",
        "report_incidents": "Report security incidents to IRS",
        "inspection_rights": "Allow IRS inspection of safeguards"
    }

    @classmethod
    def check_requirements(cls, config: Dict[str, bool]) -> Dict[str, Any]:
        """Check compliance against requirements"""
        results = {
            "compliant": True,
            "irs_4557": {"passed": [], "failed": []},
            "irs_1075": {"passed": [], "failed": []}
        }

        for req_id, description in cls.IRS_4557_REQUIREMENTS.items():
            if config.get(req_id, False):
                results["irs_4557"]["passed"].append({
                    "requirement": req_id,
                    "description": description,
                    "status": "PASS"
                })
            else:
                results["irs_4557"]["failed"].append({
                    "requirement": req_id,
                    "description": description,
                    "status": "FAIL"
                })
                results["compliant"] = False

        for req_id, description in cls.IRS_1075_REQUIREMENTS.items():
            if config.get(req_id, False):
                results["irs_1075"]["passed"].append({
                    "requirement": req_id,
                    "description": description,
                    "status": "PASS"
                })
            else:
                results["irs_1075"]["failed"].append({
                    "requirement": req_id,
                    "description": description,
                    "status": "FAIL"
                })
                results["compliant"] = False

        return results


class SessionManager:
    """Secure session management"""

    SESSION_TIMEOUT_MINUTES = 15
    MAX_SESSIONS_PER_USER = 3

    def __init__(self):
        self.sessions: Dict[str, Dict[str, Any]] = {}
        self.encryption = EncryptionService()

    def create_session(self, user_id: str, ip_address: str,
                       user_agent: str) -> str:
        """Create a new secure session"""
        # Check max sessions
        user_sessions = [
            sid for sid, data in self.sessions.items()
            if data["user_id"] == user_id
        ]
        if len(user_sessions) >= self.MAX_SESSIONS_PER_USER:
            # Remove oldest session
            oldest = min(user_sessions,
                        key=lambda s: self.sessions[s]["created_at"])
            del self.sessions[oldest]

        session_id = self.encryption.generate_secure_token(48)
        now = datetime.utcnow()

        self.sessions[session_id] = {
            "user_id": user_id,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "created_at": now,
            "last_activity": now,
            "expires_at": now + timedelta(minutes=self.SESSION_TIMEOUT_MINUTES)
        }

        return session_id

    def validate_session(self, session_id: str, ip_address: str) -> Optional[Dict]:
        """Validate and refresh session"""
        if session_id not in self.sessions:
            return None

        session = self.sessions[session_id]
        now = datetime.utcnow()

        # Check expiration
        if now > session["expires_at"]:
            del self.sessions[session_id]
            return None

        # Validate IP (optional - can be disabled for mobile)
        # if session["ip_address"] != ip_address:
        #     return None

        # Refresh session
        session["last_activity"] = now
        session["expires_at"] = now + timedelta(minutes=self.SESSION_TIMEOUT_MINUTES)

        return session

    def destroy_session(self, session_id: str) -> bool:
        """Destroy a session"""
        if session_id in self.sessions:
            del self.sessions[session_id]
            return True
        return False

    def destroy_user_sessions(self, user_id: str) -> int:
        """Destroy all sessions for a user"""
        to_remove = [
            sid for sid, data in self.sessions.items()
            if data["user_id"] == user_id
        ]
        for sid in to_remove:
            del self.sessions[sid]
        return len(to_remove)
