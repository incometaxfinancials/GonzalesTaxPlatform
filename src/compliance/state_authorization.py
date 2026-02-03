"""
ITF - Income. Tax. Financials
State-Level e-File Authorization Module

Each state operates independently with different requirements:
- State e-File Enrollment
- Testing cycles
- State-specific encryption
- State-specific XML schemas
"""

from enum import Enum
from typing import Dict, List, Optional, Any
from datetime import datetime, date
from pydantic import BaseModel, Field
import hashlib


class StateFilingType(str, Enum):
    """Types of state filing programs."""
    INDIVIDUAL_INCOME = "individual_income"
    CORPORATE_INCOME = "corporate_income"
    FRANCHISE = "franchise"
    WITHHOLDING = "withholding"
    SALES_USE = "sales_use"
    PARTNERSHIP = "partnership"
    S_CORP = "s_corp"
    FIDUCIARY = "fiduciary"


class AuthorizationStatus(str, Enum):
    """State authorization status levels."""
    NOT_APPLIED = "not_applied"
    APPLICATION_PENDING = "application_pending"
    TESTING_REQUIRED = "testing_required"
    TESTING_IN_PROGRESS = "testing_in_progress"
    TESTING_PASSED = "testing_passed"
    AUTHORIZED = "authorized"
    SUSPENDED = "suspended"
    REVOKED = "revoked"
    RENEWAL_REQUIRED = "renewal_required"


class StateEFileConfig(BaseModel):
    """Configuration for a state's e-File program."""
    state_code: str
    state_name: str
    has_income_tax: bool = True
    filing_types: List[StateFilingType]

    # Program details
    program_name: str
    program_url: str
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None

    # Technical requirements
    requires_separate_testing: bool = True
    requires_state_encryption: bool = False
    requires_state_schema: bool = True
    schema_version: Optional[str] = None
    transmission_format: str = "XML"  # XML, MeF, EDI

    # Gateway info
    gateway_url: Optional[str] = None
    test_gateway_url: Optional[str] = None
    uses_fed_state_program: bool = True  # Uses IRS Fed/State program

    # Compliance
    requires_soc2: bool = False
    requires_state_bond: bool = False
    bond_amount: Optional[int] = None

    # Deadlines
    annual_renewal_date: Optional[date] = None
    testing_deadline: Optional[date] = None


class StateAuthorization(BaseModel):
    """Authorization record for a specific state."""
    state_code: str
    status: AuthorizationStatus
    filing_types: List[StateFilingType]

    # Application info
    application_date: Optional[datetime] = None
    approval_date: Optional[datetime] = None
    expiration_date: Optional[datetime] = None

    # Credentials
    transmitter_id: Optional[str] = None
    software_id: Optional[str] = None
    pin: Optional[str] = None  # Encrypted

    # Testing
    test_scenarios_required: int = 0
    test_scenarios_passed: int = 0
    last_test_date: Optional[datetime] = None

    # Metrics
    returns_submitted: int = 0
    returns_accepted: int = 0
    returns_rejected: int = 0
    last_submission_date: Optional[datetime] = None


# ============================================================================
# STATE DATABASE - All 50 States + DC + Territories
# ============================================================================

