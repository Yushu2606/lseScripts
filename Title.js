"use strict";
ll.registerPlugin("Title", "头衔", [1, 0, 0]);

const db = new KVDatabase("plugins/Title/data");
mc.listen("onServerStarted", () => {
    const addCommand = mc.newCommand("addtitle", "添加头衔。");
    addCommand.mandatory("player", ParamType.Player);
    addCommand.mandatory("title", ParamType.String);
    addCommand.overload(["player", "title"]);
    addCommand.setCallback((_cmd, _ori, out, res) => {
        for (const pl of res.player) {
            pl.rename(`${res.title}\n${pl.realName}`);
            db.set(pl.xuid, res.title);
        }
        return out.success(
            `已为${res.player.length}个玩家添加头衔${res.title}`
        );
    });
    addCommand.setup();
    const removeCommand = mc.newCommand("removetitle", "移除头衔。");
    removeCommand.mandatory("player", ParamType.Player);
    removeCommand.overload(["player"]);
    removeCommand.setCallback((_cmd, _ori, out, res) => {
        for (const pl of res.player) {
            pl.rename(pl.realName);
            db.delete(pl.xuid);
        }
        return out.success(`已为${res.player.length}个玩家移除头衔`);
    });
    removeCommand.setup();
});
mc.listen("onChat", (pl, msg) => {
    const title = db.get(pl.xuid);
    if (!title) return;
    mc.boardcast(`${title ? `[${title}}]` : ""}<${pl.realName}> ${msg}`);
    return false;
});
mc.listen("onJoin", (pl) => {
    const title = db.get(pl.xuid);
    if (!title) return;
    pl.rename(`${title}\n${pl.realName}`);
});
