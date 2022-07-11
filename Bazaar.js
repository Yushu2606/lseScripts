"use strict";
ll.registerPlugin("Bazaar", "物品集市", [1, 0, 0]);

const config = new JsonConfigFile("plugins\\Bazaar\\config.json");
const command = config.init("command", "bazaar");
const initialFunding = config.init("initialFunding", 7);
const serviceCharge = config.init("serviceCharge", 0.02);
const currencyType = config.init("currencyType", "llmoney");
const currencyName = config.init("currencyName", "货币");
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
        case "xplevel":
            return {
                add: (pl, money) => pl.addLevel(money),
                reduce: (pl, money) => pl.addLevel(-money),
                get: (pl) => pl.getLevel(),
                name: "级经验",
            };
        default:
            throw "配置项异常！";
    }
})();
config.close();
const db = new KVDatabase("plugins\\Bazaar\\data");
mc.listen("onServerStarted", () => {
    const cmd = mc.newCommand(command, "打开物品集市。", PermType.Any);
    cmd.overload();
    cmd.setCallback((_cmd, ori, out, _res) => {
        if (ori.player) return main(ori.player);
        return out.error("commands.generic.noTargetMatch");
    });
    cmd.setup();
});
mc.listen("onJoin", (pl) => {
    const shop = db.get(pl.xuid);
    if (!shop || shop.pending.length < 1) return;
    while (shop.pending.length > 0) {
        const history = shop.pending.shift();
        const get = Math.round(
            history.count * history.item.price * (1 - history.serviceCharge)
        );
        eco.add(pl, get);
        shop.history.push(history);
        pl.tell(
            `${data.xuid2name(history.buyer)}于${history.time}购买了${
                history.item.name
            }§r * ${history.count}（您获得了${get}${eco.name}）`
        );
    }
    db.set(pl.xuid, shop);
});
function main(pl) {
    const fm = mc.newSimpleForm();
    fm.setTitle("物品集市");
    const list = [];
    fm.addButton(db.get(pl.xuid) ? "管理店铺" : "创建店铺");
    for (const owner of db.listKey()) {
        if (owner == pl.xuid) continue;
        const shop = db.get(owner);
        if (Object.keys(shop.items).length < 1) continue;
        else list.push(owner);
        fm.addButton(
            `${shop.name}§r\n店主：${data.xuid2name(owner)}`,
            shop.icon
        );
    }
    pl.sendForm(fm, (pl, arg) => {
        if (arg == 0) {
            if (db.get(pl.xuid)) return shopManagement(pl);
            if (eco.get(pl) < initialFunding) {
                pl.tell(
                    `§c店铺创建失败：余额不足（需要${initialFunding}${eco.name}）`
                );
                return main(pl);
            }
            return createShop(pl);
        }
        if (arg != null) itemList(pl, list[arg - 1]);
    });
}
function createShop(pl) {
    const fm = mc.newCustomForm();
    fm.setTitle("创建店铺");
    fm.addLabel(`将花费${initialFunding}${eco.name}创建店铺`);
    fm.addInput("店铺名称", "字符串（可空）");
    fm.addInput("店铺简介", "字符串（可空）");
    fm.addInput("店铺标志", "字符串（可空）");
    pl.sendForm(fm, (pl, args) => {
        if (!args) return main(pl);
        if (eco.get(pl) < initialFunding) {
            pl.tell(
                `§c店铺${args[1]}创建失败：余额不足（需要${initialFunding}${eco.name}）`
            );
            return main(pl);
        }
        eco.reduce(pl, initialFunding);
        db.set(pl.xuid, {
            owner: pl.xuid,
            guid: system.randomGuid(),
            name: args[1],
            createTime: system.getTimeStr(),
            intro: args[2],
            icon: args[3],
            items: {},
            history: [],
            pending: [],
        });
        pl.tell(`店铺${args[1]}创建成功`);
        main(pl);
    });
}
function shopManagement(pl) {
    const fm = mc.newSimpleForm();
    const shop = db.get(pl.xuid);
    fm.setTitle(shop.name);
    fm.setContent(
        `${shop.intro}§r\n目前在售物品数：${
            Object.keys(shop.items).length
        }个\n交易次数：${
            shop.history.length + shop.pending.length
        }次\n创建时间：${shop.createTime}\n当前税率：${serviceCharge * 100}％`
    );
    fm.addButton("信息设置");
    fm.addButton("物品管理");
    fm.addButton("查看历史纪录");
    fm.addButton(`${shop.name}§r\n-- 预览模式 -- `, shop.icon);
    pl.sendForm(fm, (pl, arg) => {
        switch (arg) {
            case 0:
                return shopInfo(pl);
            case 1:
                return shopItem(pl);
            case 2:
                return shopHistroy(pl);
            default:
                main(pl);
        }
    });
}
function itemList(pl, owner) {
    const fm = mc.newSimpleForm();
    const shop = db.get(owner);
    const itemcount = Object.keys(shop.items).length;
    fm.setTitle(shop.name);
    fm.setContent(`${shop.intro}§r\n目前在售物品数：${itemcount}个`);
    if (itemcount > 0)
        for (const item of Object.values(shop.items)) {
            const itemNBT = NBT.parseSNBT(item.snbt);
            fm.addButton(
                `${item.name}§r（${itemNBT.getTag("Name")}） * ${itemNBT.getTag(
                    "Count"
                )}\n价格：${item.price}/个`
            );
        }
    pl.sendForm(fm, (pl, arg) => {
        if (arg == null) return main(pl);
        itemBuy(pl, owner, Object.values(db.get(owner).items)[arg]);
    });
}
function shopInfo(pl) {
    const fm = mc.newCustomForm();
    fm.setTitle("信息设置");
    const shop = db.get(pl.xuid);
    fm.addInput("店铺名称", "字符串（可空）", shop.name);
    fm.addInput("店铺简介", "字符串（可空）", shop.intro);
    fm.addInput("店铺标志", "字符串（可空）", shop.icon);
    pl.sendForm(fm, (pl, args) => {
        if (!args) return shopManagement(pl);
        shop.name = args[0];
        shop.intro = args[1];
        shop.icon = args[2];
        db.set(pl.xuid, shop);
        pl.tell(`店铺${args[0]}信息修改成功`);
        shopManagement(pl);
    });
}
function shopItem(pl) {
    const fm = mc.newSimpleForm();
    fm.addButton("上架物品");
    const shop = db.get(pl.xuid);
    fm.setTitle(shop.name);
    for (const item of Object.values(shop.items)) {
        const itemNBT = NBT.parseSNBT(item.snbt);
        fm.addButton(
            `${item.name}§r（${itemNBT.getTag("Name")}） * ${itemNBT.getTag(
                "Count"
            )}\n价格：${item.price}/个`
        );
    }
    pl.sendForm(fm, (pl, arg) => {
        if (arg == null) return shopManagement(pl);
        switch (arg) {
            case 0:
                return itemUpload(pl);
            default:
                itemManagement(pl, arg);
        }
    });
}
function shopHistroy(pl) {
    const fm = mc.newSimpleForm();
    fm.setTitle("历史记录");
    let content = "";
    for (const historyData of db.get(pl.xuid).history.reverse()) {
        if (content) content += "\n\n";
        content += `购买时间：${historyData.time}\n卖家：${data.xuid2name(
            historyData.buyer
        )}\n物品：${historyData.item.name}§r\n数量：${
            historyData.count
        }\n单价：${historyData.item.price}${eco.name}\n物品NBT：${
            historyData.item.snbt
        }`;
    }
    fm.setContent(content);
    pl.sendForm(fm, shopManagement);
}
function itemBuy(pl, owner, item) {
    const fm = mc.newCustomForm();
    fm.setTitle("购买确认");
    fm.addLabel(`物品名：${item.name}`);
    fm.addLabel(`NBT：${item.snbt}`);
    fm.addLabel(`价格：${item.price}/个`);
    const count = Number(NBT.parseSNBT(item.snbt).getTag("Count"));
    if (count > 1) {
        fm.addSlider("选择购买数量", 1, count);
    } else fm.addLabel("将购买1个");
    pl.sendForm(fm, (pl, args) => {
        if (!args) return itemList(pl, owner);
        const shop = db.get(owner);
        const num = args[3] ?? 1;
        if (!shop.items[item.guid])
            return pl.tell(`§c${item.name}§r * ${num}购买失败：已被买走`);
        const itemNBT = NBT.parseSNBT(shop.items[item.guid].snbt);
        const count = Number(itemNBT.getTag("Count"));
        if (count < num)
            return pl.tell(`§c${item.name}§r * ${num}购买失败：数量过多`);
        const cost = Math.round(num * shop.items[item.guid].price);
        if (cost > eco.get(pl))
            return pl.tell(`§c${item.name}§r * ${num}购买失败：余额不足`);
        const newItem = mc.newItem(itemNBT.setByte("Count", num));
        if (!pl.getInventory().hasRoomFor(newItem))
            return pl.tell(`§c${item.name}§r * ${num}购买失败：背包已满`);
        const history = {
            time: system.getTimeStr(),
            buyer: pl.xuid,
            serviceCharge: serviceCharge,
            item: shop.items[item.guid],
            count: num,
        };
        if (count == num) delete shop.items[item.guid];
        else
            shop.items[item.guid].snbt = itemNBT
                .setByte("Count", count - num)
                .toSNBT();
        eco.reduce(pl, cost);
        pl.giveItem(newItem);
        pl.refreshItems();
        const ownerpl = mc.getPlayer(owner);
        if (ownerpl) {
            const get = Math.round(cost * (1 - serviceCharge));
            eco.add(ownerpl, get);
            shop.history.push(history);
            ownerpl.tell(
                `${pl.realName}于${history.time}购买了${history.item.name}§r * ${num}（您获得了${get}${eco.name}）`
            );
        } else shop.pending.push(history);
        db.set(shop.owner, shop);
        pl.tell(
            `${history.item.name}§r * ${num}购买成功（花费${cost}${eco.name}）`
        );
    });
}
function itemUpload(pl) {
    const itemsmsg = [];
    const items = [];
    const inventoryItems = pl.getInventory().getAllItems();
    for (const item of inventoryItems) {
        if (item.isNull()) continue;
        itemsmsg.push(
            `[${inventoryItems.indexOf(item)}] ${item.name}§r（${item.type}:${
                item.aux
            }）* ${item.count}`
        );
        items.push(item);
    }
    const fm = mc.newCustomForm();
    if (itemsmsg.length < 1) {
        pl.tell("§c物品上架失败：背包为空");
        shopItem(pl);
        return;
    }
    fm.setTitle("上架物品");
    fm.addDropdown("物品", itemsmsg);
    fm.addInput("物品名称", "字符串（可空）");
    fm.addInput("物品单价", "数字");
    fm.addSlider("上架数量", 1, 64);
    pl.sendForm(fm, (pl, args) => {
        if (!args) return shopItem(pl);
        if (isNaN(args[2])) {
            pl.tell(
                `§c物品${args[1]}§r * ${args[3]}上架失败：价格输入错误（非数字）`
            );
            return shopItem(pl);
        }
        if (args[2] <= 0) {
            pl.tell(
                `§c物品${args[1]}§r * ${args[3]}上架失败：价格输入错误（非正数）`
            );
            return shopItem(pl);
        }
        const item = items[args[0]];
        if (item.count < args[3]) {
            pl.tell(`§c物品${args[1]}§r * ${args[3]}上架失败：数量不足`);
            return shopItem(pl);
        }
        const shop = db.get(pl.xuid);
        const itemNBT = item.getNbt();
        const guid = system.randomGuid();
        shop.items[guid] = {
            name: args[1] || item.name,
            guid: guid,
            price: args[2],
            snbt: itemNBT.setByte("Count", Number(args[3])).toSNBT(),
        };
        db.set(pl.xuid, shop);
        if (item.count == args[3]) item.setNull();
        else
            item.setNbt(itemNBT.setByte("Count", Number(item.count - args[3])));
        pl.refreshItems();
        pl.tell(`物品${args[1]}§r * ${args[3]}上架成功`);
        shopItem(pl);
    });
}
function itemManagement(pl, arg) {
    const fm = mc.newCustomForm();
    const item = Object.values(db.get(pl.xuid).items)[arg - 1];
    fm.setTitle(`编辑物品 - ${item.name}`);
    fm.addInput("物品名称", "字符串（可空）", item.name);
    fm.addInput("物品价格", "数字（可空）", item.price);
    const count = Number(NBT.parseSNBT(item.snbt).getTag("Count"));
    fm.addSlider("上架数量", 0, count, 1, count);
    pl.sendForm(fm, (pl, args) => {
        if (!args) {
            shopItem(pl);
            return;
        }
        if (isNaN(args[1] ?? item.price)) {
            pl.tell(
                `§c物品${args[0]}§r * ${args[2]}修改失败：价格输入错误（非数字）`
            );
            shopItem(pl);
            return;
        }
        if ((args[1] ?? item.price) <= 0) {
            pl.tell(
                `§c物品${args[0]}§r * ${args[2]}修改失败：价格输入错误（非正数）`
            );
            shopItem(pl);
            return;
        }
        if (!item) {
            pl.tell(`§c物品${args[0]}§r * ${args[2]}修改失败：已被买走`);
            shopItem(pl);
            return;
        }
        const shop = db.get(pl.xuid);
        const itemNBT = NBT.parseSNBT(shop.items[item.guid].snbt);
        const count = Number(itemNBT.getTag("Count"));
        if (count < args[2]) {
            pl.tell(`§c物品${args[0]}§r * ${args[2]}修改失败：下架过多`);
            shopItem(pl);
            return;
        }
        shop.items[item.guid].name = args[0] || item.name;
        shop.items[item.guid].price = args[1] ?? item.price;
        const wbd = args[2] < 1;
        if (args[2] != count) {
            const it = mc.newItem(itemNBT.setByte("Count", count - args[2]));
            if (!pl.getInventory().hasRoomFor(it)) {
                pl.tell(`§c物品${args[0]}§r * ${args[2]}修改失败：背包已满`);
                return shopItem(pl);
            }
            if (wbd) delete shop.items[item.guid];
            else
                shop.items[item.guid].snbt = itemNBT
                    .setByte("Count", args[2])
                    .toSNBT();
            pl.giveItem(it);
            pl.refreshItems();
        }
        db.set(pl.xuid, shop);
        pl.tell(
            wbd
                ? `物品${args[0]}§r * ${args[2]}修改成功`
                : `物品${args[0]}§r下架成功`
        );
        shopItem(pl);
    });
}
