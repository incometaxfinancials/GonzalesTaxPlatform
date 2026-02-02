"""
GONZALES TAX PLATFORM - Core Configuration
Agent Marisol - Chief Software Architect

Centralized configuration management with environment-based settings.
"""
import os
from typing import Optional, List
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings
from enum import Enum


class Environment(str, Enum):
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"
    TESTING = "testing"


class IRSEnvironment(str, Enum):
    ATS = "ats"  # Assurance Testing System
    PRODUCTION = "production"


class Settings(BaseSettings):
    """Application settings with validation"""

    # ===========================================
    # APPLICATION SETTINGS
    # ===========================================
    APP_NAME: str = "Gonzales Tax Platform"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: Environment = Environment.DEVELOPMENT
    DEBUG: bool = Field(default=False)
    SECRET_KEY: str = Field(..., min_length=32)

    # ===========================================
    # DATABASE SETTINGS
    # ===========================================
    DATABASE_URL: str = Field(...)
    DATABASE_POOL_SIZE: int = Field(default=20, ge=5, le=100)
    DATABASE_MAX_OVERFLOW: int = Field(default=10, ge=0)
    DATABASE_ECHO: bool = Field(default=False)

    # ===========================================
    # REDIS SETTINGS
    # ===========================================
    REDIS_URL: str = Field(default="redis://localhost:6379")
    REDIS_MAX_CONNECTIONS: int = Field(default=50)
    CACHE_TTL_SECONDS: int = Field(default=3600)

    # ===========================================
    # IRS E-FILE SETTINGS (MeF)
    # ===========================================
    IRS_MEF_ENV: IRSEnvironment = IRSEnvironment.ATS
    IRS_EFIN: str = Field(...)  # Electronic Filing Identification Number
    IRS_ETIN: Optional[str] = None  # Electronic Transmitter Identification Number
    IRS_MEF_ENDPOINT_ATS: str = "https://la.www4.irs.gov/a2a/mef"
    IRS_MEF_ENDPOINT_PROD: str = "https://la.www4.irs.gov/a2a/mef"
    IRS_TRANSMITTER_CERT_PATH: Optional[str] = None
    IRS_TRANSMITTER_CERT_PASSWORD: Optional[str] = None

    # ===========================================
    # ENCRYPTION SETTINGS (Agent Catalina Security)
    # ===========================================
    ENCRYPTION_KEY: str = Field(..., min_length=32)
    AWS_KMS_KEY_ID: str = Field(...)
    AWS_REGION: str = Field(default="us-east-1")
    FIELD_ENCRYPTION_ENABLED: bool = Field(default=True)

    # ===========================================
    # AUTHENTICATION SETTINGS
    # ===========================================
    JWT_SECRET_KEY: str = Field(..., min_length=32)
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=30)
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = Field(default=7)
    MFA_REQUIRED: bool = Field(default=True)
    PASSWORD_MIN_LENGTH: int = Field(default=12)
    MAX_LOGIN_ATTEMPTS: int = Field(default=5)
    LOCKOUT_DURATION_MINUTES: int = Field(default=30)

    # ===========================================
    # STORAGE SETTINGS
    # ===========================================
    S3_BUCKET_DOCUMENTS: str = Field(default="gonzales-tax-documents")
    S3_BUCKET_RETURNS: str = Field(default="gonzales-tax-returns")
    MAX_UPLOAD_SIZE_MB: int = Field(default=50)
    ALLOWED_DOCUMENT_TYPES: List[str] = ["pdf", "jpg", "jpeg", "png", "heic"]

    # ===========================================
    # TAX CALCULATION SETTINGS (Agent Lliset)
    # ===========================================
    CURRENT_TAX_YEAR: int = Field(default=2025)
    SUPPORTED_TAX_YEARS: List[int] = [2023, 2024, 2025]
    DECIMAL_PRECISION: int = Field(default=2)
    RATE_PRECISION: int = Field(default=6)

    # OBBBA (One Big Beautiful Bill Act) Provisions
    OBBBA_CHILD_TAX_CREDIT: int = 2200
    OBBBA_CHILD_TAX_CREDIT_REFUNDABLE: int = 1700
    OBBBA_TIPS_DEDUCTION_MAX: int = 25000
    OBBBA_OVERTIME_DEDUCTION_MAX: int = 10000
    OBBBA_AUTO_LOAN_INTEREST_MAX: int = 10000
    OBBBA_SENIOR_DEDUCTION: int = 6000
    OBBBA_SALT_CAP: int = 40000
    OBBBA_TRUMP_ACCOUNT_SEED: int = 1000

    # ===========================================
    # AI/ML SETTINGS (Agent Lliset Intelligence)
    # ===========================================
    AI_MODEL_PROVIDER: str = "anthropic"
    AI_MODEL_NAME: str = "claude-3-5-sonnet-20241022"
    AI_DEDUCTION_FINDER_ENABLED: bool = True
    AI_AUDIT_RISK_ENABLED: bool = True
    AI_MAX_TOKENS: int = 4096

    # ===========================================
    # THIRD-PARTY INTEGRATIONS
    # ===========================================
    PLAID_CLIENT_ID: Optional[str] = None
    PLAID_SECRET: Optional[str] = None
    PLAID_ENV: str = "sandbox"

    STRIPE_SECRET_KEY: Optional[str] = None
    STRIPE_PUBLISHABLE_KEY: Optional[str] = None
    STRIPE_WEBHOOK_SECRET: Optional[str] = None

    TWILIO_ACCOUNT_SID: Optional[str] = None
    TWILIO_AUTH_TOKEN: Optional[str] = None
    TWILIO_PHONE_NUMBER: Optional[str] = None

    SENDGRID_API_KEY: Optional[str] = None

    # ===========================================
    # RATE LIMITING
    # ===========================================
    RATE_LIMIT_REQUESTS: int = Field(default=100)
    RATE_LIMIT_WINDOW_SECONDS: int = Field(default=60)

    # ===========================================
    # LOGGING
    # ===========================================
    LOG_LEVEL: str = Field(default="INFO")
    LOG_FORMAT: str = "json"
    AUDIT_LOG_ENABLED: bool = True

    # ===========================================
    # VALIDATORS
    # ===========================================
    @field_validator("ENVIRONMENT", mode="before")
    @classmethod
    def validate_environment(cls, v):
        if isinstance(v, str):
            return Environment(v.lower())
        return v

    @field_validator("IRS_MEF_ENV", mode="before")
    @classmethod
    def validate_irs_env(cls, v):
        if isinstance(v, str):
            return IRSEnvironment(v.lower())
        return v

    @property
    def irs_mef_endpoint(self) -> str:
        """Get the correct IRS MeF endpoint based on environment"""
        if self.IRS_MEF_ENV == IRSEnvironment.ATS:
            return self.IRS_MEF_ENDPOINT_ATS
        return self.IRS_MEF_ENDPOINT_PROD

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == Environment.PRODUCTION

    @property
    def database_url_async(self) -> str:
        """Convert sync database URL to async"""
        return self.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
        "extra": "ignore"
    }


