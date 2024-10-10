// require
const { program } = require("commander");
const { getStaffInfo } = require("./commands");

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

  program.parse(process.argv);
}

main();
