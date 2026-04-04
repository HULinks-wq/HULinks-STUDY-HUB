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
  const [loading, setLoading] = useState(false);

  const fetchQuiz = async () => {
    setLoading(true);

    try {
      const res = await fetch("https://hulinks-study-hub.up.railway.app/api/ai");
      const data = await res.json();

      console.log("API RESULT:", data);

      if (data && data.quiz) {
        setQuestions(data.quiz);
        setCurrent(0);
        setScore(0);
      } else {
        console.error("Invalid API response:", data);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchQuiz();
  }, []);

  const handleAnswer = (index: number) => {
    const correct = questions[current].answer;

    if (String.fromCharCode(65 + index) === correct) {
      setScore((prev) => prev + 1);
    }

    setCurrent((prev) => prev + 1);
  };

  if (loading) return <h1>Loading AI Quiz... 🤖</h1>;

  if (!loading && questions.length === 0) {
    return <p>Failed to load quiz ❌</p>;
  }

  if (current >= questions.length) {
    return (
      <div>
        <h1>Quiz Finished 🎉</h1>
        <p>Your score: {score}</p>

        <button onClick={fetchQuiz}>
          Generate New Quiz 🔥
        </button>
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

      <br /><br />

      <button onClick={fetchQuiz}>
        New Quiz 🔁
      </button>
    </div>
  );
}