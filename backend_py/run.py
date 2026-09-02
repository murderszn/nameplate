import os
import sys
import uvicorn

# Ensure repository root is on Python module search path
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

from backend_py.main import app

if __name__ == "__main__":
    uvicorn.run("backend_py.main:app", host="0.0.0.0", port=8080, reload=True, app_dir=REPO_ROOT)
