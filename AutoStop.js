"use strict";
ll.registerPlugin("AutoStop", "无人时自动关服", [1, 0, 0]);

const config = new JsonConfigFile("plugins\\AutoStop\\config.json");
const command = config.init("command", "autostop");
config.close();
let state = false;
mc.listen("onLeft", () => {
    if (state && mc.getOnlinePlayers().length < 2) mc.runcmdEx("stop");
});
mc.listen("onServerStarted", () => {
    const cmd = mc.newCommand(command, "配置自动关服。", PermType.Console);
    cmd.overload();
    cmd.setCallback((_cmd, _ori, out, _res) =>
        out.success(
            `自动关服已${(state = state ? false : true) ? "启用" : "禁用"}`
        )
    );
    cmd.setup();
});
