/*
English:
    SLULA
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
    用户协议
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
ll.registerPlugin("SLULA", "用户协议", [1, 0, 0]);

const config = new JsonConfigFile("plugins/SLULA/config.json");
const server = config.init("server", 0);
config.close();
const db = new KVDatabase("plugins/SLULA/data");
mc.listen("onJoin", (pl) => {
    if (db.get(pl.xuid)) {
        if (server) ll.import("BlockIsland", "sendInit")(pl.xuid);
        return;
    }
    pl.sendModalForm(
        "源域用户协议",
        "前言\n感谢您游玩源域服务器组！\n本服务器组与Mojang及其母公司Microsoft无任何关联。\n\n重要须知\n一、用户在使用本服务器组提供的服务前，请仔细阅读本协议中的各项条款。\n二、如用户不同意本协议的任何条款，则不得使用本服务器组提供的服务。一旦用户使用本服务器组提供的服务，则视为用户完全同意本条款的全部内容。\n三、本服务器组有权利依据本协议剥夺用户的受服务权。\n四、本服务器组有更改本协议的权利。\n五、未圈地的区域默认为公有。若需要保护资源，请圈地。\n\n规则\n一、您的一切行为必须符合中华人民共和国的相关法律。\n二、您的一切行为必须符合《Minecraft最终用户协议》。\n三、不得以任何理由利用游戏漏洞或进行恶意行为。\n四、不得散布谣言或冒充他人。\n五、不得用损害他人游玩体验的方式谋取利益。\n六、除非管理人员允许，否则不得进行任何与本服无关的宣传行为。",
        "拒绝",
        "接受",
        (pl, arg) => {
            if (arg)
                return pl.kick(
                    "§l§4未同意用户协议，请勿使用本服提供的任何服务！"
                );
            db.set(pl.xuid, true);
            for (const player of mc.getOnlinePlayers()) {
                if (player.xuid == pl.xuid) continue;
                player.sendToast(
                    ["源域", "方屿"][server],
                    `欢迎${pl.realName}加入了我们！`
                );
            }
            if (server) ll.import("BlockIsland", "sendInit")(pl.xuid);
        }
    );
});
