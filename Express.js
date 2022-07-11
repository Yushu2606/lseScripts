"use strict";
ll.registerPlugin("Express", "快递", [1, 0, 0]);

const config = new JsonConfigFile("plugins\\Express\\config.json");
const command = config.init("command", "express");
const serviceCharge = config.init("serviceCharge", [0, 3]);
config.close();
mc.listen("onServerStarted", () => {
    const cmd = mc.newCommand(command, "打开快递菜单。", PermType.Any);
    cmd.overload();
    cmd.setCallback((_cmd, ori, out, _res) => {
        if (ori.player) return main(ori.player);
        return out.error("commands.generic.noTargetMatch");
    });
    cmd.setup();
});
function main(pl) {
    const pls = [];
    for (const plget of mc.getOnlinePlayers())
        if (plget.xuid != pl.xuid) pls.push(plget.realName);
    if (pls.length < 1) return pl.tell("§c物品送达失败：暂无可送达用户");
    const iteminfo = [];
    const items = [];
    const inventoryItems = pl.getInventory().getAllItems();
    for (const item of inventoryItems) {
        if (item.isNull()) continue;
        iteminfo.push(
            `[${inventoryItems.indexOf(item)}] ${item.name}§r（${item.type}:${
                item.aux
            }）* ${item.count}`
        );
        items.push(item);
    }
    if (iteminfo.length < 1) return pl.tell("§c物品送达失败：背包为空");
    const fm = mc.newCustomForm();
    fm.setTitle("快递菜单");
    fm.addDropdown("选择送达对象", pls);
    fm.addDropdown("物品", iteminfo);
    fm.addSlider("数量", 1, 64);
    pl.sendForm(fm, (pl, args) => {
        if (!args) return;
        const item = items[args[1]];
        if (item.count < args[2]) return pl.tell("§c物品送达失败：数量不足");
        const level = pl.getLevel();
        const condition = Math.floor(
            serviceCharge[1] + serviceCharge[1] * level * 0.02
        );
        if (level < condition) {
            pl.tell(`§c物品送达失败：余额不足（需要${condition}级经验）`);
            return main(pl);
        }
        const pl1 = mc.getPlayer(pls[args[0]]);
        if (!pl1) return pl.tell(`§c物品送达失败：${pls[args[0]]}已离线`);
        const reduce = Math.round(
            Math.random() * (serviceCharge[0] - condition) + condition
        );
        const itemNbt = item.getNbt();
        const newitem = mc.newItem(itemNbt.setByte("Count", Number(args[2])));
        if (!pl1.getInventory().hasRoomFor(newitem))
            return pl.tell(`§c物品送达失败：${pls[args[0]]}背包已满`);
        pl.addLevel(-reduce);
        if (item.count == args[2]) item.setNull();
        else
            item.setNbt(itemNbt.setByte("Count", Number(item.count - args[2])));
        pl.refreshItems();
        pl1.giveItem(newitem);
        pl.tell(
            `向${pl1.realName}发送物品${item.name}§r * ${args[2]}成功（花费${reduce}级经验）`
        );
        pl1.tell(`${pl.realName}向您发送了物品${item.name}§r * ${args[2]}`);
    });
}
