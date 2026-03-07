package com.bzdata.TataFneBackend.factureFromFne;

public interface FneAuthService {
    FneAuthTokenEntity loginAndStoreToken(FneLoginRequest req);

    String resolveValidToken(String username);

    String refreshToken(String username);
}
