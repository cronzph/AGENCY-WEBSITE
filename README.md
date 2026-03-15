# Freelance Agency System

A comprehensive freelance agency management system built with React, Firebase, and TailwindCSS.

## Tech Stack

- **Frontend**: React 19 + Vite
- **Routing**: React Router DOM
- **Backend/Database**: Firebase (Firestore + Authentication)
- **Styling**: TailwindCSS
- **Deployment**: Vercel

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

Refer to `.env.example` for the required environment variables template.

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
```

2. Navigate to the project directory:
```bash
cd freelance-agency-system
```

3. Install dependencies:
```bash
npm install
```

4. Create your `.env` file with Firebase credentials

5. Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Building for Production

```bash
npm run build
```

Build output will be in the `dist` folder.

## Deployment to Vercel

1. Push your code to GitHub

2. Go to [Vercel](https://vercel.com) and sign in

3. Click "Add New..." → "Project"

4. Import your GitHub repository

5. Configure the project:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`

6. Add your environment variables in Vercel project settings

7. Click "Deploy"

Your site will be deployed and ready at your Vercel URL.

## Project Structure

```
src/
├── components/
│   ├── admin/
│   ├── client/
│   └── shared/
├── pages/
│   ├── admin/
│   │   ├── Dashboard.jsx
│   │   ├── Login.jsx
│   │   ├── Clients.jsx
│   │   ├── Projects.jsx
│   │   └── Payments.jsx
│   └── public/
│       ├── Landing.jsx
│       ├── Inquiry.jsx
│       ├── Proposal.jsx
│       ├── Payment.jsx
│       └── Delivery.jsx
├── firebase/
│   ├── config.js
│   └── firestore.js
├── ai/
│   ├── cerebras.js
│   └── groq.js
└── utils/
```

## Features

### Public Routes
- `/` - Landing page
- `/inquiry` - Submit inquiry
- `/proposal/:id` - View proposal
- `/payment/:id` - Make payment
- `/delivery/:id` - View delivery

### Admin Routes (Protected)
- `/admin` - Dashboard
- `/admin/login` - Admin login
- `/admin/clients` - Manage clients
- `/admin/projects` - Manage projects
- `/admin/payments` - Manage payments
