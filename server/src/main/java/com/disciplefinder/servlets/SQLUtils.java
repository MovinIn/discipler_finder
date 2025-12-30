package com.disciplefinder.servlets;

import java.io.IOException;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import jakarta.servlet.http.HttpServletResponse;

@FunctionalInterface
interface MySQLFunction {
  void execute(Connection conn) throws SQLException, IOException;
}

@FunctionalInterface
interface SQLFunction<T> {
  T apply() throws SQLException;
}

public class SQLUtils {
  private SQLUtils() {
    throw new IllegalStateException("Utility class");
  }

  public static void executeSQL(MySQLFunction function, HttpServletResponse response) throws IOException {
    try (Connection conn = ApiServlet.getConnection()) {
      function.execute(conn);
    } catch (SQLException e) {
      printDebugErrorMessage(response, e);
    }
  }

  public static void executeSQL(SessionPair sessionPair, MySQLFunction function, HttpServletResponse response)
      throws IOException {
    try (Connection conn = ApiServlet.getConnection()) {
      if (ApiServlet.invalidSessionID(sessionPair, conn, response)) {
        return;
      }
      function.execute(conn);
    } catch (SQLException e) {
      printDebugErrorMessage(response, e);
    }
  }

  public static void printDebugErrorMessage(HttpServletResponse response, SQLException e) throws IOException {
    StringBuilder sb = new StringBuilder();
    SQLException current = e;
    while (current != null) {
      if (current.getMessage() != null && !current.getMessage().isEmpty()) {
        sb.append(current.getMessage()).append(" ");
      }
      current = current.getNextException();
    }

    String errorMsg = sb.length() > 0 ? sb.toString().trim() : "Unknown database error";

    JsonResponseUtils.sendJson(response,
        Map.of("status", "error", "message", errorMsg),
        HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
  }

  public static <T> T columnOrDefault(SQLFunction<T> function, T defaultValue) {
    try {
      return function.apply();
    } catch (SQLException e) {
      return defaultValue;
    }
  }

  /**
   * Creates a map from a variable number of key-value pairs. Allows null values.
   */
  public static Map<String, Object> nullSafeMap(Object... keysAndValues) {
    Map<String, Object> map = new HashMap<>();
    for (int i = 0; i < keysAndValues.length; i += 2) {
      String key = (String) keysAndValues[i];
      Object value = keysAndValues[i + 1];
      map.put(key, value);
    }
    return map;
  }

  public static Profile buildProfileFromResultSet(ResultSet rs) throws SQLException {
    Profile.Builder profileBuilder = new Profile.Builder()
        .email(rs.getString("email"))
        .id(rs.getInt("user_id"))
        .name(rs.getString("name"))
        .dob(columnOrDefault(() -> rs.getDate("dob"), null))
        .church(columnOrDefault(() -> rs.getString("church"), null))
        .gender(columnOrDefault(() -> rs.getString("gender"), null))
        .created_at(columnOrDefault(() -> rs.getTimestamp("created_at"), null));

    return profileBuilder.build();
  }

  public static List<Map<String, Object>> handleRequestResults(ResultSet rs) throws SQLException {
    List<Map<String, Object>> requests = new ArrayList<>();
    while (rs.next()) {
      Profile profile = buildProfileFromResultSet(rs);

      requests.add(nullSafeMap("profile", profile,
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

}
