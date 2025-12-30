package com.disciplefinder.servlets;

import java.util.Random;

public class GenerateCodeUtils {
  private GenerateCodeUtils() {
    throw new IllegalStateException("Utility class");
  }

  private static final String ALPHANUMERIC = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  public static String generateCode(int length) {
    StringBuilder sb = new StringBuilder(length);
    Random rnd = new Random();
    for (int i = 0; i < length; i++) {
      sb.append(ALPHANUMERIC.charAt(rnd.nextInt(ALPHANUMERIC.length())));
    }
    return sb.toString();
  }
}
