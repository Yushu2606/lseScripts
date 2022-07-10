"use strict";
ll.registerPlugin("NameInfo", "名称信息", [1, 0, 0]);

let msgs = {};
let rtnMsgs = {};
let names = {};
const db = new KVDatabase("plugins\\NameInfo\\data");
mc.listen("onServerStarted", () => {
    const cmd = mc.newCommand("nameinfo", "打开名称信息设置。");
    cmd.overload();
    cmd.setCallback((_cmd, ori, out, _res) => {
        if (ori.player) return setup(ori.player);
        return out.error("commands.generic.noTargetMatch");
    });
    cmd.setup();
});
function setup(pl) {
    let fm = mc.newCustomForm();
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
    for (let pl of mc.getOnlinePlayers()) {
        let dt = db.get(pl.xuid) ?? {};
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
    const name = pl.realName;
    if (!msgs[name]) msgs[name] = [];
    if (!rtnMsgs[name]) rtnMsgs[name] = [];
    if (rtnMsgs[name].indexOf(msg) > -1) return false;
    let time = system.getTimeObj();
    mc.broadcast(
        `${time.h}:${time.m < 10 ? 0 : ""}${time.m} ${
            pl.getDevice().os
        } ${name}： ${msg}`
    );
    msgs[name].push([system.getTimeObj(), msg]);
    rtnMsgs[name].push(msg);
    const xuid = pl.xuid;
    setName(name, xuid);
    setTimeout(() => {
        msgs[name].shift();
        rtnMsgs[name].shift();
        if (mc.getPlayer(name)) setName(name, xuid);
    }, 10000);
    return false;
});
function setName(realName, xuid) {
    let name = "";
    for (let msg of msgs[realName])
        name += `${msg[0].h}:${msg[0].m < 10 ? 0 : ""}${msg[0].m} ${
            msg[1]
        }§r\n`;
    name += realName;
    names[xuid] = name;
}
