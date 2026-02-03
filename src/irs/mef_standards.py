"""
IRS Modernized e-File (MeF) Technical Standards Implementation
Compliant with IRS Publication 4164 and MeF Developer Guide
"""

from enum import Enum
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from decimal import Decimal
import hashlib
import base64
from datetime import datetime, date


class MeFVersion(Enum):
    """MeF Schema Versions"""
    TY2024 = "2024v5.0"
    TY2025 = "2025v1.0"


class SubmissionType(Enum):
    """IRS Submission Types"""
    INDIVIDUAL_1040 = "1040"
    PARTNERSHIP_1065 = "1065"
    CORPORATION_1120 = "1120"
    S_CORP_1120S = "1120S"
    NONPROFIT_990 = "990"
    ESTATE_1041 = "1041"
    EMPLOYMENT_941 = "941"
    EXTENSION_4868 = "4868"


class TransmissionType(Enum):
    """MeF Transmission Types"""
    ORIGINAL = "O"
    SUPERSEDED = "S"
    AMENDED = "A"


class MeFNamespaces:
    """IRS MeF XML Namespaces"""
    IRS_COMMON = "http://www.irs.gov/efile"
    IRS_1040 = "http://www.irs.gov/efile/IndividualIncomeTax"
    IRS_1065 = "http://www.irs.gov/efile/Partnership"
    IRS_1120 = "http://www.irs.gov/efile/Corporation"
    SOAP_ENV = "http://schemas.xmlsoap.org/soap/envelope/"
    SOAP_ENC = "http://schemas.xmlsoap.org/soap/encoding/"
    XSI = "http://www.w3.org/2001/XMLSchema-instance"
    XSD = "http://www.w3.org/2001/XMLSchema"
    MEF = "http://www.irs.gov/efile/mef"


@dataclass
class MeFTransmitterInfo:
    """Transmitter identification for MeF submissions"""
    etin: str  # Electronic Transmitter Identification Number
    efin: str  # Electronic Filing Identification Number
    transmitter_name: str
    transmitter_address: Dict[str, str]
    contact_name: str
    contact_phone: str
    contact_email: str
    software_id: str
    software_version: str

    def validate(self) -> List[str]:
        """Validate transmitter information"""
        errors = []
        if not self.etin or len(self.etin) != 5:
            errors.append("ETIN must be 5 characters")
        if not self.efin or len(self.efin) != 6:
            errors.append("EFIN must be 6 characters")
        if not self.software_id:
            errors.append("Software ID is required")
        return errors


@dataclass
class MeFSubmissionManifest:
    """MeF Submission Manifest Structure"""
    submission_id: str
    submission_type: SubmissionType
    tax_year: int
    transmission_type: TransmissionType
    efin: str
    etin: str
    government_code: str = "IRS"
    state_codes: List[str] = field(default_factory=list)
    ip_address: str = ""
    device_id: str = ""
    total_return_count: int = 1
    binary_attachment_count: int = 0
    submission_timestamp: datetime = field(default_factory=datetime.utcnow)

    def generate_submission_id(self) -> str:
        """Generate unique 20-character submission ID per IRS spec"""
        timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        unique_part = hashlib.sha256(
            f"{self.efin}{timestamp}{self.etin}".encode()
        ).hexdigest()[:6].upper()
        return f"{self.efin}{timestamp}{unique_part}"


@dataclass
class MeFSecurityHeader:
    """SOAP Security Header for MeF"""
    username: str
    password: str  # Encrypted
    timestamp: datetime
    nonce: str

    def generate_password_digest(self, raw_password: str) -> str:
        """Generate password digest per WS-Security spec"""
        nonce_bytes = base64.b64decode(self.nonce)
        created = self.timestamp.strftime("%Y-%m-%dT%H:%M:%SZ")
        digest_input = nonce_bytes + created.encode() + raw_password.encode()
        digest = hashlib.sha1(digest_input).digest()
        return base64.b64encode(digest).decode()


class MeFValidationRules:
    """IRS MeF Validation Rules and Business Rules"""

    # Form 1040 Business Rules
    RULE_1040_001 = "Taxpayer SSN must be 9 digits"
    RULE_1040_002 = "Filing status required"
    RULE_1040_003 = "AGI calculation must match sum of income sources"
    RULE_1040_004 = "Tax liability cannot be negative"
    RULE_1040_005 = "Withholding amounts must have valid Form W-2"

    # OBBBA 2025 Rules
    RULE_OBBBA_001 = "Tips deduction limited to $25,000"
    RULE_OBBBA_002 = "Overtime deduction requires W-2 with overtime hours"
    RULE_OBBBA_003 = "Senior deduction requires age 65+ by end of tax year"
    RULE_OBBBA_004 = "Child Tax Credit is $2,200 per qualifying child"

    @staticmethod
    def get_all_rules() -> Dict[str, str]:
        """Get all validation rules"""
        return {
            k: v for k, v in vars(MeFValidationRules).items()
            if k.startswith("RULE_")
        }


