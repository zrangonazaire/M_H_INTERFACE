# Image Java légère
FROM eclipse-temurin:17-jre

# Dossier de travail
WORKDIR /app

# Copier le jar
COPY target/*.jar app.jar

# Port interne Spring Boot
EXPOSE 8089

# Lancer l'application
ENTRYPOINT ["java","-jar","app.jar"]
