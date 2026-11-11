"""Shared input validation; reject booleans even though bool subclasses int."""

def integer(value, name, minimum=0):
    if type(value) is not int or value < minimum:
        raise ValueError(f"{name} must be an integer >= {minimum}")
    return value


def integer_list(values, name, minimum=0, allow_empty=False):
    if not isinstance(values, list) or (not values and not allow_empty):
        raise ValueError(f"{name} must be {'a' if allow_empty else 'a nonempty'} list")
    return [integer(v, f"{name}[{i}]", minimum) for i, v in enumerate(values)]
