"use strict";
ll.registerPlugin("BlockIslandAllocation", "岛屿分配系统", [1, 0, 0]);

const db = new KVDatabase("plugins\\BlockIsland\\data");
if (db.listKey().indexOf("spawn") < 0)
    db.set("spawn", { version: "spawn", pos: { x: 0, y: -64, z: 0 } });
mc.listen("onJoin", (pl) => {
    if (db.listKey().indexOf(pl.xuid) > -1) return;
    sendInit(pl);
});
mc.listen("onPlaceBlock", (pl, bl) => {
    if (
        (bl.pos.x < 512 && bl.pos.x > -512) ||
        (bl.pos.z < 512 && bl.pos.z > -512)
    ) {
        pl.tell("你不能操作这片区域");
        return false;
    }
});
mc.listen("onDestroyBlock", (pl, bl) => {
    let re = true;
    for (const key of db.listKey()) {
        const island = db.get(key);
        if (
            island.pos.x != bl.pos.x ||
            island.pos.y != bl.pos.y ||
            island.pos.z != bl.pos.z
        )
            continue;
        re = false;
        pl.tell(
            `§c你不能破坏${
                pl.xuid == key ? "你自己" : data.xuid2name(key)
            }的核心方块`,
            4
        );
        break;
    }
    return re;
});
function sendInit(pl) {
    const fm = mc.newSimpleForm();
    fm.setTitle("开始菜单");
    fm.setContent("欢迎来到方屿！");
    fm.addButton("经典单方块", "textures/ui/sword");
    fm.addButton("与在线用户组队", "textures/ui/FriendsIcon");
    pl.sendForm(fm, (pl, arg) => {
        if (arg == null) return sendInit(pl);
        switch (arg) {
            case 0:
                pl.tell("您选择了「经典单方块」\n正在为您分配，请稍候……");
                const x = returnPos(true);
                const y = randomInt(96, 288);
                const z = returnPos(false);
                pl.setRespawnPosition(x, y + 1, z, 0);
                const timerid = setInterval(() => {
                    if (
                        mc.setBlock(x, y, z, 0, "minecraft:grass", 0) &&
                        mc.setBlock(x, y + 1, z, 0, "minecraft:sapling", 0)
                    )
                        clearInterval(timerid);
                    else pl.teleport(x, y + 1, z, 0);
                }, 50);
                db.set(pl.xuid, {
                    version: "classic",
                    pos: { x: x, y: y, z: z },
                });
                return pl.tell("分配完毕");
            case 1:
                const options = [];
                for (const key of db.listKey()) {
                    if (
                        db.get(key).version == "team" ||
                        db.get(key).version == "spawn" ||
                        !mc.getPlayer(key)
                    )
                        continue;
                    options.push(data.xuid2name(key));
                }
                if (options.length < 1) {
                    pl.tell("§c暂无可组队用户");
                    return sendInit(pl);
                }
                const fm = mc.newCustomForm();
                fm.setTitle("与在线用户组队");
                fm.addDropdown("选择用户", options);
                pl.sendForm(fm, (pl, args) => {
                    if (!args) return sendInit(pl);
                    const pl1 = mc.getPlayer(options[args[0]]);
                    if (!pl1) {
                        pl.tell(`§c${options[args[0]]}已离线`);
                        return sendInit(pl);
                    }
                    pl1.sendModalForm(
                        "组队请求",
                        `${pl.realName}请求与您组队`,
                        "同意",
                        "拒绝",
                        (pl1, arg) => {
                            if (!mc.getPlayer(pl.realName)) return;
                            if (!arg) {
                                pl.tell(`§c与${pl1.realName}的组队请求被拒绝`);
                                return sendInit(pl);
                            }
                            const d2 = db.get(pl1.xuid);
                            pl.setRespawnPosition(
                                d2.pos.x,
                                d2.pos.y + 1,
                                d2.pos.z,
                                0
                            );
                            pl.teleport(d2.pos.x, d2.pos.y + 1, d2.pos.z, 0);
                            db.set(pl.xuid, { version: "team", pos: d2.pos });
                            pl.tell(`与${pl1.realName}组队成功`);
                        }
                    );
                });
        }
    });
}
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}
function returnPos(isX) {
    let pos = randomInt(-65536, 65535);
    for (const key of db.listKey()) {
        const dt = db.get(key);
        if (
            dt.version == "team" ||
            Math.abs((isX ? dt.pos.x : dt.pos.z) - pos) < islandRadius
        )
            continue;
        pos = returnPos(isX);
    }
    return pos;
}
