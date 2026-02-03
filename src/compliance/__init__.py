"""
ITF - Income. Tax. Financials
Compliance Module

Provides:
- State Authorization Management (50 states + DC)
- Compliance Framework (IRS Pub 1075, 4557, 1345, SOC-2)
- Audit Logging
- Consent Management (IRC §7216)
- Data Retention
- Incident Response
"""

from .state_authorization import (
    StateEFileConfig,
    StateAuthorization,
    StateAuthorizationManager,
    StateFilingType,
    AuthorizationStatus,
    STATE_EFILE_CONFIGS,
    state_auth_manager,
)

from .compliance_framework import (
    # Standards
    ComplianceStandard,
    RiskLevel,
    AccessAction,
    DataCategory,

    # Audit
    AuditLogEntry,
    AuditLogger,
    audit_logger,

    # Consent
    ConsentType,
    ConsentRecord,
    ConsentManager,
    consent_manager,

    # Retention
    RetentionCategory,
    DataRetentionManager,
    retention_manager,

    # Incidents
    IncidentSeverity,
    IncidentType,
    SecurityIncident,
    IncidentResponseManager,
    incident_manager,

    # Compliance
    ComplianceChecker,
    compliance_checker,

    # Decorators
    audit_access,
    require_consent,
)

__all__ = [
    # State Authorization
    "StateEFileConfig",
    "StateAuthorization",
    "StateAuthorizationManager",
    "StateFilingType",
    "AuthorizationStatus",
    "STATE_EFILE_CONFIGS",
    "state_auth_manager",

    # Compliance Framework
    "ComplianceStandard",
    "RiskLevel",
    "AccessAction",
    "DataCategory",
    "AuditLogEntry",
    "AuditLogger",
    "audit_logger",
    "ConsentType",
    "ConsentRecord",
    "ConsentManager",
    "consent_manager",
    "RetentionCategory",
    "DataRetentionManager",
    "retention_manager",
    "IncidentSeverity",
    "IncidentType",
    "SecurityIncident",
    "IncidentResponseManager",
    "incident_manager",
    "ComplianceChecker",
    "compliance_checker",
    "audit_access",
    "require_consent",
]
