package com.bzdata.TataFneBackend.user;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;

    @Override
    public List<UserDTO> getAllUsers() {
        List<User> users = userRepository.findAll();
        return userMapper.toDTOList(users);
    }

    @Override
    public UserDTO getUserById(Integer id) {
        Optional<User> userOptional = userRepository.findById(id);
        if (userOptional.isPresent()) {
            return userMapper.toDTO(userOptional.get());
        }
        throw new RuntimeException("User not found with id: " + id);
    }

    @Override
    public UserDTO toggleAccountLock(Integer id, boolean accountLocked) {
        Optional<User> userOptional = userRepository.findById(id);
        if (userOptional.isPresent()) {
            User user = userOptional.get();
            user.setAccountLocked(accountLocked);
            User updatedUser = userRepository.save(user);
            return userMapper.toDTO(updatedUser);
        }
        throw new RuntimeException("User not found with id: " + id);
    }

    @Override
    public UserDTO toggleAccountStatus(Integer id, boolean enabled) {
        Optional<User> userOptional = userRepository.findById(id);
        if (userOptional.isPresent()) {
            User user = userOptional.get();
            user.setEnabled(enabled);
            User updatedUser = userRepository.save(user);
            return userMapper.toDTO(updatedUser);
        }
        throw new RuntimeException("User not found with id: " + id);
    }
}