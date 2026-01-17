package com.bzdata.TataFneBackend.Funtionality;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import com.bzdata.TataFneBackend.attributionDroit.Attribution;
import com.bzdata.TataFneBackend.rolefunctionality.RoleFunctionality;

import java.time.LocalDateTime;
import java.util.Set;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@EntityListeners(AuditingEntityListener.class)
public class Functionality {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int idFunctionality;
    @Column(unique = true, nullable = false)
    private String codeFunctionality;
    private String nameFunctionality;
    private String descriptionFunctionality;
    @OneToMany(mappedBy = "functionality")
    private Set<Attribution> attributions;
    @OneToMany(mappedBy = "functionality")
    private Set<RoleFunctionality> roles;
    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdDate;

    @LastModifiedDate
    @Column
    private LocalDateTime lastModifiedDate;

}
