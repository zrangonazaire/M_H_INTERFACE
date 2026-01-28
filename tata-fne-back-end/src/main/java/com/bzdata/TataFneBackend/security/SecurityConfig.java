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
import java.util.List;

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
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(AbstractHttpConfigurer::disable)
            
            .headers(headers -> headers
                .frameOptions(HeadersConfigurer.FrameOptionsConfig::sameOrigin)
                .contentSecurityPolicy(csp -> csp.policyDirectives(
                    "default-src 'self'; " +
                    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
                    "style-src 'self' 'unsafe-inline'; " +
                    "img-src 'self' data:;"
                ))
            )
            
            .authorizeHttpRequests(req -> req
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
                    "/auth/activate-account"
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
        
        // 🔥 ORIGINES AUTORISÉES
        configuration.setAllowedOrigins(Arrays.asList(
            "http://57.129.119.224",
            "http://57.129.119.224:80",
            "http://57.129.119.224:8089",
            "http://57.129.119.224:4200",
            "http://localhost",
            "http://localhost:80",
            "http://localhost:4200",
            "http://localhost:8080",
            "http://localhost:8089",
            "http://127.0.0.1:4200",
            "http://127.0.0.1:8080",
            "http://127.0.0.1:8089"
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