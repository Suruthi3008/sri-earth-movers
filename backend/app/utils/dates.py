"""Report period calculation. Every period is inclusive of both ends."""
import calendar
from datetime import date, timedelta

from app.services.errors import BusinessRuleError


def resolve_range(
    preset: str, today: date, start: date | None = None, end: date | None = None
) -> tuple[date, date, str]:
    """Return (start, end, label) for a report preset."""
    if preset == "today":
        return today, today, "Today"

    if preset == "week":
        monday = today - timedelta(days=today.weekday())
        return monday, monday + timedelta(days=6), "This Week"

    if preset == "month":
        last_day = calendar.monthrange(today.year, today.month)[1]
        return today.replace(day=1), today.replace(day=last_day), today.strftime("%B %Y")

    if preset == "year":
        return date(today.year, 1, 1), date(today.year, 12, 31), str(today.year)

    if preset == "custom":
        if start is None or end is None:
            raise BusinessRuleError("Choose both a start date and an end date.")
        if end < start:
            raise BusinessRuleError("The end date must be on or after the start date.")
        return start, end, f"{start:%d/%m/%Y} – {end:%d/%m/%Y}"

    raise BusinessRuleError("Unknown report period.")
