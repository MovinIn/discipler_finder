package com.disciplefinder.servlets;

import at.favre.lib.crypto.bcrypt.BCrypt;
import jakarta.servlet.ServletConfig;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.InputStream;
import java.sql.Connection;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.Period;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.Set;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;

import org.apache.commons.lang3.tuple.Pair;

import static com.disciplefinder.servlets.SQLUtils.*;

@WebServlet(name = "ApiServlet", urlPatterns = { "/api", "/api/*" })
public class ApiServlet extends HttpServlet {

  private static HikariDataSource ds;

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

  private static void setCorsHeaders(HttpServletResponse response) {
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Methods", "GET, POST");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    response.setHeader("Access-Control-Max-Age", "3600");
  }

  public static boolean invalidSessionID(SessionPair sessionPair, Connection conn) throws SQLException {
    PreparedStatement checkStmt = conn.prepareStatement(
        "SELECT COUNT(*) FROM codes WHERE user_id = ? AND code = ? AND expires_at > NOW()");
    checkStmt.setInt(1, sessionPair.id);
    checkStmt.setString(2, sessionPair.sessionID);
    ResultSet rs = checkStmt.executeQuery();
    return rs.next() && rs.getInt(1) == 0;
  }

  public static boolean invalidSessionID(SessionPair sessionPair, Connection conn, HttpServletResponse response)
      throws SQLException, IOException {
    boolean invalid = invalidSessionID(sessionPair, conn);
    if (invalid) {
      JsonResponseUtils.sendJson(response,
          Map.of("message", "Invalid credentials"),
          HttpServletResponse.SC_UNAUTHORIZED);
      return true;
    }
    return false;
  }

