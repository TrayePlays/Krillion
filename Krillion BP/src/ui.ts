import { CommandPermissionLevel, CustomCommandSource, CustomCommandStatus, Player, system, world } from "@minecraft/server"
import { CustomForm, ModalFormData, ObservableBoolean, ObservableString } from "@minecraft/server-ui"
import { getQuestion, getTodayPrompts, Prompts, scorePictures, sleep, Tier, tryAnswer } from "utils";

export function mainUI(player: Player) {
    let localPrompts: Prompts;
    let localTimer = 25;
    let score = 0;
    let paused = false;
    let yourAnswers: { question: string, answer: string, score: number, tier: Tier }[] = [];
    const title = new ObservableString("Krillion");
    const form = new CustomForm(player, title);
    const label1 = { title: new ObservableString("Krillion the rarer the answers the more you sink!"), visible: new ObservableBoolean(true) };
    const textField1 = { title: new ObservableString("Answer here"), text: new ObservableString("", { clientWritable: true }), vis: new ObservableBoolean(false), disabled: new ObservableBoolean(false), description: new ObservableString("") };
    const buttonData: { title: ObservableString, cb: () => void, vis: ObservableBoolean, disabled: ObservableBoolean, spacerVis: ObservableBoolean, dividerVis: ObservableBoolean }[] = [];

    form.label(label1.title, { visible: label1.visible });
    form.textField(textField1.title, textField1.text, { disabled: textField1.disabled, visible: textField1.vis, description: textField1.description });

    for (let i = 0; i < 1; i++) {
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

    function publishUI(data: { rank?: string, rarity?: string, gained?: number, image?: string, page: string, answer?: string, question?: string, label?: string, timer?: number, maxTimer?: number, depth?: number, buttonText?: string, buttonDisabled?: boolean, inputDisabled?: boolean, description?: string, results?: string, timerVisible?: boolean, krillionState?: "waiting" | "checking" | "accepted" | "rejected" }) {
        label1.title.setData(JSON.stringify(data));
    }

    function initialForm() {
        const button1 = buttonData[0];
        button1.title.setData("Dive");
        button1.vis.setData(true);
        button1.disabled.setData(false);
        button1.cb = () => gameForm();

        publishUI({
            page: "intro",
            buttonText: "BEGIN DESCENT",
            buttonDisabled: false,
            inputDisabled: true,
            depth: 0,
            timerVisible: false
        });
    }

    function scoreForm() {
        let str = "";
        let finalScore = 0;

        for (const answer of yourAnswers) {
            finalScore += answer.score;
            str += `${answer.question}\nYour answer: ${answer.answer}\nRarity: ${answer.tier} (+${answer.score}m)\n\n`;
        }

        str += `Final Score: ${finalScore}m`;

        textField1.vis.setData(false);
        textField1.disabled.setData(true);

        const button1 = buttonData[0];
        button1.cb = () => {
            score = 0;
            yourAnswers = [];
            textField1.text.setData("");
            textField1.disabled.setData(false);
            gameForm(localPrompts, 1);
        };

        publishUI({
            page: "results",
            rarity: `GGs`,
            image: "/textures/items/krillion.png",
            buttonText: "DIVE AGAIN",
            gained: score,
            depth: score,
        });
    }

    async function checkAnswer(question: string, prompts: Prompts, index: number, timer: number, last = false) {
        const button1 = buttonData[0];
        const answer = textField1.text.getData();
        textField1.disabled.setData(true);
        button1.disabled.setData(true);
        paused = true;
        publishUI({
            page: "answer",
            buttonDisabled: true,
            inputDisabled: true,
            timerVisible: true,
            timer: localTimer,
            question,
            answer,
        });
        player.playSound("mob.witch.throw", { pitch: 2 });
        const check = await tryAnswer(answer, `p${index ?? 1}`);

        paused = false;
        if (check.accepted) {
            player.playSound("note.bell");
            system.clearRun(timer);

            score += check.score;
            yourAnswers.push({
                answer,
                question,
                score: check.score,
                tier: check.tier
            });

            button1.cb = () => {
                textField1.text.setData("");
                textField1.disabled.setData(false);
                button1.disabled.setData(false);
                gameForm(prompts, (index ?? 1) + 1);
            };

            publishUI({
                page: "results",
                rank: "",
                rarity: check.tier,
                image: scorePictures[check.tier],
                answer,
                buttonText: (index ?? 1) == 7 ? "FINISH" : "NEXT",
                gained: check.score,
                depth: score,
            });
        } else {
            player.playSound("note.bass");
            if (localTimer < 0 || last) {
                system.clearRun(timer);

                button1.cb = () => {
                    textField1.text.setData("");
                    textField1.disabled.setData(false);
                    button1.disabled.setData(false);
                    gameForm(prompts, (index ?? 1) + 1);
                };

                publishUI({
                    page: "results",
                    rank: "",
                    buttonText: "NEXT",
                    rarity: "No Catch",
                    image: scorePictures["nocatch"],
                    answer,
                    gained: 0,
                    depth: score
                });
                return;
            }
            publishUI({
                page: "answer",
                description: "That answer doesn't exist! Try again.",
                question,
                timerVisible: true,
                timer: localTimer,
            });
            player.startItemCooldown("wrongAnswer", 30);
            await sleep(30);
            textField1.disabled.setData(false);
            button1.disabled.setData(false);
        }
    };

    async function gameForm(_prompts?: Prompts, index?: number) {
        const button1 = buttonData[0];
        button1.cb = () => { };
        let prompts = _prompts;

        if (!prompts) {
            allButtonSet({ vis: false });
            publishUI({ page: "loading", question: "Loading today's prompts...", buttonDisabled: true, timerVisible: false });

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
        const question = getQuestion(prompts, index ?? 1);

        if (question == "Unknown") return scoreForm();


        textField1.text.setData("");
        textField1.vis.setData(true);
        textField1.disabled.setData(false);
        button1.vis.setData(true);
        button1.disabled.setData(false);

        button1.cb = async () => { checkAnswer(question, prompts, index ?? 1, runner) };

        publishUI({
            page: "answer",
            question,
            buttonText: "DIVE",
            inputDisabled: false,
            buttonDisabled: false,
            description: "",
            timer: localTimer,
            maxTimer: 25,
            timerVisible: true,
            depth: score
        });

        const runner = system.runInterval(async () => {
            if (!player) {
                system.clearRun(runner);
                return;
            }

            if (paused) {
                return;
            }

            localTimer -= 1;

            if (localTimer < 0) {
                system.clearRun(runner);
                await checkAnswer(question, prompts, index ?? 1, runner, true);
                return;
            }

            const description = player.getItemCooldown("wrongAnswer") != 0 ? "That answer doesn't exist! Try again." : "";

            publishUI({
                page: "answer",
                question,
                timer: localTimer,
                maxTimer: 25,
                description,
                depth: score
            });
        }, 20);
    }

    initialForm();
    form.show();
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

            system.run(async () => {
                const { formValues, canceled } = await form.show(player)
                if (canceled || !formValues) return;

                world.setDynamicProperties({ welcomeMessage: formValues[0], updateMessage: formValues[1] });
                player.sendMessage("§aUpdated Settings!");
                player.playSound("note.bell");
            })
            return {
                status: CustomCommandStatus.Success,
            }
        } else {
            return {
                status: CustomCommandStatus.Failure,
                message: "§cRun this as a player!"
            }
        }
    })
})

world.afterEvents.itemUse.subscribe(({ itemStack, source: player }) => {
    if (itemStack.typeId == "krillion:krillion") {
        mainUI(player);
    }
})