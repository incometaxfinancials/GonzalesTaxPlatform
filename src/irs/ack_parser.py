"""
IRS MeF Acknowledgment (ACK) Parser
Parses IRS acknowledgment files for submission status and error handling
"""

import xml.etree.ElementTree as ET
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
import re

from .mef_standards import MeFNamespaces, MeFErrorCodes


class AckStatus(Enum):
    """IRS Acknowledgment Status Codes"""
    ACCEPTED = "A"
    ACCEPTED_WITH_ALERTS = "A-A"
    REJECTED = "R"
    PROCESSING = "P"
    NOT_FOUND = "N"


class AlertCategory(Enum):
    """IRS Alert Categories"""
    REJECT = "Reject"
    ALERT = "Alert"
    MATH_ERROR = "MathError"
    VALIDATION = "Validation"


@dataclass
class IRSError:
    """Represents an IRS error or rejection reason"""
    error_code: str
    error_message: str
    rule_number: str = ""
    xpath: str = ""
    severity: str = "Error"
    field_value: str = ""
    category: AlertCategory = AlertCategory.REJECT

    def to_dict(self) -> Dict[str, Any]:
        return {
            "error_code": self.error_code,
            "error_message": self.error_message,
            "rule_number": self.rule_number,
            "xpath": self.xpath,
            "severity": self.severity,
            "field_value": self.field_value,
            "category": self.category.value
        }


@dataclass
class StateAck:
    """State submission acknowledgment"""
    state_code: str
    status: AckStatus
    state_submission_id: str = ""
    errors: List[IRSError] = field(default_factory=list)
    timestamp: Optional[datetime] = None


@dataclass
class AckResult:
    """Complete acknowledgment parsing result"""
    submission_id: str
    status: AckStatus
    tax_year: int
    form_type: str
    efin: str
    timestamp: datetime
    errors: List[IRSError] = field(default_factory=list)
    alerts: List[IRSError] = field(default_factory=list)
    state_acks: List[StateAck] = field(default_factory=list)
    raw_xml: str = ""

    # Refund/payment info
    refund_amount: Optional[float] = None
    payment_amount: Optional[float] = None

    # Processing details
    irs_submission_id: str = ""
    dcn: str = ""  # Document Control Number
    processing_date: Optional[datetime] = None

    @property
    def is_accepted(self) -> bool:
        return self.status in (AckStatus.ACCEPTED, AckStatus.ACCEPTED_WITH_ALERTS)

    @property
    def is_rejected(self) -> bool:
        return self.status == AckStatus.REJECTED

    @property
    def rejection_codes(self) -> List[str]:
        return [e.error_code for e in self.errors if e.category == AlertCategory.REJECT]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "submission_id": self.submission_id,
            "status": self.status.value,
            "status_text": self._get_status_text(),
            "tax_year": self.tax_year,
            "form_type": self.form_type,
            "efin": self.efin,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "is_accepted": self.is_accepted,
            "is_rejected": self.is_rejected,
            "errors": [e.to_dict() for e in self.errors],
            "alerts": [e.to_dict() for e in self.alerts],
            "rejection_codes": self.rejection_codes,
            "refund_amount": self.refund_amount,
            "payment_amount": self.payment_amount,
            "irs_submission_id": self.irs_submission_id,
            "dcn": self.dcn,
            "processing_date": self.processing_date.isoformat() if self.processing_date else None
        }

    def _get_status_text(self) -> str:
        status_text = {
            AckStatus.ACCEPTED: "Accepted by IRS",
            AckStatus.ACCEPTED_WITH_ALERTS: "Accepted with Alerts",
            AckStatus.REJECTED: "Rejected by IRS",
            AckStatus.PROCESSING: "Processing",
            AckStatus.NOT_FOUND: "Submission Not Found"
        }
        return status_text.get(self.status, "Unknown")


