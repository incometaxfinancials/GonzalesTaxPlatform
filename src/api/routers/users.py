"""
GONZALES TAX PLATFORM - Users Router
Agent Valentina - Backend/API Master

User profile and account management endpoints.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Optional
from uuid import UUID
from datetime import datetime

router = APIRouter()


# ===========================================
# SCHEMAS
# ===========================================
class UserProfile(BaseModel):
    id: str
    email: EmailStr
    first_name: str
    last_name: str
    phone: Optional[str] = None
    created_at: datetime
    subscription_tier: str
    mfa_enabled: bool


class UpdateProfileRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None


class SubscriptionInfo(BaseModel):
    tier: str
    price: float
    features: list[str]
    billing_cycle: str
    next_billing_date: Optional[datetime] = None


# ===========================================
# ENDPOINTS
# ===========================================
@router.get("/me", response_model=UserProfile)
async def get_current_user():
    """
    Get current user profile.
    """
    return UserProfile(
        id="user-123",
        email="user@example.com",
        first_name="John",
        last_name="Doe",
        phone="+1234567890",
        created_at=datetime.utcnow(),
        subscription_tier="free",
        mfa_enabled=False
    )


@router.put("/me", response_model=UserProfile)
async def update_profile(request: UpdateProfileRequest):
    """
    Update user profile.
    """
    return UserProfile(
        id="user-123",
        email="user@example.com",
        first_name=request.first_name or "John",
        last_name=request.last_name or "Doe",
        phone=request.phone,
        created_at=datetime.utcnow(),
        subscription_tier="free",
        mfa_enabled=False
    )


@router.get("/subscription", response_model=SubscriptionInfo)
async def get_subscription():
    """
    Get current subscription details.
    """
    return SubscriptionInfo(
        tier="free",
        price=0,
        features=[
            "Simple 1040 returns",
            "Federal e-filing",
            "Basic deduction finder"
        ],
        billing_cycle="none"
    )


@router.post("/subscription/upgrade")
async def upgrade_subscription(tier: str):
    """
    Upgrade subscription tier.
    """
    tiers = {
        "plus": {"price": 49.99, "features": ["All schedules", "State filing"]},
        "premium": {"price": 89.99, "features": ["Self-employed", "AI optimizer"]},
        "pro": {"price": 1295.00, "features": ["Unlimited clients", "Business returns"]}
    }

    if tier not in tiers:
        raise HTTPException(status_code=400, detail="Invalid tier")

    return {
        "message": f"Upgraded to {tier}",
        "tier": tier,
        **tiers[tier]
    }


@router.delete("/me")
async def delete_account():
    """
    Delete user account (GDPR compliance).
    """
    return {"message": "Account scheduled for deletion in 30 days"}