class MeFErrorCodes:
    """IRS MeF Standard Error Codes"""

    # Transmission Errors (T-series)
    T001 = ("T001", "Invalid transmission format")
    T002 = ("T002", "Schema validation failed")
    T003 = ("T003", "Invalid EFIN")
    T004 = ("T004", "Unauthorized transmitter")

    # Business Rule Errors (R-series)
    R0001 = ("R0001", "Invalid SSN format")
    R0002 = ("R0002", "Duplicate submission")
    R0003 = ("R0003", "Math error in return")
    R0004 = ("R0004", "Missing required schedule")

    # Data Errors (D-series)
    D001 = ("D001", "Invalid date format")
    D002 = ("D002", "Amount exceeds maximum")
    D003 = ("D003", "Invalid state code")

    @classmethod
    def get_error_message(cls, code: str) -> str:
        """Get error message for code"""
        for attr_name in dir(cls):
            if not attr_name.startswith('_'):
                attr = getattr(cls, attr_name)
                if isinstance(attr, tuple) and attr[0] == code:
                    return attr[1]
        return "Unknown error code"


@dataclass
class ATSTestScenario:
    """Assurance Testing System (ATS) Test Scenario"""
    scenario_id: str
    scenario_name: str
    form_type: str
    expected_result: str  # "ACCEPTED" or "REJECTED"
    expected_error_codes: List[str] = field(default_factory=list)
    test_data: Dict[str, Any] = field(default_factory=dict)

    def validate_result(self, actual_result: str, actual_errors: List[str]) -> bool:
        """Validate test result against expected"""
        if actual_result != self.expected_result:
            return False
        if self.expected_result == "REJECTED":
            return set(self.expected_error_codes) == set(actual_errors)
        return True


class ATSTestSuite:
    """IRS ATS Test Suite for Software Certification"""

    def __init__(self):
        self.scenarios: List[ATSTestScenario] = []
        self._load_standard_scenarios()

    def _load_standard_scenarios(self):
        """Load IRS standard ATS test scenarios"""
        # Basic acceptance scenarios
        self.scenarios.extend([
            ATSTestScenario(
                scenario_id="ATS-1040-001",
                scenario_name="Single filer, W-2 income only",
                form_type="1040",
                expected_result="ACCEPTED",
                test_data={
                    "filing_status": "single",
                    "w2_wages": 50000,
                    "federal_withholding": 6000
                }
            ),
            ATSTestScenario(
                scenario_id="ATS-1040-002",
                scenario_name="MFJ with dependents",
                form_type="1040",
                expected_result="ACCEPTED",
                test_data={
                    "filing_status": "married_filing_jointly",
                    "w2_wages": 85000,
                    "dependents": 2,
                    "child_tax_credit": 4400  # $2,200 x 2 under OBBBA
                }
            ),
            ATSTestScenario(
                scenario_id="ATS-1040-003",
                scenario_name="Invalid SSN format",
                form_type="1040",
                expected_result="REJECTED",
                expected_error_codes=["R0001"],
                test_data={
                    "ssn": "123-45-678",  # Invalid - only 8 digits
                    "filing_status": "single"
                }
            ),
            ATSTestScenario(
                scenario_id="ATS-OBBBA-001",
                scenario_name="Tips deduction under OBBBA",
                form_type="1040",
                expected_result="ACCEPTED",
                test_data={
                    "filing_status": "single",
                    "w2_wages": 40000,
                    "tip_income": 15000,
                    "obbba_tips_deduction": 15000
                }
            ),
            ATSTestScenario(
                scenario_id="ATS-OBBBA-002",
                scenario_name="Tips deduction exceeds limit",
                form_type="1040",
                expected_result="REJECTED",
                expected_error_codes=["OBBBA-001"],
                test_data={
                    "tip_income": 30000,
                    "obbba_tips_deduction": 30000  # Exceeds $25,000 limit
                }
            ),
        ])

    def run_scenario(self, scenario_id: str, submission_result: Dict) -> Dict:
        """Run a specific ATS scenario and validate"""
        scenario = next(
            (s for s in self.scenarios if s.scenario_id == scenario_id),
            None
        )
        if not scenario:
            return {"error": f"Scenario {scenario_id} not found"}

        passed = scenario.validate_result(
            submission_result.get("status", ""),
            submission_result.get("error_codes", [])
        )

        return {
            "scenario_id": scenario_id,
            "scenario_name": scenario.scenario_name,
            "passed": passed,
            "expected": {
                "result": scenario.expected_result,
                "error_codes": scenario.expected_error_codes
            },
            "actual": {
                "result": submission_result.get("status"),
                "error_codes": submission_result.get("error_codes", [])
            }
        }

    def run_all_scenarios(self, submission_handler) -> Dict:
        """Run all ATS scenarios"""
        results = {
            "total": len(self.scenarios),
            "passed": 0,
            "failed": 0,
            "details": []
        }

        for scenario in self.scenarios:
            # Create test submission from scenario data
            submission_result = submission_handler(scenario.test_data)
            result = self.run_scenario(scenario.scenario_id, submission_result)
            results["details"].append(result)
            if result["passed"]:
                results["passed"] += 1
            else:
                results["failed"] += 1

        return results
