import { useEffect, useState } from "react";
import "./App.css";

const createId = () => crypto.randomUUID();

function App() {
  const [profile, setProfile] = useState(() => {
    const defaultProfile = {
      age: "",
      gender: "male",
      height: "",
      weight: "",
      activity: "1.375",
      goal: "maintain",
    };

    try {
      const savedProfile = localStorage.getItem("calorieAIProfile");
      return savedProfile
        ? { ...defaultProfile, ...JSON.parse(savedProfile) }
        : defaultProfile;
    } catch {
      return defaultProfile;
    }
  });
  const [showProfile, setShowProfile] = useState(false);
  const [showAICoach, setShowAICoach] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
const [aiResponse, setAiResponse] = useState("");
const [mealSuggestion, setMealSuggestion] = useState("");
const [showMeal, setShowMeal] = useState(false);
const [mealLoading, setMealLoading] = useState(false);

const cleanAIResponse = (text) => {
  return text
    .replace(/#{1,6}\s*/g, "")
    .replace(/\*\*/g, "")
    .replace(/^\s*[-*]\s*/gm, "• ")
    .replace(/^•\s*--\s*$/gm, "")
.replace(/\*/g, "")
    .trim();
    };

const askAI = async () => {
  setAiLoading(true);
  setAiResponse("");

  try {
    const response = await fetch("http://localhost:5000/api/ai-coach", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        profile,
        meals,
        nutrition: {
          totalCalories,
          calorieGoal,
          remainingCalories,
          totalProtein,
          proteinTarget,
          totalCarbs,
          carbsTarget,
          totalFats,
          fatTarget,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "AI request failed");
    }

    setAiResponse(data.analysis);
  } catch (error) {
    console.error(error);
    setAiResponse(
      "Sorry, I couldn't analyze your nutrition right now."
    );
  } finally {
    setAiLoading(false);
  }
};
const generateMeal = async () => {
  setMealLoading(true);
  setMealSuggestion("");
  setShowMeal(true);

  try {
    const response = await fetch(
      "http://localhost:5000/api/meal-generator",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profile,
          nutrition: {
            totalCalories,
            calorieGoal,
            remainingCalories,
            totalProtein,
            proteinTarget,
            totalCarbs,
            carbsTarget,
            totalFats,
            fatTarget,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Meal generation failed");
    }

    setMealSuggestion(data.meal);

  } catch (error) {
    console.error("Meal Generator Error:", error);
    setMealSuggestion("Sorry, I couldn't generate a meal right now.");
  } finally {
    setMealLoading(false);
  }
};
const handleFoodPhoto = (e) => {
  const file = e.target.files[0];

  if (!file) return;

  setSelectedFoodImage(file);

  const previewUrl = URL.createObjectURL(file);
  setFoodImagePreview(previewUrl);
};

const analyzeFood = async () => {
  if (!selectedFoodImage) {
    return;
  }

  setFoodAnalyzing(true);
  setFoodAnalysis("");

  try {
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const result = reader.result;

        // data:image/jpeg;base64,XXXX me se sirf XXXX lena hai
        const base64Data = result.split(",")[1];

        resolve(base64Data);
      };

      reader.onerror = reject;
      reader.readAsDataURL(selectedFoodImage);
    });



    const response = await fetch(
      "http://localhost:5000/api/food-recognition",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: base64,
          mimeType: selectedFoodImage.type,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Food recognition failed"
      );
    }

    setFoodAnalysis(data.result);

  } catch (error) {
    console.error("Food Recognition Error:", error);
    setFoodAnalysis(
      "Sorry, I couldn't analyze this food image right now."
    );
  } finally {
    setFoodAnalyzing(false);
  }
};

