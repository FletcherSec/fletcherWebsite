---
machine: Bratarina
platform: Proving Grounds
category: Linux
difficulty: Easy
tags: [smtp, opensmtpd, cve-2020-7247, metasploit, samba]
date: 2026-07-23
status: retired
summary: A Linux box exposing SSH, SMTP, a Flask-based webapp, and a Samba share — testing service-version fingerprinting against a known remote code execution vulnerability in the mail transfer agent for a direct-to-root foothold.
---

## Enumeration

nmap scan:

```bash
┌──(kali㉿kali)-[192.168.45.225]-[~/oscp/bratarina]
└─$ nmap-full 192.168.142.71
[*] Running fast port discovery on 192.168.142.71...
[*] Open ports: 22,25,53,80,445
[*] Running full scan on 192.168.142.71...
Starting Nmap 7.99 ( https://nmap.org ) at 2026-07-23 07:33 -0400
Nmap scan report for 192.168.142.71
Host is up (0.032s latency).

PORT    STATE  SERVICE     VERSION
22/tcp  open   ssh         OpenSSH 7.6p1 Ubuntu 4ubuntu0.3 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   2048 db:dd:2c:ea:2f:85:c5:89:bc:fc:e9:a3:38:f0:d7:50 (RSA)
|   256 e3:b7:65:c2:a7:8e:45:29:bb:62:ec:30:1a:eb:ed:6d (ECDSA)
|_  256 d5:5b:79:5b:ce:48:d8:57:46:db:59:4f:cd:45:5d:ef (ED25519)
25/tcp  open   smtp        OpenSMTPD
| smtp-commands: bratarina Hello nmap.scanme.org [192.168.45.225], pleased to meet you, 8BITMIME, ENHANCEDSTATUSCODES, SIZE 36700160, DSN, HELP
|_ 2.0.0 This is OpenSMTPD 2.0.0 To report bugs in the implementation, please contact bugs@openbsd.org 2.0.0 with full details 2.0.0 End of HELP info
53/tcp  closed domain
80/tcp  open   http        nginx 1.14.0 (Ubuntu)
|_http-server-header: nginx/1.14.0 (Ubuntu)
|_http-title:         Page not found - FlaskBB        
445/tcp open   netbios-ssn Samba smbd 4.7.6-Ubuntu (workgroup: COFFEECORP)
Service Info: Host: bratarina; OS: Linux; CPE: cpe:/o:linux:linux_kernel

Host script results:
| smb2-security-mode: 
|   3.1.1: 
|_    Message signing enabled but not required
| smb-os-discovery: 
|   OS: Windows 6.1 (Samba 4.7.6-Ubuntu)
|   Computer name: bratarina
|   NetBIOS computer name: BRATARINA\x00
|   Domain name: \x00
|   FQDN: bratarina
|_  System time: 2026-07-23T07:33:51-04:00
|_clock-skew: mean: 1h20m03s, deviation: 2h18m36s, median: 1s
| smb2-time: 
|   date: 2026-07-23T11:33:48
|_  start_date: N/A
| smb-security-mode: 
|   account_used: guest
|   authentication_level: user
|   challenge_response: supported
|_  message_signing: disabled (dangerous, but default)

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 47.39 seconds
```

We find a samba share, smtp server open, and a webapp.

We can find an exploit on the OpenSMTPD version that may apply:

```bash
┌──(kali㉿kali)-[192.168.45.225]-[~/oscp/bratarina]
└─$ searchsploit opensmtpd      
--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- ---------------------------------
 Exploit Title                                                                                                                                                                   |  Path
--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- ---------------------------------
OpenSMTPD - MAIL FROM Remote Code Execution (Metasploit)                                                                                                                         | linux/remote/48038.rb
OpenSMTPD - OOB Read Local Privilege Escalation (Metasploit)                                                                                                                     | linux/local/48185.rb
OpenSMTPD 6.4.0 < 6.6.1 - Local Privilege Escalation + Remote Code Execution                                                                                                     | openbsd/remote/48051.pl
OpenSMTPD 6.6.1 - Remote Code Execution                                                                                                                                          | linux/remote/47984.py
OpenSMTPD 6.6.3 - Arbitrary File Read                                                                                                                                            | linux/remote/48139.c
OpenSMTPD < 6.6.3p1 - Local Privilege Escalation + Remote Code Execution                                                                                                         | openbsd/remote/48140.c
```

We can read through a few exploits but for these boxes we should tend to favor RCE -> RFI/LFI, if we read about the RCE we see it executes a formatted command in the `mail from:` field.

https://github.com/SimonSchoeni/CVE-2020-7247-POC/blob/main/exploit.py

## Foothold

I used metasploit for this box (same CVE) and gained my shell as root:

```bash
root@bratarina:~# whoami
whoami
```
