---
title: "Notes app — DDD y hexagonal en Spring"
publicationDate: 2024-05-13
summary: "Cómo combinar las facilidades de Spring con Domain-Driven Design y arquitectura hexagonal: value objects, una jerarquía de excepciones y el mapeo entre entidades y modelos de dominio."
tags: ["backend", "java", "spring", "ddd", "arquitectura"]
---

Hace un tiempo me interesé por la arquitectura hexagonal y, más adelante, por todo lo relacionado con el Domain-Driven Design (DDD) a la hora de desarrollar un producto software.

Tras estudiar aproximadamente un año sobre ello y afianzar conceptos, decidí hacer un proyecto que intentase conservar las funcionalidades del framework (Spring) junto con algunas de las características del DDD.

A continuación te cuento algunas de las prácticas más interesantes que he empleado, los problemas a los que me he enfrentado y cómo los he resuelto.

## Value objects

A la hora de construir un modelo de dominio como puede ser un usuario hay que tener en cuenta las reglas de negocio. Para asegurarnos de que se cumplen dichas condiciones podemos utilizar *value objects*.

Son objetos inmutables que, además, si encapsulamos su lógica de creación, nos permiten realizar todas las comprobaciones necesarias para garantizar que solo se creen cuando los parámetros cumplen las reglas de negocio.

Un ejemplo es la creación de la contraseña de un usuario, con distintas restricciones para garantizar su seguridad:

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

## Manejo de errores

A la hora de manejar errores hay muchos enfoques posibles. Los dos con los que estoy más familiarizado son el uso de `Either` y las excepciones tradicionales.

En este caso me decanté por las excepciones para poder aprovechar la anotación `@ControllerAdvice` de Spring, dejando los controladores más limpios —solo contienen el *happy path*— y gestionando toda la lógica del manejo de errores en la clase de infraestructura anotada con `@ControllerAdvice`.

Al tratarse del microservicio de autenticación de usuarios, creé una excepción de dominio llamada `UserException` y decidí que todas las demás excepciones, tanto de dominio como de casos de uso (capa de aplicación), extenderían de esta excepción principal. ¿Por qué? Veámoslo con un ejemplo:

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

Al extender todas las excepciones de la aplicación de `UserException`, nuestro `@ControllerAdvice` no crecerá innecesariamente con un método por cada tipo de excepción que creemos. Otra idea que me pareció interesante fue mapear los estados HTTP según el tipo de excepción:

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

## Mapeo entre entidades de Spring y modelos de dominio

Uno de los grandes problemas que me encontré fue mapear las entidades de Spring con los modelos de dominio, ya que la contraseña se guarda cifrada en la base de datos.

La solución fue crear una clase `UserMapper` en la infraestructura con los dos mapeos posibles, cubriendo tanto los casos en los que hay que cifrar como aquellos en los que hay que descifrar:

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

## Conclusiones

Creo que es importante mantener un equilibrio entre el framework y la arquitectura del proyecto para exprimir al máximo las funcionalidades que nos ofrece. En el futuro seguiré desarrollando esta aplicación, planteando otras arquitecturas y patrones de diseño en los microservicios restantes, como CQRS, MVC o event-driven architecture.

¡Muchas gracias por leer hasta aquí! Cualquier feedback es bienvenido. Si quieres ver el progreso del proyecto, puedes acceder al [repositorio aquí](https://github.com/nicovegasr/notes-app-microservices).
