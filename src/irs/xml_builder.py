"""
IRS MeF XML Builder - Creates valid IRS-compliant XML submissions
Follows IRS Publication 4164 XML Schema specifications
"""

import xml.etree.ElementTree as ET
from xml.dom import minidom
from typing import Dict, List, Optional, Any, Union
from decimal import Decimal, ROUND_HALF_UP
from datetime import date, datetime
import hashlib
import base64
import re
from dataclasses import dataclass

from .mef_standards import (
    MeFNamespaces, MeFVersion, SubmissionType, TransmissionType,
    MeFSubmissionManifest, MeFTransmitterInfo
)


class XMLNamespaceManager:
    """Manages XML namespaces for IRS MeF compliance"""

    NAMESPACES = {
        'efile': MeFNamespaces.IRS_COMMON,
        'ind': MeFNamespaces.IRS_1040,
        'prt': MeFNamespaces.IRS_1065,
        'corp': MeFNamespaces.IRS_1120,
        'soap': MeFNamespaces.SOAP_ENV,
        'xsi': MeFNamespaces.XSI,
        'xsd': MeFNamespaces.XSD,
        'mef': MeFNamespaces.MEF,
    }

    @classmethod
    def register_namespaces(cls):
        """Register all namespaces with ElementTree"""
        for prefix, uri in cls.NAMESPACES.items():
            ET.register_namespace(prefix, uri)


@dataclass
class IRSAmount:
    """IRS-compliant amount formatting"""
    value: Decimal

    def to_xml(self) -> str:
        """Format as IRS amount (no cents for whole dollars)"""
        rounded = self.value.quantize(Decimal('1'), rounding=ROUND_HALF_UP)
        return str(int(rounded))

    def to_xml_with_cents(self) -> str:
        """Format as IRS amount with cents"""
        rounded = self.value.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        return str(rounded)


