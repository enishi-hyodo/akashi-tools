// require
const { program } = require('commander');
const dayjs = require('dayjs');
const duration = require('dayjs/plugin/duration');
dayjs.extend(duration);
const { getStaffInfo, getKosu, insertKosu } = require('./commands');
///////////////////////////////////////////////////////////////////////////////
function main() {
  // バージョン情報
  program.version('1.0.0', '-v, --version');

  // 従業員情報取得
  program
    .command('get-staffinfo')
    .description('get staff information by token.')
    .action(() => {
      getStaffInfo();
    });

  // 工数取得
  program
    .command('get-kosu [targetMonth]')
    .description('get kosu of the month.')
    .action(targetMonth => {
      targetMonth = targetMonth ? dayjs(targetMonth) : dayjs();
      getKosu(targetMonth);
    });

  // 工数入力
  program
    .command('insert-kosu [targetMonth]')
    .description('insert kosu')
    .action(targetMonth => {
      targetMonth = targetMonth ? dayjs(targetMonth) : dayjs();
      insertKosu(targetMonth);
    });

  program.parse(process.argv);
}

main();
