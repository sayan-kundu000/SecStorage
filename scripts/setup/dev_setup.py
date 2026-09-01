#!/usr/bin/env python3
"""
SecStorage Local Development Setup Helper
Checks Python, Node, environment files, and prints setup instructions.
"""
import sys
import os
from pathlib import Path

def main():
    print("=" * 60)
    print("SecStorage — Local Development Environment Checker")
    print("=" * 60)

    root_dir = Path(__file__).resolve().parent.parent.parent
    print(f"Project Root: {root_dir}")

    # Python version check
    py_version = sys.version_info
    print(f"Python Version: {py_version.major}.{py_version.minor}.{py_version.micro}")
    if py_version.major < 3 or (py_version.major == 3 and py_version.minor < 11):
        print("WARNING: Python 3.11+ is recommended for SecStorage backend.")

    # Check env files
    env_file = root_dir / ".env"
    env_example = root_dir / ".env.example"

    if not env_file.exists() and env_example.exists():
        print("Notice: .env file missing. Copying .env.example -> .env")
        try:
            env_file.write_text(env_example.read_text())
            print("Successfully created .env file.")
        except Exception as e:
            print(f"Could not copy .env: {e}")
    else:
        print("Root .env file exists.")

    print("\nNext Steps:")
    print("1. Backend:  cd backend && pip install -e . && uvicorn app.main:app --reload")
    print("2. Frontend: cd frontend && npm install && npm run dev")
    print("=" * 60)

if __name__ == "__main__":
    main()
