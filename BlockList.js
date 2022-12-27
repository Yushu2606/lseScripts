/*
English:
    BlockList
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
    封禁名单支持
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
ll.registerPlugin("BlockList", "封禁名单支持", [1, 0, 0]);

let jsonstr = File.readFrom("blocklist.json");
if (!jsonstr) File.writeTo("blocklist.json", (jsonstr = "[]"));
let db = data.parseJson(jsonstr);
mc.listen("onServerStarted", () => {
    const cmd = mc.newCommand("blocklist", "封禁用户。");
    cmd.setEnum("ChangeAction", ["add", "remove"]);
    cmd.setEnum("OtherAction", ["update"]);
    cmd.mandatory("action", ParamType.Enum, "ChangeAction", 1);
    cmd.mandatory("action", ParamType.Enum, "OtherAction", 1);
    cmd.mandatory("player", ParamType.String);
    cmd.optional("message", ParamType.String);
    cmd.overload(["ChangeAction", "player", "message"]);
    cmd.overload(["OtherAction"]);
    cmd.setCallback((_cmd, _ori, out, res) => {
        switch (res.action) {
            case "add": {
                let has = false;
                for (const blData of db) {
                    if (!blData.names.includes(res.player)) continue;
                    has = true;
                    break;
                }
                if (has) return out.error("已被封禁");
                const pl = mc.getPlayer(res.player);
                if (pl) {
                    pl.kick(
                        `§r§b很抱歉，您已§l§c被封禁§r${
                            res.message ? `\n§a信息：§r${res.message}` : ""
                        }§r\n§e如有疑惑请在Telegram联系机器人§r§l@SourceLandFeedbackBot`
                    );
                    out.success("玩家在线，已踢出");
                }
                const xuid = pl ? pl.xuid : data.name2xuid(res.player);
                db.push({
                    names: [res.player],
                    xuids: xuid ? [] : [xuid],
                    message: res.message ?? "",
                    clientIds: pl ? [] : [pl.getDevice().clientId],
                });
                File.writeTo("blocklist.json", (jsonstr = data.toJson(db)));
                return out.success("封禁成功");
            }
            case "remove": {
                const xuid = data.name2xuid(res.player);
                db = db.filter((item) => {
                    return !(
                        item.xuids.includes(xuid) ||
                        item.names.includes(res.player)
                    );
                });
                File.writeTo("blocklist.json", (jsonstr = data.toJson(db)));
                return out.success("解禁成功");
            }
            case "update": {
                jsonstr = File.readFrom("blocklist.json");
                if (!jsonstr) {
                    File.writeTo("blocklist.json", (jsonstr = "[]"));
                }
                db = data.parseJson(jsonstr);
                return out.success("更新成功");
            }
        }
    });
    cmd.setup();
});
mc.listen("onPreJoin", (pl) => {
    const device = pl.getDevice();
    for (const blData of db) {
        if (
            !blData.xuids.includes(pl.xuid) &&
            !blData.clientIds.includes(device.clientId)
        )
            continue;
        pl.kick(
            `§r§b很抱歉，您已§l§c被封禁§r${
                blData.message ? `\n§a信息：§r${blData.message}` : ""
            }§r\n§e如有疑惑请在Telegram联系机器人§r§l@SourceLandFeedbackBot`
        );
        fastLog(`${pl.realName}在尝试进入时被阻止`);
        const cache = blData;
        if (!blData.names.includes(pl.realName)) cache.names.push(pl.realName);
        if (!blData.xuids.includes(pl.xuid)) cache.xuids.push(pl.xuid);
        if (!blData.clientIds.includes(device.clientId))
            cache.clientIds.push(device.clientId);
        db[db.indexOf(blData)] = cache;
        File.writeTo("blocklist.json", (jsonstr = data.toJson(db)));
        break;
    }
});
