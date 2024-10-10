// require
const { program } = require("commander");
const { getStaffInfo, getKosu } = require("./commands");

/**
 * メイン処理
 */
function main() {
  // バージョン情報
  program.version("1.0.0", "-v, --version");

  // 従業員情報取得
  program
    .command("get-staff")
    .description("get staff information by token.")
    .action(() => {
      getStaffInfo();
    });

  // 工数取得
  program
    .command("get-kosu")
    .description("get kosu of the month.")
    .action(() => {
      getKosu();
    });

  program.parse(process.argv);
}

main();
