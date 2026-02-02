"""
GONZALES TAX PLATFORM - Main API Application
Agent Valentina - Backend/API Master

FastAPI application entry point with all routes and middleware.
"""
from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging
import time
from typing import Callable

from .routers import auth, returns, calculations, documents, efile, users, optimizer
from ..core.config import get_settings, Environment


# ===========================================
# LOGGING SETUP
# ===========================================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("gonzales_tax")


# ===========================================
# APPLICATION LIFESPAN
# ===========================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events"""
    # Startup
    logger.info("Starting Gonzales Tax Platform...")
    settings = get_settings()
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"Tax Year: {settings.CURRENT_TAX_YEAR}")

    # Initialize database connections, cache, etc.
    # await init_database()
    # await init_cache()

    yield

    # Shutdown
    logger.info("Shutting down Gonzales Tax Platform...")
    # await close_database()
    # await close_cache()


# ===========================================
# CREATE APPLICATION
# ===========================================
def create_app() -> FastAPI:
    """Application factory"""
    settings = get_settings()

    app = FastAPI(
        title="Gonzales Tax Platform API",
        description="""
        ## Enterprise Tax Automation Platform

        The Gonzales Tax Platform provides comprehensive tax preparation,
        calculation, and e-filing services for individuals and professionals.

        ### Features
        - **Tax Calculations**: IRS-compliant tax calculations with OBBBA support
        - **Deduction Optimizer**: AI-powered deduction discovery
        - **E-File**: Direct IRS MeF e-filing integration
        - **Document Management**: Secure document upload and OCR
        - **Multi-Platform**: Web, Mobile, and Desktop support

        ### Agent Team
        - Agent Lliset: Tax Law Authority
        - Agent Marisol: Chief Architect
        - Agent Xiomara: Frontend/UX
        - Agent Valentina: Backend/API
        - Agent Catalina: Security/QA

        *Built in solidarity with the Gonzales legacy.*
        """,
        version="1.0.0",
        docs_url="/docs" if settings.ENVIRONMENT != Environment.PRODUCTION else None,
        redoc_url="/redoc" if settings.ENVIRONMENT != Environment.PRODUCTION else None,
        lifespan=lifespan,
    )

    # Add middleware
    configure_middleware(app, settings)

    # Add routers
    configure_routers(app)

    # Add exception handlers
    configure_exception_handlers(app)

    return app


# ===========================================
# MIDDLEWARE CONFIGURATION
# ===========================================
def configure_middleware(app: FastAPI, settings):
    """Configure all middleware"""

    # CORS
    allowed_origins = [
        "https://gonzaleztax.com",
        "https://www.gonzaleztax.com",
        "https://app.gonzaleztax.com",
    ]

    if settings.ENVIRONMENT in (Environment.DEVELOPMENT, Environment.TESTING):
        allowed_origins.extend([
            "http://localhost:3000",
            "http://localhost:5173",
            "http://127.0.0.1:3000",
        ])

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID", "X-RateLimit-Remaining"],
    )

    # Gzip compression
    app.add_middleware(GZipMiddleware, minimum_size=1000)

    # Request timing middleware
    @app.middleware("http")
    async def add_process_time_header(request: Request, call_next: Callable):
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = str(process_time)
        return response

    # Request ID middleware
    @app.middleware("http")
    async def add_request_id(request: Request, call_next: Callable):
        import uuid
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response

    # Security headers middleware
    @app.middleware("http")
    async def add_security_headers(request: Request, call_next: Callable):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        if settings.ENVIRONMENT == Environment.PRODUCTION:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response


# ===========================================
# ROUTER CONFIGURATION
# ===========================================
def configure_routers(app: FastAPI):
    """Configure all API routers"""

    # Include routers with prefixes
    app.include_router(
        auth.router,
        prefix="/api/v1/auth",
        tags=["Authentication"]
    )

    app.include_router(
        users.router,
        prefix="/api/v1/users",
        tags=["Users"]
    )

    app.include_router(
        returns.router,
        prefix="/api/v1/returns",
        tags=["Tax Returns"]
    )

    app.include_router(
        calculations.router,
        prefix="/api/v1/calculate",
        tags=["Tax Calculations"]
    )

    app.include_router(
        optimizer.router,
        prefix="/api/v1/optimize",
        tags=["Deduction Optimizer"]
    )

    app.include_router(
        documents.router,
        prefix="/api/v1/documents",
        tags=["Documents"]
    )

    app.include_router(
        efile.router,
        prefix="/api/v1/efile",
        tags=["E-File"]
    )

    # Health check endpoint
    @app.get("/health", tags=["Health"])
    async def health_check():
        """Health check endpoint for load balancers"""
        return {
            "status": "healthy",
            "service": "gonzales-tax-api",
            "version": "1.0.0"
        }

    # Root endpoint
    @app.get("/", tags=["Root"])
    async def root():
        """API root with basic info"""
        return {
            "name": "Gonzales Tax Platform API",
            "version": "1.0.0",
            "documentation": "/docs",
            "status": "operational"
        }


# ===========================================
# EXCEPTION HANDLERS
# ===========================================
def configure_exception_handlers(app: FastAPI):
    """Configure custom exception handlers"""

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": exc.status_code,
                    "message": exc.detail,
                    "request_id": getattr(request.state, "request_id", None)
                }
            }
        )

    @app.exception_handler(ValueError)
    async def value_error_handler(request: Request, exc: ValueError):
        logger.error(f"ValueError: {exc}")
        return JSONResponse(
            status_code=400,
            content={
                "error": {
                    "code": 400,
                    "message": str(exc),
                    "request_id": getattr(request.state, "request_id", None)
                }
            }
        )

    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        logger.exception(f"Unhandled exception: {exc}")
        settings = get_settings()

        # In production, don't expose internal errors
        message = "An internal error occurred" if settings.is_production else str(exc)

        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "code": 500,
                    "message": message,
                    "request_id": getattr(request.state, "request_id", None)
                }
            }
        )


# ===========================================
# APPLICATION INSTANCE
# ===========================================
app = create_app()


# ===========================================
# UVICORN ENTRY POINT
# ===========================================
if __name__ == "__main__":
    import uvicorn
    settings = get_settings()

    uvicorn.run(
        "src.api.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.ENVIRONMENT == Environment.DEVELOPMENT,
        workers=4 if settings.is_production else 1,
    )
