# Aura Skincare AI Agent

A browser-based AI voice support app for Aura Skincare that helps customers with order tracking, shipping, returns, cancellations, and policy-related questions.

## Overview

This project combines:
- a React + Vite frontend for the customer support UI
- an Express backend for policy-aware chat responses
- browser speech recognition for voice input
- browser text-to-speech for spoken replies
- mock order data and Aura Skincare policy logic

The app is designed to behave like a support assistant for a premium Indian skincare brand and is meant to be demoed locally in a browser.

## Features

- Voice-based customer interaction using the browser microphone
- Automatic barge-in: sustained customer speech stops the agent's spoken reply
- Selectable English or Hinglish voice interaction
- Built-in quick tools for order checks, shipping rules, and return policy lookups
- Back-and-forth support via a chat endpoint
- Aura Skincare policy-aware responses for:
  - order tracking
  - shipping and delivery policies
  - return and refund rules
  - damage/defect claims
  - cancellation eligibility
  - cash on delivery
- Mock order data for testing flows
- Transcript and summary panel for call tracking
- Local fallback logic when Groq is unavailable

## Tech Stack

- Frontend: React, Vite
- Backend: Express.js
- Speech: Web Speech API (SpeechRecognition + SpeechSynthesis)
- AI integration: Groq Chat Completions API (optional live mode)

## Project Structure

```text
aura-skincare-ai-agent/
├── backend/
│   ├── .env
│   └── server.js
├── public/
├── src/
│   ├── Components/
│   ├── Data/
│   ├── services/
│   ├── App.jsx
│   └── main.jsx
├── .gitignore
├── eslint.config.js
├── index.html
├── package.json
├── package-lock.json
├── README.md
├── vite.config.js
└── dist/
```

## Prerequisites

- Node.js 18+
- npm
- A modern browser such as Chrome or Edge
- Microphone access enabled
- Optional: a valid Groq API key for live AI responses

## Installation

From the project root:

```bash
npm install
```

## Environment Setup

The backend reads environment variables from `backend/.env`.

Example:

```env
PORT=3001
GROQ_API_KEY=
```

To enable live Groq-powered responses, add your API key:

```env
PORT=3001
GROQ_API_KEY=your_actual_groq_key_here
```

If the key is empty or missing, the app falls back to local Aura policy logic.

## Running the App

### 1. Start the backend

```bash
cd backend
node server.js
```

or from the project root:

```bash
node backend/server.js
```

### 2. Start the frontend

In a separate terminal:

```bash
npm run dev
```

Then open the local Vite URL shown in the terminal, usually:

```text
http://localhost:5173
```

## Check Backend Health

Visit:

```text
http://localhost:3001/api/health
```

Expected response:

```json
{"success":true,"message":"Aura Skincare AI Agent backend is running."}
```

## Sample Questions to Test

- Track my order ORD-101
- What is the status of ORD-102?
- Can I cancel ORD-103?
- Do I get free shipping above ₹499?
- What is the return policy?
- Is COD available for orders up to ₹2500?
- My product is damaged, what should I do?
- Book a flight

## Notes

- Speech recognition support depends on the browser and OS.
- Chrome and Edge are the most reliable choices for local voice testing.
- Choose English or Hinglish before starting a call. Hinglish uses the browser's Hindi (India) speech recognition and voice; availability and quality can vary by device.
- Automatic barge-in uses microphone audio with browser echo cancellation; device and browser audio processing can affect detection.
- The app is designed to answer only Aura Skincare-related support questions.
- For out-of-scope questions, it responds politely and redirects back to skincare support.

## License

This project is for learning/demo purposes and is not intended for production deployment without further review and configuration.
