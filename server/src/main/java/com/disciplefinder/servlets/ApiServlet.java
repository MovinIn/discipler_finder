package com.disciplefinder.servlets;

import at.favre.lib.crypto.bcrypt.BCrypt;
import com.google.gson.Gson;
import jakarta.servlet.ServletConfig;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.InputStream;
import java.io.PrintWriter;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Map;
import java.util.Properties;
import java.util.Random;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;

@FunctionalInterface
interface MySQLFunction {
  void execute(Connection conn) throws SQLException, IOException;
}

@WebServlet(name = "ApiServlet", urlPatterns = { "/api", "/api/*" })
public class ApiServlet extends HttpServlet {

  private static final Gson gson = new Gson();
  private static HikariDataSource ds;
  private static final String ALPHANUMERIC = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  @Override
  public void init(ServletConfig config) throws ServletException {
    super.init(config);
    System.out.println("init called");

    try {
      Class.forName("com.mysql.cj.jdbc.Driver");
      System.out.println("MySQL driver loaded");

      // Load properties
      InputStream input = getClass().getClassLoader().getResourceAsStream("localhost.properties");
      if (input == null) {
        throw new ServletException("local.properties not found");
      }
      Properties props = new Properties();
      props.load(input);

      // Setup HikariCP
      HikariConfig hikariConfig = new HikariConfig();
      hikariConfig.setJdbcUrl(props.getProperty("url"));
      hikariConfig.setUsername(props.getProperty("username"));
      hikariConfig.setPassword(props.getProperty("password"));
      hikariConfig.setMaximumPoolSize(5);

      ds = new HikariDataSource(hikariConfig);
      System.out.println("HikariCP pool initialized");

      // Optional test connection
      try (Connection conn = ds.getConnection()) {
        if (conn.isValid(2)) {
          System.out.println("Database connection successful");
        } else {
          throw new SQLException("Test connection failed");
        }
      }

    } catch (Exception e) {
      throw new ServletException("Database initialization failed", e);
    }
  }

  public static Connection getConnection() throws SQLException {
    return ds.getConnection();
  }

  private String getRandomAlphanumeric(int length) {
    StringBuilder sb = new StringBuilder(length);
    Random rnd = new Random();
    for (int i = 0; i < length; i++) {
      sb.append(ALPHANUMERIC.charAt(rnd.nextInt(ALPHANUMERIC.length())));
    }
    return sb.toString();
  }

  public static void sendJson(HttpServletResponse response, Object obj, int status) throws IOException {
    response.setContentType("application/json");
    response.setCharacterEncoding("UTF-8");
    response.setStatus(status);

    String json = gson.toJson(obj);

    try (PrintWriter out = response.getWriter()) {
      out.print(json);
      out.flush();
    }
  }

  public static void sendJson(HttpServletResponse response, Object obj) throws IOException {
    sendJson(response, obj, HttpServletResponse.SC_OK);
  }

