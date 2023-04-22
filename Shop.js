/*
English:
    Shop
    Copyright (C) 2023  StarsDream00 starsdream00@icloud.com

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.

中文：
    商店
    版权所有 © 2023  星梦喵吖 starsdream00@icloud.com
    本程序是自由软件：你可以根据自由软件基金会发布的GNU Affero通用公共许可证的条款，即许可证的第3版，
    或（您选择的）任何后来的版本重新发布和/或修改它。

    本程序的分发是希望它能发挥价值，但没有做任何保证；甚至没有隐含的适销对路或适合某一特定目的的保证。
    更多细节请参见GNU Affero通用公共许可证。

    您应该已经收到了一份GNU Affero通用公共许可证的副本。如果没有，
    请参阅<https://www.gnu.org/licenses/>（<https://www.gnu.org/licenses/agpl-3.0.html>）
    及其非官方中文翻译<https://www.chinasona.org/gnu/agpl-3.0-cn.html>。
*/

"use strict";
ll.registerPlugin("Shop", "商店", [1, 6, 0]);

const config = new JsonConfigFile("plugins/Shop/config.json");
const command = config.init("command", "shop");
const serviceCharge = config.init("serviceCharge", 0.02);
const currencyType = config.init("currencyType", "llmoney");
const currencyName = config.init("currencyName", "元");
const allowDrop = config.init("allowDrop", true);
const eco = (() => {
    switch (currencyType) {
        case "llmoney":
            return {
                add: (pl, money) => pl.addMoney(money),
                reduce: (pl, money) => pl.reduceMoney(money),
                get: (pl) => pl.getMoney(),
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
mc.listen("onServerStarted", () => {
    const cmd = mc.newCommand(command, "打开商店菜单。", PermType.Any);
    cmd.overload();
    cmd.setCallback((_cmd, ori, out, _res) => {
        if (ori.player) return main(ori.player);
        return out.error("commands.generic.noTargetMatch");
    });
    cmd.setup();
});
function main(pl, isFromShop) {
    const db = new JsonConfigFile("plugins/Shop/data.json");
    const sell = db.init("sell", []);
    const recycle = db.init("recycle", []);
    db.close();
    if (!isFromShop) {
        if (recycle.length <= 0) return sellShop(pl, sell, []);
        if (sell.length <= 0) return recycleShop(pl, recycle, []);
    }
    pl.sendForm(
        mc
            .newSimpleForm()
            .setTitle("商店菜单")
            .addButton("购买")
            .addButton("回收"),
        (pl, e) => {
            switch (e) {
                case 0:
                    return sellShop(pl, sell, []);
                case 1:
                    return recycleShop(pl, recycle, []);
            }
        }
    );
}
function sellShop(pl, shop, shopLink) {
    const fm = mc
        .newSimpleForm()
        .setTitle(`购买商店 - ${shopLink.length <= 0 ? "主商店" : shop.name}`);
    const items = shopLink.length <= 0 ? shop : shop.items;
    for (const item of items) {
        if (item.items) {
            fm.addButton(item.name, item.icon ? item.icon : "");
            continue;
        }
        fm.addButton(
            `${item.name}\n${item.price}${eco.name}/${
                item.num ? item.num : ""
            }个`,
            item.icon ? item.icon : ""
        );
    }
    pl.sendForm(fm, (pl, arg) => {
        if (arg == null) {
            if (shopLink.length > 0) {
                return sellShop(pl, shopLink.pop(), shopLink);
            }
            const db = new JsonConfigFile("plugins/Shop/data.json");
            const recycle = db.init("recycle", []);
            db.close();
            if (recycle.length <= 0) return;
            return main(pl, true);
        }
        const item = items[arg];
        if (item.items) {
            shopLink.push(shop);
            return sellShop(pl, item, shopLink);
        }
        const maxNum = (eco.get(pl) / item.price) * (item.num ? item.num : 1);
        if (maxNum <= 0) {
            pl.tell(`§c物品${item.name}购买失败：余额不足`);
            return sellShop(pl, shop, shopLink);
        }
        shopLink.push(shop);
        return sellConfirm(pl, item, maxNum, shopLink);
    });
}
function sellConfirm(pl, itemData, maxNum, shopLink) {
    const fm = mc
        .newCustomForm()
        .setTitle("购买物品")
        .addLabel(`名称：${itemData.name}`)
        .addLabel(
            `单价：${itemData.price}/${itemData.num ? itemData.num : ""}个`
        );
    if (itemData.num) {
        if (maxNum / itemData.num >= 2) {
            const nums = [];
            for (let i = itemData.num; i <= maxNum; i += itemData.num)
                nums.push(String(i));
            fm.addStepSlider("数量", nums);
        } else fm.addLabel(`数量：${itemData.num}`);
    } else if (maxNum > 1)
        fm.addInput("数量", `您最多可购买${Math.round(maxNum)}个`);
    else fm.addLabel("数量：1");
    pl.sendForm(fm, (pl, args) => {
        if (!args) return sellShop(pl, shopLink.pop(), shopLink);
        let num = args[2] ?? (itemData.num ? 0 : 1);
        if (isNaN(num)) {
            pl.tell(`§c物品${itemData.name}购买失败：数量有误`);
            return sellShop(pl, shopLink.pop(), shopLink);
        }
        if (itemData.num) num = (num + 1) * itemData.num;
        let cost = itemData.price * (num / (itemData.num ? itemData.num : 1));
        if (eco.get(pl) < cost) {
            pl.tell(`§c物品${itemData.name}*${num}购买失败：余额不足`);
            return sellShop(pl, shopLink.pop(), shopLink);
        }
        const item = itemData.nbt
            ? mc.newItem(NBT.parseSNBT(itemData.nbt))
            : mc.newItem(itemData.id, Number(num));
        if (!itemData.nbt) {
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
            if (itemData.dataValues) item.setAux(itemData.dataValues);
        }
        if (!allowDrop && !pl.getInventory().hasRoomFor(item)) {
            pl.tell(`§c物品${itemData.name}*${num}购买失败：空间不足`);
            return sellShop(pl, shopLink.pop(), shopLink);
        }
        cost = Math.round(cost);
        eco.reduce(pl, cost);
        pl.giveItem(item, Number(num));
        pl.tell(`物品${itemData.name}*${num}购买成功：花费${cost}${eco.name}`);
        return sellShop(pl, shopLink.pop(), shopLink);
    });
}
function recycleShop(pl, shop, shopLink) {
    const fm = mc
        .newSimpleForm()
        .setTitle(`回收商店 - ${shopLink.length <= 0 ? "主商店" : shop.name}`);
    const items = shopLink.length <= 0 ? shop : shop.items;
    for (const item of items) {
        if (item.items) {
            fm.addButton(item.name, item.icon ? item.icon : "");
            continue;
        }
        fm.addButton(
            `${item.name}\n${item.price}${eco.name}/${
                item.num ? item.num : ""
            }个`,
            item.icon ? item.icon : ""
        );
    }
    pl.sendForm(fm, (pl, arg) => {
        if (arg == null) {
            if (shopLink.length > 0) {
                return recycleShop(pl, shopLink.pop(), shopLink);
            }
            const db = new JsonConfigFile("plugins/Shop/data.json");
            const sell = db.init("sell", []);
            db.close();
            if (sell.length <= 0) return;
            return main(pl, true);
        }
        const itemData = items[arg];
        if (itemData.items) {
            shopLink.push(shop);
            return recycleShop(pl, itemData, shopLink);
        }
        let count = 0;
        const item = itemData.nbt
            ? mc.newItem(NBT.parseSNBT(itemData.nbt))
            : mc.newItem(itemData.id, 1);
        if (!itemData.nbt) {
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
            if (itemData.dataValues) item.setAux(itemData.dataValues);
        }
        for (const plsItem of pl.getInventory().getAllItems()) {
            if (!item.match(plsItem)) continue;
            count += plsItem.count;
        }
        if (count < (itemData.num ? itemData.num : 1)) {
            pl.tell(`§c物品${itemData.name}回收失败：数量不足`);
            return recycleShop(pl, shop, shopLink);
        }
        shopLink.push(shop);
        return recycleConfirm(pl, itemData, count, shopLink, item);
    });
}
function recycleConfirm(pl, itemData, count, shopLink, item) {
    const fm = mc
        .newCustomForm()
        .setTitle("回收物品")
        .addLabel(`名称：${itemData.name}`)
        .addLabel(
            `单价：${itemData.price}/${itemData.num ? itemData.num : ""}个`
        )
        .addLabel(`当前税率：${serviceCharge * 100}％`);
    if (itemData.num) {
        if (count / itemData.num >= 2) {
            const nums = [];
            for (let i = itemData.num; i <= count; i += itemData.num)
                nums.push(String(i));
            fm.addStepSlider("数量", nums);
        } else fm.addLabel(`数量：${itemData.num}`);
    } else if (count > 1) fm.addInput("数量", `您最多可回收${count}个`);
    else fm.addLabel("数量：1");
    pl.sendForm(fm, (pl, args) => {
        if (!args) return recycleShop(pl, shopLink.pop(), shopLink);
        const its = pl.getInventory().getAllItems();
        let count = 0;
        for (const plsItem of its) {
            if (!item.match(plsItem)) continue;
            count += plsItem.count;
        }
        let num = args[3] ?? (itemData.num ? 0 : 1);
        if (isNaN(num)) {
            pl.tell(`§c物品${itemData.name}回收失败：数量有误`);
            return sellShop(pl, shopLink.pop(), shopLink);
        }
        if (itemData.num) num = (num + 1) * itemData.num;
        if (count < num) {
            pl.tell(
                `§c物品${itemData.name}回收失败：数量不足（只有${count}个）`
            );
            return recycleShop(pl, shopLink.pop(), shopLink);
        }
        let buyCount = num;
        for (const plsItem of its) {
            if (buyCount <= 0) break;
            if (!item.match(plsItem)) continue;
            if ((buyCount -= plsItem.count) < 0)
                plsItem.setNbt(
                    plsItem.getNbt().setByte("Count", Math.abs(buyCount))
                );
            else plsItem.setNull();
            pl.refreshItems();
        }
        const add = Math.round(
            (num / (itemData.num ? itemData.num : 1)) *
                itemData.price *
                (1 - serviceCharge)
        );
        eco.add(pl, add);
        pl.tell(`物品${itemData.name}*${num}回收成功：获得${add}${eco.name}`);
        return recycleShop(pl, shopLink.pop(), shopLink);
    });
}
