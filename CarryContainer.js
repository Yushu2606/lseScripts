/*
English:
    CarryContainer
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
    搬运容器
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
ll.registerPlugin("CarryContainer", "搬运容器", [1, 0, 8]);

const db = new KVDatabase("plugins/CarryContainer/data");
mc.listen("onUseItemOn", (player, item, block, side) => {
    const container = db.get(player.xuid);
    if (!container) {
        if (!block.hasContainer()) return;
        const container = block.getContainer();
        if (
            !player.sneaking ||
            !player.getHand().isNull() ||
            block.type.match("shulker_box") ||
            container.size > 32
        )
            return;
        db.set(player.xuid, {
            block: block.getNbt().toSNBT(),
            blockEntity: block.getBlockEntity().getNbt().toSNBT(),
            name: block.name,
        });
        container.removeAllItems();
        mc.setBlock(block.pos, "minecraft:air");
        return false;
    }
    if (!item.isNull()) return;
    const pos = mc.newIntPos(
        block.pos.x + (side == 5 ? 1 : side == 4 ? -1 : 0),
        block.pos.y + (side == 1 ? 1 : side == 0 ? -1 : 0),
        block.pos.z + (side == 3 ? 1 : side == 2 ? -1 : 0),
        block.pos.dimid
    );
    if (!mc.getBlock(pos).isAir) return;
    const facing = player.direction.toFacing();
    const blockNBT = NBT.parseSNBT(container.block);
    mc.setBlock(
        pos,
        blockNBT.setTag(
            "states",
            blockNBT
                .getTag("states")
                .setInt(
                    "facing_direction",
                    facing + (facing == 0 ? 2 : facing == 1 ? 4 : 1)
                )
        )
    );
    setTimeout(() => {
        mc.getBlock(pos)
            .getBlockEntity()
            .setNbt(NBT.parseSNBT(container.blockEntity));
    }, 50);
    db.delete(player.xuid);
    return false;
});
mc.listen("onTick", () => {
    for (const xuid of db.listKey()) {
        const player = mc.getPlayer(xuid);
        if (!player) continue;
        player.tell(`正在搬运${db.get(xuid).name}`, 5);
    }
});
mc.listen("onChangeSprinting", (pl, isSprinting) => {
    if (db.get(pl.xuid) && isSprinting) player.setSprinting(false);
});
