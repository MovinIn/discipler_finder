FROM tomcat:jre25-temurin-noble
LABEL authors="Joseph"
COPY target/discipler-finder-server-1.0.0.war /usr/local/tomcat/webapps/ROOT.war

EXPOSE 8080
CMD ["catalina.sh", "run"]