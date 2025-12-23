package com.disciplefinder.servlets;

import jakarta.servlet.ServletConfig;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import com.google.gson.Gson;
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import java.io.IOException;
import java.io.InputStream;
import java.io.PrintWriter;
import java.sql.Connection;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.Random;
import at.favre.lib.crypto.bcrypt.BCrypt;
import jakarta.mail.*;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;

/**
 * Simple API Servlet example for Discipler Finder
 * Handles CORS and returns JSON responses
 * Uses HikariCP connection pooling for database access
 */
@FunctionalInterface
interface MySQLFunction {
    void execute(Connection conn) throws SQLException, IOException;
}

@WebServlet(name = "ApiServlet", urlPatterns = {"/api/*"})
public class ApiServlet extends HttpServlet {
    
    private static final Gson gson = new Gson();
    private static HikariDataSource ds;
    private static final String propertiesFile = "vm.properties";
    private static final String ALPHANUMERIC = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    
    @Override
    public void init(ServletConfig config) throws ServletException {
        super.init(config);
        
        try {
            Class.forName("com.mysql.cj.jdbc.Driver");
        } catch (ClassNotFoundException e) {
            throw new ServletException("Failed to load com.mysql.cj.jdbc.Driver", e);
        }
        
        try (InputStream input = getClass().getClassLoader().getResourceAsStream(propertiesFile)) {
            if (input == null) {
                throw new ServletException("Unable to find " + propertiesFile);
            }
            
            Properties props = new Properties();
            props.load(input);
            
            HikariConfig hikariConfig = new HikariConfig();
            hikariConfig.setJdbcUrl(props.getProperty("url"));
            hikariConfig.setUsername(props.getProperty("username"));
            hikariConfig.setPassword(props.getProperty("password"));
            hikariConfig.setMaximumPoolSize(10);
            
            ds = new HikariDataSource(hikariConfig);
            
        } catch (Exception e) {
            throw new ServletException("Failed to load database properties", e);
        }
    }
    
    @Override
    public void destroy() {
        if (ds != null) {
            ds.close(); // Clean up the pool when servlet is destroyed
        }
    }
    
    public static Connection getConnection() throws SQLException {
        return ds.getConnection();
    }
    
