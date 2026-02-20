package com.bzdata.TataFneBackend;

import com.bzdata.TataFneBackend.Property.FneProperties;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableAsync;

import com.bzdata.TataFneBackend.role.Role;
import com.bzdata.TataFneBackend.role.RoleRepository;

import lombok.extern.slf4j.Slf4j;

@EnableJpaAuditing(auditorAwareRef = "auditorAware")
@EnableAsync
@SpringBootApplication
@Slf4j
public class TataFneBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(TataFneBackendApplication.class, args);
	}
    @Bean
    public CommandLineRunner runner(RoleRepository roleRepository, FneProperties fneProperties) {
        return args -> {
            log.info("fne.base-url: {}", fneProperties.getBaseUrl());
            if (roleRepository.findByName("USER").isEmpty()) {
                roleRepository.save(Role.builder().name("USER").code("USER").build());
            }
        };
    }

}
