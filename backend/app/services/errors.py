"""Exceptions the API turns into friendly HTTP responses."""


class NotFoundError(Exception):
    """The requested record does not exist (HTTP 404)."""


class BusinessRuleError(Exception):
    """The input is valid but breaks a billing rule (HTTP 400).

    The message is written for the business owner and is safe to show.
    """
