"use strict";
ll.registerPlugin("ChatHistory", "聊天历史", [1, 0, 0]);

const db = new KVDatabase("plugins\\ChatHistory\\data");
const msgs = db.get("msgs") ?? [];
mc.listen("onChat", (pl, msg) => {
    if (
        ll.hasExported("Chat", "canOutput") &&
        !ll.import("Chat", "canOutput")(pl.xuid, msg)
    )
        return;
    while (msgs.length >= 100) msgs.shift();
    msgs.push({
        xuid: pl.xuid,
        os: pl.getDevice().os,
        msg: msg,
        time: system.getTimeObj(),
    });
    db.set("msgs", msgs);
});
mc.listen("onJoin", (pl) => {
    for (const msg of msgs)
        pl.tell(
            `${msg.time.h}:${msg.time.m < 10 ? 0 : ""}${msg.time.m} ${
                msg.os
            } ${data.xuid2name(msg.xuid)}： ${msg.msg}`
        );
});
