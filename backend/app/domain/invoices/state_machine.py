from app.domain.invoices.enums import InvoiceState
from app.domain.invoices.models import Invoice
from app.domain.users.roles import Role
from app.platform.state_machine.machine import State, StateMachine, Transition

_staff: set[Role] = {Role.ADMIN, Role.SUPERADMIN}


class DraftState(State[InvoiceState, Invoice]):
    value = InvoiceState.draft
    transitions = [
        Transition(to=InvoiceState.sent, roles=_staff),
        Transition(to=InvoiceState.void, roles=_staff),
    ]


class SentState(State[InvoiceState, Invoice]):
    value = InvoiceState.sent
    transitions = [
        Transition(to=InvoiceState.paid, roles=_staff),
        Transition(to=InvoiceState.overdue, roles=None),
        Transition(to=InvoiceState.void, roles=_staff),
    ]


class OverdueState(State[InvoiceState, Invoice]):
    value = InvoiceState.overdue
    transitions = [
        Transition(to=InvoiceState.paid, roles=_staff),
        Transition(to=InvoiceState.void, roles=_staff),
    ]


class PaidState(State[InvoiceState, Invoice]):
    value = InvoiceState.paid
    transitions = []


class VoidState(State[InvoiceState, Invoice]):
    value = InvoiceState.void
    transitions = []


invoice_state_machine = StateMachine(
    enum_type=InvoiceState,
    states={
        InvoiceState.draft: DraftState,
        InvoiceState.sent: SentState,
        InvoiceState.overdue: OverdueState,
        InvoiceState.paid: PaidState,
        InvoiceState.void: VoidState,
    },
)
