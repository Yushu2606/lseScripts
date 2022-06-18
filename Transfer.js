"use strict";
ll.registerPlugin("Transfer", "转账", [1, 0, 0]);

const config = new JsonConfigFile("plugins\\Transfer\\config.json");
const command = config.init("command", "transfer");
const serviceCharge = config.init("serviceCharge", 0.05);
const condition = config.init("condition", 7);
config.close();
mc.listen("onServerStarted", () => {
    const cmd = mc.newCommand(command, "打开转账菜单。", PermType.Any);
    cmd.optional("player", ParamType.Player);
    cmd.overload("player");
    cmd.setCallback((_, ori, out, res) => {
        if ((!ori.player || ori.player.isOP()) && res.player) {
            if (res.player.length < 1) {
                out.error("commands.generic.noTargetMatch");
                return;
            }
            for (let pl of res.player) main(pl);
            return;
        }
        if (ori.player) {
            main(ori.player);
            return;
        }
        out.error("commands.generic.noTargetMatch");
    });
    cmd.setup();
});
function main(pl) {
    let level = pl.getLevel();
    if (level < condition) {
        pl.tell(`转账失败：余额不足（需大于${condition}级经验）`);
        return;
    }
    let pls = [];
    for (let pl of mc.getOnlinePlayers()) {
        if (pl.xuid != pl.xuid) {
            pls.push(pl.realName);
        }
    }
    if (pls.length < 1) {
        pl.tell("目前没有可转账玩家");
        return;
    }
    let fm = mc.newCustomForm();
    fm.setTitle("转账菜单");
    fm.addDropdown("选择转账对象", pls);
    fm.addSlider("选择等级经验", 1, level);
    fm.addLabel(`当前汇率：${serviceCharge * 100}％`);
    pl.sendForm(fm, (_, args) => {
        if (!args) {
            return;
        }
        let pl = mc.getPlayer(pls[args[0]]);
        if (!pl) {
            pl.tell(`转账失败：${pls[args[0]]}已离线`);
            return;
        }
        if (isNaN(args[1])) {
            pl.tell(`转账失败：经验等级输入错误（非数字）`);
            return;
        }
        let inp = Math.round(Number(args[1]));
        if (inp < 1) {
            pl.tell(`转账失败：经验等级输入错误（非正）`);
            return;
        }
        if (inp > pl.getLevel()) {
            pl.tell(`转账失败：经验等级输入错误（经验不足）`);
            return;
        }
        pl.addLevel(-inp);
        let rlevel = Math.round(inp * (1 - serviceCharge));
        pl.addLevel(rlevel);
        pl.tell(
            `成功向${pl.realName}转账${inp}级经验（实际到账${rlevel}级经验）`
        );
        pl.tell(
            `${pl.realName}向您转账${inp}级经验（实际到账${rlevel}级经验）`
        );
    });
}
