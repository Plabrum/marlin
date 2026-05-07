from __future__ import annotations

from enum import StrEnum, auto

from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.subscriptions.enums import SubscriptionStatus
from app.domain.subscriptions.models import Subscription
from app.domain.subscriptions.schemas import CreateSubscriptionData, UpdateSubscriptionData
from app.domain.subscriptions.state_machine import subscription_state_machine
from app.platform.actions.base import BaseObjectAction, BaseTopLevelAction, EmptyActionData, action_group_factory
from app.platform.actions.deps import ActionDeps
from app.platform.actions.enums import ActionGroupType, ActionIcon
from app.platform.actions.schemas import ActionExecutionResponse


class SubscriptionActionKey(StrEnum):
    CREATE = auto()
    UPDATE = auto()
    PAUSE = auto()
    RESUME = auto()
    CANCEL = auto()


subscription_actions = action_group_factory(
    group_type=ActionGroupType.SUBSCRIPTION_ACTIONS,
    default_invalidation="list_Subscription",
    model_type=Subscription,
)


@subscription_actions
class CreateSubscription(BaseTopLevelAction[CreateSubscriptionData]):
    action_key = SubscriptionActionKey.CREATE
    label = "Create Subscription"
    icon = ActionIcon.ADD
    priority = 10

    @classmethod
    async def execute(
        cls, data: CreateSubscriptionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        sub = Subscription(
            organization_id=deps.user.organization_id,
            plan=data.plan,
        )
        transaction.add(sub)
        await transaction.flush()
        return ActionExecutionResponse(message="Subscription created", created_id=sub.id)


@subscription_actions
class UpdateSubscription(BaseObjectAction[Subscription, UpdateSubscriptionData]):
    action_key = SubscriptionActionKey.UPDATE
    label = "Change Plan"
    icon = ActionIcon.EDIT
    priority = 20

    @classmethod
    async def execute(
        cls, obj: Subscription, data: UpdateSubscriptionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        obj.plan = data.plan
        return ActionExecutionResponse(message="Subscription plan updated")


@subscription_actions
class PauseSubscription(BaseObjectAction[Subscription, EmptyActionData]):
    action_key = SubscriptionActionKey.PAUSE
    label = "Pause Subscription"
    icon = ActionIcon.X
    priority = 30

    @classmethod
    def is_available(cls, obj: Subscription, deps: ActionDeps) -> bool:
        return subscription_state_machine.can_transition(obj, SubscriptionStatus.paused, deps.user.role_enum)

    @classmethod
    async def execute(
        cls, obj: Subscription, data: EmptyActionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        await deps.sm_service.transition(subscription_state_machine, obj, SubscriptionStatus.paused, actor=deps.user)
        return ActionExecutionResponse(message="Subscription paused")


@subscription_actions
class ResumeSubscription(BaseObjectAction[Subscription, EmptyActionData]):
    action_key = SubscriptionActionKey.RESUME
    label = "Resume Subscription"
    icon = ActionIcon.CHECK
    priority = 31

    @classmethod
    def is_available(cls, obj: Subscription, deps: ActionDeps) -> bool:
        return subscription_state_machine.can_transition(obj, SubscriptionStatus.active, deps.user.role_enum)

    @classmethod
    async def execute(
        cls, obj: Subscription, data: EmptyActionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        await deps.sm_service.transition(subscription_state_machine, obj, SubscriptionStatus.active, actor=deps.user)
        return ActionExecutionResponse(message="Subscription resumed")


@subscription_actions
class CancelSubscription(BaseObjectAction[Subscription, EmptyActionData]):
    action_key = SubscriptionActionKey.CANCEL
    label = "Cancel Subscription"
    icon = ActionIcon.TRASH
    priority = 90
    confirmation_message = "Cancel this subscription?"

    @classmethod
    def is_available(cls, obj: Subscription, deps: ActionDeps) -> bool:
        return subscription_state_machine.can_transition(obj, SubscriptionStatus.cancelled, deps.user.role_enum)

    @classmethod
    async def execute(
        cls, obj: Subscription, data: EmptyActionData, transaction: AsyncSession, deps: ActionDeps
    ) -> ActionExecutionResponse:
        await deps.sm_service.transition(subscription_state_machine, obj, SubscriptionStatus.cancelled, actor=deps.user)
        return ActionExecutionResponse(message="Subscription cancelled")
