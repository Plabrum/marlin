from enum import StrEnum, auto


class WidgetType(StrEnum):
    AREA_CHART = auto()
    BAR_CHART = auto()
    STAT_CARDS = auto()
    RESOURCE_TABLE = auto()
    CHILD_LIST = auto()
