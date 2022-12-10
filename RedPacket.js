/*
English:
    RedPacket
    Copyright (C) 2022  StarsDream00 starsdream00@icloud.com

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.

中文：
    红包
    版权所有 © 2022  星梦喵吖 starsdream00@icloud.com
    本程序是自由软件：你可以根据自由软件基金会发布的GNU Affero通用公共许可证的条款，即许可证的第3版，
    或（您选择的）任何后来的版本重新发布和/或修改它。

    本程序的分发是希望它能发挥价值，但没有做任何保证；甚至没有隐含的适销对路或适合某一特定目的的保证。
    更多细节请参见GNU Affero通用公共许可证。

    您应该已经收到了一份GNU Affero通用公共许可证的副本。如果没有，
    请参阅<https://www.gnu.org/licenses/>（<https://www.gnu.org/licenses/agpl-3.0.html>）
    及其非官方中文翻译<https://www.chinasona.org/gnu/agpl-3.0-cn.html>。
*/

"use strict";
ll.registerPlugin("RedPacket", "红包", [1, 0, 0]);

const config = new JsonConfigFile("plugins/RedPacket/config.json");
const command = config.init("command", "redpacket");
config.close();
const db = new KVDatabase("plugins/RedPacket/data");
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
                rpdata.count > Object.keys(rpdata.recipient).length
                    ? pl.xuid in rpdata.recipient
                        ? "（已领过）"
                        : ""
                    : "（已领完）"
            }${
                rpdata.msg ? `信息：${rpdata.msg}` : `发送时间：${rpdata.time}`
            }\n发送者：${data.xuid2name(rpdata.sender)}`
        );
    }
    pl.sendForm(fm, (pl, arg) => {
        if (arg == null) return;
        switch (arg) {
            case 0:
                if (pl.getLevel() <= 0)
                    return pl.tell("§c红包发送失败：余额不足");
                return send(pl);
            default:
                redpacket(pl, keys[arg - 1]);
        }
    });
}
function redpacket(pl, key) {
    const rpdata = db.get(key);
    const fm = mc.newSimpleForm();
    fm.setTitle(rpdata.msg || "红包");
    if (
        pl.xuid != rpdata.sender &&
        !(pl.xuid in rpdata.recipient) &&
        rpdata.count > Object.keys(rpdata.recipient).length
    ) {
        rpdata.recipient[pl.xuid] = { time: system.getTimeStr() };
        db.set(key, rpdata);
        pl.addExperience(rpdata.level);
        pl.tell(
            `您领取了${data.xuid2name(rpdata.sender)}的红包${rpdata.msg}获得了${
                rpdata.level
            }经验值`
        );
    }
    let text = `发送者：${data.xuid2name(rpdata.sender)}\n发送时间：${
        rpdata.time
    }\n单个数额：${rpdata.level}经验\n数量：${
        Object.keys(rpdata.recipient).length
    }/${rpdata.count}\n已领取用户：\n`;
    for (const getter in rpdata.recipient)
        text += `${rpdata.recipient[getter].time} ${data.xuid2name(getter)}\n`;
    fm.setContent(text);
    pl.sendForm(fm, main);
}
function send(pl) {
    const fm = mc.newCustomForm();
    fm.setTitle("发送红包");
    fm.addInput("信息", "字符串");
    const xp = pl.getCurrentExperience();
    fm.addSlider("发送数量", 1, xp);
    fm.addSlider("单个数额", 1, xp);
    pl.sendForm(fm, (pl, args) => {
        if (!args) return main(pl);
        const count = args[1] * args[2];
        if (count > pl.getCurrentExperience())
            return pl.tell("§c红包发送失败：余额不足");
        pl.reduceExperience(count);
        const guid = system.randomGuid();
        db.set(guid, {
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