const addRecognizedFood = () => {
  if (!foodAnalysis) return;

  const foodNameMatch = foodAnalysis.match(/Food Name:\s*(.+)/i);
  const caloriesMatch = foodAnalysis.match(/Calories:\s*([\d.]+)/i);
  const proteinMatch = foodAnalysis.match(/Protein:\s*([\d.]+)/i);
  const carbsMatch = foodAnalysis.match(/Carbs:\s*([\d.]+)/i);
  const fatsMatch = foodAnalysis.match(/Fats:\s*([\d.]+)/i);

  const newFood = {
    id: createId(),
    type: "Food Scan",
    food: foodNameMatch ? foodNameMatch[1].trim() : "Scanned Food",
    calories: caloriesMatch ? Number(caloriesMatch[1]) : 0,
    protein: proteinMatch ? Number(proteinMatch[1]) : 0,
    carbs: carbsMatch ? Number(carbsMatch[1]) : 0,
    fats: fatsMatch ? Number(fatsMatch[1]) : 0,
    icon: "📸",
  };

  setMeals((prevMeals) => [...prevMeals, newFood]);

  setFoodAnalysis("");
  setFoodImagePreview("");
  setSelectedFoodImage(null);
};

const calculateCalories = () => {
  const age = Number(profile.age);
  const height = Number(profile.height);
  const weight = Number(profile.weight);

  if (!age || !height || !weight) {
    return 2200;
  }

  let bmr;

  if (profile.gender === "male") {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  }

  let tdee = bmr * Number(profile.activity);

  if (profile.goal === "lose") {
    tdee -= 500;
  } else if (profile.goal === "gain") {
    tdee += 300;
  }

  return Math.round(tdee);
};

const calorieGoal = calculateCalories();

const proteinTarget = profile.weight
  ? Math.round(Number(profile.weight) * 1.6)
  : 120;

const fatTarget = Math.round((calorieGoal * 0.25) / 9);

const carbsTarget = Math.max(
  Math.round(
    (calorieGoal - proteinTarget * 4 - fatTarget * 9) / 4
  ),
  0
);

 const [meals, setMeals] = useState(() => {
  const savedMeals = localStorage.getItem("calorieAIMeals");

  if (savedMeals) {
    return JSON.parse(savedMeals);
  }

  return [
    {
      id: 1,
      type: "Breakfast",
      food: "Eggs, Toast & Banana",
      calories: 420,
      protein: 20,
      carbs: 45,
      fats: 15,
      icon: "🍳",
    },
    {
      id: 2,
      type: "Lunch",
      food: "Rice, Dal & Vegetables",
      calories: 650,
      protein: 25,
      carbs: 85,
      fats: 18,
      icon: "🍛",
    },
    {
      id: 3,
      type: "Snack",
      food: "Apple & Yogurt",
      calories: 170,
      protein: 8,
      carbs: 28,
      fats: 3,
      icon: "🍎",
    },
  ];
});

const [selectedFoodImage, setSelectedFoodImage] = useState(null);
const [foodImagePreview, setFoodImagePreview] = useState("");
const [foodAnalysis, setFoodAnalysis] = useState("");
const [foodAnalyzing, setFoodAnalyzing] = useState(false);



