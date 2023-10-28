const questions = [
{
question:"Which is the largest animal in the world?",
answers: [
{ text: "Shark", correct: false},
{ text: "Blue whale", correct: true},
{ text: "Elephant", correct: false},
{ text: "Giraffe", correct: false},
] 
},
{
question:"Which is the smallest continent in the world?",
answers: [
{ text: "Asia", correct: false},
{ text: "Arctic", correct: fasle},
{ text: "Africa", correct: false},
{ text: "Australia", correct: true},
]
},
{
question:"Which is the smallest country in the world?",
answers: [
{ text: "Denmark", correct: false},
{ text: "Nauru", correct: false},
{ text: "Vatican City", correct: true},
{ text: "Pauls City", correct: false},
]
},
{
question:"Which is the largest desert in the world?",
answers: [
{ text: "Kalahari", correct: false},
{ text: "Sahara", correct: true},
{ text: "Gobi", correct: false},
{ text: "Thar", correct: false},
]
}
];

const questionElement = document.getElementById("question");
const answerButton = document.getElementById("answer-buttons");
const nextButton = document.getElementById("next-btn");

let currentQuestionIndex = 0;
let score = 0;

function startQuiz(){
currentQuestionIndex =0;
score= 0;
nextButton.innerHTML = "Next";
showQuestion();
}

fuction showQuestion(){
let currentQuestion = questions[currentQuestionIndex];
let questionNo = currentQuestionIndex + 1;
questionElement.innerHTML = questionNo + ". " + 

currentQuestion.question;

currentQuestion.answers.forEach(answer => {
const button = docuument.createElement("button");
button.innerHTML = answer.text;
button.classList.add("btn");
answerButton.appendChild(button);
});
}

startQuiz();
