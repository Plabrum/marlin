from msgspec import Struct


class BaseSchema(Struct):
    """Base schema class for all msgspec structs."""

    pass


class PagedResponse[T](Struct):
    """Paginated list response envelope."""

    items: list[T]
    total: int
    offset: int
    limit: int
    has_more: bool
