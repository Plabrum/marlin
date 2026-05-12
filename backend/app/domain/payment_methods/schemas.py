from datetime import datetime

from app.platform.base.schemas import BaseSchema
from app.utils.sqids import Sqid


class PaymentMethodListItem(BaseSchema):
    id: Sqid
    brand: str
    last4: str
    exp_month: int
    exp_year: int
    is_default: bool
    created_at: datetime


class PaymentMethodDetail(BaseSchema):
    id: Sqid
    stripe_payment_method_id: str
    brand: str
    last4: str
    exp_month: int
    exp_year: int
    is_default: bool
    created_at: datetime
    updated_at: datetime


class AttachPaymentMethodData(BaseSchema):
    payment_method_id: str
