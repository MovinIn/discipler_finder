package com.disciplefinder.servlets;

import at.favre.lib.crypto.bcrypt.BCrypt;
import com.google.gson.Gson;
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import jakarta.mail.*;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
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
import java.util.HashMap;
import java.util.Map;
import java.util.Properties;
import java.util.Random;

@WebServlet(name = "ResetPasswordServlet", urlPatterns = {"/reset-password"})
public class ResetPasswordServlet extends HttpServlet {
    
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
            ds.close();
        }
    }
    
    private Connection getConnection() throws SQLException {
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
    
    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        
        setCorsHeaders(response);
        
        String action = request.getParameter("action");
        if (action == null) {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Missing action parameter");
            return;
        }
        
        switch (action) {
            case "request" -> requestPasswordReset(request, response);
            case "reset" -> resetPassword(request, response);
            default -> {
                response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Unknown action: " + action);
            }
        }
    }
    
    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        // Same as GET
        doGet(request, response);
    }
    
    @Override
    protected void doOptions(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        setCorsHeaders(response);
        response.setStatus(HttpServletResponse.SC_OK);
    }
    
    /**
     * Request password reset - generates reset code and sends email
     */
    private void requestPasswordReset(HttpServletRequest request, HttpServletResponse response) throws IOException {
        String email = request.getParameter("email");
        
        if (email == null || email.isEmpty()) {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Email is required");
            return;
        }
        
        try (Connection conn = getConnection()) {
            // Check if user exists
            PreparedStatement checkStmt = conn.prepareStatement(
                "SELECT id FROM users WHERE email = ?");
            checkStmt.setString(1, email);
            ResultSet rs = checkStmt.executeQuery();
            
            if (!rs.next()) {
                // Don't reveal if email exists or not for security
                response.setContentType("application/json");
                response.setCharacterEncoding("UTF-8");
                response.setStatus(HttpServletResponse.SC_OK);
                
                Map<String, Object> jsonResponse = new HashMap<>();
                jsonResponse.put("status", "success");
                jsonResponse.put("message", "If the email exists, a password reset code has been sent");
                
                PrintWriter out = response.getWriter();
                out.print(gson.toJson(jsonResponse));
                out.flush();
                return;
            }
            
            int userId = rs.getInt("id");
            
            // Generate reset code (15 characters) and insert into codes table
            String resetCode = getRandomAlphanumeric(15);
            // Reset codes expire in 1 hour
            PreparedStatement codeStmt = conn.prepareStatement(
                "INSERT INTO codes (user_id, code, code_type, expires_at) " +
                "VALUES (?, ?, 'reset', DATE_ADD(NOW(), INTERVAL 1 HOUR))");
            codeStmt.setInt(1, userId);
            codeStmt.setString(2, resetCode);
            codeStmt.executeUpdate();
            
            // Send reset email
            try {
                sendPasswordResetEmail(email, resetCode);
            } catch (Exception e) {
                System.err.println("Failed to send password reset email to " + email + ": " + e.getMessage());
            }
            
            response.setContentType("application/json");
            response.setCharacterEncoding("UTF-8");
            response.setStatus(HttpServletResponse.SC_OK);
            
            Map<String, Object> jsonResponse = new HashMap<>();
            jsonResponse.put("status", "success");
            jsonResponse.put("message", "If the email exists, a password reset code has been sent");
            
            PrintWriter out = response.getWriter();
            out.print(gson.toJson(jsonResponse));
            out.flush();
            
        } catch (SQLException e) {
            response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "Database error");
        }
    }
    
    /**
     * Reset password - verifies reset code and updates password
     */
    private void resetPassword(HttpServletRequest request, HttpServletResponse response) throws IOException {
        String email = request.getParameter("email");
        String resetCode = request.getParameter("reset_code");
        String newPassword = request.getParameter("new_password");
        
        if (email == null || resetCode == null || newPassword == null || 
            email.isEmpty() || resetCode.isEmpty() || newPassword.isEmpty()) {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST, 
                "Email, reset_code, and new_password are required");
            return;
        }
        
        if (newPassword.length() < 4) {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST, 
                "Password must be at least 4 characters");
            return;
        }
        
        try (Connection conn = getConnection()) {
            // Get user ID from email
            PreparedStatement userStmt = conn.prepareStatement(
                "SELECT id FROM users WHERE email = ?");
            userStmt.setString(1, email);
            ResultSet userRs = userStmt.executeQuery();
            
            if (!userRs.next()) {
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, 
                    "Invalid email or reset code");
                return;
            }
            
            int userId = userRs.getInt("id");
            
            // Check if reset code exists, is not expired, and not used
            PreparedStatement codeStmt = conn.prepareStatement(
                "SELECT id FROM codes WHERE user_id = ? AND code = ? AND code_type = 'reset' " +
                "AND expires_at > NOW() AND used = 0");
            codeStmt.setInt(1, userId);
            codeStmt.setString(2, resetCode);
            ResultSet codeRs = codeStmt.executeQuery();
            
            if (!codeRs.next()) {
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, 
                    "Invalid or expired reset code");
                return;
            }
            
            int codeId = codeRs.getInt("id");
            
            // Hash new password
            byte[] salt = new byte[16];
            new java.security.SecureRandom().nextBytes(salt);
            byte[] hashedPassword = BCrypt.withDefaults().hash(12, salt, newPassword.getBytes());
            
            // Update password
            PreparedStatement updateStmt = conn.prepareStatement(
                "UPDATE users SET password = ? WHERE id = ?");
            updateStmt.setBytes(1, hashedPassword);
            updateStmt.setInt(2, userId);
            int rowsUpdated = updateStmt.executeUpdate();
            
            if (rowsUpdated == 0) {
                response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR, 
                    "Failed to reset password");
                return;
            }
            
            // Mark code as used
            PreparedStatement markUsedStmt = conn.prepareStatement(
                "UPDATE codes SET used = 1 WHERE id = ?");
            markUsedStmt.setInt(1, codeId);
            markUsedStmt.executeUpdate();
            
            response.setContentType("application/json");
            response.setCharacterEncoding("UTF-8");
            response.setStatus(HttpServletResponse.SC_OK);
            
            Map<String, Object> jsonResponse = new HashMap<>();
            jsonResponse.put("status", "success");
            jsonResponse.put("message", "Password reset successfully");
            
            PrintWriter out = response.getWriter();
            out.print(gson.toJson(jsonResponse));
            out.flush();
            
        } catch (SQLException e) {
            response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "Database error");
        }
    }
    
    /**
     * Send password reset email
     */
    private void sendPasswordResetEmail(String toEmail, String resetCode) throws MessagingException {
        // Get email configuration from properties file
        Properties emailProps = new Properties();
        try (InputStream input = getClass().getClassLoader().getResourceAsStream(propertiesFile)) {
            if (input != null) {
                emailProps.load(input);
            }
        } catch (IOException e) {
            throw new MessagingException("Failed to load email properties", e);
        }
        
        // Default SMTP configuration
        String smtpHost = emailProps.getProperty("smtp.host", "smtp.gmail.com");
        String smtpPort = emailProps.getProperty("smtp.port", "587");
        String smtpUser = emailProps.getProperty("smtp.user", "");
        String smtpPassword = emailProps.getProperty("smtp.password", "");
        String fromEmail = emailProps.getProperty("smtp.from", smtpUser);
        String baseUrl = emailProps.getProperty("app.base_url", "http://localhost:8080");
        
        // If SMTP credentials are not configured, skip sending email
        if (smtpUser.isEmpty() || smtpPassword.isEmpty()) {
            System.out.println("SMTP not configured, skipping email send to " + toEmail);
            System.out.println("Reset code for " + toEmail + ": " + resetCode);
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
        message.setSubject("Password Reset - Discipler Finder");
        
        String emailBody = "You have requested to reset your password for Discipler Finder.\n\n" +
                          "Your reset code is: " + resetCode + "\n\n" +
                          "To reset your password, use this code with the reset password endpoint.\n\n" +
                          "If you did not request this password reset, please ignore this email.\n\n" +
                          "This code will expire after you use it to reset your password.";
        
        message.setText(emailBody);
        
        // Send message
        Transport.send(message);
    }
    
    private void setCorsHeaders(HttpServletResponse response) {
        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
        response.setHeader("Access-Control-Max-Age", "3600");
    }
}

