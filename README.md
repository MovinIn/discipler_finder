# Discipler Finder

A full-stack application with React frontend and Java Servlet backend.

## Project Structure

This is a monorepo containing both client and server code:

```
discipler_finder/
├── client/              # React frontend (Vite)
│   ├── src/
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── server/              # Java Servlet backend
│   ├── src/main/
│   │   ├── java/        # Java servlet source code
│   │   └── webapp/      # Web application files
│   └── pom.xml          # Maven configuration
└── README.md
```

## Getting Started

### Prerequisites

**Frontend:**
- Node.js (version 16 or higher)
- npm or yarn

**Backend:**
- Java JDK 17 or higher
- Maven 3.6 or higher
- Servlet container (Tomcat, Jetty, etc.)

### Frontend Setup

1. Navigate to the client directory:
```bash
cd client
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

### Backend Setup

1. Navigate to the server directory:
```bash
cd server
```

2. Build the project:
```bash
mvn clean package
```

3. Deploy the WAR file to your servlet container (Tomcat, etc.)

   The WAR file will be generated at: `server/target/discipler-finder-server.war`

4. The API will be available at `http://localhost:8080/api/*`

### API Endpoints

- `GET /api/health` - Health check endpoint
- `GET /api/users` - Get list of users (example)
- `POST /api/*` - Handle POST requests

## Development

### Running Both Frontend and Backend

1. Start the backend server (Tomcat/Jetty) on port 8080
2. Start the frontend dev server on port 5173
3. The frontend can make API calls to `http://localhost:8080/api/*`

### Building for Production

**Frontend:**
```bash
cd client
npm run build
```

**Backend:**
```bash
cd server
mvn clean package
```

## Technologies

- **Frontend:** React 18, Vite, React Router
- **Backend:** Java Servlets (Jakarta EE), Maven, Gson