STATE_EFILE_CONFIGS: Dict[str, StateEFileConfig] = {
    # === NO INCOME TAX STATES ===
    "AK": StateEFileConfig(
        state_code="AK",
        state_name="Alaska",
        has_income_tax=False,
        filing_types=[StateFilingType.CORPORATE_INCOME],
        program_name="Alaska DOR e-File",
        program_url="https://revenue.alaska.gov/",
    ),
    "FL": StateEFileConfig(
        state_code="FL",
        state_name="Florida",
        has_income_tax=False,
        filing_types=[StateFilingType.CORPORATE_INCOME, StateFilingType.SALES_USE],
        program_name="Florida DOR e-File",
        program_url="https://floridarevenue.com/",
    ),
    "NV": StateEFileConfig(
        state_code="NV",
        state_name="Nevada",
        has_income_tax=False,
        filing_types=[StateFilingType.FRANCHISE],
        program_name="Nevada SOS e-File",
        program_url="https://www.nvsos.gov/",
    ),
    "SD": StateEFileConfig(
        state_code="SD",
        state_name="South Dakota",
        has_income_tax=False,
        filing_types=[StateFilingType.SALES_USE],
        program_name="South Dakota DOR",
        program_url="https://dor.sd.gov/",
    ),
    "TX": StateEFileConfig(
        state_code="TX",
        state_name="Texas",
        has_income_tax=False,
        filing_types=[StateFilingType.FRANCHISE, StateFilingType.SALES_USE],
        program_name="Texas Comptroller e-File",
        program_url="https://comptroller.texas.gov/",
        requires_separate_testing=True,
    ),
    "WA": StateEFileConfig(
        state_code="WA",
        state_name="Washington",
        has_income_tax=False,  # Has capital gains tax starting 2024
        filing_types=[StateFilingType.SALES_USE],
        program_name="Washington DOR e-File",
        program_url="https://dor.wa.gov/",
    ),
    "WY": StateEFileConfig(
        state_code="WY",
        state_name="Wyoming",
        has_income_tax=False,
        filing_types=[StateFilingType.SALES_USE],
        program_name="Wyoming DOR",
        program_url="https://revenue.wyo.gov/",
    ),
    "NH": StateEFileConfig(
        state_code="NH",
        state_name="New Hampshire",
        has_income_tax=False,  # Interest/dividends tax repealed
        filing_types=[StateFilingType.CORPORATE_INCOME],
        program_name="NH DRA e-File",
        program_url="https://www.revenue.nh.gov/",
    ),
    "TN": StateEFileConfig(
        state_code="TN",
        state_name="Tennessee",
        has_income_tax=False,  # Hall Tax repealed
        filing_types=[StateFilingType.FRANCHISE, StateFilingType.SALES_USE],
        program_name="TN DOR e-File",
        program_url="https://www.tn.gov/revenue/",
    ),

    # === MAJOR STATES WITH FULL PROGRAMS ===
    "CA": StateEFileConfig(
        state_code="CA",
        state_name="California",
        has_income_tax=True,
        filing_types=[StateFilingType.INDIVIDUAL_INCOME, StateFilingType.CORPORATE_INCOME,
                      StateFilingType.PARTNERSHIP, StateFilingType.S_CORP, StateFilingType.FIDUCIARY],
        program_name="FTB e-File Program",
        program_url="https://www.ftb.ca.gov/professionals/efile/",
        contact_email="efile@ftb.ca.gov",
        requires_separate_testing=True,
        requires_state_schema=True,
        schema_version="2025.1",
        gateway_url="https://services.ftb.ca.gov/efile/",
        test_gateway_url="https://test.ftb.ca.gov/efile/",
        requires_soc2=True,
        annual_renewal_date=date(2025, 11, 1),
    ),
    "NY": StateEFileConfig(
        state_code="NY",
        state_name="New York",
        has_income_tax=True,
        filing_types=[StateFilingType.INDIVIDUAL_INCOME, StateFilingType.CORPORATE_INCOME,
                      StateFilingType.PARTNERSHIP, StateFilingType.S_CORP, StateFilingType.WITHHOLDING],
        program_name="NYS DTF e-File Program",
        program_url="https://www.tax.ny.gov/pit/efile/",
        requires_separate_testing=True,
        requires_state_schema=True,
        schema_version="IT-201_2025",
        requires_soc2=True,
        annual_renewal_date=date(2025, 10, 15),
    ),
    "IL": StateEFileConfig(
        state_code="IL",
        state_name="Illinois",
        has_income_tax=True,
        filing_types=[StateFilingType.INDIVIDUAL_INCOME, StateFilingType.CORPORATE_INCOME,
                      StateFilingType.PARTNERSHIP, StateFilingType.FIDUCIARY],
        program_name="IDOR e-File Program",
        program_url="https://tax.illinois.gov/professionals/efile/",
        requires_separate_testing=True,
        uses_fed_state_program=True,
    ),
    "PA": StateEFileConfig(
        state_code="PA",
        state_name="Pennsylvania",
        has_income_tax=True,
        filing_types=[StateFilingType.INDIVIDUAL_INCOME, StateFilingType.CORPORATE_INCOME],
        program_name="PA e-TIDES",
        program_url="https://www.revenue.pa.gov/",
        requires_separate_testing=True,
        requires_state_schema=True,
    ),
    "OH": StateEFileConfig(
        state_code="OH",
        state_name="Ohio",
        has_income_tax=True,
        filing_types=[StateFilingType.INDIVIDUAL_INCOME, StateFilingType.CORPORATE_INCOME],
        program_name="Ohio I-File",
        program_url="https://tax.ohio.gov/",
        uses_fed_state_program=True,
    ),
    "GA": StateEFileConfig(
        state_code="GA",
        state_name="Georgia",
        has_income_tax=True,
        filing_types=[StateFilingType.INDIVIDUAL_INCOME, StateFilingType.CORPORATE_INCOME,
                      StateFilingType.WITHHOLDING],
        program_name="GA DOR e-File",
        program_url="https://dor.georgia.gov/",
        uses_fed_state_program=True,
    ),
    "NC": StateEFileConfig(
        state_code="NC",
        state_name="North Carolina",
        has_income_tax=True,
        filing_types=[StateFilingType.INDIVIDUAL_INCOME, StateFilingType.CORPORATE_INCOME],
        program_name="NCDOR e-File",
        program_url="https://www.ncdor.gov/",
        uses_fed_state_program=True,
    ),
    "NJ": StateEFileConfig(
        state_code="NJ",
        state_name="New Jersey",
        has_income_tax=True,
        filing_types=[StateFilingType.INDIVIDUAL_INCOME, StateFilingType.CORPORATE_INCOME,
                      StateFilingType.PARTNERSHIP],
        program_name="NJ Division of Taxation e-File",
        program_url="https://www.nj.gov/treasury/taxation/",
        requires_separate_testing=True,
    ),
    "VA": StateEFileConfig(
        state_code="VA",
        state_name="Virginia",
        has_income_tax=True,
        filing_types=[StateFilingType.INDIVIDUAL_INCOME, StateFilingType.CORPORATE_INCOME],
        program_name="Virginia Tax e-File",
        program_url="https://www.tax.virginia.gov/",
        uses_fed_state_program=True,
    ),
    "MI": StateEFileConfig(
        state_code="MI",
        state_name="Michigan",
        has_income_tax=True,
        filing_types=[StateFilingType.INDIVIDUAL_INCOME, StateFilingType.CORPORATE_INCOME],
        program_name="Michigan Treasury e-File",
        program_url="https://www.michigan.gov/treasury/",
        uses_fed_state_program=True,
    ),
    "MA": StateEFileConfig(
        state_code="MA",
        state_name="Massachusetts",
        has_income_tax=True,
        filing_types=[StateFilingType.INDIVIDUAL_INCOME, StateFilingType.CORPORATE_INCOME,
                      StateFilingType.FIDUCIARY],
        program_name="DOR e-File Program",
        program_url="https://www.mass.gov/orgs/massachusetts-department-of-revenue",
        requires_separate_testing=True,
        requires_state_schema=True,
        schema_version="Form1_2025",
    ),
    "AZ": StateEFileConfig(
        state_code="AZ",
        state_name="Arizona",
        has_income_tax=True,
        filing_types=[StateFilingType.INDIVIDUAL_INCOME, StateFilingType.CORPORATE_INCOME],
        program_name="ADOR e-File",
        program_url="https://azdor.gov/",
        uses_fed_state_program=True,
    ),
    "CO": StateEFileConfig(
        state_code="CO",
        state_name="Colorado",
        has_income_tax=True,
        filing_types=[StateFilingType.INDIVIDUAL_INCOME, StateFilingType.CORPORATE_INCOME],
        program_name="Colorado DOR e-File",
        program_url="https://tax.colorado.gov/",
        uses_fed_state_program=True,
    ),
    "MD": StateEFileConfig(
        state_code="MD",
        state_name="Maryland",
        has_income_tax=True,
        filing_types=[StateFilingType.INDIVIDUAL_INCOME, StateFilingType.CORPORATE_INCOME],
        program_name="Comptroller of Maryland e-File",
        program_url="https://www.marylandtaxes.gov/",
        uses_fed_state_program=True,
    ),
    "MN": StateEFileConfig(
        state_code="MN",
        state_name="Minnesota",
        has_income_tax=True,
        filing_types=[StateFilingType.INDIVIDUAL_INCOME, StateFilingType.CORPORATE_INCOME],
        program_name="MN DOR e-File",
        program_url="https://www.revenue.state.mn.us/",
        uses_fed_state_program=True,
    ),
    "MO": StateEFileConfig(
        state_code="MO",
        state_name="Missouri",
        has_income_tax=True,
        filing_types=[StateFilingType.INDIVIDUAL_INCOME, StateFilingType.CORPORATE_INCOME],
        program_name="MO DOR e-File",
        program_url="https://dor.mo.gov/",
        uses_fed_state_program=True,
    ),
    "WI": StateEFileConfig(
        state_code="WI",
        state_name="Wisconsin",
        has_income_tax=True,
        filing_types=[StateFilingType.INDIVIDUAL_INCOME, StateFilingType.CORPORATE_INCOME],
        program_name="WI DOR e-File",
        program_url="https://www.revenue.wi.gov/",
        uses_fed_state_program=True,
    ),
    "IN": StateEFileConfig(
        state_code="IN",
        state_name="Indiana",
        has_income_tax=True,
        filing_types=[StateFilingType.INDIVIDUAL_INCOME, StateFilingType.CORPORATE_INCOME],
        program_name="IN DOR e-File",
        program_url="https://www.in.gov/dor/",
        uses_fed_state_program=True,
    ),
    "CT": StateEFileConfig(
        state_code="CT",
        state_name="Connecticut",
        has_income_tax=True,
        filing_types=[StateFilingType.INDIVIDUAL_INCOME, StateFilingType.CORPORATE_INCOME],
        program_name="CT DRS e-File",
        program_url="https://portal.ct.gov/DRS",
        requires_separate_testing=True,
    ),
    "OR": StateEFileConfig(
        state_code="OR",
        state_name="Oregon",
        has_income_tax=True,
        filing_types=[StateFilingType.INDIVIDUAL_INCOME, StateFilingType.CORPORATE_INCOME],
        program_name="Oregon DOR e-File",
        program_url="https://www.oregon.gov/dor/",
        uses_fed_state_program=True,
    ),
    "SC": StateEFileConfig(
        state_code="SC",
        state_name="South Carolina",
        has_income_tax=True,
        filing_types=[StateFilingType.INDIVIDUAL_INCOME, StateFilingType.CORPORATE_INCOME],
        program_name="SC DOR e-File",
        program_url="https://dor.sc.gov/",
        uses_fed_state_program=True,
    ),
    "KY": StateEFileConfig(
        state_code="KY",
        state_name="Kentucky",
        has_income_tax=True,
        filing_types=[StateFilingType.INDIVIDUAL_INCOME, StateFilingType.CORPORATE_INCOME],
        program_name="KY DOR e-File",
        program_url="https://revenue.ky.gov/",
        uses_fed_state_program=True,
    ),
    "AL": StateEFileConfig(
        state_code="AL",
        state_name="Alabama",
        has_income_tax=True,
        filing_types=[StateFilingType.INDIVIDUAL_INCOME, StateFilingType.CORPORATE_INCOME],
        program_name="AL DOR e-File",
        program_url="https://revenue.alabama.gov/",
        uses_fed_state_program=True,
    ),
    "LA": StateEFileConfig(
        state_code="LA",
        state_name="Louisiana",
        has_income_tax=True,
        filing_types=[StateFilingType.INDIVIDUAL_INCOME, StateFilingType.CORPORATE_INCOME],
        program_name="LA DOR e-File",
        program_url="https://revenue.louisiana.gov/",
        uses_fed_state_program=True,
    ),
    "OK": StateEFileConfig(
        state_code="OK",
        state_name="Oklahoma",
        has_income_tax=True,
        filing_types=[StateFilingType.INDIVIDUAL_INCOME, StateFilingType.CORPORATE_INCOME],
        program_name="OTC e-File",
        program_url="https://oklahoma.gov/tax/",
        uses_fed_state_program=True,
    ),
    "IA": StateEFileConfig(
        state_code="IA",
        state_name="Iowa",
        has_income_tax=True,
        filing_types=[StateFilingType.INDIVIDUAL_INCOME, StateFilingType.CORPORATE_INCOME],
        program_name="Iowa DOR e-File",
        program_url="https://tax.iowa.gov/",
        uses_fed_state_program=True,
    ),
    "KS": StateEFileConfig(
        state_code="KS",
        state_name="Kansas",
        has_income_tax=True,
        filing_types=[StateFilingType.INDIVIDUAL_INCOME, StateFilingType.CORPORATE_INCOME],
        program_name="KS DOR e-File",
        program_url="https://www.ksrevenue.gov/",
        uses_fed_state_program=True,
    ),
    "UT": StateEFileConfig(
        state_code="UT",
        state_name="Utah",
        has_income_tax=True,
        filing_types=[StateFilingType.INDIVIDUAL_INCOME, StateFilingType.CORPORATE_INCOME],
        program_name="USTC e-File",
        program_url="https://tax.utah.gov/",
        uses_fed_state_program=True,
    ),
    "AR": StateEFileConfig(
        state_code="AR",
        state_name="Arkansas",
        has_income_tax=True,
        filing_types=[StateFilingType.INDIVIDUAL_INCOME, StateFilingType.CORPORATE_INCOME],
        program_name="AR DFA e-File",
        program_url="https://www.dfa.arkansas.gov/",
        uses_fed_state_program=True,
    ),
    "MS": StateEFileConfig(
        state_code="MS",
        state_name="Mississippi",
        has_income_tax=True,
        filing_types=[StateFilingType.INDIVIDUAL_INCOME, StateFilingType.CORPORATE_INCOME],
        program_name="MS DOR e-File",
        program_url="https://www.dor.ms.gov/",
        uses_fed_state_program=True,
    ),
    "NE": StateEFileConfig(
        state_code="NE",
        state_name="Nebraska",
        has_income_tax=True,
        filing_types=[StateFilingType.INDIVIDUAL_INCOME, StateFilingType.CORPORATE_INCOME],
        program_name="NE DOR e-File",
        program_url="https://revenue.nebraska.gov/",
        uses_fed_state_program=True,
    ),
    "NM": StateEFileConfig(
        state_code="NM",
        state_name="New Mexico",
        has_income_tax=True,
        filing_types=[StateFilingType.INDIVIDUAL_INCOME, StateFilingType.CORPORATE_INCOME],
        program_name="NM TRD e-File",
        program_url="https://www.tax.newmexico.gov/",
        uses_fed_state_program=True,
    ),
    "WV": StateEFileConfig(
        state_code="WV",
        state_name="West Virginia",
        has_income_tax=True,
        filing_types=[StateFilingType.INDIVIDUAL_INCOME, StateFilingType.CORPORATE_INCOME],
        program_name="WV Tax e-File",
        program_url="https://tax.wv.gov/",
        uses_fed_state_program=True,
    ),
    "ID": StateEFileConfig(
        state_code="ID",
        state_name="Idaho",
        has_income_tax=True,
        filing_types=[StateFilingType.INDIVIDUAL_INCOME, StateFilingType.CORPORATE_INCOME],
        program_name="Idaho Tax Commission e-File",
        program_url="https://tax.idaho.gov/",
        uses_fed_state_program=True,
    ),
    "HI": StateEFileConfig(
        state_code="HI",
        state_name="Hawaii",
        has_income_tax=True,
        filing_types=[StateFilingType.INDIVIDUAL_INCOME, StateFilingType.CORPORATE_INCOME],
        program_name="HI DOTAX e-File",
        program_url="https://tax.hawaii.gov/",
        uses_fed_state_program=True,
    ),
    "ME": StateEFileConfig(
        state_code="ME",
        state_name="Maine",
        has_income_tax=True,
        filing_types=[StateFilingType.INDIVIDUAL_INCOME, StateFilingType.CORPORATE_INCOME],
        program_name="Maine Revenue e-File",
        program_url="https://www.maine.gov/revenue/",
        uses_fed_state_program=True,
    ),
    "RI": StateEFileConfig(
        state_code="RI",
        state_name="Rhode Island",
        has_income_tax=True,
        filing_types=[StateFilingType.INDIVIDUAL_INCOME, StateFilingType.CORPORATE_INCOME],
        program_name="RI Division of Taxation e-File",
        program_url="https://tax.ri.gov/",
        uses_fed_state_program=True,
    ),
    "MT": StateEFileConfig(
        state_code="MT",
        state_name="Montana",
        has_income_tax=True,
        filing_types=[StateFilingType.INDIVIDUAL_INCOME, StateFilingType.CORPORATE_INCOME],
        program_name="MT DOR e-File",
        program_url="https://mtrevenue.gov/",
        uses_fed_state_program=True,
    ),
    "DE": StateEFileConfig(
        state_code="DE",
        state_name="Delaware",
        has_income_tax=True,
        filing_types=[StateFilingType.INDIVIDUAL_INCOME, StateFilingType.CORPORATE_INCOME,
                      StateFilingType.FRANCHISE],
        program_name="DE Division of Revenue e-File",
        program_url="https://revenue.delaware.gov/",
        uses_fed_state_program=True,
    ),
    "ND": StateEFileConfig(
        state_code="ND",
        state_name="North Dakota",
        has_income_tax=True,
        filing_types=[StateFilingType.INDIVIDUAL_INCOME, StateFilingType.CORPORATE_INCOME],
        program_name="ND Tax e-File",
        program_url="https://www.tax.nd.gov/",
        uses_fed_state_program=True,
    ),
    "VT": StateEFileConfig(
        state_code="VT",
        state_name="Vermont",
        has_income_tax=True,
        filing_types=[StateFilingType.INDIVIDUAL_INCOME, StateFilingType.CORPORATE_INCOME],
        program_name="VT Tax e-File",
        program_url="https://tax.vermont.gov/",
        uses_fed_state_program=True,
    ),

    # === DISTRICT OF COLUMBIA ===
    "DC": StateEFileConfig(
        state_code="DC",
        state_name="District of Columbia",
        has_income_tax=True,
        filing_types=[StateFilingType.INDIVIDUAL_INCOME, StateFilingType.CORPORATE_INCOME],
        program_name="OTR e-File",
        program_url="https://otr.cfo.dc.gov/",
        uses_fed_state_program=True,
    ),
}


