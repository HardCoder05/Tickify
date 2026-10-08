# Tickify — Backend

FastAPI backend for the Tickify event ticketing platform.

## Requirements

- Python 3.11+
- PostgreSQL 15+

## Setup

```bash
# Create and activate virtual environment
python -m venv venv
source venv/bin/activate        # Linux / Mac
venv\Scripts\activate           # Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment (copy and fill in your values)
cp .env.secrets.example .env
```

## Running the app

```bash
uvicorn main:app --reload
```

API available at `http://localhost:8000`. Interactive docs at `/docs`.

## Running tests

```bash
pytest
# With HTML report
pytest --html=test-results.html --self-contained-html
```

Tests use SQLite in-memory by default (`TEST_DB_TYPE=sqlite`). No external DB needed for local runs.

## Updating dependencies

```bash
pip freeze > requirements.txt
```
