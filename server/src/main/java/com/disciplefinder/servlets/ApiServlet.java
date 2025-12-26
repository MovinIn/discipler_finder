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
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.Random;
import java.util.Set;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;

import org.apache.commons.lang3.tuple.Pair;

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
          Map.of("status", "error", "message", e.getMessage()),
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
      sendJson(response,
          Map.of("status", "error", "message", e.getMessage()),
          HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
    }
  }

  private boolean invalidSessionID(SessionPair sessionPair, Connection conn, HttpServletResponse response)
      throws SQLException, IOException {
    PreparedStatement checkStmt = conn.prepareStatement(
        "SELECT COUNT(*) FROM codes WHERE user_id = ? AND code = ? AND expires_at > NOW()");
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
      case "send_request" -> sendRequest(request, response);
      case "get_latest_messages" -> getLatestMessages(request, response);
      case "get_older_messages" -> getOlderMessages(request, response);
      case "send_message" -> sendMessage(request, response);
      case "get_posts" -> getPosts(request, response);
      case "query_posts" -> queryPosts(request, response);
      case "mark_messages_as_read" -> markMessagesAsRead(request, response);
      case "create_chat" -> createChat(request, response);
      case "signout" -> signout(request, response);
      case "send_post" -> sendPost(request, response);
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
          "SELECT id, password, activated, email, dob, church, gender, created_at " +
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

      String sessionID = getRandomAlphanumeric(15);

      PreparedStatement insertStmt = conn.prepareStatement(
          "INSERT INTO codes (user_id, code, code_type, expires_at) VALUES (?, ?, ?, NOW() + INTERVAL 7 DAY)");
      insertStmt.setInt(1, rs.getInt("id"));
      insertStmt.setString(2, sessionID);
      insertStmt.setString(3, "session");
      insertStmt.executeUpdate();

      Profile.Builder profileBuilder = new Profile.Builder()
          .id(rs.getInt("id"))
          .email(rs.getString("email"))
          .dob(rs.getDate("dob"))
          .church(rs.getString("church"))
          .gender(rs.getString("gender"))
          .created_at(rs.getTimestamp("created_at"));

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
    final String dobStr = request.getParameter("dob");
    final String church = request.getParameter("church");
    final String gender = request.getParameter("gender");
    final String name = request.getParameter("name");

    if (email == null || password == null || dobStr == null || church == null || gender == null || name == null ||
        email.isEmpty() || password.isEmpty() || dobStr.isEmpty() || church.isEmpty() || gender.isEmpty()
        || name.isEmpty() ||
        !dobStr.matches("\\d{4}-\\d{2}-\\d{2}") || !gender.matches("M|F")) {
      sendJson(response,
          Map.of("message", "All required fields must be provided"),
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
          "INSERT INTO users (email, password, name, dob, church, gender, activated) VALUES (?, ?, ?, ?, ?, ?, 0);");
      insertStmt.setString(1, email);
      insertStmt.setBytes(2, hashedPassword);
      insertStmt.setString(3, name);
      insertStmt.setDate(4, Date.valueOf(dobStr));
      insertStmt.setString(5, church);
      insertStmt.setString(6, gender);
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

    if (email == null || dobStr == null || church == null || gender == null) {
      sendJson(response,
          Map.of("message", "All required fields must be provided"),
          HttpServletResponse.SC_BAD_REQUEST);
      return;
    }

    executeSQL(session, conn -> {
      Date dob = Date.valueOf(dobStr);

      PreparedStatement updateStmt = conn.prepareStatement(
          "UPDATE users SET email = ?, dob = ?, church = ?, gender = ? WHERE id = ?");
      updateStmt.setString(1, email);
      updateStmt.setDate(2, dob);
      updateStmt.setString(3, church);
      updateStmt.setString(4, gender);
      updateStmt.setInt(5, id);

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
          "SELECT m.id as match_id, m.user_one_id, m.user_two_id, m.discipleship, u.name, u.id as user_id, u.email, u.gender, u.church "
              +
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
        .created_at(columnOrDefault(() -> rs.getTimestamp("created_at"), null));

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
          "requested_at", rs.getTimestamp("requested_at"),
          "requirements", columnOrDefault(() -> rs.getString("requirements"), null),
          "goals", columnOrDefault(() -> rs.getString("goals"), null),
          "experience", columnOrDefault(() -> rs.getString("experience"), null)));
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
              "u.name, u.id as user_id, u.email, u.gender, u.church, m.requirements, m.goals, m.experience " +
              "FROM requests r " +
              "JOIN users u ON r.requestee_id = u.id " +
              "LEFT JOIN posts m ON r.requestee_id = m.user_id AND m.type = r.type " +
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
              "u.name, u.id as user_id, u.email, u.gender, u.church" +
              "FROM requests r " +
              "JOIN users u ON r.requester_id = u.id " +
              "WHERE r.requestee_id = ?");
      stmt.setInt(1, id);
      ResultSet rs = stmt.executeQuery();
      sendJson(response, handleRequestResults(rs));
    }, response);
  }

  private void getPosts(HttpServletRequest request, HttpServletResponse response) throws IOException {
    final int id = Integer.parseInt(request.getParameter("id"));
    final String sessionID = request.getParameter("session_id");
    SessionPair session = new SessionPair(id, sessionID);
    executeSQL(session, conn -> {
      PreparedStatement stmt = conn.prepareStatement(
          "SELECT id, type, requirements, goals, experience FROM posts WHERE user_id = ?");
      stmt.setInt(1, id);
      ResultSet rs = stmt.executeQuery();
      List<Map<String, Object>> posts = new ArrayList<>();
      while (rs.next()) {
        posts.add(Map.of("id", rs.getInt("id"), "type", rs.getString("type"),
            "requirements", rs.getString("requirements"), "goals", rs.getString("goals"),
            "experience", rs.getString("experience")));
      }
      sendJson(response, posts);
    }, response);
  }

  private Pair<Date, Date> dobRange(int minAge, int maxAge) {
    LocalDate today = LocalDate.now();

    LocalDate youngestDob = today.minusYears(minAge);
    LocalDate oldestDob = today.minusYears(maxAge);

    return Pair.of(Date.valueOf(youngestDob), Date.valueOf(oldestDob));
  }

  private void queryPosts(HttpServletRequest request, HttpServletResponse response) throws IOException {
    final int id = Integer.parseInt(request.getParameter("id"));
    final String sessionID = request.getParameter("session_id");
    final String gender = request.getParameter("gender");
    final String type = request.getParameter("type");

    final int lAge = Integer.parseInt(request.getParameter("l_age"));
    final int hAge = Integer.parseInt(request.getParameter("h_age"));
    final Pair<Date, Date> range = dobRange(lAge, hAge);

    final String church = request.getParameter("church");

    SessionPair session = new SessionPair(id, sessionID);
    executeSQL(session, conn -> {
      StringBuilder sql = new StringBuilder("""
          SELECT p.id, p.user_id, p.type, p.requirements, p.goals, p.experience, u.name, u.email, u.gender, u.church
          FROM posts p
          JOIN users u ON p.user_id = u.id
          WHERE u.id != ? AND u.dob BETWEEN ? AND ? AND u.church = ?
          """);

      List<Object> params = new ArrayList<>();
      params.add(id);
      params.add(range.getLeft());
      params.add(range.getRight());
      params.add(church);

      // optional filters
      if (type != null) {
        sql.append(" AND p.type = ?");
        params.add(type);
      }

      if (gender != null) {
        sql.append(" AND u.gender = ?");
        params.add(gender);
      }

      PreparedStatement stmt = conn.prepareStatement(sql.toString());
      for (int i = 0; i < params.size(); i++) {
        stmt.setObject(i + 1, params.get(i));
      }

      ResultSet rs = stmt.executeQuery();
      List<Map<String, Object>> posts = new ArrayList<>();
      while (rs.next()) {
        posts.add(Map.of("id", rs.getInt("id"), "user_id", rs.getInt("user_id"),
            "type", rs.getString("type"), "requirements", rs.getString("requirements"),
            "goals", rs.getString("goals"), "experience", rs.getString("experience"),
            "name", rs.getString("name"), "email", rs.getString("email"),
            "gender", rs.getString("gender"), "church", rs.getString("church")));
      }
      sendJson(response, posts);
    }, response);
  }

  private void sendRequest(HttpServletRequest request, HttpServletResponse response) throws IOException {
    final int id = Integer.parseInt(request.getParameter("id"));
    final String sessionID = request.getParameter("session_id");
    final int requesteeId = Integer.parseInt(request.getParameter("requestee_id"));
    final String message = request.getParameter("message");
    final String type = request.getParameter("type");

    SessionPair session = new SessionPair(id, sessionID);
    executeSQL(session, conn -> {
      PreparedStatement stmt = conn.prepareStatement(
          "INSERT INTO requests (requester_id, requestee_id, message, type) VALUES (?, ?, ?, ?)",
          Statement.RETURN_GENERATED_KEYS);
      stmt.setInt(1, id);
      stmt.setInt(2, requesteeId);
      stmt.setString(3, message);
      stmt.setString(4, type.toUpperCase());

      int rowsInserted = stmt.executeUpdate();
      if (rowsInserted == 0) {
        sendJson(response,
            Map.of("message", "You have already sent a request to this user."),
            HttpServletResponse.SC_CONFLICT);
        return;
      }

      long requestId = stmt.getGeneratedKeys().getLong(1);
      sendJson(response, Map.of("message", "Request sent successfully", "request_id", requestId));
    }, response);
  }

  private void getLatestMessages(HttpServletRequest request, HttpServletResponse response) throws IOException {
    final int id = Integer.parseInt(request.getParameter("id"));
    final String sessionID = request.getParameter("session_id");
    SessionPair session = new SessionPair(id, sessionID);

    executeSQL(session, conn -> {
      Map<Integer, Map<String, Object>> chatMap = new LinkedHashMap<>();

      String msgSql = """
          SELECT chat_id, message_id, sender_id, message, sent_at, last_read_message_id, chat_created_at
          FROM (
            SELECT cp.chat_id,
              m.id AS message_id,
              m.sender_id,
              m.message,
              m.sent_at,
              cp.last_read_message_id,
              c.created_at AS chat_created_at,
              ROW_NUMBER() OVER (PARTITION BY cp.chat_id ORDER BY m.id DESC) AS rn
            FROM chat_participants cp
            INNER JOIN chats c ON c.id = cp.chat_id
            LEFT JOIN messages m ON m.chat_id = cp.chat_id
            WHERE cp.user_id = ?
          ) t
          WHERE rn <= 10 OR rn IS NULL
          ORDER BY chat_id, message_id ASC
          """;

      Set<Integer> chatIds = new LinkedHashSet<>();
      Map<Integer, Integer> lastReadMap = new HashMap<>();
      Map<Integer, Timestamp> chatCreatedAtMap = new HashMap<>();

      try (PreparedStatement stmt = conn.prepareStatement(msgSql)) {
        stmt.setInt(1, id);
        ResultSet rs = stmt.executeQuery();

        while (rs.next()) {
          int chatId = rs.getInt("chat_id");
          chatIds.add(chatId);

          if (!lastReadMap.containsKey(chatId)) {
            Integer lastReadId = rs.getObject("last_read_message_id", Integer.class);
            lastReadMap.put(chatId, lastReadId);
            chatCreatedAtMap.put(chatId, rs.getTimestamp("chat_created_at"));
          }

          Map<String, Object> chat = chatMap.computeIfAbsent(chatId, k -> {
            Map<String, Object> chatData = new HashMap<>();
            chatData.put("chat_id", chatId);
            chatData.put("chat_created_at", chatCreatedAtMap.get(chatId));
            Integer lastReadId = lastReadMap.get(chatId);
            chatData.put("last_read_message_id", lastReadId);
            chatData.put("messages", new ArrayList<Map<String, Object>>());
            chatData.put("participants", new ArrayList<Map<String, Object>>());
            return chatData;
          });

          Integer msgId = rs.getObject("message_id", Integer.class);
          if (msgId != null) {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> messages = (List<Map<String, Object>>) chat.get("messages");

            Map<String, Object> msg = new HashMap<>();
            msg.put("id", msgId);
            msg.put("sender_id", rs.getInt("sender_id"));
            msg.put("content", rs.getString("message"));
            msg.put("created_at", rs.getTimestamp("sent_at"));

            messages.add(msg);
          }
        }
      }

      if (chatIds.isEmpty()) {
        sendJson(response, new ArrayList<>());
        return;
      }

      String placeholders = String.join(",", Collections.nCopies(chatIds.size(), "?"));
      String partSql = "SELECT cp.chat_id, u.id AS user_id, u.name, u.email " +
          "FROM chat_participants cp " +
          "JOIN users u ON cp.user_id = u.id " +
          "WHERE cp.chat_id IN (" + placeholders + ") " +
          "ORDER BY cp.chat_id, u.name";

      try (PreparedStatement stmt = conn.prepareStatement(partSql)) {
        int index = 1;
        for (Integer chatId : chatIds) {
          stmt.setInt(index++, chatId);
        }

        ResultSet rs = stmt.executeQuery();
        while (rs.next()) {
          int chatId = rs.getInt("chat_id");
          Map<String, Object> chat = chatMap.get(chatId);

          @SuppressWarnings("unchecked")
          List<Map<String, Object>> participants = (List<Map<String, Object>>) chat.get("participants");

          Map<String, Object> participant = new HashMap<>();
          participant.put("id", rs.getInt("user_id"));
          participant.put("name", rs.getString("name"));
          participant.put("email", rs.getString("email"));
          participants.add(participant);
        }
      }

      sendJson(response, new ArrayList<>(chatMap.values()));
    }, response);
  }

  private void getOlderMessages(HttpServletRequest request, HttpServletResponse response) throws IOException {
    final int id = Integer.parseInt(request.getParameter("id"));
    final String sessionID = request.getParameter("session_id");
    final int chatId = Integer.parseInt(request.getParameter("chat_id"));
    final int earliestMessageId = Integer.parseInt(request.getParameter("earliest_message_id"));

    executeSQL(new SessionPair(id, sessionID), conn -> {
      PreparedStatement stmt = conn.prepareStatement("""
          SELECT id AS message_id, sender_id, message, sent_at
          FROM messages
          WHERE chat_id = ?
            AND id < ?
          ORDER BY id DESC
          LIMIT 20
          """);
      stmt.setInt(1, chatId);
      stmt.setInt(2, earliestMessageId);
      ResultSet rs = stmt.executeQuery();
      List<Map<String, Object>> messages = new ArrayList<>();
      while (rs.next()) {
        messages.add(Map.of("id", rs.getInt("message_id"), "sender_id", rs.getInt("sender_id"), "message",
            rs.getString("message"), "sent_at", rs.getTimestamp("sent_at")));
      }
      sendJson(response, messages);
    }, response);
  }

  private void sendMessage(HttpServletRequest request, HttpServletResponse response) throws IOException {
    final int id = Integer.parseInt(request.getParameter("id"));
    final String sessionID = request.getParameter("session_id");
    final int chatId = Integer.parseInt(request.getParameter("chat_id"));
    final String message = request.getParameter("message");

    if (message == null || message.isEmpty()) {
      sendJson(response,
          Map.of("message", "Message cannot be empty"),
          HttpServletResponse.SC_BAD_REQUEST);
      return;
    }

    if (message.length() > 2048) {
      sendJson(response,
          Map.of("message", "Message must be at most 2048 characters"),
          HttpServletResponse.SC_BAD_REQUEST);
      return;
    }

    SessionPair session = new SessionPair(id, sessionID);
    executeSQL(session, conn -> {
      PreparedStatement checkStmt = conn.prepareStatement(
          "SELECT COUNT(*) FROM chat_participants WHERE chat_id = ? AND user_id = ?");
      checkStmt.setInt(1, chatId);
      checkStmt.setInt(2, id);
      ResultSet checkRs = checkStmt.executeQuery();
      if (checkRs.next() && checkRs.getInt(1) == 0) {
        sendJson(response,
            Map.of("message", "User is not a participant in this chat"),
            HttpServletResponse.SC_FORBIDDEN);
        return;
      }

      PreparedStatement insertStmt = conn.prepareStatement(
          "INSERT INTO messages (chat_id, sender_id, message, sent_at) VALUES (?, ?, ?, NOW())",
          Statement.RETURN_GENERATED_KEYS);
      insertStmt.setInt(1, chatId);
      insertStmt.setInt(2, id);
      insertStmt.setString(3, message);
      insertStmt.executeUpdate();

      try (ResultSet keys = insertStmt.getGeneratedKeys()) {
        int messageId = keys.next() ? keys.getInt(1) : 0;
        sendJson(response, Map.of(
            "message", "Message sent successfully",
            "message_id", messageId));
      }
    }, response);
  }

  private void markMessagesAsRead(HttpServletRequest request, HttpServletResponse response) throws IOException {
    final int id = Integer.parseInt(request.getParameter("id"));
    final String sessionID = request.getParameter("session_id");
    final int chatId = Integer.parseInt(request.getParameter("chat_id"));
    final int messageId = Integer.parseInt(request.getParameter("message_id"));
    SessionPair session = new SessionPair(id, sessionID);
    executeSQL(session, conn -> {
      PreparedStatement stmt = conn.prepareStatement(
          "UPDATE chat_participants SET last_read_message_id = ? WHERE chat_id = ? AND user_id = ?");
      stmt.setInt(1, messageId);
      stmt.setInt(2, chatId);
      stmt.setInt(3, id);
      stmt.executeUpdate();
    }, response);
    sendJson(response, Map.of("message", "Messages marked as read"));
  }

  private void createChat(HttpServletRequest request, HttpServletResponse response) throws IOException {
    final int id = Integer.parseInt(request.getParameter("id"));
    final String sessionID = request.getParameter("session_id");
    final int requesteeId = Integer.parseInt(request.getParameter("requestee_id"));
    SessionPair session = new SessionPair(id, sessionID);
    executeSQL(session, conn -> {
      PreparedStatement stmt = conn.prepareStatement("INSERT INTO chats () VALUES ()", Statement.RETURN_GENERATED_KEYS);
      stmt.executeUpdate();

      ResultSet rs = stmt.getGeneratedKeys();
      if (!rs.next()) {
        sendJson(response,
            Map.of("message", "Failed to create chat"),
            HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
        return;
      }
      final int chatId = rs.getInt(1);

      PreparedStatement insertStmt = conn
          .prepareStatement("INSERT INTO chat_participants (chat_id, user_id, last_read_message_id) VALUES (?, ?, ?)");

      insertStmt.setInt(1, chatId);
      insertStmt.setInt(3, 0);

      insertStmt.setInt(2, id);
      insertStmt.executeUpdate();

      insertStmt.setInt(2, requesteeId);
      insertStmt.executeUpdate();

      sendJson(response, Map.of("message", "Chat created successfully", "chat_id", chatId));
    }, response);
  }

  private void signout(HttpServletRequest request, HttpServletResponse response) throws IOException {
    final int id = Integer.parseInt(request.getParameter("id"));
    final String sessionID = request.getParameter("session_id");
    SessionPair session = new SessionPair(id, sessionID);
    executeSQL(session, conn -> {
      PreparedStatement stmt = conn.prepareStatement("DELETE FROM codes WHERE user_id = ? AND code = ?");
      stmt.setInt(1, id);
      stmt.setString(2, sessionID);
      stmt.executeUpdate();
      sendJson(response, Map.of("message", "Signed out successfully"));
    }, response);
  }

  private void sendPost(HttpServletRequest request, HttpServletResponse response) throws IOException {
    final int id = Integer.parseInt(request.getParameter("id"));
    final String sessionID = request.getParameter("session_id");
    final String type = request.getParameter("type");
    final String requirements = request.getParameter("requirements");
    final String goals = request.getParameter("goals");
    final String experience = request.getParameter("experience");
    SessionPair session = new SessionPair(id, sessionID);
    executeSQL(session, conn -> {
      PreparedStatement stmt = conn.prepareStatement(
          "INSERT INTO posts (user_id, type, requirements, goals, experience) VALUES (?, ?, ?, ?, ?)");
      stmt.setInt(1, id);
      stmt.setString(2, type);
      stmt.setString(3, requirements);
      stmt.setString(4, goals);
      stmt.setString(5, experience);
      stmt.executeUpdate();
      sendJson(response, Map.of("message", "Post sent successfully"));
    }, response);
  }
}