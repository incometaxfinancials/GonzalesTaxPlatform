"""
IRS MeF E-File Module
Comprehensive IRS e-file integration with MeF technical standards

Reference Publications:
- Publication 4164: MeF Guide for Software Developers and Transmitters
- Publication 5446: MeF Submission Composition Guide
- Publication 1436: ATS Guidelines for MeF Individual Tax Returns
- Publication 3112: IRS e-File Application and Participation
- Publication 5594: Standard Postal Service State Abbreviations and ZIP Codes
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

from .a2a_toolkit import (
    MeFEndpoint,
    MeFOperation,
    CertificateType,
    MeFCertificate,
    A2AConfiguration,
    A2ASOAPEnvelope,
    ATSTestManager,
    IRSPublicationReference
)

from .form_schemas import (
    FormCategory,
    FormSchema,
    FORM_1040_SCHEMAS,
    SCHEDULE_SCHEMAS,
    BUSINESS_FORM_SCHEMAS,
    US_STATE_CODES,
    STATES_WITH_INCOME_TAX,
    STATES_NO_INCOME_TAX,
    BinaryAttachmentSpec,
    BINARY_ATTACHMENT_TYPES,
    PDF_NAMING_CONVENTIONS,
    FormSchemaManager
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
    'SessionManager',

    # A2A Toolkit
    'MeFEndpoint',
    'MeFOperation',
    'CertificateType',
    'MeFCertificate',
    'A2AConfiguration',
    'A2ASOAPEnvelope',
    'ATSTestManager',
    'IRSPublicationReference',

    # Form Schemas
    'FormCategory',
    'FormSchema',
    'FORM_1040_SCHEMAS',
    'SCHEDULE_SCHEMAS',
    'BUSINESS_FORM_SCHEMAS',
    'US_STATE_CODES',
    'STATES_WITH_INCOME_TAX',
    'STATES_NO_INCOME_TAX',
    'BinaryAttachmentSpec',
    'BINARY_ATTACHMENT_TYPES',
    'PDF_NAMING_CONVENTIONS',
    'FormSchemaManager'
]
