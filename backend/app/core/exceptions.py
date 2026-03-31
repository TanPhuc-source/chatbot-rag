from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from app.utils.logger import logger


def register_exception_handlers(app: FastAPI) -> None:

    @app.exception_handler(404)
    async def not_found(_: Request, exc):
        return JSONResponse(status_code=404, content={"detail": "Không tìm thấy"})

    @app.exception_handler(500)
    async def server_error(_: Request, exc):
        logger.error(f"500 error: {exc}")
        return JSONResponse(status_code=500, content={"detail": "Lỗi server"})

    @app.exception_handler(RequestValidationError)
    async def validation_error(request: Request, exc: RequestValidationError):
        logger.error(
            f"422 on {request.method} {request.url.path}: {exc.errors()}"
        )
        body = await request.body()
        logger.error(f"422 body: {body.decode(errors='replace')}")
        return JSONResponse(status_code=422, content={"detail": exc.errors()})