# 概要

Akashi用のツール類。  
(と言っても、今は工数入力のみだし、今後増える予定もない。)

# 準備

## インストール

- 必要なパッケージをインストール

```sh
npm install
```

- PATHを通す

```sh
export PATH=$PATH:<インストールフォルダ>/bin
```

## .envを埋める  

.env.exampleを参照。

```sh
# 企業ID: ログイン時に入力しているやつ
COMPANY_ID=
# APIトークン: マイページ > APIトークンから発行できるが、一般ユーザは管理者から許可がないと発行できない
API_TOKEN=

# 従業員ID: 従業員番号とは違う。APIを叩いて取得するしかない。以下で取得できる。
# > akashi-tools staff
STAFF_ID=

# プロジェクトIDとタスクID:
# ・工数入力ダイアログをデベロッパーツールで開いて要素を見るとそれっぽい数値がidとかclassに入ってるので頑張って見つける。
# ・それか、入力済の工数をAPIで取得すると分かる。
# > akashi-tools get-kosu # 何故か月指定できず、今月分しか見れないので、今月分を一箇所入力してみてからAPI叩くと良い。
PROJECT_ID=
TASK_ID=
```

# 使い方

- 工数入力  
指定した月の工数を、.envで指定したタスクで入力する。

```sh
# 引数なしはその月がデフォルトで指定される
akashi-tools insert-kosu
# 2024/10を指定
akashi-tools insert-kosu 202410
```