# ===========================================
# TAX BRACKET CONFIGURATIONS (2025)
# ===========================================
TAX_BRACKETS_2025 = {
    "single": [
        (11600, 0.10),
        (47150, 0.12),
        (100525, 0.22),
        (191950, 0.24),
        (243725, 0.32),
        (609350, 0.35),
        (float("inf"), 0.37),
    ],
    "married_filing_jointly": [
        (23200, 0.10),
        (94300, 0.12),
        (201050, 0.22),
        (383900, 0.24),
        (487450, 0.32),
        (731200, 0.35),
        (float("inf"), 0.37),
    ],
    "married_filing_separately": [
        (11600, 0.10),
        (47150, 0.12),
        (100525, 0.22),
        (191950, 0.24),
        (243725, 0.32),
        (365600, 0.35),
        (float("inf"), 0.37),
    ],
    "head_of_household": [
        (16550, 0.10),
        (63100, 0.12),
        (100500, 0.22),
        (191950, 0.24),
        (243700, 0.32),
        (609350, 0.35),
        (float("inf"), 0.37),
    ],
}

# Standard Deductions 2025
STANDARD_DEDUCTIONS_2025 = {
    "single": 14600,
    "married_filing_jointly": 29200,
    "married_filing_separately": 14600,
    "head_of_household": 21900,
    "qualified_widow": 29200,
}

# Additional Standard Deduction (65+ or blind)
ADDITIONAL_STANDARD_DEDUCTION_2025 = {
    "single": 1950,
    "married": 1550,
}


# ===========================================
# SINGLETON SETTINGS INSTANCE
# ===========================================
_settings: Optional[Settings] = None


def get_settings() -> Settings:
    """Get cached settings instance"""
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings


def reload_settings() -> Settings:
    """Force reload settings (useful for testing)"""
    global _settings
    _settings = Settings()
    return _settings
