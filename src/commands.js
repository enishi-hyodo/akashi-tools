// require
const dotenv = require("dotenv");
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
 * トークンから従業員情報取得
 */
function getStaffInfo() {
  axios
    .get(_getApiUrl(_api.staffs), {
      params: {
        token: token,
        target: token,
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
  return _endpoint + companyId + "/" + api;
}

module.exports = {
  getStaffInfo,
};
