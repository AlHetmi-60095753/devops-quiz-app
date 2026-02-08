(() => {
  const startScreen = document.getElementById("start-screen");
  const quizScreen = document.getElementById("quiz-screen");
  const resultScreen = document.getElementById("result-screen");

  const startButton = document.getElementById("start-btn");
  const nextButton = document.getElementById("next-btn");
  const restartButton = document.getElementById("restart-btn");
  const playAgainButton = document.getElementById("play-again-btn");
  const topicSelect = document.getElementById("topic-select");
  const topicHelp = document.getElementById("topic-help");

  const questionCounter = document.getElementById("question-counter");
  const scoreBadge = document.getElementById("score");
  const questionText = document.getElementById("question-text");
  const answerList = document.getElementById("answer-list");
  const feedback = document.getElementById("feedback");
  const feedbackStatus = document.getElementById("feedback-status");
  const feedbackExplanation = document.getElementById("feedback-explanation");
  const finalScore = document.getElementById("final-score");
  const finalMessage = document.getElementById("final-message");

  let allQuestions = [];
  let questions = [];
  let currentIndex = 0;
  let score = 0;
  let answered = false;
  let selectedTopic = "all";

  const screenMap = {
    start: startScreen,
    quiz: quizScreen,
    result: resultScreen,
  };

  const setActiveScreen = (screenKey) => {
    Object.entries(screenMap).forEach(([key, element]) => {
      const isActive = key === screenKey;
      element.classList.toggle("card--active", isActive);
      element.setAttribute("aria-hidden", String(!isActive));
    });
  };

  const updateBadges = () => {
    const total = questions.length;
    const position = total === 0 ? 0 : currentIndex + 1;
    questionCounter.textContent = `${position}/${total}`;
    scoreBadge.textContent = `Score: ${score}`;
  };

  const normalizeQuestion = (raw, index) => {
    const text =
      raw.question ||
      raw.text ||
      raw.prompt ||
      `Question ${index + 1}`;
    const options = Array.isArray(raw.options)
      ? raw.options
      : Array.isArray(raw.answers)
      ? raw.answers
      : Array.isArray(raw.choices)
      ? raw.choices
      : [];
    const correct =
      raw.correctAnswer ??
      raw.correct ??
      raw.answer ??
      raw.correctOption ??
      raw.correct_option ??
      null;
    const topic = raw.topic || raw.category || raw.subject || "General";
    const explanation =
      raw.explanation ||
      raw.rationale ||
      raw.detail ||
      raw.reason ||
      "";

    return { text, options, correct, topic, explanation };
  };

  const updateTopicOptions = () => {
    const topics = Array.from(
      new Set(allQuestions.map((question) => question.topic).filter(Boolean))
    ).sort();
    topicSelect.innerHTML = "";
    const allOption = document.createElement("option");
    allOption.value = "all";
    allOption.textContent = "All topics";
    topicSelect.appendChild(allOption);

    topics.forEach((topic) => {
      const option = document.createElement("option");
      option.value = topic;
      option.textContent = topic;
      topicSelect.appendChild(option);
    });

    if (!topics.includes(selectedTopic)) {
      selectedTopic = "all";
    }
    topicSelect.value = selectedTopic;
  };

  const applyTopicSelection = () => {
    selectedTopic = topicSelect.value;
    questions =
      selectedTopic === "all"
        ? allQuestions
        : allQuestions.filter((question) => question.topic === selectedTopic);
    updateBadges();
    startButton.disabled = questions.length === 0;
    topicHelp.textContent =
      questions.length === 0
        ? "No questions available for this topic yet."
        : "Select a topic to focus your quiz.";
  };

  const loadQuestions = async () => {
    try {
      const response = await fetch("data/questions.json", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Unable to load questions.");
      }
      const data = await response.json();
      allQuestions = Array.isArray(data) ? data.map(normalizeQuestion) : [];
    } catch (error) {
      allQuestions = [];
    }
    updateTopicOptions();
    applyTopicSelection();
  };

  const resetState = () => {
    currentIndex = 0;
    score = 0;
    answered = false;
    nextButton.disabled = true;
    feedback.classList.remove("feedback--visible");
    feedbackStatus.textContent = "";
    feedbackExplanation.textContent = "";
    updateBadges();
  };

  const renderQuestion = () => {
    answered = false;
    nextButton.disabled = true;
    answerList.innerHTML = "";
    feedback.classList.remove("feedback--visible");
    feedbackStatus.textContent = "";
    feedbackExplanation.textContent = "";

    if (questions.length === 0) {
      questionText.textContent = "No questions available yet.";
      const emptyItem = document.createElement("li");
      emptyItem.className = "answers__item";
      const emptyButton = document.createElement("button");
      emptyButton.type = "button";
      emptyButton.className = "btn btn--option";
      emptyButton.textContent = "Add questions to data/questions.json";
      emptyButton.disabled = true;
      emptyItem.appendChild(emptyButton);
      answerList.appendChild(emptyItem);
      return;
    }

    const currentQuestion = questions[currentIndex];
    questionText.textContent = currentQuestion.text;
    nextButton.textContent =
      currentIndex === questions.length - 1 ? "Finish Quiz" : "Next Question";

    currentQuestion.options.forEach((option, optionIndex) => {
      const listItem = document.createElement("li");
      listItem.className = "answers__item";

      const button = document.createElement("button");
      button.type = "button";
      button.className = "btn btn--option";
      button.textContent = option;
      button.dataset.index = String(optionIndex);

      button.addEventListener("click", () => handleAnswer(optionIndex));

      listItem.appendChild(button);
      answerList.appendChild(listItem);
    });
  };

  const isCorrectAnswer = (question, optionIndex) => {
    if (question.correct === null || question.correct === undefined) {
      return false;
    }
    if (typeof question.correct === "number") {
      return question.correct === optionIndex;
    }
    return question.options[optionIndex] === question.correct;
  };

  const handleAnswer = (optionIndex) => {
    if (answered) {
      return;
    }
    answered = true;

    const currentQuestion = questions[currentIndex];
    const correct = isCorrectAnswer(currentQuestion, optionIndex);
    if (correct) {
      score += 1;
    }
    updateBadges();

    const buttons = answerList.querySelectorAll("button");
    buttons.forEach((button) => {
      button.disabled = true;
      const buttonIndex = Number(button.dataset.index);
      if (isCorrectAnswer(currentQuestion, buttonIndex)) {
        button.dataset.state = "correct";
      } else if (buttonIndex === optionIndex) {
        button.dataset.state = "incorrect";
      }
    });

    feedbackStatus.textContent = correct ? "Correct!" : "Incorrect.";
    feedbackExplanation.textContent =
      currentQuestion.explanation ||
      "No explanation provided for this question.";
    feedback.classList.add("feedback--visible");

    nextButton.disabled = false;
  };

  const showResults = () => {
    const total = questions.length;
    finalScore.textContent = `You scored ${score} out of ${total}.`;
    const percentage = total === 0 ? 0 : Math.round((score / total) * 100);
    if (percentage === 100) {
      finalMessage.textContent = "Perfect score. Outstanding work!";
    } else if (percentage >= 70) {
      finalMessage.textContent = "Great job! You're on top of the basics.";
    } else if (percentage >= 40) {
      finalMessage.textContent =
        "Nice effort. Review a few topics and try again.";
    } else {
      finalMessage.textContent =
        "Keep practicing — you'll improve with each run.";
    }
    setActiveScreen("result");
  };

  const startQuiz = () => {
    applyTopicSelection();
    if (questions.length === 0) {
      return;
    }
    resetState();
    setActiveScreen("quiz");
    renderQuestion();
  };

  const goToNextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      currentIndex += 1;
      updateBadges();
      renderQuestion();
    } else {
      showResults();
    }
  };

  startButton.addEventListener("click", startQuiz);
  nextButton.addEventListener("click", goToNextQuestion);
  restartButton.addEventListener("click", () => {
    setActiveScreen("start");
    resetState();
  });
  playAgainButton.addEventListener("click", startQuiz);
  topicSelect.addEventListener("change", () => {
    applyTopicSelection();
    resetState();
  });

  loadQuestions().then(() => {
    setActiveScreen("start");
  });
})();