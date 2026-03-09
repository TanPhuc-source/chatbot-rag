import sys
from loguru import logger
from app.config import get_settings


def setup_logger() -> None:
    settings = get_settings()
    logger.remove()
    logger.add(
        sys.stdout,
        level=settings.LOG_LEVEL,
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{line}</cyan> — <level>{message}</level>",
        colorize=True,
    )
    logger.add(
        "logs/app.log",
        level="INFO",
        rotation="10 MB",
        retention="7 days",
        compression="zip",
    )


setup_logger()

__all__ = ["logger"]
