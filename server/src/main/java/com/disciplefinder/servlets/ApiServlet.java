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
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.Random;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;

@FunctionalInterface
interface MySQLFunction {
  void execute(Connection conn) throws SQLException, IOException;
}

@FunctionalInterface
interface SQLFunction<T> {
  T apply() throws SQLException;
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

      InputStream input = getClass().getClassLoader().getResourceAsStream("localhost.properties");
      if (input == null) {
        throw new ServletException("local.properties not found");
      }
      Properties props = new Properties();
      props.load(input);

      HikariConfig hikariConfig = new HikariConfig();
      hikariConfig.setJdbcUrl(props.getProperty("url"));
      hikariConfig.setUsername(props.getProperty("username"));
      hikariConfig.setPassword(props.getProperty("password"));
      hikariConfig.setMaximumPoolSize(5);

      ds = new HikariDataSource(hikariConfig);
      System.out.println("HikariCP pool initialized");

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
        "SELECT COUNT(*) FROM users WHERE id = ? AND session_id = ?");
    checkStmt.setInt(1, sessionPair.id);
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
      case "get_churches" -> getChurches(request, response);
      case "update_profile" -> updateProfile(request, response);
      case "get_matches" -> getMatches(request, response);
      case "get_sent_requests" -> getSentRequests(request, response);
      case "get_received_requests" -> getReceivedRequests(request, response);
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
          "SELECT id, password, activated, email, dob, church, gender, requirements, goals, experience, " +
              "created_at, finding_discipler, finding_disciple, finding_accountability " +
              "FROM users WHERE email = ?");
      stmt.setString(1, email);
      ResultSet rs = stmt.executeQuery();

      if (!rs.next()) {
        sendJson(response,
            Map.of("message", "Invalid credentials"),
            HttpServletResponse.SC_UNAUTHORIZED);
        return;
      }

      byte[] storedHash = rs.getBytes("password");
      BCrypt.Result result = BCrypt.verifyer().verify(password.getBytes(), storedHash);
      if (!result.verified) {
        sendJson(response,
            Map.of("message", "Invalid credentials"),
            HttpServletResponse.SC_UNAUTHORIZED);
        return;
      }

      boolean isActivated = rs.getBoolean("activated");
      if (!isActivated) {
        sendJson(response,
            Map.of("message", "Account not activated. Please check your email for activation instructions."),
            HttpServletResponse.SC_FORBIDDEN);
        return;
      }

      String sessionID = getRandomAlphanumeric(20);

      PreparedStatement updateStmt = conn.prepareStatement(
          "UPDATE users SET session_id = ? WHERE email = ?");
      updateStmt.setString(1, sessionID);
      updateStmt.setString(2, email);
      updateStmt.executeUpdate();

      Profile.Builder profileBuilder = new Profile.Builder()
          .id(rs.getInt("id"))
          .email(rs.getString("email"))
          .dob(rs.getDate("dob"))
          .church(rs.getString("church"))
          .gender(rs.getString("gender"))
          .requirements(rs.getString("requirements"))
          .goals(rs.getString("goals"))
          .experience(rs.getString("experience"))
          .created_at(rs.getTimestamp("created_at"))
          .finding_discipler(rs.getBoolean("finding_discipler"))
          .finding_disciple(rs.getBoolean("finding_disciple"))
          .finding_accountability(rs.getBoolean("finding_accountability"));

      Profile profile = profileBuilder.build();

      Map<String, Object> loginResponse = new java.util.HashMap<>();
      loginResponse.put("profile", profile);
      loginResponse.put("session_id", sessionID);

      sendJson(response, loginResponse);
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

      byte[] salt = new byte[16];
      new java.security.SecureRandom().nextBytes(salt);
      byte[] hashedPassword = BCrypt.withDefaults().hash(12, salt, password.getBytes());

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

  private void getChurches(HttpServletRequest request, HttpServletResponse response) throws IOException {
    executeSQL(conn -> {
      PreparedStatement stmt = conn.prepareStatement(
          "SELECT * FROM churches");
      ResultSet rs = stmt.executeQuery();
      List<Map<String, Object>> churches = new ArrayList<>();
      while (rs.next()) {
        churches.add(Map.of("id", rs.getInt("id"), "name", rs.getString("name"),
            "address", rs.getString("address"), "splash_text", rs.getString("splash_text"),
            "img_code", rs.getString("img_code")));
      }
      sendJson(response, churches);
    }, response);
  }

  private void updateProfile(HttpServletRequest request, HttpServletResponse response) throws IOException {
    final int id = Integer.parseInt(request.getParameter("id"));
    final String sessionID = request.getParameter("session_id");
    SessionPair session = new SessionPair(id, sessionID);

    final String email = request.getParameter("email");
    final String dobStr = request.getParameter("dob");
    final String church = request.getParameter("church");
    final String gender = request.getParameter("gender");
    final String requirements = request.getParameter("requirements");
    final String goals = request.getParameter("goals");
    final String experience = request.getParameter("experience");

    if (email == null || dobStr == null || church == null || gender == null) {
      sendJson(response,
          Map.of("message", "All required fields must be provided"),
          HttpServletResponse.SC_BAD_REQUEST);
      return;
    }

    executeSQL(session, conn -> {
      Date dob = Date.valueOf(dobStr);

      PreparedStatement updateStmt = conn.prepareStatement(
          "UPDATE users SET email = ?, dob = ?, church = ?, gender = ?, " +
              "requirements = ?, goals = ?, experience = ? WHERE id = ?");
      updateStmt.setString(1, email);
      updateStmt.setDate(2, dob);
      updateStmt.setString(3, church);
      updateStmt.setString(4, gender);
      updateStmt.setString(5, requirements);
      updateStmt.setString(6, goals);
      updateStmt.setString(7, experience);
      updateStmt.setInt(8, id);

      int rowsUpdated = updateStmt.executeUpdate();
      if (rowsUpdated == 0) {
        sendJson(response,
            Map.of("message", "Profile not found or update failed"),
            HttpServletResponse.SC_NOT_FOUND);
        return;
      }

      sendJson(response,
          Map.of("message", "Profile updated successfully"));
    }, response);
  }

  private void getMatches(HttpServletRequest request, HttpServletResponse response) throws IOException {
    final int id = Integer.parseInt(request.getParameter("id"));
    final String sessionID = request.getParameter("session_id");
    SessionPair session = new SessionPair(id, sessionID);

    executeSQL(session, conn -> {
      PreparedStatement stmt = conn.prepareStatement(
          "SELECT m.id as match_id, m.user_one_id, m.user_two_id, m.discipleship, u.name, u.id as user_id, u.email, u.gender, u.church " +
              "FROM matches m " +
              "JOIN users u ON u.id = CASE WHEN m.user_one_id = ? THEN m.user_two_id ELSE m.user_one_id END " +
              "WHERE ? IN (m.user_one_id, m.user_two_id)");
      stmt.setInt(1, id);
      stmt.setInt(2, id);
      ResultSet rs = stmt.executeQuery();
      List<Map<String, Object>> matches = new ArrayList<>();
      while (rs.next()) {
        Profile profile = buildProfileFromResultSet(rs);
        Character type;
        if (!rs.getBoolean("discipleship")) { // accountability match
          type = 'A';
        } else if (rs.getInt("user_one_id") == id) { // discipler match
          type = 'M';
        } else { // disciple match
          type = 'D';
        }

        matches.add(Map.of("profile", profile, "type", type));
      }
      sendJson(response, matches);
    }, response);
  }

  private <T> T columnOrDefault(SQLFunction<T> function, T defaultValue) {
    try {
      return function.apply();
    } catch (SQLException e) {
      return defaultValue;
    }
  }

  private Profile buildProfileFromResultSet(ResultSet rs) throws SQLException {
    Profile.Builder profileBuilder = new Profile.Builder()
        .email(rs.getString("email"))
        .id(columnOrDefault(() -> rs.getInt("user_id"), rs.getInt("id")))
        .dob(columnOrDefault(() -> rs.getDate("dob"), null))
        .church(columnOrDefault(() -> rs.getString("church"), null))
        .gender(columnOrDefault(() -> rs.getString("gender"), null))
        .requirements(columnOrDefault(() -> rs.getString("requirements"), null))
        .goals(columnOrDefault(() -> rs.getString("goals"), null))
        .experience(columnOrDefault(() -> rs.getString("experience"), null))
        .created_at(columnOrDefault(() -> rs.getTimestamp("created_at"), null))
        .finding_discipler(columnOrDefault(() -> rs.getBoolean("finding_discipler"), null))
        .finding_disciple(columnOrDefault(() -> rs.getBoolean("finding_disciple"), null))
        .finding_accountability(columnOrDefault(() -> rs.getBoolean("finding_accountability"), null));

    return profileBuilder.build();
  }

  private List<Map<String, Object>> handleRequestResults(ResultSet rs) throws SQLException {
    List<Map<String, Object>> requests = new ArrayList<>();
    while (rs.next()) {
      Profile profile = buildProfileFromResultSet(rs);

      requests.add(Map.of("profile", profile,
          "request_id", rs.getInt("request_id"),
          "message", rs.getString("message"),
          "type", rs.getString("type"),
          "requested_at", rs.getTimestamp("requested_at")));
    }
    return requests;
  }

  private void getSentRequests(HttpServletRequest request, HttpServletResponse response) throws IOException {
    final int id = Integer.parseInt(request.getParameter("id"));
    final String sessionID = request.getParameter("session_id");
    SessionPair session = new SessionPair(id, sessionID);

    executeSQL(session, conn -> {
      PreparedStatement stmt = conn.prepareStatement(
          "SELECT r.id as request_id, r.requested_at, r.message, r.requester_id, r.requestee_id, r.type, " +
              "u.name, u.id as user_id, u.email, u.gender, u.church, u.requirements, u.goals, u.experience" +
              "FROM requests r " +
              "JOIN users u ON r.requestee_id = u.id " +
              "WHERE r.requester_id = ?");
      stmt.setInt(1, id);
      ResultSet rs = stmt.executeQuery();
      sendJson(response, handleRequestResults(rs));
    }, response);
  }

  private void getReceivedRequests(HttpServletRequest request, HttpServletResponse response) throws IOException {
    final int id = Integer.parseInt(request.getParameter("id"));
    final String sessionID = request.getParameter("session_id");
    SessionPair session = new SessionPair(id, sessionID);

    executeSQL(session, conn -> {
      PreparedStatement stmt = conn.prepareStatement(
          "SELECT r.id as request_id, r.requested_at, r.message, r.requester_id, r.requestee_id, r.type, " +
              "u.name, u.id as user_id, u.email, u.gender, u.church, u.requirements, u.goals, u.experience" +
              "FROM requests r " +
              "JOIN users u ON r.requester_id = u.id " +
              "WHERE r.requestee_id = ?");
      stmt.setInt(1, id);
      ResultSet rs = stmt.executeQuery();
      sendJson(response, handleRequestResults(rs));
    }, response);
  }
}