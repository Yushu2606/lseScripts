"use strict";
ll.registerPlugin("HubInfo", "信息栏", [1, 0, 0]);

const config = new JsonConfigFile("plugins\\HubInfo\\config.json");
const serverName = config.init("serverName", "");
config.close();
const db = new KVDatabase("plugins\\HubInfo\\data");
let ticks = [];
let realTPMS = 0;
let newTick = Date.now();
const next = {};
mc.listen("onTick", () => {
    const oldTick = newTick;
    newTick = Date.now();
    ticks.push(newTick - oldTick);
});
setInterval(() => {
    let tickPlus = 0;
    for (const tick of ticks) tickPlus += tick;
    realTPMS = tickPlus / ticks.length;
    ticks = [];
    const tps = 1000 / realTPMS;
    if (Math.round(tps) < 20) log(`当前TPS：${tps}`);
    for (const pl of mc.getOnlinePlayers()) {
        pl.removeSidebar();
        pl.removeBossBar(0);
        const pldv = pl.getDevice();
        const list = {};
        list[
            `负载：§${
                tps > 18
                    ? "a"
                    : tps > 14
                    ? "e"
                    : tps > 9
                    ? "c"
                    : tps > 5
                    ? "4"
                    : 0
            }${tps == Math.round(tps) ? "" : "~"}${Math.abs(
                Math.floor(100 - tps / 0.2)
            )}％`
        ] = 0;
        list[
            `延迟：§${
                pldv.lastPing < 30
                    ? "a"
                    : pldv.lastPing < 50
                    ? "e"
                    : pldv.lastPing < 100
                    ? "c"
                    : pldv.lastPing < 200
                    ? "4"
                    : pldv.lastPing < 500
                    ? 0
                    : "b"
            }${pldv.lastPing}毫秒`
        ] = 0;
        list[
            `丢包：§${pldv.lastPacketLoss > 1 ? "c" : "a"}${
                pldv.lastPacketLoss == Math.round(pldv.lastPacketLoss)
                    ? ""
                    : "~"
            }${Math.round(pldv.lastPacketLoss)}％`
        ] = 0;
        list[
            `经验：${pl.getCurrentExperience()}/${pl.getTotalExperience()}`
        ] = 0;
        switch (db.get(pl.xuid)) {
            case 0:
                continue;
            case 1:
                pl.setSidebar(
                    `${pl.realName}·§${
                        "1234567890abcdefglmno"[Math.floor(Math.random() * 21)]
                    }${serverName}`,
                    list
                );
                break;
            case 2:
                list[
                    `${pl.realName}·§${
                        "1234567890abcdefglmno"[Math.floor(Math.random() * 21)]
                    }${serverName}`
                ] = 0;
                const step = 25;
                if (!(pl in next)) next[pl] = -step;
                const index = Math.floor(
                    (next[pl] = next[pl] < 300 - step ? next[pl] + step : 0) /
                        100
                );
                pl.setBossBar(
                    0,
                    Object.keys(list)[index],
                    next[pl] % 100,
                    index
                );
        }
    }
}, 1000);
mc.listen("onServerStarted", () => {
    const cmd = mc.newCommand("hubinfo", "打开信息栏设置。", PermType.Any);
    cmd.overload();
    cmd.setCallback((_cmd, ori, out, _res) => {
        if (ori.player) return setup(ori.player);
        return out.error("commands.generic.noTargetMatch");
    });
    cmd.setup();
});
function setup(pl) {
    const fm = mc.newCustomForm();
    fm.setTitle("信息栏 - 设置");
    fm.addStepSlider("位置", ["关闭", "计分板", "血条"], db.get(pl.xuid) ?? 0);
    pl.sendForm(fm, (pl, args) => {
        if (!args) return;
        const old = db.get(pl.xuid);
        if (args[0] == old) return;
        db.set(pl.xuid, args[0]);
        pl.tell(
            `信息栏${args[0] ? (old ? "状态修改成功" : "已启用") : "已禁用"}`
        );
    });
}
