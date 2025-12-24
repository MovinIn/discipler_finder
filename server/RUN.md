# How to Run the Discipler Finder Server

## Prerequisites

- Java 17 or higher
- Maven 3.6+ installed
- MySQL database running (configured in `vm.properties`)

## Quick Start (Recommended for Development)

### Option 1: Using Jetty Maven Plugin (Easiest)

1. Navigate to the server directory:
   ```bash
   cd server
   ```

2. Run the server:
   ```bash
   mvn jetty:run
   ```

3. The server will start on `http://localhost:8080`
   - API endpoints: `http://localhost:8080/api/*`
   - Health check: `http://localhost:8080/api/health`

4. Press `Ctrl+C` to stop the server

### Option 2: Build and Deploy to Tomcat

1. Build the WAR file:
   ```bash
   cd server
   mvn clean package
   ```

2. This creates `target/discipler-finder-server.war`

3. Deploy to Tomcat:
   - Copy the WAR file to Tomcat's `webapps` directory
   - Start Tomcat
   - Access at `http://localhost:8080/discipler-finder-server/api/*`

## Configuration

Make sure your `vm.properties` file (in `src/main/resources/`) contains:
- Database connection details (url, username, password)
- SMTP settings for email (smtp.host, smtp.port, smtp.user, smtp.password)
- App base URL (app.base_url)

## Troubleshooting

- **Port 8080 already in use**: Change the port in `pom.xml` under the jetty plugin configuration
- **Database connection errors**: Check your `vm.properties` database settings
- **ClassNotFoundException**: Make sure all Maven dependencies are downloaded: `mvn clean install`

## API Testing

Once running, test the API:
```bash
# Health check
curl http://localhost:8080/api/health

# Login (example)
curl -X POST http://localhost:8080/api \
  -d "action=login&email=test@example.com&password=test123" \
  -H "Content-Type: application/x-www-form-urlencoded"
```

