"use strict";
ll.registerPlugin("Menu", "菜单", [1, 0, 0]);

const config = new JsonConfigFile("plugins\\Menu\\config.json");
const itemType = config.init("itemType", { "minecraft:clock": "main" });
const commands = config.init("commands", { main: "menu" });
config.close();
mc.listen("onUseItem", (pl, it) => {
    if (it.type in itemType) menu(pl, itemType[it.type]);
});
mc.listen("onServerStarted", () => {
    for (const command in commands) {
        const menus = new JsonConfigFile(
            `plugins\\Menu\\menus\\${command}.json`,
            data.toJson({}, 4)
        );
        const title = menus.get("title", "菜单。");
        menus.close();
        const cmd = mc.newCommand(commands[command], title, PermType.Any);
        cmd.overload();
        cmd.setCallback((_cmd, ori, out, _res) => {
            if (ori.player) return menu(ori.player, command);
            return out.error("commands.generic.noTargetMatch");
        });
        cmd.setup();
    }
});

function menu(pl, mu) {
    const menus = new JsonConfigFile(
        `plugins\\Menu\\menus\\${mu}.json`,
        data.toJson({}, 4)
    );
    const title = menus.get("title", "");
    const contents = menus.get("contents", []);
    const buttons = menus.get("buttons", []);
    const back = menus.get("back", "");
    menus.close();
    const fm = mc.newSimpleForm();
    fm.setTitle(title);
    if (contents.length > 0)
        fm.setContent(contents[Math.floor(Math.random() * contents.length)]);
    for (const bt of buttons) {
        if (bt.opOnly && !pl.isOP()) continue;
        fm.addButton(bt.text, bt.image ? bt.image : "");
    }
    pl.sendForm(fm, (pl, arg) => {
        if (arg == null) {
            if (!back) return;
            return menu(pl, back);
        }
        if (buttons[arg].run)
            for (const cmd of buttons[arg].run) {
                if (cmd.opOnly && !pl.isOP()) continue;
                mc.runcmdEx(cmd.command.replace(/@s/, `"${pl.realName}"`));
            }
        if (buttons[arg].runas)
            for (const cmd of buttons[arg].runas) {
                if (cmd.opOnly && !pl.isOP()) continue;
                pl.runcmd(cmd.command);
            }
        if (!buttons[arg].menu || (buttons[arg].menu.opOnly && !pl.isOP()))
            return;
        menu(pl, buttons[arg].menu);
    });
}
