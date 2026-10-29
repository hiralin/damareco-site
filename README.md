# damareco.com

ダマレコ / DamaReco の公式サイト。GitHub Pages（`main` の直下）で https://damareco.com に公開しています。

| ファイル | 内容 |
| --- | --- |
| `index.html` | LP（日本語） |
| `en/index.html` | LP（英語） |
| `support.html` / `privacy.html` | サポート、プライバシーポリシー（アプリとApp Storeからリンク） |
| `assets/lp.css`, `assets/lp.js` | LPの見た目と、ヒーローのRECの時計 |
| `assets/img/screens/{ja,en}/` | アプリの実画面（6.0.0のApp Store画像と同じキャプチャ）。360px・720pxのWebP |
| `assets/img/og-{ja,en}.jpg` | SNSで共有したときの画像（1200×630） |
| `CNAME` | 独自ドメイン。消すと公開先が外れます |

## 更新の流れ

1. ブランチを切ってHTMLを直す。
2. 手元で確認する：`python3 -m http.server 8000` を実行して http://localhost:8000 を開く。
3. Pull Requestを作り、`main` にマージすると1〜2分で公開されます。

LPの文言は、公開中のアプリで成り立つことだけを書きます。新しい機能はApp Storeで配布されてから載せ、日本語と英語の両方を直してください。色はブランドのトークン（`assets/lp.css` の先頭）だけを使い、赤 `#FF3B40` は録画の点とけん玉の玉にだけ使います。
