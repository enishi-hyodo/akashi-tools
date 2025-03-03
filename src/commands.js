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
  _validateDotEnv(['COMPANY_ID', 'API_TOKEN']);

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
async function getKosu(targetMonth) {
  try {
    const manhours = await _getManhours(targetMonth);
    console.dir(manhours, { depth: null });
  } catch (error) {
    console.error('Error:', error);
  }
}

/**
 * 工数入力
 * NOTE: 他タスクの工数が入力されていても削除されず、残りの未入力時間を.envで指定したタスクで埋める。
 *       最初は他タスクを削除して指定タスクで上書きする/しないをオプションで分けていたが、
 *       上書きするとデータがおかしくなるみたいなのでやめた。
 *       (上書きすると、他タスクは各日からは消えるが、グラフ上には残ってしまう。
 *       多分、各日ごとの工数と各タスクごとの工数は別々のデータとして保持しているのだと思う。)
 */
async function insertKosu(targetMonth) {
  try {
    // .envのcheck
    _validateDotEnv(['COMPANY_ID', 'API_TOKEN', 'STAFF_ID', 'PROJECT_ID', 'TASK_ID']);

    const startDate = targetMonth.startOf('month').format('YYYYMMDD');
    const endDate = targetMonth.endOf('month').format('YYYYMMDD');

    let confirmMessage = targetMonth.format('YYYY年MM月') + 'について、';
    // TODO: ↓プロジェクト名、タスク名で表示したい。が、プロジェクト情報APIは権限がないと実行できないっぽいので無理かも...
    confirmMessage += `PROJECT_ID=${PROJECT_ID}, TASK_ID=${TASK_ID}で工数を入力します。\n`;
    confirmMessage += '入力済の工数を消さずに、上記タスクの工数を追加します。\n';
    confirmMessage += '工数入力を実行しますか？';
    // 実行するかをconfirm
    if (!(await _confirm(confirmMessage))) {
      console.log('\n工数入力を中止しました。');
      return;
    }

    // 勤務実績取得
    const workingRecordsResponse = await axios.get(_getApiUrl(API.working_records), {
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
    const workingRecords = workingRecordsResponse.data.response[0].working_records;

    // 入力済の工数を取得
    const currentManhours = await _getManhours(targetMonth);

    // 工数の配列
    let manhours = [];

    // 工数削除処理を入れる配列。Promise.all()でまとめて実行。
    let deleteApis = [];

    // 勤務日ごとに処理
    workingRecords.forEach(workingRecord => {
      if (!workingRecord.actual_working_hours_no_rounding) {
        // 実働時間がない場合何もしない
        return;
      }

      // NOTE: 実働時間(actual_working_hours_no_rounding)を使用すると、
      //       外出ありとかの場合に1分ずれたりするので、開始時刻、終了時刻、休憩時間から計算する
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

      let otherProjects = [];
      let otherTasks = [];
      let otherTaskComments = [];
      // prettier-ignore
      const currentManhour = currentManhours
          ? currentManhours.find(m => dayjs(m.date).isSame(dayjs(workingRecord.date)))
          : null;

      // 他プロジェクト
      if (currentManhour) {
        otherProjects = currentManhour.projects.filter(p => p.project_id !== PROJECT_ID);
        otherProjects = otherProjects.map(p => {
          return {
            project_id: p.project_id,
            daily_hour_items: p.daily_hour_items.map(item => {
              // 他プロジェクトの分の時間を引く
              workingMinutes = workingMinutes - Number(item.minute);
              return {
                task_id: Number(item.task_id),
                minute: Number(item.minute),
              };
            }),
            daily_comment_items: p.daily_comment_items.map(item => {
              return {
                task_id: Number(item.task_id),
                comment: item.comment, // TODO: 何故か登録できない
              };
            }),
          };
        });
      }

      // 同プロジェクトの他タスク
      const project = currentManhour?.projects?.find(p => p.project_id === PROJECT_ID);
      if (project) {
        otherTasks = project.daily_hour_items.filter(t => Number(t.task_id) !== TASK_ID);
        otherTasks = otherTasks.map(t => {
          // 他タスクの分の時間を引く
          workingMinutes = workingMinutes - Number(t.minute);
          return {
            task_id: Number(t.task_id),
            minute: Number(t.minute),
          };
        });
        otherTaskComments = project.daily_comment_items.map(c => {
          return {
            task_id: Number(c.task_id),
            comment: c.comment, // TODO: 要動作確認
          };
        });
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
              // 他タスク
              ...otherTasks,
            ],
            daily_comment_items: otherTaskComments,
          },
          // 他プロジェクト
          ...otherProjects,
        ],
      });

      // 他プロジェクトの工数削除
      // NOTE: 何故か一回削除してから入れ直さないとちゃんと入らない
      if (otherProjects.length > 0) {
        otherProjects.forEach(p => {
          p.daily_hour_items.forEach(item => {
            deleteApis.push(
              (async () => {
                await axios.delete(_getApiUrl(API.manhours, STAFF_ID), {
                  data: {
                    token: TOKEN,
                    date: dayjs(workingRecord.date).format('YYYYMMDD'),
                    project_id: p.project_id,
                    task_id: item.task_id,
                  },
                });
              })()
            );
          });
        });
      }
    });

    // 他プロジェクトの工数削除を実行
    await Promise.all(deleteApis);

    // 工数入力
    await axios.post(_getApiUrl(API.manhours), {
      token: TOKEN,
      manhours: [
        {
          staff_id: STAFF_ID,
          dates: manhours,
        },
      ],
    });

    console.log(`\n${targetMonth.format('YYYY年MM月')}の工数入力が完了しました。`);
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
function _getApiUrl(api, id = '') {
  return id ? `${ENDPOINT}/${COMPANY_ID}/${api}/${id}` : `${ENDPOINT}/${COMPANY_ID}/${api}`;
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
 */
function _validateDotEnv(envs) {
  let emptyEnvs = [];

  envs.forEach(env => {
    if (!process.env[env]) {
      emptyEnvs.push(env);
    }
  });

  if (emptyEnvs.length > 0) {
    throw new Error(`\x1b[31m.envに${emptyEnvs.join(', ')}が設定されていません。\x1b[0m`);
  }
}

async function _getManhours(targetMonth) {
  // .envのcheck
  _validateDotEnv(['COMPANY_ID', 'API_TOKEN', 'STAFF_ID']);

  const startDate = targetMonth.startOf('month').format('YYYYMMDDHHmmss');
  const endDate = targetMonth.endOf('month').format('YYYYMMDDHHmmss');

  const manhours = await axios.get(_getApiUrl(API.manhours, STAFF_ID), {
    params: {
      token: TOKEN,
      start_date: startDate,
      end_date: endDate,
    },
  });
  return manhours.data.response.manhours.length ? manhours.data.response.manhours[0].dates : null;
}
///////////////////////////////////////////////////////////////////////////////
// export
///////////////////////////////////////////////////////////////////////////////
module.exports = {
  getStaffInfo,
  getKosu,
  insertKosu,
};
