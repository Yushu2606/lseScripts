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
    mc.setMotd(
        `${
            ll.hasExported("playersCount", "get")
                ? motd[index].replace(
                      /%playerscount%/g,
                      ll.import("playersCount", "get")()
                  )
                : motd[index]
        }§r`
    );
    index = index == motd.length - 1 ? 0 : index + 1;
}, interval * 1000);
