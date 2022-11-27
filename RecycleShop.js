/*
English:
    RecycleShop
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
    回收商店
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
        if (count <= 0) {
            pl.tell(`§c物品${it.name}回收失败：数量不足`);
            return main(pl);
        }
        confirm(pl, it, count);
    });
}
function confirm(pl, itemData, count) {
    const fm = mc.newCustomForm();
    fm.setTitle("回收确认");
    fm.addLabel(`名称：${itemData.name}`);
    fm.addLabel(`单价：${itemData.price}`);
    fm.addLabel(`当前税率：${serviceCharge * 100}％`);
    if (count > 1) fm.addSlider("数量", 1, count);
    else fm.addLabel("数量：1");
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
        const add = Math.round(args[3] * itemData.price * (1 - serviceCharge));
        eco.add(pl, add);
        pl.tell(
            `物品${itemData.name} * ${args[3]}回收成功（获得${add}${eco.name}）`
        );
        main(pl);
    });
}