  @Override
  protected void doGet(HttpServletRequest request, HttpServletResponse response)
      throws ServletException, IOException {
    setCorsHeaders(response);
    response.setContentType("application/json");
    response.setCharacterEncoding("UTF-8");

    JsonResponseUtils.sendJson(response,
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
      JsonResponseUtils.sendJson(response,
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
      case "get_posts" -> getPosts(request, response);
      case "query_posts" -> queryPosts(request, response);
      case "mark_messages_as_read" -> markMessagesAsRead(request, response);
      case "create_chat" -> createChat(request, response);
      case "signout" -> signout(request, response);
      case "send_post" -> sendPost(request, response);
      case "accept_request" -> acceptRequest(request, response);
      case "reject_request" -> rejectRequest(request, response);
      default -> {
        JsonResponseUtils.sendJson(response,
            Map.of("message", "Unknown action: " + action),
            HttpServletResponse.SC_BAD_REQUEST);
      }
    }
  }

  public static void login(HttpServletRequest request, HttpServletResponse response) throws IOException {
    final String email = request.getParameter("email");
    final String password = request.getParameter("password");

    if (email == null || password == null || email.isEmpty() || password.isEmpty()) {
      JsonResponseUtils.sendJson(response,
          Map.of("message", "Email and password are required"),
          HttpServletResponse.SC_BAD_REQUEST);
      return;
    }

    executeSQL(conn -> {
      PreparedStatement stmt = conn.prepareStatement(
          "SELECT id as user_id, password, activated, email, dob, church, gender, created_at, name " +
              "FROM users WHERE email = ?");
      stmt.setString(1, email);
      ResultSet rs = stmt.executeQuery();

      if (!rs.next()) {
        JsonResponseUtils.sendJson(response,
            Map.of("message", "Invalid credentials"),
            HttpServletResponse.SC_UNAUTHORIZED);
        return;
      }

      byte[] storedHash = rs.getBytes("password");
      BCrypt.Result result = BCrypt.verifyer().verify(password.getBytes(), storedHash);
      if (!result.verified) {
        JsonResponseUtils.sendJson(response,
            Map.of("message", "Invalid credentials"),
            HttpServletResponse.SC_UNAUTHORIZED);
        return;
      }

      boolean isActivated = rs.getBoolean("activated");
      if (!isActivated) {
        JsonResponseUtils.sendJson(response,
            Map.of("message", "Account not activated. Please check your email for activation instructions."),
            HttpServletResponse.SC_FORBIDDEN);
        return;
      }

      String sessionID = GenerateCodeUtils.generateCode(15);

      PreparedStatement insertStmt = conn.prepareStatement(
          "INSERT INTO codes (user_id, code, type, expires_at) VALUES (?, ?, ?, NOW() + INTERVAL 7 DAY)");
      insertStmt.setInt(1, rs.getInt("user_id"));
      insertStmt.setString(2, sessionID);
      insertStmt.setString(3, "session");
      insertStmt.executeUpdate();

      Profile profile = buildProfileFromResultSet(rs);

      Map<String, Object> loginResponse = new java.util.HashMap<>();
      loginResponse.put("profile", profile);
      loginResponse.put("session_id", sessionID);

      JsonResponseUtils.sendJson(response, loginResponse);
    }, response);
  }

  public static void createAccount(HttpServletRequest request, HttpServletResponse response) throws IOException {
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
      JsonResponseUtils.sendJson(response,
          Map.of("message", "All required fields must be provided"),
          HttpServletResponse.SC_BAD_REQUEST);
      return;
    }

    if (password.length() < 4) {
      JsonResponseUtils.sendJson(response,
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
        JsonResponseUtils.sendJson(response,
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

      JsonResponseUtils.sendJson(response,
          Map.of("message", "Account created successfully. "
              + "Please check your email for activation instructions."),
          HttpServletResponse.SC_OK);
    }, response);
  }

  public static void getChurches(HttpServletRequest request, HttpServletResponse response) throws IOException {
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
      JsonResponseUtils.sendJson(response, churches);
    }, response);
  }

  public static void updateProfile(HttpServletRequest request, HttpServletResponse response) throws IOException {
    final int id = Integer.parseInt(request.getParameter("id"));
    final String sessionID = request.getParameter("session_id");
    SessionPair session = new SessionPair(id, sessionID);

    final String email = request.getParameter("email");
    final String dobStr = request.getParameter("dob");
    final String church = request.getParameter("church");
    final String gender = request.getParameter("gender");
    final String name = request.getParameter("name");

    if (email == null || dobStr == null || church == null || gender == null || name == null ||
        email.isEmpty() || dobStr.isEmpty() || church.isEmpty() || gender.isEmpty() || name.isEmpty()) {
      JsonResponseUtils.sendJson(response,
          Map.of("message", "All required fields must be provided"),
          HttpServletResponse.SC_BAD_REQUEST);
      return;
    }

    executeSQL(session, conn -> {
      Date dob = Date.valueOf(dobStr);

      PreparedStatement updateStmt = conn.prepareStatement(
          "UPDATE users SET email = ?, dob = ?, church = ?, gender = ?, name = ? WHERE id = ?");
      updateStmt.setString(1, email);
      updateStmt.setDate(2, dob);
      updateStmt.setString(3, church);
      updateStmt.setString(4, gender);
      updateStmt.setString(5, name);
      updateStmt.setInt(6, id);

      int rowsUpdated = updateStmt.executeUpdate();
      if (rowsUpdated == 0) {
        JsonResponseUtils.sendJson(response,
            Map.of("message", "Profile not found or update failed"),
            HttpServletResponse.SC_NOT_FOUND);
        return;
      }

      JsonResponseUtils.sendJson(response,
          Map.of("message", "Profile updated successfully"));
    }, response);
  }

  public static void getMatches(HttpServletRequest request, HttpServletResponse response) throws IOException {
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
      JsonResponseUtils.sendJson(response, matches);
    }, response);
  }

  public static void getSentRequests(HttpServletRequest request, HttpServletResponse response) throws IOException {
    final int id = Integer.parseInt(request.getParameter("id"));
    final String sessionID = request.getParameter("session_id");
    SessionPair session = new SessionPair(id, sessionID);

    executeSQL(session, conn -> {
      PreparedStatement stmt = conn.prepareStatement(
          "SELECT r.id as request_id, r.requested_at, r.message, r.requester_id, r.requestee_id, r.type, " +
              "u.name, u.id as user_id, u.email, u.gender, u.church, u.dob, m.requirements, m.goals, m.experience " +
              "FROM requests r " +
              "JOIN users u ON r.requestee_id = u.id " +
              "LEFT JOIN posts m ON r.requestee_id = m.user_id AND m.type = r.type " +
              "WHERE r.requester_id = ?");
      stmt.setInt(1, id);
      ResultSet rs = stmt.executeQuery();
      JsonResponseUtils.sendJson(response, handleRequestResults(rs));
    }, response);
  }

  public static void getReceivedRequests(HttpServletRequest request, HttpServletResponse response) throws IOException {
    final int id = Integer.parseInt(request.getParameter("id"));
    final String sessionID = request.getParameter("session_id");
    SessionPair session = new SessionPair(id, sessionID);

    executeSQL(session, conn -> {
      PreparedStatement stmt = conn.prepareStatement(
          "SELECT r.id as request_id, r.requested_at, r.message, r.requester_id, r.requestee_id, r.type, " +
              "u.name, u.id as user_id, u.email, u.gender, u.church, u.dob " +
              "FROM requests r " +
              "JOIN users u ON r.requester_id = u.id " +
              "WHERE r.requestee_id = ?");
      stmt.setInt(1, id);
      ResultSet rs = stmt.executeQuery();
      System.out.println("hello? are you even there?");
      JsonResponseUtils.sendJson(response, handleRequestResults(rs));
    }, response);
  }

  public static void getPosts(HttpServletRequest request, HttpServletResponse response) throws IOException {
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
      JsonResponseUtils.sendJson(response, posts);
    }, response);
  }

  public static Pair<Date, Date> dobRange(int minAge, int maxAge) {
    LocalDate today = LocalDate.now();

    LocalDate earliestDob = today.minusYears(maxAge);
    LocalDate latestDob = today.minusYears(minAge);

    return Pair.of(Date.valueOf(earliestDob), Date.valueOf(latestDob));
  }

  public static int ageFromDob(Date dob) {
    return Period.between(dob.toLocalDate(), LocalDate.now()).getYears();
  }

  public static void queryPosts(HttpServletRequest request, HttpServletResponse response) throws IOException {
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
      StringBuilder sql = new StringBuilder(
          """
              SELECT p.id, p.user_id, p.type, p.requirements, p.goals, p.experience, u.name, u.email, u.gender, u.church, u.dob
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
        posts.add(nullSafeMap(
            "id", rs.getInt("id"), "user_id", rs.getInt("user_id"),
            "type", rs.getString("type"), "requirements", rs.getString("requirements"),
            "goals", rs.getString("goals"), "experience", rs.getString("experience"),
            "name", rs.getString("name"), "email", rs.getString("email"),
            "gender", rs.getString("gender"), "church", rs.getString("church"),
            "age", ageFromDob(rs.getDate("dob"))));
      }
      JsonResponseUtils.sendJson(response, posts);
    }, response);
  }

  public static void sendRequest(HttpServletRequest request, HttpServletResponse response) throws IOException {
    final int id = Integer.parseInt(request.getParameter("id"));
    final String sessionID = request.getParameter("session_id");
    final int requesteeId = Integer.parseInt(request.getParameter("requestee_id"));
    final String message = request.getParameter("message");
    final String type = request.getParameter("type");

    SessionPair session = new SessionPair(id, sessionID);
    try (Connection conn = ApiServlet.getConnection()) {
      if (ApiServlet.invalidSessionID(session, conn, response)) {
        return;
      }

      PreparedStatement stmt = conn.prepareStatement(
          "INSERT INTO requests (requester_id, requestee_id, message, type) VALUES (?, ?, ?, ?)",
          Statement.RETURN_GENERATED_KEYS);
      stmt.setInt(1, id);
      stmt.setInt(2, requesteeId);
      stmt.setString(3, message);
      stmt.setString(4, type.toUpperCase());
      stmt.executeUpdate();

      ResultSet rs = stmt.getGeneratedKeys();
      if (!rs.next()) {
        JsonResponseUtils.sendJson(response,
            Map.of("message", "Failed to send request"),
            HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
        return;
      }
      JsonResponseUtils.sendJson(response, Map.of("message", "Request sent successfully", "request_id", rs.getInt(1)));

    } catch (SQLException e) {
      if (e.getErrorCode() == 1062) {
        JsonResponseUtils.sendJson(response,
            Map.of("message", "You have already sent a request to this user."),
            HttpServletResponse.SC_CONFLICT);
      } else {
        printDebugErrorMessage(response, e);
      }
    }
  }

  public static void getLatestMessages(HttpServletRequest request, HttpServletResponse response) throws IOException {
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
            msg.put("created_at", rs.getTimestamp("sent_at").getTime());

            messages.add(msg);
          }
        }
      }

      if (chatIds.isEmpty()) {
        JsonResponseUtils.sendJson(response, new ArrayList<>());
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

      JsonResponseUtils.sendJson(response, new ArrayList<>(chatMap.values()));
    }, response);
  }

  public static void getOlderMessages(HttpServletRequest request, HttpServletResponse response) throws IOException {
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
            rs.getString("message"), "sent_at", rs.getTimestamp("sent_at").getTime()));
      }
      JsonResponseUtils.sendJson(response, messages);
    }, response);
  }

  public static void markMessagesAsRead(HttpServletRequest request, HttpServletResponse response) throws IOException {
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
    JsonResponseUtils.sendJson(response, Map.of("message", "Messages marked as read"));
  }

  public static void createChat(HttpServletRequest request, HttpServletResponse response) throws IOException {
    final int id = Integer.parseInt(request.getParameter("id"));
    final String sessionID = request.getParameter("session_id");
    final int requesteeId = Integer.parseInt(request.getParameter("requestee_id"));
    SessionPair session = new SessionPair(id, sessionID);
    executeSQL(session, conn -> {
      PreparedStatement stmt = conn.prepareStatement("INSERT INTO chats () VALUES ()", Statement.RETURN_GENERATED_KEYS);
      stmt.executeUpdate();

      ResultSet rs = stmt.getGeneratedKeys();
      if (!rs.next()) {
        JsonResponseUtils.sendJson(response,
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

      JsonResponseUtils.sendJson(response, Map.of("message", "Chat created successfully", "chat_id", chatId));
    }, response);
  }

  public static void signout(HttpServletRequest request, HttpServletResponse response) throws IOException {
    final int id = Integer.parseInt(request.getParameter("id"));
    final String sessionID = request.getParameter("session_id");
    SessionPair session = new SessionPair(id, sessionID);
    executeSQL(session, conn -> {
      PreparedStatement stmt = conn.prepareStatement("DELETE FROM codes WHERE user_id = ? AND code = ?");
      stmt.setInt(1, id);
      stmt.setString(2, sessionID);
      stmt.executeUpdate();
      JsonResponseUtils.sendJson(response, Map.of("message", "Signed out successfully"));
    }, response);
  }

  public static void sendPost(HttpServletRequest request, HttpServletResponse response) throws IOException {
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
      JsonResponseUtils.sendJson(response, Map.of("message", "Post sent successfully"));
    }, response);
  }

  public static void acceptRequest(HttpServletRequest request, HttpServletResponse response) throws IOException {
    final int id = Integer.parseInt(request.getParameter("id"));
    final String sessionID = request.getParameter("session_id");
    final int requestId = Integer.parseInt(request.getParameter("request_id"));
    final int requesteeId = Integer.parseInt(request.getParameter("requestee_id"));
    final String type = request.getParameter("type");
    SessionPair session = new SessionPair(id, sessionID);
    executeSQL(session, conn -> {
      PreparedStatement insertStmt = conn
          .prepareStatement("INSERT INTO matches (user_one_id, user_two_id, discipleship) VALUES (?, ?, ?)");
      PreparedStatement deleteStmt = conn.prepareStatement("DELETE FROM posts WHERE user_id = ? AND type = ?");
      PreparedStatement deleteStmt2 = conn.prepareStatement("DELETE FROM requests WHERE id = ?");

      deleteStmt2.setInt(1, requestId);
      deleteStmt.setInt(1, id);

      if (type.equals("A")) {
        insertStmt.setInt(1, requesteeId);
        insertStmt.setInt(2, id);
        insertStmt.setBoolean(3, false);
        deleteStmt.setString(2, "A");
      } else if (type.equals("M")) {
        insertStmt.setInt(1, requesteeId);
        insertStmt.setInt(2, id);
        insertStmt.setBoolean(3, true);
        deleteStmt.setString(2, "D");
      } else if (type.equals("D")) {
        insertStmt.setInt(1, id);
        insertStmt.setInt(2, requesteeId);
        insertStmt.setBoolean(3, true);
        deleteStmt.setString(2, "M");
      } else {
        JsonResponseUtils.sendJson(response, Map.of("message", "Invalid request type"),
            HttpServletResponse.SC_BAD_REQUEST);
        return;
      }

      if (insertStmt.executeUpdate() == 0) {
        JsonResponseUtils.sendJson(response, Map.of("message", "Failed to accept request"),
            HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
        return;
      }

      deleteStmt.executeUpdate();
      deleteStmt2.executeUpdate();

      JsonResponseUtils.sendJson(response, Map.of("message", "Request accepted successfully"));
    }, response);
  }

  public static void rejectRequest(HttpServletRequest request, HttpServletResponse response) throws IOException {
    final int id = Integer.parseInt(request.getParameter("id"));
    final String sessionID = request.getParameter("session_id");
    final int requestId = Integer.parseInt(request.getParameter("request_id"));
    SessionPair session = new SessionPair(id, sessionID);
    executeSQL(session, conn -> {
      PreparedStatement deleteStmt = conn.prepareStatement("DELETE FROM requests WHERE id = ?");
      deleteStmt.setInt(1, requestId);
      deleteStmt.executeUpdate();
      JsonResponseUtils.sendJson(response, Map.of("message", "Request rejected successfully"));
    }, response);
  }
}