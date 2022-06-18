"use strict";
ll.registerPlugin("AutoStop", "无人时自动关服", [1, 0, 0]);

let state = false;
mc.listen("onLeft", () => {
    if (state && mc.getOnlinePlayers().length < 2) {
        mc.runcmdEx("stop");
    }
});
mc.listen("onServerStarted", () => {
    const cmd = mc.newCommand("autostop", "配置自动关服。", PermType.Console);
    cmd.overload();
    cmd.setCallback((_, _, out) => {
        return out.success(
            `自动关服已${(state = state ? false : true) ? "启用" : "禁用"}`
        );
    });
    cmd.setup();
});
