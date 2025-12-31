package com.disciplefinder.servlets;

import jakarta.mail.*;
import jakarta.mail.internet.*;
import java.util.Properties;

public class EmailUtils {

  public static void send(
      String host,
      int port,
      final String username,
      final String password,
      String to,
      String subject,
      String body
  ) throws MessagingException {

    Properties props = new Properties();
    props.put("mail.smtp.auth", "true");
    props.put("mail.smtp.starttls.enable", "true");
    props.put("mail.smtp.host", host);
    props.put("mail.smtp.port", String.valueOf(port));

    Session session = Session.getInstance(props, new Authenticator() {
      protected PasswordAuthentication getPasswordAuthentication() {
        return new PasswordAuthentication(username, password);
      }
    });

    Message msg = new MimeMessage(session);
    msg.setFrom(new InternetAddress(username));
    msg.setRecipients(Message.RecipientType.TO, InternetAddress.parse(to));
    msg.setSubject(subject);
    msg.setText(body);

    Transport.send(msg);
  }
}