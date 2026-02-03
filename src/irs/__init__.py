"""
IRS MeF E-File Module
Comprehensive IRS e-file integration with MeF technical standards
"""

from .mef_standards import (
    MeFVersion,
    SubmissionType,
    TransmissionType,
    MeFNamespaces,
    MeFTransmitterInfo,
    MeFSubmissionManifest,
    MeFSecurityHeader,
    MeFValidationRules,
    MeFErrorCodes,
    ATSTestScenario,
    ATSTestSuite
)

from .xml_builder import (
    XMLNamespaceManager,
    IRSAmount,
    IRSXMLBuilder
)

from .ack_parser import (
    AckStatus,
    AlertCategory,
    IRSError,
    StateAck,
    AckResult,
    ACKParser,
    ACKStatusChecker
)

from .security_compliance import (
    SecurityLevel,
    ComplianceFramework,
    AuditLogEntry,
    PIIProtection,
    EncryptionService,
    AuditLogger,
    AccessControl,
    ComplianceChecker,
    SessionManager
)

__all__ = [
    # MeF Standards
    'MeFVersion',
    'SubmissionType',
    'TransmissionType',
    'MeFNamespaces',
    'MeFTransmitterInfo',
    'MeFSubmissionManifest',
    'MeFSecurityHeader',
    'MeFValidationRules',
    'MeFErrorCodes',
    'ATSTestScenario',
    'ATSTestSuite',

    # XML Builder
    'XMLNamespaceManager',
    'IRSAmount',
    'IRSXMLBuilder',

    # ACK Parser
    'AckStatus',
    'AlertCategory',
    'IRSError',
    'StateAck',
    'AckResult',
    'ACKParser',
    'ACKStatusChecker',

    # Security & Compliance
    'SecurityLevel',
    'ComplianceFramework',
    'AuditLogEntry',
    'PIIProtection',
    'EncryptionService',
    'AuditLogger',
    'AccessControl',
    'ComplianceChecker',
    'SessionManager'
]
