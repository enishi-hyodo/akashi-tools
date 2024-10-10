// パッケージ読み込み
const dotenv = require("dotenv");
const { program } = require("commander");
const axios = require("axios");

// .env読み込み
dotenv.config();
const companyId = process.env.COMPANY_ID;
const token = process.env.API_TOKEN;

// その他定数
const _endpoint = "https://atnd.ak4.jp/api/cooperation/";
const _api = {
  staffs: "staffs",
};

/**
 * メイン処理
 */
function main() {
  // バージョン情報
  program.version("1.0.0", "-v, --version");

  // 従業員情報取得
  program
    .command("staff")
    .description("get staff info")
    .action(() => {
      getStaffInfo();
    });

  program.parse(process.argv);
}

/**
 * トークンから従業員情報取得
 */
function getStaffInfo() {
  axios
    .get(getUrl(_api.staffs), {
      params: {
        token: token,
        target: token,
      },
    })
    .then((response) => {
      console.log(response.data.response);
    })
    .catch((error) => {
      console.error("Error:", error);
    });
}

/**
 * APIのURLを取得する
 */
function getUrl(api) {
  return _endpoint + companyId + "/" + api;
}

main();
