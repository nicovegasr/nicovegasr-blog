---
title: "Ciberseguridad: ¿quién puede entrar por los puertos de tu ordenador?"
publicationDate: 2026-11-06
summary: "Un comando enseña los puertos abiertos de tu ordenador. Qué es cada uno, quién puede llegar a él y cómo una aplicación vulnerable podría exponer tu máquina en una wifi pública."
tags: ["security", "networking", "node"]
translationSlug: "what-is-your-computer-listening-to"
---

Hace unos días, mientras trabajaba en el blog, me dio por revisar cuántos servidores me había dejado encendidos en local. Abrí la terminal para ver qué estaba esperando conexiones y aparecieron ocho puertos abiertos. Dos eran del blog, ¿y los otros seis?

```
$ lsof -iTCP -sTCP:LISTEN -n -P
COMMAND     PID   USER     NAME
ControlCe   642   nicolas  TCP *:7000 (LISTEN)
ControlCe   642   nicolas  TCP *:5000 (LISTEN)
rapportd    701   nicolas  TCP *:56494 (LISTEN)
logioptio   770   nicolas  TCP *:59869 (LISTEN)
engram     1447   nicolas  TCP 127.0.0.1:7437 (LISTEN)
Notion    25525   nicolas  TCP 127.0.0.1:56973 (LISTEN)
node      30131   nicolas  TCP 127.0.0.1:4649 (LISTEN)
node      44900   nicolas  TCP 127.0.0.1:4321 (LISTEN)
```

Los otros seis eran programas que no recordaba haber abierto a nada: el Centro de Control, Notion, el software del ratón…

Cada línea es una puerta. **¿Quién puede llamar a cada una, y qué pasa si alguien entra?**

## La superficie de ataque

En ciberseguridad, al conjunto de sitios por los que alguien podría entrar en un sistema se le llama **superficie de ataque**. Cada proceso escuchando en un puerto forma parte de ella, porque es código que acepta datos de fuera.

Es la parte más fácil de ver, porque cabe en un comando. Proteger un sistema empieza por saber qué tiene abierto.

## Qué es un puerto

La dirección IP identifica una máquina. El puerto, a qué programa de esa máquina va el mensaje.

Un servidor, al arrancar, le pide al sistema operativo una dirección y un puerto (`bind`) y empieza a aceptar conexiones en ellos (`listen`). Desde ese momento, el kernel le entrega todo lo que llegue a esa combinación.

En Node, las dos llamadas van dentro de `listen`. La diferencia está en cómo lo llamo. Estas son las tres variantes que probé, arrancando un servidor con cada una:

```js
server.listen(3001);
server.listen(3002, "127.0.0.1");
server.listen(3003, "0.0.0.0");
```

```
node  57561  nicolas  TCP *:3001 (LISTEN)            ← listen(3001)
node  57562  nicolas  TCP 127.0.0.1:3002 (LISTEN)    ← listen(3002, "127.0.0.1")
node  57563  nicolas  TCP *:3003 (LISTEN)            ← listen(3003, "0.0.0.0")
```

De las columnas de `lsof`, la que importa es **NAME**: dónde escucha cada proceso. **USER** dice con qué usuario se ejecuta; volveremos a ella.

## Quién puede llegar

**`127.0.0.1`** es el *loopback*: **una red que solo existe dentro de la propia máquina**. Lo que escucha ahí solo es alcanzable desde ese mismo ordenador.

**`*`** son todas las interfaces, incluida la wifi. Llamé a los tres servidores usando la IP de mi Mac en la red de casa, la misma que usaría cualquier otro dispositivo:

```
$ curl http://192.168.1.104:3001
hola
$ curl http://192.168.1.104:3002
curl: (7) Failed to connect to 192.168.1.104 port 3002 after 1 ms: Couldn't connect to server
$ curl http://192.168.1.104:3003
hola
```

Lo que más me sorprendió es el primero: `listen(3001)`, sin dirección, escucha en todas las interfaces. Es el valor por defecto de Node, y lo que hace el `app.listen(3000)` de cualquier tutorial de Express.

