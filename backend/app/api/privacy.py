"""GDPR Privacy API endpoints — data export, account deletion, data summary."""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse

from ..core.auth import get_current_user
from ..models.user import User
from ..services.privacy import PrivacyService

router = APIRouter(prefix="/api/v1/user", tags=["privacy"])


@router.get("/data-summary")
async def get_data_summary(current_user: User = Depends(get_current_user)):
    """Get a summary of what data we store and how it's used."""
    summary = await PrivacyService.get_data_summary()
    return {"summary": summary, "gdpr_rights": [
        "Right to access — use /api/v1/user/export-data to download your data",
        "Right to erasure — use POST /api/v1/user/delete-account to delete your account",
        "Right to data portability — data is exported in machine-readable JSON format",
        "Right to be informed — this endpoint explains what data we store",
    ]}


@router.post("/export-data")
async def export_user_data(current_user: User = Depends(get_current_user)):
    """Export all user data as a downloadable JSON file (GDPR data portability)."""
    try:
        data = await PrivacyService.export_user_data(current_user.id)
        data["exported_at"] = datetime.now(timezone.utc).isoformat()
        data["gdpr_notice"] = (
            "This file contains all personal data associated with your account. "
            "You have the right to data portability under GDPR Article 20. "
            "To request deletion, use POST /api/v1/user/delete-account."
        )

        return JSONResponse(
            content=data,
            headers={
                "Content-Disposition": f'attachment; filename="questkids-data-{current_user.username}.json"',
                "Content-Type": "application/json; charset=utf-8",
            },
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")


@router.post("/delete-account")
async def delete_user_account(current_user: User = Depends(get_current_user)):
    """Soft-delete account and anonymize personal data (GDPR right to erasure)."""
    try:
        success = await PrivacyService.delete_user_account(current_user.id)
        if not success:
            raise HTTPException(status_code=404, detail="User not found")
        return {
            "message": "Account deleted successfully. Your data has been anonymized.",
            "note": "Family-shared resources (task templates, rewards) have been preserved but linked accounts anonymized.",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Account deletion failed: {str(e)}")
