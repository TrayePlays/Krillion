import { Dimension, EnchantmentType, EquipmentSlot, ItemLockMode, ItemStack, Player, system, Vector3, world } from "@minecraft/server";
import { ServerStatusResponse } from "api";
import { api } from "main";

export let overworld: Dimension

world.afterEvents.worldLoad.subscribe(() => {
    overworld = world.getDimension("overworld")
})

// Actual game stuff

export interface Prompts {
    date: string;
    dayNumber: number;
    resetsAt: string;
    prompts: Prompt[];
}

export type Tier = "nocatch" | "plankton" | "schooler" | "rare" | "deepcut" | "krillion"

export const formattedTiers = {
    "nocatch": "No Catch",
    "plankton": "Plankton",
    "schooler": "Schooler",
    "rare": "Rare",
    "deepcut": "Deep Cut",
    "krillion": "Krillion"
}

export const scorePictures = {
    "nocatch": "/textures/ui/realms_red_x.png",
    "plankton": "/textures/blocks/dirt.png",
    "schooler": "/textures/blocks/stone.png",
    "rare": "/textures/items/iron_ingot.png",
    "deepcut": "/textures/items/gold_ingot.png",
    "krillion": "/textures/items/krillion.png"
}

export const scoreColors = {
    "nocatch": "7",
    "plankton": "9",
    "schooler": "a",
    "rare": "b",
    "deepcut": "c",
    "krillion": "6"
}

interface Prompt {
    id: string;
    text: string;
}

type Answer = CorrectAnswer | IncorrectAnswer

interface CorrectAnswer {
    accepted: true;
    answer: string;
    tier: Tier;
    score: number;
}

interface IncorrectAnswer {
    accepted: false;
    correction?: string;
    receipt: string;
}

export async function getTodayPrompts(): Promise<Prompts | undefined> {
    const promptsReq = await api.sendHttpRequest("https://krillion.io/api/today");

    if (promptsReq.status != ServerStatusResponse.Success) return;

    return promptsReq.getData() as Prompts;
}

export async function tryAnswer(answer: string, promptId: string, autoCorrect = true): Promise<Answer> {
    const answerReq = await api.sendHttpRequest("https://krillion.io/api/submit", {
        credentials: "omit",
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:159.0) Gecko/20100101 Firefox/159.0",
            "Accept": "*/*",
            "Accept-Language": "en-US,en;q=0.9",
            "Sec-GPC": "1",
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "no-cors",
            "Sec-Fetch-Site": "same-origin",
            "Content-Type": "application/json",
            "Priority": "u=0",
            "Pragma": "no-cache",
            "Cache-Control": "no-cache"
        },
        "referrer": "https://krillion.io/",
        "mode": "cors",
        method: "POST",
        body: JSON.stringify({
            answer,
            date: formatDate(),
            playerId: generateUUID(),
            previewCorrection: true,
            promptId
        })
    })
    if (answerReq.status != ServerStatusResponse.Success) return { accepted: false, receipt: "" }
    const a = answerReq.getData() as Answer;
    if (a.accepted == false && a.correction != undefined && autoCorrect) return tryAnswer(a.correction, promptId);
    return a;

}

export function getQuestion(prompts: Prompts, index: number) {
    return prompts.prompts.find(p => p.id == `p${index}`)?.text ?? "Unknown";
}

export interface Stat {
    date: string;
    attempt: number;
    data: { prompts: string[], answers: string[], tiers: Tier[] };
}

export function getStats(player: Player) {
    const stats: Stat[] = [];

    for (const dp of player.getDynamicPropertyIds().filter(dp => dp.startsWith("stats|"))) {
        const [label, date, attempt] = dp.split("|")
        const raw = player.getDynamicProperty(dp) as string;
        const stat = JSON.parse(raw) as { prompts: string[], answers: string[], tiers: Tier[] };

        stats.push({
            date,
            attempt: Number(attempt),
            data: stat
        });
    }

    console.warn(`Got stats: ${JSON.stringify(stats)}`);

    return stats;
}

export function saveStats(player: Player, stat: Stat) {
    console.warn(`Set stats|${stat.date}|${stat.attempt} to ${JSON.stringify(stat.data)}`);
    player.setDynamicProperty(
        `stats|${stat.date}|${stat.attempt}`,
        JSON.stringify(stat.data)
    )
}

// the rest

export function generateUUID(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
        const random = Math.floor(Math.random() * 16);
        const value = char === "x" ? random : (random & 0x3) | 0x8;
        return value.toString(16);
    });
}

export function formatDate() {
    const date = new Date()
    date.setHours(date.getHours() - 5)
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = String(date.getFullYear());
    return `${year}-${month}-${day}`;
}

export async function sleep(ticks: number) {
    await system.waitTicks(ticks);
    return;
}

export function formatTypeId(typeId: string) {
    if (typeId.includes("minecraft:")) {
        let formattedString = typeId.split("minecraft:")[1].split("_").map(word => {
            return word.charAt(0).toUpperCase() + word.slice(1);
        }).join(" ");
        return formattedString;
    }
    if (typeId.includes("traye:")) {
        let formattedString = typeId.split("traye:")[1].split("_").map(word => {
            return word.charAt(0).toUpperCase() + word.slice(1);
        }).join(" ");
        return formattedString;
    }
    else {
        let formattedString = typeId.split("_").map(word => {
            return word.charAt(0).toUpperCase() + word.slice(1);
        }).join(" ");
        return formattedString;
    }
}

export function addItem(player: Player, itemId: string, amount: number = 1, itemSlot?: number, nameTag?: string, lore?: string[], lockMode: ItemLockMode = ItemLockMode.none, destroyBlocks?: string[], equipmentSlot?: EquipmentSlot, enchantments?: { type: string, level: number }) {
    const item = new ItemStack(itemId, amount)
    if (enchantments?.type != undefined) item.getComponent("enchantable")?.addEnchantment({ type: new EnchantmentType(enchantments.type), level: enchantments.level })
    item.lockMode = lockMode
    item.nameTag = nameTag
    item.setLore(lore)
    item.setCanDestroy(destroyBlocks)
    if (equipmentSlot == undefined && itemSlot == undefined) player.getComponent("inventory")!.container.addItem(item)
    else if (itemSlot != undefined) player.getComponent("inventory")!.container.setItem(itemSlot, item)
    else if (equipmentSlot != undefined) player.getComponent("equippable")!.setEquipment(equipmentSlot, item)
}