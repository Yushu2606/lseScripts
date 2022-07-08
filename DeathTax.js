"use strict";
ll.registerPlugin("DeathTax", "死亡税", [1, 0, 0]);

const conf = new JsonConfigFile("plugins\\DeathTax\\config.json");
const tax = conf.init("tax", [0, 3]);
conf.close();
mc.listen("onPlayerDie", (pl) => {
    let level = pl.getLevel();
    if (level < 1) return;
    const condition = Math.floor(tax[1] + tax[1] * level * 0.02);
    let reduce = Math.round(Math.random() * (tax[0] - condition) + condition);
    pl.addLevel(-(reduce = level < reduce ? level : reduce));
    pl.tell(`扣除${reduce}级经验`);
});
