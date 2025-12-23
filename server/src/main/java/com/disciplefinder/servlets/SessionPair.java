package com.disciplefinder.servlets;

public class SessionPair {
    public String email;
    public String sessionID;
    
    public SessionPair(String email, String sessionID) {
        this.email = email;
        this.sessionID = sessionID;
    }
}

