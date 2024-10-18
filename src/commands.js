// require
const dotenv = require('dotenv');
const axios = require('axios');
const dayjs = require('dayjs');
const duration = require('dayjs/plugin/duration');
dayjs.extend(duration);
const readline = require('readline/promises');

// .env読み込み
dotenv.config();
const COMPANY_ID = process.env.COMPANY_ID;
const TOKEN = process.env.API_TOKEN;
const STAFF_ID = process.env.STAFF_ID;
const PROJECT_ID = Number(process.env.PROJECT_ID);
const TASK_ID = Number(process.env.TASK_ID);

// その他定数
// APIエンドポイント
const ENDPOINT = 'https://atnd.ak4.jp/api/cooperation';
// APIのURL
const API = {
  staffs: 'staffs',
  manhours: 'manhours',
  working_records: 'working_records',
};
// 1時間休憩が発生する労働時のしきい値
const ONE_HOUR_BREAKTIME_THRESHOLD = 7;
///////////////////////////////////////////////////////////////////////////////
// exportする関数
///////////////////////////////////////////////////////////////////////////////
/**
 * トークンから従業員情報取得
 */
function getStaffInfo() {
  // .envのcheck
  if (!_validateDotEnv(['COMPANY_ID', 'API_TOKEN'])) {
    return;
  }

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
  // .envのcheck
  if (!_validateDotEnv(['COMPANY_ID', 'API_TOKEN', 'STAFF_ID'])) {
    return;
  }

  try {
    const kosu = await axios.get(`${_getApiUrl(API.manhours)}/${STAFF_ID}`, {
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
  // .envのcheck
  if (!_validateDotEnv(['COMPANY_ID', 'API_TOKEN', 'STAFF_ID', 'PROJECT_ID', 'TASK_ID'])) {
    return;
  }

  const startDate = targetMonth.startOf('month').format('YYYYMMDD');
  const endDate = targetMonth.endOf('month').format('YYYYMMDD');
  const confirmMessage = targetMonth.format('YYYY/MM') + 'の工数を入力しますか？';

  // 実行するかをconfirm
  if (!(await _confirm(confirmMessage))) {
    console.log('工数入力を中止しました。');
    return;
  }

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

      // 休憩・外出時間を引く
      if (workingRecord.break_time_results) {
        workingRecord.break_time_results.forEach(breakTime => {
          const breakStart = dayjs(breakTime.rounded_break_time_start_time);
          const breakEnd = dayjs(breakTime.rounded_break_time_end_time);
          workingMinutes = workingMinutes - dayjs.duration(breakEnd.diff(breakStart)).asMinutes();
        });
      }

      // 1時間休憩
      if (workingMinutes >= 60 * (ONE_HOUR_BREAKTIME_THRESHOLD - 1) && workingMinutes < 60 * ONE_HOUR_BREAKTIME_THRESHOLD) {
        // 6時間以上7時間未満なら労働時間は6時間
        workingMinutes = 60 * 6;
      } else if (workingMinutes >= 60 * ONE_HOUR_BREAKTIME_THRESHOLD) {
        // 7時間以上なら、1時間休憩を引く
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
    await axios.post(_getApiUrl(API.manhours), {
      token: TOKEN,
      manhours: [
        {
          staff_id: STAFF_ID,
          dates: manhours,
        },
      ],
    });

    console.log('');
    console.log(targetMonth.format('YYYY/MM') + 'の工数入力が完了しました。');
    console.log('工数入力画面から確認してください。');
  } catch (error) {
    console.error('Error:', error);
  }
}
///////////////////////////////////////////////////////////////////////////////
// private
///////////////////////////////////////////////////////////////////////////////
/**
 * APIのURLを取得する
 */
function _getApiUrl(api) {
  return `${ENDPOINT}/${COMPANY_ID}/${api}`;
}

/**
 * confirm用関数
 */
async function _confirm(message) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const answer = await rl.question(`${message} (y/n): `);
    return answer.toLowerCase() === 'y';
  } catch (error) {
    console.error('Error:', error);
  } finally {
    rl.close();
  }
}

/**
 * 指定した環境変数が設定されているかを確認する
 *
 * @param {string[]} envs チェック対象の環境変数名の配列
 * @return {boolean} 環境変数が設定されているか
 */
function _validateDotEnv(envs) {
  let valid = true;

  envs.forEach(env => {
    if (!process.env[env]) {
      console.error(`.envに${env}が設定されていません。`);
      valid = false;
      return;
    }
  });

  return valid;
}
///////////////////////////////////////////////////////////////////////////////
// export
///////////////////////////////////////////////////////////////////////////////
module.exports = {
  getStaffInfo,
  getKosu,
  insertKosu,
};
