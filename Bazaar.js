"use strict";
ll.registerPlugin("Bazaar", "物品集市", [1, 0, 0]);

const config = new JsonConfigFile("plugins\\Bazaar\\config.json");
const command = config.init("command", "bazaar");
const initialFunding = config.init("initialFunding", 7);
const serviceCharge = config.init("serviceCharge", 0.05);
const currencyType = config.init("currencyType", "llmoney");
let eco = (() => {
    switch (currencyType) {
        case "llmoney":
            return {
                add: (pl, m) => {
                    return money.add(pl.xuid, m);
                },
                reduce: (pl, m) => {
                    return money.reduce(pl.xuid, m);
                },
                get: (pl) => {
                    return money.get(pl.xuid);
                },
                name: config.init("currencyName", "货币"),
            };
        case "scoreboard":
            let scoreboard = config.init("scoreboard", "money");
            return {
                add: (pl, money) => {
                    pl.addScore(scoreboard, money);
                },
                reduce: (pl, money) => {
                    pl.reduceScore(scoreboard, money);
                },
                get: (pl) => {
                    pl.getScore(scoreboard);
                },
                name: mc.getScoreObjective(scoreboard).displayName,
            };
        case "xplevel":
            return {
                add: (pl, money) => {
                    pl.addLevel(money);
                },
                reduce: (pl, money) => {
                    pl.addLevel(-money);
                },
                get: (pl) => {
                    pl.getLevel();
                },
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
    cmd.optional("player", ParamType.Player);
    cmd.overload("player");
    cmd.setCallback((_cmd, ori, out, res) => {
        if ((!ori.player || ori.player.isOP()) && res.player) {
            if (res.player.length < 1) {
                return out.error("commands.generic.noTargetMatch");
            }
            for (let pl of res.player) main(pl);
            return;
        }
        if (ori.player) {
            main(ori.player);
            return;
        }
        return out.error("commands.generic.noTargetMatch");
    });
    cmd.setup();
});
mc.listen("onJoin", (pl) => {
    let shop = db.get(pl.xuid);
    if (!shop || shop.pending.length < 1) return;
    while (shop.pending.length > 0) {
        let history = shop.pending.shift();
        let get = Math.round(
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
    let fm = mc.newSimpleForm();
    fm.setTitle("物品集市");
    let list = [];
    fm.addButton(db.get(pl.xuid) ? "管理店铺" : "创建店铺");
    for (let owner of db.listKey()) {
        if (owner == pl.xuid) continue;
        let shop = db.get(owner);
        if (Object.keys(shop.items).length < 1) continue;
        else list.push(owner);
        fm.addButton(
            `${shop.name}§r\n店主：${data.xuid2name(owner)}`,
            shop.icon
        );
    }
    pl.sendForm(fm, (pl, arg) => {
        if (arg == 0) {
            if (db.get(pl.xuid)) {
                shopManagement(pl);
                return;
            }
            if (eco.get(pl) < initialFunding) {
                pl.tell(
                    `§c店铺创建失败：余额不足（需要${initialFunding}${eco.name}）`
                );
                main(pl);
                return;
            }
            createShop(pl);
            return;
        }
        if (arg != null) itemList(pl, list[arg - 1]);
    });
}
function createShop(pl) {
    let fm = mc.newCustomForm();
    fm.setTitle("创建店铺");
    fm.addLabel(`将花费${initialFunding}${eco.name}创建店铺`);
    fm.addInput("店铺名称", "字符串（可空）");
    fm.addInput("店铺简介", "字符串（可空）");
    fm.addInput("店铺标志", "字符串（可空）");
    pl.sendForm(fm, (pl, args) => {
        if (!args) {
            main(pl);
            return;
        }
        if (eco.get(pl) < initialFunding) {
            pl.tell(
                `§c店铺${args[1]}创建失败：余额不足（需要${initialFunding}${eco.name}）`
            );
            main(pl);
            return;
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
    let fm = mc.newSimpleForm();
    let shop = db.get(pl.xuid);
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
    pl.sendForm(fm, (pl, arg) => {
        switch (arg) {
            case 0:
                shopInfo(pl);
                break;
            case 1:
                shopItem(pl);
                break;
            case 2:
                shopHistroy(pl);
                break;
            default:
                main(pl);
        }
    });
}
function itemList(pl, owner) {
    let fm = mc.newSimpleForm();
    let shop = db.get(owner);
    let itemcount = Object.keys(shop.items).length;
    fm.setTitle(shop.name);
    fm.setContent(`${shop.intro}§r\n目前在售物品数：${itemcount}个`);
    if (itemcount > 0)
        for (let item of Object.values(shop.items)) {
            let itemNBT = NBT.parseSNBT(item.snbt);
            fm.addButton(
                `${item.name}§r（${itemNBT.getTag("Name")}） * ${itemNBT.getTag(
                    "Count"
                )}\n价格：${item.price}/个`
            );
        }
    pl.sendForm(fm, (pl, arg) => {
        if (arg == null) {
            main(pl);
            return;
        }
        itemBuy(pl, owner, Object.values(db.get(owner).items)[arg]);
    });
}
function shopInfo(pl) {
    let fm = mc.newCustomForm();
    fm.setTitle("信息设置");
    let shop = db.get(pl.xuid);
    fm.addInput("店铺名称", "字符串（可空）", shop.name);
    fm.addInput("店铺简介", "字符串（可空）", shop.intro);
    fm.addInput("店铺标志", "字符串（可空）", shop.icon);
    pl.sendForm(fm, (pl, args) => {
        if (!args) {
            shopManagement(pl);
            return;
        }
        let shop = db.get(pl.xuid);
        shop.name = args[0];
        shop.intro = args[1];
        shop.icon = args[2];
        db.set(pl.xuid, shop);
        pl.tell(`店铺${args[0]}信息修改成功`);
        shopManagement(pl);
    });
}
function shopItem(pl) {
    let fm = mc.newSimpleForm();
    fm.addButton("上架物品");
    let shop = db.get(pl.xuid);
    fm.setTitle(shop.name);
    for (let item of Object.values(shop.items)) {
        let itemNBT = NBT.parseSNBT(item.snbt);
        fm.addButton(
            `${item.name}§r（${itemNBT.getTag("Name")}） * ${itemNBT.getTag(
                "Count"
            )}\n价格：${item.price}/个`
        );
    }
    pl.sendForm(fm, (pl, arg) => {
        if (arg == null) {
            shopManagement(pl);
            return;
        }
        switch (arg) {
            case 0:
                itemUpload(pl);
                break;
            default:
                itemManagement(pl, arg);
        }
    });
}
function shopHistroy(pl) {
    let fm = mc.newSimpleForm();
    fm.setTitle("历史记录");
    let shop = db.get(pl.xuid);
    let history = shop.history.reverse();
    let content = "";
    for (let historyData of history) {
        if (content) content += "\n";
        content += `购买时间：${historyData.time}\n卖家：${data.xuid2name(
            historyData.buyer
        )}\n物品：${historyData.item.name}§r\n数量：${
            historyData.count
        }\n单价：${historyData.item.price}${eco.name}\n物品NBT：${
            historyData.item.snbt
        }`;
    }
    fm.setContent(content);
    pl.sendForm(fm, () => {
        shopManagement(pl);
    });
}
function itemBuy(pl, owner, item) {
    let fm = mc.newCustomForm();
    fm.setTitle("购买确认");
    fm.addLabel(`物品名：${item.name}`);
    fm.addLabel(`NBT：${item.snbt}`);
    fm.addLabel(`价格：${item.price}/个`);
    let count = Number(NBT.parseSNBT(item.snbt).getTag("Count"));
    if (count > 1) {
        let num = eco.get(pl) / item.price;
        fm.addSlider(
            "选择购买数量",
            Math.round(1 / item.price),
            num > count ? count : num
        );
    } else fm.addLabel("将购买1个");
    pl.sendForm(fm, (pl, args) => {
        if (!args) {
            itemList(pl, owner);
            return;
        }
        let shop = db.get(owner);
        let num = args[3] ?? 1;
        if (!shop.items[item.guid]) {
            pl.tell(`§c${item.name}§r * ${num}购买失败：已被买走`);
            return;
        }
        let itemNBT = NBT.parseSNBT(shop.items[item.guid].snbt);
        let count = Number(itemNBT.getTag("Count"));
        if (count < num) {
            pl.tell(`§c${item.name}§r * ${num}购买失败：数量过多`);
            return;
        }
        let cost = Math.round(num * shop.items[item.guid].price);
        if (cost > eco.get(pl)) {
            pl.tell(`§c${item.name}§r * ${num}购买失败：余额不足`);
            return;
        }
        let newItem = mc.newItem(itemNBT.setByte("Count", num));
        if (!pl.getInventory().hasRoomFor(newItem)) {
            pl.tell(`§c${item.name}§r * ${num}购买失败：背包已满`);
            return;
        }
        let history = {
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
        let ownerpl = mc.getPlayer(owner);
        if (ownerpl) {
            let get = Math.round(cost * (1 - serviceCharge));
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
    let fm = mc.newCustomForm();
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
        if (!args) {
            shopItem(pl);
            return;
        }
        if (isNaN(args[2])) {
            pl.tell(
                `§c物品${args[1]}§r * ${args[3]}上架失败：价格输入错误（非数字）`
            );
            shopItem(pl);
            return;
        }
        if (args[2] <= 0) {
            pl.tell(
                `§c物品${args[1]}§r * ${args[3]}上架失败：价格输入错误（非正数）`
            );
            shopItem(pl);
            return;
        }
        let item = items[args[0]];
        if (item.count < args[3]) {
            pl.tell(`§c物品${args[1]}§r * ${args[3]}上架失败：数量不足`);
            shopItem(pl);
            return;
        }
        let shop = db.get(pl.xuid);
        let itemNBT = item.getNbt();
        let guid = system.randomGuid();
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
    let fm = mc.newCustomForm();
    let items = db.get(pl.xuid).items;
    let item = Object.values(items)[arg - 1];
    fm.setTitle(`编辑物品 - ${item.name}`);
    fm.addInput("物品名称", "字符串（可空）", item.name);
    fm.addInput("物品价格", "数字（可空）", item.price);
    let count = Number(NBT.parseSNBT(item.snbt).getTag("Count"));
    fm.addSlider("上架数量", 0, count, 1, count);
    pl.sendForm(fm, (pl, args) => {
        if (!args) {
            shopItem(pl);
            return;
        }
        let shop = db.get(pl.xuid);
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
        let itemNBT = NBT.parseSNBT(shop.items[item.guid].snbt);
        let count = Number(itemNBT.getTag("Count"));
        if (count < args[2]) {
            pl.tell(`§c物品${args[0]}§r * ${args[2]}修改失败：下架过多`);
            shopItem(pl);
            return;
        }
        shop.items[item.guid].name = args[0] || item.name;
        shop.items[item.guid].price = args[1] ?? item.price;
        let wbd = args[2] < 1;
        if (args[2] != count) {
            let it = mc.newItem(itemNBT.setByte("Count", count - args[2]));
            if (!pl.getInventory().hasRoomFor(it)) {
                pl.tell(`§c物品${args[0]}§r * ${args[2]}修改失败：背包已满`);
                shopItem(pl);
                return;
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
