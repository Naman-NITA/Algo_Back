const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Interview = require('./models/Interview');
require('dotenv').config();

const app = express();
const mongoDB = process.env.URL_API;

// ✅ Fixed CORS config — removed trailing slash
app.use(cors({
  origin: 'https://algo-project-duhl.vercel.app',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// POST route to save interview data
app.post('/api/interview', async (req, res) => {
  try {
    const { company, role, position, experience, year, questions } = req.body;

    if (!questions || !questions.every(q =>
      q.text && q.topic && q.roundType && q.difficulty
    )) {
      return res.status(400).json({
        error: "Each question must have text, topic, roundType, and difficulty"
      });
    }

    const newEntry = new Interview({
      company,
      role,
      position,
      experience,
      year,
      questions: questions.map(q => ({
        text: q.text,
        topic: q.topic,
        roundType: q.roundType,
        difficulty: q.difficulty,
        frequency: q.frequency || 3,
        recency: q.recency || new Date()
      }))
    });

    await newEntry.save();
    res.status(201).json({
      message: "Interview data saved successfully",
      data: newEntry
    });

  } catch (err) {
    res.status(500).json({
      error: "Failed to save data",
      details: err.message
    });
  }
});

// GET route to search interview questions
app.get('/api/interview/search', async (req, res) => {
  try {
    const { company, role, position, year, topic, difficulty } = req.query;

    if (!company || !role || !position || !year) {
      return res.status(400).json({
        error: "All parameters (company, role, position, year) are required."
      });
    }

    const interviewQuery = {
      company: new RegExp(`^${company.trim()}$`, 'i'),
      role: new RegExp(`^${role.trim()}$`, 'i'),
      position: new RegExp(`^${position.trim()}$`, 'i'),
      year: new RegExp(`^${year.trim()}$`, 'i')
    };

    const interviews = await Interview.find(interviewQuery);

    if (interviews.length === 0) {
      return res.status(404).json({ message: "No matching data found." });
    }

    let allQuestions = [];
    for (const interview of interviews) {
      let filteredQuestions = interview.questions;
      if (topic) {
        filteredQuestions = filteredQuestions.filter(q => q.topic === topic);
      }
      if (difficulty) {
        filteredQuestions = filteredQuestions.filter(q => q.difficulty === difficulty);
      }
      allQuestions.push(...filteredQuestions);
    }

    if (allQuestions.length === 0) {
      return res.status(404).json({ message: "No questions found for the given filters." });
    }

    res.status(200).json({
      totalResults: interviews.length,
      totalQuestions: allQuestions.length,
      questions: allQuestions
    });

  } catch (error) {
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});

// Start the server after DB connects
async function startServer() {
  try {
    await mongoose.connect(mongoDB);
    console.log('MongoDB is connected');

    app.listen(5000, () => {
      console.log("Server is running on port: 5000");
    });

  } catch (err) {
    console.error("Unable to connect to the server:", err);
  }
}

startServer();
