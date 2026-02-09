package com.bzdata.TataFneBackend.security;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.annotation.web.configurers.HeadersConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import static org.springframework.security.config.http.SessionCreationPolicy.STATELESS;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
@EnableMethodSecurity(securedEnabled = true)
public class SecurityConfig {

    private final JwtFilter jwtAuthFilter;
    private final AuthenticationProvider authenticationProvider;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
           http .cors(cors -> cors.configurationSource(corsConfigurationSource()))
        .csrf(AbstractHttpConfigurer::disable) .authorizeHttpRequests(req -> req
                // 🔥 AUTORISER OPTIONS POUR TOUS (CORS PREFLIGHT)
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                
                // 🔓 ENDPOINTS D'AUTHENTIFICATION
                .requestMatchers("/api/v1/auth/**").permitAll()
                
                // 🔓 SWAGGER / OPENAPI
                .requestMatchers(
                    "/swagger-ui.html",
                    "/swagger-ui/**",
                    "/swagger-ui/index.html",
                    "/v2/api-docs",
                    "/v3/api-docs",
                    "/v3/api-docs/**",
                    "/swagger-resources",
                    "/swagger-resources/**",
                    "/configuration/ui",
                    "/configuration/security",
                    "/webjars/**",
                    "/actuator/**",
                    "/actuator"
                ).permitAll()
                
                // 🔓 ENDPOINTS PUBLIC DE VOTRE FICHIER
                .requestMatchers(
                    "/auth/register",
                    "/auth/authenticate",
                    "/auth/activate-account",
                    "/auth/forgot-password",
                    "/auth/change-password",
                    "/auth/reset-password"
                ).permitAll()
                
                // 🔓 ENDPOINTS ROLES ET PERMISSIONS
                .requestMatchers(
                    "/roles/**",
                    "/attributions/**",
                    "/functionality/**",
                    "/role-functionalities/**"
                ).permitAll()
                
                // 🔓 ENDPOINTS FNE
                .requestMatchers("/fne/**").permitAll()
                
                // 🔓 ENDPOINTS FACTURES
                .requestMatchers(
                    "/new-invoices/**",
                    "/invoices/**"
                ).permitAll()
                
                // 🔓 ENDPOINTS SOCIÉTÉS
                .requestMatchers("/societes/**").permitAll()
                
                // 🔓 ENDPOINTS SYNCHRONISATION
                .requestMatchers("/sync/**").permitAll()
                
                // 🔓 ENDPOINTS STRUCTURE
                .requestMatchers(
                    "/etablissements/**",
                    "/departments/**",
                    "/services/**"
                        ,"/users/**"
                ).permitAll()
                
                // 🔐 TOUS LES AUTRES ENDPOINTS NÉCESSITENT UNE AUTHENTIFICATION
                .anyRequest().authenticated()
            )
            
            .sessionManagement(session -> session.sessionCreationPolicy(STATELESS))
            .authenticationProvider(authenticationProvider)
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
@Bean
public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration configuration = new CorsConfiguration();
    
    // 🔥 ORIGINES AUTORISÉES - Ajoutez toutes ces combinaisons
    configuration.setAllowedOrigins(Arrays.asList(
        // Adresses de production
        "http://57.129.119.224",
        "http://57.129.119.224:80",
        "http://57.129.119.224:8089",
        "http://57.129.119.224:4200",
        "http://51.75.69.139:8089",
        "http://51.75.69.139:80",
        "http://51.75.69.139",
        
        
        // localhost
        "http://localhost",
        "http://localhost:80",
        "http://localhost:4200",
        "http://localhost:8080",
        "http://localhost:8089",
        "http://norma-factfne.com",

        // 127.0.0.1
        "http://127.0.0.1",
        "http://127.0.0.1:80",
        "http://127.0.0.1:4200",  // Vous avez celui-ci
        "http://127.0.0.1:8080",
        "http://127.0.0.1:8089",
        
        // IPv6 localhost
        "http://[::1]",
        "http://[::1]:4200",
        "http://[::1]:8080",
        "http://[::1]:8089",
        
        // Adresse réseau locale (si vous y accédez par IP)
        "http://192.168.1.*", // Remplacez * par vos adresses réseau
        "http://0.0.0.0:4200"
    ));
    
    // 🔥 MÉTHODES HTTP AUTORISÉES
    configuration.setAllowedMethods(Arrays.asList(
        "OPTIONS",
        "GET",
        "POST",
        "PUT",
        "DELETE",
        "PATCH",
        "HEAD"
    ));
    
    // 🔥 HEADERS AUTORISÉS
    configuration.setAllowedHeaders(Arrays.asList(
        "Authorization",
        "Content-Type",
        "Accept",
        "Origin",
        "X-Requested-With",
        "X-XSRF-TOKEN",
        "X-CSRF-TOKEN",
        "Access-Control-Request-Method",
        "Access-Control-Request-Headers",
        "Cache-Control",
        "Pragma"
    ));
    
    // 🔥 HEADERS EXPOSÉS AU FRONTEND
    configuration.setExposedHeaders(Arrays.asList(
        "Authorization",
        "Content-Type",
        "Access-Control-Allow-Origin",
        "Access-Control-Allow-Credentials",
        "Content-Disposition"
    ));
    
    // 🔥 AUTORISER LES CREDENTIALS (COOKIES, SESSIONS)
    configuration.setAllowCredentials(true);
    
    // 🔥 TEMPS DE CACHE PREFILGHT (1 HEURE)
    configuration.setMaxAge(3600L);
    
    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", configuration);
    
    return source;
}

}