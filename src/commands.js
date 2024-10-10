// require
const dotenv = require("dotenv");
const axios = require("axios");

// .env読み込み
dotenv.config();
const COMPANY_ID = process.env.COMPANY_ID;
const TOKEN = process.env.API_TOKEN;
const STAFF_ID = process.env.STAFF_ID;

// その他定数
const ENDPOINT = "https://atnd.ak4.jp/api/cooperation/";
const API = {
  staffs: "staffs",
  manhours: "manhours",
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
 * 工数取得
 */
async function getKosu() {
  try {
    const kosu = await axios.get(_getApiUrl(API.manhours) + "/" + STAFF_ID, {
      params: {
        token: TOKEN,
        // NOTE: 何故か日付を入力するとエラーになる
        // start_date: "20240901",
        // end_date: "20241007",
      },
    });
    console.dir(kosu.data.response.manhours, { depth: null });
    return;
  } catch (error) {
    console.error("Error:", error);
  }
}

/**
 * APIのURLを取得する
 */
function _getApiUrl(api) {
  return ENDPOINT + COMPANY_ID + "/" + api;
}

module.exports = {
  getStaffInfo,
  getKosu,
};
