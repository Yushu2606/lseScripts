"use strict";
ll.registerPlugin("TransServer", "传送至服务器", [1, 0, 0]);

const cmd = mc.newCommand("trans", "传送玩家至指定服务器。", PermType.Any);
cmd.mandatory("server", ParamType.String);
cmd.mandatory("port", ParamType.Int);
cmd.optional("player", ParamType.Player);
cmd.overload(["server", "port", "player"]);
cmd.setCallback((_cmd, _ori, out, res) => {
    if (res.player) {
        for (const pl of res.player) {
            pl.transServer(res.server, res.port);
        }
        return;
    }
    if (!ori.player) return out.error("commands.generic.noTargetMatch");
    ori.player.transServer(res.server, res.port);
});
cmd.setup();
