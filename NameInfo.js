"use strict";
ll.registerPlugin("NameInfo", "名称信息", [1, 0, 0]);

const msgs = {};
const names = {};
const db = new KVDatabase("plugins\\NameInfo\\data");
mc.listen("onServerStarted", () => {
    const cmd = mc.newCommand("nameinfo", "打开名称信息设置。", PermType.Any);
    cmd.overload();
    cmd.setCallback((_cmd, ori, out, _res) => {
        if (ori.player) return setup(ori.player);
        return out.error("commands.generic.noTargetMatch");
    });
    cmd.setup();
});
function setup(pl) {
    const fm = mc.newCustomForm();
    fm.setTitle("名称信息 - 设置");
    fm.addSwitch("显示血量");
    fm.addSwitch("显示延迟");
    fm.addSwitch("显示丢包率");
    pl.sendForm(fm, (pl, args) => {
        if (!args) return;
        db.set(pl.xuid, {
            showHealth: args[0],
            showPing: args[1],
            showPacketLoss: args[2],
        });
        pl.tell("名称信息修改成功");
    });
}
mc.listen("onTick", () => {
    for (const pl of mc.getOnlinePlayers()) {
        const dt = db.get(pl.xuid) ?? {};
        const device = pl.getDevice();
        pl.rename(
            `${names[pl.xuid] ?? pl.realName}${
                dt.showHealth ? `\n血量 ${pl.health}/${pl.maxHealth}` : ""
            }${dt.showPing ? `\n延迟 ${device.avgPing}毫秒` : ""}${
                dt.showPing ? `\n丢包率 ${device.avgPacketLoss}％` : ""
            }`
        );
    }
});
mc.listen("onChat", (pl, msg) => {
    const xuid = pl.xuid;
    if (!msgs[xuid]) msgs[xuid] = [];
    msgs[xuid].push([system.getTimeObj(), msg]);
    const name = pl.realName;
    setName(xuid, name);
    setTimeout(() => {
        msgs[xuid].shift();
        if (mc.getPlayer(xuid)) setName(xuid, name);
    }, 10000);
});
function setName(xuid, realName) {
    let name = "";
    for (const msg of msgs[xuid])
        name += `${msg[0].h}:${msg[0].m < 10 ? 0 : ""}${msg[0].m} ${
            msg[1]
        }§r\n`;
    name += realName;
    names[xuid] = name;
}
