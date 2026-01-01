# Discipler Finder Server

Java Servlet backend for the Discipler Finder application.

## Push Docker Image to Docker Hub
```
mvn clean package
docker build --platform linux/arm64 -t movinin/dfinder_backend:latest .
docker tag movinin/dfinder_backend:latest movinin/dfinder_backend:latest
docker push movinin/dfinder_backend:latest
```

## Run Docker Image
docker run -d \
  --replace \
  --name dfinder_backend \
  -p 8080:8080 \
  movinin/dfinder_backend:latest

## Structure

```
server/
├── src/main/
│   ├── java/com/disciplefinder/servlets/
│   │   └── ApiServlet.java      # Main API servlet
│   ├── webapp/
│   │   ├── WEB-INF/
│   │   │   └── web.xml          # Servlet configuration
│   │   └── index.html           # Welcome page
│   └── resources/               # Configuration files
└── pom.xml                      # Maven dependencies
```

## Building

```bash
mvn clean package
```

This creates a WAR file at `target/discipler-finder-server.war`

## Deployment

### Using Tomcat

1. Copy the WAR file to Tomcat's `webapps` directory
2. Start Tomcat
3. Access the API at `http://localhost:8080/discipler-finder-server/api/*`

### Using Embedded Jetty (for development)

You can add the Jetty Maven plugin to `pom.xml` for easy development:

```xml
<plugin>
    <groupId>org.eclipse.jetty</groupId>
    <artifactId>jetty-maven-plugin</artifactId>
    <version>11.0.20</version>
</plugin>
```

Then run: `mvn jetty:run`

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/users` - Example users endpoint
- `POST /api/*` - Handle POST requests

## CORS Configuration

The servlet includes CORS headers to allow requests from the React frontend. 
You can modify the `setCorsHeaders()` method in `ApiServlet.java` to restrict 
origins for production.

## Adding New Servlets

1. Create a new servlet class in `src/main/java/com/disciplefinder/servlets/`
2. Annotate with `@WebServlet` or register in `web.xml`
3. Rebuild and redeploy

