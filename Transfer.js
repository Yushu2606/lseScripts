/*
English:
    Transfer
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
    转账
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
ll.registerPlugin("Transfer", "转账", [1, 0, 0]);

const config = new JsonConfigFile("plugins/Transfer/config.json");
const command = config.init("command", "transfer");
const rate = config.init("rate", 0.98);
config.close();
mc.listen("onServerStarted", () => {
    const cmd = mc.newCommand(command, "打开转账菜单。", PermType.Any);
    cmd.overload();
    cmd.setCallback((_cmd, ori, out, _res) => {
        if (ori.player) return main(ori.player);
        return out.error("commands.generic.noTargetMatch");
    });
    cmd.setup();
});
function main(pl) {
    const xp = pl.getCurrentExperience();
    if (xp <= 0) return pl.tell("§c转账失败：余额不足");
    const plsnm = [];
    const plxuid = [];
    for (const pl1 of mc.getOnlinePlayers())
        if (pl1.xuid != pl.xuid) {
            plsnm.push(pl1.realName);
            plxuid.push(pl1.xuid);
        }
    if (plsnm.length <= 0) return pl.tell("§c转账失败：暂无可转账用户");
    const fm = mc.newCustomForm();
    fm.setTitle("转账菜单");
    fm.addDropdown("目标", plsnm);
    fm.addSlider("经验值", 1, xp);
    fm.addLabel(`当前汇率：${rate * 100}％`);
    pl.sendForm(fm, (pl, args) => {
        if (!args) return;
        const plto = mc.getPlayer(plxuid[args[0]]);
        if (!plto) return pl.tell(`§c转账失败：${plsnm[args[0]]}已离线`);
        if (args[1] > pl.getCurrentExperience())
            return pl.tell("§c转账失败：余额不足");
        pl.reduceExperience(args[1]);
        const rlv = Math.round(args[1] * rate);
        plto.reduceExperience(rlv);
        pl.tell(`转账成功：向${plto.realName}转账${args[1]}经验值`);
        plto.tell(`${pl.realName}向您转账${rlv}经验值`);
    });
}
