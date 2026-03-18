FROM python:3.12-slim

# Indian font packages — needed so pdf2docx/PyMuPDF can correctly map
# fonts when the PDF references system fonts rather than embedding them
RUN apt-get update && apt-get install -y --no-install-recommends \
    fonts-guru fonts-guru-extra \
    fonts-deva fonts-deva-extra \
    fonts-beng fonts-beng-extra \
    fonts-taml \
    fonts-telu \
    fonts-knda \
    fonts-mlym \
    fonts-gujr \
    fonts-orya \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
