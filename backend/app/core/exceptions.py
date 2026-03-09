from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from app.utils.logger import logger


def register_exception_handlers(app: FastAPI) -> None:

    @app.exception_handler(404)
    async def not_found(_: Request, exc):
        return JSONResponse(status_code=404, content={"detail": "Không tìm thấy"})

    @app.exception_handler(500)
    async def server_error(_: Request, exc):
        logger.error(f"500 error: {exc}")
        return JSONResponse(status_code=500, content={"detail": "Lỗi server"})
