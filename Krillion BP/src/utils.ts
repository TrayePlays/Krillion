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

export const tierWorth = {
    "nocatch": 0,
    "plankton": 10,
    "schooler": 30,
    "rare": 60,
    "deepcut": 85,
    "krillion": 100
}

export const scorePictures = {
    "nocatch": "textures/ui/realms_red_x",
    "plankton": "textures/items/brick",
    "schooler": "textures/items/copper_ingot",
    "rare": "textures/items/iron_ingot",
    "deepcut": "textures/items/gold_ingot",
    "krillion": "textures/items/krillion"
}

export const formattedTiers = {
    "nocatch": "No Catch",
    "plankton": "Plankton",
    "schooler": "Schooler",
    "rare": "Rare",
    "deepcut": "Deep Cut",
    "krillion": "Krillion"
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
    receipt: string;
}

interface IncorrectAnswer {
    accepted: false;
    correction?: string;
    receipt: string;
}

interface Results {
    sample: number; // How much ppl played today
    betterThan: number; // Percentage of players you did better than
    dist: number[] //idk what this really means
}

export function assignPlayerId(player: Player): string {
    if (player.getDynamicProperty("playerId") == undefined) {
        const id = generateUUID();
        player.setDynamicProperty("playerId", id);
        return id;
    }
    return player.getDynamicProperty("playerId") as string;
}

export async function getResults(date: string, playerId: string, receipts: string[], runId: string, score: number): Promise<Results | undefined> {
    const resultsReq = await api.sendHttpRequest("https://krillion.io/api/today/complete", {
        method: "POST",
        body: JSON.stringify({
            date,
            playerId,
            receipts,
            runId,
            score
        })
    })

    if (resultsReq.status != ServerStatusResponse.Success) return;
    return resultsReq.getData() as Results;
}

export function getStatsPicture(score: number) {
    let tier: Tier = "nocatch";
    if (score < 150) tier = "plankton";
    else if (score < 250) tier = "schooler";
    else if (score < 350) tier = "rare";
    else if (score < 449) tier = "deepcut";
    else tier = "krillion";
    return scorePictures[tier];
}

export function getScoreColor(score: number) {
    let tier: Tier = "nocatch";
    if (score < 150) tier = "plankton";
    else if (score < 250) tier = "schooler";
    else if (score < 350) tier = "rare";
    else if (score < 449) tier = "deepcut";
    else tier = "krillion";
    return scoreColors[tier];
}