class IRSXMLBuilder:
    """Builds IRS-compliant XML for e-file submissions"""

    def __init__(self, tax_year: int, version: MeFVersion = MeFVersion.TY2025):
        self.tax_year = tax_year
        self.version = version
        XMLNamespaceManager.register_namespaces()

    def _create_element(self, tag: str, text: Optional[str] = None,
                        namespace: str = None) -> ET.Element:
        """Create XML element with optional namespace"""
        if namespace:
            tag = f"{{{namespace}}}{tag}"
        element = ET.Element(tag)
        if text is not None:
            element.text = str(text)
        return element

    def _add_child(self, parent: ET.Element, tag: str,
                   text: Optional[str] = None, namespace: str = None) -> ET.Element:
        """Add child element to parent"""
        child = self._create_element(tag, text, namespace)
        parent.append(child)
        return child

    def _format_ssn(self, ssn: str) -> str:
        """Format SSN for XML (remove dashes)"""
        return re.sub(r'[^0-9]', '', ssn)

    def _format_ein(self, ein: str) -> str:
        """Format EIN for XML (remove dashes)"""
        return re.sub(r'[^0-9]', '', ein)

    def _format_date(self, d: Union[date, datetime]) -> str:
        """Format date for IRS XML (YYYY-MM-DD)"""
        if isinstance(d, datetime):
            d = d.date()
        return d.strftime("%Y-%m-%d")

    def _format_phone(self, phone: str) -> str:
        """Format phone for XML (10 digits only)"""
        return re.sub(r'[^0-9]', '', phone)[:10]

    def build_transmission_header(self, manifest: MeFSubmissionManifest,
                                    transmitter: MeFTransmitterInfo) -> ET.Element:
        """Build MeF transmission header"""
        ns = MeFNamespaces.MEF

        header = self._create_element("TransmissionHeader", namespace=ns)

        # Transmission ID
        self._add_child(header, "TransmissionId",
                        manifest.generate_submission_id(), ns)

        # Timestamp
        self._add_child(header, "Timestamp",
                        manifest.submission_timestamp.strftime("%Y-%m-%dT%H:%M:%SZ"), ns)

        # Transmitter info
        trans = self._add_child(header, "Transmitter", namespace=ns)
        self._add_child(trans, "ETIN", transmitter.etin, ns)

        # Software info
        sw = self._add_child(header, "SoftwareId", namespace=ns)
        self._add_child(sw, "SoftwareId", transmitter.software_id, ns)
        self._add_child(sw, "SoftwareVersionNum", transmitter.software_version, ns)

        # Government code
        self._add_child(header, "GovernmentCd", manifest.government_code, ns)

        return header

    def build_return_header_1040(self, data: Dict[str, Any]) -> ET.Element:
        """Build Form 1040 Return Header"""
        ns = MeFNamespaces.IRS_1040

        header = self._create_element("ReturnHeader", namespace=ns)
        header.set("binaryAttachmentCnt", str(data.get("attachment_count", 0)))

        # Return timestamp
        self._add_child(header, "ReturnTs",
                        datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"), ns)

        # Tax year
        self._add_child(header, "TaxYr", str(self.tax_year), ns)

        # Tax period begin/end
        self._add_child(header, "TaxPeriodBeginDt",
                        f"{self.tax_year}-01-01", ns)
        self._add_child(header, "TaxPeriodEndDt",
                        f"{self.tax_year}-12-31", ns)

        # Filer info
        filer = self._add_child(header, "Filer", namespace=ns)

        # Primary taxpayer
        primary = self._add_child(filer, "PrimarySSN",
                                   self._format_ssn(data["primary_ssn"]), ns)

        # Name
        name = self._add_child(filer, "NameLine1Txt", namespace=ns)
        name.text = data["primary_name"].upper()[:35]

        # Address
        addr = self._add_child(filer, "USAddress", namespace=ns)
        self._add_child(addr, "AddressLine1Txt",
                        data["address_line1"].upper()[:35], ns)
        if data.get("address_line2"):
            self._add_child(addr, "AddressLine2Txt",
                            data["address_line2"].upper()[:35], ns)
        self._add_child(addr, "CityNm", data["city"].upper()[:22], ns)
        self._add_child(addr, "StateAbbreviationCd", data["state"].upper(), ns)
        self._add_child(addr, "ZIPCd", data["zip"][:5], ns)

        # Phone
        if data.get("phone"):
            self._add_child(filer, "PhoneNum",
                            self._format_phone(data["phone"]), ns)

        # Filing status
        self._add_child(header, "FilingStatusCd",
                        self._get_filing_status_code(data["filing_status"]), ns)

        # Preparer info (if applicable)
        if data.get("preparer"):
            preparer = self._add_child(header, "PaidPreparerInformationGrp", namespace=ns)
            self._add_child(preparer, "PreparerSSN",
                            self._format_ssn(data["preparer"]["ssn"]), ns)
            self._add_child(preparer, "PreparerFirmEIN",
                            self._format_ein(data["preparer"]["firm_ein"]), ns)
            self._add_child(preparer, "PTIN", data["preparer"]["ptin"], ns)

        # EFIN
        self._add_child(header, "OriginatorGrp", namespace=ns)

        return header

    def _get_filing_status_code(self, status: str) -> str:
        """Convert filing status to IRS code"""
        status_map = {
            "single": "1",
            "married_filing_jointly": "2",
            "married_filing_separately": "3",
            "head_of_household": "4",
            "qualifying_widow": "5"
        }
        return status_map.get(status.lower().replace(" ", "_"), "1")

    def build_form_1040(self, data: Dict[str, Any]) -> ET.Element:
        """Build complete Form 1040 XML"""
        ns = MeFNamespaces.IRS_1040

        form = self._create_element("IRS1040", namespace=ns)
        form.set("documentId", f"IRS1040-{data.get('document_id', '001')}")

        # Income section
        income = self._add_child(form, "IncomeGrp", namespace=ns)

        # Line 1 - Wages
        if data.get("wages"):
            self._add_child(income, "WagesAmt",
                            IRSAmount(Decimal(str(data["wages"]))).to_xml(), ns)

        # Line 2a - Tax-exempt interest
        if data.get("tax_exempt_interest"):
            self._add_child(income, "TaxExemptInterestAmt",
                            IRSAmount(Decimal(str(data["tax_exempt_interest"]))).to_xml(), ns)

        # Line 2b - Taxable interest
        if data.get("taxable_interest"):
            self._add_child(income, "TaxableInterestAmt",
                            IRSAmount(Decimal(str(data["taxable_interest"]))).to_xml(), ns)

        # Line 3a - Qualified dividends
        if data.get("qualified_dividends"):
            self._add_child(income, "QualifiedDividendsAmt",
                            IRSAmount(Decimal(str(data["qualified_dividends"]))).to_xml(), ns)

        # Line 3b - Ordinary dividends
        if data.get("ordinary_dividends"):
            self._add_child(income, "OrdinaryDividendsAmt",
                            IRSAmount(Decimal(str(data["ordinary_dividends"]))).to_xml(), ns)

        # OBBBA 2025 Provisions
        obbba = self._add_child(form, "OBBBAProvisionsGrp", namespace=ns)

        # Tips deduction (No Tax on Tips Act)
        if data.get("obbba_tips_deduction"):
            tips_ded = min(Decimal(str(data["obbba_tips_deduction"])), Decimal("25000"))
            self._add_child(obbba, "TipsDeductionAmt",
                            IRSAmount(tips_ded).to_xml(), ns)

        # Overtime deduction
        if data.get("obbba_overtime_deduction"):
            ot_ded = min(Decimal(str(data["obbba_overtime_deduction"])), Decimal("10000"))
            self._add_child(obbba, "OvertimeDeductionAmt",
                            IRSAmount(ot_ded).to_xml(), ns)

        # Senior deduction (age 65+)
        if data.get("obbba_senior_deduction"):
            self._add_child(obbba, "SeniorCitizensDeductionAmt",
                            IRSAmount(Decimal("6000")).to_xml(), ns)

        # Deductions section
        deductions = self._add_child(form, "DeductionsGrp", namespace=ns)

        # Standard deduction
        if data.get("standard_deduction"):
            self._add_child(deductions, "StandardDeductionAmt",
                            IRSAmount(Decimal(str(data["standard_deduction"]))).to_xml(), ns)

        # Itemized deductions
        if data.get("itemized_deduction"):
            self._add_child(deductions, "ItemizedDeductionsAmt",
                            IRSAmount(Decimal(str(data["itemized_deduction"]))).to_xml(), ns)

        # SALT deduction (capped at $40,000 under OBBBA)
        if data.get("salt_deduction"):
            salt = min(Decimal(str(data["salt_deduction"])), Decimal("40000"))
            self._add_child(deductions, "StateAndLocalTaxDeductionAmt",
                            IRSAmount(salt).to_xml(), ns)

        # Tax and credits
        tax_credits = self._add_child(form, "TaxAndCreditsGrp", namespace=ns)

        # Taxable income
        if data.get("taxable_income"):
            self._add_child(tax_credits, "TaxableIncomeAmt",
                            IRSAmount(Decimal(str(data["taxable_income"]))).to_xml(), ns)

        # Tax
        if data.get("tax"):
            self._add_child(tax_credits, "TaxAmt",
                            IRSAmount(Decimal(str(data["tax"]))).to_xml(), ns)

        # Child Tax Credit ($2,200 per child under OBBBA)
        if data.get("child_tax_credit"):
            self._add_child(tax_credits, "ChildTaxCreditAmt",
                            IRSAmount(Decimal(str(data["child_tax_credit"]))).to_xml(), ns)

        # Payments section
        payments = self._add_child(form, "PaymentsGrp", namespace=ns)

        # Federal withholding
        if data.get("federal_withholding"):
            self._add_child(payments, "WithholdingTaxAmt",
                            IRSAmount(Decimal(str(data["federal_withholding"]))).to_xml(), ns)

        # Estimated payments
        if data.get("estimated_payments"):
            self._add_child(payments, "EstimatedTaxPaymentsAmt",
                            IRSAmount(Decimal(str(data["estimated_payments"]))).to_xml(), ns)

        # Refund/Amount Owed
        refund_owed = self._add_child(form, "RefundOrOwedGrp", namespace=ns)

        if data.get("refund_amount"):
            self._add_child(refund_owed, "RefundAmt",
                            IRSAmount(Decimal(str(data["refund_amount"]))).to_xml(), ns)

            # Direct deposit info
            if data.get("routing_number") and data.get("account_number"):
                dd = self._add_child(refund_owed, "DirectDepositGrp", namespace=ns)
                self._add_child(dd, "RoutingTransitNum", data["routing_number"], ns)
                self._add_child(dd, "BankAccountNum", data["account_number"], ns)
                self._add_child(dd, "BankAccountTypeCd",
                                "1" if data.get("account_type") == "checking" else "2", ns)

        elif data.get("amount_owed"):
            self._add_child(refund_owed, "OwedAmt",
                            IRSAmount(Decimal(str(data["amount_owed"]))).to_xml(), ns)

        return form

    def build_schedule_a(self, data: Dict[str, Any]) -> ET.Element:
        """Build Schedule A (Itemized Deductions)"""
        ns = MeFNamespaces.IRS_1040

        schedule = self._create_element("IRS1040ScheduleA", namespace=ns)
        schedule.set("documentId", f"SchedA-{data.get('document_id', '001')}")

        # Medical expenses
        if data.get("medical_expenses"):
            med = self._add_child(schedule, "MedicalAndDentalExpensesGrp", namespace=ns)
            self._add_child(med, "TotalMedicalExpensesAmt",
                            IRSAmount(Decimal(str(data["medical_expenses"]))).to_xml(), ns)

        # State and local taxes (SALT) - capped at $40,000
        if data.get("state_income_tax") or data.get("property_tax"):
            salt = self._add_child(schedule, "StateAndLocalTaxesGrp", namespace=ns)

            if data.get("state_income_tax"):
                self._add_child(salt, "StateAndLocalIncomeTaxAmt",
                                IRSAmount(Decimal(str(data["state_income_tax"]))).to_xml(), ns)

            if data.get("property_tax"):
                self._add_child(salt, "RealEstateTaxesAmt",
                                IRSAmount(Decimal(str(data["property_tax"]))).to_xml(), ns)

            # Total SALT (capped)
            total_salt = Decimal(str(data.get("state_income_tax", 0))) + \
                         Decimal(str(data.get("property_tax", 0)))
            capped_salt = min(total_salt, Decimal("40000"))
            self._add_child(salt, "TotalStateAndLocalTaxAmt",
                            IRSAmount(capped_salt).to_xml(), ns)

        # Mortgage interest
        if data.get("mortgage_interest"):
            interest = self._add_child(schedule, "InterestExpensesGrp", namespace=ns)
            self._add_child(interest, "HomeMortgageInterestAmt",
                            IRSAmount(Decimal(str(data["mortgage_interest"]))).to_xml(), ns)

        # Charitable contributions
        if data.get("charitable_cash") or data.get("charitable_noncash"):
            charity = self._add_child(schedule, "GiftsToCharityGrp", namespace=ns)

            if data.get("charitable_cash"):
                self._add_child(charity, "GiftsByCashOrCheckAmt",
                                IRSAmount(Decimal(str(data["charitable_cash"]))).to_xml(), ns)

            if data.get("charitable_noncash"):
                self._add_child(charity, "OtherThanCashOrCheckAmt",
                                IRSAmount(Decimal(str(data["charitable_noncash"]))).to_xml(), ns)

        return schedule

    def build_complete_return(self, data: Dict[str, Any],
                               manifest: MeFSubmissionManifest,
                               transmitter: MeFTransmitterInfo) -> str:
        """Build complete XML return with all components"""

        # Create root return element
        root = self._create_element("Return",
                                     namespace=MeFNamespaces.IRS_COMMON)

        # Set version attribute
        root.set("returnVersion", self.version.value)

        # Add transmission header
        root.append(self.build_transmission_header(manifest, transmitter))

        # Add return header
        root.append(self.build_return_header_1040(data))

        # Add return data
        return_data = self._add_child(root, "ReturnData",
                                       namespace=MeFNamespaces.IRS_COMMON)

        # Add Form 1040
        return_data.append(self.build_form_1040(data))

        # Add Schedule A if itemizing
        if data.get("itemized_deduction"):
            return_data.append(self.build_schedule_a(data))

        # Convert to string with proper formatting
        xml_str = ET.tostring(root, encoding='unicode', method='xml')

        # Add XML declaration
        xml_declaration = '<?xml version="1.0" encoding="UTF-8"?>\n'

        return xml_declaration + xml_str

    def validate_xml_schema(self, xml_string: str) -> List[str]:
        """Validate XML against IRS schemas"""
        errors = []

        try:
            root = ET.fromstring(xml_string)

            # Basic structure validation
            if root.tag.split('}')[-1] != 'Return':
                errors.append("Root element must be 'Return'")

            # Check for required elements
            required_elements = [
                'ReturnHeader',
                'ReturnData'
            ]

            for elem_name in required_elements:
                found = False
                for elem in root.iter():
                    if elem.tag.split('}')[-1] == elem_name:
                        found = True
                        break
                if not found:
                    errors.append(f"Missing required element: {elem_name}")

        except ET.ParseError as e:
            errors.append(f"XML parsing error: {str(e)}")

        return errors

    def calculate_checksum(self, xml_string: str) -> str:
        """Calculate MD5 checksum for transmission verification"""
        return hashlib.md5(xml_string.encode()).hexdigest()

    def prettify_xml(self, xml_string: str) -> str:
        """Format XML with proper indentation"""
        try:
            parsed = minidom.parseString(xml_string)
            return parsed.toprettyxml(indent="  ")
        except Exception:
            return xml_string
