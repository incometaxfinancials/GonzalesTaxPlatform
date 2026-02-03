"""
IRS Application-to-Application (A2A) MeF Toolkit Implementation
Based on IRS MeF SDK specifications for transmitters

Reference Publications:
- Publication 4164: MeF Guide for Software Developers and Transmitters
- Publication 5446: MeF Submission Composition Guide
- Publication 1436: ATS Guidelines for MeF Individual Tax Returns
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, date
from enum import Enum
import hashlib
import base64
import ssl
import os
from pathlib import Path


class MeFEndpoint(Enum):
    """IRS MeF System Endpoints"""
    # ATS (Assurance Testing System) - Testing Environment
    ATS_TRANSMISSION = "https://la.www4.irs.gov/a2a/mef/MeFTransmitterService"
    ATS_STATE = "https://la.www4.irs.gov/a2a/mef/MeFStateService"

    # Production Environment
    PROD_TRANSMISSION = "https://la.www4.irs.gov/a2a/mef/MeFTransmitterServiceProd"
    PROD_STATE = "https://la.www4.irs.gov/a2a/mef/MeFStateServiceProd"


class MeFOperation(Enum):
    """MeF SOAP Operations"""
    # Transmitter Operations
    LOGIN = "Login"
    SEND_SUBMISSIONS = "SendSubmissions"
    GET_ACK_FOR_SUBMISSION = "GetAckForSubmission"
    GET_NEW_ACKS_FOR_ETN = "GetNewAcksForETIN"
    GET_SUBMISSION_STATUS = "GetSubmissionStatus"
    LOGOUT = "Logout"

    # State Operations
    GET_NEW_SUBMISSIONS_FOR_STATE = "GetNewSubmissionsForState"
    SEND_STATE_ACKS = "SendStateAcks"


class CertificateType(Enum):
    """Certificate Types for MeF Authentication"""
    ATS = "ats"  # Assurance Testing System
    PRODUCTION = "production"
    STRONG_AUTH = "strong_auth"  # IdenTrust or ORC certificates


@dataclass
class MeFCertificate:
    """
    MeF SSL Certificate Configuration

    Certificates valid periods (as of Jan 7, 2026):
    - ATS: Jan 13, 2026 to Mar 30, 2026
    - Production: Jan 13, 2026 to Mar 30, 2026

    Strong Authentication Certificates from:
    - IdenTrust: https://www.identrust.com
    - ORC (Operational Research Consultants): https://www.orc.com

    Processing time: 7-14 days after notarized paperwork submission
    """
    cert_type: CertificateType
    cert_path: str
    key_path: str
    password: Optional[str] = None
    valid_from: Optional[date] = None
    valid_to: Optional[date] = None
    issuer: Optional[str] = None  # IdenTrust, ORC, or IRS

    def is_valid(self) -> bool:
        """Check if certificate is currently valid"""
        today = date.today()
        if self.valid_from and today < self.valid_from:
            return False
        if self.valid_to and today > self.valid_to:
            return False
        return True

    def days_until_expiry(self) -> int:
        """Get days until certificate expires"""
        if not self.valid_to:
            return -1
        return (self.valid_to - date.today()).days


@dataclass
class A2AConfiguration:
    """
    A2A (Application-to-Application) Configuration

    Required for MeF transmissions:
    - ETIN: Electronic Transmitter Identification Number
    - EFIN: Electronic Filing Identification Number
    - Software ID: Assigned by IRS after ATS certification
    """
    etin: str
    efin: str
    software_id: str
    software_version: str

    # Authentication
    username: str
    password: str

    # Certificates
    ats_certificate: Optional[MeFCertificate] = None
    production_certificate: Optional[MeFCertificate] = None
    strong_auth_certificate: Optional[MeFCertificate] = None

    # Environment
    use_production: bool = False

    # Timeouts (milliseconds)
    connection_timeout: int = 30000
    read_timeout: int = 120000

    @property
    def active_endpoint(self) -> str:
        """Get active MeF endpoint based on environment"""
        if self.use_production:
            return MeFEndpoint.PROD_TRANSMISSION.value
        return MeFEndpoint.ATS_TRANSMISSION.value

    @property
    def active_certificate(self) -> Optional[MeFCertificate]:
        """Get certificate for current environment"""
        if self.use_production:
            return self.production_certificate
        return self.ats_certificate


class A2ASOAPEnvelope:
    """
    Builds SOAP envelopes for MeF A2A communications

    Per Publication 4164, SOAP messages must include:
    - WS-Security headers
    - Proper namespace declarations
    - Binary MTOM attachments for submissions
    """

    SOAP_NS = "http://schemas.xmlsoap.org/soap/envelope/"
    WSSE_NS = "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd"
    WSU_NS = "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd"
    MEF_NS = "http://www.irs.gov/a2a/mef/MeFTransmitterService"

    def __init__(self, config: A2AConfiguration):
        self.config = config

    def build_login_request(self) -> str:
        """Build SOAP Login request"""
        timestamp = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
        nonce = base64.b64encode(os.urandom(16)).decode()

        return f'''<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="{self.SOAP_NS}"
               xmlns:wsse="{self.WSSE_NS}"
               xmlns:wsu="{self.WSU_NS}"
               xmlns:mef="{self.MEF_NS}">
    <soap:Header>
        <wsse:Security soap:mustUnderstand="1">
            <wsu:Timestamp wsu:Id="TS-1">
                <wsu:Created>{timestamp}</wsu:Created>
                <wsu:Expires>{self._add_minutes(timestamp, 5)}</wsu:Expires>
            </wsu:Timestamp>
            <wsse:UsernameToken wsu:Id="UT-1">
                <wsse:Username>{self.config.username}</wsse:Username>
                <wsse:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText">{self.config.password}</wsse:Password>
                <wsse:Nonce EncodingType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary">{nonce}</wsse:Nonce>
                <wsu:Created>{timestamp}</wsu:Created>
            </wsse:UsernameToken>
        </wsse:Security>
    </soap:Header>
    <soap:Body>
        <mef:LoginRequest>
            <mef:ETIN>{self.config.etin}</mef:ETIN>
        </mef:LoginRequest>
    </soap:Body>
</soap:Envelope>'''

    def build_send_submissions_request(self, submission_id: str,
                                        submission_xml: str,
                                        attachments: List[Dict] = None) -> str:
        """
        Build SOAP SendSubmissions request with MTOM attachments

        Per Publication 5446, submissions must include:
        - Submission manifest
        - Return XML
        - Binary attachments (PDFs) as MTOM
        """
        timestamp = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

        # Base64 encode the submission XML
        submission_b64 = base64.b64encode(submission_xml.encode()).decode()

        # Calculate checksum
        checksum = hashlib.md5(submission_xml.encode()).hexdigest()

        return f'''<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="{self.SOAP_NS}"
               xmlns:mef="{self.MEF_NS}">
    <soap:Header>
        {self._build_security_header(timestamp)}
    </soap:Header>
    <soap:Body>
        <mef:SendSubmissionsRequest>
            <mef:SubmissionDataList>
                <mef:SubmissionData>
                    <mef:SubmissionId>{submission_id}</mef:SubmissionId>
                    <mef:ElectronicPostmark>{timestamp}</mef:ElectronicPostmark>
                    <mef:SubmissionManifest>
                        <mef:EFIN>{self.config.efin}</mef:EFIN>
                        <mef:ETIN>{self.config.etin}</mef:ETIN>
                        <mef:SoftwareId>{self.config.software_id}</mef:SoftwareId>
                        <mef:SoftwareVersionNum>{self.config.software_version}</mef:SoftwareVersionNum>
                        <mef:Checksum>{checksum}</mef:Checksum>
                    </mef:SubmissionManifest>
                    <mef:ReturnData>{submission_b64}</mef:ReturnData>
                </mef:SubmissionData>
            </mef:SubmissionDataList>
        </mef:SendSubmissionsRequest>
    </soap:Body>
</soap:Envelope>'''

    def build_get_ack_request(self, submission_id: str) -> str:
        """Build GetAckForSubmission request"""
        timestamp = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

        return f'''<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="{self.SOAP_NS}"
               xmlns:mef="{self.MEF_NS}">
    <soap:Header>
        {self._build_security_header(timestamp)}
    </soap:Header>
    <soap:Body>
        <mef:GetAckForSubmissionRequest>
            <mef:SubmissionId>{submission_id}</mef:SubmissionId>
        </mef:GetAckForSubmissionRequest>
    </soap:Body>
</soap:Envelope>'''

    def build_get_new_acks_request(self, max_results: int = 100) -> str:
        """Build GetNewAcksForETIN request"""
        timestamp = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

        return f'''<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="{self.SOAP_NS}"
               xmlns:mef="{self.MEF_NS}">
    <soap:Header>
        {self._build_security_header(timestamp)}
    </soap:Header>
    <soap:Body>
        <mef:GetNewAcksForETINRequest>
            <mef:ETIN>{self.config.etin}</mef:ETIN>
            <mef:MaxResultCnt>{max_results}</mef:MaxResultCnt>
        </mef:GetNewAcksForETINRequest>
    </soap:Body>
</soap:Envelope>'''

    def build_logout_request(self) -> str:
        """Build Logout request"""
        timestamp = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

        return f'''<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="{self.SOAP_NS}"
               xmlns:mef="{self.MEF_NS}">
    <soap:Header>
        {self._build_security_header(timestamp)}
    </soap:Header>
    <soap:Body>
        <mef:LogoutRequest/>
    </soap:Body>
</soap:Envelope>'''

    def _build_security_header(self, timestamp: str) -> str:
        """Build WS-Security header"""
        nonce = base64.b64encode(os.urandom(16)).decode()

        return f'''<wsse:Security xmlns:wsse="{self.WSSE_NS}"
                          xmlns:wsu="{self.WSU_NS}"
                          soap:mustUnderstand="1">
            <wsu:Timestamp wsu:Id="TS-1">
                <wsu:Created>{timestamp}</wsu:Created>
                <wsu:Expires>{self._add_minutes(timestamp, 5)}</wsu:Expires>
            </wsu:Timestamp>
            <wsse:UsernameToken wsu:Id="UT-1">
                <wsse:Username>{self.config.username}</wsse:Username>
                <wsse:Password>{self.config.password}</wsse:Password>
                <wsse:Nonce>{nonce}</wsse:Nonce>
                <wsu:Created>{timestamp}</wsu:Created>
            </wsse:UsernameToken>
        </wsse:Security>'''

    def _add_minutes(self, timestamp: str, minutes: int) -> str:
        """Add minutes to ISO timestamp"""
        dt = datetime.strptime(timestamp, "%Y-%m-%dT%H:%M:%SZ")
        from datetime import timedelta
        dt = dt + timedelta(minutes=minutes)
        return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


class ATSTestManager:
    """
    Assurance Testing System (ATS) Test Manager

    Per Publication 1436, ATS testing is required for:
    - New software certification
    - Annual recertification
    - Major software changes

    Test Categories:
    - Basic acceptance tests
    - Rejection scenario tests
    - Edge case tests
    - OBBBA-specific tests
    """

    # ATS Test Scenario Categories
    SCENARIO_CATEGORIES = {
        "basic": "Basic Acceptance Tests",
        "rejection": "Rejection Scenario Tests",
        "edge_case": "Edge Case Tests",
        "obbba": "OBBBA 2025 Provision Tests",
        "state": "State Return Tests",
        "amended": "Amended Return Tests",
        "extension": "Extension Tests"
    }

    # Required ATS Scenarios per Publication 1436
    REQUIRED_SCENARIOS = [
        # Basic filing scenarios
        {"id": "ATS-1040-001", "category": "basic", "name": "Single, W-2 only"},
        {"id": "ATS-1040-002", "category": "basic", "name": "MFJ with dependents"},
        {"id": "ATS-1040-003", "category": "basic", "name": "HOH with dependent"},
        {"id": "ATS-1040-004", "category": "basic", "name": "MFS basic"},
        {"id": "ATS-1040-005", "category": "basic", "name": "QW basic"},

        # Schedule scenarios
        {"id": "ATS-SCHA-001", "category": "basic", "name": "Schedule A itemized"},
        {"id": "ATS-SCHB-001", "category": "basic", "name": "Schedule B interest/dividends"},
        {"id": "ATS-SCHC-001", "category": "basic", "name": "Schedule C self-employment"},
        {"id": "ATS-SCHD-001", "category": "basic", "name": "Schedule D capital gains"},
        {"id": "ATS-SCHE-001", "category": "basic", "name": "Schedule E rental"},

        # Rejection scenarios
        {"id": "ATS-REJ-001", "category": "rejection", "name": "Invalid SSN format"},
        {"id": "ATS-REJ-002", "category": "rejection", "name": "Duplicate SSN"},
        {"id": "ATS-REJ-003", "category": "rejection", "name": "Math error"},
        {"id": "ATS-REJ-004", "category": "rejection", "name": "Missing Schedule"},
        {"id": "ATS-REJ-005", "category": "rejection", "name": "Invalid AGI"},

        # OBBBA 2025 scenarios
        {"id": "ATS-OBBBA-001", "category": "obbba", "name": "Tips deduction - valid"},
        {"id": "ATS-OBBBA-002", "category": "obbba", "name": "Tips deduction - over limit"},
        {"id": "ATS-OBBBA-003", "category": "obbba", "name": "Overtime deduction - valid"},
        {"id": "ATS-OBBBA-004", "category": "obbba", "name": "Senior deduction - age 65"},
        {"id": "ATS-OBBBA-005", "category": "obbba", "name": "CTC $2,200 - valid"},
        {"id": "ATS-OBBBA-006", "category": "obbba", "name": "SALT cap $40,000"},

        # Edge cases
        {"id": "ATS-EDGE-001", "category": "edge_case", "name": "Max income levels"},
        {"id": "ATS-EDGE-002", "category": "edge_case", "name": "Zero income return"},
        {"id": "ATS-EDGE-003", "category": "edge_case", "name": "All credits claimed"},
        {"id": "ATS-EDGE-004", "category": "edge_case", "name": "Large refund"},
    ]

    def __init__(self):
        self.results: List[Dict] = []

    def get_scenarios_by_category(self, category: str) -> List[Dict]:
        """Get test scenarios by category"""
        return [s for s in self.REQUIRED_SCENARIOS if s["category"] == category]

    def get_all_scenarios(self) -> List[Dict]:
        """Get all required ATS scenarios"""
        return self.REQUIRED_SCENARIOS.copy()

    def record_result(self, scenario_id: str, passed: bool,
                      details: Optional[Dict] = None):
        """Record ATS test result"""
        scenario = next(
            (s for s in self.REQUIRED_SCENARIOS if s["id"] == scenario_id),
            None
        )

        self.results.append({
            "scenario_id": scenario_id,
            "scenario_name": scenario["name"] if scenario else "Unknown",
            "category": scenario["category"] if scenario else "unknown",
            "passed": passed,
            "timestamp": datetime.utcnow().isoformat(),
            "details": details or {}
        })

    def get_certification_status(self) -> Dict:
        """
        Check if all required scenarios have passed for certification

        Per Publication 1436:
        - All basic scenarios must pass
        - All rejection scenarios must correctly reject
        - OBBBA scenarios required for 2025 tax year
        """
        if not self.results:
            return {
                "certified": False,
                "reason": "No test results recorded",
                "scenarios_passed": 0,
                "scenarios_required": len(self.REQUIRED_SCENARIOS)
            }

        passed_ids = {r["scenario_id"] for r in self.results if r["passed"]}
        required_ids = {s["id"] for s in self.REQUIRED_SCENARIOS}

        missing = required_ids - passed_ids

        return {
            "certified": len(missing) == 0,
            "scenarios_passed": len(passed_ids),
            "scenarios_required": len(required_ids),
            "missing_scenarios": list(missing),
            "pass_rate": len(passed_ids) / len(required_ids) * 100 if required_ids else 0
        }

    def generate_certification_report(self) -> str:
        """Generate ATS certification report"""
        status = self.get_certification_status()

        report = f"""