    private void executeSQL(MySQLFunction function, HttpServletResponse response) throws IOException {
        try (Connection conn = getConnection()) {
            function.execute(conn);
        } catch (SQLException e) {
            response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "Database error");
        }
    }
    
    private void executeSQL(SessionPair sessionPair, MySQLFunction function,
            HttpServletResponse response) throws IOException {
        try (Connection conn = getConnection()) {
            if (invalidSessionID(sessionPair, conn, response)) {
                return;
            }
            function.execute(conn);
        } catch (SQLException e) {
            throw new IOException("Database error", e);
        }
    }
    
    private boolean invalidSessionID(SessionPair sessionPair, Connection conn,
            HttpServletResponse response) throws SQLException, IOException {
        PreparedStatement checkStmt = conn.prepareStatement(
                "SELECT COUNT(*) FROM users WHERE email = ? AND session_id = ?;");
        checkStmt.setString(1, sessionPair.email);
        checkStmt.setString(2, sessionPair.sessionID);
        ResultSet rs = checkStmt.executeQuery();
        if (rs.next() && rs.getInt(1) == 0) {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid credentials");
            return true;
        }
        return false;
    }
    
    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        
        // Enable CORS for React frontend
        setCorsHeaders(response);
        
        // Get the path info to determine which endpoint
        String pathInfo = request.getPathInfo();
        
        Map<String, Object> jsonResponse = new HashMap<>();
        
        if (pathInfo == null || pathInfo.equals("/") || pathInfo.equals("/health")) {
            // Health check endpoint
            jsonResponse.put("status", "ok");
            jsonResponse.put("message", "Discipler Finder API is running");
            jsonResponse.put("timestamp", System.currentTimeMillis());
        } else if (pathInfo.equals("/users")) {
            // Example users endpoint
            jsonResponse.put("users", new String[]{"user1", "user2", "user3"});
        } else {
            jsonResponse.put("error", "Endpoint not found");
            response.setStatus(HttpServletResponse.SC_NOT_FOUND);
        }
        
        // Send JSON response
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        
        PrintWriter out = response.getWriter();
        out.print(gson.toJson(jsonResponse));
        out.flush();
    }
    
    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        
        setCorsHeaders(response);
        
        String action = request.getParameter("action");
        if (action == null) {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Missing action parameter");
            return;
        }
        
        switch (action) {
            case "login" -> login(request, response);
            case "create_account" -> createAccount(request, response);
            case "matchmaking" -> matchmaking(request, response);
            case "request_match" -> requestMatch(request, response);
            case "get_sent_requests" -> getSentRequests(request, response);
            case "get_received_requests" -> getReceivedRequests(request, response);
            case "accept_request" -> acceptRequest(request, response);
            case "create_chat" -> createChat(request, response);
            case "send_message" -> sendMessage(request, response);
            case "get_chat_messages" -> getChatMessages(request, response);
            default -> {
                response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Unknown action: " + action);
            }
        }
    }
    
    @Override
    protected void doOptions(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        // Handle preflight CORS requests
        setCorsHeaders(response);
        response.setStatus(HttpServletResponse.SC_OK);
    }
    
    /**
     * Set CORS headers to allow requests from React frontend
     */
    private void setCorsHeaders(HttpServletResponse response) {
        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
        response.setHeader("Access-Control-Max-Age", "3600");
    }
    
    /**
     * Generate a random alphanumeric string of specified length
     */
    private String getRandomAlphanumeric(int length) {
        StringBuilder sb = new StringBuilder(length);
        Random rnd = new Random();
        for (int i = 0; i < length; i++) {
            sb.append(ALPHANUMERIC.charAt(rnd.nextInt(ALPHANUMERIC.length())));
        }
        return sb.toString();
    }
    
    /**
     * Login method - validates credentials and returns user data (except password) as JSON
     */
    private void login(HttpServletRequest request, HttpServletResponse response) throws IOException {
        final String email = request.getParameter("email");
        final String password = request.getParameter("password");
        
        if (email == null || password == null || email.isEmpty() || password.isEmpty()) {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Email and password are required");
            return;
        }
        
        executeSQL(conn -> {
            // Get user with password hash and activation status
            PreparedStatement stmt = conn.prepareStatement(
                "SELECT id, email, password, session_id, created_at, dob, church, gender, " +
                "requirements, goals, experience, finding_discipler, finding_disciple, finding_accountability, activate " +
                "FROM users WHERE email = ?");
            stmt.setString(1, email);
            ResultSet rs = stmt.executeQuery();
            
            if (!rs.next()) {
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid credentials");
                return;
            }
            
            // Verify password
            byte[] storedHash = rs.getBytes("password");
            BCrypt.Result result = BCrypt.verifyer().verify(password.getBytes(), storedHash);
            if (!result.verified) {
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid credentials");
                return;
            }
            
            // Check if account is activated
            boolean isActivated = rs.getBoolean("activate");
            if (!isActivated) {
                response.sendError(HttpServletResponse.SC_FORBIDDEN, 
                    "Account not activated. Please check your email for activation instructions.");
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
            
            // Build JSON response with all fields except password
            Map<String, Object> userData = new HashMap<>();
            userData.put("id", rs.getInt("id"));
            userData.put("email", rs.getString("email"));
            userData.put("session_id", sessionID);
            
            Timestamp created_at = rs.getTimestamp("created_at");
            if (created_at != null) {
                userData.put("created_at", created_at.getTime());
            }
            
            Date dob = rs.getDate("dob");
            if (dob != null) {
                userData.put("dob", dob.toString());
            }
            
            userData.put("church", rs.getString("church"));
            userData.put("gender", rs.getString("gender"));
            userData.put("requirements", rs.getString("requirements"));
            userData.put("goals", rs.getString("goals"));
            userData.put("experience", rs.getString("experience"));
            userData.put("finding_discipler", rs.getBoolean("finding_discipler"));
            userData.put("finding_disciple", rs.getBoolean("finding_disciple"));
            userData.put("finding_accountability", rs.getBoolean("finding_accountability"));
            
            response.setContentType("application/json");
            response.setCharacterEncoding("UTF-8");
            response.setStatus(HttpServletResponse.SC_OK);
            
            PrintWriter out = response.getWriter();
            out.print(gson.toJson(userData));
            out.flush();
        }, response);
    }
    
    /**
     * Create account method - creates new user account and sends welcome email
     */
    private void createAccount(HttpServletRequest request, HttpServletResponse response) throws IOException {
        final String email = request.getParameter("email");
        final String password = request.getParameter("password");
        
        if (email == null || password == null || email.isEmpty() || password.isEmpty()) {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Email and password are required");
            return;
        }
        
        if (password.length() < 4) {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Password must be at least 4 characters");
            return;
        }
        
        executeSQL(conn -> {
            // Check if email already exists
            PreparedStatement checkStmt = conn.prepareStatement(
                "SELECT COUNT(*) FROM users WHERE email = ?");
            checkStmt.setString(1, email);
            ResultSet rs = checkStmt.executeQuery();
            if (rs.next() && rs.getInt(1) > 0) {
                response.sendError(HttpServletResponse.SC_CONFLICT, "Email already exists");
                return;
            }
            
            // Hash password
            byte[] salt = new byte[16];
            new java.security.SecureRandom().nextBytes(salt);
            byte[] hashedPassword = BCrypt.withDefaults().hash(12, salt, password.getBytes());
            
            // Insert new user with activate = 0
            PreparedStatement insertStmt = conn.prepareStatement(
                "INSERT INTO users (email, password, finding_discipler, finding_disciple, finding_accountability, activate) " +
                "VALUES (?, ?, 0, 0, 0, 0)",
                PreparedStatement.RETURN_GENERATED_KEYS);
            insertStmt.setString(1, email);
            insertStmt.setBytes(2, hashedPassword);
            insertStmt.executeUpdate();
            
            // Get the generated user ID
            ResultSet generatedKeys = insertStmt.getGeneratedKeys();
            if (!generatedKeys.next()) {
                response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "Failed to create user");
                return;
            }
            int userId = generatedKeys.getInt(1);
            
            // Generate activation code (15 characters) and insert into codes table
            String activationCode = getRandomAlphanumeric(15);
            // Activation codes expire in 48 hours
            PreparedStatement codeStmt = conn.prepareStatement(
                "INSERT INTO codes (user_id, code, code_type, expires_at) " +
                "VALUES (?, ?, 'activation', DATE_ADD(NOW(), INTERVAL 48 HOUR))");
            codeStmt.setInt(1, userId);
            codeStmt.setString(2, activationCode);
            codeStmt.executeUpdate();
            
            // Send welcome email with activation code
            try {
                sendWelcomeEmail(email, activationCode);
            } catch (Exception e) {
                // Log error but don't fail the account creation
                System.err.println("Failed to send welcome email to " + email + ": " + e.getMessage());
            }
            
            response.setStatus(HttpServletResponse.SC_OK);
            response.setContentType("application/json");
            response.setCharacterEncoding("UTF-8");
            
            Map<String, Object> jsonResponse = new HashMap<>();
            jsonResponse.put("status", "success");
            jsonResponse.put("message", "Account created successfully");
            
            PrintWriter out = response.getWriter();
            out.print(gson.toJson(jsonResponse));
            out.flush();
        }, response);
    }
    
    /**
     * Send welcome email to new user with activation code
     */
    private void sendWelcomeEmail(String toEmail, String activationCode) throws MessagingException {
        // Get email configuration from properties file
        Properties emailProps = new Properties();
        try (InputStream input = getClass().getClassLoader().getResourceAsStream(propertiesFile)) {
            if (input != null) {
                emailProps.load(input);
            }
        } catch (IOException e) {
            throw new MessagingException("Failed to load email properties", e);
        }
        
        // Default SMTP configuration (can be overridden in properties file)
        String smtpHost = emailProps.getProperty("smtp.host", "smtp.gmail.com");
        String smtpPort = emailProps.getProperty("smtp.port", "587");
        String smtpUser = emailProps.getProperty("smtp.user", "");
        String smtpPassword = emailProps.getProperty("smtp.password", "");
        String fromEmail = emailProps.getProperty("smtp.from", smtpUser);
        
        // If SMTP credentials are not configured, skip sending email
        if (smtpUser.isEmpty() || smtpPassword.isEmpty()) {
            System.out.println("SMTP not configured, skipping email send to " + toEmail);
            return;
        }
        
        // Set up mail properties
        Properties props = new Properties();
        props.put("mail.smtp.host", smtpHost);
        props.put("mail.smtp.port", smtpPort);
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.starttls.enable", "true");
        
        // Create session with authenticator
        Session session = Session.getInstance(props, new Authenticator() {
            @Override
            protected PasswordAuthentication getPasswordAuthentication() {
                return new PasswordAuthentication(smtpUser, smtpPassword);
            }
        });
        
        // Create message
        Message message = new MimeMessage(session);
        message.setFrom(new InternetAddress(fromEmail));
        message.setRecipients(Message.RecipientType.TO, InternetAddress.parse(toEmail));
        message.setSubject("Welcome to Discipler Finder - Activate Your Account!");
        
        String baseUrl = emailProps.getProperty("app.base_url", "http://localhost:8080");
        String emailBody = "Thank you for creating an account with Discipler Finder! We're excited to help you find your discipling community.\n\n" +
                          "To activate your account, please use the following activation code:\n\n" +
                          "Activation Code: " + activationCode + "\n\n" +
                          "You can activate your account by visiting: " + baseUrl + "/activate?email=" + toEmail + "&activation_code=" + activationCode + "\n\n" +
                          "If you did not create this account, please ignore this email.";
        
        message.setText(emailBody);
        
        // Send message
        Transport.send(message);
    }
    
    /**
     * Get user ID from email and session_id
     */
    private int getUserIdFromSession(String email, String sessionID, Connection conn) throws SQLException {
        PreparedStatement stmt = conn.prepareStatement(
            "SELECT id FROM users WHERE email = ? AND session_id = ?");
        stmt.setString(1, email);
        stmt.setString(2, sessionID);
        ResultSet rs = stmt.executeQuery();
        if (rs.next()) {
            return rs.getInt("id");
        }
        return -1;
    }
    
    /**
     * Matchmaking method - finds users based on preferences, gender, and age range
     */
    private void matchmaking(HttpServletRequest request, HttpServletResponse response) throws IOException {
        final String email = request.getParameter("email");
        final String sessionID = request.getParameter("session_id");
        final String wantToDisciple = request.getParameter("want_to_disciple"); // "true" or "false"
        final String wantToBeDiscipled = request.getParameter("want_to_be_disciped"); // "true" or "false"
        final String wantAccountability = request.getParameter("want_accountability"); // "true" or "false"
        final String gender = request.getParameter("gender"); // "M", "F", or null for any
        final String minAgeStr = request.getParameter("min_age");
        final String maxAgeStr = request.getParameter("max_age");
        
        if (email == null || sessionID == null) {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Email and session_id are required");
            return;
        }
        
        executeSQL(new SessionPair(email, sessionID), conn -> {
            int currentUserId = getUserIdFromSession(email, sessionID, conn);
            if (currentUserId == -1) {
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid session");
                return;
            }
            
            // Build the SQL query dynamically based on filters
            StringBuilder sql = new StringBuilder(
                "SELECT id, email, created_at, dob, church, gender, requirements, goals, experience, " +
                "finding_discipler, finding_disciple, finding_accountability, " +
                "TIMESTAMPDIFF(YEAR, dob, CURDATE()) AS age " +
                "FROM users WHERE id != ?");
            
            // Add preference filters
            // If user wants to disciple, find users who want to be discipled
            if ("true".equalsIgnoreCase(wantToDisciple)) {
                sql.append(" AND finding_disciple = 1");
            }
            // If user wants to be discipled, find users who want to disciple
            if ("true".equalsIgnoreCase(wantToBeDiscipled)) {
                sql.append(" AND finding_discipler = 1");
            }
            // If user wants accountability, find users who also want accountability
            if ("true".equalsIgnoreCase(wantAccountability)) {
                sql.append(" AND finding_accountability = 1");
            }
            
            // Add gender filter
            if (gender != null && !gender.isEmpty()) {
                sql.append(" AND gender = ?");
            }
            
            // Add age range filter
            if (minAgeStr != null && !minAgeStr.isEmpty()) {
                try {
                    int minAge = Integer.parseInt(minAgeStr);
                    sql.append(" AND TIMESTAMPDIFF(YEAR, dob, CURDATE()) >= ?");
                } catch (NumberFormatException e) {
                    // Ignore invalid min_age
                }
            }
            if (maxAgeStr != null && !maxAgeStr.isEmpty()) {
                try {
                    int maxAge = Integer.parseInt(maxAgeStr);
                    sql.append(" AND TIMESTAMPDIFF(YEAR, dob, CURDATE()) <= ?");
                } catch (NumberFormatException e) {
                    // Ignore invalid max_age
                }
            }
            
            PreparedStatement stmt = conn.prepareStatement(sql.toString());
            int paramIndex = 1;
            stmt.setInt(paramIndex++, currentUserId);
            
            if (gender != null && !gender.isEmpty()) {
                stmt.setString(paramIndex++, gender);
            }
            if (minAgeStr != null && !minAgeStr.isEmpty()) {
                try {
                    int minAge = Integer.parseInt(minAgeStr);
                    stmt.setInt(paramIndex++, minAge);
                } catch (NumberFormatException e) {
                    // Already handled
                }
            }
            if (maxAgeStr != null && !maxAgeStr.isEmpty()) {
                try {
                    int maxAge = Integer.parseInt(maxAgeStr);
                    stmt.setInt(paramIndex++, maxAge);
                } catch (NumberFormatException e) {
                    // Already handled
                }
            }
            
            ResultSet rs = stmt.executeQuery();
            
            // Build JSON array of matching users
            List<Map<String, Object>> matches = new ArrayList<>();
            while (rs.next()) {
                Map<String, Object> user = new HashMap<>();
                user.put("id", rs.getInt("id"));
                user.put("email", rs.getString("email"));
                
                Timestamp created_at = rs.getTimestamp("created_at");
                if (created_at != null) {
                    user.put("created_at", created_at.getTime());
                }
                
                Date dob = rs.getDate("dob");
                if (dob != null) {
                    user.put("dob", dob.toString());
                }
                
                user.put("church", rs.getString("church"));
                user.put("gender", rs.getString("gender"));
                user.put("requirements", rs.getString("requirements"));
                user.put("goals", rs.getString("goals"));
                user.put("experience", rs.getString("experience"));
                user.put("finding_discipler", rs.getBoolean("finding_discipler"));
                user.put("finding_disciple", rs.getBoolean("finding_disciple"));
                user.put("finding_accountability", rs.getBoolean("finding_accountability"));
                
                // Add calculated age if dob is available
                if (!rs.wasNull()) {
                    user.put("age", rs.getInt("age"));
                }
                
                matches.add(user);
            }
            
            response.setContentType("application/json");
            response.setCharacterEncoding("UTF-8");
            response.setStatus(HttpServletResponse.SC_OK);
            
            PrintWriter out = response.getWriter();
            out.print(gson.toJson(matches));
            out.flush();
        }, response);
    }
    
    /**
     * Request match method - inserts a request into the requests table
     * Throws exception if a request already exists between the same requester and requestee
     */
    private void requestMatch(HttpServletRequest request, HttpServletResponse response) throws IOException {
        final String email = request.getParameter("email");
        final String sessionID = request.getParameter("session_id");
        final String requesteeIdStr = request.getParameter("requestee_id");
        final String message = request.getParameter("message");
        final String chatIdStr = request.getParameter("chat_id");
        
        if (email == null || sessionID == null || requesteeIdStr == null || message == null || chatIdStr == null) {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST, 
                "email, session_id, requestee_id, message, and chat_id are required");
            return;
        }
        
        executeSQL(new SessionPair(email, sessionID), conn -> {
            int requesterId = getUserIdFromSession(email, sessionID, conn);
            if (requesterId == -1) {
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid session");
                return;
            }
            
            int requesteeId;
            int chatId;
            try {
                requesteeId = Integer.parseInt(requesteeIdStr);
                chatId = Integer.parseInt(chatIdStr);
            } catch (NumberFormatException e) {
                response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Invalid requestee_id or chat_id");
                return;
            }
            
            // Check if a request already exists
            PreparedStatement checkStmt = conn.prepareStatement(
                "SELECT COUNT(*) FROM requests WHERE requester = ? AND requestee = ?");
            checkStmt.setInt(1, requesterId);
            checkStmt.setInt(2, requesteeId);
            ResultSet rs = checkStmt.executeQuery();
            
            if (rs.next() && rs.getInt(1) > 0) {
                // Request already exists - throw exception
                response.sendError(HttpServletResponse.SC_CONFLICT, 
                    "A request already exists between these users");
                return;
            }
            
            // Insert the new request
            PreparedStatement insertStmt = conn.prepareStatement(
                "INSERT INTO requests (requester, requestee, message, chat_id) VALUES (?, ?, ?, ?)");
            insertStmt.setInt(1, requesterId);
            insertStmt.setInt(2, requesteeId);
            insertStmt.setString(3, message);
            insertStmt.setInt(4, chatId);
            insertStmt.executeUpdate();
            
            response.setStatus(HttpServletResponse.SC_OK);
            response.setContentType("application/json");
            response.setCharacterEncoding("UTF-8");
            
            Map<String, Object> jsonResponse = new HashMap<>();
            jsonResponse.put("status", "success");
            jsonResponse.put("message", "Request created successfully");
            
            PrintWriter out = response.getWriter();
            out.print(gson.toJson(jsonResponse));
            out.flush();
        }, response);
    }
    
    /**
     * Get sent requests - requests where the user is the requester
     */
    private void getSentRequests(HttpServletRequest request, HttpServletResponse response) throws IOException {
        final String email = request.getParameter("email");
        final String sessionID = request.getParameter("session_id");
        
        if (email == null || sessionID == null) {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Email and session_id are required");
            return;
        }
        
        executeSQL(new SessionPair(email, sessionID), conn -> {
            int userId = getUserIdFromSession(email, sessionID, conn);
            if (userId == -1) {
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid session");
                return;
            }
            
            // Get all requests where user is the requester
            PreparedStatement stmt = conn.prepareStatement(
                "SELECT r.requested_at, r.message, r.requester, r.requestee, r.chat_id, " +
                "requestee_user.email AS requestee_email " +
                "FROM requests r " +
                "LEFT JOIN users requestee_user ON r.requestee = requestee_user.id " +
                "WHERE r.requester = ? " +
                "ORDER BY r.requested_at DESC");
            stmt.setInt(1, userId);
            ResultSet rs = stmt.executeQuery();
            
            // Build JSON array of requests
            List<Map<String, Object>> requests = new ArrayList<>();
            while (rs.next()) {
                Map<String, Object> requestData = new HashMap<>();
                
                Timestamp requested_at = rs.getTimestamp("requested_at");
                if (requested_at != null) {
                    requestData.put("requested_at", requested_at.getTime());
                }
                
                requestData.put("message", rs.getString("message"));
                requestData.put("requester", rs.getInt("requester"));
                requestData.put("requestee", rs.getInt("requestee"));
                requestData.put("chat_id", rs.getInt("chat_id"));
                requestData.put("requestee_email", rs.getString("requestee_email"));
                
                requests.add(requestData);
            }
            
            response.setContentType("application/json");
            response.setCharacterEncoding("UTF-8");
            response.setStatus(HttpServletResponse.SC_OK);
            
            PrintWriter out = response.getWriter();
            out.print(gson.toJson(requests));
            out.flush();
        }, response);
    }
    
    /**
     * Get received requests - requests where the user is the requestee
     */
    private void getReceivedRequests(HttpServletRequest request, HttpServletResponse response) throws IOException {
        final String email = request.getParameter("email");
        final String sessionID = request.getParameter("session_id");
        
        if (email == null || sessionID == null) {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Email and session_id are required");
            return;
        }
        
        executeSQL(new SessionPair(email, sessionID), conn -> {
            int userId = getUserIdFromSession(email, sessionID, conn);
            if (userId == -1) {
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid session");
                return;
            }
            
            // Get all requests where user is the requestee
            PreparedStatement stmt = conn.prepareStatement(
                "SELECT r.requested_at, r.message, r.requester, r.requestee, r.chat_id, " +
                "requester_user.email AS requester_email " +
                "FROM requests r " +
                "LEFT JOIN users requester_user ON r.requester = requester_user.id " +
                "WHERE r.requestee = ? " +
                "ORDER BY r.requested_at DESC");
            stmt.setInt(1, userId);
            ResultSet rs = stmt.executeQuery();
            
            // Build JSON array of requests
            List<Map<String, Object>> requests = new ArrayList<>();
            while (rs.next()) {
                Map<String, Object> requestData = new HashMap<>();
                
                Timestamp requested_at = rs.getTimestamp("requested_at");
                if (requested_at != null) {
                    requestData.put("requested_at", requested_at.getTime());
                }
                
                requestData.put("message", rs.getString("message"));
                requestData.put("requester", rs.getInt("requester"));
                requestData.put("requestee", rs.getInt("requestee"));
                requestData.put("chat_id", rs.getInt("chat_id"));
                requestData.put("requester_email", rs.getString("requester_email"));
                
                requests.add(requestData);
            }
            
            response.setContentType("application/json");
            response.setCharacterEncoding("UTF-8");
            response.setStatus(HttpServletResponse.SC_OK);
            
            PrintWriter out = response.getWriter();
            out.print(gson.toJson(requests));
            out.flush();
        }, response);
    }
    
    /**
     * Accept request method - adds a row to the matches table
     * Requires: requester_id, requestee_id (the current user), and match_type
     */
    private void acceptRequest(HttpServletRequest request, HttpServletResponse response) throws IOException {
        final String email = request.getParameter("email");
        final String sessionID = request.getParameter("session_id");
        final String requesterIdStr = request.getParameter("requester_id");
        final String matchType = request.getParameter("match_type"); // 'D' for disciple, 'M' for mentor, 'A' for accountability
        
        if (email == null || sessionID == null || requesterIdStr == null || matchType == null) {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST, 
                "email, session_id, requester_id, and match_type are required");
            return;
        }
        
        if (matchType.length() != 1 || (!matchType.equals("D") && !matchType.equals("M") && !matchType.equals("A"))) {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST, 
                "match_type must be 'D' (disciple), 'M' (mentor), or 'A' (accountability)");
            return;
        }
        
        executeSQL(new SessionPair(email, sessionID), conn -> {
            int requesteeId = getUserIdFromSession(email, sessionID, conn);
            if (requesteeId == -1) {
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid session");
                return;
            }
            
            int requesterId;
            try {
                requesterId = Integer.parseInt(requesterIdStr);
            } catch (NumberFormatException e) {
                response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Invalid requester_id");
                return;
            }
            
            // Verify that a request exists between these users
            PreparedStatement checkRequestStmt = conn.prepareStatement(
                "SELECT COUNT(*) FROM requests WHERE requester = ? AND requestee = ?");
            checkRequestStmt.setInt(1, requesterId);
            checkRequestStmt.setInt(2, requesteeId);
            ResultSet rs = checkRequestStmt.executeQuery();
            
            if (!rs.next() || rs.getInt(1) == 0) {
                response.sendError(HttpServletResponse.SC_NOT_FOUND, 
                    "No request found between these users");
                return;
            }
            
            // Check if match already exists
            PreparedStatement checkMatchStmt = conn.prepareStatement(
                "SELECT COUNT(*) FROM matches WHERE " +
                "((user1 = ? AND user2 = ?) OR (user1 = ? AND user2 = ?)) AND type = ?");
            checkMatchStmt.setInt(1, requesterId);
            checkMatchStmt.setInt(2, requesteeId);
            checkMatchStmt.setInt(3, requesteeId);
            checkMatchStmt.setInt(4, requesterId);
            checkMatchStmt.setString(5, matchType);
            ResultSet matchRs = checkMatchStmt.executeQuery();
            
            if (matchRs.next() && matchRs.getInt(1) > 0) {
                response.sendError(HttpServletResponse.SC_CONFLICT, 
                    "Match already exists between these users with this type");
                return;
            }
            
            // Insert into matches table (user1 should be the smaller ID for consistency)
            int user1 = Math.min(requesterId, requesteeId);
            int user2 = Math.max(requesterId, requesteeId);
            
            PreparedStatement insertStmt = conn.prepareStatement(
                "INSERT INTO matches (user1, user2, type) VALUES (?, ?, ?)");
            insertStmt.setInt(1, user1);
            insertStmt.setInt(2, user2);
            insertStmt.setString(3, matchType);
            insertStmt.executeUpdate();
            
            response.setStatus(HttpServletResponse.SC_OK);
            response.setContentType("application/json");
            response.setCharacterEncoding("UTF-8");
            
            Map<String, Object> jsonResponse = new HashMap<>();
            jsonResponse.put("status", "success");
            jsonResponse.put("message", "Request accepted and match created successfully");
            jsonResponse.put("user1", user1);
            jsonResponse.put("user2", user2);
            jsonResponse.put("type", matchType);
            
            PrintWriter out = response.getWriter();
            out.print(gson.toJson(jsonResponse));
            out.flush();
        }, response);
    }
    
    /**
     * Create chat method - creates a chat and populates chat_participants table
     * Requires: participant_ids (comma-separated list of user IDs, including current user)
     */
    private void createChat(HttpServletRequest request, HttpServletResponse response) throws IOException {
        final String email = request.getParameter("email");
        final String sessionID = request.getParameter("session_id");
        final String participantIdsStr = request.getParameter("participant_ids");
        
        if (email == null || sessionID == null || participantIdsStr == null || participantIdsStr.isEmpty()) {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST, 
                "email, session_id, and participant_ids are required");
            return;
        }
        
        executeSQL(new SessionPair(email, sessionID), conn -> {
            int currentUserId = getUserIdFromSession(email, sessionID, conn);
            if (currentUserId == -1) {
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid session");
                return;
            }
            
            // Parse participant IDs
            String[] participantIdStrings = participantIdsStr.split(",");
            List<Integer> participantIds = new ArrayList<>();
            boolean currentUserIncluded = false;
            
            for (String idStr : participantIdStrings) {
                try {
                    int userId = Integer.parseInt(idStr.trim());
                    participantIds.add(userId);
                    if (userId == currentUserId) {
                        currentUserIncluded = true;
                    }
                } catch (NumberFormatException e) {
                    response.sendError(HttpServletResponse.SC_BAD_REQUEST, 
                        "Invalid participant_id: " + idStr);
                    return;
                }
            }
            
            // Ensure current user is included
            if (!currentUserIncluded) {
                participantIds.add(currentUserId);
            }
            
            // Remove duplicates
            participantIds = new ArrayList<>(new java.util.LinkedHashSet<>(participantIds));
            
            if (participantIds.size() < 2) {
                response.sendError(HttpServletResponse.SC_BAD_REQUEST, 
                    "At least 2 participants are required");
                return;
            }
            
            // Create the chat
            PreparedStatement insertChatStmt = conn.prepareStatement(
                "INSERT INTO chat (created_at) VALUES (CURRENT_TIMESTAMP)",
                PreparedStatement.RETURN_GENERATED_KEYS);
            insertChatStmt.executeUpdate();
            
            // Get the generated chat ID
            ResultSet chatRs = insertChatStmt.getGeneratedKeys();
            if (!chatRs.next()) {
                response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR, 
                    "Failed to create chat");
                return;
            }
            int chatId = chatRs.getInt(1);
            
            // Insert participants into chat_participants table
            PreparedStatement insertParticipantStmt = conn.prepareStatement(
                "INSERT INTO chat_participants (chat_id, user_id, last_read_message_id) VALUES (?, ?, 0)");
            
            for (int userId : participantIds) {
                insertParticipantStmt.setInt(1, chatId);
                insertParticipantStmt.setInt(2, userId);
                insertParticipantStmt.addBatch();
            }
            insertParticipantStmt.executeBatch();
            
            response.setStatus(HttpServletResponse.SC_OK);
            response.setContentType("application/json");
            response.setCharacterEncoding("UTF-8");
            
            Map<String, Object> jsonResponse = new HashMap<>();
            jsonResponse.put("status", "success");
            jsonResponse.put("message", "Chat created successfully");
            jsonResponse.put("chat_id", chatId);
            jsonResponse.put("participant_ids", participantIds);
            
            PrintWriter out = response.getWriter();
            out.print(gson.toJson(jsonResponse));
            out.flush();
        }, response);
    }
    
    /**
     * Send message method - inserts a message into the messages table
     * Throws exception if chat doesn't exist
     */
    private void sendMessage(HttpServletRequest request, HttpServletResponse response) throws IOException {
        final String email = request.getParameter("email");
        final String sessionID = request.getParameter("session_id");
        final String chatIdStr = request.getParameter("chat_id");
        final String message = request.getParameter("message");
        
        if (email == null || sessionID == null || chatIdStr == null || message == null || message.isEmpty()) {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST, 
                "email, session_id, chat_id, and message are required");
            return;
        }
        
        executeSQL(new SessionPair(email, sessionID), conn -> {
            int senderId = getUserIdFromSession(email, sessionID, conn);
            if (senderId == -1) {
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid session");
                return;
            }
            
            int chatId;
            try {
                chatId = Integer.parseInt(chatIdStr);
            } catch (NumberFormatException e) {
                response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Invalid chat_id");
                return;
            }
            
            // Check if chat exists
            PreparedStatement checkChatStmt = conn.prepareStatement(
                "SELECT COUNT(*) FROM chat WHERE id = ?");
            checkChatStmt.setInt(1, chatId);
            ResultSet chatRs = checkChatStmt.executeQuery();
            
            if (!chatRs.next() || chatRs.getInt(1) == 0) {
                response.sendError(HttpServletResponse.SC_NOT_FOUND, 
                    "Chat does not exist");
                return;
            }
            
            // Verify that the sender is a participant in the chat
            PreparedStatement checkParticipantStmt = conn.prepareStatement(
                "SELECT COUNT(*) FROM chat_participants WHERE chat_id = ? AND user_id = ?");
            checkParticipantStmt.setInt(1, chatId);
            checkParticipantStmt.setInt(2, senderId);
            ResultSet participantRs = checkParticipantStmt.executeQuery();
            
            if (!participantRs.next() || participantRs.getInt(1) == 0) {
                response.sendError(HttpServletResponse.SC_FORBIDDEN, 
                    "User is not a participant in this chat");
                return;
            }
            
            // Insert the message
            PreparedStatement insertMessageStmt = conn.prepareStatement(
                "INSERT INTO messages (chat_id, message, sender_id, sent_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)",
                PreparedStatement.RETURN_GENERATED_KEYS);
            insertMessageStmt.setInt(1, chatId);
            insertMessageStmt.setString(2, message);
            insertMessageStmt.setInt(3, senderId);
            insertMessageStmt.executeUpdate();
            
            // Get the generated message ID
            ResultSet messageRs = insertMessageStmt.getGeneratedKeys();
            int messageId = -1;
            if (messageRs.next()) {
                messageId = messageRs.getInt(1);
            }
            
            response.setStatus(HttpServletResponse.SC_OK);
            response.setContentType("application/json");
            response.setCharacterEncoding("UTF-8");
            
            Map<String, Object> jsonResponse = new HashMap<>();
            jsonResponse.put("status", "success");
            jsonResponse.put("message", "Message sent successfully");
            jsonResponse.put("message_id", messageId);
            jsonResponse.put("chat_id", chatId);
            
            PrintWriter out = response.getWriter();
            out.print(gson.toJson(jsonResponse));
            out.flush();
        }, response);
    }
    
    /**
     * Get chat messages method - gets the last 10 messages for each chat the user is in
     * Also returns last_read_message_id from chat_participants table
     */
    private void getChatMessages(HttpServletRequest request, HttpServletResponse response) throws IOException {
        final String email = request.getParameter("email");
        final String sessionID = request.getParameter("session_id");
        
        if (email == null || sessionID == null) {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Email and session_id are required");
            return;
        }
        
        executeSQL(new SessionPair(email, sessionID), conn -> {
            int userId = getUserIdFromSession(email, sessionID, conn);
            if (userId == -1) {
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid session");
                return;
            }
            
            // Get all chats the user is a participant in, along with last_read_message_id
            PreparedStatement chatStmt = conn.prepareStatement(
                "SELECT cp.chat_id, cp.last_read_message_id, c.created_at " +
                "FROM chat_participants cp " +
                "JOIN chat c ON cp.chat_id = c.id " +
                "WHERE cp.user_id = ? " +
                "ORDER BY c.created_at DESC");
            chatStmt.setInt(1, userId);
            ResultSet chatRs = chatStmt.executeQuery();
            
            List<Map<String, Object>> chatsWithMessages = new ArrayList<>();
            
            while (chatRs.next()) {
                int chatId = chatRs.getInt("chat_id");
                int lastReadMessageId = chatRs.getInt("last_read_message_id");
                Timestamp chatCreatedAt = chatRs.getTimestamp("created_at");
                
                // Get last 10 messages for this chat
                PreparedStatement messageStmt = conn.prepareStatement(
                    "SELECT m.id, m.message, m.sent_at, m.sender_id, u.email AS sender_email " +
                    "FROM messages m " +
                    "JOIN users u ON m.sender_id = u.id " +
                    "WHERE m.chat_id = ? " +
                    "ORDER BY m.sent_at DESC " +
                    "LIMIT 10");
                messageStmt.setInt(1, chatId);
                ResultSet messageRs = messageStmt.executeQuery();
                
                // Build list of messages (in reverse order to show oldest first)
                List<Map<String, Object>> messages = new ArrayList<>();
                while (messageRs.next()) {
                    Map<String, Object> message = new HashMap<>();
                    message.put("id", messageRs.getInt("id"));
                    message.put("message", messageRs.getString("message"));
                    
                    Timestamp sentAt = messageRs.getTimestamp("sent_at");
                    if (sentAt != null) {
                        message.put("sent_at", sentAt.getTime());
                    }
                    
                    message.put("sender_id", messageRs.getInt("sender_id"));
                    message.put("sender_email", messageRs.getString("sender_email"));
                    messages.add(0, message); // Add to beginning to reverse order
                }
                
                // Build chat object
                Map<String, Object> chatData = new HashMap<>();
                chatData.put("chat_id", chatId);
                chatData.put("last_read_message_id", lastReadMessageId);
                
                if (chatCreatedAt != null) {
                    chatData.put("created_at", chatCreatedAt.getTime());
                }
                
                chatData.put("messages", messages);
                chatsWithMessages.add(chatData);
            }
            
            response.setContentType("application/json");
            response.setCharacterEncoding("UTF-8");
            response.setStatus(HttpServletResponse.SC_OK);
            
            PrintWriter out = response.getWriter();
            out.print(gson.toJson(chatsWithMessages));
            out.flush();
        }, response);
    }
}

