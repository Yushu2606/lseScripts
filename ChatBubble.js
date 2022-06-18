"use strict";
ll.registerPlugin("ChatBubble", "聊天气泡", [1, 0, 0]);

let msgs = {};
let rtnMsgs = {};
mc.listen("onChat", (pl, msg) => {
    let name = pl.realName;
    if (!msgs[name]) msgs[name] = [];
    if (!rtnMsgs[name]) rtnMsgs[name] = [];
    if (rtnMsgs[name].indexOf(msg) > -1) return false;
    let time = system.getTimeObj();
    mc.broadcast(
        `${time.h}:${time.m < 10 ? 0 : ""}${time.m} | ${
            pl.getDevice().os
        } <${name}> ${msg}`
    );
    msgs[name].push([system.getTimeObj(), msg]);
    rtnMsgs[name].push(msg);
    setName(name);
    setTimeout(() => {
        msgs[name].shift();
        rtnMsgs[name].shift();
        if (mc.getPlayer(name)) setName(name);
    }, 10000);
    return false;
});
function setName(realName) {
    let name = "";
    for (let msg of msgs[realName])
        name += `${msg[0].h}:${msg[0].m < 10 ? 0 : ""}${msg[0].m} > ${
            msg[1]
        }\n`;
    name += realName;
    let pl = mc.getPlayer(realName);
    if (pl) pl.rename(name);
}
