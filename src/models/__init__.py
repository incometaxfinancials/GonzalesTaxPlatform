"""Data models"""
from .tax_return import (
    TaxReturn, TaxpayerInfo, Dependent,
    W2Income, Form1099, SelfEmploymentIncome,
    ItemizedDeductions, TaxCredits,
    FilingStatus, ReturnStatus, ReturnType,
    DeductionType, IncomeType, gaap_round
)
