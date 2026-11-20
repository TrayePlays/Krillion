import { CommandPermissionLevel, CustomCommandParamType, CustomCommandStatus, Player, system, world } from "@minecraft/server"
import { ActionFormData, CustomForm, ModalFormData, ObservableBoolean, ObservableNumber, ObservableString } from "@minecraft/server-ui"
import { assignPlayerId, formatDate, formattedTiers, generateUUID, getAttemptNumber, getQuestion, getResults, getStats, getTodayPrompts, Prompts, saveStats, scoreColors, sleep, Stat, Tier, tryAnswer } from "utils";

export function mainUI(player: Player) {
    const today = formatDate();
    let localPrompts: Prompts;
    let localTimer = 25;
    let localRunId = generateUUID();
    let attempt = getAttemptNumber(player, today);
    let score = 0;
    let paused = false;
    let yourAnswers: { question: string, answer: string, score: number, tier: Tier, receipt: string }[] = [];
    const title = new ObservableString("Krillion");
    const form = new CustomForm(player, title);
    const header1 = { title: new ObservableString(""), visible: new ObservableBoolean(false) };
    const label1 = { title: new ObservableString("Krillion the rarer the answers the more you sink!"), visible: new ObservableBoolean(true), spacer1: new ObservableBoolean(true), spacer2: new ObservableBoolean(true) };
    const textField1 = { title: new ObservableString("Answer here"), text: new ObservableString("", { clientWritable: true }), vis: new ObservableBoolean(false), disabled: new ObservableBoolean(false), description: new ObservableString("") };
    const buttonData: { title: ObservableString, cb: () => void, vis: ObservableBoolean, disabled: ObservableBoolean, spacerVis: ObservableBoolean, dividerVis: ObservableBoolean }[] = [];
    const slider1 = { title: new ObservableString("Time Remaining: "), value: new ObservableNumber(25, { clientWritable: true }), min: 0, max: 25, toFixed: new ObservableNumber(0), vis: new ObservableBoolean(false) };
    form.header(header1.title, { visible: header1.visible });
    form.spacer({ visible: label1.spacer1 });
    form.label(label1.title, { visible: label1.visible });
    form.spacer({ visible: label1.spacer2 });
    form.textField(textField1.title, textField1.text, { disabled: textField1.disabled, visible: textField1.vis, description: textField1.description });
    for (let i = 0; i < 2; i++) {
        const title = new ObservableString("");
        const cb = () => { };
        const vis = new ObservableBoolean(false);
        const disabled = new ObservableBoolean(false);
        const spacerVis = new ObservableBoolean(false);
        const dividerVis = new ObservableBoolean(false);
        form.button(title, () => buttonData[i].cb(), { visible: vis, disabled });
        form.divider({ visible: dividerVis });
        form.spacer({ visible: spacerVis });
        buttonData.push({ title, cb, vis, disabled, spacerVis, dividerVis });
    }

    form.slider(slider1.title, slider1.value, slider1.min, slider1.max, { fixedFormatDigits: slider1.toFixed, disabled: true, visible: slider1.vis });

    function allButtonSet(data: { title?: string, cb?: () => void, vis?: boolean, disabled?: boolean, spacerVis?: boolean, dividerVis?: boolean }) {
        for (const button of buttonData) {
            if (data.title != undefined) button.title.setData(data.title);
            if (data.cb != undefined) button.cb = data.cb;
            if (data.vis != undefined) button.vis.setData(data.vis);
            if (data.disabled != undefined) button.disabled.setData(data.disabled);
            if (data.spacerVis != undefined) button.spacerVis.setData(data.spacerVis);
            if (data.dividerVis != undefined) button.dividerVis.setData(data.dividerVis);
        }
    }

    function errorFunc(message: string, timeout = 30) {
        textField1.description.setData(message)
        system.runTimeout(() => {
            textField1.description.setData("");
        }, timeout)
    }

    function initialForm() {
        const button1 = buttonData[0];
        button1.title.setData("Dive");
        button1.vis.setData(true);
        button1.disabled.setData(false);
        button1.cb = () => gameForm();

        label1.title.setData(`Krillion the rarer the answers the more you sink!`);
    }

    async function scoreForm() {
        const stat = {
            attempt,
            date: today,
            data: {
                prompts: localPrompts.prompts.map(p => p.text),
                answers: yourAnswers.map(a => a.answer),
                tiers: yourAnswers.map(t => t.tier)
            }
        };
        let finalScore = 0;

        for (const answer of yourAnswers) {
            finalScore += answer.score;
        }

        saveStats(player, stat);

        label1.title.setData("Getting online rankings...");


        const button1 = buttonData[0];
        button1.title.setData("Dive Again");
        button1.cb = () => {
            score = 0;
            localRunId = generateUUID();
            yourAnswers = [];
            textField1.text.setData("");
            textField1.disabled.setData(false);
            gameForm(localPrompts, 1);
        };

        const button2 = buttonData[1];
        button2.title.setData("Detailed Stats");
        button2.vis.setData(true);
        button2.cb = async () => {
            form.close();
            await sleep(10);
            statForm(player, player, stat)
        };

        textField1.vis.setData(false);
        textField1.disabled.setData(true);

        const results = await getResults(today, assignPlayerId(player), yourAnswers.map(r => r.receipt), localRunId, finalScore);

        if (!results) {
            label1.title.setData(`Final Score: §a${finalScore}m`);
            return;
        }

        label1.title.setData(`Final Score: §a${finalScore}m\n\n§fYou did better than §b${results.betterThan}%§f of players`);
    }

    async function checkAnswer(question: string, prompts: Prompts, index: number, timer: number, last = false) {
        const button1 = buttonData[0];
        const answer = textField1.text.getData();
        textField1.disabled.setData(true);
        button1.disabled.setData(true);
        paused = true;
        label1.title.setData(`Trying answer...`);
        player.playSound("mob.witch.throw", { pitch: 2 });
        const check = await tryAnswer(answer, `p${index ?? 1}`, player, localRunId);
        button1.disabled.setData(false);
        paused = false;
        if (check.accepted) {
            textField1.vis.setData(false);
            slider1.vis.setData(false);
            player.playSound("note.bell");
            system.clearRun(timer);

            score += check.score;
            yourAnswers.push({
                answer: check.answer,
                question,
                score: check.score,
                tier: check.tier,
                receipt: check.receipt
            });

            button1.title.setData((index ?? 1) == 7 ? "Finish" : "Next")

            button1.cb = () => {
                textField1.text.setData("");
                textField1.disabled.setData(false);
                button1.disabled.setData(false);
                gameForm(prompts, (index ?? 1) + 1);
            };

            label1.title.setData(`You got a §${scoreColors[check.tier]}${formattedTiers[check.tier]} §7(${check.score}m)\n\n§fFor your answer: §o"${check.answer}"`);
        } else {
            player.playSound("note.bass");
            if (localTimer < 0 || last) {
                textField1.vis.setData(false);
                slider1.vis.setData(false);
                system.clearRun(timer);
                button1.title.setData((index ?? 1) == 7 ? "Finish" : "Next")
                label1.title.setData(`You got a §7${formattedTiers["nocatch"]} (0m)\n\n§fFor your answer: §o"${answer}"`);
                button1.cb = () => {
                    textField1.text.setData("");
                    textField1.disabled.setData(false);
                    button1.disabled.setData(false);
                    gameForm(prompts, (index ?? 1) + 1);
                };

                yourAnswers.push({
                    answer,
                    question,
                    score: 0,
                    tier: "nocatch",
                    receipt: check.receipt
                });
                return;
            }
            errorFunc("That answer doesn't exist! Try again.");
            textField1.disabled.setData(false);
            button1.disabled.setData(false);
            label1.title.setData(`Prompt ${index ?? 1} / 7\n${question}`);
        }
    };

    async function gameForm(_prompts?: Prompts, index?: number) {
        const button1 = buttonData[0];
        button1.cb = () => { };
        let prompts = _prompts;

        if (!prompts) {
            allButtonSet({ vis: false });
            label1.title.setData("Loading today's prompts...");

            prompts = await getTodayPrompts();

            if (!prompts) {
                form.close();
                player.sendMessage(`§cFailed to get prompts! §7(do §e/function connect§7)`);
                return;
            }

            localPrompts = prompts;
        }

        if (!prompts) return;
        localTimer = 25;
        slider1.value.setData(localTimer);
        const question = getQuestion(prompts, index ?? 1);
        if (question == "Unknown") return scoreForm();
        header1.title.setData(`Score: ${score}`);
        label1.title.setData(`Prompt ${index ?? 1} / 7\n${question}`);
        slider1.vis.setData(true);
        textField1.text.setData("");
        textField1.vis.setData(true);
        textField1.disabled.setData(false);
        button1.vis.setData(true);
        button1.disabled.setData(false);
        button1.title.setData("Dive");
        button1.cb = async () => { checkAnswer(question, prompts, index ?? 1, runner) };

        const runner = system.runInterval(async () => {
            if (!player) {
                system.clearRun(runner);
                return;
            }

            if (!form.isShowing()) {
                system.clearRun(runner);
                return;
            }

            if (paused) {
                return;
            }

            localTimer -= 1;

            slider1.value.setData(localTimer);

            if (localTimer <= 0) {
                system.clearRun(runner);
                await checkAnswer(question, prompts, index ?? 1, runner, true);
                return;
            }
        }, 20);
    }

    initialForm();
    form.show();
}

