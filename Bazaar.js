/*
English:
    Bazaar
    Copyright (C) 2022  StarsDream00 starsdream00@icloud.com

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
    物品集市
    版权所有 © 2022  星梦喵吖 starsdream00@icloud.com
    本程序是自由软件：你可以根据自由软件基金会发布的GNU Affero通用公共许可证的条款，即许可证的第3版，
    或（您选择的）任何后来的版本重新发布和/或修改它。

    本程序的分发是希望它能发挥价值，但没有做任何保证；甚至没有隐含的适销对路或适合某一特定目的的保证。
    更多细节请参见GNU Affero通用公共许可证。

    您应该已经收到了一份GNU Affero通用公共许可证的副本。如果没有，
    请参阅<https://www.gnu.org/licenses/>（<https://www.gnu.org/licenses/agpl-3.0.html>）
    及其非官方中文翻译<https://www.chinasona.org/gnu/agpl-3.0-cn.html>。
*/

"use strict";
ll.registerPlugin("Bazaar", "集市", [2, 0, 0]);

const config = new JsonConfigFile("plugins/Bazaar/config.json");
const command = config.init("command", "bazaar");
const currencyType = config.init("currencyType", "llmoney");
const currencyName = config.init("currencyName", "元");
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
const serviceCharge = config.init("serviceCharge", 0.02);
config.close();
let db = new KVDatabase("plugins/Bazaar/data");
// For compatibility
{
    const keys = db.listKey();
    if (!keys.items || !keys.offers) {
        db.close();
        File.rename("plugins/Bazaar/data", "plugins/Bazaar/data_v1");
        db = new KVDatabase("plugins/Bazaar/data");
        const olddb = new KVDatabase("plugins/Bazaar/data_v1");
        const items = {};
        const sellers = {};
        for (const key of keys) {
            const shop = olddb.get(key);
            const newShop = {
                items: [],
                offers: [],
                unprocessedTransactions: [],
            };
            for (const item of Object.values(shop.items)) {
                items[item.guid] = {
                    snbt: item.snbt,
                    count: NBT.parseSNBT(item.snbt).getTag("Count"),
                    price: item.price,
                    seller: key,
                };
                newShop.items.push(item.guid);
            }
            for (const ut of shop.pending) {
                newShop.unprocessedTransactions.push({
                    price: ut.item.price,
                    count: ut.count,
                    serviceCharge: ut.serviceCharge,
                });
            }
            sellers[key] = newShop;
        }
        olddb.close();
        db.set("items", items);
        db.set("offers", {});
        db.set("sellers", sellers);
    }
}
const ench = [
    "保护",
    "火焰保护",
    "摔落保护",
    "爆炸保护",
    "弹射物保护",
    "荆棘",
    "水下呼吸",
    "深海探索者",
    "水下速掘",
    "锋利",
    "亡灵杀手",
    "节肢杀手",
    "击退",
    "火焰附加",
    "抢夺",
    "效率",
    "精准采集",
    "耐久",
    "时运",
    "力量",
    "冲击",
    "火矢",
    "无限",
    "海之眷顾",
    "饵钓",
    "冰霜行者",
    "经验修补",
    "绑定诅咒",
    "消失诅咒",
    "穿刺",
    "激流",
    "忠诚",
    "引雷",
    "多重射击",
    "穿透",
    "快速装填",
    "灵魂疾行",
    "迅捷潜行",
];
const eff = [
    "无",
    "平凡",
    "延长平凡",
    "浑浊",
    "粗制",
    "夜视",
    "延长夜视",
    "隐身",
    "延长隐身",
    "跳跃",
    "延长跳跃",
    "加强跳跃",
    "抗火",
    "延长抗火",
    "迅捷",
    "延长迅捷",
    "加强迅捷",
    "迟缓",
    "延长迟缓",
    "水肺",
    "延长水肺",
    "治疗",
    "加强治疗",
    "伤害",
    "加强伤害",
    "剧毒",
    "延长剧毒",
    "加强剧毒",
    "再生",
    "延长再生",
    "加强再生",
    "力量",
    "延长力量",
    "加强力量",
    "虚弱",
    "延长虚弱",
    "衰变",
    "神龟",
    "延长神龟",
    "加强神龟",
    "缓降",
    "延长缓降",
    "加强迟缓",
];
mc.listen("onServerStarted", () => {
    const cmd = mc.newCommand(command, "打开集市。", PermType.Any);
    cmd.overload();
    cmd.setCallback((_cmd, ori, out, _res) => {
        if (ori.player) return main(ori.player);
        return out.error("commands.generic.noTargetMatch");
    });
    cmd.setup();
});
mc.listen("onJoin", (pl) => {
    const sellers = db.get("sellers") ?? {};
    if (!(pl.xuid in sellers)) {
        sellers[pl.xuid] = {
            items: [],
            offers: [],
            unprocessedTransactions: [],
        };
        db.set("sellers", sellers);
        return;
    }
    for (const ut of sellers[pl.xuid].unprocessedTransactions) {
        if (ut.item) {
            const nbtData = {
                Name: new NbtString(offers[uuid].type),
                Damage: new NbtShort(offers[uuid].data),
                Count: new NbtByte(1),
            };
            if (offers[uuid].ench)
                nbtData.ench = new NbtCompound(offers[uuid].ench);
            const nbt = new NbtCompound(nbtData);
            const item = mc.newItem(nbt);
            pl.giveItem(item, ut.count);
            pl.sendToast(
                "集市",
                `报价被处理（您获得了${ut.item.name}*${ut.count}）`
            );
        }
        if (ut.price) {
            const get = Math.round(ut.price * ut.count * (1 - serviceCharge));
            eco.add(pl, get);
            pl.sendToast("集市", `物品被购买（您获得了${get}${eco.name}）`);
        }
        sellers[pl.xuid].unprocessedTransactions.splice(
            sellers[pl.xuid].unprocessedTransactions.indexOf(ut),
            1
        );
    }
    db.set("sellers", sellers);
});
function main(pl) {
    const sellers = db.get("sellers") ?? {};
    const items = db.get("items") ?? {};
    const itemsCount = Object.keys(items).length;
    const offers = db.get("offers") ?? {};
    const offersCount = Object.keys(offers).length;
    const fm = mc.newSimpleForm();
    fm.setTitle("集市");
    fm.addButton(
        `出售${
            itemsCount > 0
                ? `\n${
                      sellers[pl.xuid].items.length > 0
                          ? `${sellers[pl.xuid].items.length}/`
                          : ""
                  }${itemsCount}`
                : ""
        }`
    );
    fm.addButton(
        `回收${
            offersCount > 0
                ? `\n${
                      sellers[pl.xuid].offers.length > 0
                          ? `${sellers[pl.xuid].offers.length}/`
                          : ""
                  }${offersCount}`
                : ""
        }`
    );
    pl.sendForm(fm, (pl, arg) => {
        switch (arg) {
            case 0:
                return browseItems(pl);
            case 1:
                return browseOffers(pl);
        }
    });
}
function browseItems(pl) {
    const fm = mc.newSimpleForm();
    fm.setTitle("出售集市");
    fm.addButton("管理物品");
    const items = db.get("items") ?? {};
    const itemsKey = Object.keys(items);
    const itemsValue = Object.values(items);
    const realItems = [];
    for (const item of itemsValue) {
        if (item.seller == pl.xuid) continue;
        const itemNBT = NBT.parseSNBT(item.snbt);
        fm.addButton(
            `${itemNBT.getTag("Name")}*${item.count}\n${item.price}${
                eco.name
            }/个 ${data.xuid2name(item.seller)}`
        );
        realItems.push(itemsKey[itemsValue.indexOf(item)]);
    }
    pl.sendForm(fm, (pl, arg) => {
        if (arg == null) return main(pl);
        switch (arg) {
            case 0:
                return itemsManagement(pl);
            default:
                return itemBuy(pl, realItems[arg - 1]);
        }
    });
}
function browseOffers(pl) {
    const fm = mc.newSimpleForm();
    fm.setTitle("回收集市");
    fm.addButton("管理报价");
    const offers = db.get("offers") ?? {};
    const offersKey = Object.keys(offers);
    const offersValue = Object.values(offers);
    const realOffers = [];
    for (const offer of offersValue) {
        if (offer.seller == pl.xuid) continue;
        fm.addButton(
            `${offer.type}（${offer.data}）*${offer.count}\n${offer.price}${
                eco.name
            }/个 ${data.xuid2name(offer.seller)}`
        );
        realOffers.push(offersKey[offersValue.indexOf(offer)]);
    }
    pl.sendForm(fm, (pl, arg) => {
        if (arg == null) return main(pl);
        switch (arg) {
            case 0:
                return offersManagement(pl);
            default:
                return offerProcess(pl, realOffers[arg - 1]);
        }
    });
}
function itemsManagement(pl) {
    const fm = mc.newSimpleForm();
    fm.setTitle("物品管理");
    fm.addButton("上架物品");
    const sellers = db.get("sellers") ?? {};
    const items = db.get("items") ?? {};
    for (const uuid of sellers[pl.xuid].items) {
        const itemNBT = NBT.parseSNBT(items[uuid].snbt);
        fm.addButton(
            `${itemNBT.getTag("Name")}*${items[uuid].count}\n${
                items[uuid].price
            }${eco.name}/个`
        );
    }
    pl.sendForm(fm, (pl, arg) => {
        if (arg == null) return browseItems(pl);
        switch (arg) {
            case 0:
                return itemUpload(pl);
            default:
                return itemsManagement(pl); // itemEdit(pl, sellers[pl.xuid].items[arg - 1]);
        }
    });
}
function offersManagement(pl) {
    const fm = mc.newSimpleForm();
    fm.setTitle("报价管理");
    fm.addButton("创建报价");
    const sellers = db.get("sellers") ?? {};
    const offers = db.get("offers") ?? {};
    for (const uuid of sellers[pl.xuid].offers)
        fm.addButton(
            `${offers[uuid].type}*${offers[uuid].count}\n${offers[uuid].price}${eco.name}/个`
        );
    pl.sendForm(fm, (pl, arg) => {
        if (arg == null) return browseOffers(pl);
        switch (arg) {
            case 0:
                return offerCreate(pl);
            default:
                return offersManagement(pl); // offerEdit(pl, sellers[pl.xuid].offers[arg - 1]);
        }
    });
}
function itemBuy(pl, uuid) {
    const items = db.get("items") ?? {};
    if (!(uuid in items)) {
        pl.sendToast("集市", "§c物品购买失败：已下线");
        return browseItems(pl);
    }
    let canBuyMax = Math.round(eco.get(pl) / items[uuid].price);
    if (canBuyMax <= 0) {
        pl.sendToast("集市", "§c物品购买失败：余额不足");
        return browseItems(pl);
    }
    if (items[uuid].count < canBuyMax) {
        canBuyMax = items[uuid].count;
    }
    const fm = mc.newCustomForm();
    fm.setTitle("购买物品");
    const itemNBT = NBT.parseSNBT(items[uuid].snbt);
    fm.addLabel(`类型：${itemNBT.getTag("Name")}`);
    fm.addLabel(`单价：${items[uuid].price}`);
    fm.addLabel(`NBT：${items[uuid].snbt}`);
    const canBuyMin = 1 / items[uuid].price;
    if (canBuyMin < canBuyMax)
        fm.addSlider("数量", Math.round(canBuyMin), Math.round(canBuyMax));
    else fm.addLabel(`将购买${canBuyMax}个`);
    const tag = itemNBT.getTag("tag");
    const enchData = tag ? tag.getData("ench") : undefined;
    if (enchData) {
        let msg = "附魔：";
        for (const e of enchData.toArray()) {
            msg += `\n${ench[e.id]} ${e.lvl}`;
        }
        fm.addLabel(msg);
    }
    if (/potion/.test(itemNBT.getData("Name")))
        fm.addLabel(`效果：${eff[itemNBT.getTag("Damage")]}`);
    pl.sendForm(fm, (pl, args) => {
        if (!args) return browseItems(pl);
        const nowItems = db.get("items") ?? {};
        if (!(uuid in nowItems)) {
            pl.sendToast("集市", "§c物品购买失败：已下线");
            return browseItems(pl);
        }
        const num = args[3] ?? canBuyMax;
        if (nowItems[uuid].count < num) {
            pl.sendToast("集市", "§c物品购买失败：库存不足");
            return browseItems(pl);
        }
        const cost = Math.round(num * nowItems[uuid].price);
        if (eco.get(pl) < cost) {
            pl.sendToast("集市", "§c物品购买失败：余额不足");
            return browseItems(pl);
        }
        const seller = nowItems[uuid].seller;
        const sellers = db.get("sellers") ?? {};
        if (nowItems[uuid].count <= num) {
            delete nowItems[uuid];
            sellers[seller].items.splice(
                sellers[seller].items.indexOf(uuid),
                1
            );
        } else nowItems[uuid].count -= num;
        eco.reduce(pl, cost);
        const newItem = mc.newItem(itemNBT);
        pl.giveItem(newItem, num);
        const sellerObj = mc.getPlayer(seller);
        if (sellerObj) {
            const get = Math.round(cost * (1 - serviceCharge));
            eco.add(sellerObj, get);
            sellerObj.sendToast(
                "集市",
                `物品被购买（您获得了${get}${eco.name}）`
            );
        } else
            sellers[seller].unprocessedTransactions.push({
                price: nowItems[uuid].price,
                count: num,
                serviceCharge: serviceCharge,
            });
        db.set("sellers", sellers);
        db.set("items", nowItems);
        pl.sendToast("集市", "物品购买成功");
        return browseItems(pl);
    });
}
function offerProcess(pl, uuid) {
    const offers = db.get("offers") ?? {};
    if (!(uuid in offers)) {
        pl.sendToast("集市", "§c报价处理失败：已下线");
        return browseOffers(pl);
    }
    const nbtData = {
        Name: new NbtString(offers[uuid].type),
        Damage: new NbtShort(offers[uuid].data),
        Count: new NbtByte(1),
    };
    if (offers[uuid].ench) nbtData.ench = new NbtCompound(offers[uuid].ench);
    const nbt = new NbtCompound(nbtData);
    const item = mc.newItem(nbt);
    let itemCount = 0;
    for (const invItem of pl.getInventory().getAllItems()) {
        if (invItem.isNull()) continue;
        if (invItem.match(item)) itemCount += invItem.count;
    }
    if (itemCount <= 0) {
        pl.sendToast("集市", "§c报价处理失败：物品不足");
        return browseOffers(pl);
    }
    if (itemCount > offers[uuid].count) {
        itemCount = offers[uuid].count;
    }
    const fm = mc.newCustomForm();
    fm.setTitle("报价处理");
    fm.addLabel(`类型：${offers[uuid].type}`);
    fm.addLabel(`单价：${offers[uuid].price}/个`);
    fm.addLabel(`税率：${serviceCharge * 100}％`);
    if (itemCount > 1) fm.addSlider("数量", 1, itemCount);
    else fm.addLabel("数量：1");
    pl.sendForm(fm, (pl, args) => {
        if (!args) return browseOffers(pl);
        const nowOffers = db.get("offers") ?? {};
        if (!(uuid in nowOffers)) {
            pl.sendToast("集市", "§c报价处理失败：已下线");
            return browseOffers(pl);
        }
        const num = args[3] ?? 1;
        if (nowOffers[uuid].count < num) num = nowOffers[uuid].count;
        let itemCount = 0;
        const invItems = pl.getInventory().getAllItems();
        for (const invItem of invItems) {
            if (invItem.isNull()) continue;
            if (invItem.match(item)) itemCount += invItem.count;
        }
        if (itemCount < num) {
            pl.sendToast("集市", "§c报价处理失败：物品不足");
            return browseOffers(pl);
        }
        const seller = nowOffers[uuid].seller;
        const sellers = db.get("sellers") ?? {};
        if (nowOffers[uuid].count <= num) {
            delete nowOffers[uuid];
            sellers[seller].offers.splice(
                sellers[seller].offers.indexOf(uuid),
                1
            );
        } else nowOffers[uuid].count -= num;
        let buyCount = num;
        for (const invItem of invItems) {
            if (buyCount <= 0) break;
            if (!invItem.match(item)) continue;
            if ((buyCount -= invItem.count) < 0)
                invItem.setNbt(
                    invItem.getNbt().setByte("Count", Math.abs(buyCount))
                );
            else invItem.setNull();
            pl.refreshItems();
        }
        const get = Math.round(
            num * nowOffers[uuid].price * (1 - serviceCharge)
        );
        eco.add(pl, get);
        const sellerObj = mc.getPlayer(seller);
        if (sellerObj) {
            sellerObj.giveItem(item, num);
            sellerObj.sendToast(
                "集市",
                `报价被处理（您获得了${item.name}*${num}）`
            );
        } else
            sellers[seller].unprocessedTransactions.push({
                item: nbt.toSNBT(),
                count: num,
                serviceCharge: serviceCharge,
            });
        db.set("sellers", sellers);
        db.set("offers", nowOffers);
        pl.sendToast("集市", `报价处理成功（您获得了${get}${eco.name}）`);
        return browseOffers(pl);
    });
}
function itemUpload(pl, args = [0, "", 1]) {
    const invItems = pl.getInventory().getAllItems();
    const itemData = [];
    invItems.forEach((invItem) => {
        if (invItem.isNull()) return;
        for (const item of itemData)
            if (item.item.match(invItem)) {
                item.count += invItem.count;
                return;
            }
        itemData.push({
            count: invItem.count,
            item: invItem.clone(),
        });
    });
    if (itemData.length <= 0) {
        pl.sendToast("集市", "§c物品上架失败：物品不足");
        return itemsManagement(pl);
    }
    const namesOfItem = [];
    let max = 0;
    for (const item of itemData) {
        const itemNBT = item.item.getNbt();
        const tag = itemNBT.getTag("tag");
        const enchData = tag ? tag.getData("ench") : undefined;
        let msg = "";
        if (enchData) {
            for (const e of enchData.toArray()) {
                msg += ` ${ench[e.id]} ${e.lvl}`;
            }
        }
        if (/potion/.test(itemNBT.getData("Name")))
            msg += ` ${eff[itemNBT.getTag("Damage")]}`;
        namesOfItem.push(
            `${item.item.name}（${item.item.type} ${item.item.aux}${msg}）*${item.count}`
        );
        if (max < item.count) max = item.count;
    }
    const fm = mc.newCustomForm();
    fm.setTitle("上架物品");
    fm.addDropdown("物品", namesOfItem, args[0]);
    fm.addInput("价格", "正实型", args[1]);
    if (max < 2) fm.addLabel("数量：1");
    else fm.addSlider("数量", 1, max, 1, args[2]);
    pl.sendForm(fm, (pl, args) => {
        if (!args) return itemsManagement(pl);
        if (isNaN(args[1]) || args[1] < 0) {
            pl.sendToast("集市", "§c物品上架失败：无效价格");
            return itemUpload(pl, args);
        }
        let num = Number(args[2]) ?? 1;
        const invItems = pl.getInventory().getAllItems();
        let itemCount = 0;
        for (const invItem of invItems) {
            if (invItem.isNull()) continue;
            if (invItem.match(itemData[args[0]].item))
                itemCount += invItem.count;
        }
        if (itemCount < num) {
            pl.sendToast("集市", "§c物品上架失败：物品不足");
            return itemUpload(pl, args);
        }
        const items = db.get("items") ?? {};
        const uuid = system.randomGuid();
        items[uuid] = {
            snbt: itemData[args[0]].item.getNbt().toSNBT(),
            count: num,
            price: Number(args[1]),
            seller: pl.xuid,
        };
        for (const invItem of invItems) {
            if (num <= 0) break;
            if (invItem.isNull()) continue;
            if (invItem.match(itemData[args[0]].item)) {
                if (invItem.count <= num) {
                    num -= invItem.count;
                    invItem.setNull();
                    continue;
                }
                invItem.setNbt(
                    invItem
                        .getNbt()
                        .setByte("Count", Number(invItem.count - num))
                );
            }
        }
        pl.refreshItems();
        const sellers = db.get("sellers") ?? {};
        sellers[pl.xuid].items.push(uuid);
        db.set("items", items);
        db.set("sellers", sellers);
        pl.sendToast("集市", "物品上架成功");
        return itemUpload(pl);
    });
}
function offerCreate(pl, args = ["", "0", "", "", "", 0]) {
    if (eco.get(pl) <= 0) {
        pl.sendToast("集市", "§c报价创建失败：余额不足");
        return offersManagement(pl);
    }
    const fm = mc.newCustomForm();
    fm.setTitle("创建报价");
    fm.addInput("标准类型名", "命名空间:物品名", args[0]);
    fm.addInput("数据值", "整型", args[1]);
    fm.addInput("数量", "正整型", args[2]);
    fm.addInput("价格", "正实型", args[3]);
    fm.addInput("附魔", "键值对（键值冒号分隔，元素逗号分隔，可空）", args[4]);
    pl.sendForm(fm, (pl, args) => {
        if (!args) return offersManagement(pl);
        if (!args[0] || mc.newItem(args[0], 1).isNull()) {
            pl.sendToast("集市", "§c报价创建失败：无效类型名");
            return offerCreate(pl, args);
        }
        if (isNaN(args[1])) {
            pl.sendToast("集市", "§c报价创建失败：无效数据值");
            return offerCreate(pl, args);
        }
        if (args[2] <= 0) {
            pl.sendToast("集市", "§c报价创建失败：无效数量");
            return offerCreate(pl, args);
        }
        if (args[3] <= 0) {
            pl.sendToast("集市", "§c报价创建失败：无效价格");
            return offerCreate(pl, args);
        }
        const cost = Math.round(args[2] * args[3]);
        if (eco.get(pl) < cost) {
            pl.sendToast("集市", "§c报价创建失败：余额不足");
            return offerCreate(pl, args);
        }
        const offers = db.get("offers") ?? {};
        const uuid = system.randomGuid();
        offers[uuid] = {
            type: args[0],
            data: Number(args[1]),
            count: Number(args[2]),
            price: Number(args[3]),
            seller: pl.xuid,
        };
        if (args[4]) {
            offers[uuid].ench = {};
            const dt1 = args[4].split(/,[\s]?/);
            for (const dat of dt1) {
                const dt2 = dat.split(":");
                offers[uuid].ench[dt2[0]] = dt2[1];
            }
        }
        db.set("offers", offers);
        const sellers = db.get("sellers") ?? {};
        sellers[pl.xuid].offers.push(uuid);
        db.set("sellers", sellers);
        eco.reduce(pl, args[2] * args[3]);
        pl.sendToast("集市", "报价创建成功");
        return offerCreate(pl);
    });
}
/*
function itemEdit(pl, uuid) {
    const items = db.get("items") ?? {};
    if (!(uuid in items)) {
        pl.sendToast("集市", "§c物品编辑失败：已下线");
        return itemsManagement(pl);
    }
    const fm = mc.newCustomForm();
    // TODO
    fm.addLabel("未完成，尽请期待！");
    pl.sendForm(fm, (pl, args) => {
        return itemsManagement(pl);
    });
}
function offerEdit(pl, uuid) {
    const offers = db.get("offers") ?? {};
    if (!(uuid in offers)) {
        pl.sendToast("集市", "§c报价编辑失败：已下线");
        return offersManagement(pl);
    }
    const fm = mc.newCustomForm();
    // TODO
    fm.addLabel("未完成，尽请期待！");
    pl.sendForm(fm, (pl, args) => {
        return offersManagement(pl);
    });
}
*/
