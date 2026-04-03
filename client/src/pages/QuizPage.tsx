import { useEffect, useState } from "react";

type Question = {
  question: string;
  options: string[];
  answer: string;
};

export default function QuizPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);

  // 🔥 THIS IS WHERE YOUR BACKEND CONNECTS
  useEffect(() => {
    fetch("https://hulinks-study-hub.up.railway.app/api/ai")
      .then(res => res.json())
      .then(data => {
        console.log("API RESULT:", data); // for debugging
        setQuestions(data.quiz);
      })
      .catch(err => console.error(err));
  }, []);

  const handleAnswer = (index: number) => {
    const correct = questions[current].answer;

    if (String.fromCharCode(65 + index) === correct) {
      setScore(score + 1);
    }

    setCurrent(current + 1);
  };

  if (questions.length === 0) return <p>Loading...</p>;

  if (current >= questions.length) {
    return (
      <div>
        <h1>Quiz Finished 🎉</h1>
        <p>Your score: {score}</p>
      </div>
    );
  }

  return (
    <div>
      <h1>{questions[current].question}</h1>

      {questions[current].options.map((opt, i) => (
        <button key={i} onClick={() => handleAnswer(i)}>
          {opt}
        </button>
      ))}
    </div>
  );
}