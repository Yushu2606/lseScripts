"use strict";
ll.registerPlugin("RedPacket", "红包", [1, 0, 0]);

const config = new JsonConfigFile("plugins\\RedPacket\\config.json");
const command = config.init("command", "redpacket");
config.close();
let db = new KVDatabase("plugins\\RedPacket\\data");
mc.listen("onServerStarted", () => {
    const cmd = mc.newCommand(command, "打开红包菜单。");
    cmd.overload();
    cmd.setCallback((_cmd, ori, out, _res) => {
        if (ori.player) return main(ori.player);
        return out.error("commands.generic.noTargetMatch");
    });
    cmd.setup();
});
function main(pl) {
    const fm = mc.newSimpleForm();
    fm.setTitle("红包菜单");
    fm.addButton("红包列表");
    fm.addButton("发送红包");
    pl.sendForm(fm, (pl, arg) => {
        switch (arg) {
            case 0:
                list(pl);
                break;
            case 1:
                const lv = pl.getLevel();
                if (lv < 1) {
                    pl.tell("§c红包发送失败：余额不足");
                    break;
                }
                send(pl, lv);
        }
    });
}
function list(pl) {
    const fm = mc.newSimpleForm();
    fm.setTitle("红包列表");
    for (let key of db.listKey()) {
        const rpdata = db.get(key);
        fm.addButton(
            `${
                rpdata.msg ? `信息：${rpdata.msg}` : `发送时间：${rpdata.time}`
            }\n发送者：${data.xuid2name(rpdata.sender)}`
        );
    }
    pl.sendForm(fm, (pl, arg) => {
        if (arg == null) {
            main(pl);
            return;
        }
        const rpdata = db.get(db.listKey()[arg]);
        redpacket(pl, rpdata);
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
        db.set(rpdata.uuid, rpdata);
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
    for (let getter in rpdata.recipient)
        text += `${rpdata.recipient[getter].time} ${data.xuid2name(getter)}\n`;
    fm.setContent(text);
    pl.sendForm(fm, list);
}
function send(pl, lv) {
    const fm = mc.newCustomForm();
    fm.setTitle("红包 —— 发送菜单");
    fm.addInput("信息", "字符串");
    fm.addSlider("发送数量", 1, lv);
    fm.addSlider("单个数额", 1, lv);
    pl.sendForm(fm, (pl, args) => {
        if (!args) {
            main(pl);
            return;
        }
        const count = args[1] * args[2];
        if (count > pl.getLevel()) {
            pl.tell("§c红包发送失败：余额不足");
            return;
        }
        pl.addLevel(-count);
        const uuid = system.randomGuid();
        db.set(uuid, {
            uuid: uuid,
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
