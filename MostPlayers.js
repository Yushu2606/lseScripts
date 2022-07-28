"use strict";
ll.registerPlugin("MostPlayers", "最多同时在线人数API", [1, 0, 0]);

const db = new KVDatabase("plugins\\MostPlayers\\data");
mc.listen("onJoin", (_) => {
    const plcount = mc.getOnlinePlayers().length;
    if (db.get("Count") ?? 0 < plcount) db.set("Count", plcount);
});
ll.export(() => db.get("Count") ?? 0, "MostPlayers", "Get");
