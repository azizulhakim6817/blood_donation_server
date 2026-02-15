# node.js + express.js------

# React + Vite

### Frontend Live URL :

https://blood-donation-client-brown.vercel.app

### Backend Live URL :

https://blood-donation-server-hazel.vercel.app/donation-requests

### Admin Dashboard access :

1. Email : programmerazizulhakim@gmail.com
2. Password : 123456

# Blood Donation Backend API

## Overview

This is the backend API for the Blood Donation Application.  
It handles user authentication, donation requests, donor matching, and status management.

- Node.js + Express.js
- MongoDB (or your database)
- JWT Authentication
- RESTful API

---

## Features

- User registration & login
- CRUD operations for blood donation requests
- Filter donation requests by status
- Update donation request status (Pending, In Progress, Done, Canceled)
- Delete donation requests
- Role-based access control (User / Admin / Volunteer)
- Secure API endpoints

---

## Technologies

- Node.js
- Express.js
- MongoDB / Mongoose
- JWT for authentication
- bcrypt for password hashing
- dotenv for environment variables
- cors for cross-origin requests
- sweetalert / frontend integration

---

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/blood-donation-backend.git
cd blood-donation-backend
2. Install Dependencies
bash
Copy code
npm install
3. Environment Variables
Create a .env file in the root folder:

env
Copy code
PORT=5000
MONGO_URI=mongodb://localhost:27017/blood_donation
JWT_SECRET=your_jwt_secret
4. Run the Server
bash
Copy code
# Development
npm run dev

# Production
npm start
Server will start at: https://blood-donation-server-hazel.vercel.app

API Endpoints
Auth
Method	Endpoint	Description
POST	/auth/register	Register new user
POST	/auth/login	Login user and get JWT

Donation Requests
Method	Endpoint	Description
GET	/donation-requests/all?email={email}	Get all donation requests of a user
GET	/donation-requests/:id	Get single donation request
POST	/donation-requests	Create new donation request
PATCH	/update-donation-status/:id	Update request status
DELETE	/delete-donation-requests/:id	Delete request

Users (Admin Only)
Method	Endpoint	Description
GET	/users	Get all users
PATCH	/users/:id/role	Update user role
PATCH	/users/:id/status	Block / Unblock user

Folder Structure
bash
Copy code
backend/
├─ controllers/       # Request handlers
├─ models/            # Mongoose schemas
├─ routes/            # API routes
├─ middleware/        # Authentication & error handling
├─ config/            # DB connection & environment setup
├─ utils/             # Helper functions
├─ server.js          # Express server entry point
├─ package.json
└─ .env
```
