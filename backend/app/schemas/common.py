from typing import Generic, Optional, TypeVar, Any
from pydantic import BaseModel

DataT = TypeVar("DataT")

class ErrorDetail(BaseModel):
    code: str
    message: str

class ErrorResponse(BaseModel):
    success: bool = False
    error: ErrorDetail

class StandardResponse(BaseModel, Generic[DataT]):
    success: bool = True
    data: Optional[DataT] = None
    message: str = "Operation completed successfully"

class PaginationParams(BaseModel):
    page: int = 1
    page_size: int = 20
