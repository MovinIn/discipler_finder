package com.disciplefinder.servlets;

import com.google.gson.Gson;

import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.PrintWriter;

public class JsonResponseUtils {
  private static final Gson gson = new Gson();
  private JsonResponseUtils() {
    throw new IllegalStateException("Utility class");
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
}
