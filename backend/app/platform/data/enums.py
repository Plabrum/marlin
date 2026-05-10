from enum import Enum, StrEnum


class FieldType(StrEnum):
    int = "int"
    float = "float"
    cents = "cents"
    string = "string"
    enum = "enum"
    datetime = "datetime"
    bool = "bool"


class AggregationType(Enum):
    sum = "sum"
    avg = "avg"
    max = "max"
    min = "min"
    count = "count"


class Granularity(StrEnum):
    hour = "hour"
    day = "day"
    week = "week"
    month = "month"
    quarter = "quarter"
    year = "year"
    auto = "auto"


class TimeRange(StrEnum):
    last_7_days = "last_7_days"
    last_30_days = "last_30_days"
    last_90_days = "last_90_days"
    last_6_months = "last_6_months"
    last_year = "last_year"
    year_to_date = "year_to_date"
    month_to_date = "month_to_date"
    all_time = "all_time"
