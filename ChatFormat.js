"use strict";
ll.registerPlugin("ChatFormat", "消息格式化", [1, 0, 0]);

const db = new KVDatabase("plugins\\ChatHistory\\data");
const msgs = db.get("msgs") ?? [];
const rtnMsgs = {};
mc.listen("onChat", (pl, msg) => {
    const xuid = pl.xuid;
    if (!canOutput(xuid, msg)) return false;
    rtnMsgs[xuid].unshift(msg);
    const time = system.getTimeObj();
    mc.broadcast(
        `${time.h}:${time.m < 10 ? 0 : ""}${time.m} ${pl.getDevice().os} ${
            pl.realName
        }： ${msg}`
    );
    setTimeout(() => rtnMsgs[xuid].pop(), 10000);
    while (msgs.length >= 100) msgs.shift();
    msgs.push({
        xuid: pl.xuid,
        os: pl.getDevice().os,
        msg: msg,
        time: system.getTimeObj(),
    });
    db.set("msgs", msgs);
    return false;
});
mc.listen("onJoin", (pl) => {
    for (const msg of msgs)
        pl.tell(
            `${msg.time.h}:${msg.time.m < 10 ? 0 : ""}${msg.time.m} ${
                msg.os
            } ${data.xuid2name(msg.xuid)}： ${msg.msg}`
        );
});
function canOutput(xuid, msg) {
    if (!rtnMsgs[xuid]) rtnMsgs[xuid] = [];
    if (rtnMsgs[xuid].indexOf(msg) > 0) return false;
    return true;
}
