from __future__ import annotations

from enum import StrEnum, auto

from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.clients.enums import ClientType
from app.domain.clients.models import Client
from app.domain.clients.schemas import (
    CreateBrokerData,
    CreateIndividualData,
    CreateInsuranceCompanyData,
    CreateLenderData,
    UpdateClientData,
)
from app.platform.actions.base import BaseObjectAction, BaseTopLevelAction, EmptyActionData, action_group_factory
from app.platform.actions.deps import ActionDeps
from app.platform.actions.enums import ActionGroupType, ActionIcon
from app.platform.actions.schemas import ActionExecutionResponse


class ClientActionKey(StrEnum):
    CREATE_INDIVIDUAL = auto()
    CREATE_INSURANCE_COMPANY = auto()
    CREATE_LENDER = auto()
    CREATE_BROKER = auto()
    UPDATE = auto()
    DELETE = auto()


client_actions = action_group_factory(
    group_type=ActionGroupType.CLIENT_ACTIONS,
    default_invalidation="list_Client",
    model_type=Client,
)


@client_actions
class CreateIndividual(BaseTopLevelAction[CreateIndividualData]):
    action_key = ClientActionKey.CREATE_INDIVIDUAL
    label = "Add Individual"
    icon = ActionIcon.ADD
    priority = 10

    @classmethod
    async def execute(
        cls, data: CreateIndividualData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        client = Client(
            organization_id=deps.user.organization_id,
            client_type=ClientType.individual,
            display_name=f"{data.first_name} {data.last_name}",
            first_name=data.first_name,
            last_name=data.last_name,
            email=data.email,
            phone=data.phone,
        )
        transaction.add(client)
        await transaction.flush()
        return ActionExecutionResponse(message="Client created", created_id=client.id)


@client_actions
class CreateInsuranceCompany(BaseTopLevelAction[CreateInsuranceCompanyData]):
    action_key = ClientActionKey.CREATE_INSURANCE_COMPANY
    label = "Add Insurance Company"
    icon = ActionIcon.ADD
    priority = 11

    @classmethod
    async def execute(
        cls, data: CreateInsuranceCompanyData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        client = Client(
            organization_id=deps.user.organization_id,
            client_type=ClientType.insurance_company,
            display_name=data.company_name,
            company_name=data.company_name,
            claim_contact_name=data.claim_contact_name,
            email=data.email,
            phone=data.phone,
        )
        transaction.add(client)
        await transaction.flush()
        return ActionExecutionResponse(message="Insurance company created", created_id=client.id)


@client_actions
class CreateLender(BaseTopLevelAction[CreateLenderData]):
    action_key = ClientActionKey.CREATE_LENDER
    label = "Add Lender"
    icon = ActionIcon.ADD
    priority = 12

    @classmethod
    async def execute(
        cls, data: CreateLenderData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        client = Client(
            organization_id=deps.user.organization_id,
            client_type=ClientType.lender,
            display_name=data.institution_name,
            institution_name=data.institution_name,
            loan_officer_name=data.loan_officer_name,
            email=data.email,
            phone=data.phone,
        )
        transaction.add(client)
        await transaction.flush()
        return ActionExecutionResponse(message="Lender created", created_id=client.id)


@client_actions
class CreateBroker(BaseTopLevelAction[CreateBrokerData]):
    action_key = ClientActionKey.CREATE_BROKER
    label = "Add Broker"
    icon = ActionIcon.ADD
    priority = 13

    @classmethod
    async def execute(
        cls, data: CreateBrokerData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        display_name = data.brokerage_name
        if data.agent_name:
            display_name = f"{data.agent_name} ({data.brokerage_name})"
        client = Client(
            organization_id=deps.user.organization_id,
            client_type=ClientType.broker,
            display_name=display_name,
            brokerage_name=data.brokerage_name,
            agent_name=data.agent_name,
            license_number=data.license_number,
            email=data.email,
            phone=data.phone,
        )
        transaction.add(client)
        await transaction.flush()
        return ActionExecutionResponse(message="Broker created", created_id=client.id)


@client_actions
class UpdateClient(BaseObjectAction[Client, UpdateClientData]):
    action_key = ClientActionKey.UPDATE
    label = "Edit Client"
    icon = ActionIcon.EDIT
    priority = 20

    @classmethod
    async def execute(
        cls, obj: Client, data: UpdateClientData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        obj.display_name = data.display_name
        obj.email = data.email
        obj.phone = data.phone
        obj.first_name = data.first_name
        obj.last_name = data.last_name
        obj.company_name = data.company_name
        obj.claim_contact_name = data.claim_contact_name
        obj.institution_name = data.institution_name
        obj.loan_officer_name = data.loan_officer_name
        obj.brokerage_name = data.brokerage_name
        obj.agent_name = data.agent_name
        obj.license_number = data.license_number
        return ActionExecutionResponse(message="Client updated")


@client_actions
class DeleteClient(BaseObjectAction[Client, EmptyActionData]):
    action_key = ClientActionKey.DELETE
    label = "Delete Client"
    icon = ActionIcon.TRASH
    priority = 90
    confirmation_message = "Are you sure you want to delete this client?"
    should_redirect_to_parent = True

    @classmethod
    async def execute(
        cls, obj: Client, data: EmptyActionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        obj.soft_delete()
        return ActionExecutionResponse(message="Client deleted")
