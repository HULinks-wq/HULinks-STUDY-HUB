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

  const fetchQuiz = async () => {
    try {
      const res = await fetch("https://hulinks-study-hub.up.railway.app/api/ai");
      const data = await res.json();
      setQuestions(data.quiz);
      setCurrent(0);
      setScore(0);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchQuiz();
  }, []);

  const handleAnswer = (index: number) => {
    const correct = questions[current].answer;

    if (String.fromCharCode(65 + index) === correct) {
      setScore(score + 1);
    }

    setCurrent(current + 1);
  };

  if (questions.length === 0) {
    return <p style={{ textAlign: "center" }}>Loading AI Quiz... 🤖</p>;
  }

  if (current >= questions.length) {
    return (
      <div style={{ textAlign: "center" }}>
        <h1>🎉 Quiz Finished</h1>
        <h2>Score: {score} / {questions.length}</h2>

        <button onClick={fetchQuiz} style={btnStyle}>
          🔁 New Quiz
        </button>
      </div>
    );
  }

  return (
    <div style={container}>
      <h2>Question {current + 1}</h2>
      <h1>{questions[current].question}</h1>

      <div style={{ marginTop: 20 }}>
        {questions[current].options.map((opt, i) => (
          <button key={i} onClick={() => handleAnswer(i)} style={btnStyle}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

const container = {
  maxWidth: "600px",
  margin: "auto",
  textAlign: "center" as const,
  padding: "20px",
};

const btnStyle = {
  display: "block",
  width: "100%",
  margin: "10px 0",
  padding: "12px",
  fontSize: "16px",
  borderRadius: "8px",
  border: "none",
  backgroundColor: "#4CAF50",
  color: "white",
  cursor: "pointer",
};