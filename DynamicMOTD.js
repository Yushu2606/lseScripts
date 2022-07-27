"use strict";
ll.registerPlugin("DynamicMOTD", "动态MOTD", [1, 0, 0]);

const config = new JsonConfigFile("plugins\\DynamicMOTD\\config.json");
const interval = config.init("interval", 5);
const motd = config.init("motd", [
    "This is a dynamic MOTD",
    "Powered by DynamicMOTD",
]);
config.close();
let index = 0;
setInterval(() => {
    mc.setMotd(`${process(motd[index])}§r`);
    index = index == motd.length - 1 ? 0 : index + 1;
}, interval * 1000);
function process(str) {
    if (ll.hasExported("AllPlayers", "Get"))
        str = str.replace(/%AllPlayers%/g, ll.import("AllPlayers", "Get")());
    if (ll.hasExported("MostPlayers", "Get"))
        str = str.replace(/%MostPlayers%/g, ll.import("MostPlayers", "Get")());
    return str;
}