useEffect(() => {
  localStorage.setItem(
    "calorieAIMeals",
    JSON.stringify(meals)
  );
}, [meals]);

  const [showModal, setShowModal] = useState(false);

  const [foodForm, setFoodForm] = useState({
    type: "Meal",
    food: "",
    calories: "",
    protein: "",
    carbs: "",
    fats: "",
  });

  const totalCalories = meals.reduce(
    (total, meal) => total + Number(meal.calories),
    0
  );

  const totalProtein = meals.reduce(
    (total, meal) => total + Number(meal.protein),
    0
  );

  const totalCarbs = meals.reduce(
    (total, meal) => total + Number(meal.carbs),
    0
  );

  const totalFats = meals.reduce(
    (total, meal) => total + Number(meal.fats),
    0
  );

  const remainingCalories = Math.max(calorieGoal - totalCalories, 0);

  const progress = Math.min(
    (totalCalories / calorieGoal) * 100,
    100
  );

  const handleChange = (e) => {
    setFoodForm({
      ...foodForm,
      [e.target.name]: e.target.value,
    });
  };

  const addFood = (e) => {
    e.preventDefault();

    if (!foodForm.food || !foodForm.calories) {
      alert("Please enter food name and calories.");
      return;
    }

    const newMeal = {
      id: createId(),
      type: foodForm.type,
      food: foodForm.food,
      calories: Number(foodForm.calories),
      protein: Number(foodForm.protein) || 0,
      carbs: Number(foodForm.carbs) || 0,
      fats: Number(foodForm.fats) || 0,
      icon: "🍽️",
    };

    setMeals([...meals, newMeal]);

    setFoodForm({
      type: "Meal",
      food: "",
      calories: "",
      protein: "",
      carbs: "",
      fats: "",
    });

    setShowModal(false);
  };

  const deleteFood = (id) => {
    setMeals(meals.filter((meal) => meal.id !== id));
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="logo">
          🥗 <span>CalorieAI</span>
        </div>

        <button
  type="button"
  className="profile-btn"
  onClick={() => setShowProfile(true)}
>
  👤 Profile
</button>
      </header>

      {/* Dashboard */}
      <main className="dashboard">
        {showProfile && (
  <div className="modal-overlay">
    <div className="modal">

      <div className="modal-header">
        <div>
          <p className="small-text">YOUR PROFILE</p>
          <h2>Personal Information</h2>
        </div>

        <button
          type="button"
          className="close-btn"
          onClick={() => setShowProfile(false)}
        >
          ✕
        </button>
      </div>

      <form
  onSubmit={(e) => {
    e.preventDefault();

    localStorage.setItem(
      "calorieAIProfile",
      JSON.stringify(profile)
    );

    setShowProfile(false);
  }}
>
        <label>Age</label>
        <input
          type="number"
          value={profile.age}
          onChange={(e) =>
            setProfile({ ...profile, age: e.target.value })
          }
        />

        <label>Gender</label>
        <select
          value={profile.gender}
          onChange={(e) =>
            setProfile({ ...profile, gender: e.target.value })
          }
        >
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>

        <div className="form-grid">
          <div>
            <label>Height (cm)</label>
            <input
              type="number"
              value={profile.height}
              onChange={(e) =>
                setProfile({ ...profile, height: e.target.value })
              }
            />
          </div>

          <div>
            <label>Weight (kg)</label>
            <input
              type="number"
              value={profile.weight}
              onChange={(e) =>
                setProfile({ ...profile, weight: e.target.value })
              }
            />
          </div>
        </div>

        <label>Activity Level</label>
        <select
          value={profile.activity}
          onChange={(e) =>
            setProfile({ ...profile, activity: e.target.value })
          }
        >
          <option value="1.2">Sedentary</option>
          <option value="1.375">Lightly Active</option>
          <option value="1.55">Moderately Active</option>
          <option value="1.725">Very Active</option>
          <option value="1.9">Extremely Active</option>
        </select>

        <label>Fitness Goal</label>
        <select
          value={profile.goal}
          onChange={(e) =>
            setProfile({ ...profile, goal: e.target.value })
          }
        >
          <option value="lose">Lose Weight</option>
          <option value="maintain">Maintain Weight</option>
          <option value="gain">Gain Weight</option>
        </select>

        <button type="submit" className="save-food-btn">
          Save Profile
        </button>
      </form>

    </div>
  </div>
)}

        {/* Welcome */}
        <section className="welcome">
          <div>
            <p className="small-text">WELCOME BACK 👋</p>
            <h1>Good Morning!</h1>
            <p>
              Track your nutrition and reach your goals.
            </p>
          </div>

          <div className="date-card">
            📅 Today
          </div>
        </section>

        {/* Calories */}
        <section className="calorie-card">
          <div>
            <p className="card-label">DAILY CALORIES</p>

            <h2>
              {totalCalories.toLocaleString()}{" "}
              <span>/ {calorieGoal.toLocaleString()} kcal</span>
            </h2>

            <div className="progress-bar">
              <div
                className="progress"
                style={{ width: `${progress}%` }}
              ></div>
            </div>

            <p className="remaining">
              🔥 {remainingCalories.toLocaleString()} kcal remaining
            </p>
          </div>

          <div className="calorie-circle">
            <strong>{Math.round(progress)}%</strong>
            <span>Goal</span>
          </div>
        </section>

        {/* Macros */}
        <section className="stats-grid">

          <div className="stat-card">
            <div className="stat-icon">🥩</div>
            <div>
              <p>Protein</p>
              <h3>
                {totalProtein} <span>/ 120g</span>
              </h3>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🍞</div>
            <div>
              <p>Carbs</p>
              <h3>
                {totalCarbs} <span>/ 250g</span>
              </h3>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🥑</div>
            <div>
              <p>Fats</p>
              <h3>
                {totalFats} <span>/ 70g</span>
              </h3>
            </div>
          </div>

        </section>

        {/* Meals */}
        <section className="meals-section">

          <div className="section-header">
            <div>
              <p className="small-text">TODAY'S FOOD</p>
              <h2>Today's Meals</h2>
            </div>

            <button
              className="add-btn"
              onClick={() => setShowModal(true)}
            >
              + Add Food
            </button>

            <button
  type="button"
  className="photo-food-btn"
  onClick={() => document.getElementById("food-photo-input").click()}
>
  📸 Scan Food Photo
</button>

<input
  id="food-photo-input"
  type="file"
  accept="image/*"
  style={{ display: "none" }}
  onChange={handleFoodPhoto}
/>
{foodImagePreview && (
  <div className="food-photo-preview">
    <img
      src={foodImagePreview}
      alt="Selected food"
    />

   <button
  type="button"
  className="analyze-food-btn"
  onClick={analyzeFood}
  disabled={foodAnalyzing}
>
  {foodAnalyzing ? "🤖 Analyzing..." : "🔍 Analyze Food"}
</button>

{foodAnalysis && (
  <div>
    <div className="food-analysis-result">
      <h3>🍎 Food Analysis</h3>

      {foodAnalysis
        .split("\n")
        .map((line, index) => (
          <p key={index}>{line}</p>
        ))}
    </div>

    <button
      type="button"
      className="add-scanned-food-btn"
      onClick={addRecognizedFood}
    >
      ➕ Add This Food
    </button>
  </div>
)}
  </div>
)}
          </div>

          <div className="meal-list">

            {meals.map((meal) => (
              <div className="meal" key={meal.id}>

                <div className="meal-left">

                  <div className="meal-icon">
                    {meal.icon}
                  </div>

                  <div>
                    <h3>{meal.type}</h3>
                    <p>{meal.food}</p>
                  </div>

                </div>

                <div className="meal-right">
                  <strong>
                    {meal.calories} kcal
                  </strong>

                  <button
                    className="delete-btn"
                    onClick={() => deleteFood(meal.id)}
                  >
                    🗑️
                  </button>
                </div>

              </div>
            ))}

          </div>

        </section>

        {/* AI Card */}
        <section className="ai-card">
  <div className="ai-icon">
    🤖
  </div>

  <div className="ai-content">
    <p className="small-text">
      AI NUTRITION COACH
    </p>

    <h2>
      Your personal nutrition assistant
    </h2>

    <p>
      Get personalized insights based on your calories,
      meals, macros and fitness goal.
    </p>
  </div>
<button
  className="ai-btn"
  onClick={() => {
    setShowAICoach(true);
    askAI();
  }}
>
  Ask AI →
</button>

<button
  className="meal-generator-btn"
  onClick={generateMeal}
  disabled={mealLoading}
>
  {mealLoading ? "🤖 Generating..." : "🍽️ Generate Meal"}
</button>
</section>

{showAICoach && (
  <div className="modal-overlay">
    <div className="modal ai-modal">

      <div className="modal-header">
        <div>
          <p className="small-text">
            🤖 AI NUTRITION COACH
          </p>

          <h2>Today's Nutrition Analysis</h2>
        </div>

        <button
          type="button"
          className="close-btn"
          onClick={() => setShowAICoach(false)}
        >
          ✕
        </button>
      </div>

      <div className="ai-summary">
        <div className="ai-summary-icon">
          🧠
        </div>

        <div>
          <h3>You're doing well!</h3>

          <p>
            Based on your current meals and nutrition
            targets, here's your personalized analysis.
          </p>
        </div>
      </div>

      <div className="ai-insights">

        <div className="ai-insight">
          <span>🔥</span>
          <div>
            <strong>Calories</strong>
            <p>
              You have {remainingCalories} kcal remaining
              today.
            </p>
          </div>
        </div>

        <div className="ai-insight">
          <span>🥩</span>
          <div>
            <strong>Protein</strong>
            <p>
              You've consumed {totalProtein}g out of your{" "}
              {proteinTarget}g target.
            </p>
          </div>
        </div>

        <div className="ai-insight">
          <span>🥗</span>
          <div>
            <strong>Recommendation</strong>
            <p>
              Consider adding a protein-rich food to your
              next meal.
            </p>
          </div>
        </div>

      </div>

      <div className="ai-response">
  {aiLoading ? (
    <p>Analyzing your nutrition... 🤖</p>
  ) : (
    <div className="ai-response-text">
  {aiResponse
    ? cleanAIResponse(aiResponse)
        .split("\n")
        .map((line, index) => (
          <p key={index}>{line}</p>
        ))
    : "Ask AI to analyze your nutrition."}
</div>
  )}
</div>

      <button
        className="save-food-btn"
        onClick={() => setShowAICoach(false)}
      >
        Got it 👍
      </button>

    </div>
  </div>
)}
{showMeal && (
  <div className="modal-overlay">
    <div className="modal meal-modal">

      <div className="modal-header">
        <div>
          <p className="small-text">🍽️ AI MEAL PLANNER</p>
          <h2>Your Meal Recommendation</h2>
        </div>

        <button
          type="button"
          className="close-btn"
          onClick={() => setShowMeal(false)}
        >
          ×
        </button>
      </div>

      <div className="meal-result">
        {mealLoading ? (
          <p className="meal-loading">
            🤖 Creating your personalized meal...
          </p>
        ) : (
          <div className="meal-response">
            {mealSuggestion
              .split("\n")
              .map((line, index) => (
                <p key={index}>{line}</p>
              ))}
          </div>
        )}
      </div>

      {!mealLoading && (
        <button
          type="button"
          className="got-it-btn"
          onClick={() => setShowMeal(false)}
        >
          Got it 👍
        </button>
      )}

    </div>
  </div>
)}

      </main>

      {/* Add Food Modal */}
      {showModal && (
        <div className="modal-overlay">

          <div className="modal">

            <div className="modal-header">
              <div>
                <p className="small-text">
                  FOOD TRACKER
                </p>

                <h2>Add Food</h2>
              </div>

              <button
                className="close-btn"
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={addFood}>

              <label>Meal Type</label>

              <select
                name="type"
                value={foodForm.type}
                onChange={handleChange}
              >
                <option>Breakfast</option>
                <option>Lunch</option>
                <option>Dinner</option>
                <option>Snack</option>
              </select>

              <label>Food Name</label>

              <input
                type="text"
                name="food"
                placeholder="e.g. Chicken Breast"
                value={foodForm.food}
                onChange={handleChange}
              />

              <div className="form-grid">

                <div>
                  <label>Calories</label>

                  <input
                    type="number"
                    name="calories"
                    placeholder="300"
                    value={foodForm.calories}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label>Protein (g)</label>

                  <input
                    type="number"
                    name="protein"
                    placeholder="25"
                    value={foodForm.protein}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label>Carbs (g)</label>

                  <input
                    type="number"
                    name="carbs"
                    placeholder="30"
                    value={foodForm.carbs}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label>Fats (g)</label>

                  <input
                    type="number"
                    name="fats"
                    placeholder="10"
                    value={foodForm.fats}
                    onChange={handleChange}
                  />
                </div>

              </div>

              <button
  type="submit"
  className="save-food-btn"
>
  + Add Food
</button>

<button
  type="button"
  className="photo-food-btn"
  onClick={() =>
    document.getElementById("food-photo-input").click()
  }
>
  📸 Scan Food Photo
</button>

<input
  id="food-photo-input"
  type="file"
  accept="image/*"
  style={{ display: "none" }}
  onChange={handleFoodPhoto}
/>

            </form>

          </div>

        </div>
      )}

    </div>
  );
}

export default App;