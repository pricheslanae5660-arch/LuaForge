# AI Applet

This project was built and exported from Google AI Studio. 
It is a full-stack React and Express application built with Vite and TypeScript.

## Prerequisites
- Node.js (v18+)
- Firebase Account (for Database and Auth)
- Get a Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)

## Local Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment Variables**
   Copy `.env.example` to `.env.local` or `.env` and fill in your keys:
   ```bash
   cp .env.example .env.local
   # Edit .env.local and populate your GEMINI_API_KEY
   ```

3. **Start the Development Server**
   ```bash
   npm run dev
   ```

## Building for Production
To build the client-side SPA and server bundle, run:
```bash
npm run build
```
Once built, you can run the production server with:
```bash
npm run start
```
