function main() {
    const debugPanel = document.createElement("textarea");
    debugPanel.id = "krillion-debug";
    debugPanel.readOnly = true;
    debugPanel.spellcheck = false;
    debugPanel.style.cssText = "position:fixed;top:20px;left:20px;z-index:999999;background:#111;color:#0f0;padding:12px;font:13px monospace;white-space:pre;width:450px;height:250px;resize:both;overflow:auto;border:1px solid #0f0;display:none;";
    document.body.appendChild(debugPanel);

    const debugLines = [];

    function log(text) {
        const line = String(text);
        debugLines.unshift(line);
        if (debugLines.length > 40) debugLines.pop();
        debugPanel.value = debugLines.join("\n");
    }

    // let debugVisible = false;

    document.addEventListener("keydown", event => {
        // const code = event.code
        // log(code);
        // if (code == "F3") {
        //     event.preventDefault();
        //     debugVisible = !debugVisible;
        //     debugPanel.style.display = debugVisible ? "block" : "none";
        // }
        // if (code == "F4") {
        //     createKrillionUI();
        // }
    });

    function setFormText(index, value) {
        var group = window.__commands__.vanillaDduiDataStoreSetCommandGroup;
        var command = group.setDataStorePathString;
        var path = "layout[" + index + "].text";

        command.callable("minecraft", "custom_form_data_{instanceId}", path, String(value));
    }

    function pressButton(index) {
        const group = window.__commands__ && window.__commands__.vanillaDduiDataStoreSetCommandGroup;
        const command = group && group.dataStoreButtonPress;

        command.callable("minecraft", "custom_form_data_{instanceId}", "layout[" + index + "].onClick")
    }

    function subscribeToText(store, property, path, callback) {
        const id = Math.floor(Math.random() * 4294967295);

        function update(value) {
            callback(value);
        }

        engine.on(`query:subscribed/${id}`, update);
        engine.on(`query:updated/${id}`, update);

        engine.trigger(`query:subscribe/vanilla.ddui.string`, id, store, property, path, false);

        return () => {
            engine.off(`query:subscribed/${id}`, update);
            engine.off(`query:updated/${id}`, update);
            engine.trigger("query:unsubscribe", id);
        };
    }

    function createKrillionUI() {
        const root = document.createElement("div");
        root.id = "krillion-ui";
        root.style.cssText = `
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    font-family: sans-serif;
    color: white;
    z-index: 99999;
`;
        let previousButtonText = "";

        const background = document.createElement("img");
        background.className = "background";
        background.src = "/hbui/background.png";
        root.appendChild(background);

        const overlay = document.createElement("div");
        overlay.className = "overlay";
        root.appendChild(overlay);

        const content = document.createElement("div");
        content.className = "content";
        root.appendChild(content);

        const logo = document.createElement("div");
        logo.className = "logo";
        logo.textContent = "KRILLION";
        content.appendChild(logo);

        const subtitle = document.createElement("div");
        subtitle.className = "subtitle";
        subtitle.textContent = "THE ENDLESS DIVE";
        content.appendChild(subtitle);

        const tagline = document.createElement("div");
        tagline.className = "tagline";
        tagline.textContent = "7 prompts • 25 seconds each • rarer answers sink deeper";
        content.appendChild(tagline);

        const ocean = document.createElement("div");
        ocean.className = "ocean";
        root.appendChild(ocean);

        const question = document.createElement("div");
        question.className = "question";
        content.appendChild(question);

        const depthCard = document.createElement("div");
        depthCard.className = "depth-card";

        const depthLabel = document.createElement("div");
        depthLabel.className = "depth-label";
        depthLabel.textContent = "TOTAL DEPTH";
        depthCard.appendChild(depthLabel);

        const depthValue = document.createElement("div");
        depthValue.className = "depth-value";
        depthValue.textContent = "0m";
        depthCard.appendChild(depthValue);

        content.appendChild(depthCard);

        const answerArea = document.createElement("div");
        answerArea.className = "answer-area";
        answerArea.style.position = "relative";
        content.appendChild(answerArea);

        const input = document.createElement("input");
        input.oninput = () => {
            setFormText(1, input.value);
        }
        input.placeholder = "Your answer...";
        answerArea.appendChild(input);

        const button = document.createElement("button");
        button.textContent = "Dive";
        answerArea.appendChild(button);

        const description = document.createElement("div");
        description.className = "description";
        answerArea.appendChild(description);

        const results = document.createElement("div");
        results.className = "results hidden";

        const resultsRank = document.createElement("div");
        resultsRank.className = "results-rank";
        results.appendChild(resultsRank);

        const rarityImage = document.createElement("img");
        rarityImage.className = "rarity-image";
        results.appendChild(rarityImage);

        const rarityName = document.createElement("div");
        rarityName.className = "rarity-name";
        results.appendChild(rarityName);

        const resultsScore = document.createElement("div");
        resultsScore.className = "results-score";
        results.appendChild(resultsScore);

        content.appendChild(results);

        const timerArea = document.createElement("div");
        timerArea.className = "timer-area";
        root.appendChild(timerArea);

        const timer = document.createElement("div");
        timer.className = "timer";
        timerArea.appendChild(timer);

        const timerTrack = document.createElement("div");
        timerTrack.className = "timer-track";
        timerArea.appendChild(timerTrack);

        const timerProgress = document.createElement("div");
        timerProgress.className = "timer-progress";
        timerTrack.appendChild(timerProgress);

        document.body.appendChild(root);

        let currentState = {};
        let unsubscribeTitle = null;
        let unsubscribeLabel = null

        function submit() {
            if (button.disabled) return

            if (currentState.page == "answer") {
                setFormText(1, input.value);
            }

            input.value = "";

            pressButton(2);
        }

        button.onclick = submit;

        document.addEventListener("keydown", event => {
            if (event.code == "Enter") {
                submit();
            }
        })

        function update(data) {
            if (!data || typeof data !== "object") return;

            currentState = data;

            question.textContent = data.question || data.label || "";

            const page = data.page || "intro";
            const isIntro = page == "intro";

            logo.classList.toggle("hidden", !isIntro);
            subtitle.classList.toggle("hidden", !isIntro);
            tagline.classList.toggle("hidden", !isIntro);
            question.classList.toggle("hidden", isIntro);
            depthCard.classList.toggle("hidden", page !== "answer" && page !== "results");

            if (data.depth !== undefined) {
                depthValue.textContent = Math.round(Number(data.depth)) + "m";
            }

            answerArea.classList.remove("hidden");
            answerArea.style.display = "flex";
            button.style.display = "flex";
            answerArea.classList.toggle("hidden", page !== "answer" && page !== "intro" && page !== "results");
            input.classList.toggle("hidden", page !== "answer");
            results.classList.toggle("hidden", page !== "results");

            if (page == "results") {
                resultsRank.textContent = data.rank || "YOUR RESULT";

                const rarity = String(data.image).toLowerCase();
                rarityImage.src = rarity;
                rarityImage.onerror = () => log("Failed to load rarity image: " + rarity);

                rarityName.textContent = data.rarity.toUpperCase();
                resultsScore.textContent = "Gained " + (data.gained ?? data.depth ?? 0) + "m";
            }

            input.disabled = data.inputDisabled;
            button.disabled = data.buttonDisabled;

            if (data.answer !== undefined && input.value !== data.answer) {
                input.value = data.answer;
            }

            input.placeholder = data.placeholder || "Your answer...";

            button.textContent = data.buttonText || previousButtonText;

            if (data.buttonText) {
                previousButtonText = data.buttonText;
            }

            description.textContent = data.description || "";

            const timerValue = Number(data.timer || 0);
            const timerMax = Number(data.maxTimer || 25);

            timerArea.classList.toggle("hidden", data.timerVisible == false || page == "intro" || page == "results");

            timer.textContent = Math.ceil(timerValue) + "s";

            const percentage = timerMax > 0 ? Math.max(0, Math.min(100, timerValue / timerMax * 100)) : 0;

            timerProgress.style.width = percentage + "%";
        }

        function parseAndUpdate(data) {
            const value = data?.value;
            if (typeof value !== "string") {
                log("Invalid label data: " + JSON.stringify(data));
                return;
            }

            try {
                log(`Updated with cool json: ${value}`)
                update(JSON.parse(value));
            } catch (error) {
                log("err in parsing " + error);
            }
        }

        unsubscribeLabel = subscribeToText(
            "minecraft",
            "custom_form_data_{instanceId}",
            "layout[0].text",
            parseAndUpdate
        );

        return {
            update,
            destroy() {
                disposed = true;

                if (unsubscribeTitle) unsubscribeTitle();
                if (unsubscribeLabel) unsubscribeLabel();

                root.remove();
            }
        };
    }

    let krillion = null;

    setTimeout(() => {
        const unsubscribeTitle = subscribeToText(
            "minecraft",
            "custom_form_data_{instanceId}",
            "title",
            data => {
                const value = data?.value;

                if (value == "Krillion") {
                    if (!krillion) {
                        log("Opening Krillion UI");
                        krillion = createKrillionUI();
                    }
                } else if (krillion) {
                    log("Closing Krillion UI");
                    krillion.destroy();
                    krillion = null;
                }
            }
        );
    }, 100)

    log("Title subscription registered");

}
main();