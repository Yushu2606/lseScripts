"use strict";
ll.registerPlugin("DynamicMaxPlayer", "动态最大玩家数", [1, 0, 0]);

mc.listen("onPreJoin", () =>
    mc.setMaxPlayers(mc.getOnlinePlayers().length + 1)
);
mc.listen("onLeft", () => mc.setMaxPlayers(mc.getOnlinePlayers().length));
