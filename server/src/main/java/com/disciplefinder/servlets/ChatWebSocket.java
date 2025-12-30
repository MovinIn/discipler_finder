package com.disciplefinder.servlets;

import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import com.google.gson.Gson;

import jakarta.websocket.*;
import jakarta.websocket.server.ServerEndpoint;

@ServerEndpoint("/ws/chat")
public class ChatWebSocket {
  private static final Gson gson = new Gson();
  private static final Map<Integer, Set<Session>> chatSubscribers = new ConcurrentHashMap<>();
  private static final Map<Session, SessionPair> sessionUsers = new ConcurrentHashMap<>();
  private static final Map<Session, Set<Integer>> sessionChats = new ConcurrentHashMap<>();

  @OnOpen
  public void onOpen(Session session, EndpointConfig config) {
    Map<String, List<String>> params = session.getRequestParameterMap();
    int id = Integer.parseInt(params.get("id").get(0));
    String sessionID = params.get("session_id").get(0);

    try (Connection conn = ApiServlet.getConnection()) {
      if (ApiServlet.invalidSessionID(new SessionPair(id, sessionID), conn)) {
        closeSession(session, new CloseReason(CloseReason.CloseCodes.VIOLATED_POLICY, "Invalid session ID"));
        return;
      }
    } catch (SQLException e) {
      closeSession(session, new CloseReason(CloseReason.CloseCodes.VIOLATED_POLICY, "Invalid session ID"));
    }

    sessionUsers.put(session, new SessionPair(id, sessionID));
    subscribeToChats(id, session);
  }

  @OnMessage
  public void onMessage(Session session, String messageJson) {
    SessionPair sessionPair = sessionUsers.get(session);
    if (sessionPair == null) {
      closeSession(session, new CloseReason(
          CloseReason.CloseCodes.VIOLATED_POLICY,
          "Unauthenticated session"));
      return;
    }

    ChatMessage msg = null;
    try {
      msg = gson.fromJson(messageJson, ChatMessage.class);
      System.out.println("Parsed message - ID: " + msg.getID() + ", isMessage: " + msg.isMessage() + ", content: " + msg.getContent());
    } catch (Exception e) {
      System.out.println("Failed to parse message: " + e.getMessage());
      closeSession(session, new CloseReason(CloseReason.CloseCodes.CANNOT_ACCEPT, "Invalid message format"));
      return;
    }

    Set<Integer> chats = sessionChats.get(session);
    if (chats == null || !chats.contains(msg.getID())) {
      closeSession(session, new CloseReason(CloseReason.CloseCodes.VIOLATED_POLICY,
          "User is not a participant in this chat"));
      return;
    }

    try {
      if (msg.isMessage()) {
        try {
          sendMessage(sessionPair, msg.getID(), msg.getContent(), session);
        } catch (IllegalArgumentException e) {
          session.getAsyncRemote().sendText(gson.toJson(Map.of(
              "type", "error",
              "message", e.getMessage())));
        }
      } else {
        broadcastToChat(msg.getID(), sessionPair.id, Map.of(
            "type", "typing",
            "chat_id", msg.getID(),
            "user_id", sessionPair.id));
      }
    } catch (SQLException e) {
      closeSession(session, new CloseReason(CloseReason.CloseCodes.VIOLATED_POLICY, "Database error"));
    }
  }

  @OnClose
  public void onClose(Session session, CloseReason reason) {
    sessionUsers.remove(session);
    sessionChats.remove(session);
    chatSubscribers.values().forEach(subs -> subs.remove(session));
    chatSubscribers.entrySet().removeIf(e -> e.getValue().isEmpty());
  }

  @OnError
  public void onError(Session session, Throwable t) {
    t.printStackTrace();
  }

  private void broadcastToChat(int chatID, int senderID, Map<String, Object> payload) {
    Set<Session> sessions = chatSubscribers.getOrDefault(chatID, Set.of());
    String json = gson.toJson(payload);

    for (Session s : sessions) {
      SessionPair sp = sessionUsers.get(s);
      if (sp != null && sp.id != senderID) {
        s.getAsyncRemote().sendText(json);
      }
    }
  }

  private void sendMessage(SessionPair sessionPair, int chatID, String message, Session session)
      throws SQLException {
    if (message == null || message.isEmpty()) {
      throw new IllegalArgumentException("Message cannot be empty");
    }

    if (message.length() > 2048) {
      throw new IllegalArgumentException("Message must be at most 2048 characters");
    }

    try (Connection conn = ApiServlet.getConnection()) {
      PreparedStatement insertStmt = conn.prepareStatement(
          "INSERT INTO messages (chat_id, sender_id, message, sent_at) VALUES (?, ?, ?, ?)",
          Statement.RETURN_GENERATED_KEYS);

      Timestamp sentAt = new Timestamp(System.currentTimeMillis());
      insertStmt.setInt(1, chatID);
      insertStmt.setInt(2, sessionPair.id);
      insertStmt.setString(3, message);
      insertStmt.setTimestamp(4, sentAt);
      insertStmt.executeUpdate();

      try (ResultSet keys = insertStmt.getGeneratedKeys()) {
        keys.next();
        session.getAsyncRemote().sendText(gson.toJson(Map.of(
            "type", "message",
            "chat_id", chatID,
            "message_id", keys.getInt(1),
            "sender_id", sessionPair.id,
            "message", message,
            "sent_at", sentAt.getTime())));

        broadcastToChat(chatID, sessionPair.id, Map.of(
            "type", "message",
            "chat_id", chatID,
            "message_id", keys.getInt(1),
            "sender_id", sessionPair.id,
            "message", message,
            "sent_at", sentAt.getTime()));
      }
    }
  }

  private static void subscribeToChats(int userID, Session session) {
    try (Connection conn = ApiServlet.getConnection()) {
      PreparedStatement checkStmt = conn.prepareStatement(
          "SELECT chat_id FROM chat_participants WHERE user_id = ?");
      checkStmt.setInt(1, userID);
      ResultSet checkRs = checkStmt.executeQuery();
      Set<Integer> chats = ConcurrentHashMap.newKeySet();
      while (checkRs.next()) {
        int chatID = checkRs.getInt(1);
        chats.add(chatID);
        chatSubscribers.computeIfAbsent(chatID, k -> ConcurrentHashMap.newKeySet()).add(session);
      }
      sessionChats.put(session, chats);
    } catch (SQLException e) {
      closeSession(session, new CloseReason(CloseReason.CloseCodes.VIOLATED_POLICY, "Failed to subscribe to chats"));
    }
  }

  private static void closeSession(Session session, CloseReason reason) {
    try {
      session.close(reason);
    } catch (IOException e) {
      e.printStackTrace();
    }
  }
}