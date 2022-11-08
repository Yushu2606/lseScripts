"use strict";
ll.registerPlugin("Shop", "商店", [1, 1, 9]);

const config = new JsonConfigFile("plugins\\Shop\\config.json");
const command = config.init("command", "shop");
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
const db = new JsonConfigFile("plugins\\Shop\\data.json");
const sell = db.init("sell", []);
const recycle = db.init("recycle", []);
db.close();
mc.listen("onServerStarted", () => {
    const cmd = mc.newCommand(command, "打开商店菜单。", PermType.Any);
    cmd.overload();
    cmd.setCallback((_cmd, ori, out, _res) => {
        if (ori.player) return main(ori.player);
        return out.error("commands.generic.noTargetMatch");
    });
    cmd.setup();
});
function main(pl) {
    const fm = mc.newSimpleForm();
    fm.setTitle("商店菜单");
    fm.addButton("购买");
    fm.addButton("回收");
    pl.sendForm(fm, (pl, e) => {
        switch (e) {
            case 0:
                return sellShop(pl, sell, []);
            case 1:
                return recycleShop(pl, recycle, []);
        }
    });
}
function sellShop(pl, shop, shopLink) {
    const fm = mc.newSimpleForm();
    fm.setTitle(`购买商店 - ${shopLink.length <= 0 ? "主商店" : shop.name}`);
    const items = shopLink.length <= 0 ? shop : shop.items;
    for (const item of items) {
        if (item.items) {
            if (item.icon) {
                fm.addButton(item.name, item.icon);
                continue;
            }
            fm.addButton(item.name);
            continue;
        }
        if (item.icon) {
            fm.addButton(
                `${item.name}\n${item.price}${eco.name}/个`,
                item.icon
            );
            continue;
        }
        fm.addButton(`${item.name}\n${item.price}${eco.name}/个`);
    }
    pl.sendForm(fm, (pl, arg) => {
        if (arg == null) {
            if (shopLink.length > 0) {
                return sellShop(pl, shopLink.pop(), shopLink);
            }
            return main(pl);
        }
        const item = items[arg];
        if (item.items) {
            shopLink.push(shop);
            return sellShop(pl, item, shopLink);
        }
        const maxNum = eco.get(pl) / item.price;
        if (maxNum <= 0) {
            pl.tell(`§c物品${item.name}购买失败：余额不足`);
            return sellShop(pl, shop, shopLink);
        }
        shopLink.push(shop);
        return sellConfirm(pl, item, maxNum, shopLink);
    });
}
function sellConfirm(pl, itemData, maxNum, shopLink) {
    const fm = mc.newCustomForm();
    fm.setTitle("购买确认");
    fm.addLabel(`物品名：${itemData.name}`);
    fm.addLabel(`价格：${itemData.price}/个`);
    if (maxNum > 1)
        fm.addSlider(
            "选择购买数量",
            Math.round(1 / itemData.price),
            Math.round(maxNum)
        );
    else fm.addLabel("将购买1个");
    pl.sendForm(fm, (pl, args) => {
        if (!args) return sellShop(pl, shopLink.pop(), shopLink);
        const num = args[2] ?? 1;
        const cost = itemData.price * num;
        if (eco.get(pl) < cost) {
            pl.tell(`§c物品${itemData.name}*${num}购买失败：余额不足`);
            return sellShop(pl, shopLink.pop(), shopLink);
        }
        const item = mc.newItem(itemData.id, Number(num));
        if (itemData.dataValues) item.setAux(itemData.dataValues);
        if (itemData.enchantments) {
            const ench = new NbtList();
            for (const enchantment in itemData.enchantments) {
                ench.addTag(
                    new NbtCompound({
                        id: new NbtInt(Number(enchantment.id)),
                        lvl: new NbtInt(Number(enchantment.lvl)),
                    })
                );
            }
            const nbt = item.getNbt();
            const tag = nbt.getTag("tag");
            item.setNbt(
                nbt.setTag(
                    "tag",
                    tag
                        ? tag.setTag("ench", ench)
                        : new NbtCompound({
                              ench: ench,
                          })
                )
            );
        }
        if (!pl.getInventory().hasRoomFor(item)) {
            pl.tell(`§c物品${itemData.name}*${num}购买失败：空间不足`);
            return sellShop(pl, shopLink.pop(), shopLink);
        }
        eco.reduce(pl, Math.round(cost));
        pl.giveItem(item, Number(num));
        pl.tell(
            `物品${itemData.name}*${num}购买成功（花费${cost}${eco.name}）`
        );
        return sellShop(pl, shopLink.pop(), shopLink);
    });
}
function recycleShop(pl, shop, shopLink) {
    const fm = mc.newSimpleForm();
    fm.setTitle(`回收商店 - ${shopLink.length <= 0 ? "主商店" : shop.name}`);
    const items = shopLink.length <= 0 ? shop : shop.items;
    for (const item of items) {
        if (item.items) {
            if (item.icon) {
                fm.addButton(item.name, item.icon);
                continue;
            }
            fm.addButton(item.name);
            continue;
        }
        if (item.icon) {
            fm.addButton(
                `${item.name}\n${item.price}${eco.name}/个`,
                item.icon
            );
            continue;
        }
        fm.addButton(`${item.name}\n${item.price}${eco.name}/个`);
    }
    pl.sendForm(fm, (pl, arg) => {
        if (arg == null) {
            if (shopLink.length > 0) {
                return recycleShop(pl, shopLink.pop(), shopLink);
            }
            return main(pl);
        }
        const item = items[arg];
        if (item.items) {
            shopLink.push(shop);
            return recycleShop(pl, item, shopLink);
        }
        let count = 0;
        for (const plsItem of pl.getInventory().getAllItems()) {
            if (
                plsItem.type != item.id ||
                (item.dataValues && plsItem.aux != item.dataValues)
            )
                continue;
            count += plsItem.count;
        }
        if (count <= 0) {
            pl.tell(`§c物品${item.name}回收失败：数量不足`);
            return recycleShop(pl, shop, shopLink);
        }
        shopLink.push(shop);
        return recycleConfirm(pl, item, count, shopLink);
    });
}
function recycleConfirm(pl, itemData, count, shopLink) {
    const fm = mc.newCustomForm();
    fm.setTitle("回收确认");
    fm.addLabel(`物品名：${itemData.name}`);
    fm.addLabel(`回收价：${itemData.price}/个`);
    fm.addLabel(`当前税率：${serviceCharge * 100}％`);
    if (count > 1) fm.addSlider("选择回收数量", 1, count);
    else fm.addLabel("将回收1个");
    pl.sendForm(fm, (pl, args) => {
        if (!args) return recycleShop(pl, shopLink.pop(), shopLink);
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
        const num = args[3] ?? 1;
        if (count < num) {
            pl.tell(
                `§c物品${itemData.name}回收失败：数量不足（只有${count}个）`
            );
            return recycleShop(pl, shopLink.pop(), shopLink);
        }
        let buyCount = num;
        for (const item of its) {
            if (buyCount <= 0) break;
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
        const add = Math.round(num * itemData.price * (1 - serviceCharge));
        eco.add(pl, add);
        pl.tell(`物品${itemData.name}*${num}回收成功（获得${add}${eco.name}）`);
        return recycleShop(pl, shopLink.pop(), shopLink);
    });
}
