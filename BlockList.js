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
            case "add":
                let has = false;
                for (const blData of db) {
                    if (blData.names.indexOf(res.player) < 0) continue;
                    has = true;
                    break;
                }
                if (has) return out.error("已被封禁");
                const pl = mc.getPlayer(res.player);
                const clientIds = [];
                if (pl) {
                    clientIds.push(pl.getDevice().clientId);
                    pl.kick(
                        `§r§b很抱歉，您已§l§c被封禁§r${
                            res.message ? `\n§a信息：§r${res.message}` : ""
                        }§r\n§e如有疑惑请在Telegram联系机器人§r§l@SourceLandFeedbackBot`
                    );
                    out.success("玩家在线，已踢出");
                }
                db.push({
                    names: [res.player],
                    xuids: [data.name2xuid(res.player)],
                    message: res.message,
                    clientIds: clientIds,
                });
                File.writeTo("blocklist.json", (jsonstr = data.toJson(db)));
                return out.success("封禁成功");
            case "remove":
                db = db.filter((item) => {
                    return (
                        item.xuids.indexOf(data.name2xuid(res.player)) < 0 ||
                        item.names.indexOf(res.player.toLowerCase()) < 0
                    );
                });
                File.writeTo("blocklist.json", (jsonstr = data.toJson(db)));
                return out.success("解禁成功");
            case "update":
                jsonstr = File.readFrom("blocklist.json");
                if (!jsonstr) {
                    File.writeTo("blocklist.json", (jsonstr = "[]"));
                }
                db = data.parseJson(jsonstr);
                return out.success("更新成功");
        }
    });
    cmd.setup();
});
mc.listen("onPreJoin", (pl) => {
    const device = pl.getDevice();
    for (const blData of db) {
        if (
            blData.xuids.indexOf(pl.xuid) < 0 &&
            blData.clientIds.indexOf(device.clientId) < 0
        )
            continue;
        pl.kick(
            `§r§b很抱歉，您已§l§c被封禁§r${
                blData.message ? `\n§a信息：§r${blData.message}` : ""
            }§r\n§e如有疑惑请在Telegram联系机器人§r§l@SourceLandFeedbackBot`
        );
        fastLog(`${pl.realName}在尝试进入时被阻止`);
        const cache = blData;
        if (blData.names.indexOf(pl.realName) < 0)
            cache.names.push(pl.realName);
        if (blData.xuids.indexOf(pl.xuid) < 0) cache.xuids.push(pl.xuid);
        if (blData.clientIds.indexOf(device.clientId) < 0)
            cache.clientIds.push(device.clientId);
        db.splice(db.indexOf(blData), 1, cache);
        File.writeTo("blocklist.json", (jsonstr = data.toJson(db)));
        break;
    }
});
