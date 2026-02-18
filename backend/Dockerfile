FROM python:3.11-slim

WORKDIR /app

# 依存関係インストール
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# アプリケーションコードをコピー
COPY . .

# ポート公開
EXPOSE 8000

# 起動コマンド（Render用：PORT環境変数を使用）
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