class StateAuthorizationManager:
    """
    Manages state-level e-File authorization for all 50 states + DC.

    Handles:
    - Authorization tracking per state
    - Testing requirements
    - Credential management
    - Compliance monitoring
    """

    def __init__(self):
        self.authorizations: Dict[str, StateAuthorization] = {}
        self._load_authorizations()

    def _load_authorizations(self):
        """Load existing authorizations from database."""
        # In production, load from database
        pass

    def get_state_config(self, state_code: str) -> Optional[StateEFileConfig]:
        """Get configuration for a specific state."""
        return STATE_EFILE_CONFIGS.get(state_code.upper())

    def get_all_states(self) -> List[StateEFileConfig]:
        """Get all state configurations."""
        return list(STATE_EFILE_CONFIGS.values())

    def get_income_tax_states(self) -> List[StateEFileConfig]:
        """Get states with individual income tax."""
        return [s for s in STATE_EFILE_CONFIGS.values() if s.has_income_tax]

    def get_authorization_status(self, state_code: str) -> Optional[StateAuthorization]:
        """Get current authorization status for a state."""
        return self.authorizations.get(state_code.upper())

    def get_authorized_states(self) -> List[str]:
        """Get list of states where we're authorized to e-File."""
        return [
            code for code, auth in self.authorizations.items()
            if auth.status == AuthorizationStatus.AUTHORIZED
        ]

    def start_authorization(
        self,
        state_code: str,
        filing_types: List[StateFilingType]
    ) -> StateAuthorization:
        """Begin authorization process for a state."""
        config = self.get_state_config(state_code)
        if not config:
            raise ValueError(f"Unknown state code: {state_code}")

        authorization = StateAuthorization(
            state_code=state_code.upper(),
            status=AuthorizationStatus.APPLICATION_PENDING,
            filing_types=filing_types,
            application_date=datetime.now(),
        )

        self.authorizations[state_code.upper()] = authorization
        return authorization

    def update_testing_status(
        self,
        state_code: str,
        scenarios_required: int,
        scenarios_passed: int
    ) -> StateAuthorization:
        """Update testing progress for a state."""
        auth = self.authorizations.get(state_code.upper())
        if not auth:
            raise ValueError(f"No authorization found for {state_code}")

        auth.test_scenarios_required = scenarios_required
        auth.test_scenarios_passed = scenarios_passed
        auth.last_test_date = datetime.now()

        if scenarios_passed >= scenarios_required:
            auth.status = AuthorizationStatus.TESTING_PASSED
        else:
            auth.status = AuthorizationStatus.TESTING_IN_PROGRESS

        return auth

    def activate_authorization(
        self,
        state_code: str,
        transmitter_id: str,
        software_id: str,
        expiration_date: datetime
    ) -> StateAuthorization:
        """Activate authorization after approval."""
        auth = self.authorizations.get(state_code.upper())
        if not auth:
            raise ValueError(f"No authorization found for {state_code}")

        auth.status = AuthorizationStatus.AUTHORIZED
        auth.approval_date = datetime.now()
        auth.expiration_date = expiration_date
        auth.transmitter_id = transmitter_id
        auth.software_id = software_id

        return auth

    def check_renewal_required(self) -> List[StateAuthorization]:
        """Get list of states requiring renewal."""
        renewals_needed = []
        now = datetime.now()

        for auth in self.authorizations.values():
            if auth.status == AuthorizationStatus.AUTHORIZED and auth.expiration_date:
                days_until_expiration = (auth.expiration_date - now).days
                if days_until_expiration <= 60:  # 60 day warning
                    auth.status = AuthorizationStatus.RENEWAL_REQUIRED
                    renewals_needed.append(auth)

        return renewals_needed

    def get_compliance_summary(self) -> Dict[str, Any]:
        """Get overall compliance summary across all states."""
        total_states = len(STATE_EFILE_CONFIGS)
        income_tax_states = len(self.get_income_tax_states())
        authorized_states = len(self.get_authorized_states())

        pending = sum(1 for a in self.authorizations.values()
                     if a.status == AuthorizationStatus.APPLICATION_PENDING)
        testing = sum(1 for a in self.authorizations.values()
                     if a.status in [AuthorizationStatus.TESTING_REQUIRED,
                                    AuthorizationStatus.TESTING_IN_PROGRESS])
        renewal = sum(1 for a in self.authorizations.values()
                     if a.status == AuthorizationStatus.RENEWAL_REQUIRED)

        return {
            "total_states": total_states,
            "income_tax_states": income_tax_states,
            "authorized": authorized_states,
            "authorization_rate": f"{(authorized_states / income_tax_states * 100):.1f}%",
            "pending_applications": pending,
            "in_testing": testing,
            "renewal_required": renewal,
            "coverage_map": {
                code: self.authorizations.get(code, StateAuthorization(
                    state_code=code,
                    status=AuthorizationStatus.NOT_APPLIED,
                    filing_types=[]
                )).status.value
                for code in STATE_EFILE_CONFIGS.keys()
            }
        }


# Singleton instance
state_auth_manager = StateAuthorizationManager()
