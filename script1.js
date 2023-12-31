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
const answerButtons = document.getElementById("answer-buttons");
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
  resetState();
  let currentQuestionIndex = questions[currentQuestionIndex];
  let questionNo = currentQuestionIndex + 1;
  questionElement.innerHTML = questionNo + ". " + currentQuestion.question;

  curentQuestion.answers.forEach(answer => {
    const button = document.createElement("button");
    button.innerHTML = answer.text;
    button.classList.add("btn");
    answerButtons.appendChild(button);
    if(answer.correct){
      button.dataset.correct = answer.correct;
    button.addEventListner("button", selectAnswer);
  });
}


function resetState(){
  nextButton.style.display = "none";
  while(answerButtons.firstChild){
    answerButtons.removeChild(answerButtons.firstChild);
}

function selectAnswer(e){
  const selectedBtn = e.target;
  const isCorrect = selectedBtn.dataset.correct === "true";
  if(isCorrect){
    selectedBtn.classList.add("correct");
  }else{
    selectedBtn.classList.add("incorrect");
  }
}

startQuiz();
