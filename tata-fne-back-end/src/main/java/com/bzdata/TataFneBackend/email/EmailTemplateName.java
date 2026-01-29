package com.bzdata.TataFneBackend.email;

import lombok.Getter;

@Getter
public enum EmailTemplateName {

    ACTIVATE_ACCOUNT("activate_account"),
    FORGOT_PASSWORD("forgot_password")
    ;


    private final String name;
    EmailTemplateName(String name) {
        this.name = name;
    }
}