"""Serve the TOMA office beside the existing SNS app; no credentials or writes."""
from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, RedirectResponse

router = APIRouter()
ROOT = Path(__file__).resolve().parent / 'company_office_static'

@router.get('/office', include_in_schema=False)
def office_redirect():
    return RedirectResponse('/office/#toma')

@router.get('/office/', include_in_schema=False)
def office_home():
    return FileResponse(ROOT / 'index.html', headers={'Cache-Control': 'no-cache'})

@router.get('/office/{asset_path:path}', include_in_schema=False)
def office_asset(asset_path: str):
    path = (ROOT / asset_path).resolve()
    if not path.is_relative_to(ROOT.resolve()) or path.suffix not in {'.js', '.css', '.png'} or not path.is_file():
        raise HTTPException(404)
    return FileResponse(path, headers={'Cache-Control': 'no-cache'})
