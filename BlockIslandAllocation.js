/*
English:
    BlockIslandAllocation
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
    岛屿分配系统
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
ll.registerPlugin("BlockIslandAllocation", "岛屿分配系统", [1, 0, 0]);

const db = new KVDatabase("plugins/BlockIslandAllocation/data");
if (db.listKey().indexOf("spawn") < 0)
    db.set("spawn", { version: "spawn", pos: { x: 0, y: -64, z: 0 } });
mc.listen("onPlaceBlock", (pl, bl) => {
    if (
        (bl.pos.x < 512 && bl.pos.x > -512) ||
        (bl.pos.z < 512 && bl.pos.z > -512)
    ) {
        pl.tell("你不能操作这片区域");
        return false;
    }
});
mc.listen("onDestroyBlock", (pl, bl) => {
    let re = true;
    for (const key of db.listKey()) {
        const island = db.get(key);
        if (
            island.pos.x != bl.pos.x ||
            island.pos.y != bl.pos.y ||
            island.pos.z != bl.pos.z
        )
            continue;
        re = false;
        pl.tell(
            `§c你不能破坏${
                pl.xuid == key ? "你自己" : data.xuid2name(key)
            }的核心方块`,
            4
        );
        break;
    }
    return re;
});
function sendInit(xuid) {
    if (db.listKey().indexOf(xuid) >= 0) return;
    const pl = mc.getPlayer(xuid);
    const fm = mc.newSimpleForm();
    fm.setTitle("开始菜单");
    fm.setContent("欢迎来到方屿！");
    fm.addButton("经典单方块", "textures/ui/sword");
    fm.addButton("与在线用户组队", "textures/ui/FriendsIcon");
    pl.sendForm(fm, (pl, arg) => {
        if (arg == null) return sendInit(xuid);
        switch (arg) {
            case 0:
                pl.tell("您选择了「经典单方块」\n正在为您分配，请稍候……");
                const x = returnPos(true);
                const y = randomInt(96, 288);
                const z = returnPos(false);
                pl.setRespawnPosition(x, y + 1, z, 0);
                const timerid = setInterval(() => {
                    if (
                        mc.setBlock(x, y, z, 0, "minecraft:grass", 0) &&
                        mc.setBlock(x, y + 1, z, 0, "minecraft:sapling", 0)
                    )
                        clearInterval(timerid);
                    else pl.teleport(x, y + 1, z, 0);
                }, 50);
                db.set(xuid, {
                    version: "classic",
                    pos: { x: x, y: y, z: z },
                });
                return pl.tell("分配完毕");
            case 1:
                const options = [];
                const xuids = [];
                for (const key of db.listKey()) {
                    if (
                        db.get(key).version == "team" ||
                        db.get(key).version == "spawn" ||
                        !mc.getPlayer(key)
                    )
                        continue;
                    options.push(data.xuid2name(key));
                    xuids.push(key);
                }
                if (options.length <= 0) {
                    pl.tell("§c暂无可组队用户");
                    return sendInit(xuid);
                }
                const fm = mc.newCustomForm();
                fm.setTitle("与在线用户组队");
                fm.addDropdown("选择用户", options);
                pl.sendForm(fm, (pl, args) => {
                    if (!args) return sendInit(xuid);
                    const pl1 = mc.getPlayer(xuids[args[0]]);
                    if (!pl1) {
                        pl.tell(`§c${options[args[0]]}已离线`);
                        return sendInit(xuid);
                    }
                    pl1.sendModalForm(
                        "组队请求",
                        `${pl.realName}请求与您组队`,
                        "同意",
                        "拒绝",
                        (pl1, arg) => {
                            if (!mc.getPlayer(pl.xuid)) return;
                            if (!arg) {
                                pl.tell(`§c与${pl1.realName}的组队请求被拒绝`);
                                return sendInit(xuid);
                            }
                            const d2 = db.get(pl1.xuid);
                            pl.setRespawnPosition(
                                d2.pos.x,
                                d2.pos.y + 1,
                                d2.pos.z,
                                0
                            );
                            pl.teleport(d2.pos.x, d2.pos.y + 1, d2.pos.z, 0);
                            db.set(xuid, { version: "team", pos: d2.pos });
                            pl.tell(`与${pl1.realName}组队成功`);
                        }
                    );
                });
        }
    });
}
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}
function returnPos(isX) {
    let pos = randomInt(-65536, 65535);
    for (const key of db.listKey()) {
        const dt = db.get(key);
        if (
            dt.version == "team" ||
            Math.abs((isX ? dt.pos.x : dt.pos.z) - pos) > 512
        )
            continue;
        pos = returnPos(isX);
    }
    return pos;
}
ll.export(sendInit, "BlockIsland", "sendInit");
