"use strict";
ll.registerPlugin("RedPacket", "红包", [1, 0, 0]);

const config = new JsonConfigFile("plugins\\RedPacket\\config.json");
const command = config.init("command", "redpacket");
config.close();
const db = new KVDatabase("plugins\\RedPacket\\data");
mc.listen("onServerStarted", () => {
    const cmd = mc.newCommand(command, "打开红包菜单。", PermType.Any);
    cmd.overload();
    cmd.setCallback((_cmd, ori, out, _res) => {
        if (ori.player) return main(ori.player);
        return out.error("commands.generic.noTargetMatch");
    });
    cmd.setup();
});
function main(pl) {
    const fm = mc.newSimpleForm();
    fm.setTitle("红包列表");
    fm.addButton("发送红包");
    const keys = db.listKey();
    for (const key of keys) {
        const rpdata = db.get(key);
        fm.addButton(
            `${
                rpdata.msg ? `信息：${rpdata.msg}` : `发送时间：${rpdata.time}`
            }\n发送者：${data.xuid2name(rpdata.sender)}`
        );
    }
    pl.sendForm(fm, (pl, arg) => {
        if (arg == null) return main(pl);
        switch (arg) {
            case 0:
                if (pl.getLevel() < 1)
                    return pl.tell("§c红包发送失败：余额不足");
                return send(pl);
            default:
                redpacket(pl, db.get(keys[arg - 1]));
        }
    });
}
function redpacket(pl, rpdata) {
    const fm = mc.newSimpleForm();
    fm.setTitle(rpdata.msg || "红包");
    if (
        pl.xuid != rpdata.sender &&
        !(pl.xuid in rpdata.recipient) &&
        rpdata.count > Object.keys(rpdata.recipient).length
    ) {
        rpdata.recipient[pl.xuid] = {
            time: system.getTimeStr(),
        };
        db.set(rpdata.guid, rpdata);
        pl.addExperience(rpdata.level * 7);
        pl.tell(
            `您领取了${data.xuid2name(rpdata.sender)}的红包${rpdata.msg}获得了${
                rpdata.level * 7
            }经验值`
        );
    }
    let text = `发送者：${data.xuid2name(rpdata.sender)}\n发送时间：${
        rpdata.time
    }\n单个数额：${rpdata.level}\n数量：${
        Object.keys(rpdata.recipient).length
    }/${rpdata.count}\n已领取用户：\n`;
    for (const getter in rpdata.recipient)
        text += `${rpdata.recipient[getter].time} ${data.xuid2name(getter)}\n`;
    fm.setContent(text);
    pl.sendForm(fm, main);
}
function send(pl) {
    const fm = mc.newCustomForm();
    fm.setTitle("红包 —— 发送菜单");
    fm.addInput("信息", "字符串");
    const lv = pl.getLevel();
    fm.addSlider("发送数量", 1, lv);
    fm.addSlider("单个数额", 1, lv);
    pl.sendForm(fm, (pl, args) => {
        if (!args) return main(pl);
        const count = args[1] * args[2];
        if (count > pl.getLevel()) return pl.tell("§c红包发送失败：余额不足");
        pl.addLevel(-count);
        const guid = system.randomGuid();
        db.set(guid, {
            guid: guid,
            sender: pl.xuid,
            msg: args[0],
            count: args[1],
            level: args[2],
            time: system.getTimeStr(),
            recipient: {},
        });
        pl.tell(`红包${args[0]}发送成功`);
    });
}
