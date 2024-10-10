// require
const dotenv = require("dotenv");
const axios = require("axios");

// .env読み込み
dotenv.config();
const COMPANY_ID = process.env.COMPANY_ID;
const TOKEN = process.env.API_TOKEN;

// その他定数
const ENDPOINT = "https://atnd.ak4.jp/api/cooperation/";
const API = {
  staffs: "staffs",
};

/**
 * トークンから従業員情報取得
 */
function getStaffInfo() {
  axios
    .get(_getApiUrl(API.staffs), {
      params: {
        token: TOKEN,
        target: TOKEN,
      },
    })
    .then((response) => {
      console.dir(response.data.response, { depth: null });
    })
    .catch((error) => {
      console.error("Error:", error);
    });
}

/**
 * APIのURLを取得する
 */
function _getApiUrl(api) {
  return ENDPOINT + COMPANY_ID + "/" + api;
}

module.exports = {
  getStaffInfo,
};
