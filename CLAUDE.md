# IndicConvert

Indian language PDF-to-Word converter using LibreOffice headless.

## Project Structure

- `app/` — FastAPI backend (main.py, converter.py, detector.py, cleanup.py)
- `static/` — CSS and JS (vanilla, no build step)
- `templates/` — Jinja2 HTML template
- `tests/` — pytest tests (detector tests run locally, converter tests need Docker)

## Development

```bash
docker compose up --build    # Start app at localhost:8000
docker compose run --rm app pytest  # Run tests in container
```

## Key Design Decisions

- LibreOffice runs inside Docker with Indian font packages installed
- Script detection uses Unicode block analysis (no ML dependencies)
- Zero data retention: files deleted after download, cleanup every 15 min
- Single container, monolithic Python app (FastAPI + static files)
- Writer PDF import filter used for best Indian language text preservation
