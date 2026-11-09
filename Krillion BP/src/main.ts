import { world, system } from "@minecraft/server"
import { HivemindAPI, ServerStatusResponse } from "api"

import "./ui"

export const api = new HivemindAPI("Krillion", {onConnect: initialConnect, logFailures: false});
const KRILLION_VERSION = 0.1;
const INITIAL_MESSAGE = `§eThanks for installing §6Krillion v${KRILLION_VERSION}\n§pTo get started type §5/function connect\n§7Disable this msg in §d/krillion:settings`;

async function initialConnect() {
    const noUpdateMessage = world.getDynamicProperty("updateMessage") as boolean ?? false;
    if (noUpdateMessage == true) return;
    const updateReq = await api.sendHttpRequest("https://raw.githubusercontent.com/TrayePlays/Krillion/main/version.json");

    if (updateReq.status == ServerStatusResponse.Success) {
        const data = JSON.parse(updateReq.getData()) as { version: number };
        if (data.version > KRILLION_VERSION) {
            world.sendMessage(`\n§cThis version of Krillion is outdated, Please update! §7(/krillion:settings to disable message)`);
        }
    }
}

world.afterEvents.playerSpawn.subscribe(() => {
    if (world.getPlayers().length == 1) {
        system.runTimeout(() => {
            if (world.getDynamicProperty("welcomeMessage") != false) {
                world.sendMessage(INITIAL_MESSAGE);
            }
        }, 60)
    }
})

//reload message
system.run(() => {
    world.sendMessage(`§8[§3Krillion§8] §eReloaded scripts §7(things may break)`);
})