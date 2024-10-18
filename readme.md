# 概要

Akashi用のツール類。(今は工数入力のみ。)

# 準備

## 必要な環境

- Node.jsが入っていること

## インストール

- ソースをローカルに落とす  
→`git clone`かソースのダウンロード

```sh
# git cloneの場合
git clone https://github.com/enishi-hyodo/akashi-tools
```

- 必要なパッケージをインストール

```sh
cd <インストールディレクトリ>
npm install
```

- PATHを通す

zshなら~/.zshrcに以下を追記。

```sh
export PATH=$PATH:<インストールディレクトリ>/bin
```

※Windowsの場合も同様にPATHを通せばOK。

## .envを作成

.env.exampleコピーして.envを作成し、必要な情報を埋める。  

```sh
# 企業ID: ログイン時に入力しているやつ
COMPANY_ID=
# APIトークン: マイページ > APIトークンから発行できるが、一般ユーザは管理者から許可がないと発行できない
API_TOKEN=

# 従業員ID: 従業員番号とは違う。APIを叩いて取得するしかない。以下で取得できる。
# > akashi-tools get-staffinfo
STAFF_ID=

# プロジェクトIDとタスクID:
# ・工数入力ダイアログをデベロッパーツールで開いて要素を見るとそれっぽい数値がidとかclassに入ってるので頑張って見つける。
# ・それか、入力済の工数をAPIで取得すると分かる。
# > akashi-tools get-kosu YYYYMM
PROJECT_ID=
TASK_ID=
```

## 試し実行

DBに書き込みをしない読み込みのみの操作で試し実行をしたい場合は以下が良い。

```sh
# 自分の従業員情報を表示する
# .envのCOMPANY_ID, API_TOKENだけ設定していれば動く
akashi-tools get-staffinfo
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

