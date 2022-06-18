"use strict";
ll.registerPlugin("CarryContainer", "搬起容器", [1, 0, 0]);

const db = new KVDatabase("plugins\\CarryContainer\\data");
mc.listen("onOpenContainer", (player, block) => {
    const container = block.getContainer();
    if (
        !player.sneaking ||
        !player.getHand().isNull() ||
        block.type.match(/shulker_box/) ||
        !container ||
        container.size > 32
    )
        return;
    if (db.get(player.xuid)) return;
    db.set(player.xuid, {
        block: block.getNbt().toSNBT(),
        blockEntity: block.getBlockEntity().getNbt().toSNBT(),
        name: block.name,
    });
    container.removeAllItems();
    mc.setBlock(block.pos, "minecraft:air");
    return false;
});
mc.listen("onUseItemOn", (player, item, block, side) => {
    const container = db.get(player.xuid);
    if (!item.isNull() || !container) return;
    const pos = mc.newIntPos(
        block.pos.x + (side == 5 ? 1 : side == 4 ? -1 : 0),
        block.pos.y + (side == 1 ? 1 : side == 0 ? -1 : 0),
        block.pos.z + (side == 3 ? 1 : side == 2 ? -1 : 0),
        block.pos.dimid
    );
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
        db.delete(player.xuid);
    }, 50);
    return false;
});
mc.listen("onTick", () => {
    for (let xuid of db.listKey()) {
        const player = mc.getPlayer(xuid);
        if (!player) continue;
        player.tell(`你正在搬运${db.get(xuid).name}`, 5);
    }
});
mc.listen("onMove", (player) => {
    if (!db.get(player.xuid)) return;
    player.setSprinting(false);
});
