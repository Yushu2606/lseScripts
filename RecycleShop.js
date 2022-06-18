"use strict";
ll.registerPlugin("RecycleShop", "回收商店", [1, 0, 0]);

const config = new JsonConfigFile("plugins\\RecycleShop\\config.json");
const command = config.init("command", "recycleshop");
const serviceCharge = config.init("serviceCharge", 0.05);
config.close();
const db = new JsonConfigFile("plugins\\RecycleShop\\data.json");
const recycle = db.init("recycle", []);
db.close();
mc.listen("onServerStarted", () => {
    const cmd = mc.newCommand(command, "打开回收商店菜单。", PermType.Any);
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
    let fm = mc.newSimpleForm();
    fm.setTitle(`回收商店`);
    for (let item of recycle)
        fm.addButton(`${item.name}\n${item.price}经验值/个`, item.icon);
    pl.sendForm(fm, (_, arg) => {
        if (arg == null) return;
        const it = recycle[arg];
        let count = 0;
        for (let item of pl.getInventory().getAllItems())
            if (item.type == it.id) count += item.count;
        if (count < 1) {
            pl.tell("回收失败：物品不足");
            return;
        }
        confirm(pl, it, count);
    });
}
function confirm(pl, itemData, count) {
    let fm = mc.newCustomForm();
    fm.setTitle("回收确认");
    fm.addLabel(`物品名：${itemData.name}`);
    fm.addLabel(`回收价：${itemData.price}/个`);
    fm.addLabel(`当前税率：${serviceCharge * 100}％`);
    fm.addSlider("选择回收数量", 1, count);
    pl.sendForm(fm, (_, args) => {
        if (!args) {
            main(pl);
            return;
        }
        const inv = pl.getInventory();
        let count = 0;
        for (let item of inv.getAllItems()) {
            if (item.type != itemData.id) continue;
            count += item.count;
        }
        if (count < args[3]) {
            pl.tell("回收失败：物品不足");
            return;
        }
        const its = inv.getAllItems();
        let count2 = args[3];
        for (let item of its) {
            if (count2 < 1 || item.type != itemData.id) continue;
            count2 -= item.count;
            if (count2 < 0)
                item.setNbt(item.getNbt().setByte("Count", Math.abs(count2)));
            else item.setNull();
        }
        const add = Math.round(args[3] * itemData.price * (1 - serviceCharge));
        pl.addExperience(add);
        pl.refreshItems();
        pl.tell(
            `回收${itemData.name} * ${args[3]}成功，获得${
                args[3] * itemData.price
            }经验值（实际获得${add}经验值）`
        );
    });
}
