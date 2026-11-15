(function () {
    "use strict";

    var verses = [
        { text: "Your word is a lamp for my feet, a light on my path.", ref: "Psalm 119:105" },
        { text: "Be joyful in hope, patient in affliction, faithful in prayer.", ref: "Romans 12:12" },
        { text: "For we live by faith, not by sight.", ref: "2 Corinthians 5:7" },
        { text: "The Lord is my shepherd, I lack nothing.", ref: "Psalm 23:1" },
        { text: "This is the day the Lord has made; let us rejoice and be glad in it.", ref: "Psalm 118:24" },
        { text: "Cast all your anxiety on him because he cares for you.", ref: "1 Peter 5:7" },
        { text: "I can do all this through him who gives me strength.", ref: "Philippians 4:13" }
    ];

    var now = new Date();
    var dateKey = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");
    var dayIndex = Math.floor(new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 86400000);
    var verse = verses[dayIndex % verses.length];
    document.getElementById("daily-quote-text").textContent = "“" + verse.text + "”";
    document.getElementById("daily-quote-ref").textContent = verse.ref;

    document.querySelectorAll("[data-reaction]").forEach(function (button) {
        var name = button.getAttribute("data-reaction");
        var key = "bol_react_" + dateKey + "_" + name;
        var count = button.querySelector(".r-count");
        var selected = false;
        try { selected = window.localStorage.getItem(key) === "true"; } catch (error) {}
        count.textContent = selected ? "1" : "0";
        button.classList.toggle("voted", selected);
        button.setAttribute("aria-pressed", selected ? "true" : "false");
        button.addEventListener("click", function () {
            selected = !selected;
            count.textContent = selected ? "1" : "0";
            button.classList.toggle("voted", selected);
            button.setAttribute("aria-pressed", selected ? "true" : "false");
            try {
                if (selected) window.localStorage.setItem(key, "true");
                else window.localStorage.removeItem(key);
            } catch (error) {
                // Reactions remain available for this visit if browser storage is unavailable.
            }
        });
    });

    var rawQuestions = Array.isArray(window.bolBibleQuestions) ? window.bolBibleQuestions : [];
    var questions = rawQuestions.filter(function (item) {
        return item && typeof item.q === "string" && Array.isArray(item.options) &&
            Number.isInteger(item.answer) && item.answer >= 0 && item.answer < item.options.length;
    }).map(function (item) {
        return { question: item.q, answers: item.options, correct: item.answer, reference: item.ref || "" };
    });

    var questionText = document.getElementById("quiz-question");
    var optionsBox = document.getElementById("quiz-options");
    var feedback = document.getElementById("quiz-feedback");
    var scoreLabel = document.getElementById("quiz-score");
    var bestLabel = document.getElementById("quiz-best");
    var progress = document.getElementById("quiz-progress");
    var progressLabel = document.getElementById("quiz-progress-label");
    var nextButton = document.getElementById("quiz-next");
    var bestPoints = 0;
    try {
        bestPoints = Number(window.localStorage.getItem("bol_bible_trivia_best") || 0);
        if (!Number.isFinite(bestPoints) || bestPoints < 0) bestPoints = 0;
    } catch (error) {}

    var roundQuestions = [];
    var questionIndex = 0;
    var points = 0;
    var correctCount = 0;
    var hasAnswered = false;
    var roundComplete = false;

    function updateScoreLabels() {
        scoreLabel.textContent = "Points: " + points;
        bestLabel.textContent = "Best: " + bestPoints;
    }

    function shuffledQuestions() {
        var list = questions.slice();
        for (var index = list.length - 1; index > 0; index -= 1) {
            var target = Math.floor(Math.random() * (index + 1));
            var temporary = list[index];
            list[index] = list[target];
            list[target] = temporary;
        }
        return list;
    }

    function startRound() {
        if (!questions.length) {
            questionText.textContent = "The trivia questions could not be loaded.";
            feedback.textContent = "Please refresh the page and try again.";
            nextButton.disabled = true;
            return;
        }
        roundQuestions = shuffledQuestions();
        questionIndex = 0;
        points = 0;
        correctCount = 0;
        roundComplete = false;
        updateScoreLabels();
        renderQuestion();
    }

    function renderQuestion() {
        hasAnswered = false;
        var item = roundQuestions[questionIndex];
        questionText.textContent = item.question;
        feedback.textContent = "";
        optionsBox.replaceChildren();
        item.answers.forEach(function (answer, index) {
            var button = document.createElement("button");
            button.type = "button";
            button.className = "quiz-option";
            button.textContent = answer;
            button.addEventListener("click", function () { chooseAnswer(index, button); });
            optionsBox.appendChild(button);
        });
        progress.max = roundQuestions.length;
        progress.value = questionIndex + 1;
        progressLabel.textContent = "Question " + (questionIndex + 1) + " of " + roundQuestions.length;
        nextButton.disabled = true;
        nextButton.textContent = questionIndex === roundQuestions.length - 1 ? "Finish round →" : "Next question →";
    }

    function chooseAnswer(answerIndex, chosenButton) {
        if (hasAnswered || roundComplete) return;
        hasAnswered = true;
        var item = roundQuestions[questionIndex];
        var buttons = Array.prototype.slice.call(optionsBox.querySelectorAll("button"));
        buttons.forEach(function (button, index) {
            button.disabled = true;
            if (index === item.correct) button.classList.add("correct");
        });

        if (answerIndex === item.correct) {
            correctCount += 1;
            points += 10;
            feedback.textContent = "Correct! +10 points" + (item.reference ? " · " + item.reference : "");
            if (points > bestPoints) {
                bestPoints = points;
                try { window.localStorage.setItem("bol_bible_trivia_best", String(bestPoints)); } catch (error) {}
            }
        } else {
            chosenButton.classList.add("wrong");
            feedback.textContent = "The correct answer is “" + item.answers[item.correct] + "”" +
                (item.reference ? " · " + item.reference : "");
        }
        updateScoreLabels();
        nextButton.disabled = false;
    }

    function finishRound() {
        roundComplete = true;
        questionText.textContent = "Round complete!";
        optionsBox.replaceChildren();
        feedback.textContent = "You answered " + correctCount + " of " + roundQuestions.length +
            " correctly and earned " + points + " points. Best score: " + bestPoints + ".";
        progress.value = roundQuestions.length;
        progressLabel.textContent = roundQuestions.length + " of " + roundQuestions.length + " questions complete";
        nextButton.textContent = "Play another round →";
        nextButton.disabled = false;
    }

    nextButton.addEventListener("click", function () {
        if (roundComplete) {
            startRound();
            return;
        }
        if (!hasAnswered) return;
        if (questionIndex === roundQuestions.length - 1) {
            finishRound();
            return;
        }
        questionIndex += 1;
        renderQuestion();
    });

    updateScoreLabels();
    startRound();
}());
