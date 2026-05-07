from datetime import datetime

from app.domain.clients.enums import ClientType
from app.platform.base.schemas import BaseSchema
from app.utils.sqids import Sqid


class ClientListItem(BaseSchema):
    id: Sqid
    client_type: ClientType
    display_name: str
    email: str | None
    phone: str | None
    created_at: datetime


class ClientDetail(BaseSchema):
    id: Sqid
    client_type: ClientType
    display_name: str
    email: str | None
    phone: str | None
    first_name: str | None
    last_name: str | None
    company_name: str | None
    claim_contact_name: str | None
    institution_name: str | None
    loan_officer_name: str | None
    brokerage_name: str | None
    agent_name: str | None
    license_number: str | None
    created_at: datetime
    updated_at: datetime


class CreateIndividualData(BaseSchema):
    first_name: str
    last_name: str
    email: str | None = None
    phone: str | None = None


class CreateInsuranceCompanyData(BaseSchema):
    company_name: str
    claim_contact_name: str | None = None
    email: str | None = None
    phone: str | None = None


class CreateLenderData(BaseSchema):
    institution_name: str
    loan_officer_name: str | None = None
    email: str | None = None
    phone: str | None = None


class CreateBrokerData(BaseSchema):
    brokerage_name: str
    agent_name: str | None = None
    license_number: str | None = None
    email: str | None = None
    phone: str | None = None


class UpdateClientData(BaseSchema):
    display_name: str
    email: str | None
    phone: str | None
    first_name: str | None
    last_name: str | None
    company_name: str | None
    claim_contact_name: str | None
    institution_name: str | None
    loan_officer_name: str | None
    brokerage_name: str | None
    agent_name: str | None
    license_number: str | None
