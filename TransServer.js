/*
English:
    TransServer
    Copyright (C) 2023  StarsDream00 starsdream00@icloud.com

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
    传送至服务器
    版权所有 © 2023  星梦喵吖 starsdream00@icloud.com
    本程序是自由软件：你可以根据自由软件基金会发布的GNU Affero通用公共许可证的条款，即许可证的第3版，
    或（您选择的）任何后来的版本重新发布和/或修改它。

    本程序的分发是希望它能发挥价值，但没有做任何保证；甚至没有隐含的适销对路或适合某一特定目的的保证。
    更多细节请参见GNU Affero通用公共许可证。

    您应该已经收到了一份GNU Affero通用公共许可证的副本。如果没有，
    请参阅<https://www.gnu.org/licenses/>（<https://www.gnu.org/licenses/agpl-3.0.html>）
    及其非官方中文翻译<https://www.chinasona.org/gnu/agpl-3.0-cn.html>。
*/

"use strict";
ll.registerPlugin("TransServer", "传送至服务器", [1, 0, 0]);

const cmd = mc.newCommand("trans", "传送玩家至指定服务器。", PermType.Any);
cmd.mandatory("server", ParamType.String);
cmd.mandatory("port", ParamType.Int);
cmd.optional("player", ParamType.Player);
cmd.overload(["server", "port", "player"]);
cmd.setCallback((_cmd, _ori, out, res) => {
    if (res.player) {
        for (const pl of res.player) {
            pl.transServer(res.server, res.port);
        }
        return;
    }
    if (!ori.player) return out.error("commands.generic.noTargetMatch");
    ori.player.transServer(res.server, res.port);
});
cmd.setup();
