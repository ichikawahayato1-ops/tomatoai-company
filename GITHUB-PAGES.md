# GitHub Pagesで公開する

このTomato AI Companyフォルダを専用リポジトリのmainブランチに置きます。既存のstock-sorterのコードには混ぜません。
GitHubの Settings → Pages → Source で GitHub Actions を選びます。
mainへのpushまたはActionsからPublish Tomato AI Companyを実行すると、静的な相談室と会社ノートを公開します。
公開URLは成功したPagesの画面またはActionsのgithub-pages環境に表示されます。

画面は誰でもアクセスできるため、依頼に秘密情報を入力しないでください。依頼・履歴は各ブラウザのlocalStorageに保存します。別の端末へは同期しません。AI会話と社員の作業はデモです。サーバー版のAPIやSQLiteはGitHub Pagesでは使いません。

ローカル生成は `python3 scripts/build-pages.py`。公開するのはdistの静的アセットのみです。データベース、サーバー、認証情報、生成途中の素材は含めません。