  private void executeSQL(MySQLFunction function, HttpServletResponse response) throws IOException {
    try (Connection conn = getConnection()) {
      function.execute(conn);
    } catch (SQLException e) {
      sendJson(response,
          Map.of("status", "error", "message", "Database error"),
          HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
    }
  }

  private void executeSQL(SessionPair sessionPair, MySQLFunction function, HttpServletResponse response)
      throws IOException {
    try (Connection conn = getConnection()) {
      if (invalidSessionID(sessionPair, conn, response)) {
        return;
      }
      function.execute(conn);
    } catch (SQLException e) {
      throw new IOException("Database error", e);
    }
  }

  private boolean invalidSessionID(SessionPair sessionPair, Connection conn, HttpServletResponse response)
      throws SQLException, IOException {
    PreparedStatement checkStmt = conn.prepareStatement(
        "SELECT COUNT(*) FROM users WHERE email = ? AND session_id = ?");
    checkStmt.setString(1, sessionPair.email);
    checkStmt.setString(2, sessionPair.sessionID);
    ResultSet rs = checkStmt.executeQuery();
    if (rs.next() && rs.getInt(1) == 0) {
      sendJson(response,
          Map.of("message", "Invalid credentials"),
          HttpServletResponse.SC_UNAUTHORIZED);
      return true;
    }
    return false;
  }

  private void setCorsHeaders(HttpServletResponse response) {
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Methods", "GET, POST");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    response.setHeader("Access-Control-Max-Age", "3600");
  }

  @Override
  protected void doGet(HttpServletRequest request, HttpServletResponse response)
      throws ServletException, IOException {
    setCorsHeaders(response);
    response.setContentType("application/json");
    response.setCharacterEncoding("UTF-8");

    sendJson(response,
        Map.of("message", "Discipler Finder API is running",
         "timestamp", System.currentTimeMillis()));
  }

  @Override
  protected void doPost(HttpServletRequest request, HttpServletResponse response)
      throws ServletException, IOException {
    System.out.println("doPost called");
    setCorsHeaders(response);
    request.setCharacterEncoding("UTF-8");

    String action = request.getParameter("action");
    if (action == null) {
      sendJson(response,
          Map.of("message", "Missing action parameter"),
          HttpServletResponse.SC_BAD_REQUEST);
      return;
    }

    switch (action) {
      case "login" -> login(request, response);
      case "create_account" -> createAccount(request, response);
      default -> {
        sendJson(response,
            Map.of("message", "Unknown action: " + action),
            HttpServletResponse.SC_BAD_REQUEST);
      }
    }
  }

  private void login(HttpServletRequest request, HttpServletResponse response) throws IOException {
    final String email = request.getParameter("email");
    final String password = request.getParameter("password");

    if (email == null || password == null || email.isEmpty() || password.isEmpty()) {
      sendJson(response,
          Map.of("message", "Email and password are required"),
          HttpServletResponse.SC_BAD_REQUEST);
      return;
    }

    executeSQL(conn -> {
      PreparedStatement stmt = conn.prepareStatement(
          "SELECT id, password FROM users WHERE email = ? AND activated = 1;");
      stmt.setString(1, email);
      ResultSet rs = stmt.executeQuery();

      if (!rs.next()) {
        sendJson(response,
            Map.of("message", "Invalid credentials"),
            HttpServletResponse.SC_UNAUTHORIZED);
        return;
      }

      // Verify password
      byte[] storedHash = rs.getBytes("password");
      BCrypt.Result result = BCrypt.verifyer().verify(password.getBytes(), storedHash);
      if (!result.verified) {
        sendJson(response,
            Map.of("message", "Invalid credentials"),
            HttpServletResponse.SC_UNAUTHORIZED);
        return;
      }

      // Generate new session ID
      String sessionID = getRandomAlphanumeric(20);

      // Update session_id in database
      PreparedStatement updateStmt = conn.prepareStatement(
          "UPDATE users SET session_id = ? WHERE email = ?");
      updateStmt.setString(1, sessionID);
      updateStmt.setString(2, email);
      updateStmt.executeUpdate();

      // Build JSON response
      sendJson(response,
          Map.of("id", rs.getInt("id"),
              "email", email, "session_id", sessionID));
    }, response);
  }

  private void createAccount(HttpServletRequest request, HttpServletResponse response) throws IOException {
    final String email = request.getParameter("email");
    final String password = request.getParameter("password");

    if (email == null || password == null || email.isEmpty() || password.isEmpty()) {
      sendJson(response,
          Map.of("message", "Email and password are required"),
          HttpServletResponse.SC_BAD_REQUEST);
      return;
    }

    if (password.length() < 4) {
      sendJson(response,
          Map.of("message", "Password must be at least 4 characters"),
          HttpServletResponse.SC_BAD_REQUEST);
      return;
    }

    executeSQL(conn -> {
      // Check if email already exists
      PreparedStatement checkStmt = conn.prepareStatement(
          "SELECT COUNT(*) FROM users WHERE email = ?");
      checkStmt.setString(1, email);
      ResultSet rs = checkStmt.executeQuery();
      if (rs.next() && rs.getInt(1) > 0) {
        sendJson(response,
            Map.of("message", "Email already exists"),
            HttpServletResponse.SC_CONFLICT);
        return;
      }

      // Hash password
      byte[] salt = new byte[16];
      new java.security.SecureRandom().nextBytes(salt);
      byte[] hashedPassword = BCrypt.withDefaults().hash(12, salt, password.getBytes());

      // Insert new user with activate = 0
      PreparedStatement insertStmt = conn.prepareStatement(
          "INSERT INTO users (email, password, finding_discipler, finding_disciple, "
           + "finding_accountability, activated) VALUES (?, ?, 0, 0, 0, 0);");
      insertStmt.setString(1, email);
      insertStmt.setBytes(2, hashedPassword);
      insertStmt.executeUpdate();

      sendJson(response,
          Map.of("message", "Account created successfully. "
           + "Please check your email for activation instructions."),
          HttpServletResponse.SC_OK);
    }, response);
  }
}