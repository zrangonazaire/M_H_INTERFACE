package com.bzdata.TataFneBackend.user;

import lombok.Data;
import java.time.LocalDate;
import java.util.List;

@Data
public class UserDTO {
    private Integer id;
    private String firstname;
    private String lastname;
    private String email;
    private LocalDate dateOfBirth;
    private String agence;
    private String imageUrl;
    private boolean accountLocked;
    private boolean enabled;
    private List<String> roles;
    private String createdDate;
    private String lastModifiedDate;
}