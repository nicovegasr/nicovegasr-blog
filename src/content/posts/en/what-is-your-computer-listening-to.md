---
title: "Cybersecurity: who can get in through your computer’s ports?"
publicationDate: 2026-11-06
summary: "One command reveals the listening ports on your computer. What each one means, who can reach it, and how a vulnerable application could expose your machine on public Wi-Fi."
tags: ["security", "networking", "node"]
translationSlug: "que-esta-escuchando-tu-ordenador"
---

A few days ago, while working on the blog, I decided to check how many local servers I had left running. I opened the terminal to see what was waiting for connections and found eight open ports. Two belonged to the blog, but what about the other six?

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

The other six were programs I didn't remember opening up to anything: Control Center, Notion, the mouse software…

Each line is a door. **Who can knock on each one, and what happens if someone gets in?**

## The attack surface

In cybersecurity, the collection of places someone could use to get into a system is called its **attack surface**. Every process listening on a port is part of it, because it is code that accepts data from outside.

It is the easiest part to see, because it fits in a single command. Protecting a system starts with knowing what it has open.

## What a port is

An IP address identifies a machine. The port identifies which program on that machine the message is for.

When a server starts, it asks the operating system for an address and a port (`bind`), then starts accepting connections on them (`listen`). From that moment on, the kernel delivers whatever arrives at that combination.

In Node, both calls happen inside `listen`. The difference is in how I call it. These are the three variants I tried, starting a server with each one:

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

Of the `lsof` columns, the one that matters is **NAME**: where each process listens. **USER** tells you which user it runs as; we will come back to that.

## Who can reach it

**`127.0.0.1`** is the *loopback*: **a network that exists only inside the machine itself**. Anything listening there can only be reached from that same computer.

**`*`** means all interfaces, including Wi-Fi. I called all three servers using my Mac's IP address on my home network, the same one any other device would use:

```
$ curl http://192.168.1.104:3001
hola
$ curl http://192.168.1.104:3002
curl: (7) Failed to connect to 192.168.1.104 port 3002 after 1 ms: Couldn't connect to server
$ curl http://192.168.1.104:3003
hola
```

What surprised me most was the first one: `listen(3001)`, with no address, listens on all interfaces. It is Node's default, and what the `app.listen(3000)` in any Express tutorial does.

Listening on `*` does not mean being on the internet. On a home IPv4 network, the router usually blocks incoming connections unless port forwarding is configured. Without that, **the boundary of `*` is the network you are on: at home, your devices; on a café's Wi-Fi, anyone connected to it.** Those devices could try to connect, but Wi-Fi client isolation or the firewall may prevent them from reaching the port. And if someone compromises a computer at home, they are inside too.

<content-demo name="listening-ports">
  <p>Another device on the same Wi-Fi could reach the Node app on port 3000 if the network and firewall allow it. A request exploiting a vulnerability could allow code execution. The separate service on 127.0.0.1:4321 prevents that direct access from Wi-Fi.</p>
</content-demo>

## What happens if someone gets in

Back to the USER column. All those processes run as my user, so anyone who executes code through one of them does so with my permissions: my SSH keys, my projects' `.env` files, my repositories.

This is not theoretical. On October 21, Node.js patched [CVE-2026-111497](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases): crafted Brotli data makes `node:zlib` write outside a buffer, which can lead to remote code execution. It affects the 22, 24 and 26 release lines, and the blog was on Node 24.16.0 until a few days ago. Was I exposed?

Exploiting it requires three things at once:

1. **A vulnerable version.** Mine was.
2. **An application that decompresses Brotli sent by someone else.** Express 5 does this by default: `express.json()` uses `node:zlib` to decompress any request with `Content-Encoding: br`. I checked by sending a compressed body.
3. **The attacker being able to reach the port.** Here, listening on `127.0.0.1` prevented that direct access from another device.

If I had started an Express 5 API with a vulnerable Node version and `app.listen(3000)` in a café, another device on that Wi-Fi could have reached the port if the network and firewall allowed it. A request exploiting the flaw could have led to code execution with my permissions.

Ports do not cover everything: a compromised npm package already runs inside when you install it, and your browser can reach `127.0.0.1`, so a website can try to talk to your local servers.

## What to do

- **Look at what you have open** and identify anything you do not recognise.
- **Listen on `127.0.0.1`** unless you need to accept connections from other devices. In Express: `app.listen(3000, "127.0.0.1")`.
- **Enable the firewall.** Mine was disabled without me knowing.
- **Stop what you are not using.** Ports 5000 and 7000 on my list belong to the AirPlay receiver.
- **Update the runtime**, not just the dependencies: the flaw was in Node.
- **Test your router from outside**, using mobile data and `nc -z <public IP> <port>`. Do not rely on a single test: my mobile carrier was intercepting port 21 and making it appear open even when I tried other addresses.

No single measure is enough. Each one breaks a different link in the same chain.

## Run it on your machine

```
lsof -iTCP -sTCP:LISTEN -n -P
```

Do you know what each line is, and who can reach it?

## References

- [Node.js — October 2026 Security Releases](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases)
- [Node.js — `server.listen()`](https://nodejs.org/api/net.html#serverlisten): without `host`, it listens on the unspecified address (`::` or `0.0.0.0`).
- [body-parser](https://github.com/expressjs/body-parser): supported encodings (`deflate`, `gzip`, `br`).
