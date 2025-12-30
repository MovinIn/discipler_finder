package com.disciplefinder.servlets;

public class ChatMessage {
  private final Integer id;
  private final boolean isMessage;
  private final String content;

  private ChatMessage(Builder builder) {
    this.id = builder.id;
    this.isMessage = builder.isMessage;
    this.content = builder.content;
  }

  public int getID() {
    return id;
  }

  public boolean isMessage() {
    return isMessage;
  }

  public String getContent() {
    return content;
  }

  public static class Builder {
    private int id;
    private boolean isMessage;
    private String content;

    public Builder id(int id) {
      this.id = id;
      return this;
    }

    public Builder isMessage(boolean isMessage) {
      this.isMessage = isMessage;
      return this;
    }
  
    public Builder content(String content) {
      this.content = content;
      return this;
    }
  
    public ChatMessage build() {
      return new ChatMessage(this);
    }
  }
}