async function statsForm(player: Player, target: Player) {
    const stats = getStats(target);
    const form = new ActionFormData();
    form.title("Stats");

    for (let i = 0; i < stats.length; i++) {
        const stat = stats[i];
        form.button(`${stat.date}\nAttempt: ${stat.attempt}`);
    }
    const { selection, canceled } = await form.show(player)
    if (canceled || selection == undefined) return;
    const stat = stats[selection]
    statForm(player, target, stat);
}

async function statForm(player: Player, target: Player, stat: Stat) {
    const form = new ActionFormData();
    form.title(stat.date);

    for (let i = 0; i < stat.data.prompts.length; i++) {
        const answer = stat.data.answers[i];
        const prompt = stat.data.prompts[i];
        const tier = stat.data.tiers[i];

        form.label(`${prompt}\n\nYour Answer: §${scoreColors[tier]}${answer.length == 0 ? "No Answer" : answer} (${formattedTiers[tier]})`);
        if (i != stat.data.prompts.length - 1) form.divider();
    }

    form.button("Back");
    const { selection, canceled } = await form.show(player);
    if (canceled) return;
    if (selection == 0) statsForm(player, target);
}


system.beforeEvents.startup.subscribe(({ customCommandRegistry }) => {
    customCommandRegistry.registerCommand({
        name: "krillion:settings",
        description: "Edits the settings of the game krillion",
        permissionLevel: CommandPermissionLevel.Admin,
        cheatsRequired: false
    }, (origin) => {
        if (origin?.sourceEntity?.typeId == "minecraft:player") {
            const player = origin.sourceEntity as Player;
            const form = new ModalFormData();
            form.title("Settings");
            form.toggle("Show welcome message", { defaultValue: world.getDynamicProperty("welcomeMessage") as boolean ?? true });
            form.toggle("Show update message", { defaultValue: world.getDynamicProperty("updateMessage") as boolean ?? true });
            form.toggle("Autocorrect?", { defaultValue: player.getDynamicProperty("autoCorrect") as boolean ?? true })

            system.run(async () => {
                const { formValues, canceled } = await form.show(player)
                if (canceled || !formValues) return;

                world.setDynamicProperties({ welcomeMessage: formValues[0], updateMessage: formValues[1] });
                player.setDynamicProperties({ autoCorrect: formValues[2] });

                player.sendMessage("§aUpdated Settings!");
                player.playSound("note.bell");
            })
            return {
                status: CustomCommandStatus.Success,
            }
        } else {
            return {
                status: CustomCommandStatus.Failure,
                message: "Run this as a player!"
            };
        }
    })
    customCommandRegistry.registerCommand({
        name: "krillion:stats",
        description: "Checks krillion stats of you or another player",
        permissionLevel: CommandPermissionLevel.Any,
        cheatsRequired: false,
        optionalParameters: [
            {
                name: "player",
                type: CustomCommandParamType.PlayerSelector
            }
        ],
    }, (origin, selector) => {
        if (Array.isArray(selector) && selector.length != 1) {
            return {
                status: CustomCommandStatus.Failure,
                message: "Run this on only 1 player!"
            };
        }
        if (origin?.sourceEntity?.typeId == "minecraft:player") {
            const player = origin.sourceEntity as Player;
            let target = player;
            if (selector) target = selector[0];
            const stats = getStats(target);

            if (stats.length == 0) {
                return {
                    status: CustomCommandStatus.Failure,
                    message: "Player has no recorded stats"
                };
            }

            system.run(() => statsForm(player, target));

            return {
                status: CustomCommandStatus.Success
            }
        }
    })
})

system.afterEvents.scriptEventReceive.subscribe(async ({ sourceEntity, id, message }) => {
    if (id == "krillion:try") {
        if (sourceEntity?.typeId != "minecraft:player") return;
        const player = sourceEntity as Player;
        const result = await tryAnswer(message, "p7", player, generateUUID());
        console.warn(JSON.stringify(result));
    }
})

world.afterEvents.itemUse.subscribe(({ itemStack, source: player }) => {
    if (itemStack.typeId == "krillion:krillion") {
        mainUI(player);
    }
})