# Macの既存SNSサーバーへオフィスを追加

既存の `/company` が実装済みのサーバー用。元の設定・Instagram接続を維持する。ZIPは会社画面と読み取り専用ルーターだけで、設定・秘密情報・DB・投稿データは含まない。

1. `app/company_office.py` と `app/company_office_static/` を既存SNS部署の `app/` に追加する。同名ファイルが既にあれば差分を確認して更新する。
2. 既存 `app/main.py` の `create_app` で `return app` の直前に次を追加する。

```python
    from .company_office import router as company_office_router
    app.include_router(company_office_router)
```

3. 既存のWebサービスだけを通常の方法で再起動する。予約スケジューラー・設定・.env・config.pyは変更しない。
4. http://127.0.0.1:8000/office/#toma を開く。

オフィス・TOMAの下に既存 `/company` を同一オリジンのフレームで表示する。投稿の操作・承認・予約・結果は既存SNS部署に任せ、POSTのコピーや自動再送はしない。承認は実公開に至る場合がある。実投稿・有料AI制作は接続テストに使わない。

導入時に `/company` のフレーム表示が既存CSP/X-Frame-Optionsで拒否される場合、セキュリティ設定を緩めず「別タブで開く」を使い、既存設定の同一オリジン許可を確認する。クラウドからMacの動作は確認していない。

TOMAの会話・キャラ状態はまだデモで、SNSデータと同期しない。今回は同じオフィス画面から実SNS操作画面を使う統合。既存データから会社への状態イベント連携は次の工程。