class ACKParser:
    """Parser for IRS Acknowledgment XML files"""

    def __init__(self):
        self.namespaces = {
            'efile': MeFNamespaces.IRS_COMMON,
            'mef': MeFNamespaces.MEF,
            'soap': MeFNamespaces.SOAP_ENV,
        }

    def parse(self, xml_content: str) -> AckResult:
        """Parse acknowledgment XML and return structured result"""
        try:
            # Remove BOM if present
            if xml_content.startswith('\ufeff'):
                xml_content = xml_content[1:]

            root = ET.fromstring(xml_content)

            # Extract basic info
            submission_id = self._extract_text(root, ".//SubmissionId") or \
                           self._extract_text(root, ".//mef:SubmissionId")

            status_code = self._extract_text(root, ".//StatusCd") or \
                         self._extract_text(root, ".//AcknowledgementStatusCd") or "N"

            status = self._parse_status(status_code)

            # Extract tax year and form type
            tax_year = int(self._extract_text(root, ".//TaxYr") or
                          self._extract_text(root, ".//TaxYear") or "2024")

            form_type = self._extract_text(root, ".//ReturnTypeCd") or \
                       self._extract_text(root, ".//FormTypeCd") or "1040"

            efin = self._extract_text(root, ".//EFIN") or ""

            # Parse timestamp
            timestamp_str = self._extract_text(root, ".//AcknowledgementTimestamp") or \
                           self._extract_text(root, ".//Timestamp")
            timestamp = self._parse_timestamp(timestamp_str) if timestamp_str else datetime.utcnow()

            # Parse errors and alerts
            errors = self._parse_errors(root)
            alerts = self._parse_alerts(root)

            # Parse financial info
            refund_amount = self._parse_amount(root, ".//RefundAmt")
            payment_amount = self._parse_amount(root, ".//PaymentAmt")

            # Parse IRS-assigned IDs
            irs_submission_id = self._extract_text(root, ".//IRSSubmissionId") or ""
            dcn = self._extract_text(root, ".//DCN") or \
                  self._extract_text(root, ".//DocumentControlNum") or ""

            # Parse state acknowledgments
            state_acks = self._parse_state_acks(root)

            return AckResult(
                submission_id=submission_id or "",
                status=status,
                tax_year=tax_year,
                form_type=form_type,
                efin=efin,
                timestamp=timestamp,
                errors=errors,
                alerts=alerts,
                state_acks=state_acks,
                raw_xml=xml_content,
                refund_amount=refund_amount,
                payment_amount=payment_amount,
                irs_submission_id=irs_submission_id,
                dcn=dcn
            )

        except ET.ParseError as e:
            # Return error result for unparseable XML
            return AckResult(
                submission_id="PARSE_ERROR",
                status=AckStatus.NOT_FOUND,
                tax_year=2024,
                form_type="Unknown",
                efin="",
                timestamp=datetime.utcnow(),
                errors=[IRSError(
                    error_code="XML_PARSE_ERROR",
                    error_message=f"Failed to parse acknowledgment XML: {str(e)}",
                    severity="Fatal"
                )],
                raw_xml=xml_content
            )

    def _extract_text(self, root: ET.Element, xpath: str) -> Optional[str]:
        """Extract text from element by xpath"""
        # Try with namespaces
        for ns_prefix, ns_uri in self.namespaces.items():
            namespaced_xpath = xpath.replace(f"{ns_prefix}:", f"{{{ns_uri}}}")
            elem = root.find(namespaced_xpath)
            if elem is not None and elem.text:
                return elem.text.strip()

        # Try without namespace (local name matching)
        tag_name = xpath.split('/')[-1].split(':')[-1]
        for elem in root.iter():
            local_name = elem.tag.split('}')[-1] if '}' in elem.tag else elem.tag
            if local_name == tag_name and elem.text:
                return elem.text.strip()

        return None

    def _parse_status(self, status_code: str) -> AckStatus:
        """Parse status code to AckStatus enum"""
        status_map = {
            "A": AckStatus.ACCEPTED,
            "Accepted": AckStatus.ACCEPTED,
            "A-A": AckStatus.ACCEPTED_WITH_ALERTS,
            "AcceptedWithAlerts": AckStatus.ACCEPTED_WITH_ALERTS,
            "R": AckStatus.REJECTED,
            "Rejected": AckStatus.REJECTED,
            "P": AckStatus.PROCESSING,
            "Processing": AckStatus.PROCESSING,
        }
        return status_map.get(status_code, AckStatus.NOT_FOUND)

    def _parse_timestamp(self, timestamp_str: str) -> datetime:
        """Parse various timestamp formats"""
        formats = [
            "%Y-%m-%dT%H:%M:%SZ",
            "%Y-%m-%dT%H:%M:%S.%fZ",
            "%Y-%m-%dT%H:%M:%S",
            "%Y-%m-%d %H:%M:%S",
            "%Y%m%d%H%M%S"
        ]

        for fmt in formats:
            try:
                return datetime.strptime(timestamp_str, fmt)
            except ValueError:
                continue

        return datetime.utcnow()

    def _parse_amount(self, root: ET.Element, xpath: str) -> Optional[float]:
        """Parse amount field"""
        text = self._extract_text(root, xpath)
        if text:
            try:
                return float(re.sub(r'[^\d.-]', '', text))
            except ValueError:
                return None
        return None

    def _parse_errors(self, root: ET.Element) -> List[IRSError]:
        """Parse rejection/error elements"""
        errors = []

        # Look for various error element patterns
        error_patterns = [
            ".//ErrorMessageDetail",
            ".//RejectionDetail",
            ".//ValidationErrorDetail",
            ".//mef:ErrorMessageDetail"
        ]

        for pattern in error_patterns:
            for error_elem in root.iter():
                local_name = error_elem.tag.split('}')[-1] if '}' in error_elem.tag else error_elem.tag
                if 'Error' in local_name or 'Rejection' in local_name:
                    error = self._parse_single_error(error_elem)
                    if error:
                        errors.append(error)

        return errors

    def _parse_single_error(self, error_elem: ET.Element) -> Optional[IRSError]:
        """Parse a single error element"""
        error_code = None
        error_message = None
        rule_number = None
        xpath = None
        field_value = None

        for child in error_elem:
            local_name = child.tag.split('}')[-1] if '}' in child.tag else child.tag
            text = child.text.strip() if child.text else ""

            if 'ErrorCode' in local_name or 'RuleNum' in local_name:
                error_code = text
            elif 'ErrorMessage' in local_name or 'ErrorMessageTxt' in local_name:
                error_message = text
            elif 'RuleNumber' in local_name:
                rule_number = text
            elif 'XPath' in local_name or 'FieldPath' in local_name:
                xpath = text
            elif 'FieldValue' in local_name:
                field_value = text

        if error_code or error_message:
            return IRSError(
                error_code=error_code or "UNKNOWN",
                error_message=error_message or MeFErrorCodes.get_error_message(error_code) if error_code else "Unknown error",
                rule_number=rule_number or "",
                xpath=xpath or "",
                field_value=field_value or "",
                category=AlertCategory.REJECT
            )

        return None

    def _parse_alerts(self, root: ET.Element) -> List[IRSError]:
        """Parse alert/warning elements"""
        alerts = []

        for elem in root.iter():
            local_name = elem.tag.split('}')[-1] if '}' in elem.tag else elem.tag
            if 'Alert' in local_name and 'Detail' in local_name:
                alert = self._parse_single_error(elem)
                if alert:
                    alert.category = AlertCategory.ALERT
                    alert.severity = "Warning"
                    alerts.append(alert)

        return alerts

    def _parse_state_acks(self, root: ET.Element) -> List[StateAck]:
        """Parse state-specific acknowledgments"""
        state_acks = []

        for elem in root.iter():
            local_name = elem.tag.split('}')[-1] if '}' in elem.tag else elem.tag
            if 'StateAck' in local_name or 'StateSubmissionAck' in local_name:
                state_code = None
                status = AckStatus.NOT_FOUND
                state_sub_id = ""
                errors = []

                for child in elem:
                    child_name = child.tag.split('}')[-1] if '}' in child.tag else child.tag
                    text = child.text.strip() if child.text else ""

                    if 'StateCd' in child_name or 'StateCode' in child_name:
                        state_code = text
                    elif 'StatusCd' in child_name:
                        status = self._parse_status(text)
                    elif 'SubmissionId' in child_name:
                        state_sub_id = text

                if state_code:
                    state_acks.append(StateAck(
                        state_code=state_code,
                        status=status,
                        state_submission_id=state_sub_id,
                        errors=errors
                    ))

        return state_acks


