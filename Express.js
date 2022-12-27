/*
English:
    Express
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
    快递
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
ll.registerPlugin("Express", "快递", [1, 0, 0]);

const config = new JsonConfigFile("plugins/Express/config.json");
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
    const plsnm = [];
    const plsxuid = [];
    for (const plget of mc.getOnlinePlayers())
        if (plget.xuid != pl.xuid) {
            plsnm.push(plget.realName);
            plsxuid.push(plget.xuid);
        }
    if (plsnm.length <= 0) return pl.tell("§c物品送达失败：暂无可送达用户");
    const fm = mc.newCustomForm();
    fm.setTitle("快递菜单");
    fm.addDropdown("目标", plsnm);
    const items = [];
    const inventoryItems = pl.getInventory().getAllItems();
    for (const item of inventoryItems) {
        if (item.isNull()) continue;
        fm.addSlider(
            `[${inventoryItems.indexOf(item)}] ${item.name}§r（${item.type}:${
                item.aux
            }）`,
            0,
            item.count
        );
        items.push(item);
    }
    if (items.length <= 0) return pl.tell("§c物品送达失败：背包为空");
    pl.sendForm(fm, (pl, args) => {
        if (!args) return;
        const level = pl.getLevel();
        const condition = Math.floor(
            serviceCharge[1] + serviceCharge[1] * level * 0.02
        );
        if (level < condition) {
            pl.tell(`§c物品送达失败：余额不足（需要${condition}级经验）`);
            return main(pl);
        }
        const pl1 = mc.getPlayer(plsxuid[args[0]]);
        if (!pl1) return pl.tell(`§c物品送达失败：${plsnm[args[0]]}已离线`);
        args.shift();
        const reduce = Math.round(
            Math.random() * (serviceCharge[0] - condition) + condition
        );
        const sendItems = [];
        for (const index in args) {
            if (args[index] <= 0) continue;
            const item = items[index];
            if (item.count < args[index]) {
                pl.tell(
                    `§c物品${item.name}§r*${args[index]}送达失败：数量不足`
                );
                continue;
            }
            const itemNbt = item.getNbt();
            const newitem = mc.newItem(
                itemNbt.setByte("Count", Number(args[index]))
            );
            if (item.count == args[index]) item.setNull();
            else
                item.setNbt(
                    itemNbt.setByte("Count", Number(item.count - args[index]))
                );
            pl.refreshItems();
            pl1.giveItem(newitem, Number(args[index]));
            sendItems.push({ name: item.name, count: args[index] });
        }
        if (sendItems.length <= 0) return;
        pl.reduceLevel(reduce);
        pl.tell(`已向${pl1.realName}发送了以下物品（花费${reduce}级经验）：`);
        pl1.tell(`${pl.realName}向您发送了以下物品：`);
        for (const item of sendItems) {
            pl.tell(`${item.name}§r*${item.count}`);
            pl1.tell(`${item.name}§r*${item.count}`);
        }
    });
}
