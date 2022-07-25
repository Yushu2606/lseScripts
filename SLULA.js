"use strict";
ll.registerPlugin("SLULA", "用户协议", [1, 0, 0]);

const config = new JsonConfigFile("plugins\\SLULA\\config.json");
const server = config.init("server", 0);
config.close();
const db = new KVDatabase("plugins\\SLULA\\data");
mc.listen("onJoin", (pl) => {
    if (db.get(pl.xuid)) return;
    pl.sendModalForm(
        "源域用户协议",
        "前言\n感谢您游玩源域服务器组！\n本服务器组与Mojang及其母公司Microsoft无任何关联。\n\n重要须知\n一、用户在使用本服务器组提供的服务前，请仔细阅读本协议中的各项条款。\n二、如用户不同意本协议的任何条款，则不得使用本服务器组提供的服务。一旦用户使用本服务器组提供的服务，则视为用户完全同意本条款的全部内容。\n三、本服务器组有权利依据本协议剥夺用户的受服务权。\n四、本服务器组有更改本协议的权利。\n\n规则\n一、您的一切行为必须符合中华人民共和国的相关法律。\n二、您的一切行为必须符合《Minecraft最终用户协议》。\n三、不得以任何理由利用游戏漏洞或进行恶意行为。\n四、不得散布谣言或冒充他人。\n五、除非管理人员允许，否则禁止进行任何宣传行为。",
        "拒绝",
        "接受",
        (pl, arg) => {
            if (!arg) {
                db.set(pl.xuid, true);
                for (const player of mc.getOnlinePlayers()) {
                    if (player.xuid == pl.xuid) continue;
                    player.sendToast(
                        ["源域", "方屿"][server],
                        `欢迎${pl.realName}加入了我们！`
                    );
                }
                if (server) ll.import("BlockIsland", "sendInit")();
            } else pl.kick("§l§4未同意用户协议，请勿使用本服提供的任何服务！");
        }
    );
});
ll.export(() => db.listKey().length, "playersCount", "get");