class ACKStatusChecker:
    """Utility class for checking acknowledgment status"""

    # Common rejection codes and remediation
    REJECTION_REMEDIATION = {
        "R0001": "SSN is invalid. Verify the SSN matches the Social Security card exactly.",
        "R0002": "This return has already been filed. Check for duplicate submission.",
        "R0003": "Math error detected. Review calculations and ensure all amounts are correct.",
        "R0004": "Missing required schedule. Add the required schedule to the return.",
        "IND-031": "AGI or Self-Select PIN doesn't match IRS records. Verify prior year AGI.",
        "IND-032": "Date of birth doesn't match IRS records for primary taxpayer.",
        "IND-181": "Dependent SSN has already been claimed on another return.",
        "OBBBA-001": "Tips deduction exceeds $25,000 limit under OBBBA.",
        "OBBBA-002": "Overtime deduction requires valid overtime wages on W-2.",
        "OBBBA-003": "Senior deduction requires taxpayer to be age 65+ by year end.",
        "F1040-001": "Filing status does not match dependent information.",
        "F1040-002": "Withholding exceeds reasonable amount for reported wages.",
    }

    @classmethod
    def get_remediation(cls, error_code: str) -> str:
        """Get remediation steps for a rejection code"""
        return cls.REJECTION_REMEDIATION.get(
            error_code,
            "Contact IRS or review Publication 4164 for details on this error."
        )

    @classmethod
    def categorize_errors(cls, errors: List[IRSError]) -> Dict[str, List[IRSError]]:
        """Categorize errors by type for easier handling"""
        categories = {
            "identity": [],
            "income": [],
            "deductions": [],
            "credits": [],
            "payments": [],
            "obbba": [],
            "other": []
        }

        for error in errors:
            code = error.error_code.upper()
            if any(x in code for x in ['SSN', 'EIN', 'NAME', 'DOB', 'IND-03']):
                categories["identity"].append(error)
            elif any(x in code for x in ['WAGE', 'INCOME', 'W2', '1099']):
                categories["income"].append(error)
            elif any(x in code for x in ['DED', 'SCH-A', 'ITEMIZ']):
                categories["deductions"].append(error)
            elif any(x in code for x in ['CREDIT', 'CTC', 'EIC', 'ACTC']):
                categories["credits"].append(error)
            elif any(x in code for x in ['WITHHOLD', 'PAYMENT', 'REFUND']):
                categories["payments"].append(error)
            elif 'OBBBA' in code:
                categories["obbba"].append(error)
            else:
                categories["other"].append(error)

        return categories

    @classmethod
    def is_fixable_rejection(cls, errors: List[IRSError]) -> Tuple[bool, List[str]]:
        """Determine if rejection can be fixed and resubmitted"""
        fixable_prefixes = ['R000', 'IND-', 'F1040-', 'OBBBA-']
        non_fixable_codes = ['R0002']  # Duplicate submission

        fixable = True
        suggestions = []

        for error in errors:
            code = error.error_code

            # Check if non-fixable
            if code in non_fixable_codes:
                fixable = False
                suggestions.append(f"{code}: Cannot resubmit - {cls.get_remediation(code)}")
                continue

            # Check if fixable
            if any(code.startswith(prefix) for prefix in fixable_prefixes):
                suggestions.append(f"{code}: {cls.get_remediation(code)}")

        return fixable, suggestions