Escuchar en `*` no significa estar en internet. En una red IPv4 doméstica, el router suele bloquear las conexiones entrantes salvo que haya una redirección de puertos. Sin eso, el perímetro de **`*` es la red en la que estés: en casa, tus dispositivos; en la wifi de una cafetería, cualquiera conectado a ella.** Esos dispositivos podrían intentar conectarse, pero el aislamiento de clientes de la wifi o el firewall pueden impedir que lleguen al puerto. Y si alguien compromete un ordenador de tu casa, también está dentro.

<content-demo name="listening-ports">
  <p>Otro equipo de la misma wifi podría llegar a la app Node en el puerto 3000 si la red y el firewall lo permiten. Una petición que explote una vulnerabilidad podría permitir ejecutar código. El servicio independiente en 127.0.0.1:4321 impide ese acceso directo desde la wifi.</p>
</content-demo>

## Qué pasa si alguien entra

Vuelve la columna USER. Todos esos procesos se ejecutan con mi usuario, así que quien ejecute código a través de uno de ellos lo hace con mis permisos: mis claves SSH, los `.env` de mis proyectos, mis repositorios.

No es teórico. El 21 de octubre, Node.js parcheó [CVE-2026-111497](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases): datos Brotli manipulados hacen que `node:zlib` escriba fuera de un búfer, lo que puede acabar en ejecución remota de código. Afecta a las ramas 22, 24 y 26, y el blog estaba en Node 24.16.0 hasta hace unos días. ¿Estaba expuesto?

Para explotarlo hacen falta tres cosas a la vez:

1. **Una versión vulnerable.** La mía lo era.
2. **Una aplicación que descomprima Brotli que manda otro.** Express 5 lo hace por defecto: `express.json()` descomprime con `node:zlib` cualquier petición con `Content-Encoding: br`. Lo comprobé enviando un cuerpo comprimido.
3. **Que el atacante llegue al puerto.** Aquí, escuchar en `127.0.0.1` impedía ese acceso directo desde otro dispositivo.

Si hubiera arrancado una API con Express 5, una versión vulnerable de Node y `app.listen(3000)` en una cafetería, otro equipo de esa wifi podría haber llegado al puerto si la red y el firewall lo permitían. Una petición que explotara el fallo podría haber acabado ejecutando código con mis permisos.

El puerto no lo cubre todo: un paquete de npm comprometido ya se ejecuta dentro al instalarlo, y tu navegador sí llega a `127.0.0.1`, así que una web puede intentar hablar con tus servidores locales.

## Qué hacer

- **Mira qué tienes abierto** y averigua lo que no reconozcas.
- **Escucha en `127.0.0.1`** salvo que necesites aceptar conexiones de otros dispositivos. En Express: `app.listen(3000, "127.0.0.1")`.
- **Activa el firewall.** Yo lo tenía desactivado sin saberlo.
- **Apaga lo que no uses.** Los puertos 5000 y 7000 de mi lista son el receptor de AirPlay.
- **Actualiza el runtime**, no solo las dependencias: el fallo estaba en Node.
- **Prueba tu router desde fuera**, con los datos del móvil y `nc -z <ip pública> <puerto>`. No te fíes de una única prueba: mi operador móvil interceptaba el puerto 21 y hacía que pareciera abierto incluso al probar otras direcciones.

Ninguna medida basta sola. Cada una corta un eslabón distinto de la misma cadena.

## Ejecútalo en tu máquina

```
lsof -iTCP -sTCP:LISTEN -n -P
```

¿Sabes qué es cada línea, y quién puede llegar a ella?

## Referencias

- [Node.js — October 2026 Security Releases](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases)
- [Node.js — `server.listen()`](https://nodejs.org/api/net.html#serverlisten): sin `host`, escucha en la dirección no especificada (`::` o `0.0.0.0`).
- [body-parser](https://github.com/expressjs/body-parser): codificaciones admitidas (`deflate`, `gzip`, `br`).