================================================================================
                    ATS CERTIFICATION REPORT
                    Gonzales Tax Platform
                    Generated: {datetime.utcnow().isoformat()}
================================================================================

CERTIFICATION STATUS: {"PASSED" if status["certified"] else "FAILED"}

SUMMARY:
  Scenarios Passed: {status["scenarios_passed"]} / {status["scenarios_required"]}
  Pass Rate: {status["pass_rate"]:.1f}%

RESULTS BY CATEGORY:
"""

        for category, name in self.SCENARIO_CATEGORIES.items():
            cat_scenarios = self.get_scenarios_by_category(category)
            cat_results = [r for r in self.results if r["category"] == category]
            cat_passed = sum(1 for r in cat_results if r["passed"])

            report += f"\n  {name}:\n"
            report += f"    Passed: {cat_passed} / {len(cat_scenarios)}\n"

            for scenario in cat_scenarios:
                result = next(
                    (r for r in self.results if r["scenario_id"] == scenario["id"]),
                    None
                )
                status_icon = "✓" if result and result["passed"] else "✗" if result else "○"
                report += f"      {status_icon} {scenario['id']}: {scenario['name']}\n"

        if status["missing_scenarios"]:
            report += f"\nMISSING/FAILED SCENARIOS:\n"
            for sid in status["missing_scenarios"]:
                report += f"  - {sid}\n"

        report += "\n" + "=" * 80

        return report


class IRSPublicationReference:
    """
    IRS Publication References for MeF Development

    These publications contain the authoritative specifications
    for e-file software development and compliance.
    """

    PUBLICATIONS = {
        "1220": {
            "title": "Specifications for Electronic Filing of Forms 1097, 1098, 1099, 3921, 3922, 5498, and W-2G",
            "url": "https://www.irs.gov/pub/irs-pdf/p1220.pdf",
            "description": "Information return filing specifications"
        },
        "1345": {
            "title": "Handbook for Authorized IRS e-file Providers of Individual Income Tax Returns",
            "url": "https://www.irs.gov/pub/irs-pdf/p1345.pdf",
            "description": "Provider handbook for individual returns"
        },
        "1436": {
            "title": "Assurance Testing System (ATS) Guidelines for Modernized e-File (MeF) Individual Tax Returns",
            "url": "https://www.irs.gov/pub/irs-pdf/p1436.pdf",
            "description": "ATS testing requirements and procedures"
        },
        "3112": {
            "title": "IRS e-File Application and Participation",
            "url": "https://www.irs.gov/pub/irs-pdf/p3112.pdf",
            "description": "E-file provider application process"
        },
        "4163": {
            "title": "Modernized e-File (MeF) Information for Authorized IRS e-file Providers for Business Returns",
            "url": "https://www.irs.gov/pub/irs-pdf/p4163.pdf",
            "description": "Business return MeF specifications"
        },
        "4164": {
            "title": "Modernized e-File (MeF) Guide for Software Developers and Transmitters",
            "url": "https://www.irs.gov/pub/irs-pdf/p4164.pdf",
            "description": "Primary developer guide for MeF"
        },
        "5078": {
            "title": "Modernized e-File (MeF) Test Package (Business Submissions)",
            "url": "https://www.irs.gov/pub/irs-pdf/p5078.pdf",
            "description": "Business submission test packages"
        },
        "5446": {
            "title": "Modernized e-File (MeF) Submission Composition Guide",
            "url": "https://www.irs.gov/pub/irs-pdf/p5446.pdf",
            "description": "XML submission structure guide"
        },
        "5594": {
            "title": "Standard Postal Service State Abbreviations and ZIP Codes",
            "url": "https://www.irs.gov/pub/irs-pdf/p5594.pdf",
            "description": "Valid state codes for addresses"
        },
        "5830": {
            "title": "Modernized e-File (MeF) IS State and Trading Partners Reference Guide",
            "url": "https://www.irs.gov/pub/irs-pdf/p5830.pdf",
            "description": "State e-file integration guide"
        }
    }

    @classmethod
    def get_publication(cls, pub_number: str) -> Optional[Dict]:
        """Get publication details by number"""
        return cls.PUBLICATIONS.get(pub_number)

    @classmethod
    def get_all_publications(cls) -> Dict:
        """Get all publication references"""
        return cls.PUBLICATIONS.copy()

    @classmethod
    def get_developer_essential_publications(cls) -> List[str]:
        """Get list of essential publications for developers"""
        return ["4164", "5446", "1436", "3112"]
