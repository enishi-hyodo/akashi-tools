// require
const dotenv = require('dotenv');
const axios = require('axios');
const dayjs = require('dayjs');
const duration = require('dayjs/plugin/duration');
dayjs.extend(duration);

// .env読み込み
dotenv.config();
const COMPANY_ID = process.env.COMPANY_ID;
const TOKEN = process.env.API_TOKEN;
const STAFF_ID = process.env.STAFF_ID;
const PROJECT_ID = Number(process.env.PROJECT_ID);
const TASK_ID = Number(process.env.TASK_ID);

// その他定数
const ENDPOINT = 'https://atnd.ak4.jp/api/cooperation';
const API = {
  staffs: 'staffs',
  manhours: 'manhours',
  working_records: 'working_records',
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
    .then(response => {
      console.dir(response.data.response, { depth: null });
    })
    .catch(error => {
      console.error('Error:', error);
    });
}

/**
 * 工数取得
 */
async function getKosu() {
  try {
    const kosu = await axios.get(_getApiUrl(API.manhours) + '/' + STAFF_ID, {
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
    console.error('Error:', error);
  }
}

/**
 * 工数入力
 */
async function insertKosu(targetMonth) {
  const startDate = targetMonth.startOf('month').format('YYYYMMDD');
  const endDate = targetMonth.endOf('month').format('YYYYMMDD');

  try {
    // 1. 勤務実績取得
    const response = await axios.get(_getApiUrl(API.working_records), {
      params: {
        token: TOKEN,
        start_date: startDate,
        end_date: endDate,
        staff_ids: STAFF_ID,
        include_actual_working_hours_no_rounding: 1,
        include_break_results: 1,
      },
    });

    // 勤怠情報
    const workingRecords = response.data.response[0].working_records;
    // 工数の配列
    let manhours = [];

    // 勤務日ごとに処理
    workingRecords.forEach(workingRecord => {
      if (!workingRecord.actual_working_hours_no_rounding) {
        return;
      }
      // NOTE: 実働時間(actual_working_hours_no_rounding)を使用すると、外出ありとかの場合に1分ずれたりするので、
      //       開始時刻、終了時刻、休憩時間から計算する
      const start = dayjs(workingRecord.rounded_start_time);
      const end = dayjs(workingRecord.rounded_end_time);
      let workingMinutes = dayjs.duration(end.diff(start)).asMinutes();

      // 休憩時間を引く
      if (workingRecord.break_time_results) {
        workingRecord.break_time_results.forEach(breakTime => {
          const breakStart = dayjs(breakTime.rounded_break_time_start_time);
          const breakEnd = dayjs(breakTime.rounded_break_time_end_time);
          workingMinutes = workingMinutes - dayjs.duration(breakEnd.diff(breakStart)).asMinutes();
        });
      }

      // 1時間休憩を引く
      if (workingMinutes >= 60 * 8) {
        // 8時間以上なら休憩1時間を引く
        workingMinutes = workingMinutes - 60;
      }

      // 工数に追加
      manhours.push({
        date: dayjs(workingRecord.date).format('YYYYMMDD'),
        projects: [
          {
            project_id: PROJECT_ID,
            daily_hour_items: [
              {
                task_id: TASK_ID,
                minute: workingMinutes,
              },
            ],
          },
        ],
      });
    });

    // 2. 工数入力
    axios.post(_getApiUrl(API.manhours), {
      token: TOKEN,
      manhours: [
        {
          staff_id: STAFF_ID,
          dates: manhours,
        },
      ],
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

/**
 * APIのURLを取得する
 */
function _getApiUrl(api) {
  return `${ENDPOINT}/${COMPANY_ID}/${api}`;
}

module.exports = {
  getStaffInfo,
  getKosu,
  insertKosu,
};
