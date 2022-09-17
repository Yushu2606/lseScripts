"use strict";
ll.registerPlugin("RecycleShop", "回收商店", [1, 0, 0]);

const config = new JsonConfigFile("plugins\\RecycleShop\\config.json");
const command = config.init("command", "recycleshop");
const serviceCharge = config.init("serviceCharge", 0.02);
const currencyType = config.init("currencyType", "llmoney");
const currencyName = config.init("currencyName", "元");
const eco = (() => {
    switch (currencyType) {
        case "llmoney":
            return {
                add: (pl, m) => money.add(pl.xuid, m),
                reduce: (pl, m) => money.reduce(pl.xuid, m),
                get: (pl) => money.get(pl.xuid),
                name: currencyName,
            };
        case "scoreboard":
            const scoreboard = config.init("scoreboard", "money");
            return {
                add: (pl, money) => pl.addScore(scoreboard, money),
                reduce: (pl, money) => pl.reduceScore(scoreboard, money),
                get: (pl) => pl.getScore(scoreboard),
                name: currencyName,
            };
        case "exp":
            return {
                add: (pl, money) => pl.addExperience(money),
                reduce: (pl, money, isLv) =>
                    isLv ? pl.reduceLevel(money) : pl.reduceExperience(money),
                get: (pl) => pl.getTotalExperience(),
                name: "经验值",
            };
        default:
            throw "配置项异常！";
    }
})();
config.close();
const db = new JsonConfigFile("plugins\\RecycleShop\\data.json");
const recycle = db.init("recycle", []);
db.close();
mc.listen("onServerStarted", () => {
    const cmd = mc.newCommand(command, "打开回收商店。", PermType.Any);
    cmd.overload();
    cmd.setCallback((_cmd, ori, out, _res) => {
        if (ori.player) return main(ori.player);
        return out.error("commands.generic.noTargetMatch");
    });
    cmd.setup();
});
function main(pl) {
    const fm = mc.newSimpleForm();
    fm.setTitle("回收商店");
    for (const item of recycle)
        fm.addButton(`${item.name}\n${item.price}${eco.name}/个`, item.icon);
    pl.sendForm(fm, (pl, arg) => {
        if (arg == null) return;
        const it = recycle[arg];
        let count = 0;
        for (const item of pl.getInventory().getAllItems()) {
            if (
                item.type != it.id ||
                (it.dataValues && item.aux != it.dataValues)
            )
                continue;
            count += item.count;
        }
        if (count < 1) {
            pl.tell(`§c物品${it.name}回收失败：数量不足`);
            return main(pl);
        }
        confirm(pl, it, count);
    });
}
function confirm(pl, itemData, count) {
    const fm = mc.newCustomForm();
    fm.setTitle("回收确认");
    fm.addLabel(`物品名：${itemData.name}`);
    fm.addLabel(`回收价：${itemData.price}/个`);
    fm.addLabel(`当前税率：${serviceCharge * 100}％`);
    fm.addSlider("选择回收数量", 1, count);
    pl.sendForm(fm, (pl, args) => {
        if (!args) return main(pl);
        const its = pl.getInventory().getAllItems();
        let count = 0;
        for (const item of its) {
            if (
                item.type != itemData.id ||
                (itemData.dataValues && item.aux != itemData.dataValues)
            )
                continue;
            count += item.count;
        }
        if (count < args[3]) {
            pl.tell(
                `§c物品${itemData.name}回收失败：数量不足（只有${count}个）`
            );
            return main(pl);
        }
        let buyCount = args[3];
        for (const item of its) {
            if (buyCount < 1) break;
            if (
                item.type != itemData.id ||
                (itemData.dataValues && item.aux != itemData.dataValues)
            )
                continue;
            if ((buyCount -= item.count) < 0)
                item.setNbt(item.getNbt().setByte("Count", Math.abs(buyCount)));
            else item.setNull();
            pl.refreshItems();
        }
        const add = Math.round(args[3] * itemData.price * (1 - serviceCharge));
        eco.add(pl, add);
        pl.tell(
            `物品${itemData.name} * ${args[3]}回收成功（获得${add}${eco.name}）`
        );
        main(pl);
    });
}
