"use strict";
ll.registerPlugin("BlockList", "封禁名单支持", [1, 0, 0]);

let jsonstr = File.readFrom("blocklist.json");
if (!jsonstr) {
    File.writeTo("blocklist.json", (jsonstr = "[]"));
}
let db = data.parseJson(jsonstr);
mc.listen("onServerStarted", () => {
    const cmd = mc.newCommand("blocklist", "封禁用户。", PermType.GameMasters);
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
                let pl = mc.getPlayer(res.player);
                let clientIds = [];
                if (pl) {
                    let device = pl.getDevice();
                    clientIds.push(device.clientId);
                    pl.kick(
                        `§r§b很抱歉，您已§l§c被封禁§r${
                            res.message ? `\n§a信息：§r${res.message}` : ""
                        }§r\n§e如有疑惑请在Telegram联系机器人§r§l@SourceLandFeedbackBot`
                    );
                    out.success("玩家在线，已踢出");
                }
                db.push({
                    name: res.player,
                    xuid: data.name2xuid(res.player),
                    message: res.message,
                    clientIds: clientIds,
                });
                File.writeTo("blocklist.json", (jsonstr = data.toJson(db)));
                return out.success("封禁成功");
            case "remove":
                db = db.filter((item) => {
                    return (
                        item.xuid != data.name2xuid(res.player) ||
                        item.name.toLowerCase() != res.player.toLowerCase()
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
    let device = pl.getDevice();
    for (let blData of db) {
        if (pl.xuid != blData.xuid && blData.clientIds.indexOf(device.clientId) < 0)
            continue;
        pl.kick(
            `§r§b很抱歉，您已§l§c被封禁§r${
                blData.message ? `\n§a信息：§r${blData.message}` : ""
            }§r\n§e如有疑惑请在Telegram联系机器人§r§l@SourceLandFeedbackBot`
        );
        log(`${pl.realName}已被踢出`);
        if (blData.clientIds.indexOf(device.clientId) < 0) {
            let cache = blData;
            cache.clientIds.push(device.clientId);
            db.splice(db.indexOf(blData), 1, cache);
        }
        File.writeTo("blocklist.json", (jsonstr = data.toJson(db)));
        break;
    }
});
