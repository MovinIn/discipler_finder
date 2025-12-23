package com.disciplefinder.servlets;

import com.google.gson.Gson;
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
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

@WebServlet(name = "ActivationServlet", urlPatterns = {"/activate"})
public class ActivationServlet extends HttpServlet {
    
    private static final Gson gson = new Gson();
    private static HikariDataSource ds;
    private static final String propertiesFile = "vm.properties";
    
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
    
    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        
        setCorsHeaders(response);
        
        String email = request.getParameter("email");
        String activationCode = request.getParameter("activation_code");
        
        if (email == null || activationCode == null || email.isEmpty() || activationCode.isEmpty()) {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST, 
                "Email and activation_code are required");
            return;
        }
        
        try (Connection conn = getConnection()) {
            // Get user ID from email
            PreparedStatement userStmt = conn.prepareStatement(
                "SELECT id, activate FROM users WHERE email = ?");
            userStmt.setString(1, email);
            ResultSet userRs = userStmt.executeQuery();
            
            if (!userRs.next()) {
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, 
                    "Invalid email or activation code");
                return;
            }
            
            int userId = userRs.getInt("id");
            boolean isActivated = userRs.getBoolean("activate");
            
            // Check if already activated
            if (isActivated) {
                response.setContentType("application/json");
                response.setCharacterEncoding("UTF-8");
                response.setStatus(HttpServletResponse.SC_OK);
                
                Map<String, Object> jsonResponse = new HashMap<>();
                jsonResponse.put("status", "success");
                jsonResponse.put("message", "Account is already activated");
                
                PrintWriter out = response.getWriter();
                out.print(gson.toJson(jsonResponse));
                out.flush();
                return;
            }
            
            // Check if activation code exists, is not expired, and not used
            PreparedStatement codeStmt = conn.prepareStatement(
                "SELECT id FROM codes WHERE user_id = ? AND code = ? AND code_type = 'activation' " +
                "AND expires_at > NOW() AND used = 0");
            codeStmt.setInt(1, userId);
            codeStmt.setString(2, activationCode);
            ResultSet codeRs = codeStmt.executeQuery();
            
            if (!codeRs.next()) {
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, 
                    "Invalid or expired activation code");
                return;
            }
            
            // Mark code as used
            PreparedStatement markUsedStmt = conn.prepareStatement(
                "UPDATE codes SET used = 1 WHERE id = ?");
            markUsedStmt.setInt(1, codeRs.getInt("id"));
            markUsedStmt.executeUpdate();
            
            // Activate the account
            PreparedStatement updateStmt = conn.prepareStatement(
                "UPDATE users SET activate = 1 WHERE id = ?");
            updateStmt.setInt(1, userId);
            int rowsUpdated = updateStmt.executeUpdate();
            
            if (rowsUpdated == 0) {
                response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR, 
                    "Failed to activate account");
                return;
            }
            
            response.setContentType("application/json");
            response.setCharacterEncoding("UTF-8");
            response.setStatus(HttpServletResponse.SC_OK);
            
            Map<String, Object> jsonResponse = new HashMap<>();
            jsonResponse.put("status", "success");
            jsonResponse.put("message", "Account activated successfully");
            
            PrintWriter out = response.getWriter();
            out.print(gson.toJson(jsonResponse));
            out.flush();
            
        } catch (SQLException e) {
            response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "Database error");
        }
    }
    
    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        // Same as GET for activation
        doGet(request, response);
    }
    
    @Override
    protected void doOptions(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        setCorsHeaders(response);
        response.setStatus(HttpServletResponse.SC_OK);
    }
    
    private void setCorsHeaders(HttpServletResponse response) {
        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
        response.setHeader("Access-Control-Max-Age", "3600");
    }
}

