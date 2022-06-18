"use strict";
ll.registerPlugin("Delivery", "快递", [1, 0, 0]);

const config = new JsonConfigFile("plugins\\Delivery\\config.json");
const command = config.init("command", "delivery");
const serviceCharge = config.init("serviceCharge", [0, 3]);
config.close();
mc.listen("onServerStarted", () => {
    const cmd = mc.newCommand(command, "打开快递菜单。", PermType.Any);
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
    let pls = [];
    for (let pl of mc.getOnlinePlayers()) {
        if (pl.xuid != pl.xuid) {
            pls.push(pl.realName);
        }
    }
    if (pls.length < 1) {
        pl.tell("送达失败：目前没有可送达用户");
        return;
    }
    let itemsmsg = [];
    let items = [];
    let inventoryItems = pl.getInventory().getAllItems();
    for (let item of inventoryItems) {
        if (item.isNull()) continue;
        itemsmsg.push(
            `[${inventoryItems.indexOf(item)}] ${item.name}§r（${item.type}:${
                item.aux
            }）* ${item.count}`
        );
        items.push(item);
    }
    if (itemsmsg.length < 1) {
        pl.tell("送达失败：背包为空");
        return;
    }
    let fm = mc.newCustomForm();
    fm.setTitle("快递菜单");
    fm.addDropdown("选择送达对象", pls);
    fm.addDropdown("物品", itemsmsg);
    fm.addSlider("数量", 1, 64);
    pl.sendForm(fm, (_, args) => {
        if (!args) {
            return;
        }
        let item = items[args[1]];
        if (item.count < args[2]) {
            pl.tell("送达失败：数量不足");
            return;
        }
        let level = pl.getLevel();
        const condition = Math.floor(
            serviceCharge[1] + serviceCharge[1] * level * 0.1
        );
        if (level < condition) {
            pl.tell(`送达失败：余额不足（需要${condition}级经验）`);
            main(pl);
            return;
        }
        let pl1 = mc.getPlayer(pls[args[0]]);
        if (!pl1) {
            pl.tell(`送达失败：${pls[args[0]]}已离线`);
            return;
        }
        let reduce = Math.round(
            Math.random() * (serviceCharge[0] - condition) + condition
        );
        let itemNbt = item.getNbt();
        let newitem = mc.newItem(itemNbt.setByte("Count", Number(args[2])));
        if (!pl1.hasRoomFor(newitem)) {
            pl.tell(`送达失败：${pls[args[0]]}背包已满`);
            return;
        }
        pl.addLevel(-reduce);
        if (item.count == args[2]) item.setNull();
        else
            item.setNbt(itemNBT.setByte("Count", Number(item.count - args[2])));
        pl.refreshItems();
        pl1.giveItem(newitem);
        pl.tell(
            `成功向${pl.realName}发送物品${item.name} * ${args[2]}（花费您${reduce}级经验）`
        );
        pl.tell(`${pl.realName}向您发送了物品${item.name} * ${args[2]}`);
    });
}