/**{
	"date":"2026-11-18","playerId":"7d333c47-396c-4227-9ab5-81d8a40c1ac4","score":410,"runId":"abacd165-6b4b-4fbc-b983-236338a1fe44",
  "receipts":["eyJ2IjoyLCJzY29wZSI6ImRhaWx5IiwiZ2FtZSI6MTI2LCJ2ZXJzaW9uIjoiMjAyNi0xMS0xOCIsInJvdW5kIjoicjEiLCJwbGF5ZXJJZCI6IjdkMzMzYzQ3LTM5NmMtNDIyNy05YWI1LTgxZDhhNDBjMWFjNCIsInJ1bklkIjoiYWJhY2QxNjUtNmI0Yi00ZmJjLWI5ODMtMjM2MzM4YTFmZTQzIiwic2NvcmUiOjYwLCJpc3N1ZWRBdCI6MTc5NTA0NTY1NzUzOH0.etaoUtTefQ6atK9Md_IfIlCs4MygNbTtR2BEIdZIqEw","eyJ2IjoyLCJzY29wZSI6ImRhaWx5IiwiZ2FtZSI6MTI2LCJ2ZXJzaW9uIjoiMjAyNi0xMS0xOCIsInJvdW5kIjoicjIiLCJwbGF5ZXJJZCI6IjdkMzMzYzQ3LTM5NmMtNDIyNy05YWI1LTgxZDhhNDBjMWFjNCIsInJ1bklkIjoiYWJhY2QxNjUtNmI0Yi00ZmJjLWI5ODMtMjM2MzM4YTFmZTQzIiwic2NvcmUiOjg1LCJpc3N1ZWRBdCI6MTc5NTA0NTY2ODM3NH0.IHmTRH90Djl8XRhhED83KVPs9KJuitHzJJJfhyG2cqM","eyJ2IjoyLCJzY29wZSI6ImRhaWx5IiwiZ2FtZSI6MTI2LCJ2ZXJzaW9uIjoiMjAyNi0xMS0xOCIsInJvdW5kIjoicjMiLCJwbGF5ZXJJZCI6IjdkMzMzYzQ3LTM5NmMtNDIyNy05YWI1LTgxZDhhNDBjMWFjNCIsInJ1bklkIjoiYWJhY2QxNjUtNmI0Yi00ZmJjLWI5ODMtMjM2MzM4YTFmZTQzIiwic2NvcmUiOjYwLCJpc3N1ZWRBdCI6MTc5NTA0NTY3ODU0OX0.EHcCVyi5VhzgZuabpI89rCYIHEra1aaSU-FCDyOqxMU","eyJ2IjoyLCJzY29wZSI6ImRhaWx5IiwiZ2FtZSI6MTI2LCJ2ZXJzaW9uIjoiMjAyNi0xMS0xOCIsInJvdW5kIjoicjQiLCJwbGF5ZXJJZCI6IjdkMzMzYzQ3LTM5NmMtNDIyNy05YWI1LTgxZDhhNDBjMWFjNCIsInJ1bklkIjoiYWJhY2QxNjUtNmI0Yi00ZmJjLWI5ODMtMjM2MzM4YTFmZTQzIiwic2NvcmUiOjg1LCJpc3N1ZWRBdCI6MTc5NTA0NTY4ODYxMX0.LJIyc-CfiqtQwKl6nba1yCee4Y1uDJJiuxLNt_H2i-w","eyJ2IjoyLCJzY29wZSI6ImRhaWx5IiwiZ2FtZSI6MTI2LCJ2ZXJzaW9uIjoiMjAyNi0xMS0xOCIsInJvdW5kIjoicjUiLCJwbGF5ZXJJZCI6IjdkMzMzYzQ3LTM5NmMtNDIyNy05YWI1LTgxZDhhNDBjMWFjNCIsInJ1bklkIjoiYWJhY2QxNjUtNmI0Yi00ZmJjLWI5ODMtMjM2MzM4YTFmZTQzIiwic2NvcmUiOjMwLCJpc3N1ZWRBdCI6MTc5NTA0NTcwMDI0Mn0.sWPox-McRdMUi4wAMLLY-kMbgrIjSRtCgr_akZFKuY4","eyJ2IjoyLCJzY29wZSI6ImRhaWx5IiwiZ2FtZSI6MTI2LCJ2ZXJzaW9uIjoiMjAyNi0xMS0xOCIsInJvdW5kIjoicjYiLCJwbGF5ZXJJZCI6IjdkMzMzYzQ3LTM5NmMtNDIyNy05YWI1LTgxZDhhNDBjMWFjNCIsInJ1bklkIjoiYWJhY2QxNjUtNmI0Yi00ZmJjLWI5ODMtMjM2MzM4YTFmZTQzIiwic2NvcmUiOjYwLCJpc3N1ZWRBdCI6MTc5NTA0NTcxMjU4MX0.yIIKIDizELGp9fClw--13kontybxXagkzF5lOPxy7wc","eyJ2IjoyLCJzY29wZSI6ImRhaWx5IiwiZ2FtZSI6MTI2LCJ2ZXJzaW9uIjoiMjAyNi0xMS0xOCIsInJvdW5kIjoicjciLCJwbGF5ZXJJZCI6IjdkMzMzYzQ3LTM5NmMtNDIyNy05YWI1LTgxZDhhNDBjMWFjNCIsInJ1bklkIjoiYWJhY2QxNjUtNmI0Yi00ZmJjLWI5ODMtMjM2MzM4YTFmZTQzIiwic2NvcmUiOjMwLCJpc3N1ZWRBdCI6MTc5NTA0NTcyMzcyNn0.ix_6RDFuF2L37OBzYPtPPF4hAtwx_1hv7mhPZ0LvwhE"]
} */
export async function getTodayPrompts(): Promise<Prompts | undefined> {
    const promptsReq = await api.sendHttpRequest("https://krillion.io/api/today");

    if (promptsReq.status != ServerStatusResponse.Success) return;

    return promptsReq.getData() as Prompts;
}

export async function tryAnswer(answer: string, promptId: string, player: Player, runId: string): Promise<Answer> {
    const autoCorrect = player.getDynamicProperty("autoCorrect") as boolean ?? true
    const playerId = assignPlayerId(player);
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
            playerId,
            previewCorrection: true,
            promptId,
            runId
        })
    })
    if (answerReq.status != ServerStatusResponse.Success) return { accepted: false, receipt: "" }
    const a = answerReq.getData() as Answer;
    if (a.accepted == false && a.correction != undefined && autoCorrect) return tryAnswer(a.correction, promptId, player, runId);
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

export function getAttemptNumber(player: Player, date: string) {
    let attempt = 1 + player.getDynamicPropertyIds().filter(dp => dp.startsWith(`stats|${date}`)).length;
    return attempt;
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

    return stats;
}

export function saveStats(player: Player, stat: Stat) {
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