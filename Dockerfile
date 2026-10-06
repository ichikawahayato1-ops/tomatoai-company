FROM python:3.12-slim
WORKDIR /app
COPY server.py ai_company.py index.html *.js style.css ./
COPY assets ./assets
RUN useradd -m toma && mkdir /app/data && chown toma:toma /app/data
USER toma
ENV HOST=0.0.0.0 PORT=3000 DATABASE_PATH=/app/data/company.sqlite3
EXPOSE 3000
CMD ["python3", "server.py"]
