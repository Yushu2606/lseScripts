/*
English:
    SignIn
    Copyright (C) 2023  Hosiyume starsdream00@icloud.com

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
    登录
    版权所有 © 2023  予纾 starsdream00@icloud.com
    本程序是自由软件：你可以根据自由软件基金会发布的GNU Affero通用公共许可证的条款，即许可证的第3版，
    或（您选择的）任何后来的版本重新发布和/或修改它。

    本程序的分发是希望它能发挥价值，但没有做任何保证；甚至没有隐含的适销对路或适合某一特定目的的保证。
    更多细节请参见GNU Affero通用公共许可证。

    您应该已经收到了一份GNU Affero通用公共许可证的副本。如果没有，
    请参阅<https://www.gnu.org/licenses/>（<https://www.gnu.org/licenses/agpl-3.0.html>）
    及其非官方中文翻译<https://www.chinasona.org/gnu/agpl-3.0-cn.html>。
*/

"use strict";
ll.registerPlugin("SignIn", "登录", [1, 0, 0]);

const config = new JsonConfigFile("plugins/SignIn/config.json");
const regexps = config.init("regexps", [
    {
        pattern: ".+",
        message: "密码不能为空",
    },
    {
        pattern: "\n",
        replace: " ",
    },
]);
config.close();
const db = new KVDatabase("plugins/SignIn/data");
const cache = {};
mc.listen("onJoin", (pl) => {
    const psw = db.get(pl.uuid);
    if (psw) {
        cache[pl.uniqueId] = pl.pos;
        return SingIn(pl, psw);
    }
    SingUp(pl);
});
mc.listen("onTick", () => {
    for (const uid in cache) {
        const pl = mc.getPlayer(uid);
        if (!pl) {
            delete cache[uid];
            continue;
        }
        pl.teleport(cache[uid]);
    }
});
function SingIn(pl, psw) {
    pl.sendForm(
        mc.newCustomForm().setTitle("登录").addInput("请输入密码"),
        (pl, args) => {
            if (!args) return SingIn(pl, psw);
            if (args[0] == psw) {
                delete cache[pl.uniqueId];
                return pl.sendToast("登录", "登录成功");
            }
            SingIn(pl, psw);
            pl.sendToast("登录", "密码错误，请重试");
        }
    );
}
function SingUp(pl) {
    pl.sendForm(
        mc.newCustomForm().setTitle("注册").addInput("请输入密码"),
        (pl, args) => {
            if (!args) return SingUp(pl);
            for (const regex of regexps) {
                const reg = new RegExp(regex.pattern, regex.flags);
                if (reg.test(args[0])) continue;
                if (regex.message) {
                    pl.sendToast("注册", regex.message);
                    return SingUp(pl);
                }
                if (regex.replace) args[0].replace(reg, regex.replace);
            }
            db.set(pl.uuid, args[0]);
            pl.sendToast("注册", "注册成功");
        }
    );
}
