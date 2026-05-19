import os
import uvicorn

os.chdir(r"d:/researchpilot/researchpilot/backend")
uvicorn.run("main:app", host="127.0.0.1", port=8000)
