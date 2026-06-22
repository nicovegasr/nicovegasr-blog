---
title: "Notes app — DDD and hexagonal in Spring"
publicationDate: 2024-05-13
summary: "How to combine Spring's conveniences with Domain-Driven Design and hexagonal architecture: value objects, an exception hierarchy, and mapping between entities and domain models."
tags: ["backend", "java", "spring", "ddd", "architecture"]
---

A while ago I got interested in hexagonal architecture and, later on, in everything around Domain-Driven Design (DDD) when building a software product.

After studying it for about a year and consolidating the concepts, I decided to build a project that tried to keep the framework's features (Spring) together with some of the ideas from DDD.

Below I share some of the more interesting practices I used, the problems I ran into, and how I solved them.

## Value objects

When building a domain model such as a user, you have to account for the business rules. To make sure those conditions hold, we can use *value objects*.

These are immutable objects and, if we encapsulate their creation logic, they let us run every check needed to guarantee they are only created when the parameters satisfy the business rules.

One example is creating a user's password, with several constraints to keep it secure:

```java
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Getter
public class Password {
    String credential;

    public static Password create(String password) {
        validatePassword(password);
        return new Password(password);
    }

    private static void validatePassword(String password) {
        checkIsNullOrEmpty(password);
        checkIsCorrectFormat(password);
    }

    private static void checkIsCorrectFormat(String password) {
        if (!password.matches(
                "^(?=.*[\\d])" +
                        "(?=.*[a-z])" +
                        "(?=.*[A-Z])" +
                        "(?=.*[@#$%^&+=])" +
                        "(?=\\S+$).{8,}$")) {
            throw new PasswordIncorrectFormat();
        }
    }

    private static void checkIsNullOrEmpty(String password) {
        if (password == null || password.isEmpty()) {
            throw new PasswordEmpty();
        }
    }
}
```

## Error handling

There are many possible approaches to handling errors. The two I'm most familiar with are using `Either` and traditional exceptions.

Here I went with exceptions so I could take advantage of Spring's `@ControllerAdvice` annotation, keeping the controllers cleaner —they only contain the *happy path*— and handling all the error-handling logic in the infrastructure class annotated with `@ControllerAdvice`.

Since this is the user authentication microservice, I created a domain exception called `UserException` and decided that every other exception, both domain and use-case (application layer), would extend this main exception. Why? Let's see it with an example:

```java
public class UserException extends RuntimeException {

    public UserException(String message) {
        super(message);
    }
}
```

```java
public class PasswordEmpty extends UserException {
    public PasswordEmpty() {
        super("Password cannot be null or empty");
    }
}
```

By having every exception in the application extend `UserException`, our `@ControllerAdvice` won't grow unnecessarily with one method per exception type we create. Another idea I found interesting was mapping HTTP statuses based on the exception type:

```java
@ControllerAdvice
@Slf4j
public class HttpExceptionHandler {
    @ExceptionHandler(UserException.class)
    public ResponseEntity<String> handleUserAuthException(UserException userException) {
        log.error("Handled user exception:{}", userException.getMessage());
        Integer code = getUserExceptionStatus(userException);
        return ResponseEntity.status(code).body(userException.getMessage());
    }

    private Integer getUserExceptionStatus(UserException userException) {
        return switch (userException.getClass().getSimpleName()) {
            case "UsernameEmpty", "PasswordEmpty", "UsernameLengthIncorrect", "PasswordIncorrectFormat" -> 400;
            case "AlgorithmError", "SecretKeyNotProvided" -> 503;
            case "UsernameAlreadyExist" -> 409;
            default -> 500;
        };
    }
}
```

## Mapping between Spring entities and domain models

One of the biggest problems I ran into was mapping Spring entities to domain models, since the password is stored encrypted in the database.

The solution was to create a `UserMapper` class in the infrastructure layer with both possible mappings, covering the cases where we need to encrypt and those where we need to decrypt:

```java
@Component
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@RequiredArgsConstructor
public class UserMapper {

    @Value("${cipher.algorithm}")
    private String cipherAlgorithm;

    @Value("${auth.secret.key}")
    private String secretKey;

    public User toDomainModel(UserEntity userEntity) {
        String decryptedPassword = DecryptPassword.decrypt(userEntity.getPassword(), secretKey, cipherAlgorithm);
        return User.create(
                userEntity.getUsername(),
                decryptedPassword,
                userEntity.getCreatedAt(),
                userEntity.getLastLoginDate());
    }

    public UserEntity toEntity(User user) {
        String encryptedPassword = EncryptPassword.encrypt(user.getPassword().getCredential(),
                secretKey,
                cipherAlgorithm);
        return UserEntity.builder()
                .username(user.getUsername().getName())
                .password(encryptedPassword)
                .createdAt(user.getCreatedAt())
                .lastLoginDate(user.getLastLoginDate())
                .build();
    }
}
```

## Closing thoughts

I think it's important to keep a balance between the framework and the project's architecture, so you can get the most out of the features it gives you. Going forward I'll keep developing this application, exploring other architectures and design patterns in the remaining microservices, such as CQRS, MVC, or event-driven architecture.

Thanks a lot for reading this far! Any feedback is welcome. If you want to follow the project's progress, you can check out the [repository here](https://github.com/nicovegasr/notes-app-microservices).
