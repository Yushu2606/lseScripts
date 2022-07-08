"use strict";
ll.registerPlugin("Transfer", "转账", [1, 0, 0]);

const config = new JsonConfigFile("plugins\\Transfer\\config.json");
const command = config.init("command", "transfer");
const rate = config.init("rate", 0.98);
config.close();
mc.listen("onServerStarted", () => {
    const cmd = mc.newCommand(command, "打开转账菜单。", PermType.Any);
    cmd.overload();
    cmd.setCallback((_cmd, ori, out, _res) => {
        if (ori.player) return main(ori.player);
        return out.error("commands.generic.noTargetMatch");
    });
    cmd.setup();
});
function main(pl) {
    let lv = pl.getLevel();
    if (lv < 1) {
        pl.tell("§c转账失败：余额不足");
        return;
    }
    let plls = [];
    for (let pl1 of mc.getOnlinePlayers()) {
        if (pl1.xuid != pl.xuid) {
            plls.push(pl1.realName);
        }
    }
    if (plls.length < 1) {
        pl.tell("§c转账失败：暂无可转账用户");
        return;
    }
    let fm = mc.newCustomForm();
    fm.setTitle("转账菜单");
    fm.addDropdown("选择转账对象", plls);
    fm.addSlider("选择等级经验", 1, lv);
    fm.addLabel(`当前汇率：${rate * 100}％`);
    pl.sendForm(fm, (pl, args) => {
        if (!args) {
            return;
        }
        let plto = mc.getPlayer(plls[args[0]]);
        if (!plto) {
            pl.tell(`§c转账失败：${plls[args[0]]}已离线`);
            return;
        }
        if (args[1] > pl.getLevel()) {
            pl.tell("§c转账失败：经验等级输入错误（余额不足）");
            return;
        }
        pl.addLevel(-args[1]);
        let rlv = Math.round(args[1] * rate);
        plto.addLevel(rlv);
        pl.tell(`成功向${plto.realName}转账${args[1]}级经验`);
        plto.tell(`${pl.realName}向您转账${rlv}级经验`);
    });
}
