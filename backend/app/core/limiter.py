"""
Shared rate-limiter instance.

Import this everywhere instead of creating a new Limiter() per router.
The single instance here must match the one registered on app.state.limiter
in main.py — SlowAPIMiddleware uses app.state.limiter to resolve limits,
so having per-router instances causes it to miss the decorator metadata
and can corrupt request body parsing (resulting in 422 errors).
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)