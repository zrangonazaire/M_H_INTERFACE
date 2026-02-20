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
        http.cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(req -> req
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        .requestMatchers("/api/v1/auth/**", "/auth/**").permitAll()

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
                                "/actuator")
                        .permitAll()

                        .requestMatchers(
                                "/auth/register",
                                "/auth/authenticate",
                                "/auth/activate-account",
                                "/auth/forgot-password",
                                "/auth/change-password",
                                "/auth/reset-password")
                        .permitAll()

                        .requestMatchers(
                                "/roles/**",
                                "/attributions/**",
                                "/functionality/**",
                                "/role-functionalities/**")
                        .permitAll()

                        .requestMatchers("/fne/**").permitAll()

                        .requestMatchers(
                                "/new-invoices/**",
                                "/invoices/**")
                        .permitAll()

                        .requestMatchers("/societes/**").permitAll()
                        .requestMatchers("/sync/**").permitAll()

                        .requestMatchers(
                                "/etablissements/**",
                                "/departments/**",
                                "/services/**",
                                "/users/**")
                        .permitAll()

                        .anyRequest().authenticated())
                .sessionManagement(session -> session.sessionCreationPolicy(STATELESS))
                .authenticationProvider(authenticationProvider)
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        configuration.setAllowedOriginPatterns(Arrays.asList(
                "http://57.129.119.224:*",
                "https://57.129.119.224:*",
                "http://51.75.69.139:*",
                "https://51.75.69.139:*",
                "http://norma-factfne.com",
                "https://norma-factfne.com",
                "http://www.norma-factfne.com",
                "https://www.norma-factfne.com",
                "http://*.norma-factfne.com",
                "https://*.norma-factfne.com",
                "http://localhost:*",
                "https://localhost:*",
                "http://127.0.0.1:*",
                "https://127.0.0.1:*",
                "http://[::1]:*",
                "https://[::1]:*"));

        configuration.setAllowedMethods(Arrays.asList(
                "OPTIONS",
                "GET",
                "POST",
                "PUT",
                "DELETE",
                "PATCH",
                "HEAD"));

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
                "Pragma"));

        configuration.setExposedHeaders(Arrays.asList(
                "Authorization",
                "Content-Type",
                "Access-Control-Allow-Origin",
                "Access-Control-Allow-Credentials",
                "Content-Disposition"));

        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
