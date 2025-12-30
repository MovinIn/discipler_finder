package com.disciplefinder.servlets;

import java.sql.Date;
import java.sql.Timestamp;
import java.util.Optional;

public class Profile {
  // Required fields
  private final Integer id;
  private final String email;

  // Optional fields
  private final Date dob;
  private final String church;
  private final String gender;
  private final String name;
  private final Timestamp created_at;

  private Profile(Builder builder) {
    this.id = builder.id;
    this.email = builder.email;
    this.dob = builder.dob;
    this.church = builder.church;
    this.gender = builder.gender;
    this.created_at = builder.created_at;
    this.name = builder.name;
  }

  // Getters for required fields
  public Integer getId() {
    return id;
  }

  public String getEmail() {
    return email;
  }

  public String getName() {
    return name;
  }

  // Optional field getters using Java 8 Optional
  public Optional<Date> getDob() {
    return Optional.ofNullable(dob);
  }

  public Optional<String> getChurch() {
    return Optional.ofNullable(church);
  }

  public Optional<String> getGender() {
    return Optional.ofNullable(gender);
  }

  public Optional<Timestamp> getCreated_at() {
    return Optional.ofNullable(created_at);
  }

  public static class Builder {
    // Required fields
    private Integer id;
    private String email;
    private String name;
    // Optional fields
    private Date dob;
    private String church;
    private String gender;
    private Timestamp created_at;

    public Builder id(Integer id) {
      this.id = id;
      return this;
    }

    public Builder email(String email) {
      this.email = email;
      return this;
    }

    public Builder name(String name) {
      this.name = name;
      return this;
    }

    public Builder dob(Date dob) {
      this.dob = dob;
      return this;
    }

    public Builder church(String church) {
      this.church = church;
      return this;
    }

    public Builder gender(String gender) {
      this.gender = gender;
      return this;
    }

    public Builder created_at(Timestamp created_at) {
      this.created_at = created_at;
      return this;
    }

    public Profile build() {
      if (id == null || email == null || name == null) {
        throw new IllegalStateException("id, email, and name are required fields");
      }
      return new Profile(this);
    }
  }
}

