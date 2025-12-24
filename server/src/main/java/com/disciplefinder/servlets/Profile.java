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
  private final String requirements;
  private final String goals;
  private final String experience;
  private final Timestamp created_at;
  private final Boolean finding_discipler;
  private final Boolean finding_disciple;
  private final Boolean finding_accountability;

  private Profile(Builder builder) {
    this.id = builder.id;
    this.email = builder.email;
    this.dob = builder.dob;
    this.church = builder.church;
    this.gender = builder.gender;
    this.requirements = builder.requirements;
    this.goals = builder.goals;
    this.experience = builder.experience;
    this.created_at = builder.created_at;
    this.finding_discipler = builder.finding_discipler;
    this.finding_disciple = builder.finding_disciple;
    this.finding_accountability = builder.finding_accountability;
  }

  // Getters for required fields
  public Integer getId() {
    return id;
  }

  public String getEmail() {
    return email;
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

  public Optional<String> getRequirements() {
    return Optional.ofNullable(requirements);
  }

  public Optional<String> getGoals() {
    return Optional.ofNullable(goals);
  }

  public Optional<String> getExperience() {
    return Optional.ofNullable(experience);
  }

  public Optional<Timestamp> getCreated_at() {
    return Optional.ofNullable(created_at);
  }

  public Optional<Boolean> getFinding_discipler() {
    return Optional.ofNullable(finding_discipler);
  }

  public Optional<Boolean> getFinding_disciple() {
    return Optional.ofNullable(finding_disciple);
  }

  public Optional<Boolean> getFinding_accountability() {
    return Optional.ofNullable(finding_accountability);
  }

  public static class Builder {
    // Required fields
    private Integer id;
    private String email;

    // Optional fields
    private Date dob;
    private String church;
    private String gender;
    private String requirements;
    private String goals;
    private String experience;
    private Timestamp created_at;
    private Boolean finding_discipler;
    private Boolean finding_disciple;
    private Boolean finding_accountability;

    public Builder id(Integer id) {
      this.id = id;
      return this;
    }

    public Builder email(String email) {
      this.email = email;
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

    public Builder requirements(String requirements) {
      this.requirements = requirements;
      return this;
    }

    public Builder goals(String goals) {
      this.goals = goals;
      return this;
    }

    public Builder experience(String experience) {
      this.experience = experience;
      return this;
    }

    // Optional field setters
    public Builder created_at(Timestamp created_at) {
      this.created_at = created_at;
      return this;
    }

    public Builder finding_discipler(Boolean finding_discipler) {
      this.finding_discipler = finding_discipler;
      return this;
    }

    public Builder finding_disciple(Boolean finding_disciple) {
      this.finding_disciple = finding_disciple;
      return this;
    }

    public Builder finding_accountability(Boolean finding_accountability) {
      this.finding_accountability = finding_accountability;
      return this;
    }

    public Profile build() {
      if (id == null || email == null) {
        throw new IllegalStateException("id and email are required fields");
      }
      return new Profile(this);
    }
  }
}

