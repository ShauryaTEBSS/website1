const questions = [
  {
    question: "Which is the smallest country in the world?",
    answer: [
      { text: "Nauru", correct: false},
      { text: "Switzerland", correct: false},
      { text: "Vatican City", correct: true},
      { text: "Conova City", correct: false},
    ]
  },
  {
    question: "Which is the largest country in the world?",
    answer: [
      { text: "America", correct: false},
      { text: "Canada", correct: false},
      { text: "China", correct: false},
      { text: "Russia", correct: true},
    ]
  },
  {
    question: "Which country has largest population in world?",
    answer: [
      { text: "China", correct: false},
      { text: "India", correct: true},
      { text: "Pakistan", correct: false},
      { text: "Canada", correct: false},
      ]
   }
  ];

const questionElement = document.getElementById("question");
const answerButton = document.getElementById("answer-buttons");
const nextButton = document.getElementById("next-btn");

let currentQuestionIndex = 0;
let score = 0;

function startQuiz(){
  currentQuestionIndex = 0;
  score = 0;
  nextButton.innerHTML = "Next"
  showQuestion();
}

functiom showQuestion(){
  let currentQuestionIndex = questions[currentQuestionIndex];
  let questionNo = currentQuestionIndex + 1;
  questionElement.innerHTML = questionNo + ". " + currentQuestion.question;

  curentQuestion.answers.forEach(answer => {
    const button = document.createElement("button");
    button.innerHTML = answer.text;
    button.classList.add("btn");
    answerButton.appendChild(button);
  });
}

startQuiz();
